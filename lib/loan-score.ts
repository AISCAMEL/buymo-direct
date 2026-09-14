// Loan Auto-scoring system

export interface LoanScoreInput {
  vehiclePrice: number;
  downPayment: number;
  termMonths: number;
  kycGrade: 'A' | 'B' | 'C' | 'D' | null;
  priorDefaultCount: number;
  memberRank: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface LoanScoreResult {
  score: number;               // 0-100
  grade: 'A' | 'B' | 'C' | 'D';
  maxApprovalAmount: number;
  recommendedRate: number;     // APR %
  autoDecision: 'approved' | 'conditional' | 'manual_review' | 'rejected';
  conditions: string[];        // e.g. ['頭金30%以上必要', '保証人が必要']
}

export function calculateLoanScore(input: LoanScoreInput): LoanScoreResult {
  const { vehiclePrice, downPayment, termMonths, kycGrade, priorDefaultCount, memberRank } = input;

  const conditions: string[] = [];

  // Immediate rejection conditions
  if (priorDefaultCount > 0) {
    return {
      score: 0,
      grade: 'D' as const,
      maxApprovalAmount: 0,
      recommendedRate: 0,
      autoDecision: 'rejected',
      conditions: ['過去の支払い不履行の履歴があります'],
    };
  }

  // LTV (Loan-to-Value) ratio
  const loanAmount = Math.max(0, vehiclePrice - downPayment);
  const ltv = vehiclePrice > 0 ? loanAmount / vehiclePrice : 1;

  if (ltv > 0.9) {
    return {
      score: 0,
      grade: 'D' as const,
      maxApprovalAmount: 0,
      recommendedRate: 0,
      autoDecision: 'rejected',
      conditions: ['頭金が不足しています（LTV 90%超）', '頭金10%以上が必要です'],
    };
  }

  let score = 0;

  // KYC grade contribution
  if (kycGrade === 'A') {
    score += 30;
  } else if (kycGrade === 'B') {
    score += 20;
  } else if (kycGrade === 'C') {
    score += 10;
  }
  // D or null: +0

  // Member rank contribution
  if (memberRank === 'platinum') {
    score += 15;
  } else if (memberRank === 'gold') {
    score += 10;
  } else if (memberRank === 'silver') {
    score += 5;
  }
  // bronze: +0

  // LTV-based scoring (lower LTV = higher score)
  if (ltv <= 0.5) {
    score += 30;
  } else if (ltv <= 0.7) {
    score += 20;
  } else if (ltv <= 0.8) {
    score += 10;
  } else {
    // LTV 0.8 ~ 0.9: conditional
    score += 5;
    conditions.push('頭金30%以上を推奨します');
  }

  // Term bonus (shorter terms = slightly better)
  if (termMonths <= 36) {
    score += 10;
  } else if (termMonths <= 60) {
    score += 5;
  }

  // Clamp to 0-100
  score = Math.min(100, Math.max(0, score));

  // Determine recommended rate based on KYC grade
  let recommendedRate: number;
  if (kycGrade === 'A') {
    recommendedRate = 3.5;
  } else if (kycGrade === 'B') {
    recommendedRate = 4.2;
  } else if (kycGrade === 'C') {
    recommendedRate = 5.9;
  } else {
    // D or null
    recommendedRate = 7.9;
  }

  // Determine max approval amount based on score
  let maxApprovalAmount: number;
  if (score >= 70) {
    maxApprovalAmount = vehiclePrice * 0.9;
  } else if (score >= 50) {
    maxApprovalAmount = vehiclePrice * 0.7;
  } else if (score >= 30) {
    maxApprovalAmount = vehiclePrice * 0.5;
  } else {
    maxApprovalAmount = 0;
  }

  // Determine grade based on score
  let grade: LoanScoreResult['grade'];
  if (score >= 80) {
    grade = 'A';
  } else if (score >= 60) {
    grade = 'B';
  } else if (score >= 40) {
    grade = 'C';
  } else {
    grade = 'D';
  }

  // Determine auto decision
  let autoDecision: LoanScoreResult['autoDecision'];
  if (ltv > 0.8) {
    // LTV 0.8 ~ 0.9: conditional
    autoDecision = 'conditional';
    conditions.push('保証人が必要な場合があります');
  } else if (score >= 60 && (kycGrade === 'A' || kycGrade === 'B')) {
    autoDecision = 'approved';
  } else if (score >= 30) {
    autoDecision = 'manual_review';
    conditions.push('追加書類の提出が必要な場合があります');
  } else {
    autoDecision = 'rejected';
    conditions.push('審査基準を満たしていません');
  }

  return {
    score,
    grade,
    maxApprovalAmount: Math.round(maxApprovalAmount),
    recommendedRate,
    autoDecision,
    conditions,
  };
}
