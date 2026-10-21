import { Suspense } from 'react';
import { AuthForm } from '@/components/AuthForm';

export const metadata = {
  title: 'ログイン',
  description: 'BUYMO にログインして、出品・購入・加盟店管理などの機能をご利用いただけます。',
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm mode="login" />
    </Suspense>
  );
}
