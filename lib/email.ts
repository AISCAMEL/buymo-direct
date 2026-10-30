// メール送信（Resend REST API）。SDK 依存なし。
// 環境変数:
//   RESEND_API_KEY      … Resend のAPIキー（未設定なら送信スキップ＝デモ動作）
//   EMAIL_FROM          … 送信元（例: "BUYMO ダイレクト <noreply@buymo.me>"）
//   OPS_EMAIL           … 運営の通知先（通報・申込の受信）
//   NEXT_PUBLIC_SITE_URL … サイトURL（メール内リンク生成用）

export function isEmailConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export function opsEmail(): string | null {
  return process.env.OPS_EMAIL ?? null;
}

/** メール送信（ベストエフォート）。未設定・失敗時も例外を投げない。 */
export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!isEmailConfigured()) return { ok: false, skipped: true };
  const to = Array.isArray(params.to) ? params.to : [params.to];
  if (to.length === 0 || !to[0]) return { ok: false, skipped: true };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to,
        subject: params.subject,
        html: params.html,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      return { ok: false, error: `Resend ${res.status}: ${t.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'email failed' };
  }
}

/** シンプルな共通レイアウト。 */
export function emailLayout(title: string, bodyHtml: string): string {
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
    <div style="background:#0C3A44;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0">
      <strong style="font-size:16px">BUYMO ダイレクト</strong>
    </div>
    <div style="border:1px solid #e2e8f0;border-top:0;padding:20px;border-radius:0 0 8px 8px">
      <h2 style="margin:0 0 12px;font-size:18px">${title}</h2>
      ${bodyHtml}
      <p style="margin-top:20px;font-size:12px;color:#94a3b8">
        ※ 本メールは BUYMO ダイレクト から自動送信されています。
      </p>
    </div>
  </div>`;
}

// ── ブランドラッパー HTML（取引メール用） ──────────────────────────────

function _wrap(content: string): string {
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,sans-serif;background:#f8fafc;margin:0;padding:24px">
<div style="max-width:560px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
<div style="background:#0C3A44;padding:20px 24px">
  <span style="color:white;font-weight:900;font-size:18px">BUYMO ダイレクト</span>
</div>
<div style="padding:24px">${content}${_supportFooter()}</div>
<div style="background:#f1f5f9;padding:16px 24px;text-align:center;font-size:12px;color:#94a3b8">
  © 2026 BUYMO ダイレクト — <a href="https://buymo.me" style="color:#64748b">buymo.me</a>
</div>
</div></body></html>`;
}

function _btn(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0F766E;border-radius:8px;color:white;text-decoration:none;font-weight:700">${label}</a>`;
}

function _h(text: string): string {
  return `<h2 style="margin:0 0 12px;color:#0C3A44;font-size:18px">${text}</h2>`;
}

function _p(text: string): string {
  return `<p style="margin:8px 0;color:#475569;font-size:14px;line-height:1.6">${text}</p>`;
}

function _strong(text: string): string {
  return `<strong style="color:#0C3A44">${text}</strong>`;
}

function _siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me';
}

/** お問い合わせ導線ブロック（チャット・問い合わせ・FAQ・マイページ）。
 *  受信者がすぐ相談・行動できるよう、顧客向けメールの末尾に差し込む。 */
function _supportFooter(): string {
  const site = _siteUrl();
  const link = (href: string, label: string) =>
    `<a href="${href}" style="display:inline-block;margin:6px 6px 0 0;padding:10px 14px;background:#ffffff;border:1px solid #cbd5e1;border-radius:8px;color:#0C3A44;text-decoration:none;font-size:13px;font-weight:700;white-space:nowrap">${label}</a>`;
  return `<div style="margin-top:24px;padding:16px 18px;background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px">
    <p style="margin:0 0 4px;font-weight:700;color:#0C3A44;font-size:14px">お困りですか？ いつでもご相談ください</p>
    <p style="margin:0 0 6px;color:#475569;font-size:13px;line-height:1.6">AIチャットなら24時間すぐに回答。ログインすれば取引状況・お見積りもすぐ確認できます。</p>
    <div>
      ${link(`${site}/?chat=open`, '💬 チャットで相談')}
      ${link(`${site}/contact`, '✉️ お問い合わせ')}
      ${link(`${site}/questions`, '❓ よくある質問')}
      ${link(`${site}/dashboard`, '👤 マイページ')}
    </div>
  </div>`;
}

// ── 取引メールテンプレート ─────────────────────────────────────────────

