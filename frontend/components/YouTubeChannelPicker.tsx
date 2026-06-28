"use client";

import { useState } from "react";
import Image from "next/image";
import { AlertCircle, Loader2, PlayCircle, X } from "lucide-react";
import { usePendingChannels, useSelectChannel } from "@/hooks/useYouTube";
import type { YouTubeChannelOption } from "@/types/youtube";

interface Props {
  sessionId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export default function YouTubeChannelPicker({ sessionId, onSuccess, onClose }: Props) {
  const { data, isLoading, error } = usePendingChannels(sessionId);
  const selectChannel = useSelectChannel();
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [selectError, setSelectError] = useState<string | null>(null);

  async function handleSelect(channel: YouTubeChannelOption) {
    setSelectError(null);
    setSelectingId(channel.channel_id);
    try {
      await selectChannel.mutateAsync({
        session_id: sessionId,
        channel_id: channel.channel_id,
      });
      onSuccess();
    } catch (err) {
      setSelectError(err instanceof Error ? err.message : "Failed to connect channel.");
      setSelectingId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="channel-picker-title"
    >
      <div className="relative w-full max-w-md mx-4 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-zinc-800">
          <div>
            <h2
              id="channel-picker-title"
              className="text-base font-semibold text-white"
            >
              Choose a YouTube channel
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Multiple channels found — select the one to connect.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          {isLoading && (
            <div className="flex items-center gap-2 py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-zinc-500" aria-busy="true" />
              <span className="text-sm text-zinc-500">Loading channels…</span>
            </div>
          )}

          {error && (
            <div
              className="flex items-start gap-2 px-3 py-2.5 bg-red-900/30 border border-red-700/50 rounded-lg"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">
                {error instanceof Error ? error.message : "Failed to load channels. Please reconnect."}
              </p>
            </div>
          )}

          {selectError && (
            <div
              className="flex items-start gap-2 px-3 py-2.5 mb-3 bg-red-900/30 border border-red-700/50 rounded-lg"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{selectError}</p>
            </div>
          )}

          {data && data.channels.length > 0 && (
            <ul className="flex flex-col gap-2">
              {data.channels.map((channel) => {
                const isSelecting = selectingId === channel.channel_id;
                return (
                  <li key={channel.channel_id}>
                    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/60">
                      <div className="flex items-center gap-3 min-w-0">
                        {channel.thumbnail_url ? (
                          <Image
                            src={channel.thumbnail_url}
                            alt=""
                            width={36}
                            height={36}
                            className="rounded-full flex-shrink-0 object-cover"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-red-600/20 border border-red-600/30 flex items-center justify-center flex-shrink-0">
                            <PlayCircle className="w-4 h-4 text-red-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {channel.channel_name}
                          </p>
                          {channel.channel_handle && (
                            <p className="text-xs text-zinc-500 truncate">
                              {channel.channel_handle}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleSelect(channel)}
                        disabled={selectingId !== null}
                        className="flex items-center gap-1.5 flex-shrink-0 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {isSelecting && <Loader2 className="w-3 h-3 animate-spin" />}
                        Connect
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
