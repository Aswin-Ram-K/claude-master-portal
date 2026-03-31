"use client";

import { useParams } from "next/navigation";
import { PageTransition } from "@/components/layout/PageTransition";
import { Badge } from "@/components/shared/Badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { CardSkeleton, TableRowSkeleton } from "@/components/shared/LoadingSkeleton";
import { useRepoLogs } from "@/hooks/useSessionLogs";
import { formatDuration, formatTokenCount } from "@/lib/utils";
import {
  GitFork,
  Activity,
  GitCommit,
  FileText,
  Coins,
  Clock,
  ArrowLeft,
  Inbox,
} from "lucide-react";
import Link from "next/link";

export default function RepoDetailPage() {
  const params = useParams();
  const owner = params.owner as string;
  const repo = params.repo as string;
  const { data, isLoading } = useRepoLogs(owner, repo);

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/repos"
            className="text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Repos
          </Link>
          <span className="text-text-muted">/</span>
          <span className="text-text-primary font-medium">
            {owner}/{repo}
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-indigo to-accent-violet flex items-center justify-center">
            <GitFork className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
              {repo}
            </h1>
            <p className="text-sm text-text-secondary">{owner}</p>
          </div>
        </div>

        {isLoading ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
            <div className="glass-card p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <TableRowSkeleton key={i} />
              ))}
            </div>
          </>
        ) : !data || data.sessions.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No sessions"
            description={`No Claude Code sessions found for ${owner}/${repo}`}
          />
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 text-text-muted mb-1">
                  <Activity className="w-4 h-4" />
                  <span className="text-xs">Sessions</span>
                </div>
                <span className="text-xl font-bold font-mono text-text-primary">
                  {data.stats.totalSessions}
                </span>
              </div>
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 text-text-muted mb-1">
                  <GitCommit className="w-4 h-4" />
                  <span className="text-xs">Commits</span>
                </div>
                <span className="text-xl font-bold font-mono text-text-primary">
                  {data.stats.totalCommits}
                </span>
              </div>
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 text-text-muted mb-1">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs">Files Changed</span>
                </div>
                <span className="text-xl font-bold font-mono text-text-primary">
                  {data.stats.totalFilesChanged}
                </span>
              </div>
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 text-text-muted mb-1">
                  <Coins className="w-4 h-4" />
                  <span className="text-xs">Total Tokens</span>
                </div>
                <span className="text-xl font-bold font-mono text-text-primary">
                  {formatTokenCount(data.stats.totalTokens)}
                </span>
              </div>
            </div>

            {/* Session List */}
            <div className="glass-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border-subtle">
                <h2 className="text-base font-semibold text-text-primary">
                  Session History
                </h2>
              </div>
              {data.sessions.map((session) => {
                const date = new Date(session.startedAt).toLocaleString(
                  undefined,
                  {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                );
                return (
                  <div
                    key={session.id}
                    className="px-5 py-4 border-b border-border-subtle hover:bg-bg-surface/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <span className="text-sm font-mono text-text-muted w-36 flex-shrink-0">
                        {date}
                      </span>
                      {session.branch && (
                        <Badge variant="accent">{session.branch}</Badge>
                      )}
                      <p className="text-sm text-text-primary flex-1 truncate">
                        {session.summary ?? "Session"}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-text-muted">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {session.durationSeconds
                            ? formatDuration(session.durationSeconds)
                            : "—"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Coins className="w-3 h-3" />
                          {formatTokenCount(
                            (session.inputTokens ?? 0) +
                              (session.outputTokens ?? 0)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </PageTransition>
  );
}