/** エスクロー取引開始メール（買主向け）。 */
export async function sendEscrowCreatedEmail(
  to: string,
  opts: { listingTitle: string; amount: number; escrowId: string },
): Promise<void> {
  const url = `${_siteUrl()}/escrow/${opts.escrowId}`;
  const html = _wrap(`
    ${_h('エスクロー取引が開始されました')}
    ${_p(`${_strong(opts.listingTitle)} の取引が開始されました。`)}
    ${_p(`取引金額: ${_strong('¥' + opts.amount.toLocaleString())}`)}
    ${_p('まず支払い方法を選択し、エスクローに入金してください。')}
    ${_btn('取引を確認する', url)}
  `);
  await sendEmail({
    to,
    subject: `【BUYMO】エスクロー取引が開始されました — ${opts.listingTitle}`,
    html,
  });
}

/** 入金確認メール（買主・売主両方に送る）。 */
export async function sendPaymentConfirmedEmail(
  to: string,
  opts: { listingTitle: string; amount: number; escrowId: string; role: 'buyer' | 'seller' },
): Promise<void> {
  const url = `${_siteUrl()}/escrow/${opts.escrowId}`;
  const isBuyer = opts.role === 'buyer';
  const html = _wrap(`
    ${_h('入金が確認されました')}
    ${_p(`${_strong(opts.listingTitle)} の代金が${isBuyer ? 'エスクローに保全' : '買主によって入金'}されました。`)}
    ${_p(`金額: ${_strong('¥' + opts.amount.toLocaleString())}`)}
    ${isBuyer
      ? _p('売主と現車確認の日程を調整してください。')
      : _p('買主との現車確認を完了したら次のステップへ進んでください。')}
    ${_btn('取引を確認する', url)}
  `);
  await sendEmail({
    to,
    subject: `【BUYMO】入金が確認されました — ${opts.listingTitle}`,
    html,
  });
}

/** 取引完了メール（買主・売主両方に送る）。 */
export async function sendDealCompletedEmail(
  to: string,
  opts: { listingTitle: string; amount: number; escrowId: string; role: 'buyer' | 'seller' },
): Promise<void> {
  const url = `${_siteUrl()}/escrow/${opts.escrowId}`;
  const isSeller = opts.role === 'seller';
  const html = _wrap(`
    ${_h('取引が完了しました')}
    ${_p(`${_strong(opts.listingTitle)} の取引が完了しました。${isSeller ? '売上が振り込まれます。' : 'ありがとうございました。'}`)}
    ${_p(`取引金額: ${_strong('¥' + opts.amount.toLocaleString())}`)}
    ${_p(`取引相手への口コミ投稿にご協力ください。投稿いただくと、お礼として${_strong('次回使える¥5,000クーポン')}をプレゼントします。`)}
    ${_btn('口コミを投稿する（¥5,000クーポン）', url)}
  `);
  await sendEmail({
    to,
    subject: `【BUYMO】取引完了 — 口コミ投稿で¥5,000クーポン`,
    html,
  });
}

/** ローン仮審査受付メール。 */
export async function sendLoanApplicationEmail(
  to: string,
  opts: { applicantName: string; amount: number; appId: string },
): Promise<void> {
  const url = `${_siteUrl()}/dashboard/loans`;
  const html = _wrap(`
    ${_h('ローン仮審査を受け付けました')}
    ${_p(`${_strong(opts.applicantName)} 様のローン仮審査申請を受け付けました。`)}
    ${_p(`申請額: ${_strong('¥' + opts.amount.toLocaleString())}`)}
    ${_p('審査結果は1営業日以内にメールでお知らせします。')}
    ${_btn('申込状況を確認する', url)}
  `);
  await sendEmail({ to, subject: '【BUYMO】ローン仮審査を受け付けました', html });
}

/** 本人確認完了メール。 */
export async function sendKycApprovedEmail(to: string): Promise<void> {
  const html = _wrap(`
    ${_h('本人確認が完了しました')}
    ${_p('本人確認書類の審査が完了し、認証バッジが付与されました。')}
    ${_p('これにより取引相手からの信頼度が高まります。')}
    ${_btn('マイページを確認する', `${_siteUrl()}/dashboard/profile`)}
  `);
  await sendEmail({ to, subject: '【BUYMO】本人確認が完了しました', html });
}

/** 新着メッセージ通知メール。 */
export async function sendNewMessageEmail(
  to: string,
  opts: { fromName: string; listingTitle: string; preview: string; conversationId: string },
): Promise<void> {
  const url = `${_siteUrl()}/messages/${opts.conversationId}`;
  const html = _wrap(`
    ${_h('新しいメッセージが届いています')}
    ${_p(`${_strong(opts.fromName)} さんから ${_strong(opts.listingTitle)} についてメッセージが届きました。`)}
    <div style="margin:16px 0;padding:12px 16px;background:#f8fafc;border-left:3px solid #0C3A44;border-radius:4px;color:#475569;font-size:14px">${opts.preview}</div>
    ${_btn('返信する', url)}
  `);
  await sendEmail({
    to,
    subject: `【BUYMO】${opts.fromName}さんからメッセージ — ${opts.listingTitle}`,
    html,
  });
}

