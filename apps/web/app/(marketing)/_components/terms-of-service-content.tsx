import Link from 'next/link';

import { Trans } from '@kit/ui/trans';

import appConfig from '~/config/app.config';

import {
  LegalDocument,
  LegalList,
  LegalParagraph,
  LegalSection,
} from './legal-document';

export function TermsOfServiceContent() {
  return (
    <LegalDocument>
      <LegalParagraph className="text-foreground text-sm">
        <Trans
          i18nKey="marketing:termsOfServicePage.lastUpdated"
          values={{ date: '30/05/2026' }}
        />
      </LegalParagraph>

      <LegalParagraph>
        <Trans
          i18nKey="marketing:termsOfServicePage.intro"
          values={{ product: appConfig.name, siteUrl: appConfig.url }}
        />
      </LegalParagraph>

      <LegalSection
        title={<Trans i18nKey="marketing:termsOfServicePage.section1Title" />}
      >
        <LegalParagraph>
          <Trans
            i18nKey="marketing:termsOfServicePage.section1Body"
            values={{ product: appConfig.name }}
          />
        </LegalParagraph>
        <LegalList
          items={[
            <Trans
              key="questions"
              i18nKey="marketing:termsOfServicePage.serviceQuestions"
            />,
            <Trans
              key="exams"
              i18nKey="marketing:termsOfServicePage.serviceExams"
            />,
            <Trans
              key="assign"
              i18nKey="marketing:termsOfServicePage.serviceAssign"
            />,
            <Trans
              key="grade"
              i18nKey="marketing:termsOfServicePage.serviceGrade"
            />,
            <Trans
              key="reports"
              i18nKey="marketing:termsOfServicePage.serviceReports"
            />,
          ]}
        />
      </LegalSection>

      <LegalSection
        title={<Trans i18nKey="marketing:termsOfServicePage.section2Title" />}
      >
        <LegalParagraph>
          <Trans i18nKey="marketing:termsOfServicePage.section2Body" />
        </LegalParagraph>
        <LegalList
          items={[
            <Trans
              key="accurate"
              i18nKey="marketing:termsOfServicePage.accountAccurate"
            />,
            <Trans
              key="secure"
              i18nKey="marketing:termsOfServicePage.accountSecure"
            />,
            <Trans
              key="notify"
              i18nKey="marketing:termsOfServicePage.accountNotify"
            />,
          ]}
        />
      </LegalSection>

      <LegalSection
        title={<Trans i18nKey="marketing:termsOfServicePage.section3Title" />}
      >
        <LegalParagraph>
          <Trans i18nKey="marketing:termsOfServicePage.section3Body" />
        </LegalParagraph>
        <LegalList
          items={[
            <Trans
              key="owner"
              i18nKey="marketing:termsOfServicePage.roleOwner"
            />,
            <Trans
              key="admin"
              i18nKey="marketing:termsOfServicePage.roleAdmin"
            />,
            <Trans
              key="teacher"
              i18nKey="marketing:termsOfServicePage.roleTeacher"
            />,
            <Trans
              key="student"
              i18nKey="marketing:termsOfServicePage.roleStudent"
            />,
          ]}
        />
        <LegalParagraph>
          <Trans i18nKey="marketing:termsOfServicePage.orgResponsibility" />
        </LegalParagraph>
      </LegalSection>

      <LegalSection
        title={<Trans i18nKey="marketing:termsOfServicePage.section4Title" />}
      >
        <LegalParagraph>
          <Trans i18nKey="marketing:termsOfServicePage.section4Body" />
        </LegalParagraph>
        <LegalList
          items={[
            <Trans
              key="lawful"
              i18nKey="marketing:termsOfServicePage.useLawful"
            />,
            <Trans
              key="cheat"
              i18nKey="marketing:termsOfServicePage.useNoCheat"
            />,
            <Trans
              key="abuse"
              i18nKey="marketing:termsOfServicePage.useNoAbuse"
            />,
            <Trans
              key="content"
              i18nKey="marketing:termsOfServicePage.useContent"
            />,
          ]}
        />
      </LegalSection>

      <LegalSection
        title={<Trans i18nKey="marketing:termsOfServicePage.section5Title" />}
      >
        <LegalParagraph>
          <Trans i18nKey="marketing:termsOfServicePage.section5Body" />
        </LegalParagraph>
        <LegalList
          items={[
            <Trans
              key="plans"
              i18nKey="marketing:termsOfServicePage.billingPlans"
            />,
            <Trans
              key="quota"
              i18nKey="marketing:termsOfServicePage.billingQuota"
            />,
            <Trans
              key="stripe"
              i18nKey="marketing:termsOfServicePage.billingStripe"
            />,
            <Trans
              key="transfer"
              i18nKey="marketing:termsOfServicePage.billingTransfer"
            />,
          ]}
        />
        <LegalParagraph>
          <Trans i18nKey="marketing:termsOfServicePage.billingChanges" />
        </LegalParagraph>
      </LegalSection>

      <LegalSection
        title={<Trans i18nKey="marketing:termsOfServicePage.section6Title" />}
      >
        <LegalParagraph>
          <Trans i18nKey="marketing:termsOfServicePage.section6Body" />
        </LegalParagraph>
        <LegalList
          items={[
            <Trans
              key="org"
              i18nKey="marketing:termsOfServicePage.ipOrg"
            />,
            <Trans
              key="platform"
              i18nKey="marketing:termsOfServicePage.ipPlatform"
              values={{ product: appConfig.name }}
            />,
          ]}
        />
      </LegalSection>

      <LegalSection
        title={<Trans i18nKey="marketing:termsOfServicePage.section7Title" />}
      >
        <LegalParagraph>
          <Trans i18nKey="marketing:termsOfServicePage.section7Body" />
        </LegalParagraph>
      </LegalSection>

      <LegalSection
        title={<Trans i18nKey="marketing:termsOfServicePage.section8Title" />}
      >
        <LegalParagraph>
          <Trans i18nKey="marketing:termsOfServicePage.section8Body" />
        </LegalParagraph>
        <LegalList
          items={[
            <Trans
              key="uptime"
              i18nKey="marketing:termsOfServicePage.disclaimerUptime"
            />,
            <Trans
              key="accuracy"
              i18nKey="marketing:termsOfServicePage.disclaimerAccuracy"
            />,
            <Trans
              key="asIs"
              i18nKey="marketing:termsOfServicePage.disclaimerAsIs"
            />,
          ]}
        />
      </LegalSection>

      <LegalSection
        title={<Trans i18nKey="marketing:termsOfServicePage.section9Title" />}
      >
        <LegalParagraph>
          <Trans
            i18nKey="marketing:termsOfServicePage.section9Body"
            values={{ product: appConfig.name }}
          />
        </LegalParagraph>
      </LegalSection>

      <LegalSection
        title={<Trans i18nKey="marketing:termsOfServicePage.section10Title" />}
      >
        <LegalParagraph>
          <Trans i18nKey="marketing:termsOfServicePage.section10Body" />
        </LegalParagraph>
        <LegalList
          items={[
            <Trans
              key="user"
              i18nKey="marketing:termsOfServicePage.terminationUser"
            />,
            <Trans
              key="platform"
              i18nKey="marketing:termsOfServicePage.terminationPlatform"
            />,
          ]}
        />
      </LegalSection>

      <LegalSection
        title={<Trans i18nKey="marketing:termsOfServicePage.section11Title" />}
      >
        <LegalParagraph>
          <Trans
            i18nKey="marketing:termsOfServicePage.section11Body"
            components={{
              privacyLink: (
                <Link
                  href="/privacy-policy"
                  className="text-primary underline-offset-4 hover:underline"
                />
              ),
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
        title={<Trans i18nKey="marketing:termsOfServicePage.section12Title" />}
      >
        <LegalParagraph>
          <Trans i18nKey="marketing:termsOfServicePage.section12Body" />
        </LegalParagraph>
      </LegalSection>

      <LegalSection
        title={<Trans i18nKey="marketing:termsOfServicePage.section13Title" />}
      >
        <LegalParagraph>
          <Trans i18nKey="marketing:termsOfServicePage.section13Body" />
        </LegalParagraph>
      </LegalSection>

      <LegalSection
        title={<Trans i18nKey="marketing:termsOfServicePage.section14Title" />}
      >
        <LegalParagraph>
          <Trans
            i18nKey="marketing:termsOfServicePage.section14Body"
            values={{ product: appConfig.name, siteUrl: appConfig.url }}
          />
        </LegalParagraph>
      </LegalSection>
    </LegalDocument>
  );
}
