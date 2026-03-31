"use client";

import { useQuery } from "@tanstack/react-query";
import type { ActiveSessionInfo } from "@/lib/active-sessions";

interface ActiveSessionsData {
  sessions: ActiveSessionInfo[];
}

export function useActiveSessions() {
  return useQuery<ActiveSessionsData>({
    queryKey: ["activeSessions"],
    queryFn: () => fetch("/api/sessions/active").then((r) => r.json()),
    refetchInterval: 5_000,
  });
}