/** お問い合わせ通知（運営向け）＋自動返信（送信者向け）。ベストエフォート。 */
export async function sendContactEmails(opts: {
  name: string;
  email: string;
  categoryLabel: string;
  message: string;
}): Promise<void> {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const bodyLines = `
    ${_p(`お名前: ${_strong(esc(opts.name))}`)}
    ${_p(`メール: ${_strong(esc(opts.email))}`)}
    ${_p(`種別: ${_strong(esc(opts.categoryLabel))}`)}
    <div style="margin:16px 0;padding:12px 16px;background:#f8fafc;border-left:3px solid #0F766E;border-radius:4px;color:#475569;font-size:14px;white-space:pre-wrap">${esc(opts.message)}</div>
  `;

  // 運営への通知
  const ops = opsEmail();
  if (ops) {
    await sendEmail({
      to: ops,
      subject: `【BUYMO】お問い合わせ（${opts.categoryLabel}）— ${opts.name}様`,
      html: emailLayout('新しいお問い合わせ', bodyLines),
    });
  }

  // 送信者への自動返信
  await sendEmail({
    to: opts.email,
    subject: '【BUYMO】お問い合わせを受け付けました',
    html: emailLayout(
      'お問い合わせを受け付けました',
      `${_p(`${_strong(esc(opts.name))} 様`)}
       ${_p('この度はBUYMOへお問い合わせいただきありがとうございます。以下の内容で受け付けました。通常2営業日以内にご返信いたします。')}
       ${bodyLines}
       ${_p('お急ぎの場合は下のボタンからチャット・お問い合わせもご利用ください。')}
       ${_supportFooter()}`,
    ),
  });
}

/** 正式査定の申込：運営通知＋申込者への自動返信。ベストエフォート。 */
export async function sendFormalAppraisalEmails(opts: {
  name: string;
  email?: string;
  phone: string;
  vehicle: string;
  aiLow?: number;
  aiHigh?: number;
}): Promise<void> {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const aiRange = opts.aiLow && opts.aiHigh
    ? `<p style="margin:8px 0;color:#475569;font-size:14px">AI概算: <strong>¥${opts.aiLow.toLocaleString()} 〜 ¥${opts.aiHigh.toLocaleString()}</strong></p>`
    : '';
  const body = `
    ${_p(`お名前: ${_strong(esc(opts.name))}`)}
    ${_p(`電話: ${_strong(esc(opts.phone))}`)}
    ${opts.email ? _p(`メール: ${_strong(esc(opts.email))}`) : ''}
    ${_p(`車両: ${_strong(esc(opts.vehicle))}`)}
    ${aiRange}
  `;

  const ops = opsEmail();
  if (ops) {
    await sendEmail({
      to: ops,
      subject: `【BUYMO】正式査定の依頼 — ${opts.name}様（${opts.vehicle}）`,
      html: emailLayout('正式査定の依頼が届きました', body),
    });
  }
  if (opts.email) {
    await sendEmail({
      to: opts.email,
      subject: '【BUYMO】正式査定のお申し込みを受け付けました',
      html: emailLayout(
        '正式査定のお申し込みを受け付けました',
        `${_p(`${_strong(esc(opts.name))} 様`)}
         ${_p('この度は正式査定をお申し込みいただきありがとうございます。担当より確定金額のご案内をご連絡いたします（通常1〜2営業日）。')}
         ${body}
         ${_supportFooter()}`,
      ),
    });
  }
}

/** 車両査定結果メール。 */
export async function sendAppraisalResultEmail(
  to: string,
  opts: { maker: string; model: string; year: number; priceLow: number; priceHigh: number },
): Promise<void> {
  const html = _wrap(`
    ${_h('車両査定結果が届きました')}
    ${_p(`${_strong(opts.year + '年 ' + opts.maker + ' ' + opts.model)} の査定が完了しました。`)}
    <div style="margin:16px 0;text-align:center;padding:20px;background:#f0fdf4;border-radius:8px">
      <p style="margin:0;font-size:12px;color:#6b7280">推定査定額</p>
      <p style="margin:8px 0 0;font-size:24px;font-weight:900;color:#16a34a">¥${opts.priceLow.toLocaleString()} 〜 ¥${opts.priceHigh.toLocaleString()}</p>
    </div>
    ${_p('この価格で出品して、より高く売りましょう。')}
    ${_btn('今すぐ出品する', `${_siteUrl()}/sell`)}
  `);
  await sendEmail({ to, subject: '【BUYMO】車両査定結果のお知らせ', html });
}

