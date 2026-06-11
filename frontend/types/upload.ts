export interface UploadFormData {
  videoFile: File | null;
  thumbnailFile: File | null;
  titleHint: string;
  targetKeywords: string[];
  userContext: string;
  transcriptSource: "auto" | "manual";
  transcriptFile: File | null;
  transcriptText: string;
}

export type WorkflowPhase =
  | "collecting"
  | "uploading"
  | "processing"
  | "reviewing"
  | "error";

export const DEFAULT_UPLOAD_FORM_DATA: UploadFormData = {
  videoFile: null,
  thumbnailFile: null,
  titleHint: "",
  targetKeywords: [],
  userContext: "",
  transcriptSource: "auto",
  transcriptFile: null,
  transcriptText: "",
};
