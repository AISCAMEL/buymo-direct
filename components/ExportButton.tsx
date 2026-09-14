'use client';

import { Download } from 'lucide-react';

interface Props {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** Open in a new tab instead of triggering a download (e.g. for invoice HTML). */
  newTab?: boolean;
}

export function ExportButton({ href, label, icon: Icon = Download, newTab = false }: Props) {
  return (
    <a
      href={href}
      {...(newTab
        ? { target: '_blank', rel: 'noopener noreferrer' }
        : { download: true })}
      className="btn-outline flex items-center gap-1"
    >
      <Icon className="h-4 w-4" />
      {label}
    </a>
  );
}
