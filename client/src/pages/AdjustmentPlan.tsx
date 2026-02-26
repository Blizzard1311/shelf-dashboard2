/**
 * 调整方案页面
 * 通过 URL query string 接收调整数据，展示折叠卡片，支持 Excel 导出
 *
 * URL 格式：/adjustment-plan?data=<base64-encoded-json>
 *
 * data JSON 结构：
 * {
 *   sessionId: number,
 *   mode: "category" | "urgent",
 *   category?: string,
 *   urgentThreshold?: number,
 *   items: Array<{
 *     shelfCode: string,
 *     shelfLevel: number,
 *     positionCode: string,
 *     productCode: string,
 *     productName: string,
 *     category1: string,
 *     category2: string,
 *     category3: string,
 *     originalFacing: number,
 *     adjustedFacing: number,
 *     salesAmount: number,
 *     grossProfit: number,
 *     salesQty: number,
 *     efficiency: number,
 *     rating: "high" | "normal" | "low" | "zero",
 *     suggestedAction: "增面" | "减面" | "撤架" | "维持",
 *     priority: "高" | "中" | "低",
 *   }>
 * }
 */

import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Download,
  Filter,
  Package,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import * as XLSX from "xlsx";

// ─────────────────────────────────────────────
// 类型
// ─────────────────────────────────────────────
export interface AdjustmentItem {
  shelfCode: string;
  shelfLevel: number;
  positionCode: string;
  productCode: string;
  productName: string;
  category1: string;
  category2: string;
  category3: string;
  originalFacing: number;
  adjustedFacing: number;
  salesAmount: number;
  grossProfit: number;
  salesQty: number;
  efficiency: number;
  rating: "high" | "normal" | "low" | "zero";
  suggestedAction: "增面" | "减面" | "撤架" | "维持";
  priority: "高" | "中" | "低";
}

export interface AdjustmentPlanData {
  sessionId: number;
  mode: "category" | "urgent";
  category?: string;
  items: AdjustmentItem[];
}

// ─────────────────────────────────────────────
// 数字格式化
// ─────────────────────────────────────────────
function fmtAmount(val: number | null | undefined): string {
  if (val == null || isNaN(Number(val))) return "—";
  const n = Number(val);
  if (n >= 10000) return (n / 10000).toFixed(1) + "万";
  return n.toLocaleString("zh-CN", { maximumFractionDigits: 0 });
}

// ─────────────────────────────────────────────
// 变化量显示
// ─────────────────────────────────────────────
function DeltaBadge({ original, adjusted }: { original: number; adjusted: number }) {
  const delta = adjusted - original;
  if (adjusted === 0) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "#fee2e2", color: "#991b1b" }}>
        撤
      </span>
    );
  }
  if (delta === 0) {
    return <span className="text-xs text-gray-400">—</span>;
  }
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-bold"
      style={{
        background: delta > 0 ? "#dcfce7" : "#fef3c7",
        color: delta > 0 ? "#15803d" : "#92400e",
      }}
    >
      {delta > 0 ? `+${delta}` : delta}
    </span>
  );
}

// ─────────────────────────────────────────────
// 单货架折叠卡片
// ─────────────────────────────────────────────
interface ShelfCardProps {
  shelfCode: string;
  items: AdjustmentItem[];
  defaultOpen: boolean;
}

