/** Approximate units of USD. Shown in the quote so a wrong conversion is visible. */
const USD_PER_UNIT: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  CAD: 0.73,
  AUD: 0.66,
  INR: 0.012,
  KES: 0.0077,
};

const FULL_TIME_HOURS_PER_WEEK = 40;

export interface PayQuote {
  /** Exact pay text the converter used. Empty when the page states none. */
  source: string;
  /** How the hourly figures were derived, including hours and any exchange rate. */
  basis: string;
  hourlyMinCents: number | null;
  hourlyMaxCents: number | null;
}

function amountValue(raw: string): number {
  const thousands = /k$/i.test(raw.trim());
  const value = Number(raw.replace(/[kK,\s]/g, ""));
  return thousands ? value * 1000 : value;
}

function currencyCode(text: string): string | null {
  if (text.includes("$")) return "USD";
  if (text.includes("€")) return "EUR";
  if (text.includes("£")) return "GBP";
  const code = text.match(/\b(USD|EUR|GBP|KES|CAD|AUD|INR)\b/i);
  return code?.[1].toUpperCase() ?? null;
}

function periodOf(text: string): "hour" | "day" | "week" | "month" | "year" | null {
  if (/\b(?:hour|hr)\b/i.test(text)) return "hour";
  if (/\bday\b/i.test(text)) return "day";
  if (/\b(?:week|wk)\b/i.test(text)) return "week";
  if (/\b(?:month|mo)\b/i.test(text)) return "month";
  if (/\b(?:year|yr|annum)\b/i.test(text)) return "year";
  return null;
}

function hoursPerWeek(text: string): { hours: number; stated: boolean } {
  const match = text.match(/~?\s*(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\s*(?:\/|per)\s*week/i);
  if (!match) return { hours: FULL_TIME_HOURS_PER_WEEK, stated: false };
  return { hours: Number(match[1]), stated: true };
}

function toHourlyUsd(
  amountUsd: number,
  period: "hour" | "day" | "week" | "month" | "year",
  hoursPerWeek: number,
) {
  switch (period) {
    case "hour":
      return amountUsd;
    case "day":
      return amountUsd / 8;
    case "week":
      return amountUsd / hoursPerWeek;
    case "month":
      return amountUsd / (hoursPerWeek * (52 / 12));
    case "year":
      return amountUsd / (hoursPerWeek * 52);
  }
}

/**
 * Reads a pay line from `text` and converts it to a USD-per-hour range.
 * `text` may be a whole posting or only the pay line. Hours stated anywhere in it are used;
 * otherwise a 40-hour week is assumed and written into `basis`.
 */
export function quotePayRate(text: string): PayQuote {
  const source = extractPayPhrase(text);
  if (!source) {
    return { source: "", basis: "", hourlyMinCents: null, hourlyMaxCents: null };
  }

  const code = currencyCode(source);
  const period = periodOf(source);
  const amounts = [...source.matchAll(/\d[\d,]*(?:\.\d+)?(?:\s*[kK])?/g)].map((match) =>
    amountValue(match[0]),
  );
  const rate = code ? USD_PER_UNIT[code] : undefined;

  if (!code || rate === undefined || !period || amounts.length === 0) {
    return {
      source,
      basis: `Kept "${source}" as written. No hourly USD figure: the amount, currency, or period was not readable.`,
      hourlyMinCents: null,
      hourlyMaxCents: null,
    };
  }

  const { hours, stated } = hoursPerWeek(text);
  const hourly = amounts.map((amount) => toHourlyUsd(amount * rate, period, hours));
  const min = Math.min(...hourly);
  const max = Math.max(...hourly);
  const hoursNote = stated
    ? `${hours} hours/week stated on the page`
    : `assumed ${FULL_TIME_HOURS_PER_WEEK} hours/week`;
  const fxNote = code === "USD" ? "" : `, ${code} at ${rate} USD`;

  return {
    source,
    basis: `From "${source}" using ${hoursNote}${fxNote}.`,
    hourlyMinCents: Math.round(min * 100),
    hourlyMaxCents: Math.round(max * 100),
  };
}

/** First compensation phrase. Requires a currency symbol or code. */
export function extractPayPhrase(text: string): string {
  const match = text.match(
    /(?:[$€£]\s?\d[\d,]*(?:\.\d+)?(?:\s*[kK])?(?:\s*(?:-|–|—|to)\s*[$€£]?\s?\d[\d,]*(?:\.\d+)?(?:\s*[kK])?)?(?:\s*(?:\/|per)\s*(?:hour|hr|day|week|wk|month|mo|year|yr|annum))?|\d[\d,]*(?:\.\d+)?(?:\s*[kK])?(?:\s*(?:-|–|—|to)\s*\d[\d,]*(?:\.\d+)?(?:\s*[kK])?)?\s+(?:USD|EUR|GBP|KES|CAD|AUD|INR)\b(?:\s*(?:\/|per)\s*(?:hour|hr|day|week|wk|month|mo|year|yr|annum))?)/i,
  );
  return match?.[0].replace(/\s+/g, " ").trim() ?? "";
}

export function formatHourlyUsd(minCents: number | null, maxCents: number | null): string {
  if (minCents == null && maxCents == null) return "";
  const min = minCents ?? maxCents;
  const max = maxCents ?? minCents;
  if (min == null || max == null) return "";
  const format = (cents: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
  return min === max ? `${format(min)}/hr` : `${format(min)}–${format(max)}/hr`;
}

export function dollarsToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}

export function centsToDollarInput(cents: number | null): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}
