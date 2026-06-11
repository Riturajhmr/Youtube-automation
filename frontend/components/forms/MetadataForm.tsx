"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  metadataFormSchema,
  type MetadataFormValues,
} from "@/lib/validations";
import { TRANSCRIPT_MAX_LENGTH } from "@/lib/constants";

interface MetadataFormProps {
  onSubmit: (values: MetadataFormValues) => void;
  isSubmitting: boolean;
}

export function MetadataForm({ onSubmit, isSubmitting }: MetadataFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<MetadataFormValues>({
    resolver: zodResolver(metadataFormSchema),
    defaultValues: {
      transcript: "",
      title_hint: "",
      target_keywords_raw: "",
    },
    mode: "onBlur",
  });

  const transcriptLength = watch("transcript").length;
  const transcriptProgress = Math.min(
    (transcriptLength / TRANSCRIPT_MAX_LENGTH) * 100,
    100
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Video Input</CardTitle>
          <CardDescription>
            Paste your video transcript to generate professional YouTube
            metadata.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Transcript */}
          <div className="space-y-2">
            <Label htmlFor="transcript">
              Transcript{" "}
              <span aria-hidden="true" className="text-destructive">
                *
              </span>
            </Label>
            <Textarea
              id="transcript"
              placeholder="Paste your full video transcript here…"
              rows={12}
              className="resize-y min-h-[200px]"
              aria-describedby="transcript-hint transcript-error"
              aria-invalid={!!errors.transcript}
              {...register("transcript")}
            />
            <div className="flex items-center justify-between gap-2">
              <p
                id="transcript-hint"
                className="text-xs text-muted-foreground"
              >
                50 – {TRANSCRIPT_MAX_LENGTH.toLocaleString()} characters
              </p>
              <div className="flex items-center gap-2">
                <div
                  className="w-16 h-1 rounded-full bg-muted overflow-hidden"
                  aria-hidden="true"
                >
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-150"
                    style={{ width: `${transcriptProgress}%` }}
                  />
                </div>
                <span
                  className="text-xs text-muted-foreground tabular-nums"
                  aria-live="polite"
                  aria-label={`${transcriptLength} characters`}
                >
                  {transcriptLength.toLocaleString()}
                </span>
              </div>
            </div>
            {errors.transcript && (
              <p
                id="transcript-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {errors.transcript.message}
              </p>
            )}
          </div>

          <Separator />

          {/* Title Hint */}
          <div className="space-y-2">
            <Label htmlFor="title_hint">
              Title Hint{" "}
              <span className="text-xs text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="title_hint"
              placeholder="e.g. How to build a REST API in Python"
              aria-describedby="title_hint-error"
              aria-invalid={!!errors.title_hint}
              {...register("title_hint")}
            />
            {errors.title_hint && (
              <p
                id="title_hint-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {errors.title_hint.message}
              </p>
            )}
          </div>

          {/* Target Keywords */}
          <div className="space-y-2">
            <Label htmlFor="target_keywords_raw">
              Target Keywords{" "}
              <span className="text-xs text-muted-foreground">
                (optional, comma-separated)
              </span>
            </Label>
            <Input
              id="target_keywords_raw"
              placeholder="e.g. python tutorial, rest api, fastapi"
              {...register("target_keywords_raw")}
            />
            <p className="text-xs text-muted-foreground">
              Separate keywords with commas. Duplicates are removed
              automatically.
            </p>
          </div>
        </CardContent>

        <CardFooter>
          <Button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="w-full gap-2"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                Generate Metadata
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