function ShelfCard({ shelfCode, items, defaultOpen }: ShelfCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  const adjustCount = items.filter(i => i.adjustedFacing !== i.originalFacing).length;
  const zeroCount = items.filter(i => i.rating === "zero").length;
  const removeCount = items.filter(i => i.adjustedFacing === 0).length;
  const increaseCount = items.filter(i => i.adjustedFacing > i.originalFacing).length;
  const decreaseCount = items.filter(i => i.adjustedFacing < i.originalFacing && i.adjustedFacing > 0).length;

  // 健康状态
  const hasUrgent = zeroCount > 0 || items.some(i => i.rating === "low");
  const borderColor = removeCount > 0 ? "#fecaca" : hasUrgent ? "#fde68a" : "#e8ecff";

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "white",
        boxShadow: "0 4px 16px rgba(0,0,0,0.07)",
        border: `1.5px solid ${borderColor}`,
      }}
    >
      {/* 卡片标题行 */}
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none"
        onClick={() => setOpen(v => !v)}
        style={{ background: open ? "#fafbff" : "white" }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-bold text-gray-800">{shelfCode}</span>
          {/* 摘要标签 */}
          <div className="flex flex-wrap gap-1.5">
            {removeCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#fee2e2", color: "#991b1b" }}>
                撤架 {removeCount}
              </span>
            )}
            {decreaseCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#fef3c7", color: "#92400e" }}>
                减面 {decreaseCount}
              </span>
            )}
            {increaseCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#dcfce7", color: "#15803d" }}>
                增面 {increaseCount}
              </span>
            )}
            {adjustCount === 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#f1f5f9", color: "#475569" }}>
                无调整
              </span>
            )}
          </div>
        </div>
        <span className="text-xs text-gray-400 flex-shrink-0">{items.length} 个商品</span>
        {open ? <ChevronDown size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />}
      </div>

      {/* 展开内容 */}
      {open && (
        <div style={{ borderTop: "1px solid #f0f4ff" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "#f8faff" }}>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-500">商品名称</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-500">层/位</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-500">大类</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-gray-500">当前排面</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-gray-500">建议排面</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-gray-500">变化量</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-gray-500">调整类型</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-gray-500">排面效率</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-gray-500">优先级</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const isModified = item.adjustedFacing !== item.originalFacing;
                  return (
                    <tr
                      key={idx}
                      style={{
                        background: isModified
                          ? item.adjustedFacing === 0 ? "#fff5f5"
                          : item.adjustedFacing > item.originalFacing ? "#f0fdf4"
                          : "#fffbeb"
                          : "white",
                        borderBottom: "1px solid #f5f7ff",
                      }}
                    >
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-gray-800 max-w-[180px] truncate" title={item.productName}>
                          {item.productName || item.productCode}
                        </div>
                        <div className="text-gray-400 text-xs">{item.productCode}</div>
                      </td>
                      <td className="px-3 py-2.5 text-gray-500">
                        第{item.shelfLevel}层 / {item.positionCode}位
                      </td>
                      <td className="px-3 py-2.5 text-gray-500">{item.category1 || "—"}</td>
                      <td className="px-3 py-2.5 text-center font-semibold text-gray-700">{item.originalFacing}</td>
                      <td className="px-3 py-2.5 text-center font-bold" style={{ color: item.adjustedFacing === 0 ? "#dc2626" : "#6366f1" }}>
                        {item.adjustedFacing === 0 ? "撤架" : item.adjustedFacing}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <DeltaBadge original={item.originalFacing} adjusted={item.adjustedFacing} />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className="px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: item.suggestedAction === "撤架" ? "#fee2e2"
                              : item.suggestedAction === "增面" ? "#dcfce7"
                              : item.suggestedAction === "减面" ? "#fef3c7"
                              : "#f1f5f9",
                            color: item.suggestedAction === "撤架" ? "#991b1b"
                              : item.suggestedAction === "增面" ? "#15803d"
                              : item.suggestedAction === "减面" ? "#92400e"
                              : "#475569",
                          }}
                        >
                          {item.suggestedAction}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-gray-700">
                        {item.efficiency > 0 ? `¥${item.efficiency.toFixed(0)}/面` : "0动销"}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className="px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: item.priority === "高" ? "#fee2e2" : item.priority === "中" ? "#fef3c7" : "#f1f5f9",
                            color: item.priority === "高" ? "#991b1b" : item.priority === "中" ? "#92400e" : "#475569",
                          }}
                        >
                          {item.priority}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Excel 导出
