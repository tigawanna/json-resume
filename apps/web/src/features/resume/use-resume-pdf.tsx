import { ResumePdfDocument } from "@/features/resume/resume-pdf";
import { resumePdfFileStem } from "@/features/resume/resume-pdf-filename";
import type { ResumeDocumentV1, TemplateId } from "@/features/resume/resume-schema";
import { pdf } from "@react-pdf/renderer";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Renders `doc` to a PDF blob URL whenever its content changes. A newer render
 * supersedes an older one in flight, and the last finished URL stays up until
 * the next one is ready, so the preview never blanks between edits.
 */
export function useResumePdf({
  doc,
  templateId,
  resumeName,
  debounceMs = 0,
}: {
  doc: ResumeDocumentV1;
  templateId: TemplateId;
  resumeName: string;
  /** Wait for edits to settle before rendering (live previews). */
  debounceMs?: number;
}) {
  const docKey = JSON.stringify(doc);
  const fileStem = resumePdfFileStem(resumeName, doc);
  const fileLabel = `${fileStem}.pdf`;
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const prevUrlRef = useRef<string | null>(null);
  const generationSeqRef = useRef(0);

  async function build(nextDoc = doc, nextTemplate = templateId, nextFileStem = fileStem) {
    const generationSeq = generationSeqRef.current + 1;
    generationSeqRef.current = generationSeq;
    setGenerating(true);
    try {
      const blob = await pdf(
        <ResumePdfDocument doc={nextDoc} templateId={nextTemplate} pdfTitle={nextFileStem} />,
      ).toBlob();
      const file = new File([blob], `${nextFileStem}.pdf`, { type: "application/pdf" });
      const url = URL.createObjectURL(file);
      if (generationSeq !== generationSeqRef.current) {
        URL.revokeObjectURL(url);
        return;
      }
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
      prevUrlRef.current = url;
      setBlobUrl(url);
    } catch (err: unknown) {
      if (generationSeq === generationSeqRef.current) {
        toast.error("Failed to generate PDF", {
          description: err instanceof Error ? err.message : "Unknown error",
        });
      }
    } finally {
      if (generationSeq === generationSeqRef.current) {
        setGenerating(false);
      }
    }
  }

  useEffect(() => {
    if (debounceMs <= 0) {
      void build(doc, templateId, fileStem);
      return () => {
        generationSeqRef.current++;
      };
    }
    const timer = window.setTimeout(() => void build(doc, templateId, fileStem), debounceMs);
    return () => {
      window.clearTimeout(timer);
      generationSeqRef.current++;
    };
    // Refresh only when the document content, template or file name changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docKey, templateId, fileStem, debounceMs]);

  useEffect(() => {
    return () => {
      generationSeqRef.current++;
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
    };
  }, []);

  return { blobUrl, generating, fileLabel, regenerate: () => build() };
}
