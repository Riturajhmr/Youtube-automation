"use client";

import { Loader2, FileVideo } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UploadProgressProps {
  progress: number;
  filename: string;
}

export function UploadProgress({ progress, filename }: UploadProgressProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Loader2 className="w-4 h-4 animate-spin text-primary" aria-hidden="true" />
          Uploading video…
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filename */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
          <FileVideo className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span className="truncate">{filename}</span>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Uploading</span>
            <span aria-live="polite">{progress}%</span>
          </div>
          <div
            className="h-2 rounded-full bg-muted overflow-hidden"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Upload progress: ${progress}%`}
          >
            <div
              className="h-full bg-primary rounded-full transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
