import { create } from "zustand";
import {
  CURRENCIES,
  DEDUCTIONS_BY_EMPLOYMENT,
  DEFAULT_CONTROLS,
  FALLBACK_RATES,
  convert,
  fetchRates,
  grossForNetSalary,
  type ControlsState,
  type DeductionKey,
  type EmploymentMode,
  type RatesResult,
} from "@/lib/calculator";
import { applyTheme, loadTheme, saveTheme, type Theme } from "./theme";

export type RateStatus = "loading" | "error" | "idle";

interface CalculatorState {
  controls: ControlsState;
  pinned: string[];
  drawerOpen: boolean;
  disclaimerDismissed: boolean;
  theme: Theme;
  ratesResult: RatesResult;
  rateStatus: RateStatus;
  /** True once the first rate request has settled, so the boot screen can hand over to the app. */
  initialRatesSettled: boolean;
  setControls: (patch: Partial<ControlsState>) => void;
  /** Switches how pay is received and resets deductions to that mode's defaults. */
  setEmployment: (employment: EmploymentMode) => void;
  toggleDeduction: (key: DeductionKey) => void;
  /** Writes a KES gross salary back into the rate input so the whole app follows it. */
  setMonthlyGrossKes: (monthlyGrossKes: number) => void;
  setMonthlyNetKes: (monthlyNetKes: number) => void;
  togglePin: (code: string) => void;
  /** Pins a currency and makes it the primary local currency shown in the UI. */
  setLocalCurrency: (code: string) => void;
  setDrawerOpen: (open: boolean) => void;
  dismissDisclaimer: () => void;
  showDisclaimer: () => void;
  toggleTheme: () => void;
  refreshRates: () => Promise<void>;
}

const PINNED_KEY = "calcpayekenya:pinned";
const DISCLAIMER_KEY = "calcpayekenya:disclaimer-dismissed";
const RATES_TIMEOUT_MS = 5_000;

function loadPinned(): string[] {
  try {
    const raw = localStorage.getItem(PINNED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return ["KES"];
    const valid = new Set(CURRENCIES.map((currency) => currency.code));
    return parsed.filter((code): code is string => typeof code === "string" && valid.has(code));
  } catch {
    return ["KES"];
  }
}

function savePinned(pinned: string[]): void {
  try {
    localStorage.setItem(PINNED_KEY, JSON.stringify(pinned));
  } catch {
    // Storage may be unavailable; pinning still works for this session.
  }
}

function loadDisclaimerDismissed(): boolean {
  try {
    return localStorage.getItem(DISCLAIMER_KEY) === "1";
  } catch {
    return false;
  }
}

function saveDisclaimerDismissed(dismissed: boolean): void {
  try {
    if (dismissed) localStorage.setItem(DISCLAIMER_KEY, "1");
    else localStorage.removeItem(DISCLAIMER_KEY);
  } catch {
    // Storage may be unavailable; the preference still works for this session.
  }
}

export const useCalculatorStore = create<CalculatorState>((set, get) => ({
  controls: DEFAULT_CONTROLS,
  pinned: loadPinned(),
  drawerOpen: false,
  disclaimerDismissed: loadDisclaimerDismissed(),
  theme: loadTheme(),
  ratesResult: { rates: FALLBACK_RATES, updatedAt: 0 },
  rateStatus: "loading",
  initialRatesSettled: false,

  setControls: (patch) => set((state) => ({ controls: { ...state.controls, ...patch } })),

  setEmployment: (employment) =>
    set((state) => ({
      controls: {
        ...state.controls,
        employment,
        deductions: { ...DEDUCTIONS_BY_EMPLOYMENT[employment] },
      },
    })),

  toggleDeduction: (key) =>
    set((state) => ({
      controls: {
        ...state.controls,
        deductions: { ...state.controls.deductions, [key]: !state.controls.deductions[key] },
      },
    })),

  setMonthlyGrossKes: (monthlyGrossKes) => {
    const { controls, ratesResult } = get();
    const usdMonthly = convert(monthlyGrossKes, "KES", "USD", ratesResult.rates);
    const hourlyUsd = controls.hoursPerMonth > 0 ? usdMonthly / controls.hoursPerMonth : 0;
    set({
      controls: { ...controls, amount: hourlyUsd, inputCurrency: "USD", period: "hour" },
    });
  },

  setMonthlyNetKes: (monthlyNetKes) => {
    const { controls } = get();
    get().setMonthlyGrossKes(
      grossForNetSalary({ netMonthly: monthlyNetKes, deductions: controls.deductions }),
    );
  },

  togglePin: (code) => {
    const current = get().pinned;
    const next = current.includes(code) ? current.filter((item) => item !== code) : [...current, code];
    savePinned(next);
    set({ pinned: next });
  },

  setLocalCurrency: (code) => {
    const next = [code, ...get().pinned.filter((item) => item !== code)];
    savePinned(next);
    set({ pinned: next });
  },

  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),

  dismissDisclaimer: () => {
    saveDisclaimerDismissed(true);
    set({ disclaimerDismissed: true });
  },

  showDisclaimer: () => {
    saveDisclaimerDismissed(false);
    set({ disclaimerDismissed: false });
  },

  toggleTheme: () => {
    const theme: Theme = get().theme === "dark" ? "light" : "dark";
    saveTheme(theme);
    let applied = false;
    const commit = () => {
      if (applied) return;
      applied = true;
      applyTheme(theme);
      set({ theme });
    };

    if (typeof document !== "undefined" && typeof document.startViewTransition === "function") {
      const transition = document.startViewTransition(commit);
      void transition.finished.catch(() => {});
      void transition.updateCallbackDone.catch(() => {});
      // Background tabs can pause frames before the transition callback runs.
      setTimeout(commit, 250);
    } else {
      commit();
    }
  },

  refreshRates: async () => {
    set({ rateStatus: "loading" });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RATES_TIMEOUT_MS);
    try {
      const result = await fetchRates(controller.signal);
      set({ ratesResult: result, rateStatus: "idle", initialRatesSettled: true });
    } catch {
      set({ rateStatus: "error", initialRatesSettled: true });
    } finally {
      clearTimeout(timeout);
    }
  },

}));
