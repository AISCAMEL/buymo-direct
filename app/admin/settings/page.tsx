import { requireAdmin } from '@/lib/admin';
import { getPricingConfig } from '@/lib/settings';
import { Settings } from 'lucide-react';
import { savePricingConfig } from './actions';

export const dynamic = 'force-dynamic';

function Field({ name, label, defaultValue, suffix, step }: { name: string; label: string; defaultValue: number; suffix?: string; step?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-slate-600">{label}</span>
      <div className="flex items-center gap-1">
        <input name={name} type="number" step={step ?? '1'} min={0} defaultValue={defaultValue} className="input h-9 text-sm" />
        {suffix && <span className="text-xs text-slate-400">{suffix}</span>}
      </div>
    </label>
  );
}

export default async function AdminSettingsPage() {
  await requireAdmin();
  const c = await getPricingConfig();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6 text-navy-500" />
        <h1 className="text-2xl font-black">料金・係数の設定</h1>
      </div>
      <p className="text-sm text-slate-500">
        ここで変更した金額・係数は、購入見積り（現金/ローン）やAI保証計算に即時反映されます。
      </p>

      <form action={savePricingConfig} className="space-y-6">
        {/* エスクロー */}
        <section className="card space-y-3 p-5">
          <h2 className="font-bold text-slate-700">エスクロー・取引手数料（買い手・定額）</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field name="esc_max1" label="区分1の上限（円未満）" defaultValue={(c.escrowTiers[0]?.max as number) ?? 1000000} />
            <Field name="esc_fee1" label="区分1の手数料" defaultValue={c.escrowTiers[0]?.fee ?? 19800} suffix="円" />
            <Field name="esc_max2" label="区分2の上限（円未満）" defaultValue={(c.escrowTiers[1]?.max as number) ?? 2000000} />
            <Field name="esc_fee2" label="区分2の手数料" defaultValue={c.escrowTiers[1]?.fee ?? 39800} suffix="円" />
            <Field name="esc_max3" label="区分3の上限（円未満）" defaultValue={(c.escrowTiers[2]?.max as number) ?? 4000000} />
            <Field name="esc_fee3" label="区分3の手数料" defaultValue={c.escrowTiers[2]?.fee ?? 59800} suffix="円" />
            <Field name="esc_fee4" label="上限超（それ以上）の手数料" defaultValue={c.escrowTiers[3]?.fee ?? 79800} suffix="円" />
          </div>
        </section>

        {/* ローン */}
        <section className="card space-y-3 p-5">
          <h2 className="font-bold text-slate-700">ローン手数料</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field name="loan_rate_pct" label="料率" defaultValue={Math.round(c.loanRate * 1000) / 10} suffix="%" step="0.1" />
            <Field name="loan_fee_min" label="下限額" defaultValue={c.loanFeeMin} suffix="円" />
          </div>
        </section>

        {/* 名義変更 */}
        <section className="card space-y-3 p-5">
          <h2 className="font-bold text-slate-700">名義変更代行</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field name="transfer_normal" label="普通車" defaultValue={c.transferNormal} suffix="円" />
            <Field name="transfer_kei" label="軽自動車" defaultValue={c.transferKei} suffix="円" />
          </div>
        </section>

        {/* 保証 */}
        <section className="card space-y-3 p-5">
          <h2 className="font-bold text-slate-700">故障保証（計算式）</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field name="w_base_kei" label="基本料 軽（6ヶ月）" defaultValue={c.warrantyBaseKei} suffix="円" />
            <Field name="w_base_dom" label="基本料 国産（6ヶ月）" defaultValue={c.warrantyBaseDomestic} suffix="円" />
            <Field name="w_base_imp" label="基本料 輸入（6ヶ月）" defaultValue={c.warrantyBaseImport} suffix="円" />
            <Field name="w_age_free" label="年式：無加算の年数" defaultValue={c.warrantyAgeFreeYears} suffix="年まで" />
            <Field name="w_age_step_pct" label="年式：1年ごと加算" defaultValue={Math.round(c.warrantyAgeStep * 1000) / 10} suffix="%" step="0.1" />
            <Field name="w_cap" label="保証料の上限" defaultValue={c.warrantyCap} suffix="円" />
            <Field name="w_km_free" label="距離：無加算のkm" defaultValue={c.warrantyMileageFreeKm} suffix="kmまで" />
            <Field name="w_km_step_pct" label="距離：1万kmごと加算" defaultValue={Math.round(c.warrantyMileageStep * 1000) / 10} suffix="%" step="0.1" />
          </div>
          <p className="text-xs text-slate-400">期間係数（6ヶ月=1.0／12ヶ月=1.7／24ヶ月=2.4）は固定です。</p>
        </section>

        <div className="flex justify-end">
          <button type="submit" className="btn-accent px-8">設定を保存する</button>
        </div>
      </form>
    </div>
  );
}
