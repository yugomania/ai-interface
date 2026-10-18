"use client";

import { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import type { PricingComparison } from "@/types";
import { Radar, ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react";

ModuleRegistry.registerModules([AllCommunityModule]);

interface Row {
  productName: string;
  yourPrice: number;
  marketMin: number;
  marketMax: number;
  marketAvg: number;
  position: PricingComparison["pricePosition"];
  competitors: number;
}

function PositionBadge({ value }: ICellRendererParams) {
  const configs: Record<string, { label: string; cls: string; dot: string; icon: any }> = {
    competitive: {
      label: "Competitive",
      cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      dot: "bg-emerald-400",
      icon: Minus,
    },
    low: {
      label: "Underpriced (Opportunity)",
      cls: "bg-blue-500/10 text-cyan-300 border-blue-500/20 font-semibold",
      dot: "bg-cyan-400 animate-pulse",
      icon: TrendingDown,
    },
    high: {
      label: "Above Market",
      cls: "bg-rose-500/10 text-rose-300 border-rose-500/20",
      dot: "bg-rose-400",
      icon: TrendingUp,
    },
    unknown: {
      label: "Analyzing",
      cls: "bg-slate-700/40 text-slate-400 border-slate-600/30",
      dot: "bg-slate-400",
      icon: Minus,
    },
  };

  const current = configs[value as string] ?? configs.unknown;

  return (
    <div className="flex items-center h-full">
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${current.cls}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
        <span>{current.label}</span>
      </span>
    </div>
  );
}

function PriceCell({ value }: ICellRendererParams) {
  return (
    <div className="flex items-center h-full">
      <span className="font-mono text-slate-200 text-xs font-semibold">
        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)}
      </span>
    </div>
  );
}

interface CompetitorPricingGridProps {
  comparisons: PricingComparison[];
  loading: boolean;
}

export function CompetitorPricingGrid({ comparisons, loading }: CompetitorPricingGridProps) {
  const rowData = useMemo<Row[]>(
    () =>
      comparisons.map((c) => ({
        productName: c.yourProductName,
        yourPrice: c.yourPrice,
        marketMin: c.marketMinPrice,
        marketMax: c.marketMaxPrice,
        marketAvg: c.marketAvgPrice,
        position: c.pricePosition,
        competitors: c.competitorCount,
      })),
    [comparisons]
  );

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => [
      {
        field: "productName",
        headerName: "Inventory SKU / Item",
        flex: 2,
        minWidth: 180,
        cellClass: "text-slate-100 text-xs font-medium flex items-center",
      },
      {
        field: "yourPrice",
        headerName: "Your Price",
        width: 120,
        cellRenderer: PriceCell,
      },
      {
        field: "marketMin",
        headerName: "Market Min",
        width: 110,
        cellRenderer: PriceCell,
      },
      {
        field: "marketAvg",
        headerName: "Market Benchmark",
        width: 140,
        cellRenderer: PriceCell,
      },
      {
        field: "marketMax",
        headerName: "Market Max",
        width: 110,
        cellRenderer: PriceCell,
      },
      {
        field: "competitors",
        headerName: "Retailers Mapped",
        width: 140,
        cellRenderer: ({ value }: ICellRendererParams) => (
          <div className="flex items-center h-full text-xs text-slate-400 font-medium">
            <span>{value} stores (Amazon, Walmart, BestBuy)</span>
          </div>
        ),
      },
      {
        field: "position",
        headerName: "Price Positioning",
        width: 190,
        cellRenderer: PositionBadge,
      },
    ],
    []
  );

  return (
    <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden flex flex-col shadow-xl backdrop-blur-md">
      {/* Purrweb Header Bar */}
      <div className="px-5 py-4 border-b border-slate-800/70 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <Radar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">Channel3 Market Price Radar</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.2 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                100M+ Catalog
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live multi-retailer price scanning across 25,000+ merchants
            </p>
          </div>
        </div>
      </div>

      {/* Grid Canvas */}
      <div className="ag-theme-quartz-dark" style={{ height: 320, width: "100%" }}>
        <AgGridReact<Row>
          rowData={loading ? null : rowData}
          columnDefs={columnDefs}
          defaultColDef={{ resizable: true }}
          loading={loading}
          overlayLoadingTemplate='<span class="text-slate-400 text-xs">Querying Channel3 product graph…</span>'
        />
      </div>
    </div>
  );
}
