import Link from 'next/link';

import { ArrowRight, ChevronDown } from 'lucide-react';

import { CtaButton } from '@kit/ui/marketing';
import { Trans } from '@kit/ui/trans';

export const FAQ_SECTIONS = [
  {
    titleKey: 'marketing:faqPage.sections.gettingStarted.title',
    items: [
      {
        questionKey: 'marketing:faqPage.sections.gettingStarted.q1',
        answerKey: 'marketing:faqPage.sections.gettingStarted.a1',
      },
      {
        questionKey: 'marketing:faqPage.sections.gettingStarted.q2',
        answerKey: 'marketing:faqPage.sections.gettingStarted.a2',
      },
      {
        questionKey: 'marketing:faqPage.sections.gettingStarted.q3',
        answerKey: 'marketing:faqPage.sections.gettingStarted.a3',
      },
      {
        questionKey: 'marketing:faqPage.sections.gettingStarted.q4',
        answerKey: 'marketing:faqPage.sections.gettingStarted.a4',
      },
    ],
  },
  {
    titleKey: 'marketing:faqPage.sections.exams.title',
    items: [
      {
        questionKey: 'marketing:faqPage.sections.exams.q1',
        answerKey: 'marketing:faqPage.sections.exams.a1',
      },
      {
        questionKey: 'marketing:faqPage.sections.exams.q2',
        answerKey: 'marketing:faqPage.sections.exams.a2',
      },
      {
        questionKey: 'marketing:faqPage.sections.exams.q3',
        answerKey: 'marketing:faqPage.sections.exams.a3',
      },
      {
        questionKey: 'marketing:faqPage.sections.exams.q4',
        answerKey: 'marketing:faqPage.sections.exams.a4',
      },
    ],
  },
  {
    titleKey: 'marketing:faqPage.sections.students.title',
    items: [
      {
        questionKey: 'marketing:faqPage.sections.students.q1',
        answerKey: 'marketing:faqPage.sections.students.a1',
      },
      {
        questionKey: 'marketing:faqPage.sections.students.q2',
        answerKey: 'marketing:faqPage.sections.students.a2',
      },
      {
        questionKey: 'marketing:faqPage.sections.students.q3',
        answerKey: 'marketing:faqPage.sections.students.a3',
      },
    ],
  },
  {
    titleKey: 'marketing:faqPage.sections.billing.title',
    items: [
      {
        questionKey: 'marketing:faqPage.sections.billing.q1',
        answerKey: 'marketing:faqPage.sections.billing.a1',
      },
      {
        questionKey: 'marketing:faqPage.sections.billing.q2',
        answerKey: 'marketing:faqPage.sections.billing.a2',
      },
      {
        questionKey: 'marketing:faqPage.sections.billing.q3',
        answerKey: 'marketing:faqPage.sections.billing.a3',
      },
    ],
  },
] as const;

function FaqItem({
  questionKey,
  answerKey,
}: {
  questionKey: string;
  answerKey: string;
}) {
  return (
    <details className="group border-b px-2 py-4 last:border-b-transparent">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 hover:underline [&::-webkit-details-marker]:hidden">
        <h2 className="font-sans text-base font-medium">
          <Trans i18nKey={questionKey} />
        </h2>
        <ChevronDown className="size-5 shrink-0 transition duration-300 group-open:-rotate-180" />
      </summary>
      <div className="text-muted-foreground flex flex-col gap-2 py-3 pr-8 text-sm leading-relaxed">
        <Trans i18nKey={answerKey} />
      </div>
    </details>
  );
}

export function FaqContent() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 pb-16">
      {FAQ_SECTIONS.map((section) => (
        <section key={section.titleKey} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold tracking-tight">
            <Trans i18nKey={section.titleKey} />
          </h2>
          <div className="flex flex-col">
            {section.items.map((item) => (
              <FaqItem
                key={item.questionKey}
                questionKey={item.questionKey}
                answerKey={item.answerKey}
              />
            ))}
          </div>
        </section>
      ))}

      <div className="bg-muted/30 flex flex-col items-center gap-4 rounded-xl border p-6 text-center md:p-8">
        <p className="text-muted-foreground text-sm">
          <Trans i18nKey="marketing:faqPage.ctaHint" />
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <CtaButton>
            <Link href="/auth/sign-up">
              <span className="flex items-center gap-1">
                <Trans i18nKey="common:getStarted" />
                <ArrowRight className="size-4" />
              </span>
            </Link>
          </CtaButton>
          <CtaButton variant="outline">
            <Link href="/pricing">
              <Trans i18nKey="marketing:pricing" />
            </Link>
          </CtaButton>
        </div>
      </div>
    </div>
  );
}

export function getFaqStructuredData(
  t: (key: string) => string,
): Array<{ question: string; answer: string }> {
  return FAQ_SECTIONS.flatMap((section) =>
    section.items.map((item) => ({
      question: t(item.questionKey),
      answer: t(item.answerKey),
    })),
  );
}
