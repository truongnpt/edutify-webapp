'use client';

import { forwardRef, useEffect, useRef, useState, useTransition } from 'react';

import { CreditCard, Upload } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Trans } from '@kit/ui/trans';

import { formatBillingAmount, formatBillingAmountPerMonth } from '~/lib/lms/billing/format-currency';
import type { OrganizationContext } from '~/lib/lms/types';
import {
  createPaymentAction,
  uploadPaymentProof,
} from '~/lib/lms/billing/server-actions';
import { createStripeCheckoutAction, createStripePortalAction } from '~/lib/lms/billing/stripe-server-actions';

interface PlanItem {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  max_students: number;
  max_exams: number;
  max_questions: number;
}

interface PaymentItem {
  id: string;
  amount: number;
  status: string;
  payment_method?: string | null;
  created_at: string;
  rejection_reason: string | null;
  plan: { name: string; slug: string } | null;
}

interface BillingPanelProps {
  context: OrganizationContext;
  upgradePlans: PlanItem[];
  payments: PaymentItem[];
  stripeEnabled: boolean;
  stripeCustomerId: string | null;
}

export function BillingPanel({
  context,
  upgradePlans,
  payments,
  stripeEnabled,
  stripeCustomerId,
}: BillingPanelProps) {
  const { t, i18n } = useTranslation('lms');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [selectedPlan, setSelectedPlan] = useState<string>('pro');
  const fileRef = useRef<HTMLInputElement>(null);

  const hasPending = payments.some((p) => p.status === 'pending');

  useEffect(() => {
    const stripeResult = searchParams.get('stripe');

    if (stripeResult === 'success') {
      toast.success(t('toast.stripePaymentSuccess'));
      router.replace('/home/billing');
    } else if (stripeResult === 'cancelled') {
      toast.error(t('toast.stripePaymentCancelled'));
      router.replace('/home/billing');
    }
  }, [searchParams, router, t]);

  const submitPayment = () => {
    const file = fileRef.current?.files?.[0];

    if (!file) {
      toast.error(t('toast.proofRequired'));
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const { path } = await uploadPaymentProof(formData);

        await createPaymentAction({
          planSlug: selectedPlan as 'pro' | 'enterprise',
          proofImagePath: path,
        });

        toast.success(t('toast.paymentSubmitted'));
        fileRef.current!.value = '';
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t('toast.paymentSubmitFailed');
        toast.error(message);
      }
    });
  };

  const payWithStripe = () => {
    startTransition(async () => {
      try {
        const result = await createStripeCheckoutAction({
          planSlug: selectedPlan as 'pro' | 'enterprise',
        });

        if (result.url) {
          window.location.href = result.url;
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t('toast.stripeCheckoutFailed');
        toast.error(message);
      }
    });
  };

  const openStripePortal = () => {
    startTransition(async () => {
      try {
        const result = await createStripePortalAction({});

        if (result.url) {
          window.location.href = result.url;
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t('toast.stripePortalFailed');
        toast.error(message);
      }
    });
  };

  const showStripePortal =
    stripeEnabled &&
    Boolean(stripeCustomerId) &&
    context.plan?.slug &&
    context.plan.slug !== 'free';

  const planSelector = (
    <div className={'flex flex-col gap-2'}>
      {upgradePlans.map((plan) => (
        <label
          key={plan.id}
          className={
            selectedPlan === plan.slug ?
              'flex cursor-pointer items-center justify-between rounded-md border-2 border-primary p-4'
            : 'flex cursor-pointer items-center justify-between rounded-md border p-4'
          }
        >
          <div>
            <input
              type={'radio'}
              name={'plan'}
              value={plan.slug}
              checked={selectedPlan === plan.slug}
              onChange={() => setSelectedPlan(plan.slug)}
              className={'mr-3'}
            />
            <span className={'font-medium'}>{plan.name}</span>
          </div>
          <span className={'font-semibold'}>
            {formatBillingAmountPerMonth(plan.price_monthly, i18n.language)}
          </span>
        </label>
      ))}
    </div>
  );

  return (
    <div className={'mx-auto flex max-w-2xl flex-col gap-6'}>
      <Card>
        <CardHeader>
          <CardTitle className={'flex items-center gap-2 text-base'}>
            <CreditCard className={'size-5'} />
            <Trans i18nKey={'lms:billing.currentPlan'} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={'text-2xl font-bold'}>{context.plan?.name ?? 'Free'}</p>
          {context.plan && (
            <p className={'text-muted-foreground mt-2 text-sm'}>
              {context.plan.max_questions} questions · {context.plan.max_exams}{' '}
              exams · {context.plan.max_students} students
            </p>
          )}
          {showStripePortal && (
            <div className={'mt-4 flex flex-col gap-2'}>
              <p className={'text-muted-foreground text-sm'}>
                <Trans i18nKey={'lms:billing.stripePortalHint'} />
              </p>
              <Button
                variant={'outline'}
                onClick={openStripePortal}
                disabled={pending}
              >
                <CreditCard className={'mr-2 size-4'} />
                <Trans i18nKey={'lms:billing.manageStripeSubscription'} />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className={'text-base'}>
            <Trans i18nKey={'lms:billing.upgradeTitle'} />
          </CardTitle>
          <CardDescription>
            <Trans i18nKey={'lms:billing.upgradeDescription'} />
          </CardDescription>
        </CardHeader>
        <CardContent className={'flex flex-col gap-4'}>
          <Tabs defaultValue={stripeEnabled ? 'stripe' : 'bank'}>
            <TabsList className={'grid w-full grid-cols-2'}>
              {stripeEnabled && (
                <TabsTrigger value={'stripe'}>
                  <Trans i18nKey={'lms:billing.stripeTab'} />
                </TabsTrigger>
              )}
              <TabsTrigger value={'bank'}>
                <Trans i18nKey={'lms:billing.bankTab'} />
              </TabsTrigger>
            </TabsList>

            {stripeEnabled && (
              <TabsContent value={'stripe'} className={'mt-4 flex flex-col gap-4'}>
                <p className={'text-muted-foreground text-sm'}>
                  <Trans i18nKey={'lms:billing.stripeDescription'} />
                </p>
                {planSelector}
                <Button
                  onClick={payWithStripe}
                  disabled={pending || hasPending}
                  className={'w-full'}
                >
                  <CreditCard className={'mr-2 size-4'} />
                  <Trans i18nKey={'lms:billing.payWithStripe'} />
                </Button>
              </TabsContent>
            )}

            <TabsContent value={'bank'} className={'mt-4 flex flex-col gap-4'}>
              <div className={'bg-muted/50 rounded-md border p-4 text-sm'}>
                <p className={'font-medium'}>
                  <Trans i18nKey={'lms:billing.bankInfo'} />
                </p>
                <p className={'text-muted-foreground mt-1'}>
                  Vietcombank · 1234567890 · EDUTIFY JSC
                </p>
                <p className={'text-muted-foreground mt-1 text-xs'}>
                  <Trans i18nKey={'lms:billing.transferNote'} />
                </p>
              </div>

              {planSelector}

              <div className={'flex flex-col gap-2'}>
                <label className={'text-sm font-medium'}>
                  <Trans i18nKey={'lms:billing.proofLabel'} />
                </label>
                <InputFile ref={fileRef} />
              </div>

              <Button
                onClick={submitPayment}
                disabled={pending || hasPending}
                className={'w-full'}
              >
                <Upload className={'mr-2 size-4'} />
                <Trans i18nKey={'lms:billing.submitPayment'} />
              </Button>
            </TabsContent>
          </Tabs>

          {hasPending && (
            <p className={'text-muted-foreground text-center text-sm'}>
              <Trans i18nKey={'lms:billing.pendingNotice'} />
            </p>
          )}
        </CardContent>
      </Card>

      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className={'text-base'}>
              <Trans i18nKey={'lms:billing.history'} />
            </CardTitle>
          </CardHeader>
          <CardContent className={'flex flex-col gap-2'}>
            {payments.map((payment) => (
              <div
                key={payment.id}
                className={'flex items-center justify-between rounded-md border p-3 text-sm'}
              >
                <div>
                  <p>{payment.plan?.name ?? '—'}</p>
                  <p className={'text-muted-foreground'}>
                    {formatBillingAmount(Number(payment.amount), i18n.language)} ·{' '}
                    {new Date(payment.created_at).toLocaleDateString()}
                    {payment.payment_method === 'stripe' && (
                      <> · Stripe</>
                    )}
                  </p>
                  {payment.rejection_reason && (
                    <p className={'text-destructive text-xs'}>
                      {payment.rejection_reason}
                    </p>
                  )}
                </div>
                <Badge
                  variant={
                    payment.status === 'approved' ? 'default'
                    : payment.status === 'rejected' ?
                      'destructive'
                    : 'secondary'
                  }
                >
                  {payment.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const InputFile = forwardRef<HTMLInputElement>((_, ref) => (
  <input
    ref={ref}
    type={'file'}
    accept={'image/jpeg,image/png,image/webp'}
    className={
      'border-input file:bg-muted file:text-foreground flex w-full cursor-pointer rounded-md border text-sm file:mr-4 file:rounded-md file:border-0 file:px-4 file:py-2'
    }
  />
));

InputFile.displayName = 'InputFile';
