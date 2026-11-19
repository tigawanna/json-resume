import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { DEFAULT_CONTROLS, FALLBACK_RATES, calculateStatutory } from "@/lib/calculator";
import { useCalculatorStore } from "./calculator-store";

afterEach(() => {
  vi.unstubAllGlobals();
  useCalculatorStore.setState({
    controls: { ...DEFAULT_CONTROLS },
    pinned: ["KES"],
    disclaimerDismissed: false,
    theme: "dark",
    rateStatus: "loading",
    ratesResult: { rates: FALLBACK_RATES, updatedAt: 0 },
    initialRatesSettled: false,
  });
});

describe("calculator store", () => {
  it("updates controls through a single action", () => {
    useCalculatorStore.getState().setControls({ hoursPerMonth: 175, weeksPerMonth: 4.5 });
    const { controls } = useCalculatorStore.getState();
    expect(controls.hoursPerMonth).toBe(175);
    expect(controls.weeksPerMonth).toBe(4.5);
    expect(controls.amount).toBe(10);
  });

  it("toggles pins without needing storage", () => {
    useCalculatorStore.getState().togglePin("EUR");
    expect(useCalculatorStore.getState().pinned).toContain("EUR");
    useCalculatorStore.getState().togglePin("EUR");
    expect(useCalculatorStore.getState().pinned).not.toContain("EUR");
  });

  it("makes a chosen currency the primary local currency", () => {
    useCalculatorStore.getState().setLocalCurrency("EUR");
    const { pinned } = useCalculatorStore.getState();
    expect(pinned[0]).toBe("EUR");
    expect(pinned).toContain("KES");
  });

  it("switches employment mode with matching deduction defaults", () => {
    useCalculatorStore.getState().setEmployment("contractor");
    let { controls } = useCalculatorStore.getState();
    expect(controls.employment).toBe("contractor");
    expect(controls.deductions).toEqual({ nssf: false, shif: true, ahl: true });

    useCalculatorStore.getState().setEmployment("salaried");
    controls = useCalculatorStore.getState().controls;
    expect(controls.employment).toBe("salaried");
    expect(controls.deductions).toEqual({ nssf: true, shif: true, ahl: true });
  });

  it("toggles individual statutory deductions", () => {
    useCalculatorStore.getState().toggleDeduction("shif");
    expect(useCalculatorStore.getState().controls.deductions.shif).toBe(false);
    useCalculatorStore.getState().toggleDeduction("shif");
    expect(useCalculatorStore.getState().controls.deductions.shif).toBe(true);
  });

  it("persists the disclaimer dismissal preference", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });

    useCalculatorStore.getState().dismissDisclaimer();
    expect(useCalculatorStore.getState().disclaimerDismissed).toBe(true);
    expect(storage.get("calcpayekenya:disclaimer-dismissed")).toBe("1");

    useCalculatorStore.getState().showDisclaimer();
    expect(useCalculatorStore.getState().disclaimerDismissed).toBe(false);
    expect(storage.has("calcpayekenya:disclaimer-dismissed")).toBe(false);
  });

  it("toggles and persists the theme", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });

    useCalculatorStore.getState().toggleTheme();
    expect(useCalculatorStore.getState().theme).toBe("light");
    expect(storage.get("calcpayekenya:theme")).toBe("light");

    useCalculatorStore.getState().toggleTheme();
    expect(useCalculatorStore.getState().theme).toBe("dark");
    expect(storage.get("calcpayekenya:theme")).toBe("dark");
  });

  it("writes a gross salary back into the hourly rate input", () => {
    useCalculatorStore.getState().setMonthlyGrossKes(1_000_000);
    const { controls } = useCalculatorStore.getState();
    expect(controls.amount).toBeCloseTo(1_000_000 / FALLBACK_RATES.KES / 160, 6);
    expect(controls.inputCurrency).toBe("USD");
    expect(controls.period).toBe("hour");
  });

  it("solves a take-home target back into the hourly rate", () => {
    useCalculatorStore.getState().setMonthlyNetKes(300_000);
    const { controls, ratesResult } = useCalculatorStore.getState();
    const gross = controls.amount * controls.hoursPerMonth * ratesResult.rates.KES;
    const result = calculateStatutory({ grossMonthly: gross, deductions: controls.deductions });
    expect(result.net).toBeCloseTo(300_000, 0);
  });

  it("fetches rates and stores them without an effect", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ result: "success", rates: { KES: 130, EUR: 0.9 } }),
      }),
    );

    await useCalculatorStore.getState().refreshRates();

    const { ratesResult, rateStatus, initialRatesSettled } = useCalculatorStore.getState();
    expect(rateStatus).toBe("idle");
    expect(initialRatesSettled).toBe(true);
    expect(ratesResult.rates.KES).toBe(130);
    expect(ratesResult.rates.EUR).toBe(0.9);
    expect(ratesResult.rates.USD).toBe(1);
    expect(ratesResult.updatedAt).toBeGreaterThan(0);
  });

  it("falls back to bundled rates when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await useCalculatorStore.getState().refreshRates();

    expect(useCalculatorStore.getState().rateStatus).toBe("error");
    expect(useCalculatorStore.getState().initialRatesSettled).toBe(true);
    expect(useCalculatorStore.getState().ratesResult.rates).toEqual(FALLBACK_RATES);
  });
});
