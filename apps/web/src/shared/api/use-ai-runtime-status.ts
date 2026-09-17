import { useQuery } from "@tanstack/react-query";

import { api } from "./api-client";

export const aiRuntimeStatusQueryKey = ["ai-runtime-status"] as const;

export function useAiRuntimeStatus() {
  return useQuery({
    queryKey: aiRuntimeStatusQueryKey,
    queryFn: api.aiRuntimeStatus,
  });
}
