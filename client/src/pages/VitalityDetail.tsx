import React, { useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Package,
  TrendingUp,
  DollarSign,
  BarChart3,
  Layers,
  Activity,
  AlertTriangle,
  Eye,
  EyeOff,
  Minus,
  Plus,
  RotateCcw,
  FileDown,
} from "lucide-react";
import type { AdjustmentPlanData, AdjustmentItem } from "./AdjustmentPlan";

// ─────────────────────────────────────────────
// 数字格式化
// ─────────────────────────────────────────────
function fmtAmount(val: string | number | null | undefined): string {
  if (val == null || val === "") return "—";
  const n = Number(val);
  if (isNaN(n)) return "—";
  if (Math.abs(n) >= 10000) return (n / 10000).toFixed(1) + "万";
  return n.toLocaleString("zh-CN", { maximumFractionDigits: 0 });
}

function fmtQty(val: number | null | undefined): string {
  if (val == null) return "—";
  return Number(val).toLocaleString("zh-CN");
}

// ─────────────────────────────────────────────
// 效率评级
// ─────────────────────────────────────────────
type EfficiencyRating = "high" | "normal" | "low" | "zero";

function getRating(salesAmount: number, facings: number, avgEff: number): EfficiencyRating {
  if (!facings || facings === 0) return "zero";
  if (salesAmount === 0) return "zero";
  const eff = salesAmount / facings;
  if (eff >= avgEff * 1.5) return "high";
  if (eff >= avgEff * 0.5) return "normal";
  return "low";
}

const ratingConfig: Record<EfficiencyRating, {
  label: string;
  bg: string;
  border: string;
  text: string;
  tagBg: string;
  tagColor: string;
}> = {
  high:   { label: "高效", bg: "#f0fdf4", border: "#16a34a", text: "#15803d", tagBg: "#dcfce7", tagColor: "#15803d" },
  normal: { label: "正常", bg: "#f8fafc", border: "#94a3b8", text: "#374151", tagBg: "#f1f5f9", tagColor: "#475569" },
  low:    { label: "低效", bg: "#fffbeb", border: "#f59e0b", text: "#92400e", tagBg: "#fef3c7", tagColor: "#92400e" },
  zero:   { label: "0动销", bg: "#fef2f2", border: "#ef4444", text: "#991b1b", tagBg: "#fee2e2", tagColor: "#991b1b" },
};

// ─────────────────────────────────────────────
// 类型
// ─────────────────────────────────────────────
interface ProductItem {
  id: number;
  productCode: string | null;
  productName: string | null;
  shelfLevel: number | null;
  positionCode: string | null;
  facingCount: number | null;
  displayLevel: number | null;
  stackCount: number | null;
  salesQty: number | null;
  salesAmount: string | null;
  grossProfit: string | null;
  category1: string | null;
  category2: string | null;
  category3: string | null;
}

// ─────────────────────────────────────────────
// 商品方块（效率色阶版）
// ─────────────────────────────────────────────
interface ProductCellProps {
  item: ProductItem;
  rating: EfficiencyRating;
  unitWidth: number;
  unitHeight: number;
  isHighlighted: boolean;
  isDimmed: boolean;
  adjustedFacing?: number;
  onClick: () => void;
}

