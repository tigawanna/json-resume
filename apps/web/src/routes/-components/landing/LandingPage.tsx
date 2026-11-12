import { LandingCatalog } from "./LandingCatalog";
import { LandingCompose } from "./LandingCompose";
import { LandingFaq } from "./LandingFaq";
import { LandingFinalCta } from "./LandingFinalCta";
import { LandingFooter } from "./LandingFooter";
import { LandingGovern } from "./LandingGovern";
import { LandingHero } from "./LandingHero";
import { LandingHire } from "./LandingHire";
import { LandingIntelligence } from "./LandingIntelligence";
import { LandingNavbar } from "./LandingNavbar";
import { LandingPlatform } from "./LandingPlatform";
import { LandingPricing } from "./LandingPricing";
import { LandingProblem } from "./LandingProblem";
import { LandingProof } from "./LandingProof";
import { LandingWorkbench } from "./LandingWorkbench";

export function LandingPage() {
  return (
    <div data-test="landing-page" className="landing min-h-dvh bg-base-100">
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingWorkbench />
        <LandingProblem />
        <LandingPlatform />
        <LandingGovern />
        <LandingCompose />
        <LandingHire />
        <LandingCatalog />
        <LandingIntelligence />
        <LandingProof />
        <LandingPricing />
        <LandingFaq />
        <LandingFinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
