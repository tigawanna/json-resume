import { ExpCatalog } from "./exp-catalog";
import { ExpCompose } from "./exp-compose";
import { ExpFaq } from "./exp-faq";
import { ExpFinalCta } from "./exp-final-cta";
import { ExpFooter } from "./exp-footer";
import { ExpGovern } from "./exp-govern";
import { ExpHero } from "./exp-hero";
import { ExpHire } from "./exp-hire";
import { ExpIntelligence } from "./exp-intelligence";
import { ExpNavbar } from "./exp-navbar";
import { ExpPlatform } from "./exp-platform";
import { ExpPricing } from "./exp-pricing";
import { ExpProblem } from "./exp-problem";
import { ExpProof } from "./exp-proof";

export function ExpLandingPage() {
  return (
    <div data-test="exp-landing-page" className="exp-landing min-h-dvh bg-base-100">
      <ExpNavbar />
      <main>
        <ExpHero />
        <ExpProblem />
        <ExpPlatform />
        <ExpGovern />
        <ExpCompose />
        <ExpHire />
        <ExpCatalog />
        <ExpIntelligence />
        <ExpProof />
        <ExpPricing />
        <ExpFaq />
        <ExpFinalCta />
      </main>
      <ExpFooter />
    </div>
  );
}
