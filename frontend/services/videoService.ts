import { uploadVideo as uploadVideoApi } from "@/lib/api";
import type { ApiResult } from "@/types/api";
import type { VideoUploadResponse } from "@/types/video";
import type { UploadFormData } from "@/types/upload";

export async function uploadVideo(
  file: File,
  onProgress: (percent: number) => void,
  formData?: UploadFormData
): Promise<ApiResult<VideoUploadResponse>> {
  return uploadVideoApi(file, onProgress, formData ? {
    titleHint: formData.titleHint,
    targetKeywords: formData.targetKeywords,
    userContext: formData.userContext,
    thumbnailFile: formData.thumbnailFile,
    transcriptFile: formData.transcriptFile,
    transcriptText: formData.transcriptText,
  } : undefined);
}
