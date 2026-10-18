"use client";

import {
  LayoutDashboard,
  Receipt,
  FileText,
  ShieldAlert,
  Radar,
  CreditCard,
  Settings,
  HelpCircle,
  ExternalLink,
} from "lucide-react";

export type NavTab = "overview" | "transactions" | "invoices" | "disputes" | "pricing" | "checkout";

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  disputeCount?: number;
}

export function Sidebar({ activeTab, onTabChange, disputeCount = 1 }: SidebarProps) {
  const navItems = [
    { id: "overview" as NavTab, label: "Overview", icon: LayoutDashboard },
    { id: "transactions" as NavTab, label: "Live Ledger", icon: CreditCard },
    { id: "invoices" as NavTab, label: "Invoicing", icon: FileText },
    {
      id: "disputes" as NavTab,
      label: "Dispute Shield",
      icon: ShieldAlert,
      badge: disputeCount > 0 ? disputeCount : undefined,
    },
    { id: "pricing" as NavTab, label: "Market Radar", icon: Radar, tag: "Channel3" },
    { id: "checkout" as NavTab, label: "Pay Terminal", icon: Receipt },
  ];

  return (
    <aside className="w-64 bg-slate-900/95 border-r border-slate-800/80 flex flex-col justify-between h-screen sticky top-0 flex-shrink-0 z-30 select-none backdrop-blur-xl">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-slate-800/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <span className="font-black text-white text-base tracking-tighter">P</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-white">PaySight</span>
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  v2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Merchant Intelligence</p>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <div className="p-3 space-y-1">
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Workspaces
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.tag && (
                    <span
                      className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        isActive
                          ? "bg-blue-700 text-cyan-200"
                          : "bg-slate-800 text-cyan-400 border border-cyan-500/20"
                      }`}
                    >
                      {item.tag}
                    </span>
                  )}
                  {item.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {item.badge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Sandbox Card & User Profile */}
      <div className="p-3 border-t border-slate-800/70 space-y-3">
        {/* Environment Status Badge */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Network
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Connected
            </span>
          </div>
          <div className="text-xs font-semibold text-slate-200">PayPal Sandbox</div>
          <div className="text-[10px] font-mono text-slate-500 truncate">
            api-m.sandbox.paypal.com
          </div>
        </div>

        {/* User profile row */}
        <div className="flex items-center justify-between px-2 py-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
              JD
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-200">Judge Demo</span>
              <span className="text-[10px] text-slate-500 truncate">judge@hackathon.dev</span>
            </div>
          </div>
          <a
            href="https://github.com/yugomania/ai-interface"
            target="_blank"
            rel="noopener noreferrer"
            title="View GitHub Repository"
            className="text-slate-400 hover:text-slate-200 p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </aside>
  );
}
