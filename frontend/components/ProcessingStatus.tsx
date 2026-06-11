"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkflowPhase } from "@/types/upload";

interface ProcessingStatusProps {
  phase: Extract<WorkflowPhase, "uploading" | "processing">;
  uploadProgress: number;
  hasThumbnail: boolean;
  hasContext: boolean;
}

type StepStatus = "pending" | "active" | "done";

interface Step {
  id: string;
  label: string;
  status: StepStatus;
}

function buildSteps(hasThumbnail: boolean, hasContext: boolean): Step[] {
  const steps: Step[] = [
    { id: "upload", label: "Uploading Video", status: "active" },
    { id: "transcript", label: "Extracting Transcript", status: "pending" },
  ];
  if (hasThumbnail) {
    steps.push({ id: "thumbnail", label: "Analyzing Thumbnail", status: "pending" });
  }
  if (hasContext) {
    steps.push({ id: "context", label: "Understanding Context", status: "pending" });
  }
  steps.push({ id: "metadata", label: "Generating Metadata", status: "pending" });
  return steps;
}

export function ProcessingStatus({
  phase,
  uploadProgress,
  hasThumbnail,
  hasContext,
}: ProcessingStatusProps) {
  const [steps, setSteps] = useState<Step[]>(() =>
    buildSteps(hasThumbnail, hasContext)
  );
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Advance a specific step to done + next to active
  const advance = (doneId: string, nextId: string) => {
    setSteps((prev) =>
      prev.map((s) => {
        if (s.id === doneId) return { ...s, status: "done" };
        if (s.id === nextId) return { ...s, status: "active" };
        return s;
      })
    );
  };

  // When phase becomes "processing" (upload bytes sent), start simulated pipeline timers
  useEffect(() => {
    if (phase !== "processing") return;

    // Clear any existing timers
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];

    // Mark upload done, activate transcript
    advance("upload", "transcript");

    let delay = 1500;

    if (hasThumbnail) {
      const t1 = setTimeout(() => advance("transcript", "thumbnail"), delay);
      timerRefs.current.push(t1);
      delay += 1000;
      const t2 = setTimeout(() => advance("thumbnail", hasContext ? "context" : "metadata"), delay);
      timerRefs.current.push(t2);
      delay += 800;
      if (hasContext) {
        const t3 = setTimeout(() => advance("context", "metadata"), delay);
        timerRefs.current.push(t3);
      }
    } else if (hasContext) {
      const t1 = setTimeout(() => advance("transcript", "context"), delay);
      timerRefs.current.push(t1);
      delay += 800;
      const t2 = setTimeout(() => advance("context", "metadata"), delay);
      timerRefs.current.push(t2);
    } else {
      const t1 = setTimeout(() => advance("transcript", "metadata"), delay);
      timerRefs.current.push(t1);
    }

    return () => timerRefs.current.forEach(clearTimeout);
  }, [phase, hasThumbnail, hasContext]);

  // Cleanup on unmount
  useEffect(() => {
    return () => timerRefs.current.forEach(clearTimeout);
  }, []);

  const activeStep = steps.find((s) => s.status === "active");
  const heading =
    phase === "uploading"
      ? `Uploading… ${uploadProgress}%`
      : activeStep?.label ?? "Processing…";

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2.5 text-base font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" aria-hidden="true" />
          {heading}
        </CardTitle>
      </CardHeader>

      <CardContent>
        {/* Upload progress bar — visible only during upload phase */}
        {phase === "uploading" && (
          <div className="mb-5">
            <div
              className="h-1.5 rounded-full bg-muted overflow-hidden"
              role="progressbar"
              aria-valuenow={uploadProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Upload progress: ${uploadProgress}%`}
            >
              <div
                className="h-full bg-primary rounded-full transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <ol className="space-y-3" aria-label="Processing pipeline">
          {steps.map((step) => (
            <li key={step.id} className="flex items-center gap-3">
              {step.status === "done" && (
                <CheckCircle2
                  className="w-4 h-4 text-emerald-400 flex-shrink-0"
                  aria-hidden="true"
                />
              )}
              {step.status === "active" && (
                <Loader2
                  className="w-4 h-4 text-primary animate-spin flex-shrink-0"
                  aria-hidden="true"
                />
              )}
              {step.status === "pending" && (
                <Circle
                  className="w-4 h-4 text-muted-foreground/30 flex-shrink-0"
                  aria-hidden="true"
                />
              )}
              <span
                className={[
                  "text-sm transition-colors",
                  step.status === "active"
                    ? "text-foreground font-medium"
                    : step.status === "done"
                    ? "text-muted-foreground line-through decoration-muted-foreground/50"
                    : "text-muted-foreground/40",
                ].join(" ")}
                aria-current={step.status === "active" ? "step" : undefined}
              >
                {step.label}
              </span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
