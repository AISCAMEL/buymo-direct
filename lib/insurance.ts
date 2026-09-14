// 自動車保険料見積もりシミュレーション

export interface InsuranceInput {
  vehiclePrice: number;
  year: number;
  maker: string;
  age: number;           // 運転者年齢
  yearsNoAccident: number; // 無事故年数（0-20+）
}

export interface InsurancePlan {
  company: string;
  planName: string;
  monthlyPremium: number;
  annualPremium: number;
  coverage: string[];
  features: string[];
}

/**
 * 保険料試算
 * ベース年率: 車両価格 × 2.5%
 * 年齢割引: 26歳以上 -20%、30歳以上 -25%、35歳以上 -30%
 * 無事故割引: 1年 -5%、3年 -15%、5年 -25%、10年 -40%
 */
export function estimateInsurance(input: InsuranceInput): InsurancePlan[] {
  const { vehiclePrice, age, yearsNoAccident } = input;

  // ベース年間保険料（2.5%）
  const baseAnnual = vehiclePrice * 0.025;

  // 年齢割引率
  let ageDiscount = 0;
  if (age >= 35) ageDiscount = 0.30;
  else if (age >= 30) ageDiscount = 0.25;
  else if (age >= 26) ageDiscount = 0.20;

  // 無事故割引率
  let noAccidentDiscount = 0;
  if (yearsNoAccident >= 10) noAccidentDiscount = 0.40;
  else if (yearsNoAccident >= 5) noAccidentDiscount = 0.25;
  else if (yearsNoAccident >= 3) noAccidentDiscount = 0.15;
  else if (yearsNoAccident >= 1) noAccidentDiscount = 0.05;

  const totalDiscount = ageDiscount + noAccidentDiscount;
  const discountedAnnual = baseAnnual * (1 - totalDiscount);

  const plans: InsurancePlan[] = [
    {
      company: '東京海上日動',
      planName: 'トータルアシスト自動車保険（ベーシック）',
      annualPremium: Math.round(discountedAnnual * 0.85),
      monthlyPremium: Math.round((discountedAnnual * 0.85) / 12),
      coverage: [
        '対人賠償責任（無制限）',
        '対物賠償責任（無制限）',
        '人身傷害（3,000万円）',
        '車両保険なし',
      ],
      features: [
        '24時間ロードサービス',
        '弁護士費用特約対応',
      ],
    },
    {
      company: '損保ジャパン',
      planName: 'THE クルマの保険（スタンダード）',
      annualPremium: Math.round(discountedAnnual * 1.05),
      monthlyPremium: Math.round((discountedAnnual * 1.05) / 12),
      coverage: [
        '対人賠償責任（無制限）',
        '対物賠償責任（無制限）',
        '人身傷害（5,000万円）',
        '車両保険（一般条件）',
      ],
      features: [
        '24時間ロードサービス',
        'レンタカー費用特約',
        '弁護士費用特約対応',
      ],
    },
    {
      company: 'AIG損保',
      planName: 'ダイレクト総合自動車保険（プレミアム）',
      annualPremium: Math.round(discountedAnnual * 1.25),
      monthlyPremium: Math.round((discountedAnnual * 1.25) / 12),
      coverage: [
        '対人賠償責任（無制限）',
        '対物賠償責任（無制限）',
        '人身傷害（1億円）',
        '車両保険（一般・エコノミー選択可）',
        '搭乗者傷害保険',
      ],
      features: [
        '24時間ロードサービス',
        'レンタカー費用特約',
        '弁護士費用特約対応',
        '新車特約（全損時）',
        '事故現場急行サービス',
      ],
    },
  ];

  return plans;
}
