import { PageBody, PageHeader } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { loadTaxonomy } from '~/lib/lms/tags/server-actions';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import { TaxonomyPanel } from './_components/taxonomy-panel';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  return { title: i18n.t('lms:taxonomy.pageTitle') };
};

async function TaxonomyPage() {
  const user = await requireUserInServerComponent();
  const { subjects, tags, topics } = await loadTaxonomy(user.id);

  return (
    <>
      <PageHeader
        title={<Trans i18nKey={'lms:taxonomy.pageTitle'} />}
        description={<Trans i18nKey={'lms:taxonomy.pageDescription'} />}
      />
      <PageBody>
        <TaxonomyPanel subjects={subjects} tags={tags} topics={topics} />
      </PageBody>
    </>
  );
}

export default withI18n(TaxonomyPage);