function ProductCell({
  item,
  rating,
  unitWidth,
  unitHeight,
  isHighlighted,
  isDimmed,
  adjustedFacing,
  onClick,
}: ProductCellProps) {
  const facing = adjustedFacing ?? Math.max(1, item.facingCount ?? 1);
  const width = facing * unitWidth;
  const rc = ratingConfig[rating];
  const salesAmountNum = Number(item.salesAmount ?? 0);
  const grossProfitNum = Number(item.grossProfit ?? 0);

  return (
    <div
      onClick={onClick}
      title={`${item.productName ?? ""} (${item.productCode ?? ""})
陈列面数: ${item.facingCount ?? 1}${adjustedFacing !== undefined ? ` → 建议: ${adjustedFacing}` : ""}
销售数量: ${item.salesQty ?? "—"}
销售金额: ¥${fmtAmount(salesAmountNum)}
销售毛利: ¥${fmtAmount(grossProfitNum)}
效率评级: ${rc.label}`}
      style={{
        width,
        height: unitHeight,
        minWidth: width,
        background: isDimmed ? "#f8fafc" : rc.bg,
        border: `2px solid ${isHighlighted ? "#6366f1" : isDimmed ? "#e2e8f0" : rc.border}`,
        borderRadius: 6,
        padding: "4px 5px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: isHighlighted
          ? "0 0 0 3px rgba(99,102,241,0.3), 0 2px 8px rgba(0,0,0,0.1)"
          : "0 1px 4px rgba(0,0,0,0.06)",
        flexShrink: 0,
        overflow: "hidden",
        cursor: "pointer",
        opacity: isDimmed ? 0.35 : 1,
        transition: "all 0.15s ease",
        position: "relative",
      }}
    >
      {/* 效率评级角标 */}
      <div
        style={{
          position: "absolute",
          top: 2,
          right: 3,
          fontSize: 8,
          fontWeight: 700,
          color: isDimmed ? "#9ca3af" : rc.tagColor,
          lineHeight: 1,
          background: isDimmed ? "transparent" : rc.tagBg,
          borderRadius: 3,
          padding: "1px 3px",
        }}
      >
        {rc.label}
      </div>

      {/* 商品名称 */}
      <div
        style={{
          fontSize: Math.min(11, Math.max(9, width / 8)),
          fontWeight: 600,
          color: isDimmed ? "#9ca3af" : rc.text,
          lineHeight: 1.2,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: facing >= 2 ? 2 : 1,
          WebkitBoxOrient: "vertical" as const,
          wordBreak: "break-all",
          paddingRight: 20,
        }}
      >
        {item.productName ?? item.productCode ?? "—"}
      </div>

      {/* 数据区 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <div style={{ fontSize: 9, color: isDimmed ? "#9ca3af" : "#6b7280" }}>
          面: <span style={{ color: isDimmed ? "#9ca3af" : "#6366f1", fontWeight: 700 }}>
            {adjustedFacing !== undefined && adjustedFacing !== (item.facingCount ?? 1)
              ? <><s style={{ color: "#9ca3af" }}>{item.facingCount ?? 1}</s>→{adjustedFacing}</>
              : facing}
          </span>
        </div>
        <div style={{ fontSize: 9, color: isDimmed ? "#9ca3af" : "#6b7280" }}>
          量: <span style={{ fontWeight: 700 }}>{fmtQty(item.salesQty)}</span>
        </div>
        <div style={{ fontSize: 9, color: isDimmed ? "#9ca3af" : "#6b7280" }}>
          额: <span style={{ fontWeight: 700 }}>¥{fmtAmount(salesAmountNum)}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 商品效率排行榜行
// ─────────────────────────────────────────────
interface RankRowProps {
  item: ProductItem;
  rating: EfficiencyRating;
  efficiency: number;
  avgEff: number;
  isHighlighted: boolean;
  adjustedFacing: number;
  onHighlight: () => void;
  onAdjust: (delta: number) => void;
  onReset: () => void;
  suggestedAction: string;
}

function RankRow({
  item,
  rating,
  efficiency,
  avgEff,
  isHighlighted,
  adjustedFacing,
  onHighlight,
  onAdjust,
  onReset,
  suggestedAction,
}: RankRowProps) {
  const rc = ratingConfig[rating];
  const originalFacing = item.facingCount ?? 1;
  const isModified = adjustedFacing !== originalFacing;
  const effVsAvg = avgEff > 0 ? ((efficiency - avgEff) / avgEff) * 100 : 0;

  return (
    <div
      className="flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all cursor-pointer"
      onClick={onHighlight}
      style={{
        background: isHighlighted ? "#eef2ff" : "transparent",
        border: isHighlighted ? "1.5px solid #c7d2fe" : "1.5px solid transparent",
      }}
    >
      {/* 评级标签 */}
      <span
        className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
        style={{ background: rc.tagBg, color: rc.tagColor, minWidth: 44, textAlign: "center" }}
      >
        {rc.label}
      </span>

      {/* 商品信息 */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 truncate">
          {item.productName ?? item.productCode ?? "—"}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400">
            {efficiency > 0 ? `¥${efficiency.toFixed(0)}/面` : "无销售"}
          </span>
          {avgEff > 0 && efficiency > 0 && (
            <span
              className="text-xs font-medium"
              style={{ color: effVsAvg >= 0 ? "#059669" : "#dc2626" }}
            >
              {effVsAvg >= 0 ? "+" : ""}{effVsAvg.toFixed(0)}%
            </span>
          )}
        </div>
      </div>

      {/* 排面调整控件 */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onAdjust(-1); }}
          disabled={adjustedFacing <= 0}
          className="w-6 h-6 rounded-md flex items-center justify-center transition-all disabled:opacity-30"
          style={{ background: "#fef2f2", color: "#dc2626" }}
        >
          <Minus size={11} />
        </button>
        <span
          className="text-xs font-bold w-6 text-center"
          style={{ color: isModified ? "#6366f1" : "#374151" }}
        >
          {adjustedFacing}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onAdjust(1); }}
          className="w-6 h-6 rounded-md flex items-center justify-center transition-all"
          style={{ background: "#f0fdf4", color: "#059669" }}
        >
          <Plus size={11} />
        </button>
        {isModified && (
          <button
            onClick={(e) => { e.stopPropagation(); onReset(); }}
            className="w-6 h-6 rounded-md flex items-center justify-center transition-all ml-0.5"
            style={{ background: "#f5f7ff", color: "#6366f1" }}
            title="重置"
          >
            <RotateCcw size={10} />
          </button>
        )}
      </div>

      {/* 建议动作 */}
      <span
        className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
        style={{
          background: suggestedAction === "撤架" ? "#fee2e2"
            : suggestedAction === "增面" ? "#dcfce7"
            : suggestedAction === "减面" ? "#fef3c7"
            : "#f1f5f9",
          color: suggestedAction === "撤架" ? "#991b1b"
            : suggestedAction === "增面" ? "#15803d"
            : suggestedAction === "减面" ? "#92400e"
            : "#475569",
        }}
      >
        {suggestedAction}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// 主页面：货架生命力透视（第二层）
