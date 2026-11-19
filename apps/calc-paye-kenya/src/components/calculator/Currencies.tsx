import { createMemo, createSignal, For, Show } from "solid-js";
import { Portal } from "@solidjs/web";
import { Dialog, DialogDescription, DialogOverlay, DialogPanel, DialogTitle } from "terracotta/dialog";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { CURRENCIES } from "@/lib/calculator";
import { useCalculator } from "@/state/calculator";

export function Currencies() {
  const calc = useCalculator();
  const [search, setSearch] = createSignal("");

  const filtered = createMemo(() => {
    const query = search().trim().toLowerCase();
    if (!query) return CURRENCIES;
    return CURRENCIES.filter((currency) =>
      `${currency.code} ${currency.name}`.toLowerCase().includes(query),
    );
  });

  return (
    <Portal>
      <Dialog isOpen={calc.drawerOpen()} onClose={() => calc.setDrawerOpen(false)}>
        <DialogOverlay />
        <DialogPanel>
          <div class="flex items-start justify-between gap-4">
            <div>
              <DialogTitle>Currencies</DialogTitle>
              <DialogDescription>Pin a currency to see it next to your rate everywhere.</DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              label="Close currencies"
              onClick={() => calc.setDrawerOpen(false)}>
              <Icon name="x" />
            </Button>
          </div>

          <div class="relative mt-5">
            <Icon name="search" size={14} class="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
            <input
              aria-label="Search currencies"
              placeholder="Search by code or name"
              value={search()}
              onInput={(event) => setSearch(event.currentTarget.value)}
              class="h-9 w-full rounded-md border border-input bg-transparent pr-3 pl-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>

          <div class="mt-4 flex-1 space-y-0.5">
            <For each={filtered()}>
              {(currency) => {
                const pinned = () => calc.pinned().includes(currency.code);
                return (
                  <div class="flex items-center justify-between gap-3 border-b border-border/60 py-2">
                    <div class="min-w-0">
                      <p class="text-xs">
                        <span aria-hidden="true">{currency.flag}</span> <span class="numeric">{currency.code}</span>
                      </p>
                      <p class="truncate text-[10px] text-muted-foreground">{currency.name}</p>
                    </div>
                    <div class="flex shrink-0 items-center gap-1">
                      <Show when={pinned()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          label={`Make ${currency.code} the primary local currency`}
                          onClick={() => calc.setLocalCurrency(currency.code)}>
                          <Icon name="star" size={12} /> Local
                        </Button>
                      </Show>
                      <Button
                        size="sm"
                        variant={pinned() ? "selected" : "outline"}
                        onClick={() => calc.togglePin(currency.code)}>
                        {pinned() ? "Pinned" : "Pin"}
                      </Button>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        </DialogPanel>
      </Dialog>
    </Portal>
  );
}
