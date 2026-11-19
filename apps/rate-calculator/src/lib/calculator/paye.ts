import { KRA_CONFIG, type PayeConfig } from "./kra";

/**
 * Kenya PAYE individual income tax — bands and relief come from `kra-rates.json`.
 * Figures are annual and in Kenyan shillings (KES).
 */
export interface KraBand {
  label: string;
  rate: number;
  taxable: number;
  tax: number;
}

export interface KraResult {
  annualGross: number;
  taxBeforeRelief: number;
  tax: number;
  net: number;
  effectiveRate: number;
  bands: KraBand[];
}

function taxByBand({
  annualGross,
  paye,
}: {
  annualGross: number;
  paye: PayeConfig;
}): { bands: KraBand[]; total: number } {
  const bands: KraBand[] = [];
  let lower = 0;
  let remaining = Math.max(0, annualGross);
  let total = 0;

  for (const band of paye.bands) {
    if (remaining <= 0) break;
    const ceiling = band.upTo ?? Number.POSITIVE_INFINITY;
    const taxable = Math.min(remaining, ceiling - lower);
    if (!(taxable > 0)) break;

    const tax = taxable * band.rate;
    bands.push({ label: band.label, rate: band.rate, taxable, tax });
    total += tax;
    remaining -= taxable;
    lower = ceiling;
  }

  return { bands, total };
}

export function calculatePaye({
  annualGross,
  paye = KRA_CONFIG.paye,
}: {
  annualGross: number;
  paye?: PayeConfig;
}): KraResult {
  const gross = Math.max(0, annualGross);
  const { bands, total: taxBeforeRelief } = taxByBand({ annualGross: gross, paye });
  const tax = Math.max(0, taxBeforeRelief - paye.personalReliefAnnual);

  return {
    annualGross: gross,
    taxBeforeRelief,
    tax,
    net: gross - tax,
    effectiveRate: gross > 0 ? tax / gross : 0,
    bands,
  };
}

/** Invert calculatePaye: annual gross required to leave a given annual net. */
export function grossForNet({
  annualNet,
  paye = KRA_CONFIG.paye,
}: {
  annualNet: number;
  paye?: PayeConfig;
}): number {
  const target = Math.max(0, annualNet);
  let low = target;
  let high = target * 2 + paye.personalReliefAnnual + 1;

  for (let step = 0; step < 80; step += 1) {
    const middle = (low + high) / 2;
    if (calculatePaye({ annualGross: middle, paye }).net < target) low = middle;
    else high = middle;
  }

  return (low + high) / 2;
}
