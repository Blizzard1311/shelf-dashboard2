import React, { useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Package, TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import { useRef, useEffect, useState } from "react";

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
// 类型
// ─────────────────────────────────────────────
interface SlotItem {
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
}

// ─────────────────────────────────────────────
// 商品方块
// ─────────────────────────────────────────────
interface ProductCellProps {
  item: SlotItem;
  isTopQty: boolean;
  isTopAmount: boolean;
  unitWidth: number;
  unitHeight: number;
}

function ProductCell({ item, isTopQty, isTopAmount, unitWidth, unitHeight }: ProductCellProps) {
  const facing = Math.max(1, item.facingCount ?? 1);
  const width = facing * unitWidth;
  const height = unitHeight;

  // 背景色逻辑
  let bgColor = "#f8fafc";
  let borderColor = "#e2e8f0";
  let textColor = "#374151";

  if (isTopQty && isTopAmount) {
    bgColor = "#fff0f0";
    borderColor = "#ef4444";
    textColor = "#dc2626";
  } else if (isTopQty) {
    bgColor = "#fff7ed";
    borderColor = "#f97316";
    textColor = "#ea580c";
  } else if (isTopAmount) {
    bgColor = "#fef2f2";
    borderColor = "#f87171";
    textColor = "#dc2626";
  }

  const salesAmountNum = Number(item.salesAmount ?? 0);
  const grossProfitNum = Number(item.grossProfit ?? 0);

  return (
    <div
      title={`${item.productName ?? ""} (${item.productCode ?? ""})
陈列面数: ${facing}
销售数量: ${item.salesQty ?? "—"}
销售金额: ¥${fmtAmount(salesAmountNum)}
销售毛利: ¥${fmtAmount(grossProfitNum)}`}
      style={{
        width,
        height,
        minWidth: width,
        background: bgColor,
        border: `2px solid ${borderColor}`,
        borderRadius: 6,
        padding: "4px 5px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: isTopQty || isTopAmount
          ? `0 2px 8px ${borderColor}55, inset 0 1px 0 rgba(255,255,255,0.8)`
          : "0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)",
        flexShrink: 0,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* 角标：高亮标记 */}
      {(isTopQty || isTopAmount) && (
        <div
          style={{
            position: "absolute",
            top: 2,
            right: 3,
            fontSize: 9,
            fontWeight: 700,
            color: "#ef4444",
            lineHeight: 1,
          }}
        >
          {isTopQty && isTopAmount ? "★★" : "★"}
        </div>
      )}

      {/* 商品名称 */}
      <div
        style={{
          fontSize: Math.min(11, Math.max(9, width / 8)),
          fontWeight: 600,
          color: textColor,
          lineHeight: 1.2,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: facing >= 2 ? 2 : 1,
          WebkitBoxOrient: "vertical" as const,
          wordBreak: "break-all",
        }}
      >
        {item.productName ?? item.productCode ?? "—"}
      </div>

      {/* 数据区 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <div style={{ fontSize: 9, color: "#6b7280" }}>
          面: <span style={{ color: "#6366f1", fontWeight: 700 }}>{facing}</span>
        </div>
        <div style={{ fontSize: 9, color: isTopQty ? "#ea580c" : "#6b7280", fontWeight: isTopQty ? 700 : 400 }}>
          量: <span style={{ color: isTopQty ? "#ea580c" : textColor, fontWeight: 700 }}>{fmtQty(item.salesQty)}</span>
        </div>
        <div style={{ fontSize: 9, color: isTopAmount ? "#dc2626" : "#6b7280", fontWeight: isTopAmount ? 700 : 400 }}>
          额: <span style={{ color: isTopAmount ? "#dc2626" : textColor, fontWeight: 700 }}>¥{fmtAmount(salesAmountNum)}</span>
        </div>
        <div style={{ fontSize: 9, color: "#6b7280" }}>
          利: <span style={{ color: textColor, fontWeight: 600 }}>¥{fmtAmount(grossProfitNum)}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 主页面
// ─────────────────────────────────────────────
export default function Planogram() {
  const params = useParams<{ shelfCode: string }>();
  const shelfCode = decodeURIComponent(params.shelfCode ?? "");
  const [, setLocation] = useLocation();

  // 获取最新 sessionId
  const { data: sessionData } = trpc.shelf.latestSession.useQuery();
  const sessionId = sessionData?.sessionId ?? null;

  // 获取棚格图数据
  const { data: items = [], isLoading } = trpc.shelf.planogram.useQuery(
    { sessionId: sessionId!, shelfCode },
    { enabled: sessionId != null && shelfCode !== "" }
  );

  // ── 计算最大销售数量和最大销售金额的商品 ──
  const { maxQtyIds, maxAmountIds } = useMemo(() => {
    if (!items.length) return { maxQtyIds: new Set<number>(), maxAmountIds: new Set<number>() };

    let maxQty = -Infinity;
    let maxAmount = -Infinity;

    for (const item of items) {
      const qty = item.salesQty ?? 0;
      const amt = Number(item.salesAmount ?? 0);
      if (qty > maxQty) maxQty = qty;
      if (amt > maxAmount) maxAmount = amt;
    }

    const maxQtyIds = new Set(items.filter(i => (i.salesQty ?? 0) === maxQty && maxQty > 0).map(i => i.id));
    const maxAmountIds = new Set(items.filter(i => Number(i.salesAmount ?? 0) === maxAmount && maxAmount > 0).map(i => i.id));

    return { maxQtyIds, maxAmountIds };
  }, [items]);

  // ── 按层分组，从下到上排列 ──
  const levelGroups = useMemo(() => {
    const map = new Map<number, SlotItem[]>();
    for (const item of items) {
      const lvl = item.shelfLevel ?? 1;
      if (!map.has(lvl)) map.set(lvl, []);
      map.get(lvl)!.push(item);
    }
    // 按储位编码排序（从小到大 = 从左到右）
    Array.from(map.values()).forEach((arr: SlotItem[]) => {
      arr.sort((a: SlotItem, b: SlotItem) => Number(a.positionCode ?? 0) - Number(b.positionCode ?? 0));
    });
    // 层数从大到小排列（最高层在上，最底层在下）
    return Array.from(map.entries()).sort((a: [number, SlotItem[]], b: [number, SlotItem[]]) => b[0] - a[0]);
  }, [items]);

  // ── 计算每层总面数，找出最大层宽度 ──
  const maxLevelFacings = useMemo(() => {
    if (!levelGroups.length) return 0;
    return Math.max(
      ...levelGroups.map(([, levelItems]) =>
        levelItems.reduce((sum, item) => sum + Math.max(1, item.facingCount ?? 1), 0)
      )
    );
  }, [levelGroups]);

  // ── 汇总统计 ──
  const summary = useMemo(() => {
    const totalQty = items.reduce((s, i) => s + (i.salesQty ?? 0), 0);
    // 商品种数
    const productCount = new Set(items.map(i => i.productCode).filter(Boolean)).size;
    // 动销率
    const activeFacings = items.reduce((s, i) => s + ((i.salesQty ?? 0) > 0 ? Math.max(1, i.facingCount ?? 1) : 0), 0);
    const totalFacings = items.reduce((s, i) => s + Math.max(1, i.facingCount ?? 1), 0);
    const facingActivityRate = totalFacings > 0 ? Math.round(activeFacings / totalFacings * 1000) / 10 : 0;
    // 零销售SKU
    const zeroSalesSkus = new Set(
      items.filter(i => (i.salesQty ?? 0) === 0).map(i => i.productCode).filter(Boolean)
    ).size;
    // TOP商品（销售金额最高）
    const productAmountMap = new Map<string, { name: string | null; amount: number }>();
    for (const item of items) {
      const code = item.productCode ?? "";
      const amt = Number(item.salesAmount ?? 0);
      const existing = productAmountMap.get(code);
      if (!existing || amt > existing.amount) {
        productAmountMap.set(code, { name: item.productName, amount: amt });
      }
    }
    let topProduct: { name: string | null; amount: number } | null = null;
    Array.from(productAmountMap.values()).forEach(v => {
      if (!topProduct || v.amount > topProduct!.amount) topProduct = v;
    });
    return { totalQty, productCount, facingActivityRate, zeroSalesSkus, topProduct };
  }, [items]);

  // 自适应方块尺寸：ref 挂在始终存在的外层容器
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setContainerWidth(w);
    });
    obs.observe(el);
    if (el.clientWidth > 0) setContainerWidth(el.clientWidth);
    return () => obs.disconnect();
  }, []);

  const GAP = 4;
  const LABEL_W = 52; // 层号标签宽度 + gap
  const OUTER_PAD = 48; // 页面 padding (24*2)
  const CARD_PAD = 48; // 卡片内边距 (24*2)
  const SHELF_PAD = 40; // 货架外框 padding (20*2)
  const SHELF_BORDER = 6; // 货架外框 border (3*2)
  const LAYER_PAD = 20; // 层隔板内边距 (10*2)
  const MIN_UNIT_W = 40;
  const MAX_UNIT_W = 100;
  const BASE_UNIT_H = 110;

  // 容器可用宽度 → 计算单个面的宽度
  const UNIT_W = useMemo(() => {
    if (!containerWidth || !maxLevelFacings) return MAX_UNIT_W;
    // 可用宽度 = 容器宽 - 卡片边距 - 货架外框边距 - 货架 border - 层隔板内边距 - 层号标签宽度
    const available = containerWidth - CARD_PAD - SHELF_PAD - SHELF_BORDER - LAYER_PAD - LABEL_W;
    // 将可用宽度平分给所有面（含间距）
    const raw = Math.floor((available - (maxLevelFacings - 1) * GAP) / maxLevelFacings);
    return Math.min(MAX_UNIT_W, Math.max(MIN_UNIT_W, raw));
  }, [containerWidth, maxLevelFacings]);

  // 高度按宽度比例缩放
  const UNIT_H = Math.round(BASE_UNIT_H * (UNIT_W / MAX_UNIT_W));

  return (
    <div
      ref={containerRef}
      className="min-h-screen"
      style={{ background: "linear-gradient(135deg, #f0f4ff 0%, #fafafa 100%)", padding: "24px" }}
    >
      {/* 顶部导航 */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => setLocation("/shelf")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all"
          style={{
            background: "white",
            border: "1px solid #e5e7eb",
            color: "#374151",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <ArrowLeft size={16} />
          返回
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            货架陈列图 — <span style={{ color: "#6366f1" }}>{shelfCode}</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">按层从下到上 · 储位从左到右 · 陈列面数决定方块宽度</p>
        </div>
      </div>

      {/* 汇总看板 - 五个指标 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {/* SKU */}
        <div className="rounded-2xl p-4" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", borderLeft: "4px solid #6366f1" }}>
          <div className="flex items-center gap-2 mb-1" style={{ color: "#6366f1" }}>
            <Package size={18} />
            <span className="text-xs font-medium text-gray-500">SKU</span>
          </div>
          <p className="text-xl font-bold text-gray-800">{summary.productCount} 种</p>
          <p className="text-xs text-gray-400 mt-0.5">该货架陈列商品数</p>
        </div>
        {/* 销售数量 */}
        <div className="rounded-2xl p-4" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", borderLeft: "4px solid #10b981" }}>
          <div className="flex items-center gap-2 mb-1" style={{ color: "#10b981" }}>
            <BarChart3 size={18} />
            <span className="text-xs font-medium text-gray-500">销售数量</span>
          </div>
          <p className="text-xl font-bold text-gray-800">{fmtQty(summary.totalQty)}</p>
          <p className="text-xs text-gray-400 mt-0.5">顾客拿取次数</p>
        </div>
        {/* 动销率 */}
        <div className="rounded-2xl p-4" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", borderLeft: "4px solid #f59e0b" }}>
          <div className="flex items-center gap-2 mb-1" style={{ color: "#f59e0b" }}>
            <TrendingUp size={18} />
            <span className="text-xs font-medium text-gray-500">动销率</span>
          </div>
          <p
            className="text-xl font-bold"
            style={{ color: summary.facingActivityRate >= 80 ? "#16a34a" : summary.facingActivityRate >= 50 ? "#d97706" : "#dc2626" }}
          >
            {summary.facingActivityRate}%
          </p>
          <p className="text-xs text-gray-400 mt-0.5">有效排面占比</p>
        </div>
        {/* TOP商品 */}
        <div className="rounded-2xl p-4" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", borderLeft: "4px solid #8b5cf6" }}>
          <div className="flex items-center gap-2 mb-1" style={{ color: "#8b5cf6" }}>
            <DollarSign size={18} />
            <span className="text-xs font-medium text-gray-500">TOP 商品</span>
          </div>
          {(() => {
            const tp = summary.topProduct as { name: string | null; amount: number } | null;
            return tp && tp.amount > 0 ? (
              <>
                <p
                  className="text-sm font-bold text-gray-800 leading-tight"
                  style={{ overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" as const }}
                >
                  {tp.name ?? "—"}
                </p>
                <p className="text-xs font-semibold mt-0.5" style={{ color: "#8b5cf6" }}>¥{fmtAmount(tp.amount)}</p>
              </>
            ) : (
              <p className="text-xl font-bold text-gray-300">—</p>
            );
          })()}
        </div>
        {/* 零销售SKU */}
        <div className="rounded-2xl p-4" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", borderLeft: `4px solid ${summary.zeroSalesSkus > 0 ? "#ef4444" : "#10b981"}` }}>
          <div className="flex items-center gap-2 mb-1" style={{ color: summary.zeroSalesSkus > 0 ? "#ef4444" : "#10b981" }}>
            <Package size={18} />
            <span className="text-xs font-medium text-gray-500">零销售 SKU</span>
          </div>
          <p className="text-xl font-bold" style={{ color: summary.zeroSalesSkus > 0 ? "#dc2626" : "#16a34a" }}>
            {summary.zeroSalesSkus} 种
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{summary.zeroSalesSkus > 0 ? "占据排面但无销售" : "全部有销售"}</p>
        </div>
      </div>

      {/* 图例 */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <div style={{ width: 14, height: 14, borderRadius: 3, background: "#fff7ed", border: "2px solid #f97316" }} />
          <span>销售数量最高 ★</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <div style={{ width: 14, height: 14, borderRadius: 3, background: "#fef2f2", border: "2px solid #f87171" }} />
          <span>销售金额最高 ★</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <div style={{ width: 14, height: 14, borderRadius: 3, background: "#fff0f0", border: "2px solid #ef4444" }} />
          <span>两者均最高 ★★</span>
        </div>
      </div>

      {/* 棚格图主体 */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400 text-sm">加载中...</div>
        </div>
      ) : items.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center h-64 rounded-2xl"
          style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
        >
          <Package size={40} className="text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">暂无该货架的陈列数据</p>
        </div>
      ) : (
        <div
          className="rounded-2xl"
          style={{
            background: "white",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
            padding: "24px",
            overflowX: UNIT_W <= MIN_UNIT_W ? "auto" : "hidden",
          }}
        >
          {/* 货架外框 */}
          <div
            style={{
              display: "block",
              background: "#f1f5f9",
              borderRadius: 12,
              padding: "16px 20px",
              border: "3px solid #cbd5e1",
              boxShadow: "inset 0 2px 8px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.08)",
            }}
          >
            {levelGroups.map(([level, levelItems]) => {
              // 该层总面数
              const usedFacings = levelItems.reduce((sum, item) => sum + Math.max(1, item.facingCount ?? 1), 0);
              // 层板总宽 = 最大层面数 × UNIT_W + 间距
              const shelfWidth = maxLevelFacings * UNIT_W + (maxLevelFacings - 1) * GAP;
              // 每个面的实际宽度：将层板宽度平分给该层的所有面数
              // 公式：(shelfWidth - (usedFacings-1)*GAP) / usedFacings 得到每个面的宽度
              const scaledUnitW = usedFacings > 0
                ? Math.floor((shelfWidth - (usedFacings - 1) * GAP) / usedFacings)
                : UNIT_W;
              return (
                <div key={level} style={{ marginBottom: GAP * 2, display: "flex", alignItems: "stretch", gap: 8 }}>
                  {/* 层号标签 */}
                  <div
                    style={{
                      width: 36,
                      minWidth: 36,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#6366f1",
                        background: "#eef2ff",
                        borderRadius: 6,
                        padding: "2px 6px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      第{level}层
                    </span>
                  </div>

                  {/* 货架层隔板背景：自适应宽度 */}
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
                      flex: 1,
                    }}
                  >
                    {levelItems.map((item) => (
                      <ProductCell
                        key={item.id}
                        item={item}
                        isTopQty={maxQtyIds.has(item.id)}
                        isTopAmount={maxAmountIds.has(item.id)}
                        unitWidth={scaledUnitW}
                        unitHeight={UNIT_H}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* 货架底座 */}
            <div
              style={{
                height: 12,
                background: "linear-gradient(180deg, #94a3b8 0%, #64748b 100%)",
                borderRadius: "0 0 8px 8px",
                marginTop: 4,
                boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
