import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { ResumeWorkbenchProvider } from "@/routes/_dashboard/resumes/$resumeId/-components/resume-workbench/ResumeWorkbenchProvider";
import { ResumeWorkbenchView } from "@/routes/_dashboard/resumes/$resumeId/-components/resume-workbench/ResumeWorkbenchView";
import { useEventSourcedResumeDetail } from "@/routes/_dashboard/resumes/$resumeId/-hooks/use-event-sourced-resume-detail";
import { useLiveQuery } from "@tanstack/react-db";
import { useState } from "react";
import { CHAT_LAB_PRESETS, isChatLabPreset, type ChatLabPresetId } from "../-utils/chat-lab-script";

const LAB_CONNECTION = "/api/ai/chat-lab";

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
  const [preset, setPreset] = useState<ChatLabPresetId>("who-am-i");
  const selectedId = resumeId ?? resumes?.[0]?.id ?? null;
  const selectedPreset = CHAT_LAB_PRESETS.find((item) => item.id === preset) ?? CHAT_LAB_PRESETS[1];

  return (
    <div className="flex w-full flex-col gap-3" data-test="chat-lab-page">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Chat lab</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          The résumé workbench, with the model endpoint swapped for a script. Pick a preset, then
          send any text. Tool presets run the real client tools.
        </p>
      </header>
      <div className="grid items-start gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside
          className="flex flex-col gap-3 rounded-xl border border-border/60 p-3"
          data-test="chat-lab-presets"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="chat-lab-resume">Résumé</Label>
            <Select value={selectedId ?? undefined} onValueChange={setResumeId}>
              <SelectTrigger id="chat-lab-resume" className="w-full" data-test="chat-lab-resume">
                <SelectValue placeholder="Choose a résumé" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                className="max-h-80 w-(--radix-select-trigger-width)"
              >
                {(resumes ?? []).map((resume) => (
                  <SelectItem key={resume.id} value={resume.id} className="truncate">
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
              <SelectContent position="popper" className="w-(--radix-select-trigger-width)">
                {CHAT_LAB_PRESETS.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{selectedPreset.detail}</p>
          </div>
        </aside>
        {selectedId ? (
          <ChatLabWorkbench key={selectedId} resumeId={selectedId} preset={preset} />
        ) : (
          <p className="text-sm text-muted-foreground">
            No local résumé to attach the workbench to.
          </p>
        )}
      </div>
    </div>
  );
}

function ChatLabWorkbench({ resumeId, preset }: { resumeId: string; preset: ChatLabPresetId }) {
  const { db, detail, snapshots, isLoading } = useEventSourcedResumeDetail(resumeId);

  if (isLoading) return <RouterPendingComponent />;
  if (!detail) {
    return (
      <p className="text-sm text-muted-foreground">That résumé is not in the local library.</p>
    );
  }

  return (
    <ResumeWorkbenchProvider db={db} detail={detail} snapshots={snapshots}>
      <ResumeWorkbenchView tab="ai" lab={{ connection: LAB_CONNECTION, preset }} />
    </ResumeWorkbenchProvider>
  );
}
