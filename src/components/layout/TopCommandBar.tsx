"use client";

import { Search, Sparkles, Plus, RotateCw, GitFork, ExternalLink, Bell } from "lucide-react";

interface TopCommandBarProps {
  onSearchChange?: (query: string) => void;
  onOpenQuickInvoice?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function TopCommandBar({
  onSearchChange,
  onOpenQuickInvoice,
  onRefresh,
  isRefreshing = false,
}: TopCommandBarProps) {
  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
      {/* Search Bar (Purrweb Command Style) */}
      <div className="flex-1 max-w-md relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="Search transactions, customers, invoices, products..."
          className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-9 pr-14 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
        />
        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-slate-700/60 border border-slate-600/60 rounded">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Center Proactive Alert Pill */}
      <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-medium text-blue-300">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
        <span>Market Radar: 2 items priced below market avg</span>
        <span className="text-[10px] font-mono bg-blue-600/30 text-cyan-300 px-1.5 py-0.2 rounded font-semibold">
          +18% margin opp
        </span>
      </div>

      {/* Right Action Cluster */}
      <div className="flex items-center gap-2.5">
        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh real-time data"
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all disabled:opacity-50"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-400" : ""}`} />
        </button>

        {/* Primary Action Button: Create Invoice */}
        <button
          onClick={onOpenQuickInvoice}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Invoice</span>
        </button>

        {/* GitHub Repository button */}
        <a
          href="https://github.com/yugomania/ai-interface"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all"
        >
          <GitFork className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">GitHub</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </a>
      </div>
    </header>
  );
}
