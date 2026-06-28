"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteHistoryItem, getHistory, getHistoryItem } from "@/lib/api";
import type { HistoryItem, HistoryListResponse } from "@/types/history";

export const historyListKey = (params: object) =>
  ["history", "list", params] as const;
export const historyItemKey = (id: string) => ["history", "item", id] as const;

export function useHistory(params: {
  page?: number;
  page_size?: number;
  filter?: string;
  search?: string;
}) {
  return useQuery<HistoryListResponse, Error>({
    queryKey: historyListKey(params),
    queryFn: async () => {
      const result = await getHistory(params);
      if (!result.ok) {
        throw new Error(result.error.detail ?? result.error.error);
      }
      return result.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useHistoryItem(id: string) {
  return useQuery<HistoryItem, Error>({
    queryKey: historyItemKey(id),
    queryFn: async () => {
      const result = await getHistoryItem(id);
      if (!result.ok) {
        throw new Error(result.error.detail ?? result.error.error);
      }
      return result.data;
    },
    enabled: !!id,
  });
}

export function useDeleteHistoryItem() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      const result = await deleteHistoryItem(id);
      if (!result.ok) {
        throw new Error(result.error.detail ?? result.error.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });
}
