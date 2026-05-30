import { TermsOfServiceContent } from '~/(marketing)/_components/terms-of-service-content';
import { SitePageHeader } from '~/(marketing)/_components/site-page-header';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

export async function generateMetadata() {
  const { t } = await createI18nServerInstance();

  return {
    title: t('marketing:termsOfService'),
    description: t('marketing:termsOfServiceDescription'),
  };
}

async function TermsOfServicePage() {
  const { t } = await createI18nServerInstance();

  return (
    <div>
      <SitePageHeader
        title={t('marketing:termsOfService')}
        subtitle={t('marketing:termsOfServiceDescription')}
      />

      <div className="container mx-auto py-8">
        <TermsOfServiceContent />
      </div>
    </div>
  );
}

export default withI18n(TermsOfServicePage);
