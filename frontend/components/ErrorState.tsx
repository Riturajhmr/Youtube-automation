"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
interface AppError {
  message: string;
  code: string;
  detail: string;
}

interface ErrorStateProps {
  error: AppError;
  onRetry: () => void;
}

function getFriendlyMessage(code: string, detail: string): string {
  if (code === "NETWORK_ERROR") {
    return "Could not reach the server. Check your internet connection and make sure the backend is running.";
  }
  if (code === "VALIDATION_ERROR") {
    return "The request was invalid. Try adjusting your inputs.";
  }
  return detail;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const friendlyDetail = getFriendlyMessage(error.code, error.detail);

  return (
    <div role="alert" aria-live="assertive">
      <Card className="border-destructive/50">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center mt-0.5">
              <AlertCircle
                className="w-4 h-4 text-destructive"
                aria-hidden="true"
              />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="font-medium text-foreground">{error.message}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {friendlyDetail}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <code className="text-xs text-muted-foreground/60 font-mono">
              {error.code}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
