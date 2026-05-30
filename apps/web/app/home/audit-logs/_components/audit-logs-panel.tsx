'use client';

import { Badge } from '@kit/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Trans } from '@kit/ui/trans';

interface AuditLogItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  user_id: string | null;
}

interface AuditLogsPanelProps {
  logs: AuditLogItem[];
}

export function AuditLogsPanel({ logs }: AuditLogsPanelProps) {
  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className={'py-12 text-center'}>
          <p className={'text-muted-foreground text-sm'}>
            <Trans i18nKey={'lms:auditLogs.empty'} />
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={'flex flex-col gap-3'}>
      {logs.map((log) => (
        <Card key={log.id}>
          <CardHeader className={'pb-2'}>
            <div className={'flex flex-wrap items-center gap-2'}>
              <CardTitle className={'text-base'}>{log.action}</CardTitle>
              <Badge variant={'outline'}>{log.entity_type}</Badge>
            </div>
          </CardHeader>
          <CardContent className={'text-muted-foreground flex flex-col gap-1 text-sm'}>
            <span>
              {new Date(log.created_at).toLocaleString()}
            </span>
            {log.entity_id && <span>ID: {log.entity_id}</span>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
