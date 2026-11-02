"use client";
import { useState, type ReactNode } from "react";
import { Table, BarChart3, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  description?: string;
  filterSlot?: ReactNode;
  children: ReactNode;
  tableData?: {
    columns: string[];
    rows: (string | number)[][];
  };
  isLoading?: boolean;
  isEmpty?: boolean;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
}

export function ChartCard({
  title,
  subtitle,
  description,
  filterSlot,
  children,
  tableData,
  isLoading = false,
  isEmpty = false,
  error = null,
  onRetry,
  className,
}: ChartCardProps) {
  const [showTable, setShowTable] = useState(false);

  return (
    <section
      aria-label={description || title}
      className={cn("rounded-lg border bg-card shadow-xs flex flex-col justify-between overflow-hidden", className)}
    >
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 bg-card">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {filterSlot}
          {tableData && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowTable(!showTable)}
              aria-label={showTable ? "Switch to chart view" : "View as accessible table"}
              title={showTable ? "Show chart" : "View as table"}
            >
              {showTable ? (
                <>
                  <BarChart3 className="mr-1 size-3.5" /> Chart
                </>
              ) : (
                <>
                  <Table className="mr-1 size-3.5" /> Table
                </>
              )}
            </Button>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 p-4 relative min-h-[220px]">
        {isLoading ? (
          <div className="space-y-3 py-6">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-44 w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
            <AlertCircle className="size-8 text-destructive" />
            <p className="text-sm font-medium text-destructive">{error}</p>
            {onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry}>
                <RefreshCw className="mr-1.5 size-3.5" /> Retry
              </Button>
            )}
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <p className="text-sm font-medium">No records for this selection</p>
            <p className="text-xs text-muted-foreground mt-1">Try expanding the date range or removing filters.</p>
          </div>
        ) : showTable && tableData ? (
          <div className="overflow-x-auto max-h-[300px]">
            <table className="w-full text-xs">
              <caption className="sr-only">{title} data table</caption>
              <thead>
                <tr className="border-b bg-muted/30">
                  {tableData.columns.map((col, idx) => (
                    <th key={idx} className="px-3 py-2 text-left font-medium text-muted-foreground">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {tableData.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-muted/20">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-1.5 tabular text-foreground">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
