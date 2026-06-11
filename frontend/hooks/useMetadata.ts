"use client";

import { useMutation } from "@tanstack/react-query";
import { generateMetadata } from "@/lib/api";
import { parseKeywords } from "@/lib/validations";
import type { MetadataFormValues } from "@/lib/validations";
import type { MetadataGenerateResponse } from "@/types/metadata";

export class MetadataApiError extends Error {
  readonly code: string;
  readonly detail: string;

  constructor(error: string, detail: string, code: string) {
    super(error);
    this.name = "MetadataApiError";
    this.code = code;
    this.detail = detail;
  }
}

export function useGenerateMetadata() {
  const mutation = useMutation<
    MetadataGenerateResponse,
    MetadataApiError,
    MetadataFormValues
  >({
    mutationFn: async (formValues: MetadataFormValues) => {
      const result = await generateMetadata({
        transcript: formValues.transcript,
        title_hint: formValues.title_hint?.trim() || null,
        target_keywords: parseKeywords(formValues.target_keywords_raw ?? ""),
        channel_profile: null,
      });

      if (!result.ok) {
        throw new MetadataApiError(
          result.error.error,
          result.error.detail,
          result.error.code
        );
      }

      return result.data;
    },
  });

  return {
    generate: mutation.mutate,
    data: mutation.data ?? null,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error ?? null,
    reset: mutation.reset,
  } as const;
}
