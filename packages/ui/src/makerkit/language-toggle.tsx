'use client';

import { useCallback, useMemo } from 'react';

import { useTranslation } from 'react-i18next';

import { cn } from '../lib/utils';
import { Switch } from '../shadcn/switch';

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
  const isSecondary = currentLanguage === secondary;

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
        'flex items-center gap-2 text-xs font-medium',
        props.className,
      )}
      role="group"
      aria-label="Language"
    >
      <span
        className={cn('transition-colors', {
          'text-foreground': !isSecondary,
          'text-muted-foreground': isSecondary,
        })}
      >
        {LOCALE_LABELS[primary] ?? primary.toUpperCase()}
      </span>

      <Switch
        checked={isSecondary}
        onCheckedChange={onCheckedChange}
        aria-label={`Switch to ${LOCALE_LABELS[secondary] ?? secondary.toUpperCase()}`}
      />

      <span
        className={cn('transition-colors', {
          'text-foreground': isSecondary,
          'text-muted-foreground': !isSecondary,
        })}
      >
        {LOCALE_LABELS[secondary] ?? secondary.toUpperCase()}
      </span>
    </div>
  );
}
