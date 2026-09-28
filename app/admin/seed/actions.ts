'use server';

import { revalidatePath } from 'next/cache';
import { adminContext } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { getPricingConfig } from '@/lib/settings';
import { computeMatchingFee } from '@/lib/matching-fee';

// デモ用アカウント（本番の実ユーザーとは別のダミードメイン）
const DEMO_PASSWORD = 'BuymoDemo!2025';
const DEMO_BUYER = { email: 'demo.buyer@buymo-demo.jp', name: '山田 太郎（デモ）' };
const DEMO_PRO = { email: 'demo.pro@buymo-demo.jp', name: '佐藤オート（デモ担当）' };

type Svc = ReturnType<typeof createServiceClient>;

/** メールでauthユーザーを取得。なければ作成し、プロフィール名を整える。 */
async function ensureUser(svc: Svc, email: string, name: string): Promise<string | null> {
  // 既存ユーザー検索（先頭ページで十分な規模を想定）
  const { data: list } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const found = list?.users?.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase());
  let id = found?.id ?? null;

  if (!id) {
    const { data: created, error } = await svc.auth.admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: name },
    });
    if (error || !created?.user) return null;
    id = created.user.id;
  }

  // プロフィール名を確定（トリガーで作成済みのはず）
  await svc.from('profiles').upsert({ id, display_name: name }, { onConflict: 'id' });
  return id;
}

