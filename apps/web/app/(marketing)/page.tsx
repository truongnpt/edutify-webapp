import Link from 'next/link';

import {
  ArrowRightIcon,
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

import {
  CtaButton,
  FeatureCard,
  FeatureGrid,
  FeatureShowcase,
  FeatureShowcaseIconContainer,
  Hero,
  Pill,
} from '@kit/ui/marketing';
import { Trans } from '@kit/ui/trans';

import { MarketingHeroPreview } from '~/(marketing)/_components/marketing-hero-preview';
import appConfig from '~/config/app.config';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

async function Home() {
  const { t } = await createI18nServerInstance();

  return (
    <div className="mt-4 flex flex-col gap-24 py-14">
      <div className="container mx-auto">
        <Hero
          pill={
            <Pill label={t('marketing:heroPill')}>
              {t('marketing:heroPillText')}
            </Pill>
          }
          title={
            <>
              <span>{t('marketing:heroTitle1')}</span>
              <span>{t('marketing:heroTitle2')}</span>
            </>
          }
          subtitle={t('marketing:heroSubtitle')}
          cta={<MainCallToActionButton />}
          image={<MarketingHeroPreview />}
        />
      </div>

      <div className="container mx-auto">
        <div className="flex flex-col gap-16 xl:gap-32 2xl:gap-36">
          <FeatureShowcase
            heading={
              <>
                <b className="font-semibold">
                  <Trans i18nKey="marketing:heroFeatureHeading" />
                </b>
                .{' '}
                <span className="text-muted-foreground font-normal">
                  <Trans
                    i18nKey="marketing:heroFeatureSubheading"
                    values={{ productName: appConfig.name }}
                  />
                </span>
              </>
            }
            icon={
              <FeatureShowcaseIconContainer>
                <GraduationCap className="h-5" />
                <span>
                  <Trans i18nKey="marketing:heroFeatureAllInOne" />
                </span>
              </FeatureShowcaseIconContainer>
            }
          >
            <FeatureGrid>
              <FeatureCard
                className="relative col-span-1 overflow-hidden lg:col-span-1"
                label={t('marketing:heroFeatureQuestionBank')}
                description={t('marketing:heroFeatureQuestionBankDesc')}
              />

              <FeatureCard
                className="relative col-span-1 overflow-hidden lg:col-span-1"
                label={t('marketing:heroFeatureExams')}
                description={t('marketing:heroFeatureExamsDesc')}
              />

              <FeatureCard
                className="relative col-span-1 overflow-hidden lg:col-span-1"
                label={t('marketing:heroFeatureStudents')}
                description={t('marketing:heroFeatureStudentsDesc')}
              />

              <FeatureCard
                className="relative col-span-1 overflow-hidden lg:col-span-1"
                label={t('marketing:heroFeatureGrading')}
                description={t('marketing:heroFeatureGradingDesc')}
              />

              <FeatureCard
                className="relative col-span-1 overflow-hidden lg:col-span-1"
                label={t('marketing:heroFeatureOrganization')}
                description={t('marketing:heroFeatureOrganizationDesc')}
              />

              <FeatureCard
                className="relative col-span-1 overflow-hidden lg:col-span-1"
                label={t('marketing:heroFeatureBilling')}
                description={t('marketing:heroFeatureBillingDesc')}
              />
            </FeatureGrid>
          </FeatureShowcase>
        </div>
      </div>

      <div className="container mx-auto">
        <HowItWorksSection />
      </div>

      <div className="container mx-auto">
        <BottomCtaSection />
      </div>
    </div>
  );
}

export default withI18n(Home);

function MainCallToActionButton() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <CtaButton>
        <Link href="/auth/sign-up">
          <span className="flex items-center gap-1">
            <Trans i18nKey="common:getStarted" />
            <ArrowRightIcon
              className={
                'animate-in fade-in slide-in-from-left-8 h-4' +
                ' zoom-in fill-mode-both delay-1000 duration-1000'
              }
            />
          </span>
        </Link>
      </CtaButton>

      <CtaButton variant="link">
        <Link href="/auth/sign-in">
          <Trans i18nKey="marketing:heroCtaSignIn" />
        </Link>
      </CtaButton>
    </div>
  );
}

const steps = [
  {
    icon: Sparkles,
    titleKey: 'marketing:heroStep1Title',
    descKey: 'marketing:heroStep1Desc',
  },
  {
    icon: BookOpen,
    titleKey: 'marketing:heroStep2Title',
    descKey: 'marketing:heroStep2Desc',
  },
  {
    icon: ClipboardCheck,
    titleKey: 'marketing:heroStep3Title',
    descKey: 'marketing:heroStep3Desc',
  },
] as const;

function HowItWorksSection() {
  return (
    <section className="flex flex-col gap-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 text-center">
        <h2 className="text-3xl font-normal tracking-tight xl:text-4xl">
          <Trans i18nKey="marketing:heroHowItWorks" />
        </h2>
        <p className="text-muted-foreground text-lg">
          <Trans i18nKey="marketing:heroHowItWorksSubtitle" />
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {steps.map(({ icon: Icon, titleKey, descKey }, index) => (
          <div
            key={titleKey}
            className="bg-card flex flex-col gap-4 rounded-xl border p-6"
          >
            <div className="flex items-center gap-3">
              <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full text-sm font-semibold">
                {index + 1}
              </span>
              <Icon className="text-muted-foreground size-5" />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-medium">
                <Trans i18nKey={titleKey} />
              </h3>
              <p className="text-muted-foreground text-sm">
                <Trans i18nKey={descKey} />
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function BottomCtaSection() {
  return (
    <section className="bg-muted/30 flex flex-col items-center gap-6 rounded-2xl border px-6 py-12 text-center md:px-12">
      <div className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
          <Trans i18nKey="marketing:heroBottomCtaTitle" />
        </h2>
        <p className="text-muted-foreground max-w-xl text-base">
          <Trans i18nKey="marketing:heroBottomCtaSubtitle" />
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <CtaButton>
          <Link href="/auth/sign-up">
            <span className="flex items-center gap-1">
              <Trans i18nKey="common:getStarted" />
              <ArrowRightIcon className="h-4" />
            </span>
          </Link>
        </CtaButton>

        <CtaButton variant="outline">
          <Link href="/faq">
            <Trans i18nKey="marketing:faq" />
          </Link>
        </CtaButton>
      </div>
    </section>
  );
}
