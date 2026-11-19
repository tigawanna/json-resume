import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { useMediaQuery } from "@/hooks/use-media-query";
import { CURRENCIES, convert, formatMoney } from "@/lib/calculator";
import { useBreakdown, useCalculatorStore } from "@/store";

export function CurrenciesDrawer() {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [query, setQuery] = useState("");
  const { rates, breakdown } = useBreakdown();
  const open = useCalculatorStore((state) => state.drawerOpen);
  const setDrawerOpen = useCalculatorStore((state) => state.setDrawerOpen);
  const pinned = useCalculatorStore((state) => state.pinned);
  const togglePin = useCalculatorStore((state) => state.togglePin);
  const setLocalCurrency = useCalculatorStore((state) => state.setLocalCurrency);

  const filtered = CURRENCIES.filter((currency) =>
    `${currency.code} ${currency.name}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <Drawer open={open} onOpenChange={setDrawerOpen} direction={isDesktop ? "right" : "bottom"}>
      <DrawerContent className="bg-popover">
        <DrawerHeader className="border-b border-border">
          <DrawerTitle className="text-base font-medium">All currencies</DrawerTitle>
          <DrawerDescription className="text-xs">
            Monthly pay in 20 currencies. Star one to pin it to your breakdown.
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pt-4">
          <Input
            placeholder="Search by code or name…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {filtered.map((currency) => {
            const selected = pinned[0] === currency.code;
            const isPinned = pinned.includes(currency.code);
            return (
              <div
                key={currency.code}
                className={`flex items-center gap-1 rounded-md px-1 ${selected ? "bg-accent" : ""}`}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setLocalCurrency(currency.code)}
                  className="h-auto flex-1 justify-start gap-3 px-2 py-2 font-normal">
                  <span className="w-5 text-sm" aria-hidden>
                    {currency.flag}
                  </span>
                  <span className="flex flex-col items-start gap-0.5">
                    <span className="text-xs font-medium">
                      {currency.code}
                      {selected ? <span className="ml-2 text-[9px] tracking-wide text-primary uppercase">local</span> : null}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{currency.name}</span>
                  </span>
                  <span className="numeric ml-auto text-xs text-muted-foreground">
                    {formatMoney(convert(breakdown.monthly, "USD", currency.code, rates), currency.code)}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => togglePin(currency.code)}
                  aria-label={`${isPinned ? "Unpin" : "Pin"} ${currency.code}`}>
                  <Star size={14} className={isPinned ? "fill-amber-300 text-amber-300" : "text-muted-foreground"} />
                </Button>
              </div>
            );
          })}
          {filtered.length === 0 ? <p className="px-3 py-6 text-center text-xs text-muted-foreground">No match.</p> : null}
        </div>

        <DrawerFooter className="border-t border-border">
          <DrawerClose asChild>
            <Button variant="outline">Done</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