/** デモデータを投入（再実行で最新化：既存のデモ関連データを消してから作成）。 */
export async function seedDemoData(): Promise<{ ok: boolean; message: string }> {
  const ctx = await adminContext();
  if (!ctx) return { ok: false, message: '管理者のみ実行できます。' };

  const svc = createServiceClient();
  const log: string[] = [];

  try {
    const buyerId = await ensureUser(svc, DEMO_BUYER.email, DEMO_BUYER.name);
    const proId = await ensureUser(svc, DEMO_PRO.email, DEMO_PRO.name);
    if (!buyerId || !proId) {
      return { ok: false, message: 'デモユーザーの作成に失敗しました。SUPABASE_SERVICE_ROLE_KEY の設定をご確認ください。' };
    }
    log.push('デモユーザー: 買い手・車のプロを用意');

    // --- 既存のデモデータを掃除（デモ関係者のみ） ---
    await svc.from('cases').delete().eq('user_id', buyerId);           // case_charges/conversations は cascade
    await svc.from('listings').delete().eq('seller_id', proId);       // listing_images/conversations は cascade
    const { data: oldDealer } = await svc.from('dealers').select('id').eq('owner_id', proId).maybeSingle();
    if (oldDealer) await svc.from('dealers').delete().eq('id', (oldDealer as { id: string }).id); // partner_skills cascade

    // --- 車のプロ（加盟店・承認済み） ---
    const now = new Date().toISOString();
    const { data: dealerRow } = await svc.from('dealers').insert({
      owner_id: proId,
      name: '佐藤オートサービス',
      company_name: '株式会社佐藤オート',
      prefecture: '福島県',
      address: '福島県いわき市平字○○1-2-3',
      phone: '0246-00-0000',
      description: '整備・車検・板金からコーティングまで。地域密着で30年の実績。',
      status: 'approved',
      approved_at: now,
      tagline: '愛車のことなら何でもおまかせ',
      rep_name: '佐藤 健',
      rep_message: 'お客様のカーライフを全力でサポートします。お気軽にご相談ください。',
      business_hours: '9:00〜18:00',
      holidays: '日曜・祝日',
      established: '1994年',
      service_area: '福島県浜通り一円',
    }).select('id').single();
    const dealerId = (dealerRow as { id: string }).id;
    log.push('加盟店（佐藤オートサービス）を承認済みで作成');

    // 提供スキル
    await svc.from('partner_skills').insert([
      { dealer_id: dealerId, skill_key: 'maintenance', price_from: 8000, area: '福島県浜通り', note: '一般整備・オイル交換など', active: true },
      { dealer_id: dealerId, skill_key: 'inspection', price_from: 25000, area: '福島県浜通り', note: '指定工場での車検', active: true },
      { dealer_id: dealerId, skill_key: 'coating', price_from: 15000, area: '来店', note: 'ガラスコーティング', active: true },
      { dealer_id: dealerId, skill_key: 'tire', price_from: 5000, area: '来店', note: 'タイヤ交換・履き替え', active: true },
    ]);
    log.push('提供スキル4種を登録');

    // --- 出品車両（プロが出品） ---
    const { data: listingRows } = await svc.from('listings').insert([
      {
        seller_id: proId, title: 'ホンダ フィット 13G・Fパッケージ', maker: 'ホンダ', model: 'フィット',
        year: 2019, mileage_km: 42000, price: 1180000, body_type: 'コンパクト', transmission: 'CVT',
        fuel: 'ガソリン', color: 'ホワイト', prefecture: '福島県', repair_history: false,
        description: 'ワンオーナー・記録簿あり。内外装きれいです。', status: 'active',
      },
      {
        seller_id: proId, title: 'トヨタ アクア S', maker: 'トヨタ', model: 'アクア',
        year: 2020, mileage_km: 31000, price: 1350000, body_type: 'コンパクト', transmission: 'CVT',
        fuel: 'ハイブリッド', color: 'ブラック', prefecture: '福島県', repair_history: false,
        description: '低燃費のハイブリッド。人気のSグレードでETC・ナビ付き。', status: 'active',
      },
    ]).select('id');
    log.push(`出品車両 ${listingRows?.length ?? 0} 台を掲載`);

    // --- 案件（買い手 → プロ）を各ステータスで ---
    const mk = (type: string, status: string, title: string, detail: string, extra?: Record<string, unknown>) => ({
      type, source: 'PARTNER', status, user_id: buyerId, partner_id: dealerId, title, detail, ...extra,
    });
    const cfg = await getPricingConfig();
    const completedAmount = 30000;
    const fee = computeMatchingFee('maintenance', completedAmount, cfg);

    const { data: caseRows } = await svc.from('cases').insert([
      mk('maintenance', 'new', 'エンジンオイル交換のご依頼', 'オイルとエレメントの交換をお願いします。'),
      mk('inspection', 'accepted', '車検のご依頼', '来月車検が切れます。見積りをお願いします。'),
      mk('coating', 'in_progress', 'ガラスコーティングのご依頼', '新車購入のため全体コーティング希望です。'),
      mk('tire', 'awaiting', 'タイヤ交換のご依頼', 'スタッドレスへの履き替えをお願いします。'),
      mk('maintenance', 'completed', 'バッテリー交換（完了）', '交換完了しました。', { amount: completedAmount }),
    ]).select('id, status');
    log.push(`案件 ${caseRows?.length ?? 0} 件を作成（新規〜完了）`);

    // 完了案件のマッチング手数料（請求）を作成
    const completed = (caseRows ?? []).find((c: { status: string }) => c.status === 'completed') as { id: string } | undefined;
    if (completed) {
      await svc.from('case_charges').upsert({
        case_id: completed.id, partner_id: dealerId, user_id: buyerId,
        category: fee.category, base_amount: fee.base, fee_rate: fee.rate,
        fee_amount: fee.feeExclTax, tax: fee.tax, total: fee.total, status: 'pending', updated_at: now,
      }, { onConflict: 'case_id' });
      log.push(`マッチング手数料の請求を作成（${fee.total.toLocaleString('ja-JP')}円）`);
    }

    revalidatePath('/admin');
    revalidatePath('/admin/billing');
    revalidatePath('/dealers');

    return {
      ok: true,
      message: [
        '✅ デモデータを投入しました。',
        ...log.map((l) => '・' + l),
        '',
        'デモ用ログイン（メール＋パスワード）:',
        `　買い手  ${DEMO_BUYER.email} / ${DEMO_PASSWORD}`,
        `　車のプロ ${DEMO_PRO.email} / ${DEMO_PASSWORD}`,
      ].join('\n'),
    };
  } catch (e) {
    return { ok: false, message: 'エラー: ' + (e instanceof Error ? e.message : String(e)) + (log.length ? '\n（途中まで: ' + log.join(' / ') + '）' : '') };
  }
}

/** デモデータを削除（デモ関係者のデータのみ）。 */
export async function clearDemoData(): Promise<{ ok: boolean; message: string }> {
  const ctx = await adminContext();
  if (!ctx) return { ok: false, message: '管理者のみ実行できます。' };

  const svc = createServiceClient();
  try {
    const { data: list } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const buyer = list?.users?.find((u) => (u.email ?? '') === DEMO_BUYER.email);
    const pro = list?.users?.find((u) => (u.email ?? '') === DEMO_PRO.email);

    if (buyer) await svc.from('cases').delete().eq('user_id', buyer.id);
    if (pro) {
      await svc.from('listings').delete().eq('seller_id', pro.id);
      await svc.from('dealers').delete().eq('owner_id', pro.id);
    }
    revalidatePath('/admin');
    revalidatePath('/dealers');
    return { ok: true, message: 'デモデータ（案件・出品・加盟店）を削除しました。※デモ用ログインアカウントは残します。' };
  } catch (e) {
    return { ok: false, message: 'エラー: ' + (e instanceof Error ? e.message : String(e)) };
  }
}
