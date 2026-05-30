import { FaqContent, getFaqStructuredData } from '~/(marketing)/_components/faq-content';
import { SitePageHeader } from '~/(marketing)/_components/site-page-header';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

export async function generateMetadata() {
  const { t } = await createI18nServerInstance();

  return {
    title: t('marketing:faq'),
    description: t('marketing:faqSubtitle'),
  };
}

async function FAQPage() {
  const { t } = await createI18nServerInstance();
  const faqItems = getFaqStructuredData(t);

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <script
        key="ld:json"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="flex flex-col gap-4 xl:gap-8">
        <SitePageHeader
          title={t('marketing:faq')}
          subtitle={t('marketing:faqSubtitle')}
        />

        <div className="container mx-auto py-8">
          <FaqContent />
        </div>
      </div>
    </>
  );
}

export default withI18n(FAQPage);
