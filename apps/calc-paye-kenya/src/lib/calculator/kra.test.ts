import { describe, expect, it, vi } from "vitest";
import { envKraOverride } from "./kra-env";
import { resolveKraConfig } from "./kra-overrides";
import { SHIPPED_KRA_CONFIG } from "./kra";

describe("KRA env overrides", () => {
  it("merges JSON overrides over the shipped values", () => {
    const config = resolveKraConfig({
      base: SHIPPED_KRA_CONFIG,
      override: envKraOverride({
        json: JSON.stringify({
          taxYear: "2027",
          nssf: { upperEarningsLimit: 120_000 },
        }),
      }),
    });

    expect(config.taxYear).toBe("2027");
    expect(config.nssf.upperEarningsLimit).toBe(120_000);
    expect(config.nssf.employeeRate).toBe(SHIPPED_KRA_CONFIG.nssf.employeeRate);
    expect(config.paye.bands).toEqual(SHIPPED_KRA_CONFIG.paye.bands);
  });

  it("lets field-level variables win over the JSON blob", () => {
    const config = resolveKraConfig({
      base: SHIPPED_KRA_CONFIG,
      override: envKraOverride({
        json: JSON.stringify({ shif: { rate: 0.03 } }),
        shifRate: "0.04",
        nitaMonthly: "100",
      }),
    });

    expect(config.shif.rate).toBe(0.04);
    expect(config.nita.monthly).toBe(100);
  });

  it("uses environment PAYE bands when provided", () => {
    const config = resolveKraConfig({
      base: SHIPPED_KRA_CONFIG,
      override: envKraOverride({
        personalReliefAnnual: "36000",
        payeBandsJson: JSON.stringify([
          { label: "First 300,000", upTo: 300_000, rate: 0.1 },
          { label: "Above 300,000", upTo: null, rate: 0.2 },
        ]),
      }),
    });

    expect(config.paye.personalReliefAnnual).toBe(36_000);
    expect(config.paye.bands).toHaveLength(2);
  });

  it("ignores malformed JSON and empty values", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const config = resolveKraConfig({
      base: SHIPPED_KRA_CONFIG,
      override: envKraOverride({ json: "{not json", shifRate: " " }),
    });
    warn.mockRestore();

    expect(config).toEqual(SHIPPED_KRA_CONFIG);
  });
});
