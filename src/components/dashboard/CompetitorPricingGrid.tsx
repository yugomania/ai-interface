"use client";

import { useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, ICellRendererParams, RowClickedEvent } from "ag-grid-community";
import { ModuleRegistry, AllCommunityModule, ValidationModule, provideGlobalGridOptions } from "ag-grid-community";
import type { PricingComparison } from "@/types";
import { Radar, TrendingUp, TrendingDown, Minus, Search, Plus, ExternalLink, X, Sparkles } from "lucide-react";

ModuleRegistry.registerModules([AllCommunityModule, ValidationModule]);
provideGlobalGridOptions({ theme: "legacy" });

interface Row {
  productName: string;
  yourPrice: number;
  marketMin: number;
  marketMax: number;
  marketAvg: number;
  position: PricingComparison["pricePosition"];
  competitors: number;
  exactCount: number;
  rawComparison: PricingComparison;
}

function PositionBadge({ value }: ICellRendererParams) {
  const configs: Record<string, { label: string; cls: string; dot: string; icon: React.ComponentType<{ className?: string }> }> = {
    competitive: {
      label: "Competitive",
      cls: "bg-[#ECFDF3] text-[#15803D] border-[#BBF7D0]",
      dot: "bg-[#15803D]",
      icon: Minus,
    },
    low: {
      label: "Underpriced (Opportunity)",
      cls: "bg-[#FFF3EB] text-[#C2410C] border-[#FED7AA] font-semibold",
      dot: "bg-[#C2410C]",
      icon: TrendingDown,
    },
    high: {
      label: "Above Market",
      cls: "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]",
      dot: "bg-[#B91C1C]",
      icon: TrendingUp,
    },
    unknown: {
      label: "Analyzing",
      cls: "bg-[#F7F7F8] text-[#626262] border-[#E5E5E5]",
      dot: "bg-[#626262]",
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
      <span className="font-mono tabular-nums text-[#171717] text-xs font-semibold">
        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)}
      </span>
    </div>
  );
}

interface CompetitorPricingGridProps {
  comparisons: PricingComparison[];
  loading: boolean;
  onAddComparison?: (comparison: PricingComparison) => void;
  onExplainComparison?: () => void;
}

