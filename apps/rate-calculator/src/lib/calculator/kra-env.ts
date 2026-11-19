export interface KraEnvValues {
  json?: string;
  taxYear?: string;
  reviewed?: string;
  personalReliefAnnual?: string;
  payeBandsJson?: string;
  nssfEmployeeRate?: string;
  nssfEmployerRate?: string;
  nssfLowerLimit?: string;
  nssfUpperLimit?: string;
  shifRate?: string;
  shifMinimum?: string;
  ahlEmployeeRate?: string;
  ahlEmployerRate?: string;
  nitaMonthly?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function envNumber(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function envJson(value: string | undefined): unknown {
  if (value === undefined || value.trim() === "") return undefined;
  try {
    return JSON.parse(value);
  } catch {
    console.warn("[calcpayekenya] Ignoring invalid KRA JSON in the environment.");
    return undefined;
  }
}

function mergeOverrides({
  base,
  extra,
}: {
  base: Record<string, unknown>;
  extra: Record<string, unknown>;
}): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    const current = merged[key];
    merged[key] = isRecord(current) && isRecord(value) ? { ...current, ...value } : value;
  }
  return merged;
}

/** One override object; field-level variables win over VITE_KRA_RATES_JSON. */
export function envKraOverride(env: KraEnvValues): Record<string, unknown> {
  const scalars: Record<string, unknown> = {};

  if (env.taxYear?.trim()) scalars.taxYear = env.taxYear;
  if (env.reviewed?.trim()) scalars.reviewed = env.reviewed;

  const paye: Record<string, unknown> = {};
  const relief = envNumber(env.personalReliefAnnual);
  if (relief !== undefined) paye.personalReliefAnnual = relief;
  const bands = envJson(env.payeBandsJson);
  if (bands !== undefined) paye.bands = bands;
  if (Object.keys(paye).length > 0) scalars.paye = paye;

  const nssf: Record<string, unknown> = {};
  const nssfEmployeeRate = envNumber(env.nssfEmployeeRate);
  if (nssfEmployeeRate !== undefined) nssf.employeeRate = nssfEmployeeRate;
  const nssfEmployerRate = envNumber(env.nssfEmployerRate);
  if (nssfEmployerRate !== undefined) nssf.employerRate = nssfEmployerRate;
  const nssfLowerLimit = envNumber(env.nssfLowerLimit);
  if (nssfLowerLimit !== undefined) nssf.lowerEarningsLimit = nssfLowerLimit;
  const nssfUpperLimit = envNumber(env.nssfUpperLimit);
  if (nssfUpperLimit !== undefined) nssf.upperEarningsLimit = nssfUpperLimit;
  if (Object.keys(nssf).length > 0) scalars.nssf = nssf;

  const shif: Record<string, unknown> = {};
  const shifRate = envNumber(env.shifRate);
  if (shifRate !== undefined) shif.rate = shifRate;
  const shifMinimum = envNumber(env.shifMinimum);
  if (shifMinimum !== undefined) shif.minimum = shifMinimum;
  if (Object.keys(shif).length > 0) scalars.shif = shif;

  const ahl: Record<string, unknown> = {};
  const ahlEmployeeRate = envNumber(env.ahlEmployeeRate);
  if (ahlEmployeeRate !== undefined) ahl.employeeRate = ahlEmployeeRate;
  const ahlEmployerRate = envNumber(env.ahlEmployerRate);
  if (ahlEmployerRate !== undefined) ahl.employerRate = ahlEmployerRate;
  if (Object.keys(ahl).length > 0) scalars.ahl = ahl;

  const nita: Record<string, unknown> = {};
  const nitaMonthly = envNumber(env.nitaMonthly);
  if (nitaMonthly !== undefined) nita.monthly = nitaMonthly;
  if (Object.keys(nita).length > 0) scalars.nita = nita;

  const json = envJson(env.json);
  return mergeOverrides({ base: isRecord(json) ? json : {}, extra: scalars });
}

/** Reads literal VITE_* keys so Vite can inline them at build time. */
export function activeKraOverride(): Record<string, unknown> {
  const env: KraEnvValues = {
    json: import.meta.env.VITE_KRA_RATES_JSON,
    taxYear: import.meta.env.VITE_KRA_TAX_YEAR,
    reviewed: import.meta.env.VITE_KRA_REVIEWED,
    personalReliefAnnual: import.meta.env.VITE_KRA_PERSONAL_RELIEF_ANNUAL,
    payeBandsJson: import.meta.env.VITE_KRA_PAYE_BANDS_JSON,
    nssfEmployeeRate: import.meta.env.VITE_KRA_NSSF_EMPLOYEE_RATE,
    nssfEmployerRate: import.meta.env.VITE_KRA_NSSF_EMPLOYER_RATE,
    nssfLowerLimit: import.meta.env.VITE_KRA_NSSF_LOWER_LIMIT,
    nssfUpperLimit: import.meta.env.VITE_KRA_NSSF_UPPER_LIMIT,
    shifRate: import.meta.env.VITE_KRA_SHIF_RATE,
    shifMinimum: import.meta.env.VITE_KRA_SHIF_MINIMUM,
    ahlEmployeeRate: import.meta.env.VITE_KRA_AHL_EMPLOYEE_RATE,
    ahlEmployerRate: import.meta.env.VITE_KRA_AHL_EMPLOYER_RATE,
    nitaMonthly: import.meta.env.VITE_KRA_NITA_MONTHLY,
  };

  return envKraOverride(env);
}