/** 廃車買取 新規申込メール（運営向け＋申込者の受付確認）。 */
export async function sendHaishaRequestEmails(opts: {
  applicantEmail?: string | null;
  name: string;
  vehicle: string;
  pref: string;
  offer: number | null;
  refund: number;
  needsAssessment: boolean;
}): Promise<void> {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const yen = (n: number) => '¥' + n.toLocaleString('ja-JP');
  const offerTxt = opts.offer == null ? '別途見積り' : yen(opts.offer);

  const ops = opsEmail();
  if (ops) {
    const html = _wrap(`
      ${_h('廃車買取の新規申込')}
      ${_p(`${_strong(esc(opts.name))} 様より廃車買取のお申し込みがありました。`)}
      ${_p(`車両：${esc(opts.vehicle)}`)}
      ${_p(`エリア：${esc(opts.pref)}`)}
      ${_p(`その場提示額：${_strong(offerTxt)}／還付金（概算）：${yen(opts.refund)}`)}
      ${opts.needsAssessment ? _p('⚠ 要別途査定（引取不可・水没・火災・エンジン欠品 等）') : ''}
      ${_btn('管理画面で確認', `${_siteUrl()}/admin/haisha`)}
    `);
    await sendEmail({ to: ops, subject: '【廃車買取】新規申込', html });
  }

  if (opts.applicantEmail) {
    const html = _wrap(`
      ${_h('廃車買取のお申し込みを受け付けました')}
      ${_p(`${_strong(esc(opts.name))} 様`)}
      ${_p('以下の内容で受け付けました。担当より無料引取り・正式金額・必要書類をご案内します（通常1〜2営業日）。')}
      ${_p(`車両：${esc(opts.vehicle)}`)}
      ${_p(`その場提示額（概算）：${_strong(offerTxt)}`)}
      ${_p(`還付金（別枠・概算）：${yen(opts.refund)}`)}
      ${_btn('申込状況を確認', `${_siteUrl()}/dashboard/haisha`)}
    `);
    await sendEmail({ to: opts.applicantEmail, subject: '【BUYMO】廃車買取のお申し込みを受け付けました', html });
  }
}

/** 加盟店スタッフ招待メール。 */
export async function sendDealerInviteEmail(
  to: string,
  opts: { dealerName: string; roleLabel: string; token: string },
): Promise<void> {
  if (!to) return;
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const url = `${_siteUrl()}/dealer/invite/${opts.token}`;
  const html = _wrap(`
    ${_h('加盟店スタッフへの招待')}
    ${_p(`${_strong(esc(opts.dealerName))} からスタッフ（${esc(opts.roleLabel)}）として招待されました。`)}
    ${_p('下のボタンから招待を承認すると、加盟店の管理画面にアクセスできます。')}
    ${_btn('招待を承認する', url)}
    ${_p('※ この招待リンクは7日間有効です。心当たりがない場合は破棄してください。')}
  `);
  await sendEmail({ to, subject: `【BUYMO】${opts.dealerName} からスタッフ招待が届きました`, html });
}

/** エスクロー進捗タイムラインの報告メール（相手当事者・本部向け）。 */
export async function sendEscrowProgressEmail(
  to: string,
  opts: { listingTitle: string; title: string; message: string; escrowId: string },
): Promise<void> {
  if (!to) return;
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const url = `${_siteUrl()}/escrow/${opts.escrowId}`;
  const html = _wrap(`
    ${_h('取引の進捗が更新されました')}
    ${_p(`${_strong(esc(opts.listingTitle))} の取引で、新しい進捗の報告がありました。`)}
    <div style="margin:12px 0;padding:12px 16px;background:#f0fdfa;border-left:3px solid #0F766E;border-radius:4px">
      <p style="margin:0;font-weight:700;color:#0C3A44;font-size:15px">${esc(opts.title)}</p>
      ${opts.message ? `<p style="margin:6px 0 0;color:#475569;font-size:14px;line-height:1.6">${esc(opts.message)}</p>` : ''}
    </div>
    ${_btn('取引を確認する', url)}
  `);
  await sendEmail({ to, subject: `【BUYMO】取引の進捗：${opts.title} — ${opts.listingTitle}`, html });
}

/** 廃車買取 進捗更新メール（申込者向け）。 */
export async function sendHaishaStatusEmail(
  to: string,
  opts: { statusLabel: string; vehicle: string },
): Promise<void> {
  if (!to) return;
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = _wrap(`
    ${_h('廃車買取の進捗が更新されました')}
    ${_p(`お申し込みの廃車買取（${esc(opts.vehicle)}）のステータスが ${_strong(esc(opts.statusLabel))} に更新されました。`)}
    ${_btn('申込状況を確認', `${_siteUrl()}/dashboard/haisha`)}
  `);
  await sendEmail({ to, subject: `【BUYMO】廃車買取の進捗：${opts.statusLabel}`, html });
}
