import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  OUT_OF_CREDITS_EVENT,
  type CreditDenial,
} from "@/data-access-layer/event-sourced/resume/resume-credit-guard";
import { CREDIT_POLICY } from "@/config/credits";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

/** Listening for the guard's event keeps the dialog reachable from non-UI code (AI tools, clones). */
export function OutOfCreditsDialog() {
  const [denial, setDenial] = useState<CreditDenial | null>(null);

  useEffect(() => {
    function onDenied(event: Event) {
      if (event instanceof CustomEvent) setDenial(event.detail as CreditDenial);
    }
    window.addEventListener(OUT_OF_CREDITS_EVENT, onDenied);
    return () => window.removeEventListener(OUT_OF_CREDITS_EVENT, onDenied);
  }, []);

  const resetDate = denial
    ? new Date(denial.resetsAt).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <Dialog open={denial !== null} onOpenChange={(open) => !open && setDenial(null)}>
      <DialogContent className="sm:max-w-md" data-test="out-of-credits-dialog">
        <DialogHeader>
          <DialogTitle>Out of résumé credits</DialogTitle>
          <DialogDescription>
            You&apos;ve used your {CREDIT_POLICY.monthlyCredits} résumés this month. Credits reset
            on {resetDate}. Editing existing résumés is always free.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDenial(null)}>
            Got it
          </Button>
          <Button asChild onClick={() => setDenial(null)}>
            <Link to="/credits" data-test="out-of-credits-credits-link">
              View credits
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
