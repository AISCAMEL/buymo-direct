// KYC Auto-scoring system

export interface KycScoreInput {
  hasDriversLicense: boolean;  // from kyc_verifications table
  hasMyNumber: boolean;
  hasPassport: boolean;
  phoneVerified: boolean;
  emailVerified: boolean;
  accountAgeDays: number;
  priorTransactions: number;
}

export interface KycScoreResult {
  score: number;        // 0-100
  grade: 'A' | 'B' | 'C' | 'D';
  autoDecision: 'approved' | 'manual_review' | 'rejected';
  reasons: string[];
}

export function calculateKycScore(input: KycScoreInput): KycScoreResult {
  let score = 0;
  const reasons: string[] = [];

  // Document scoring
  if (input.hasDriversLicense) {
    score += 30;
    reasons.push('運転免許証あり (+30)');
  }
  if (input.hasMyNumber) {
    score += 25;
    reasons.push('マイナンバーカードあり (+25)');
  }
  if (input.hasPassport) {
    score += 20;
    reasons.push('パスポートあり (+20)');
  }

  // Verification scoring
  if (input.phoneVerified) {
    score += 10;
    reasons.push('電話番号確認済み (+10)');
  }
  if (input.emailVerified) {
    score += 5;
    reasons.push('メールアドレス確認済み (+5)');
  }

  // Account maturity
  if (input.accountAgeDays > 30) {
    score += 5;
    reasons.push('アカウント開設30日以上 (+5)');
  }

  // Prior transaction history
  if (input.priorTransactions > 0) {
    score += 5;
    reasons.push(`取引実績あり (${input.priorTransactions}件) (+5)`);
  }

  // Clamp to 0-100
  score = Math.min(100, Math.max(0, score));

  // Grade determination
  let grade: KycScoreResult['grade'];
  if (score >= 80) {
    grade = 'A';
  } else if (score >= 60) {
    grade = 'B';
  } else if (score >= 40) {
    grade = 'C';
  } else {
    grade = 'D';
  }

  // Auto decision
  let autoDecision: KycScoreResult['autoDecision'];
  if (grade === 'A' || grade === 'B') {
    autoDecision = 'approved';
  } else if (grade === 'C') {
    autoDecision = 'manual_review';
  } else {
    autoDecision = 'rejected';
  }

  return { score, grade, autoDecision, reasons };
}
