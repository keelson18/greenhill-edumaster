import { PERF_BANDS, SCHOOL_PROFILE, type PerfLevel } from "@/config/app.config";

/**
 * Ghana-localised formatters and grading helpers.
 *
 * Every currency, date and number rendered in the app goes through this
 * module — no component formats values itself.
 */

const { locale, timeZone, currencySymbol, currency } = SCHOOL_PROFILE;

/** Formats a number as Ghana Cedis, e.g. "₵ 1,250". */
export function formatCurrency(value: number): string {
  return `${currencySymbol} ${Math.round(value).toLocaleString(locale)}`;
}

/** Compact currency for dense KPI tiles, e.g. "₵ 6.4M". */
export function formatCurrencyCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${currencySymbol} ${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${currencySymbol} ${(value / 1_000).toFixed(0)}K`;
  return formatCurrency(value);
}

/** ISO currency code, for exports and accounting documents. */
export const CURRENCY_CODE = currency;

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString(locale);
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const DATE_LONG_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone,
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const DATE_TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** DD/MM/YYYY in Africa/Accra. Returns "—" for missing values. */
export function formatDate(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? DATE_FORMAT.format(date) : "—";
}

/** DD Mon YYYY in Africa/Accra. */
export function formatDateLong(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? DATE_LONG_FORMAT.format(date) : "—";
}

/** DD/MM/YYYY, HH:mm in Africa/Accra. */
export function formatDateTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? DATE_TIME_FORMAT.format(date) : "—";
}

/** Formats a 24h "14:30:00" database time as "14:30". */
export function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  return value.slice(0, 5);
}

/** Normalises a Ghana phone number to "+233 XX XXX XXXX" where possible. */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  const local = digits.startsWith("233") ? digits.slice(3) : digits.replace(/^0/, "");
  if (local.length !== 9) return value;
  return `+233 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
}

/** Bands sorted highest threshold first, so band order in config cannot skew grading. */
const SORTED_BANDS = [...PERF_BANDS].sort((a, b) => b.min - a.min);

/** Maps a percentage score onto its GES proficiency band. */
export function perfLevel(percentage: number): PerfLevel {
  const band = SORTED_BANDS.find((b) => percentage >= b.min);
  return (band ?? SORTED_BANDS[SORTED_BANDS.length - 1]).level;
}

export function perfLabel(level: PerfLevel): string {
  return PERF_BANDS.find((b) => b.level === level)?.label ?? "";
}

/** Mean of a numeric list, rounded to one decimal. 0 for an empty list. */
export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const total = values.reduce((sum, v) => sum + v, 0);
  return Math.round((total / values.length) * 10) / 10;
}
