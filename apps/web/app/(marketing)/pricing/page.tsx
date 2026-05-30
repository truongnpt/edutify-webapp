import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { PricingPlans } from '~/(marketing)/pricing/_components/pricing-plans';
import { SitePageHeader } from '~/(marketing)/_components/site-page-header';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { loadPublicPlans } from '~/lib/lms/billing/load-public-plans';
import { isStripeBillingEnabled } from '~/lib/lms/billing/stripe-server-actions';

export async function generateMetadata() {
  const { t } = await createI18nServerInstance();

  return {
    title: t('marketing:pricing'),
    description: t('marketing:pricingSubtitle'),
  };
}

async function PricingPage() {
  const i18n = await createI18nServerInstance();
  const client = getSupabaseServerClient();

  const [{ data: authData }, plans, stripeEnabled] = await Promise.all([
    client.auth.getClaims(),
    loadPublicPlans(),
    isStripeBillingEnabled(),
  ]);

  const isLoggedIn = Boolean(authData?.claims);

  return (
    <div>
      <SitePageHeader
        title={i18n.t('marketing:pricing')}
        subtitle={i18n.t('marketing:pricingSubtitle')}
      />

      <div className="container mx-auto py-8">
        <PricingPlans
          plans={plans}
          isLoggedIn={isLoggedIn}
          stripeEnabled={stripeEnabled}
          locale={i18n.language}
        />
      </div>
    </div>
  );
}

export default withI18n(PricingPage);
