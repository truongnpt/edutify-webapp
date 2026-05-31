'use client';

import { useCallback, useMemo } from 'react';

import { useTranslation } from 'react-i18next';

import { cn } from '../lib/utils';

const LOCALE_LABELS: Record<string, string> = {
  en: 'EN',
  vi: 'VI',
};

function normalizeLocale(language: string | undefined) {
  return language?.split('-')[0]?.toLowerCase();
}

export function LanguageToggle(props: { className?: string }) {
  const { i18n } = useTranslation();

  const locales = useMemo(() => {
    const langs = (i18n.options?.supportedLngs as string[]) ?? [];

    return langs
      .filter((lang) => lang.toLowerCase() !== 'cimode')
      .map((lang) => lang.toLowerCase())
      .sort();
  }, [i18n.options?.supportedLngs]);

  const primary = locales[0];
  const secondary = locales[1];

  const currentLanguage = normalizeLocale(i18n.language) ?? primary;
  const isDefault = currentLanguage === secondary;

  const onCheckedChange = useCallback(
    async (checked: boolean) => {
      const locale = checked ? secondary : primary;

      if (!locale || locale === currentLanguage) {
        return;
      }

      await i18n.changeLanguage(locale);
      window.location.reload();
    },
    [currentLanguage, i18n, primary, secondary],
  );

  if (!primary || !secondary) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-4 text-xs font-medium bg-gray-200 dark:bg-gray-800 rounded-md p-1',
        props.className,
      )}
      role="group"
      aria-label="Language"
    >
      <span
        className={cn('transition-colors rounded-md p-1', {
          'text-foreground bg-white dark:bg-white dark:text-gray-800': !isDefault,
          'text-muted-foreground dark:text-gray-400': isDefault,
        })}
        onClick={() => onCheckedChange(false)}
      >
        {LOCALE_LABELS[primary] ?? primary.toUpperCase()}
      </span>
      <span
        className={cn('transition-colors rounded-sm px-2 py-1', {
          'text-foreground bg-white dark:bg-white dark:text-gray-800': isDefault,
          'text-muted-foreground': !isDefault,
        })}
        onClick={() => onCheckedChange(true)}
      >
        {LOCALE_LABELS[secondary] ?? secondary.toUpperCase()}
      </span>
    </div>
  );
}
