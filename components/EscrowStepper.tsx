import { Check } from 'lucide-react';
import { ESCROW_STEPS } from '@/lib/constants';
import type { EscrowStatus } from '@/lib/types';

const ORDER = ESCROW_STEPS.map((s) => s.key);

export function EscrowStepper({ status }: { status: EscrowStatus }) {
  const current = ORDER.indexOf(status);

  return (
    <ol className="flex items-center">
      {ESCROW_STEPS.map((step, i) => {
        const done = i < current || status === 'completed';
        const active = i === current && status !== 'completed';
        return (
          <li key={step.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <span
                className={[
                  'flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold',
                  done ? 'bg-emerald-500 text-white' : active ? 'bg-navy-500 text-white' : 'bg-slate-200 text-slate-400',
                ].join(' ')}
              >
                {done ? <Check className="h-5 w-5" /> : i + 1}
              </span>
              <span className={`mt-1 whitespace-nowrap text-[11px] font-bold ${active ? 'text-navy-600' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
            {i < ESCROW_STEPS.length - 1 && (
              <div className={`mx-1 h-0.5 flex-1 ${i < current ? 'bg-emerald-500' : 'bg-slate-200'}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
