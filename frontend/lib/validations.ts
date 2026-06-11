import { z } from "zod";
import {
  TRANSCRIPT_MIN_LENGTH,
  TRANSCRIPT_MAX_LENGTH,
  TITLE_HINT_MAX_LENGTH,
  ACCEPTED_VIDEO_EXTENSIONS,
  MAX_VIDEO_SIZE_BYTES,
  MAX_VIDEO_SIZE_MB,
  ACCEPTED_THUMBNAIL_EXTENSIONS,
  MAX_THUMBNAIL_SIZE_BYTES,
  MAX_THUMBNAIL_SIZE_MB,
  ACCEPTED_TRANSCRIPT_EXTENSIONS,
  MAX_TRANSCRIPT_SIZE_BYTES,
  MAX_TRANSCRIPT_SIZE_MB,
} from "@/lib/constants";

export const metadataFormSchema = z.object({
  transcript: z
    .string()
    .min(TRANSCRIPT_MIN_LENGTH, {
      message: `Transcript must be at least ${TRANSCRIPT_MIN_LENGTH} characters.`,
    })
    .max(TRANSCRIPT_MAX_LENGTH, {
      message: `Transcript must be ${TRANSCRIPT_MAX_LENGTH.toLocaleString()} characters or fewer.`,
    }),

  title_hint: z
    .string()
    .max(TITLE_HINT_MAX_LENGTH, {
      message: `Title hint must be ${TITLE_HINT_MAX_LENGTH} characters or fewer.`,
    })
    .optional()
    .or(z.literal("")),

  target_keywords_raw: z.string().optional().default(""),
});

export type MetadataFormValues = z.infer<typeof metadataFormSchema>;

export const videoUploadSchema = z.object({
  file: z
    .instanceof(File, { message: "Please select a video file." })
    .refine(
      (f) =>
        ACCEPTED_VIDEO_EXTENSIONS.some((ext) =>
          f.name.toLowerCase().endsWith(ext)
        ),
      {
        message: `Accepted formats: ${ACCEPTED_VIDEO_EXTENSIONS.join(", ")}`,
      }
    )
    .refine((f) => f.size > 0, { message: "File cannot be empty." })
    .refine((f) => f.size <= MAX_VIDEO_SIZE_BYTES, {
      message: `File must be ${MAX_VIDEO_SIZE_MB} MB or smaller.`,
    }),
});

export type VideoUploadFormValues = z.infer<typeof videoUploadSchema>;

export const thumbnailUploadSchema = z.object({
  file: z
    .instanceof(File, { message: "Please select an image file." })
    .refine(
      (f) =>
        ACCEPTED_THUMBNAIL_EXTENSIONS.some((ext) =>
          f.name.toLowerCase().endsWith(ext)
        ),
      {
        message: `Accepted formats: ${ACCEPTED_THUMBNAIL_EXTENSIONS.join(", ")}`,
      }
    )
    .refine((f) => f.size > 0, { message: "File cannot be empty." })
    .refine((f) => f.size <= MAX_THUMBNAIL_SIZE_BYTES, {
      message: `File must be ${MAX_THUMBNAIL_SIZE_MB} MB or smaller.`,
    }),
});

export const transcriptFileSchema = z.object({
  file: z
    .instanceof(File, { message: "Please select a transcript file." })
    .refine(
      (f) =>
        ACCEPTED_TRANSCRIPT_EXTENSIONS.some((ext) =>
          f.name.toLowerCase().endsWith(ext)
        ),
      {
        message: `Accepted formats: ${ACCEPTED_TRANSCRIPT_EXTENSIONS.join(", ")}`,
      }
    )
    .refine((f) => f.size > 0, { message: "File cannot be empty." })
    .refine((f) => f.size <= MAX_TRANSCRIPT_SIZE_BYTES, {
      message: `File must be ${MAX_TRANSCRIPT_SIZE_MB} MB or smaller.`,
    }),
});

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type SignInFormValues = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    full_name: z.string().min(2, "Full name must be at least 2 characters").trim(),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(64, "Password must be 64 characters or fewer"),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export type SignUpFormValues = z.infer<typeof signUpSchema>;

export function parseKeywords(raw: string): string[] {
  if (!raw.trim()) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const kw of raw.split(",")) {
    const normalized = kw.trim().toLowerCase();
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(kw.trim());
    }
  }
  return result;
}
