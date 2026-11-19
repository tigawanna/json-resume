import { TigawannaCredit } from "@tigawanna/credit";
import { BootScreen } from "@/components/app/BootScreen";
import { BreakdownView } from "@/components/calculator/Breakdown";
import { Controls } from "@/components/calculator/Controls";
import { CurrenciesDrawer } from "@/components/calculator/Currencies";
import { Deductions } from "@/components/calculator/Deductions";
import { Disclaimer } from "@/components/calculator/Disclaimer";
import { DisclaimerBanner } from "@/components/calculator/DisclaimerBanner";
import { EmploymentSwitch } from "@/components/calculator/EmploymentSwitch";
import { Header } from "@/components/calculator/Header";
import { Tax } from "@/components/calculator/Tax";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCalculatorStore } from "@/store";

export default function App() {
  const updatedAt = useCalculatorStore((state) => state.ratesResult.updatedAt);
  const initialRatesSettled = useCalculatorStore((state) => state.initialRatesSettled);

  return (
    <TooltipProvider>
      {initialRatesSettled ? (
        <div className="min-h-screen">
          <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 lg:py-14">
            <DisclaimerBanner />
            <Header />
            <EmploymentSwitch />

            <main className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,290px)_minmax(0,1fr)] lg:gap-16">
              <Controls />
              <div className="space-y-14">
                <BreakdownView />
                <Tax />
              </div>
            </main>

            <Deductions />
            <Disclaimer />

            <footer className="mt-8 flex flex-wrap justify-between gap-2 border-t border-border pt-4 text-[10px] text-muted-foreground">
              <p>Exchange rates: open.er-api.com · refreshed on demand.</p>
              {updatedAt > 0 ? <p>Updated {new Date(updatedAt).toLocaleTimeString()}</p> : null}
            </footer>

            <CurrenciesDrawer />
          </div>
        </div>
      ) : (
        <BootScreen />
      )}
      <TigawannaCredit />
    </TooltipProvider>
  );
}
