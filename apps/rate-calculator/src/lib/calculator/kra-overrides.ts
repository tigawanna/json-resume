import type {
  AhlConfig,
  KraConfig,
  NitaConfig,
  NssfConfig,
  PayeBandConfig,
  PayeConfig,
  ShifConfig,
} from "./kra";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nonEmptyString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

function bandList(value: unknown): PayeBandConfig[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const bands: PayeBandConfig[] = [];

  for (const item of value) {
    if (!isRecord(item)) return null;
    const { label, upTo, rate } = item;
    if (typeof label !== "string" || label.trim() === "") return null;
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate < 0 || rate > 1) return null;
    if (upTo === null) {
      bands.push({ label, upTo, rate });
      continue;
    }
    if (typeof upTo !== "number" || !Number.isFinite(upTo) || upTo <= 0) return null;
    bands.push({ label, upTo, rate });
  }

  return bands;
}

function payeFrom(base: PayeConfig, override: unknown): PayeConfig {
  if (!isRecord(override)) return base;
  return {
    personalReliefAnnual: finiteNumber(override.personalReliefAnnual, base.personalReliefAnnual),
    bands: bandList(override.bands) ?? base.bands,
  };
}

function nssfFrom(base: NssfConfig, override: unknown): NssfConfig {
  if (!isRecord(override)) return base;
  return {
    employeeRate: finiteNumber(override.employeeRate, base.employeeRate),
    employerRate: finiteNumber(override.employerRate, base.employerRate),
    lowerEarningsLimit: finiteNumber(override.lowerEarningsLimit, base.lowerEarningsLimit),
    upperEarningsLimit: finiteNumber(override.upperEarningsLimit, base.upperEarningsLimit),
  };
}

function shifFrom(base: ShifConfig, override: unknown): ShifConfig {
  if (!isRecord(override)) return base;
  return {
    rate: finiteNumber(override.rate, base.rate),
    minimum: finiteNumber(override.minimum, base.minimum),
  };
}

function ahlFrom(base: AhlConfig, override: unknown): AhlConfig {
  if (!isRecord(override)) return base;
  return {
    employeeRate: finiteNumber(override.employeeRate, base.employeeRate),
    employerRate: finiteNumber(override.employerRate, base.employerRate),
  };
}

function nitaFrom(base: NitaConfig, override: unknown): NitaConfig {
  if (!isRecord(override)) return base;
  return { monthly: finiteNumber(override.monthly, base.monthly) };
}

function isRate(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function isAmount(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function isValidConfig(config: KraConfig): boolean {
  const { paye, nssf, shif, ahl, nita } = config;
  if (!isAmount(paye.personalReliefAnnual) || paye.bands.length === 0) return false;
  if (paye.bands[paye.bands.length - 1]?.upTo !== null) return false;

  let lastUpTo = 0;
  for (const [index, band] of paye.bands.entries()) {
    if (!isRate(band.rate)) return false;
    if (band.upTo === null) {
      if (index !== paye.bands.length - 1) return false;
      continue;
    }
    if (!Number.isFinite(band.upTo) || band.upTo <= lastUpTo) return false;
    lastUpTo = band.upTo;
  }

  return (
    isRate(nssf.employeeRate) &&
    isRate(nssf.employerRate) &&
    isAmount(nssf.lowerEarningsLimit) &&
    isAmount(nssf.upperEarningsLimit) &&
    nssf.upperEarningsLimit > nssf.lowerEarningsLimit &&
    isRate(shif.rate) &&
    isAmount(shif.minimum) &&
    isRate(ahl.employeeRate) &&
    isRate(ahl.employerRate) &&
    isAmount(nita.monthly)
  );
}

/** Merge a partial override over a base config; invalid results fall back to the base. */
export function resolveKraConfig({
  base,
  override,
}: {
  base: KraConfig;
  override: unknown;
}): KraConfig {
  if (!isRecord(override)) return base;

  const merged: KraConfig = {
    taxYear: nonEmptyString(override.taxYear, base.taxYear),
    reviewed: nonEmptyString(override.reviewed, base.reviewed),
    paye: payeFrom(base.paye, override.paye),
    nssf: nssfFrom(base.nssf, override.nssf),
    shif: shifFrom(base.shif, override.shif),
    ahl: ahlFrom(base.ahl, override.ahl),
    nita: nitaFrom(base.nita, override.nita),
  };

  if (!isValidConfig(merged)) {
    console.warn("[calcpayekenya] Ignoring invalid KRA overrides; using the shipped JSON values.");
    return base;
  }

  return merged;
}
