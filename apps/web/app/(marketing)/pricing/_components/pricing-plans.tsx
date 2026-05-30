import Link from 'next/link';

import { Check } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Trans } from '@kit/ui/trans';

import { formatBillingAmountPerMonth } from '~/lib/lms/billing/format-currency';
import {
  isUnlimitedQuota,
  type PublicPlan,
} from '~/lib/lms/billing/load-public-plans';

interface PricingPlansProps {
  plans: PublicPlan[];
  isLoggedIn: boolean;
  stripeEnabled: boolean;
  locale: string;
}

function formatQuota(value: number) {
  if (isUnlimitedQuota(value)) {
    return null;
  }

  return value.toLocaleString();
}

function PlanQuotaItem({
  quotaType,
  value,
}: {
  quotaType: 'students' | 'exams' | 'questions';
  value: number;
}) {
  const formatted = formatQuota(value);
  const countKey = `marketing:pricingPage.quota${quotaType.charAt(0).toUpperCase()}${quotaType.slice(1)}`;
  const unlimitedKey = `${countKey}Unlimited`;

  return (
    <li className="flex items-start gap-2 text-sm">
      <Check className="text-primary mt-0.5 size-4 shrink-0" />
      {formatted === null ?
        <Trans i18nKey={unlimitedKey} />
      : <Trans i18nKey={countKey} values={{ count: formatted }} />}
    </li>
  );
}

function PlanCard({
  plan,
  isLoggedIn,
  popular,
  locale,
}: {
  plan: PublicPlan;
  isLoggedIn: boolean;
  popular?: boolean;
  locale: string;
}) {
  const isFree = plan.slug === 'free';
  const ctaHref =
    isLoggedIn ?
      isFree ?
        '/home'
      : '/home/billing'
    : '/auth/sign-up';

  const descriptionKey = `marketing:pricingPage.plans.${plan.slug}.description`;
  const ctaKey =
    isLoggedIn ?
      isFree ?
        'marketing:pricingPage.ctaDashboard'
      : 'marketing:pricingPage.ctaUpgrade'
    : isFree ?
      'marketing:pricingPage.ctaFree'
    : 'marketing:pricingPage.ctaSignUp';

  return (
    <Card
      className={
        popular ?
          'border-primary relative flex flex-col shadow-md'
        : 'relative flex flex-col'
      }
    >
      {popular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Trans i18nKey="marketing:pricingPage.popular" />
        </Badge>
      )}

      <CardHeader className="gap-2">
        <CardTitle>{plan.name}</CardTitle>
        <CardDescription>
          <Trans i18nKey={descriptionKey} defaults={plan.name} />
        </CardDescription>
        <div className="pt-2">
          {isFree ?
            <p className="text-3xl font-bold tracking-tight">
              <Trans i18nKey="marketing:pricingPage.freePrice" />
            </p>
          : <p className="text-3xl font-bold tracking-tight">
              {formatBillingAmountPerMonth(plan.price_monthly, locale)}
            </p>
          }
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <ul className="flex flex-col gap-3">
          <PlanQuotaItem quotaType="students" value={plan.max_students} />
          <PlanQuotaItem quotaType="exams" value={plan.max_exams} />
          <PlanQuotaItem quotaType="questions" value={plan.max_questions} />
          {plan.slug === 'pro' && (
            <li className="flex items-start gap-2 text-sm">
              <Check className="text-primary mt-0.5 size-4 shrink-0" />
              <Trans i18nKey="marketing:pricingPage.plans.pro.featureReports" />
            </li>
          )}
          {plan.slug === 'enterprise' && (
            <>
              <li className="flex items-start gap-2 text-sm">
                <Check className="text-primary mt-0.5 size-4 shrink-0" />
                <Trans i18nKey="marketing:pricingPage.plans.enterprise.featurePriority" />
              </li>
              <li className="flex items-start gap-2 text-sm">
                <Check className="text-primary mt-0.5 size-4 shrink-0" />
                <Trans i18nKey="marketing:pricingPage.plans.enterprise.featureSupport" />
              </li>
            </>
          )}
        </ul>
      </CardContent>

      <CardFooter>
        <Button asChild className="w-full" variant={popular ? 'default' : 'outline'}>
          <Link href={ctaHref}>
            <Trans i18nKey={ctaKey} />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function PricingPlans({
  plans,
  isLoggedIn,
  stripeEnabled,
  locale,
}: PricingPlansProps) {
  return (
    <div className="flex flex-col gap-10 pb-16">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isLoggedIn={isLoggedIn}
            locale={locale}
            popular={plan.slug === 'pro'}
          />
        ))}
      </div>

      <div className="bg-muted/30 mx-auto flex max-w-3xl flex-col gap-3 rounded-xl border p-6 text-center">
        <p className="text-muted-foreground text-sm leading-relaxed">
          {stripeEnabled ?
            <Trans i18nKey="marketing:pricingPage.paymentNoteStripe" />
          : <Trans i18nKey="marketing:pricingPage.paymentNoteBank" />}
        </p>
        <p className="text-muted-foreground text-sm">
          <Trans
            i18nKey="marketing:pricingPage.orgNote"
            components={{
              faqLink: (
                <Link
                  href="/faq"
                  className="text-primary underline-offset-4 hover:underline"
                />
              ),
            }}
          />
        </p>
      </div>
    </div>
  );
}
