"use client";

import { RefreshCw, Search, Menu } from "lucide-react";
import { useSync } from "@/hooks/useSessionLogs";

export function TopBar() {
  const sync = useSync();

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border-subtle bg-bg-primary/80 backdrop-blur-md">
      <div className="flex items-center justify-between h-full px-4 sm:px-6">
        {/* Mobile menu button */}
        <button className="lg:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-surface transition-colors">
          <Menu className="w-5 h-5" />
        </button>

        {/* Search */}
        <div className="hidden sm:flex items-center flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search sessions, repos..."
              className="w-full pl-10 pr-4 py-2 bg-bg-surface border border-border-subtle rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-indigo/50 focus:ring-1 focus:ring-accent-indigo/20 transition-all"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => sync.mutate()}
            disabled={sync.isPending}
            className="flex items-center gap-2 px-3 py-1.5 bg-bg-surface border border-border-subtle rounded-lg text-sm text-text-secondary hover:text-text-primary hover:border-border-hover transition-all disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${sync.isPending ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">
              {sync.isPending ? "Syncing..." : "Sync"}
            </span>
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-indigo to-accent-violet flex items-center justify-center text-white text-xs font-semibold">
            A
          </div>
        </div>
      </div>
    </header>
  );
}
