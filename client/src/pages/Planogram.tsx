import React, { useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Package, TrendingUp, DollarSign, BarChart3 } from "lucide-react";

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

  // ── 汇总统计 ──
  const summary = useMemo(() => {
    const totalAmount = items.reduce((s, i) => s + Number(i.salesAmount ?? 0), 0);
    const totalQty = items.reduce((s, i) => s + (i.salesQty ?? 0), 0);
    const totalProfit = items.reduce((s, i) => s + Number(i.grossProfit ?? 0), 0);
    const productCount = new Set(items.map(i => i.productCode).filter(Boolean)).size;
    return { totalAmount, totalQty, totalProfit, productCount };
  }, [items]);

  // 方块尺寸
  const UNIT_W = 100;
  const UNIT_H = 110;
  const GAP = 4;

  return (
    <div
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
          返回货架总览
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            货架陈列图 — <span style={{ color: "#6366f1" }}>{shelfCode}</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">按层从下到上 · 储位从左到右 · 陈列面数决定方块宽度</p>
        </div>
      </div>

      {/* 汇总看板 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "商品种数", value: summary.productCount + " 种", icon: <Package size={18} />, color: "#6366f1" },
          { label: "销售数量", value: fmtQty(summary.totalQty), icon: <BarChart3 size={18} />, color: "#10b981" },
          { label: "销售金额", value: "¥" + fmtAmount(summary.totalAmount), icon: <TrendingUp size={18} />, color: "#f59e0b" },
          { label: "销售毛利", value: "¥" + fmtAmount(summary.totalProfit), icon: <DollarSign size={18} />, color: "#ef4444" },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl p-4"
            style={{
              background: "white",
              boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
              borderLeft: `4px solid ${card.color}`,
            }}
          >
            <div className="flex items-center gap-2 mb-1" style={{ color: card.color }}>
              {card.icon}
              <span className="text-xs font-medium text-gray-500">{card.label}</span>
            </div>
            <p className="text-xl font-bold text-gray-800">{card.value}</p>
          </div>
        ))}
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
          className="rounded-2xl overflow-auto"
          style={{
            background: "white",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
            padding: "24px",
          }}
        >
          {/* 货架外框 */}
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
            {levelGroups.map(([level, levelItems]) => (
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

                {/* 货架层隔板背景 */}
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
                  }}
                >
                  {levelItems.map((item) => (
                    <ProductCell
                      key={item.id}
                      item={item}
                      isTopQty={maxQtyIds.has(item.id)}
                      isTopAmount={maxAmountIds.has(item.id)}
                      unitWidth={UNIT_W}
                      unitHeight={UNIT_H}
                    />
                  ))}
                </div>
              </div>
            ))}

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
