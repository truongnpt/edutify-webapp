import Link from 'next/link';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Trans } from '@kit/ui/trans';

import appConfig from '~/config/app.config';

import {
  LegalDocument,
  LegalList,
  LegalParagraph,
  LegalSection,
} from './legal-document';

const cookieRows = [
  {
    nameKey: 'marketing:cookiePolicyPage.cookies.auth.name',
    purposeKey: 'marketing:cookiePolicyPage.cookies.auth.purpose',
    typeKey: 'marketing:cookiePolicyPage.cookies.auth.type',
    durationKey: 'marketing:cookiePolicyPage.cookies.auth.duration',
  },
  {
    nameKey: 'marketing:cookiePolicyPage.cookies.csrf.name',
    purposeKey: 'marketing:cookiePolicyPage.cookies.csrf.purpose',
    typeKey: 'marketing:cookiePolicyPage.cookies.csrf.type',
    durationKey: 'marketing:cookiePolicyPage.cookies.csrf.duration',
  },
  {
    nameKey: 'marketing:cookiePolicyPage.cookies.org.name',
    purposeKey: 'marketing:cookiePolicyPage.cookies.org.purpose',
    typeKey: 'marketing:cookiePolicyPage.cookies.org.type',
    durationKey: 'marketing:cookiePolicyPage.cookies.org.duration',
  },
  {
    nameKey: 'marketing:cookiePolicyPage.cookies.lang.name',
    purposeKey: 'marketing:cookiePolicyPage.cookies.lang.purpose',
    typeKey: 'marketing:cookiePolicyPage.cookies.lang.type',
    durationKey: 'marketing:cookiePolicyPage.cookies.lang.duration',
  },
  {
    nameKey: 'marketing:cookiePolicyPage.cookies.theme.name',
    purposeKey: 'marketing:cookiePolicyPage.cookies.theme.purpose',
    typeKey: 'marketing:cookiePolicyPage.cookies.theme.type',
    durationKey: 'marketing:cookiePolicyPage.cookies.theme.duration',
  },
  {
    nameKey: 'marketing:cookiePolicyPage.cookies.layout.name',
    purposeKey: 'marketing:cookiePolicyPage.cookies.layout.purpose',
    typeKey: 'marketing:cookiePolicyPage.cookies.layout.type',
    durationKey: 'marketing:cookiePolicyPage.cookies.layout.duration',
  },
] as const;

export function CookiePolicyContent() {
  return (
    <LegalDocument>
      <LegalParagraph className="text-foreground text-sm">
        <Trans
          i18nKey="marketing:cookiePolicyPage.lastUpdated"
          values={{ date: '30/05/2026' }}
        />
      </LegalParagraph>

      <LegalParagraph>
        <Trans
          i18nKey="marketing:cookiePolicyPage.intro"
          values={{ product: appConfig.name, siteUrl: appConfig.url }}
        />
      </LegalParagraph>

      <LegalSection title={<Trans i18nKey="marketing:cookiePolicyPage.section1Title" />}>
        <LegalParagraph>
          <Trans i18nKey="marketing:cookiePolicyPage.section1Body" />
        </LegalParagraph>
        <LegalList
          items={[
            <Trans key="essential" i18nKey="marketing:cookiePolicyPage.categoryEssential" />,
            <Trans key="functional" i18nKey="marketing:cookiePolicyPage.categoryFunctional" />,
          ]}
        />
      </LegalSection>

      <LegalSection title={<Trans i18nKey="marketing:cookiePolicyPage.section2Title" />}>
        <LegalParagraph>
          <Trans i18nKey="marketing:cookiePolicyPage.section2Body" />
        </LegalParagraph>

        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Trans i18nKey="marketing:cookiePolicyPage.tableName" />
                </TableHead>
                <TableHead>
                  <Trans i18nKey="marketing:cookiePolicyPage.tablePurpose" />
                </TableHead>
                <TableHead>
                  <Trans i18nKey="marketing:cookiePolicyPage.tableType" />
                </TableHead>
                <TableHead>
                  <Trans i18nKey="marketing:cookiePolicyPage.tableDuration" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cookieRows.map((row) => (
                <TableRow key={row.nameKey}>
                  <TableCell className="font-medium whitespace-nowrap">
                    <Trans i18nKey={row.nameKey} />
                  </TableCell>
                  <TableCell>
                    <Trans i18nKey={row.purposeKey} />
                  </TableCell>
                  <TableCell>
                    <Trans i18nKey={row.typeKey} />
                  </TableCell>
                  <TableCell>
                    <Trans i18nKey={row.durationKey} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </LegalSection>

      <LegalSection title={<Trans i18nKey="marketing:cookiePolicyPage.section3Title" />}>
        <LegalParagraph>
          <Trans i18nKey="marketing:cookiePolicyPage.section3Body" />
        </LegalParagraph>
        <LegalList
          items={[
            <Trans key="stripe" i18nKey="marketing:cookiePolicyPage.thirdPartyStripe" />,
          ]}
        />
      </LegalSection>

      <LegalSection title={<Trans i18nKey="marketing:cookiePolicyPage.section4Title" />}>
        <LegalParagraph>
          <Trans i18nKey="marketing:cookiePolicyPage.section4Body" />
        </LegalParagraph>
        <LegalList
          items={[
            <Trans key="browser" i18nKey="marketing:cookiePolicyPage.manageBrowser" />,
            <Trans key="essential" i18nKey="marketing:cookiePolicyPage.manageEssential" />,
          ]}
        />
      </LegalSection>

      <LegalSection title={<Trans i18nKey="marketing:cookiePolicyPage.section5Title" />}>
        <LegalParagraph>
          <Trans
            i18nKey="marketing:cookiePolicyPage.section5Body"
            components={{
              privacyLink: (
                <Link
                  href="/privacy-policy"
                  className="text-primary underline-offset-4 hover:underline"
                />
              ),
            }}
          />
        </LegalParagraph>
      </LegalSection>

      <LegalSection title={<Trans i18nKey="marketing:cookiePolicyPage.section6Title" />}>
        <LegalParagraph>
          <Trans i18nKey="marketing:cookiePolicyPage.section6Body" />
        </LegalParagraph>
      </LegalSection>

      <LegalSection title={<Trans i18nKey="marketing:cookiePolicyPage.section7Title" />}>
        <LegalParagraph>
          <Trans
            i18nKey="marketing:cookiePolicyPage.section7Body"
            values={{ product: appConfig.name, siteUrl: appConfig.url }}
          />
        </LegalParagraph>
      </LegalSection>
    </LegalDocument>
  );
}
