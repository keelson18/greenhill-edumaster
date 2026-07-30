import { CBC_BANDS, SCHOOL_PROFILE, type CbcLevel } from "@/config/app.config";

/** Formats a number as Kenyan Shillings using the configured locale. */
export function formatCurrency(value: number): string {
  return `${SCHOOL_PROFILE.currency} ${Math.round(value).toLocaleString(SCHOOL_PROFILE.locale)}`;
}

/** Compact currency for dense KPI tiles (e.g. "KES 6.4M"). */
export function formatCurrencyCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${SCHOOL_PROFILE.currency} ${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${SCHOOL_PROFILE.currency} ${(value / 1_000).toFixed(0)}K`;
  }
  return formatCurrency(value);
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString(SCHOOL_PROFILE.locale);
}

/** Maps a percentage score onto its CBC performance band. */
export function cbcLevel(percentage: number): CbcLevel {
  const band = CBC_BANDS.find((b) => percentage >= b.min);
  return (band ?? CBC_BANDS[CBC_BANDS.length - 1]).level;
}

export function cbcLabel(level: CbcLevel): string {
  return CBC_BANDS.find((b) => b.level === level)?.label ?? "";
}

/** Mean of a numeric list, rounded to one decimal. 0 for an empty list. */
export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const total = values.reduce((sum, v) => sum + v, 0);
  return Math.round((total / values.length) * 10) / 10;
}