export function CompetitorPricingGrid({
  comparisons,
  loading,
  onAddComparison,
  onExplainComparison,
}: CompetitorPricingGridProps) {
  const [customProduct, setCustomProduct] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [activeDrilldown, setActiveDrilldown] = useState<PricingComparison | null>(null);

  const handleCustomSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customProduct.trim() || !customPrice) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/pricing?product=${encodeURIComponent(customProduct.trim())}&price=${parseFloat(customPrice)}`
      );
      if (res.ok) {
        const data = await res.json();
        onAddComparison?.(data);
        setActiveDrilldown(data);
        setCustomProduct("");
        setCustomPrice("");
      }
    } catch (err) {
      console.error("Custom product comparison error:", err);
    } finally {
      setIsSearching(false);
    }
  };

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
        exactCount: c.exactMatchesCount || c.competitorCount,
        rawComparison: c,
      })),
    [comparisons]
  );

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => [
      {
        field: "productName",
        headerName: "Catalog Item",
        flex: 2,
        minWidth: 180,
        cellClass: "text-[#171717] text-xs flex items-center font-medium",
      },
      {
        field: "yourPrice",
        headerName: "Your Price",
        width: 110,
        sortable: true,
        cellRenderer: PriceCell,
      },
      {
        field: "marketMin",
        headerName: "Market Floor",
        width: 115,
        sortable: true,
        cellRenderer: PriceCell,
      },
      {
        field: "marketAvg",
        headerName: "Benchmark (Avg)",
        width: 135,
        sortable: true,
        cellRenderer: PriceCell,
      },
      {
        field: "marketMax",
        headerName: "Market Ceiling",
        width: 120,
        sortable: true,
        cellRenderer: PriceCell,
      },
      {
        field: "position",
        headerName: "Positioning",
        width: 180,
        cellRenderer: PositionBadge,
      },
      {
        headerName: "Action",
        width: 90,
        cellRenderer: () => (
          <div className="flex items-center h-full">
            <span className="text-xs text-[#C2410C] hover:underline font-medium cursor-pointer">
              View
            </span>
          </div>
        ),
      },
    ],
    []
  );

  const handleRowClicked = (event: RowClickedEvent<Row>) => {
    if (event.data?.rawComparison) {
      setActiveDrilldown(event.data.rawComparison);
    }
  };

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden flex flex-col">
      {/* Header bar */}
      <div className="p-4 border-b border-[#E5E5E5] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#F7F7F8] border border-[#E5E5E5] text-[#171717] flex items-center justify-center">
            <Radar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#171717]">Live Competitor Price Radar</h3>
            <p className="text-xs text-[#626262]">Cross-referencing multi-retailer catalog listings via Channel3</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onExplainComparison && (
            <button
              type="button"
              onClick={onExplainComparison}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#C2410C] bg-[#FFF3EB] hover:bg-[#FFE7D6] border border-[#FED7AA] transition-colors shadow-xs"
              title="Open PaySight Copilot to explain market positioning"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C2410C]" />
              <span>Explain comparison with AI</span>
            </button>
          )}
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#F7F7F8] text-[#171717] border border-[#E5E5E5]">
            Channel3 Intelligence
          </span>
        </div>
      </div>

      {/* Interactive Custom Product Search & Benchmark Input */}
      <form onSubmit={handleCustomSearch} className="p-3 bg-[#F7F7F8] border-b border-[#E5E5E5] flex flex-wrap items-center gap-2 text-xs">
        <div className="flex-1 min-w-[180px] relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#626262]" />
          <input
            type="text"
            required
            value={customProduct}
            onChange={(e) => setCustomProduct(e.target.value)}
            placeholder="Enter product title or SKU (e.g. Sony WH-1000XM5)..."
            className="w-full bg-white border border-[#E5E5E5] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#171717] placeholder:text-[#626262] focus:outline-none focus:ring-2 focus:ring-[#FFF3EB] focus:border-[#C2410C]"
          />
        </div>

        <div className="w-28 relative">
          <span className="absolute left-2.5 top-1.5 text-[#626262] font-mono">$</span>
          <input
            type="number"
            step="0.01"
            required
            value={customPrice}
            onChange={(e) => setCustomPrice(e.target.value)}
            placeholder="Your price"
            className="w-full bg-white border border-[#E5E5E5] rounded-lg pl-6 pr-2 py-1.5 text-xs text-[#171717] font-mono tabular-nums placeholder:text-[#626262] focus:outline-none focus:ring-2 focus:ring-[#FFF3EB] focus:border-[#C2410C]"
          />
        </div>

        <button
          type="submit"
          disabled={isSearching}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#C2410C] hover:bg-[#9A3412] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
        >
          {isSearching ? (
            <span>Scanning...</span>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span>Compare Item</span>
            </>
          )}
        </button>
      </form>

      {/* AG Grid Table Canvas */}
      <div className="ag-theme-quartz" style={{ height: 280, width: "100%" }}>
        <AgGridReact<Row>
          theme="legacy"
          rowData={loading ? null : rowData}
          columnDefs={columnDefs}
          defaultColDef={{ resizable: true }}
          onRowClicked={handleRowClicked}
          loading={loading}
          overlayLoadingTemplate='<span class="text-[#626262] text-xs">Querying Channel3 catalog intelligence…</span>'
          overlayNoRowsTemplate='<span class="text-[#626262] text-xs">No active pricing intelligence feeds</span>'
          animateRows
        />
      </div>

      {/* Honest Limitation / Disclaimer footer */}
      <div className="px-4 py-2 bg-white border-t border-[#E5E5E5] text-[11px] text-[#626262] flex items-center justify-between">
        <span>Benchmarks computed from retrieved comparable listings. Not an exhaustive market census.</span>
        <span className="font-medium text-[#171717]">Click any row to drill down into retailer links</span>
      </div>

      {/* Modal / Drilldown Panel for Selected Product */}
      {activeDrilldown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl bg-white border border-[#E5E5E5] rounded-xl shadow-xl overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-[#E5E5E5] flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-[#171717]">{activeDrilldown.yourProductName}</h4>
                <p className="text-xs text-[#626262]">
                  Your Price: <span className="font-mono tabular-nums font-semibold text-[#171717]">${activeDrilldown.yourPrice.toFixed(2)} USD</span> • Benchmark Avg: <span className="font-mono tabular-nums font-semibold text-[#171717]">${activeDrilldown.marketAvgPrice.toFixed(2)} USD</span>
                </p>
              </div>
              <button
                onClick={() => setActiveDrilldown(null)}
                className="p-1.5 rounded-lg text-[#626262] hover:text-[#171717] hover:bg-[#F7F7F8]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2.5 text-xs">
              <div className="text-[11px] font-semibold text-[#626262] uppercase tracking-wider">
                Retrieved Competitor Listings ({activeDrilldown.competitors.length} items)
              </div>
              {activeDrilldown.competitors.map((c, i) => (
                <div key={i} className="p-3 rounded-lg bg-[#F7F7F8] border border-[#E5E5E5] flex items-center justify-between">
                  <div className="space-y-0.5 max-w-[70%]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-[#171717]">{c.retailer}</span>
                      {c.isExactMatch ? (
                        <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-[#ECFDF3] text-[#15803D] border border-[#BBF7D0]">
                          Exact Match
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-white text-[#626262] border border-[#E5E5E5]">
                          Alternative
                        </span>
                      )}
                    </div>
                    <div className="text-[#626262] truncate">{c.productName}</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono tabular-nums font-bold text-sm text-[#171717]">
                      ${c.price.toFixed(2)} {c.currency}
                    </span>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-[#F7F7F8] border border-[#E5E5E5] rounded text-[11px] text-[#171717] font-medium transition-colors"
                    >
                      <span>Visit</span>
                      <ExternalLink className="w-3 h-3 text-[#626262]" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 bg-[#F7F7F8] border-t border-[#E5E5E5] flex items-center justify-between text-xs text-[#626262]">
              <span>{activeDrilldown.disclaimer || "Retrieved via Channel3 intelligence API."}</span>
              <button
                onClick={() => setActiveDrilldown(null)}
                className="px-3 py-1 bg-white border border-[#E5E5E5] rounded-lg text-xs font-semibold text-[#171717] hover:bg-[#F7F7F8]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
