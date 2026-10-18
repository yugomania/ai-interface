"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, GridReadyEvent, ICellRendererParams } from "ag-grid-community";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import type { Transaction } from "@/types";
import { format, parseISO } from "date-fns";
import { Download, Filter, Search } from "lucide-react";

ModuleRegistry.registerModules([AllCommunityModule]);

// ─── Purrweb-Style Status Dots & Badge Renderer ─────────────────────────────

function StatusDotRenderer({ value }: ICellRendererParams) {
  const config: Record<string, { label: string; dot: string; badge: string }> = {
    COMPLETED: {
      label: "Completed",
      dot: "bg-emerald-400 shadow-sm shadow-emerald-400/50",
      badge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    },
    PENDING: {
      label: "Pending",
      dot: "bg-amber-400 shadow-sm shadow-amber-400/50",
      badge: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    },
    FAILED: {
      label: "Failed",
      dot: "bg-rose-400 shadow-sm shadow-rose-400/50",
      badge: "bg-rose-500/10 text-rose-300 border-rose-500/20",
    },
    REFUNDED: {
      label: "Refunded",
      dot: "bg-blue-400 shadow-sm shadow-blue-400/50",
      badge: "bg-blue-500/10 text-blue-300 border-blue-500/20",
    },
    DENIED: {
      label: "Denied",
      dot: "bg-rose-500 shadow-sm shadow-rose-500/50",
      badge: "bg-rose-600/10 text-rose-300 border-rose-600/20",
    },
  };

  const current = config[value as string] ?? {
    label: value || "Unknown",
    dot: "bg-slate-400",
    badge: "bg-slate-700/50 text-slate-300 border-slate-600/30",
  };

  return (
    <div className="flex items-center h-full">
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${current.badge}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
        <span>{current.label}</span>
      </span>
    </div>
  );
}

function AmountCellRenderer({ data }: ICellRendererParams<Transaction>) {
  if (!data) return null;
  return (
    <div className="flex items-center h-full">
      <span className="font-mono font-semibold text-slate-100 text-xs">
        {new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: data.currency,
        }).format(data.amount)}
      </span>
    </div>
  );
}

function MethodCellRenderer({ value }: ICellRendererParams) {
  const methodMap: Record<string, { label: string; icon: string }> = {
    paypal: { label: "PayPal", icon: "🅿️" },
    card: { label: "Debit/Credit", icon: "💳" },
    paylater: { label: "Pay Later", icon: "⏳" },
    venmo: { label: "Venmo", icon: "⚡" },
  };

  const item = methodMap[value as string] ?? { label: value, icon: "💰" };

  return (
    <div className="flex items-center gap-1.5 h-full text-xs text-slate-300">
      <span>{item.icon}</span>
      <span className="font-medium">{item.label}</span>
    </div>
  );
}

interface TransactionGridProps {
  transactions: Transaction[];
  loading: boolean;
  externalSearch?: string;
}

type FilterTab = "ALL" | "COMPLETED" | "PENDING" | "RISK";

