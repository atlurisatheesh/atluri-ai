"use client";

import { motion } from "framer-motion";
import {
  Target, AlertTriangle, CheckCircle, Search, ArrowUpDown,
} from "lucide-react";
import { GlassCard, StatusBadge } from "@/components/ui";
import type { AriaKeywordMatrix } from "@/lib/services";
import { useState, useMemo } from "react";

type SortKey = "keyword" | "tier" | "frequency" | "status";

interface Props {
  data: AriaKeywordMatrix;
}

export default function AriaKeywordPanel({ data }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("tier");
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = useMemo(() => {
    const arr = [...data.matrix];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "keyword") cmp = a.keyword.localeCompare(b.keyword);
      else if (sortKey === "tier") cmp = a.tier - b.tier;
      else if (sortKey === "frequency") cmp = a.frequency - b.frequency;
      else cmp = a.status.localeCompare(b.status);
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  }, [data.matrix, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const statusColor = (s: string) =>
    s === "found" ? "text-brand-green" : s === "partial" ? "text-brand-amber" : "text-brand-red";
  const statusIcon = (s: string) =>
    s === "found" ? <CheckCircle className="w-3 h-3" /> :
    s === "partial" ? <AlertTriangle className="w-3 h-3" /> :
    <Search className="w-3 h-3" />;

  return (
    <GlassCard className="p-5" hover={false}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-textPrimary flex items-center gap-2">
          <Target className="w-4 h-4 text-brand-cyan" /> Keyword Intelligence Matrix
        </h3>
        <div className="flex items-center gap-3">
          <StatusBadge variant={data.overall_match_pct >= 70 ? "green" : data.overall_match_pct >= 50 ? "amber" : "red"}>
            {data.overall_match_pct}% Match
          </StatusBadge>
        </div>
      </div>

      {/* Missing critical */}
      {data.missing_critical.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-brand-red/5 border border-brand-red/10">
          <p className="text-[10px] text-brand-red font-semibold mb-1.5">Missing Critical Keywords</p>
          <div className="flex flex-wrap gap-1.5">
            {data.missing_critical.map((kw) => (
              <span key={kw} className="px-2 py-0.5 rounded-full text-[10px] bg-brand-red/15 text-brand-red border border-brand-red/20 font-medium">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {(["keyword", "tier", "frequency", "status"] as SortKey[]).map((col) => (
                <th
                  key={col}
                  className="text-left text-textMuted font-medium py-2 px-2 cursor-pointer hover:text-textPrimary transition uppercase tracking-wider"
                  onClick={() => toggleSort(col)}
                >
                  <span className="flex items-center gap-1 select-none">
                    {col}
                    {sortKey === col && <ArrowUpDown className="w-3 h-3 text-brand-cyan" />}
                  </span>
                </th>
              ))}
              <th className="text-left text-textMuted font-medium py-2 px-2 uppercase tracking-wider">Locations</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <motion.tr
                key={row.keyword}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className="border-b border-white/[0.03] hover:bg-white/[0.02]"
              >
                <td className="py-2 px-2 font-medium text-textPrimary">{row.keyword}</td>
                <td className="py-2 px-2">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                    row.tier === 1 ? "bg-brand-red/15 text-brand-red" :
                    row.tier === 2 ? "bg-brand-amber/15 text-brand-amber" :
                    "bg-white/[0.06] text-textMuted"
                  }`}>
                    T{row.tier}
                  </span>
                </td>
                <td className="py-2 px-2 tabular-nums text-textMuted">{row.frequency}×</td>
                <td className="py-2 px-2">
                  <span className={`flex items-center gap-1 ${statusColor(row.status)}`}>
                    {statusIcon(row.status)} {row.status}
                  </span>
                </td>
                <td className="py-2 px-2">
                  <div className="flex flex-wrap gap-1">
                    {row.locations.map((loc) => (
                      <span key={loc} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-textMuted">{loc}</span>
                    ))}
                    {row.locations.length === 0 && <span className="text-[9px] text-brand-red">—</span>}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Suggestions */}
      {data.suggestions.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-brand-cyan/5 border border-brand-cyan/10">
          <p className="text-[10px] text-brand-cyan font-semibold mb-1.5">Optimization Suggestions</p>
          <ul className="space-y-1">
            {data.suggestions.map((s, i) => (
              <li key={i} className="text-xs text-textMuted flex items-start gap-1.5">
                <span className="text-brand-cyan mt-0.5">•</span> {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </GlassCard>
  );
}
