'use client';

import { useEffect, useState, useTransition } from 'react';

import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Trans } from '@kit/ui/trans';

import { formatBillingAmount } from '~/lib/lms/billing/format-currency';
import {
  approvePaymentAction,
  getPaymentProofSignedUrl,
  rejectPaymentAction,
} from '~/lib/lms/billing/server-actions';

interface PendingPaymentItem {
  id: string;
  amount: number;
  proofImagePath: string | null;
  createdAt: string;
  organizationName: string;
  planName: string;
}

interface AdminPaymentsPanelProps {
  payments: PendingPaymentItem[];
}

export function AdminPaymentsPanel({ payments }: AdminPaymentsPanelProps) {
  const { t, i18n } = useTranslation('lms');
  const [pending, startTransition] = useTransition();
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    void Promise.all(
      payments
        .filter((payment) => payment.proofImagePath)
        .map(async (payment) => {
        try {
          const url = await getPaymentProofSignedUrl(payment.proofImagePath!);

          setProofUrls((prev) => ({ ...prev, [payment.id]: url }));
        } catch {
          // ignore individual failures
        }
      }),
    );
  }, [payments]);

  const approve = (paymentId: string) => {
    startTransition(async () => {
      try {
        await approvePaymentAction({ paymentId });
        toast.success(t('toast.paymentApproved'));
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t('toast.paymentApproveFailed'),
        );
      }
    });
  };

  const reject = (paymentId: string) => {
    const reason = prompt('Rejection reason (optional)') ?? undefined;

    startTransition(async () => {
      try {
        await rejectPaymentAction({ paymentId, reason });
        toast.success(t('toast.paymentRejected'));
      } catch {
        toast.error(t('toast.paymentRejectFailed'));
      }
    });
  };

  if (payments.length === 0) {
    return (
      <Card>
        <CardContent className={'py-12 text-center'}>
          <p className={'text-muted-foreground text-sm'}>
            <Trans i18nKey={'lms:adminPayments.empty'} />
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={'flex flex-col gap-4'}>
      {payments.map((payment) => (
        <Card key={payment.id}>
          <CardHeader className={'flex flex-row items-start justify-between'}>
            <div>
              <CardTitle className={'text-base'}>
                {payment.organizationName}
              </CardTitle>
              <p className={'text-muted-foreground text-sm'}>
                {payment.planName} ·{' '}
                {formatBillingAmount(payment.amount, i18n.language)} ·{' '}
                {new Date(payment.createdAt).toLocaleString()}
              </p>
            </div>
            <Badge variant={'secondary'}>
              <Trans i18nKey={'lms:billing.statusPending'} />
            </Badge>
          </CardHeader>
          <CardContent className={'flex flex-col gap-4'}>
            {proofUrls[payment.id] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={proofUrls[payment.id]}
                alt={'Payment proof'}
                className={'max-h-64 rounded-md border object-contain'}
              />
            )}
            <div className={'flex gap-2'}>
              <Button
                onClick={() => approve(payment.id)}
                disabled={pending}
                className={'flex-1'}
              >
                <Check className={'mr-2 size-4'} />
                <Trans i18nKey={'lms:adminPayments.approve'} />
              </Button>
              <Button
                variant={'destructive'}
                onClick={() => reject(payment.id)}
                disabled={pending}
                className={'flex-1'}
              >
                <X className={'mr-2 size-4'} />
                <Trans i18nKey={'lms:adminPayments.reject'} />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
