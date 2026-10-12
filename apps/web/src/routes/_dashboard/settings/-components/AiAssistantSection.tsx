import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AiSettingsForm } from "@/routes/_dashboard/-ai/-components/AiSettingsForm";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

export function AiAssistantSection() {
  return (
    <Card id="ai" className="scroll-mt-20" data-test="settings-ai-section">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" aria-hidden />
          <div>
            <CardTitle>AI assistants</CardTitle>
            <CardDescription>
              One OpenRouter key and model for the dashboard assistant and the résumé editor's
              assistant. Stored in the local database and synced when sync is on.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <AiSettingsForm
          footerClassName="border-border/60 border-t pt-4"
          onSaved={() => toast.success("AI settings saved")}
        />
      </CardContent>
    </Card>
  );
}