export function TransactionGrid({
  transactions,
  loading,
  externalSearch = "",
}: TransactionGridProps) {
  const gridRef = useRef<AgGridReact<Transaction>>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("ALL");
  const [localSearch, setLocalSearch] = useState("");

  const filteredData = useMemo(() => {
    let list = transactions;

    if (activeFilter === "COMPLETED") {
      list = list.filter((t) => t.status === "COMPLETED");
    } else if (activeFilter === "PENDING") {
      list = list.filter((t) => t.status === "PENDING");
    } else if (activeFilter === "RISK") {
      list = list.filter(
        (t) => t.status === "FAILED" || t.status === "DENIED" || t.status === "REFUNDED"
      );
    }

    const q = (externalSearch || localSearch).trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.customerName.toLowerCase().includes(q) ||
          t.customerEmail.toLowerCase().includes(q) ||
          t.productName.toLowerCase().includes(q)
      );
    }

    return list;
  }, [transactions, activeFilter, externalSearch, localSearch]);

  const columnDefs = useMemo<ColDef<Transaction>[]>(
    () => [
      {
        field: "date",
        headerName: "Timestamp",
        width: 135,
        sortable: true,
        sort: "desc",
        valueFormatter: ({ value }) => {
          try {
            return format(parseISO(value), "MMM d, HH:mm");
          } catch {
            return value;
          }
        },
        cellClass: "text-slate-400 text-xs flex items-center font-medium",
      },
      {
        field: "id",
        headerName: "Order ID",
        width: 145,
        cellClass: "text-slate-400 text-xs font-mono flex items-center",
      },
      {
        field: "customerName",
        headerName: "Customer",
        flex: 1,
        minWidth: 150,
        cellRenderer: ({ data }: ICellRendererParams<Transaction>) => (
          <div className="flex flex-col justify-center h-full">
            <span className="text-xs font-medium text-slate-100 leading-tight">
              {data?.customerName}
            </span>
            <span className="text-[10px] text-slate-500 truncate leading-tight">
              {data?.customerEmail}
            </span>
          </div>
        ),
      },
      {
        field: "productName",
        headerName: "Purchased Product",
        flex: 1,
        minWidth: 160,
        cellClass: "text-slate-300 text-xs flex items-center font-medium",
      },
      {
        field: "amount",
        headerName: "Amount",
        width: 120,
        sortable: true,
        cellRenderer: AmountCellRenderer,
      },
      {
        field: "status",
        headerName: "Payment Status",
        width: 140,
        cellRenderer: StatusDotRenderer,
      },
      {
        field: "paymentMethod",
        headerName: "Rail",
        width: 130,
        cellRenderer: MethodCellRenderer,
      },
    ],
    []
  );

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  }, []);

  const exportCSV = useCallback(() => {
    gridRef.current?.api.exportDataAsCsv({ fileName: "paysight-ledger.csv" });
  }, []);

  const counts = useMemo(
    () => ({
      all: transactions.length,
      completed: transactions.filter((t) => t.status === "COMPLETED").length,
      pending: transactions.filter((t) => t.status === "PENDING").length,
      risk: transactions.filter(
        (t) => t.status === "FAILED" || t.status === "DENIED" || t.status === "REFUNDED"
      ).length,
    }),
    [transactions]
  );

  return (
    <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden flex flex-col shadow-xl backdrop-blur-md">
      {/* Purrweb-Style Segmented Filter Tabs & Action Strip */}
      <div className="p-4 border-b border-slate-800/70 flex flex-wrap items-center justify-between gap-3">
        {/* Segmented control tabs */}
        <div className="inline-flex items-center p-1 bg-slate-800/90 rounded-xl border border-slate-700/60 text-xs">
          <button
            type="button"
            onClick={() => setActiveFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeFilter === "ALL"
                ? "bg-blue-600 text-white shadow-sm font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All <span className="opacity-70 ml-0.5 text-[10px]">({counts.all})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("COMPLETED")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeFilter === "COMPLETED"
                ? "bg-blue-600 text-white shadow-sm font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Completed <span className="opacity-70 ml-0.5 text-[10px]">({counts.completed})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("PENDING")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeFilter === "PENDING"
                ? "bg-blue-600 text-white shadow-sm font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Pending <span className="opacity-70 ml-0.5 text-[10px]">({counts.pending})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("RISK")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeFilter === "RISK"
                ? "bg-rose-600 text-white shadow-sm font-semibold"
                : "text-slate-400 hover:text-rose-400"
            }`}
          >
            Exceptions <span className="opacity-70 ml-0.5 text-[10px]">({counts.risk})</span>
          </button>
        </div>

        {/* Right Search & Export tools */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Filter ledger..."
              className="bg-slate-800/80 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-36 sm:w-48"
            />
          </div>

          <button
            onClick={exportCSV}
            title="Export to CSV"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* AG Grid Table Canvas */}
      <div className="ag-theme-quartz-dark" style={{ height: 420, width: "100%" }}>
        <AgGridReact<Transaction>
          ref={gridRef}
          rowData={loading ? null : filteredData}
          columnDefs={columnDefs}
          defaultColDef={{ resizable: true, suppressMovable: false }}
          onGridReady={onGridReady}
          pagination
          paginationPageSize={10}
          rowSelection="multiple"
          loading={loading}
          overlayLoadingTemplate='<span class="text-slate-400 text-xs">Accessing PayPal transaction stream…</span>'
          overlayNoRowsTemplate='<span class="text-slate-400 text-xs">No records matching active filter</span>'
          animateRows
        />
      </div>
    </div>
  );
}