// ─────────────────────────────────────────────
export default function VitalityDetail() {
  const params = useParams<{ shelfCode: string }>();
  const shelfCode = decodeURIComponent(params.shelfCode ?? "");
  const [, setLocation] = useLocation();

  // 筛选开关
  const [filterMode, setFilterMode] = useState<"all" | "zero" | "low">("all");
  // 高亮商品 id
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  // 排面调整 map: productId -> adjustedFacing
  const [facingAdjustments, setFacingAdjustments] = useState<Record<number, number>>({});

  // 获取最新 sessionId
  const { data: sessionData } = trpc.shelf.latestSession.useQuery();
  const sessionId = sessionData?.sessionId ?? null;

  // 获取单货架商品效率数据
  const { data: items = [], isLoading } = trpc.shelf.shelfProductEfficiency.useQuery(
    { sessionId: sessionId!, shelfCode },
    { enabled: sessionId != null && shelfCode !== "" }
  );

  // ── 计算平均排面效率 ──
  const avgEff = useMemo(() => {
    if (!items.length) return 0;
    const totalFacings = items.reduce((s, i) => s + (i.facingCount ?? 1), 0);
    const totalSales = items.reduce((s, i) => s + Number(i.salesAmount ?? 0), 0);
    return totalFacings > 0 ? totalSales / totalFacings : 0;
  }, [items]);

  // ── 每个商品的效率评级 ──
  const itemsWithRating = useMemo(() => {
    return items.map(item => {
      const sales = Number(item.salesAmount ?? 0);
      const facings = item.facingCount ?? 1;
      const eff = facings > 0 ? sales / facings : 0;
      const rating = getRating(sales, facings, avgEff);
      // 建议动作
      let suggestedAction = "维持";
      if (rating === "zero") suggestedAction = "撤架";
      else if (rating === "high") suggestedAction = "增面";
      else if (rating === "low") suggestedAction = "减面";
      return { ...item, rating, eff, suggestedAction };
    });
  }, [items, avgEff]);

  // ── 排行榜：按效率从低到高排序 ──
  const rankedItems = useMemo(() => {
    return [...itemsWithRating].sort((a, b) => a.eff - b.eff);
  }, [itemsWithRating]);

  // ── 汇总统计 ──
  const summary = useMemo(() => {
    const totalFacings = items.reduce((s, i) => s + (i.facingCount ?? 1), 0);
    const totalSales = items.reduce((s, i) => s + Number(i.salesAmount ?? 0), 0);
    const totalQty = items.reduce((s, i) => s + (i.salesQty ?? 0), 0);
    const totalProfit = items.reduce((s, i) => s + Number(i.grossProfit ?? 0), 0);
    const productCount = new Set(items.map(i => i.productCode).filter(Boolean)).size;
    const zeroCount = items.filter(i => !i.salesQty || i.salesQty === 0).length;
    const zeroFacings = items.filter(i => !i.salesQty || i.salesQty === 0).reduce((s, i) => s + (i.facingCount ?? 1), 0);
    const validFacings = totalFacings - zeroFacings;
    const validRate = totalFacings > 0 ? (validFacings / totalFacings) * 100 : 0;
    return { totalFacings, totalSales, totalQty, totalProfit, productCount, zeroCount, zeroFacings, validRate };
  }, [items]);

  // ── 预估调整后销售额 ──
  const adjustedSalesEstimate = useMemo(() => {
    if (Object.keys(facingAdjustments).length === 0) return null;
    let estimate = 0;
    for (const item of itemsWithRating) {
      const adjFacing = facingAdjustments[item.id] ?? (item.facingCount ?? 1);
      const eff = item.facingCount && item.facingCount > 0 ? Number(item.salesAmount ?? 0) / item.facingCount : 0;
      estimate += eff * adjFacing;
    }
    return estimate;
  }, [facingAdjustments, itemsWithRating]);

  // ── 按层分组 ──
  const levelGroups = useMemo(() => {
    const map = new Map<number, typeof itemsWithRating>();
    for (const item of itemsWithRating) {
      const lvl = item.shelfLevel ?? 1;
      if (!map.has(lvl)) map.set(lvl, []);
      map.get(lvl)!.push(item);
    }
    Array.from(map.values()).forEach(arr => {
      arr.sort((a, b) => Number(a.positionCode ?? 0) - Number(b.positionCode ?? 0));
    });
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [itemsWithRating]);

  // ── 最大层排面数 ──
  const maxLevelFacings = useMemo(() => {
    if (!levelGroups.length) return 0;
    return Math.max(
      ...levelGroups.map(([, levelItems]) =>
        levelItems.reduce((sum, item) => {
          const adj = facingAdjustments[item.id] ?? Math.max(1, item.facingCount ?? 1);
          return sum + adj;
        }, 0)
      )
    );
  }, [levelGroups, facingAdjustments]);

  const UNIT_W = 96;
  const UNIT_H = 110;
  const GAP = 4;

  // ── 筛选逻辑 ──
  const filteredIds = useMemo(() => {
    if (filterMode === "all") return null;
    return new Set(
      itemsWithRating
        .filter(i => filterMode === "zero" ? i.rating === "zero" : i.rating === "low" || i.rating === "zero")
        .map(i => i.id)
    );
  }, [filterMode, itemsWithRating]);

  const handleAdjust = (id: number, originalFacing: number, delta: number) => {
    setFacingAdjustments(prev => {
      const current = prev[id] ?? originalFacing;
      const next = Math.max(0, current + delta);
      if (next === originalFacing) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: next };
    });
  };

  const handleReset = (id: number) => {
    setFacingAdjustments(prev => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  };

  const hasAdjustments = Object.keys(facingAdjustments).length > 0;

  // 生成调整方案并跳转
  const handleGeneratePlan = () => {
    const planItems: AdjustmentItem[] = itemsWithRating.map(item => {
      const originalFacing = item.facingCount ?? 1;
      const adjustedFacing = facingAdjustments[item.id] ?? originalFacing;
      const efficiency = originalFacing > 0 ? Number(item.salesAmount ?? 0) / originalFacing : 0;
      let priority: "高" | "中" | "低" = "低";
      if (item.rating === "zero" || (item.rating === "low" && efficiency < avgEff * 0.3)) priority = "高";
      else if (item.rating === "low") priority = "中";
      return {
        shelfCode,
        shelfLevel: item.shelfLevel ?? 1,
        positionCode: item.positionCode ?? "",
        productCode: item.productCode ?? "",
        productName: item.productName ?? "",
        category1: item.category1 ?? "",
        category2: item.category2 ?? "",
        category3: item.category3 ?? "",
        originalFacing,
        adjustedFacing,
        salesAmount: Number(item.salesAmount ?? 0),
        grossProfit: Number(item.grossProfit ?? 0),
        salesQty: item.salesQty ?? 0,
        efficiency,
        rating: item.rating,
        suggestedAction: item.suggestedAction as AdjustmentItem["suggestedAction"],
        priority,
      };
    });

    const planData: AdjustmentPlanData = {
      sessionId: sessionId ?? 0,
      mode: "category",
      category: planItems[0]?.category1 || undefined,
      items: planItems,
    };

    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(planData))));
    window.open(`/adjustment-plan?data=${encoded}`, "_blank");
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(135deg, #f0f4ff 0%, #fafafa 100%)", padding: "24px" }}
    >
      {/* ── 顶部导航 ── */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => setLocation("/grid")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all"
          style={{
            background: "white",
            border: "1px solid #e5e7eb",
            color: "#374151",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <ArrowLeft size={16} />
          返回效率总览
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            货架生命力透视 — <span style={{ color: "oklch(0.65 0.15 185)" }}>{shelfCode}</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">效率色阶 · 排面调整模拟 · 商品诊断</p>
        </div>
      </div>

      {/* ── 顶部健康指标条 ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: "总排面数", value: fmtQty(summary.totalFacings), icon: <Layers size={16} />, color: "#4f46e5", bg: "#eef2ff" },
          { label: "有效排面率", value: `${summary.validRate.toFixed(0)}%`, icon: <Activity size={16} />, color: "#059669", bg: "#ecfdf5" },
          { label: "平均排面效率", value: `¥${avgEff.toFixed(0)}/面`, icon: <TrendingUp size={16} />, color: "#0891b2", bg: "#ecfeff" },
          { label: "0动销商品", value: `${summary.zeroCount} 个`, icon: <AlertTriangle size={16} />, color: "#dc2626", bg: "#fef2f2" },
          { label: "浪费排面", value: `${summary.zeroFacings} 个`, icon: <Package size={16} />, color: "#d97706", bg: "#fffbeb" },
        ].map(card => (
          <div
            key={card.label}
            className="rounded-xl p-3 flex items-center gap-3"
            style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", borderLeft: `3px solid ${card.color}` }}
          >
            <div className="rounded-lg p-2 flex-shrink-0" style={{ background: card.bg, color: card.color }}>
              {card.icon}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400 truncate">{card.label}</p>
              <p className="text-base font-bold text-gray-800">{isLoading ? "…" : card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── 主体：棚格图 + 排行榜 ── */}
      <div className="flex gap-6 items-start">

        {/* 左侧：棚格图 */}
        <div className="flex-1 min-w-0">
          {/* 图例 + 筛选开关 */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap gap-3">
              {(["high", "normal", "low", "zero"] as EfficiencyRating[]).map(r => (
                <div key={r} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: ratingConfig[r].bg, border: `2px solid ${ratingConfig[r].border}` }} />
                  <span>{ratingConfig[r].label}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterMode("all")}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1"
                style={{
                  background: filterMode === "all" ? "#6366f1" : "#f5f7ff",
                  color: filterMode === "all" ? "white" : "#374151",
                  border: filterMode === "all" ? "none" : "1.5px solid #e8ecff",
                }}
              >
                <Eye size={12} /> 全部
              </button>
              <button
                onClick={() => setFilterMode("zero")}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1"
                style={{
                  background: filterMode === "zero" ? "#dc2626" : "#f5f7ff",
                  color: filterMode === "zero" ? "white" : "#374151",
                  border: filterMode === "zero" ? "none" : "1.5px solid #e8ecff",
                }}
              >
                <EyeOff size={12} /> 只看0动销
              </button>
              <button
                onClick={() => setFilterMode("low")}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1"
                style={{
                  background: filterMode === "low" ? "#d97706" : "#f5f7ff",
                  color: filterMode === "low" ? "white" : "#374151",
                  border: filterMode === "low" ? "none" : "1.5px solid #e8ecff",
                }}
              >
                <EyeOff size={12} /> 只看低效
              </button>
            </div>
          </div>

          {/* 棚格图 */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64 rounded-2xl" style={{ background: "white" }}>
              <div className="text-gray-400 text-sm">加载中...</div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 rounded-2xl" style={{ background: "white" }}>
              <Package size={40} className="text-gray-300 mb-3" />
              <p className="text-gray-400 text-sm">暂无该货架的陈列数据</p>
            </div>
          ) : (
            <div
              className="rounded-2xl overflow-auto"
              style={{ background: "white", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", padding: "24px" }}
            >
              <div
                style={{
                  display: "inline-block",
                  background: "#f1f5f9",
                  borderRadius: 12,
                  padding: "16px 20px",
                  border: "3px solid #cbd5e1",
                  boxShadow: "inset 0 2px 8px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.08)",
                  minWidth: "fit-content",
                }}
              >
                {levelGroups.map(([level, levelItems]) => {
                  const usedFacings = levelItems.reduce((sum, item) => {
                    return sum + (facingAdjustments[item.id] ?? Math.max(1, item.facingCount ?? 1));
                  }, 0);
                  const shelfWidth = maxLevelFacings * UNIT_W + (maxLevelFacings - 1) * GAP;
                  const scaledUnitW = usedFacings > 0
                    ? Math.floor((shelfWidth - (usedFacings - 1) * GAP) / usedFacings)
                    : UNIT_W;

                  return (
                    <div key={level} style={{ marginBottom: GAP * 2, display: "flex", alignItems: "stretch", gap: 8 }}>
                      <div style={{ width: 36, minWidth: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", background: "#eef2ff", borderRadius: 6, padding: "2px 6px", whiteSpace: "nowrap" }}>
                          第{level}层
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          gap: GAP,
                          alignItems: "flex-end",
                          background: "linear-gradient(180deg, #e8edf5 0%, #dde3ee 100%)",
                          borderRadius: 8,
                          padding: "8px 10px 10px",
                          border: "1px solid #c8d0e0",
                          boxShadow: "inset 0 -3px 0 #b8c4d8",
                          minHeight: UNIT_H + 20,
                          width: shelfWidth + 20,
                          minWidth: shelfWidth + 20,
                        }}
                      >
                        {levelItems.map(item => {
                          const adjFacing = facingAdjustments[item.id];
                          const isDimmed = filteredIds !== null && !filteredIds.has(item.id);
                          return (
                            <ProductCell
                              key={item.id}
                              item={item}
                              rating={item.rating}
                              unitWidth={scaledUnitW}
                              unitHeight={UNIT_H}
                              isHighlighted={highlightedId === item.id}
                              isDimmed={isDimmed}
                              adjustedFacing={adjFacing}
                              onClick={() => setHighlightedId(prev => prev === item.id ? null : item.id)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <div style={{ height: 12, background: "linear-gradient(180deg, #94a3b8 0%, #64748b 100%)", borderRadius: "0 0 8px 8px", marginTop: 4, boxShadow: "0 4px 8px rgba(0,0,0,0.2)" }} />
              </div>
            </div>
          )}
        </div>

        {/* 右侧：商品效率排行榜 */}
        <div
          className="rounded-2xl flex-shrink-0"
          style={{
            width: 340,
            background: "white",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
            overflow: "hidden",
          }}
        >
          {/* 排行榜标题 */}
          <div className="px-4 py-3" style={{ borderBottom: "1px solid #f0f4ff" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-indigo-500" />
                <h3 className="text-sm font-bold text-gray-700">商品效率排行</h3>
                <span className="text-xs text-gray-400">（效率最低排在最前）</span>
              </div>
              <button
                onClick={handleGeneratePlan}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #0891b2)",
                  boxShadow: "0 2px 8px rgba(99,102,241,0.35)",
                }}
                title="生成调整方案并导出"
              >
                <FileDown size={13} />
                生成方案
              </button>
            </div>
            {/* 调整预估 */}
            {hasAdjustments && adjustedSalesEstimate !== null && (
              <div
                className="mt-2 px-3 py-2 rounded-xl text-xs"
                style={{ background: "#eef2ff", border: "1px solid #c7d2fe" }}
              >
                <span className="text-gray-500">调整后预估销售额：</span>
                <span className="font-bold text-indigo-600 ml-1">
                  ¥{fmtAmount(adjustedSalesEstimate)}
                </span>
                <span className="text-gray-400 ml-1">
                  （当前 ¥{fmtAmount(summary.totalSales)}）
                </span>
                <button
                  onClick={() => setFacingAdjustments({})}
                  className="ml-2 text-indigo-500 hover:text-indigo-700 font-medium"
                >
                  重置全部
                </button>
              </div>
            )}
          </div>

          {/* 排行榜列表 */}
          <div className="overflow-y-auto px-2 py-2" style={{ maxHeight: "calc(100vh - 320px)" }}>
            {rankedItems.map(item => (
              <RankRow
                key={item.id}
                item={item}
                rating={item.rating}
                efficiency={item.eff}
                avgEff={avgEff}
                isHighlighted={highlightedId === item.id}
                adjustedFacing={facingAdjustments[item.id] ?? (item.facingCount ?? 1)}
                onHighlight={() => setHighlightedId(prev => prev === item.id ? null : item.id)}
                onAdjust={(delta) => handleAdjust(item.id, item.facingCount ?? 1, delta)}
                onReset={() => handleReset(item.id)}
                suggestedAction={item.suggestedAction}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
