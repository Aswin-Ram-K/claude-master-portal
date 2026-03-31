"use client";

import { PageTransition } from "@/components/layout/PageTransition";
import { Badge } from "@/components/shared/Badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { useActiveSessions } from "@/hooks/useActiveSessions";
import { formatDuration, formatTokenCount } from "@/lib/utils";
import {
  Radio,
  Clock,
  Cpu,
  Coins,
  Monitor,
  GitBranch,
  Loader2,
  AlertCircle,
} from "lucide-react";

function TokenGauge({
  used,
  label,
  gradientId,
}: {
  used: number;
  label: string;
  gradientId: string;
}) {
  const percentage = Math.min((used / 1_000_000) * 100, 100);
  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-bg-surface"
          />
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-mono font-bold text-text-primary">
            {formatTokenCount(used)}
          </span>
        </div>
      </div>
      <span className="text-xs text-text-muted">{label}</span>
    </div>
  );
}

function CacheGauge({
  creation,
  read,
}: {
  creation: number;
  read: number;
}) {
  return (
    <div className="flex items-center gap-4 text-xs">
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-indigo-400" />
        <span className="text-text-muted">Cache Write</span>
        <span className="font-mono text-text-secondary">
          {formatTokenCount(creation)}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-violet-400" />
        <span className="text-text-muted">Cache Read</span>
        <span className="font-mono text-text-secondary">
          {formatTokenCount(read)}
        </span>
      </div>
    </div>
  );
}

function LiveInstanceCard({
  session,
  index,
}: {
  session: {
    pid: number;
    sessionId: string;
    cwd: string;
    startedAt: number;
    kind: string;
    entrypoint: string;
    runtimeSeconds: number;
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
    model: string | null;
    lastUserMessage: string | null;
    contextSummary: string | null;
    branch: string | null;
    hostname: string;
    repoName: string | null;
  };
  index: number;
}) {
  const {
    repoName,
    branch,
    runtimeSeconds,
    entrypoint,
    model,
    hostname,
    inputTokens,
    outputTokens,
    cacheCreationTokens,
    cacheReadTokens,
    lastUserMessage,
    contextSummary,
    pid,
    sessionId,
  } = session;

  return (
    <div className="glass-card glow-hover p-5 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="status-dot status-dot-active" />
          <span className="text-base font-semibold text-text-primary">
            {repoName ?? "unknown"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success">Active</Badge>
          <Badge>{entrypoint}</Badge>
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex items-center gap-1.5 text-sm">
          <Clock className="w-3.5 h-3.5 text-text-muted shrink-0" />
          <span className="text-text-primary font-mono">
            {formatDuration(runtimeSeconds)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <GitBranch className="w-3.5 h-3.5 text-text-muted shrink-0" />
          <span className="text-text-secondary truncate">
            {branch ?? "detached"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <Cpu className="w-3.5 h-3.5 text-text-muted shrink-0" />
          <span className="text-text-secondary font-mono text-xs truncate">
            {model ?? "unknown"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <Monitor className="w-3.5 h-3.5 text-text-muted shrink-0" />
          <span className="text-text-secondary truncate">{hostname}</span>
        </div>
      </div>

      {/* PID & Session ID */}
      <div className="flex items-center gap-4 text-xs text-text-muted">
        <span>
          PID <span className="font-mono text-text-secondary">{pid}</span>
        </span>
        <span>
          Session{" "}
          <span className="font-mono text-text-secondary">
            {sessionId.slice(0, 8)}
          </span>
        </span>
      </div>

      {/* Token Usage */}
      <div className="flex flex-col items-center gap-3 py-2">
        <div className="flex items-center justify-center gap-8">
          <TokenGauge
            used={inputTokens}
            label="Input"
            gradientId={`grad-in-${index}`}
          />
          <TokenGauge
            used={outputTokens}
            label="Output"
            gradientId={`grad-out-${index}`}
          />
        </div>
        <CacheGauge creation={cacheCreationTokens} read={cacheReadTokens} />
      </div>

      {/* Context */}
      {(contextSummary || lastUserMessage) && (
        <div className="bg-bg-surface rounded-lg p-3 border border-border-subtle">
          <span className="text-xs text-text-muted block mb-1">
            Current Context
          </span>
          <p className="text-sm text-text-secondary">
            {contextSummary ?? lastUserMessage}
          </p>
        </div>
      )}
    </div>
  );
}

export default function LivePage() {
  const { data, isLoading, isError } = useActiveSessions();
  const sessions = data?.sessions ?? [];

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary flex items-center gap-2">
              <Radio className="w-6 h-6 text-status-success" />
              Live Instances
              {sessions.length > 0 && (
                <span className="text-base font-normal text-text-muted">
                  ({sessions.length})
                </span>
              )}
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Currently active Claude Code sessions &middot; Updated every 5s
            </p>
          </div>
          {isLoading && (
            <Loader2 className="w-5 h-5 text-text-muted animate-spin" />
          )}
        </div>

        {/* Error State */}
        {isError && (
          <div className="glass-card p-4 border-status-error/30 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-status-error shrink-0" />
            <span className="text-sm text-text-secondary">
              Failed to fetch active sessions. Retrying...
            </span>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && sessions.length === 0 && (
          <EmptyState
            icon={Radio}
            title="No active sessions"
            description="No Claude Code sessions are currently running. Start a session in any repo and it will appear here in real time."
          />
        )}

        {/* Instance Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {sessions.map((session, i) => (
            <LiveInstanceCard
              key={session.sessionId}
              session={session}
              index={i}
            />
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
