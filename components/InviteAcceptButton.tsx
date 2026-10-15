'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { acceptInvite } from '@/app/dealer/actions';

export function InviteAcceptButton({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAccept() {
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.set('token', token);
    const res = await acceptInvite(fd);
    if (res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    router.push('/dealer/dashboard');
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <button type="button" onClick={onAccept} disabled={loading} className="btn-accent w-full">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        招待を承認して参加する
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
