import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CREDIT_POLICY } from "@/config/credits";

const RULES = [
  {
    title: `${CREDIT_POLICY.monthlyCredits} free credits every month`,
    body: "On the first of each month your monthly balance refills to 20. Unused monthly credits do not carry over.",
  },
  {
    title: "Bonus credits carry over",
    body: "Credits granted by the team (make-goods, beta thanks) never expire at the monthly reset.",
  },
  {
    title: "1 credit = 1 résumé",
    body: "Creating, cloning, importing, or AI-generating a résumé costs one credit. Everything else — edits, previews, exports, job tracking — is free.",
  },
  {
    title: "Replays are free",
    body: "If a credit spend was interrupted or you re-run an import, the same résumé is never charged twice.",
  },
] as const;

/** Static explanation of the credit rules. */
export function HowCreditsWorkCard() {
  return (
    <Card data-test="credits-how-it-works">
      <CardHeader>
        <CardTitle className="text-base">How credits work</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3">
          {RULES.map((rule) => (
            <li key={rule.title} className="flex flex-col gap-0.5">
              <p className="text-sm font-medium text-base-content">{rule.title}</p>
              <p className="text-sm text-muted-foreground">{rule.body}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
