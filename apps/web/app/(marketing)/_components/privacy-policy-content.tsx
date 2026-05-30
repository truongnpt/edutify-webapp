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

const dataRows = [
  {
    categoryKey: 'marketing:privacyPolicyPage.data.account.category',
    examplesKey: 'marketing:privacyPolicyPage.data.account.examples',
    purposeKey: 'marketing:privacyPolicyPage.data.account.purpose',
  },
  {
    categoryKey: 'marketing:privacyPolicyPage.data.profile.category',
    examplesKey: 'marketing:privacyPolicyPage.data.profile.examples',
    purposeKey: 'marketing:privacyPolicyPage.data.profile.purpose',
  },
  {
    categoryKey: 'marketing:privacyPolicyPage.data.organization.category',
    examplesKey: 'marketing:privacyPolicyPage.data.organization.examples',
    purposeKey: 'marketing:privacyPolicyPage.data.organization.purpose',
  },
  {
    categoryKey: 'marketing:privacyPolicyPage.data.students.category',
    examplesKey: 'marketing:privacyPolicyPage.data.students.examples',
    purposeKey: 'marketing:privacyPolicyPage.data.students.purpose',
  },
  {
    categoryKey: 'marketing:privacyPolicyPage.data.exam.category',
    examplesKey: 'marketing:privacyPolicyPage.data.exam.examples',
    purposeKey: 'marketing:privacyPolicyPage.data.exam.purpose',
  },
  {
    categoryKey: 'marketing:privacyPolicyPage.data.logs.category',
    examplesKey: 'marketing:privacyPolicyPage.data.logs.examples',
    purposeKey: 'marketing:privacyPolicyPage.data.logs.purpose',
  },
  {
    categoryKey: 'marketing:privacyPolicyPage.data.billing.category',
    examplesKey: 'marketing:privacyPolicyPage.data.billing.examples',
    purposeKey: 'marketing:privacyPolicyPage.data.billing.purpose',
  },
] as const;

