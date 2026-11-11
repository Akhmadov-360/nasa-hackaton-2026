'use client';
import { Download } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { downloadLogCsv, downloadLogXlsx } from '@/lib/exportCsv';
import { useT } from '@/lib/i18n';
import { useMissionStore } from '@/lib/store/missionStore';

/** Export the flight log as an Excel workbook (opens in columns everywhere) or as CSV. `trigger` is the button's content. */
export function LogExportMenu({ trigger, size = 'sm', variant = 'secondary', iconOnly = false }: {
  trigger?: ReactNode; size?: 'sm' | 'icon'; variant?: 'secondary' | 'ghost'; iconOnly?: boolean;
}) {
  const t = useT();
  const locale = useMissionStore((s) => s.locale);
  const audit = useMissionStore((s) => s.audit);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={iconOnly ? 'size-8' : undefined} disabled={!audit.length} aria-label={t('log.export')}>
          <Download /> {iconOnly ? null : (trigger ?? t('log.export'))}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => downloadLogXlsx(audit, locale)}>{t('log.export.xlsx')}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => downloadLogCsv(audit, locale)}>{t('log.export.csv')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
