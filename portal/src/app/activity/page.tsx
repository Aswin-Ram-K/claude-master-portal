"use client";

import { useState } from "react";
import { PageTransition } from "@/components/layout/PageTransition";
import { Badge } from "@/components/shared/Badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableRowSkeleton } from "@/components/shared/LoadingSkeleton";
import { useActivity } from "@/hooks/useSessionLogs";
import { formatDuration, formatTokenCount, truncate } from "@/lib/utils";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";

const PAGE_SIZE = 20;

export default function ActivityPage() {
  const [offset, setOffset] = useState(0);
  const { data, isLoading } = useActivity({ limit: PAGE_SIZE, offset });

  const sessions = data?.sessions ?? [];
  const total = data?.total ?? 0;
  const hasNext = offset + PAGE_SIZE < total;
  const hasPrev = offset > 0;

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary flex items-center gap-2">
              <Activity className="w-6 h-6 text-accent-indigo" />
              Activity History
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              {total > 0
                ? `${total} session${total === 1 ? "" : "s"} across all repositories`
                : "All Claude Code sessions across your repositories"}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="glass-card overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRowSkeleton key={i} />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No activity yet"
            description="Click Sync to pull session logs from your repos."
          />
        ) : (
          <>
            <div className="glass-card overflow-hidden">
              {/* Header */}
              <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 border-b border-border-subtle text-xs font-medium text-text-muted uppercase tracking-wider">
                <div className="col-span-2">Date</div>
                <div className="col-span-1">Repo</div>
                <div className="col-span-3">Summary</div>
                <div className="col-span-1">Branch</div>
                <div className="col-span-1">Files</div>
                <div className="col-span-1">Tokens</div>
                <div className="col-span-1">Duration</div>
                <div className="col-span-1">Model</div>
                <div className="col-span-1">Source</div>
              </div>

              {sessions.map((s) => {
                const files = (s.filesChanged as string[]) ?? [];
                const totalTokens =
                  (s.inputTokens ?? 0) + (s.outputTokens ?? 0);
                const date = new Date(s.startedAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={s.id}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-4 px-5 py-4 border-b border-border-subtle hover:bg-bg-surface/50 transition-colors cursor-pointer group"
                  >
                    <div className="lg:col-span-2 flex items-center justify-between lg:block">
                      <span className="text-sm text-text-primary font-mono">
                        {date}
                      </span>
                      <Badge variant="accent" className="lg:hidden">
                        {s.repoName}
                      </Badge>
                    </div>
                    <div className="hidden lg:block lg:col-span-1">
                      <span className="text-sm text-accent-indigo font-medium">
                        {s.repoName}
                      </span>
                    </div>
                    <div className="lg:col-span-3">
                      <p className="text-sm text-text-primary truncate group-hover:text-accent-indigo transition-colors">
                        {s.summary ?? "Session"}
                      </p>
                    </div>
                    <div className="hidden lg:block lg:col-span-1">
                      {s.branch && (
                        <Badge>{truncate(s.branch, 15)}</Badge>
                      )}
                    </div>
                    <div className="hidden lg:block lg:col-span-1 text-sm text-text-secondary font-mono">
                      {files.length}
                    </div>
                    <div className="flex items-center gap-4 lg:contents">
                      <span className="lg:col-span-1 text-sm text-text-secondary font-mono">
                        {formatTokenCount(totalTokens)}
                      </span>
                      <span className="lg:col-span-1 text-sm text-text-secondary font-mono">
                        {s.durationSeconds
                          ? formatDuration(s.durationSeconds)
                          : "—"}
                      </span>
                      <span className="hidden lg:block lg:col-span-1 text-xs text-text-muted font-mono">
                        {s.model?.replace("claude-", "") ?? "—"}
                      </span>
                      <span className="hidden lg:block lg:col-span-1">
                        {s.entrypoint && <Badge>{s.entrypoint}</Badge>}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {total > PAGE_SIZE && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-muted">
                  Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of{" "}
                  {total}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                    disabled={!hasPrev}
                    className="p-2 rounded-lg bg-bg-surface border border-border-subtle text-text-secondary hover:text-text-primary disabled:opacity-30 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setOffset(offset + PAGE_SIZE)}
                    disabled={!hasNext}
                    className="p-2 rounded-lg bg-bg-surface border border-border-subtle text-text-secondary hover:text-text-primary disabled:opacity-30 transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
}
