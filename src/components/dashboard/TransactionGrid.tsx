"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, GridReadyEvent, ICellRendererParams } from "ag-grid-community";
import { ModuleRegistry, AllCommunityModule, ValidationModule, provideGlobalGridOptions } from "ag-grid-community";
import type { Transaction } from "@/types";
import { format, parseISO } from "date-fns";
import { Download, Search, Sparkles } from "lucide-react";

ModuleRegistry.registerModules([AllCommunityModule, ValidationModule]);
provideGlobalGridOptions({ theme: "legacy" });

// ─── Semantic Status Badges (Color + Text + Dot) ───────────────────────────

function StatusDotRenderer({ value }: ICellRendererParams) {
  const config: Record<string, { label: string; dot: string; badge: string }> = {
    COMPLETED: {
      label: "Completed",
      dot: "bg-[#15803D]",
      badge: "bg-[#ECFDF3] text-[#15803D] border-[#BBF7D0]",
    },
    PENDING: {
      label: "Pending",
      dot: "bg-[#B45309]",
      badge: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]",
    },
    FAILED: {
      label: "Failed",
      dot: "bg-[#B91C1C]",
      badge: "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]",
    },
    REFUNDED: {
      label: "Refunded",
      dot: "bg-[#626262]",
      badge: "bg-[#F7F7F8] text-[#171717] border-[#E5E5E5]",
    },
    DENIED: {
      label: "Denied",
      dot: "bg-[#B91C1C]",
      badge: "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]",
    },
  };

  const current = config[value as string] ?? {
    label: value || "Unknown",
    dot: "bg-[#626262]",
    badge: "bg-[#F7F7F8] text-[#171717] border-[#E5E5E5]",
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
      <span className="font-mono tabular-nums font-semibold text-[#171717] text-xs">
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
    <div className="flex items-center gap-1.5 h-full text-xs text-[#626262]">
      <span>{item.icon}</span>
      <span className="font-medium text-[#171717]">{item.label}</span>
    </div>
  );
}

interface TransactionGridProps {
  transactions: Transaction[];
  loading: boolean;
  externalSearch?: string;
  onSummarizeTransactions?: () => void;
}

type FilterTab = "ALL" | "COMPLETED" | "PENDING" | "RISK";

export function TransactionGrid({
  transactions,
  loading,
  externalSearch = "",
  onSummarizeTransactions,
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
        width: 140,
        sortable: true,
        sort: "desc",
        valueFormatter: ({ value }) => {
          try {
            return format(parseISO(value), "MMM d, HH:mm");
          } catch {
            return value;
          }
        },
        cellClass: "text-[#626262] text-xs flex items-center font-medium",
      },
      {
        field: "id",
        headerName: "Order ID",
        width: 145,
        cellClass: "text-[#171717] text-xs font-mono flex items-center",
      },
      {
        field: "customerName",
        headerName: "Customer",
        flex: 1,
        minWidth: 160,
        cellRenderer: ({ data }: ICellRendererParams<Transaction>) => (
          <div className="flex flex-col justify-center h-full">
            <span className="text-xs font-semibold text-[#171717] leading-tight">
              {data?.customerName}
            </span>
            <span className="text-[11px] text-[#626262] truncate leading-tight">
              {data?.customerEmail}
            </span>
          </div>
        ),
      },
      {
        field: "productName",
        headerName: "Purchased Product",
        flex: 1,
        minWidth: 170,
        cellClass: "text-[#171717] text-xs flex items-center font-medium",
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
    <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden flex flex-col">
      {/* Filter Tabs & Action Strip */}
      <div className="p-4 border-b border-[#E5E5E5] flex flex-wrap items-center justify-between gap-3">
        {/* Segmented control tabs */}
        <div className="inline-flex items-center p-1 bg-[#F7F7F8] rounded-lg border border-[#E5E5E5] text-xs">
          <button
            type="button"
            onClick={() => setActiveFilter("ALL")}
            className={`px-3 py-1.5 rounded font-medium transition-colors ${
              activeFilter === "ALL"
                ? "bg-white text-[#171717] border border-[#E5E5E5] shadow-xs font-semibold"
                : "text-[#626262] hover:text-[#171717]"
            }`}
          >
            All <span className="opacity-70 ml-0.5 text-[10px]">({counts.all})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("COMPLETED")}
            className={`px-3 py-1.5 rounded font-medium transition-colors ${
              activeFilter === "COMPLETED"
                ? "bg-white text-[#171717] border border-[#E5E5E5] shadow-xs font-semibold"
                : "text-[#626262] hover:text-[#171717]"
            }`}
          >
            Completed <span className="opacity-70 ml-0.5 text-[10px]">({counts.completed})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("PENDING")}
            className={`px-3 py-1.5 rounded font-medium transition-colors ${
              activeFilter === "PENDING"
                ? "bg-white text-[#171717] border border-[#E5E5E5] shadow-xs font-semibold"
                : "text-[#626262] hover:text-[#171717]"
            }`}
          >
            Pending <span className="opacity-70 ml-0.5 text-[10px]">({counts.pending})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("RISK")}
            className={`px-3 py-1.5 rounded font-medium transition-colors ${
              activeFilter === "RISK"
                ? "bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] shadow-xs font-semibold"
                : "text-[#626262] hover:text-[#B91C1C]"
            }`}
          >
            Exceptions <span className="opacity-70 ml-0.5 text-[10px]">({counts.risk})</span>
          </button>
        </div>

        {/* Right Search & Export tools */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#626262]" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Filter ledger..."
              className="bg-white border border-[#E5E5E5] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#171717] placeholder:text-[#626262] focus:outline-none focus:ring-2 focus:ring-[#FFF3EB] focus:border-[#C2410C] w-36 sm:w-48"
            />
          </div>

          {onSummarizeTransactions && (
            <button
              type="button"
              onClick={onSummarizeTransactions}
              title="Summarise transactions with PaySight Copilot"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFF3EB] hover:bg-[#FFE7D6] text-[#C2410C] border border-[#FED7AA] text-xs font-semibold shadow-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C2410C]" />
              <span className="hidden sm:inline">Summarise with AI</span>
            </button>
          )}

          <button
            onClick={exportCSV}
            title="Export to CSV"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#F7F7F8] text-[#171717] border border-[#E5E5E5] text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* AG Grid Table Canvas */}
      <div className="ag-theme-quartz" style={{ height: 420, width: "100%" }}>
        <AgGridReact<Transaction>
          theme="legacy"
          ref={gridRef}
          rowData={loading ? null : filteredData}
          columnDefs={columnDefs}
          defaultColDef={{ resizable: true, suppressMovable: false }}
          onGridReady={onGridReady}
          pagination
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 20, 50, 100]}
          loading={loading}
          overlayLoadingTemplate='<span class="text-[#626262] text-xs">Accessing PayPal transaction stream…</span>'
          overlayNoRowsTemplate='<span class="text-[#626262] text-xs">No records matching active filter</span>'
          animateRows
        />
      </div>
    </div>
  );
}

