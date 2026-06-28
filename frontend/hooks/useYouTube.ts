"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteYouTubeCredentials,
  disconnectYouTube,
  getPendingChannels,
  getYouTubeAccount,
  getYouTubeConnectUrl,
  getYouTubeCredentials,
  getYouTubePlaylists,
  publishToYouTube,
  saveYouTubeCredentials,
  selectYouTubeChannel,
  syncYouTubePlaylists,
  updateYouTubeCredentials,
} from "@/lib/api";
import type {
  YouTubeAccountResponse,
  YouTubeCredentialsResponse,
  YouTubePendingChannelsResponse,
  YouTubePlaylistListResponse,
  YouTubePublishRequest,
  YouTubePublishResponse,
} from "@/types/youtube";

const CREDS_KEY = ["youtube-credentials"] as const;
const ACCOUNT_KEY = ["youtube-account"] as const;
const PLAYLISTS_KEY = ["youtube-playlists"] as const;

export function useYouTubeCredentials() {
  return useQuery<YouTubeCredentialsResponse | null>({
    queryKey: CREDS_KEY,
    queryFn: async () => {
      const result = await getYouTubeCredentials();
      if (!result.ok) {
        if (result.error.code === "UNKNOWN_ERROR" || result.error.detail?.includes("404")) {
          return null;
        }
        // 404 means none saved — treat as null
        return null;
      }
      return result.data;
    },
    retry: false,
  });
}

export function useYouTubeAccount() {
  return useQuery<YouTubeAccountResponse | null>({
    queryKey: ACCOUNT_KEY,
    queryFn: async () => {
      const result = await getYouTubeAccount();
      if (!result.ok) return null;
      return result.data;
    },
    retry: false,
  });
}

export function useSaveCredentials() {
  const queryClient = useQueryClient();
  return useMutation<
    YouTubeCredentialsResponse,
    Error,
    { client_id: string; client_secret: string }
  >({
    mutationFn: async (data) => {
      const result = await saveYouTubeCredentials(data);
      if (!result.ok) throw new Error(result.error.detail ?? result.error.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREDS_KEY });
    },
  });
}

export function useUpdateCredentials() {
  const queryClient = useQueryClient();
  return useMutation<
    YouTubeCredentialsResponse,
    Error,
    { client_id?: string; client_secret?: string }
  >({
    mutationFn: async (data) => {
      const result = await updateYouTubeCredentials(data);
      if (!result.ok) throw new Error(result.error.detail ?? result.error.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREDS_KEY });
    },
  });
}

export function useDeleteCredentials() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const result = await deleteYouTubeCredentials();
      if (!result.ok) throw new Error(result.error.detail ?? result.error.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREDS_KEY });
      queryClient.invalidateQueries({ queryKey: ACCOUNT_KEY });
    },
  });
}

export function useDisconnect() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const result = await disconnectYouTube();
      if (!result.ok) throw new Error(result.error.detail ?? result.error.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNT_KEY });
      queryClient.invalidateQueries({ queryKey: PLAYLISTS_KEY });
    },
  });
}

export function useConnectYouTube() {
  return async (): Promise<void> => {
    const result = await getYouTubeConnectUrl();
    if (!result.ok) {
      throw new Error(result.error.detail ?? result.error.error);
    }
    window.location.href = result.data.auth_url;
  };
}

export function usePublishToYouTube() {
  return useMutation<YouTubePublishResponse, Error, YouTubePublishRequest>({
    mutationFn: async (data) => {
      const result = await publishToYouTube(data);
      if (!result.ok) throw new Error(result.error.detail ?? result.error.error);
      return result.data;
    },
  });
}

export function useYouTubePlaylists() {
  return useQuery<YouTubePlaylistListResponse | null>({
    queryKey: PLAYLISTS_KEY,
    queryFn: async () => {
      const result = await getYouTubePlaylists();
      if (!result.ok) return null;
      return result.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useSyncPlaylists() {
  const queryClient = useQueryClient();
  return useMutation<YouTubePlaylistListResponse, Error, void>({
    mutationFn: async () => {
      const result = await syncYouTubePlaylists();
      if (!result.ok) throw new Error(result.error.detail ?? result.error.error);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(PLAYLISTS_KEY, data);
    },
  });
}

export function usePendingChannels(sessionId: string | null) {
  return useQuery<YouTubePendingChannelsResponse | null>({
    queryKey: ["youtube-pending-channels", sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      const result = await getPendingChannels(sessionId);
      if (!result.ok) throw new Error(result.error.detail ?? result.error.error);
      return result.data;
    },
    enabled: !!sessionId,
    retry: false,
    gcTime: 0,
  });
}

export function useSelectChannel() {
  const queryClient = useQueryClient();
  return useMutation<
    YouTubeAccountResponse,
    Error,
    { session_id: string; channel_id: string }
  >({
    mutationFn: async (data) => {
      const result = await selectYouTubeChannel(data);
      if (!result.ok) throw new Error(result.error.detail ?? result.error.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNT_KEY });
    },
  });
}
