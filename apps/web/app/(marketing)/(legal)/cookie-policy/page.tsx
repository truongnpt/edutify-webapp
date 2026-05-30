import { CookiePolicyContent } from '~/(marketing)/_components/cookie-policy-content';
import { SitePageHeader } from '~/(marketing)/_components/site-page-header';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

export async function generateMetadata() {
  const { t } = await createI18nServerInstance();

  return {
    title: t('marketing:cookiePolicy'),
    description: t('marketing:cookiePolicyDescription'),
  };
}

async function CookiePolicyPage() {
  const { t } = await createI18nServerInstance();

  return (
    <div>
      <SitePageHeader
        title={t('marketing:cookiePolicy')}
        subtitle={t('marketing:cookiePolicyDescription')}
      />

      <div className="container mx-auto py-8">
        <CookiePolicyContent />
      </div>
    </div>
  );
}

export default withI18n(CookiePolicyPage);
