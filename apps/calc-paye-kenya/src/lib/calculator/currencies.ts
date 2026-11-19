export interface Currency {
  code: string;
  name: string;
  flag: string;
  /** Units of this currency for 1 USD (indicative fallback). */
  rate: number;
}

/** The 20 most widely traded/used currencies, with KES included for the KRA tools. */
export const CURRENCIES: readonly Currency[] = [
  { code: "USD", name: "US Dollar", flag: "🇺🇸", rate: 1 },
  { code: "EUR", name: "Euro", flag: "🇪🇺", rate: 0.92 },
  { code: "GBP", name: "British Pound", flag: "🇬🇧", rate: 0.79 },
  { code: "JPY", name: "Japanese Yen", flag: "🇯🇵", rate: 147 },
  { code: "CNY", name: "Chinese Yuan", flag: "🇨🇳", rate: 7.2 },
  { code: "CHF", name: "Swiss Franc", flag: "🇨🇭", rate: 0.88 },
  { code: "CAD", name: "Canadian Dollar", flag: "🇨🇦", rate: 1.36 },
  { code: "AUD", name: "Australian Dollar", flag: "🇦🇺", rate: 1.51 },
  { code: "NZD", name: "New Zealand Dollar", flag: "🇳🇿", rate: 1.64 },
  { code: "SEK", name: "Swedish Krona", flag: "🇸🇪", rate: 10.6 },
  { code: "NOK", name: "Norwegian Krone", flag: "🇳🇴", rate: 10.7 },
  { code: "DKK", name: "Danish Krone", flag: "🇩🇰", rate: 6.87 },
  { code: "INR", name: "Indian Rupee", flag: "🇮🇳", rate: 83.5 },
  { code: "SGD", name: "Singapore Dollar", flag: "🇸🇬", rate: 1.34 },
  { code: "HKD", name: "Hong Kong Dollar", flag: "🇭🇰", rate: 7.8 },
  { code: "KRW", name: "South Korean Won", flag: "🇰🇷", rate: 1360 },
  { code: "BRL", name: "Brazilian Real", flag: "🇧🇷", rate: 5.4 },
  { code: "MXN", name: "Mexican Peso", flag: "🇲🇽", rate: 17.5 },
  { code: "ZAR", name: "South African Rand", flag: "🇿🇦", rate: 18.2 },
  { code: "KES", name: "Kenyan Shilling", flag: "🇰🇪", rate: 129 },
] as const;

export const FALLBACK_RATES: Record<string, number> = Object.fromEntries(
  CURRENCIES.map((currency) => [currency.code, currency.rate]),
);

export const RATES_ENDPOINT = "https://open.er-api.com/v6/latest/USD";

export interface RatesResult {
  rates: Record<string, number>;
  updatedAt: number;
}

interface RatesResponse {
  result?: string;
  rates?: Record<string, number>;
}

/** Fetch live USD-based rates, falling back to the bundled table for any missing code. */
export async function fetchRates(signal?: AbortSignal): Promise<RatesResult> {
  const response = await fetch(RATES_ENDPOINT, { signal });
  if (!response.ok) throw new Error(`Rate service returned ${response.status}`);

  const data = (await response.json()) as RatesResponse;
  if (data.result !== "success" || !data.rates) throw new Error("Unexpected rate service response");

  const rates = { ...FALLBACK_RATES };
  for (const currency of CURRENCIES) {
    const next = data.rates[currency.code];
    if (typeof next === "number" && Number.isFinite(next) && next > 0) rates[currency.code] = next;
  }

  return { rates, updatedAt: Date.now() };
}

export function convert(amount: number, from: string, to: string, rates: Record<string, number>): number {
  const fromRate = rates[from] ?? FALLBACK_RATES[from] ?? 1;
  const toRate = rates[to] ?? FALLBACK_RATES[to] ?? 1;
  return (amount / fromRate) * toRate;
}

export function formatMoney(amount: number, currency: string, maximumFractionDigits?: number): string {
  if (!Number.isFinite(amount)) return "—";
  const digits = maximumFractionDigits ?? (Math.abs(amount) >= 1000 ? 0 : 2);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-US", { maximumFractionDigits: digits })}`;
  }
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 2 }).format(value);
}
