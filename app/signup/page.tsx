import { Suspense } from 'react';
import { AuthForm } from '@/components/AuthForm';

export const metadata = {
  title: '新規会員登録（無料）',
  description: '無料の会員登録で、中古車の出品・購入・お気に入り・査定依頼がすぐに使えます。',
};

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