export function PrivacyPolicyContent() {
  return (
    <LegalDocument>
      <LegalParagraph className="text-foreground text-sm">
        <Trans
          i18nKey="marketing:privacyPolicyPage.lastUpdated"
          values={{ date: '30/05/2026' }}
        />
      </LegalParagraph>

      <LegalParagraph>
        <Trans
          i18nKey="marketing:privacyPolicyPage.intro"
          values={{ product: appConfig.name, siteUrl: appConfig.url }}
        />
      </LegalParagraph>

      <LegalSection
        title={<Trans i18nKey="marketing:privacyPolicyPage.section1Title" />}
      >
        <LegalParagraph>
          <Trans
            i18nKey="marketing:privacyPolicyPage.section1Body"
            values={{ product: appConfig.name }}
          />
        </LegalParagraph>
        <LegalList
          items={[
            <Trans
              key="owners"
              i18nKey="marketing:privacyPolicyPage.audienceOwners"
            />,
            <Trans
              key="teachers"
              i18nKey="marketing:privacyPolicyPage.audienceTeachers"
            />,
            <Trans
              key="students"
              i18nKey="marketing:privacyPolicyPage.audienceStudents"
            />,
          ]}
        />
      </LegalSection>

      <LegalSection
        title={<Trans i18nKey="marketing:privacyPolicyPage.section2Title" />}
      >
        <LegalParagraph>
          <Trans i18nKey="marketing:privacyPolicyPage.section2Body" />
        </LegalParagraph>

        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Trans i18nKey="marketing:privacyPolicyPage.tableCategory" />
                </TableHead>
                <TableHead>
                  <Trans i18nKey="marketing:privacyPolicyPage.tableExamples" />
                </TableHead>
                <TableHead>
                  <Trans i18nKey="marketing:privacyPolicyPage.tablePurpose" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataRows.map((row) => (
                <TableRow key={row.categoryKey}>
                  <TableCell className="font-medium whitespace-nowrap">
                    <Trans i18nKey={row.categoryKey} />
                  </TableCell>
                  <TableCell>
                    <Trans i18nKey={row.examplesKey} />
                  </TableCell>
                  <TableCell>
                    <Trans i18nKey={row.purposeKey} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </LegalSection>

      <LegalSection
        title={<Trans i18nKey="marketing:privacyPolicyPage.section3Title" />}
      >
        <LegalParagraph>
          <Trans i18nKey="marketing:privacyPolicyPage.section3Body" />
        </LegalParagraph>
        <LegalList
          items={[
            <Trans
              key="service"
              i18nKey="marketing:privacyPolicyPage.useService"
            />,
            <Trans key="grade" i18nKey="marketing:privacyPolicyPage.useGrade" />,
            <Trans
              key="security"
              i18nKey="marketing:privacyPolicyPage.useSecurity"
            />,
            <Trans
              key="billing"
              i18nKey="marketing:privacyPolicyPage.useBilling"
            />,
            <Trans
              key="support"
              i18nKey="marketing:privacyPolicyPage.useSupport"
            />,
          ]}
        />
      </LegalSection>

      <LegalSection
        title={<Trans i18nKey="marketing:privacyPolicyPage.section4Title" />}
      >
        <LegalParagraph>
          <Trans i18nKey="marketing:privacyPolicyPage.section4Body" />
        </LegalParagraph>
        <LegalList
          items={[
            <Trans
              key="supabase"
              i18nKey="marketing:privacyPolicyPage.shareSupabase"
            />,
            <Trans
              key="stripe"
              i18nKey="marketing:privacyPolicyPage.shareStripe"
            />,
            <Trans
              key="hosting"
              i18nKey="marketing:privacyPolicyPage.shareHosting"
            />,
          ]}
        />
        <LegalParagraph>
          <Trans i18nKey="marketing:privacyPolicyPage.shareNoSell" />
        </LegalParagraph>
      </LegalSection>

      <LegalSection
        title={<Trans i18nKey="marketing:privacyPolicyPage.section5Title" />}
      >
        <LegalParagraph>
          <Trans i18nKey="marketing:privacyPolicyPage.section5Body" />
        </LegalParagraph>
        <LegalList
          items={[
            <Trans
              key="account"
              i18nKey="marketing:privacyPolicyPage.retentionAccount"
            />,
            <Trans
              key="exam"
              i18nKey="marketing:privacyPolicyPage.retentionExam"
            />,
            <Trans
              key="logs"
              i18nKey="marketing:privacyPolicyPage.retentionLogs"
            />,
          ]}
        />
      </LegalSection>

      <LegalSection
        title={<Trans i18nKey="marketing:privacyPolicyPage.section6Title" />}
      >
        <LegalParagraph>
          <Trans i18nKey="marketing:privacyPolicyPage.section6Body" />
        </LegalParagraph>
        <LegalList
          items={[
            <Trans
              key="auth"
              i18nKey="marketing:privacyPolicyPage.securityAuth"
            />,
            <Trans key="rls" i18nKey="marketing:privacyPolicyPage.securityRls" />,
            <Trans
              key="access"
              i18nKey="marketing:privacyPolicyPage.securityAccess"
            />,
          ]}
        />
      </LegalSection>

      <LegalSection
        title={<Trans i18nKey="marketing:privacyPolicyPage.section7Title" />}
      >
        <LegalParagraph>
          <Trans i18nKey="marketing:privacyPolicyPage.section7Body" />
        </LegalParagraph>
        <LegalList
          items={[
            <Trans
              key="access"
              i18nKey="marketing:privacyPolicyPage.rightAccess"
            />,
            <Trans
              key="correct"
              i18nKey="marketing:privacyPolicyPage.rightCorrect"
            />,
            <Trans
              key="delete"
              i18nKey="marketing:privacyPolicyPage.rightDelete"
            />,
            <Trans
              key="withdraw"
              i18nKey="marketing:privacyPolicyPage.rightWithdraw"
            />,
          ]}
        />
        <LegalParagraph>
          <Trans i18nKey="marketing:privacyPolicyPage.rightContact" />
        </LegalParagraph>
      </LegalSection>

      <LegalSection
        title={<Trans i18nKey="marketing:privacyPolicyPage.section8Title" />}
      >
        <LegalParagraph>
          <Trans i18nKey="marketing:privacyPolicyPage.section8Body" />
        </LegalParagraph>
      </LegalSection>

      <LegalSection
        title={<Trans i18nKey="marketing:privacyPolicyPage.section9Title" />}
      >
        <LegalParagraph>
          <Trans
            i18nKey="marketing:privacyPolicyPage.section9Body"
            components={{
              cookieLink: (
                <Link
                  href="/cookie-policy"
                  className="text-primary underline-offset-4 hover:underline"
                />
              ),
            }}
          />
        </LegalParagraph>
      </LegalSection>

      <LegalSection
        title={<Trans i18nKey="marketing:privacyPolicyPage.section10Title" />}
      >
        <LegalParagraph>
          <Trans i18nKey="marketing:privacyPolicyPage.section10Body" />
        </LegalParagraph>
      </LegalSection>

      <LegalSection
        title={<Trans i18nKey="marketing:privacyPolicyPage.section11Title" />}
      >
        <LegalParagraph>
          <Trans
            i18nKey="marketing:privacyPolicyPage.section11Body"
            values={{ product: appConfig.name, siteUrl: appConfig.url }}
          />
        </LegalParagraph>
      </LegalSection>
    </LegalDocument>
  );
}
