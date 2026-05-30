'use client';

import { Badge } from '@kit/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Trans } from '@kit/ui/trans';

import {
  getPermissionMatrixRows,
  ROLE_LABELS,
} from '~/lib/lms/permissions/permission-labels';

export function PermissionsMatrixPanel() {
  const rows = getPermissionMatrixRows();

  return (
    <Card>
      <CardHeader>
        <CardTitle className={'text-base'}>
          <Trans i18nKey={'lms:members.permissionsTitle'} />
        </CardTitle>
      </CardHeader>
      <CardContent className={'overflow-x-auto'}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Trans i18nKey={'lms:members.moduleLabel'} />
              </TableHead>
              {Object.entries(ROLE_LABELS).map(([role, label]) => (
                <TableHead key={role}>{label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.module}>
                <TableCell className={'font-medium'}>{row.label}</TableCell>
                {row.roles.map(({ role, actions }) => (
                  <TableCell key={role}>
                    {actions.length === 0 ?
                      <span className={'text-muted-foreground'}>—</span>
                    : <div className={'flex flex-wrap gap-1'}>
                        {actions.map((action) => (
                          <Badge key={action} variant={'secondary'} className={'text-xs'}>
                            {action}
                          </Badge>
                        ))}
                      </div>
                    }
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
