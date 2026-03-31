"use client";

import { PageTransition } from "@/components/layout/PageTransition";
import { Badge } from "@/components/shared/Badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { CardSkeleton } from "@/components/shared/LoadingSkeleton";
import { useRepos } from "@/hooks/useSessionLogs";
import { formatRelativeTime } from "@/lib/utils";
import { GitFork, Activity, Clock, ArrowRight, Inbox } from "lucide-react";
import Link from "next/link";

export default function ReposPage() {
  const { data, isLoading } = useRepos();
  const repos = data?.repos ?? [];

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary flex items-center gap-2">
            <GitFork className="w-6 h-6 text-accent-violet" />
            Repositories
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Repos with Claude Code session activity
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : repos.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No repos found"
            description="Click Sync to discover repos with Claude Code activity."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {repos.map((repo) => (
              <Link
                key={repo.id}
                href={`/repos/${repo.owner}/${repo.name}`}
                className="glass-card glow-hover p-5 group cursor-pointer transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-text-primary group-hover:text-accent-indigo transition-colors">
                      {repo.name}
                    </h3>
                    <p className="text-xs text-text-muted">{repo.owner}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-accent-indigo group-hover:translate-x-1 transition-all" />
                </div>
                <div className="flex items-center gap-4 text-xs text-text-muted mt-4">
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    {repo.totalSessions} session{repo.totalSessions === 1 ? "" : "s"}
                  </span>
                  {repo.lastSessionAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(new Date(repo.lastSessionAt))}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