// ─────────────────────────────────────────────
function exportToExcel(items: AdjustmentItem[], mode: string, category?: string) {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1：调整任务总览 ──
  const sheet1Data = items
    .filter(i => i.adjustedFacing !== i.originalFacing || i.rating === "zero")
    .map(i => ({
      "货架编码": i.shelfCode,
      "货架层数": `第${i.shelfLevel}层`,
      "储位编码": i.positionCode,
      "商品编码": i.productCode,
      "商品名称": i.productName,
      "大类": i.category1,
      "中类": i.category2,
      "小类": i.category3,
      "当前排面数": i.originalFacing,
      "建议排面数": i.adjustedFacing === 0 ? "撤架" : i.adjustedFacing,
      "变化量": i.adjustedFacing === 0 ? "撤" : i.adjustedFacing - i.originalFacing > 0 ? `+${i.adjustedFacing - i.originalFacing}` : String(i.adjustedFacing - i.originalFacing),
      "调整类型": i.suggestedAction,
      "优先级": i.priority,
      "执行备注": "",
    }));

  if (sheet1Data.length === 0) {
    (sheet1Data as Array<Record<string, unknown>>).push({
      "货架编码": "（无调整项）",
      "货架层数": "",
      "储位编码": "",
      "商品编码": "",
      "商品名称": "",
      "大类": "",
      "中类": "",
      "小类": "",
      "当前排面数": 0,
      "建议排面数": "",
      "变化量": "",
      "调整类型": "",
      "优先级": "",
      "执行备注": "",
    });
  }

  const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
  ws1["!cols"] = [
    { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 14 }, { wch: 24 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, "调整任务总览");

  // ── Sheet 2：效率诊断依据 ──
  const sheet2Data = items.map(i => ({
    "货架编码": i.shelfCode,
    "货架层数": `第${i.shelfLevel}层`,
    "储位编码": i.positionCode,
    "商品编码": i.productCode,
    "商品名称": i.productName,
    "大类": i.category1,
    "中类": i.category2,
    "小类": i.category3,
    "当前排面数": i.originalFacing,
    "销售数量": i.salesQty,
    "销售金额(元)": i.salesAmount,
    "销售毛利(元)": i.grossProfit,
    "排面效率(元/面)": i.efficiency > 0 ? Number(i.efficiency.toFixed(2)) : 0,
    "效率评级": i.rating === "high" ? "高效" : i.rating === "normal" ? "正常" : i.rating === "low" ? "低效" : "0动销",
    "建议动作": i.suggestedAction,
  }));

  const ws2 = XLSX.utils.json_to_sheet(sheet2Data);
  ws2["!cols"] = [
    { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 14 }, { wch: 24 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, "效率诊断依据");

  // ── Sheet 3：0动销商品清单 ──
  const zeroItems = items.filter(i => i.rating === "zero");
  const sheet3Data = zeroItems.length > 0
    ? zeroItems.map(i => ({
        "货架编码": i.shelfCode,
        "货架层数": `第${i.shelfLevel}层`,
        "储位编码": i.positionCode,
        "商品编码": i.productCode,
        "商品名称": i.productName,
        "大类": i.category1,
        "中类": i.category2,
        "小类": i.category3,
        "占用排面数": i.originalFacing,
        "建议处理方式": "撤架",
        "管理者备注": "",
      }))
    : [{ "货架编码": "（无0动销商品）", "货架层数": "", "储位编码": "", "商品编码": "", "商品名称": "", "大类": "", "中类": "", "小类": "", "占用排面数": 0, "建议处理方式": "撤架", "管理者备注": "" }];

  const ws3 = XLSX.utils.json_to_sheet(sheet3Data);
  ws3["!cols"] = [
    { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 14 }, { wch: 24 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, ws3, "0动销商品清单");

  // 生成文件名
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const modeStr = mode === "category" && category ? `${category}大类` : "紧急问题";
  XLSX.writeFile(wb, `货架调整方案_${modeStr}_${dateStr}.xlsx`);
}

// ─────────────────────────────────────────────
// 主页面
// ─────────────────────────────────────────────
export default function AdjustmentPlan() {
  const [, setLocation] = useLocation();
  const [filterMode, setFilterMode] = useState<"all" | "zero" | "modified">("all");

  // 解析 URL query 中的调整数据
  const planData = useMemo<AdjustmentPlanData | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get("data");
      if (!raw) return null;
      return JSON.parse(atob(raw)) as AdjustmentPlanData;
    } catch {
      return null;
    }
  }, []);

  if (!planData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4" style={{ background: "#f8faff" }}>
        <div className="rounded-2xl p-8 flex flex-col items-center gap-4 text-center" style={{ background: "white", boxShadow: "0 4px 20px rgba(0,0,0,0.07)" }}>
          <AlertTriangle size={32} className="text-amber-500" />
          <h3 className="text-lg font-bold text-gray-700">无调整方案数据</h3>
          <p className="text-sm text-gray-500">请从货架生命力透视页面生成调整方案。</p>
          <button
            onClick={() => setLocation("/grid")}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, oklch(0.65 0.15 185), oklch(0.60 0.18 200))" }}
          >
            返回效率总览
          </button>
        </div>
      </div>
    );
  }

  const { items, mode, category } = planData;

  // 筛选
  const filteredItems = useMemo(() => {
    if (filterMode === "zero") return items.filter(i => i.rating === "zero");
    if (filterMode === "modified") return items.filter(i => i.adjustedFacing !== i.originalFacing);
    return items;
  }, [items, filterMode]);

  // 按货架分组
  const shelfGroups = useMemo(() => {
    const map = new Map<string, AdjustmentItem[]>();
    for (const item of filteredItems) {
      if (!map.has(item.shelfCode)) map.set(item.shelfCode, []);
      map.get(item.shelfCode)!.push(item);
    }
    // 按调整项数量从多到少排序（有调整的排在前面）
    return Array.from(map.entries()).sort((a, b) => {
      const aAdj = a[1].filter(i => i.adjustedFacing !== i.originalFacing).length;
      const bAdj = b[1].filter(i => i.adjustedFacing !== i.originalFacing).length;
      return bAdj - aAdj;
    });
  }, [filteredItems]);

  // 汇总统计
  const summary = useMemo(() => {
    const totalItems = items.length;
    const adjustedItems = items.filter(i => i.adjustedFacing !== i.originalFacing).length;
    const removeItems = items.filter(i => i.adjustedFacing === 0).length;
    const zeroItems = items.filter(i => i.rating === "zero").length;
    const shelfCount = new Set(items.map(i => i.shelfCode)).size;
    return { totalItems, adjustedItems, removeItems, zeroItems, shelfCount };
  }, [items]);

  // 有调整项的货架默认展开
  const shelfCodesWithAdjustments = useMemo(() => {
    return new Set(
      items.filter(i => i.adjustedFacing !== i.originalFacing).map(i => i.shelfCode)
    );
  }, [items]);

  return (
    <div className="min-h-screen" style={{ background: "#f0f4ff", padding: "24px" }}>
      {/* ── 顶部导航 ── */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all"
            style={{ background: "white", border: "1px solid #e5e7eb", color: "#374151", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
          >
            <ArrowLeft size={16} />
            返回
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              调整方案
              {mode === "category" && category && (
                <span className="ml-2 text-sm font-normal px-2 py-0.5 rounded-full" style={{ background: "#eef2ff", color: "#4f46e5" }}>
                  {category}大类
                </span>
              )}
              {mode === "urgent" && (
                <span className="ml-2 text-sm font-normal px-2 py-0.5 rounded-full" style={{ background: "#fee2e2", color: "#dc2626" }}>
                  紧急问题
                </span>
              )}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              共 {summary.shelfCount} 组货架 · {summary.adjustedItems} 项调整 · {summary.zeroItems} 个0动销
            </p>
          </div>
        </div>

        {/* 导出按钮 */}
        <button
          onClick={() => exportToExcel(items, mode, category)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white transition-all"
          style={{
            background: "linear-gradient(135deg, #059669, #0891b2)",
            boxShadow: "0 4px 15px rgba(5,150,105,0.35)",
          }}
        >
          <Download size={16} />
          导出 Excel（3张Sheet）
        </button>
      </div>

      {/* ── 汇总指标 ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "涉及货架", value: `${summary.shelfCount} 组`, icon: <Package size={16} />, color: "#4f46e5", bg: "#eef2ff" },
          { label: "调整项目", value: `${summary.adjustedItems} 项`, icon: <TrendingUp size={16} />, color: "#059669", bg: "#ecfdf5" },
          { label: "撤架商品", value: `${summary.removeItems} 个`, icon: <TrendingDown size={16} />, color: "#dc2626", bg: "#fef2f2" },
          { label: "0动销商品", value: `${summary.zeroItems} 个`, icon: <AlertTriangle size={16} />, color: "#d97706", bg: "#fffbeb" },
        ].map(card => (
          <div
            key={card.label}
            className="rounded-xl p-3 flex items-center gap-3"
            style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", borderLeft: `3px solid ${card.color}` }}
          >
            <div className="rounded-lg p-2 flex-shrink-0" style={{ background: card.bg, color: card.color }}>
              {card.icon}
            </div>
            <div>
              <p className="text-xs text-gray-400">{card.label}</p>
              <p className="text-base font-bold text-gray-800">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── 筛选栏 ── */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Filter size={14} className="text-gray-400" />
        <span className="text-xs text-gray-500 font-medium">快速筛选：</span>
        {[
          { key: "all", label: "全部商品", count: items.length },
          { key: "modified", label: "有调整项", count: items.filter(i => i.adjustedFacing !== i.originalFacing).length },
          { key: "zero", label: "0动销", count: summary.zeroItems },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilterMode(f.key as typeof filterMode)}
            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
            style={{
              background: filterMode === f.key ? "#4f46e5" : "white",
              color: filterMode === f.key ? "white" : "#374151",
              border: filterMode === f.key ? "none" : "1.5px solid #e8ecff",
              boxShadow: filterMode === f.key ? "0 2px 8px rgba(79,70,229,0.3)" : "0 1px 4px rgba(0,0,0,0.05)",
            }}
          >
            {f.label}
            <span
              className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs"
              style={{
                background: filterMode === f.key ? "rgba(255,255,255,0.25)" : "#f0f4ff",
                color: filterMode === f.key ? "white" : "#4f46e5",
              }}
            >
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── 折叠卡片列表 ── */}
      {shelfGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl" style={{ background: "white" }}>
          <Minus size={28} className="text-gray-300" />
          <p className="text-sm text-gray-400">当前筛选条件下无数据</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {shelfGroups.map(([shelfCode, shelfItems]) => (
            <ShelfCard
              key={shelfCode}
              shelfCode={shelfCode}
              items={shelfItems}
              defaultOpen={shelfCodesWithAdjustments.has(shelfCode)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
