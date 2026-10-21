import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { ResumeWorkbenchProvider } from "@/routes/_dashboard/resumes/$resumeId/-components/resume-workbench/ResumeWorkbenchProvider";
import { ResumeWorkbenchView } from "@/routes/_dashboard/resumes/$resumeId/-components/resume-workbench/ResumeWorkbenchView";
import { useEventSourcedResumeDetail } from "@/routes/_dashboard/resumes/$resumeId/-hooks/use-event-sourced-resume-detail";
import { useLiveQuery } from "@tanstack/react-db";
import * as Sentry from "@sentry/tanstackstart-react";
import { FlaskConical } from "lucide-react";
import { useState, type ReactNode } from "react";
import { CHAT_LAB_PRESETS, isChatLabPreset, type ChatLabPresetId } from "../-utils/chat-lab-script";

const LAB_CONNECTION = "/api/ai/chat-lab";

function throwChatLabProbe() {
  const error = new Error("Chat lab probe");
  Sentry.captureException(error);
  throw error;
}

export function ChatLabPage() {
  const db = useEventSourcedDb();
  const { data: resumes } = useLiveQuery(
    (query) =>
      query
        .from({ resume: db.collections.resume })
        .select(({ resume }) => ({ id: resume.id, name: resume.name }))
        .orderBy(({ resume }) => resume.updatedAt, "desc"),
    [db],
  );
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [preset, setPreset] = useState<ChatLabPresetId>("jd-draft");
  const selectedId = resumeId ?? resumes?.[0]?.id ?? null;
  const selectedPreset = CHAT_LAB_PRESETS.find((item) => item.id === preset) ?? CHAT_LAB_PRESETS[0];

  const drawer = (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
          data-test="chat-lab-dev"
        >
          <FlaskConical className="size-3.5" />
          Dev
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 sm:max-w-sm" data-test="chat-lab-presets">
        <SheetHeader>
          <SheetTitle>Chat lab</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="chat-lab-resume">Résumé</Label>
            <Select value={selectedId ?? undefined} onValueChange={setResumeId}>
              <SelectTrigger id="chat-lab-resume" className="w-full" data-test="chat-lab-resume">
                <SelectValue placeholder="Choose a résumé" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-80">
                {(resumes ?? []).map((resume) => (
                  <SelectItem key={resume.id} value={resume.id}>
                    {resume.name || "Untitled résumé"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="chat-lab-preset">Preset</Label>
            <Select
              value={preset}
              onValueChange={(value) => {
                if (isChatLabPreset(value)) setPreset(value);
              }}
            >
              <SelectTrigger id="chat-lab-preset" className="w-full" data-test="chat-lab-preset">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {CHAT_LAB_PRESETS.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{selectedPreset.detail}</p>
          </div>
          <ChatLabProbeButton />
        </div>
      </SheetContent>
    </Sheet>
  );

  if (!selectedId) {
    return (
      <div className="flex h-full items-center justify-center p-6" data-test="chat-lab-page">
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">
            No local résumé to attach the workbench to.
          </p>
          <ChatLabProbeButton />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col" data-test="chat-lab-page">
      <ChatLabWorkbench key={selectedId} resumeId={selectedId} preset={preset} navExtra={drawer} />
    </div>
  );
}

function ChatLabProbeButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      data-test="chat-lab-throw"
      onClick={throwChatLabProbe}
    >
      Throw error
    </Button>
  );
}

function ChatLabWorkbench({
  resumeId,
  preset,
  navExtra,
}: {
  resumeId: string;
  preset: ChatLabPresetId;
  navExtra: ReactNode;
}) {
  const { db, detail, snapshots, isLoading } = useEventSourcedResumeDetail(resumeId);

  if (isLoading) return <RouterPendingComponent />;
  if (!detail) {
    return (
      <p className="p-6 text-sm text-muted-foreground">That résumé is not in the local library.</p>
    );
  }

  return (
    <ResumeWorkbenchProvider db={db} detail={detail} snapshots={snapshots}>
      <ResumeWorkbenchView
        tab="ai"
        lab={{ connection: LAB_CONNECTION, preset }}
        navExtra={navExtra}
      />
    </ResumeWorkbenchProvider>
  );
}
