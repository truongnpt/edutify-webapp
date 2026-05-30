export const BILLING_CURRENCY = 'VND';

const ZERO_DECIMAL_CURRENCIES = new Set(['vnd', 'jpy', 'krw']);

export function formatBillingAmount(
  amount: number,
  locale: string = 'vi',
) {
  const intlLocale = locale.startsWith('en') ? 'en-VN' : 'vi-VN';
  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency: BILLING_CURRENCY,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatBillingAmountPerMonth(
  amount: number,
  locale: string = 'vi',
) {
  if (amount <= 0) {
    return formatBillingAmount(0, locale);
  }

  return `${formatBillingAmount(amount, locale)}${locale.startsWith('en') ? '/mo' : '/tháng'}`;
}

/** Convert Stripe Checkout `amount_total` to amount stored in `plans.price_monthly`. */
export function stripeAmountToBillingAmount(
  amountTotal: number | null | undefined,
  currency: string | null | undefined,
) {
  if (amountTotal == null) {
    return 0;
  }

  const normalized = currency?.toLowerCase() ?? BILLING_CURRENCY.toLowerCase();

  if (ZERO_DECIMAL_CURRENCIES.has(normalized)) {
    return amountTotal;
  }

  return amountTotal / 100;
}
