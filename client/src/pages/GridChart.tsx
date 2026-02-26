import React, { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Package,
  Activity,
  ChevronRight,
  RefreshCw,
  BarChart2,
  Layers,
  FileDown,
  AlertTriangle,
} from "lucide-react";

// ─────────────────────────────────────────────
// 数字格式化
// ─────────────────────────────────────────────
function fmtAmount(val: number | null | undefined): string {
  if (val == null || isNaN(Number(val))) return "—";
  const n = Number(val);
  if (n >= 10000) return (n / 10000).toFixed(1) + " 万";
  return n.toLocaleString("zh-CN", { maximumFractionDigits: 0 });
}

function fmtNumber(val: number | null | undefined): string {
  if (val == null) return "—";
  return Number(val).toLocaleString("zh-CN");
}

function fmtEfficiency(salesAmount: number, facings: number): string {
  if (!facings || facings === 0) return "—";
  const eff = salesAmount / facings;
  return `¥${eff.toFixed(0)}`;
}

// ─────────────────────────────────────────────
// 健康状态评级
// ─────────────────────────────────────────────
type HealthLevel = "good" | "warning" | "danger";

function getHealthLevel(
  salesAmount: number,
  facings: number,
  zeroSalesCount: number,
  productCount: number,
  avgEfficiency: number
): HealthLevel {
  const zeroRatio = productCount > 0 ? zeroSalesCount / productCount : 0;
  const eff = facings > 0 ? salesAmount / facings : 0;
  if (zeroRatio >= 0.4 || eff < avgEfficiency * 0.3) return "danger";
  if (zeroRatio >= 0.2 || eff < avgEfficiency * 0.6) return "warning";
  return "good";
}

const healthConfig: Record<HealthLevel, { label: string; color: string; bg: string; dot: string }> = {
  good:    { label: "良好", color: "#059669", bg: "#ecfdf5", dot: "#10b981" },
  warning: { label: "需关注", color: "#d97706", bg: "#fffbeb", dot: "#f59e0b" },
  danger:  { label: "严重", color: "#dc2626", bg: "#fef2f2", dot: "#ef4444" },
};

// ─────────────────────────────────────────────
// 顶部汇总指标卡
// ─────────────────────────────────────────────
interface SummaryCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

function SummaryCard({ title, value, subtitle, icon, color, bgColor }: SummaryCardProps) {
  return (
    <div
      className="rounded-2xl p-5 flex items-start gap-4"
      style={{
        background: "white",
        boxShadow: "0 4px 20px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div className="rounded-xl p-3 flex-shrink-0" style={{ background: bgColor }}>
        <div style={{ color }}>{icon}</div>
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-800 leading-tight">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 大类效率行
// ─────────────────────────────────────────────
interface CategoryRowProps {
  category: string;
  totalFacings: number;
  totalSalesAmount: number;
  totalGrossProfit: number;
  zeroSalesCount: number;
  productCount: number;
  maxEfficiency: number;
}

function CategoryRow({
  category,
  totalFacings,
  totalSalesAmount,
  totalGrossProfit,
  zeroSalesCount,
  productCount,
  maxEfficiency,
}: CategoryRowProps) {
  const eff = totalFacings > 0 ? totalSalesAmount / totalFacings : 0;
  const barWidth = maxEfficiency > 0 ? Math.min(100, (eff / maxEfficiency) * 100) : 0;
  const zeroRatio = productCount > 0 ? (zeroSalesCount / productCount) * 100 : 0;

  return (
    <div className="flex items-center gap-4 py-3" style={{ borderBottom: "1px solid #f0f4ff" }}>
      <div className="w-24 flex-shrink-0">
        <span className="text-sm font-semibold text-gray-700 truncate block">{category || "未分类"}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400">{fmtEfficiency(totalSalesAmount, totalFacings)}/面</span>
          <span className="text-xs text-gray-400">{totalFacings} 排面</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "#f0f4ff" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${barWidth}%`,
              background: "linear-gradient(90deg, #667eea, #764ba2)",
            }}
          />
        </div>
      </div>
      <div className="w-28 flex-shrink-0 text-right">
        <p className="text-sm font-bold text-gray-700">¥{fmtAmount(totalSalesAmount)}</p>
        <p className="text-xs text-gray-400">毛利 ¥{fmtAmount(totalGrossProfit)}</p>
      </div>
      <div className="w-20 flex-shrink-0 text-right">
        {zeroSalesCount > 0 ? (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: "#fef2f2", color: "#dc2626" }}
          >
            {zeroSalesCount} 个0动销
          </span>
        ) : (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: "#ecfdf5", color: "#059669" }}
          >
            全动销
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 货架效率卡片（第一层列表）
// ─────────────────────────────────────────────
interface ShelfEfficiencyCardProps {
  shelfCode: string;
  totalFacings: number;
  totalSalesAmount: number;
  totalGrossProfit: number;
  totalSalesQty: number;
  productCount: number;
  zeroSalesCount: number;
  zeroSalesFacings: number;
  avgEfficiency: number;
  onClick: () => void;
}

function ShelfEfficiencyCard({
  shelfCode,
  totalFacings,
  totalSalesAmount,
  totalGrossProfit,
  totalSalesQty,
  productCount,
  zeroSalesCount,
  zeroSalesFacings,
  avgEfficiency,
  onClick,
}: ShelfEfficiencyCardProps) {
  const eff = totalFacings > 0 ? totalSalesAmount / totalFacings : 0;
  const health = getHealthLevel(totalSalesAmount, totalFacings, zeroSalesCount, productCount, avgEfficiency);
  const hc = healthConfig[health];
  const validFacings = totalFacings - (zeroSalesFacings || 0);
  const validFacingRate = totalFacings > 0 ? (validFacings / totalFacings) * 100 : 0;

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      onClick={onClick}
      style={{
        background: "white",
        boxShadow: "0 4px 16px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)",
        border: `1.5px solid ${health === "danger" ? "#fecaca" : health === "warning" ? "#fde68a" : "#e8ecff"}`,
      }}
    >
      {/* 货架编码 + 健康状态 */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-gray-800">{shelfCode}</span>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
          style={{ background: hc.bg, color: hc.color }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full inline-block"
            style={{ background: hc.dot }}
          />
          {hc.label}
        </span>
      </div>

      {/* 排面效率（核心指标） */}
      <div>
        <p className="text-xs text-gray-400 mb-0.5">排面效率</p>
        <p className="text-xl font-bold" style={{ color: health === "danger" ? "#dc2626" : health === "warning" ? "#d97706" : "#059669" }}>
          {fmtEfficiency(totalSalesAmount, totalFacings)}<span className="text-xs font-normal text-gray-400 ml-1">/面</span>
        </p>
      </div>

      {/* 有效排面率进度条 */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400">有效排面率</span>
          <span className="text-xs font-semibold" style={{ color: validFacingRate >= 80 ? "#059669" : validFacingRate >= 60 ? "#d97706" : "#dc2626" }}>
            {validFacingRate.toFixed(0)}%
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#f0f4ff" }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${validFacingRate}%`,
              background: validFacingRate >= 80 ? "#10b981" : validFacingRate >= 60 ? "#f59e0b" : "#ef4444",
            }}
          />
        </div>
      </div>

      {/* 底部统计 */}
      <div className="flex gap-3 pt-2" style={{ borderTop: "1px solid #f5f7ff" }}>
        <div>
          <p className="text-xs text-gray-400">销售额</p>
          <p className="text-xs font-semibold text-gray-700">¥{fmtAmount(totalSalesAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">排面</p>
          <p className="text-xs font-semibold text-gray-700">{totalFacings}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">0动销</p>
          <p className="text-xs font-semibold" style={{ color: zeroSalesCount > 0 ? "#dc2626" : "#059669" }}>
            {zeroSalesCount}
          </p>
        </div>
        <div className="ml-auto flex items-center" style={{ color: "#c7d2fe" }}>
          <ChevronRight size={14} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 主页面：货架生命力透视（第一层）
// ─────────────────────────────────────────────
export default function GridChart() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [planMode, setPlanMode] = useState<"category" | "urgent">("category");
  const [showPlanPanel, setShowPlanPanel] = useState(false);

  // 获取最新 sessionId
  const { data: sessionData, isLoading: sessionLoading } =
    trpc.shelf.latestSession.useQuery();
  const sessionId = sessionData?.sessionId ?? null;

  // 全场汇总指标
  const { data: overallStats, isLoading: overallLoading } =
    trpc.shelf.overallEfficiency.useQuery(
      { sessionId: sessionId! },
      { enabled: sessionId != null }
    );

  // 大类列表
  const { data: categoryList = [] } =
    trpc.shelf.categoryList.useQuery(
      { sessionId: sessionId! },
      { enabled: sessionId != null }
    );

  // 大类效率列表
  const { data: categoryEfficiency = [], isLoading: catLoading } =
    trpc.shelf.categoryEfficiency.useQuery(
      { sessionId: sessionId! },
      { enabled: sessionId != null }
    );

  // 全货架效率列表（按大类筛选）
  const { data: shelfEfficiencyList = [], isLoading: shelfLoading } =
    trpc.shelf.shelfEfficiencyList.useQuery(
      { sessionId: sessionId!, category: selectedCategory || undefined },
      { enabled: sessionId != null }
    );

  const isLoading = sessionLoading || overallLoading || catLoading || shelfLoading;

  // 计算全场平均排面效率（用于健康评级基准）
  const totalFacings = Number(overallStats?.totalFacings ?? 0);
  const totalSalesAmount = Number(overallStats?.totalSalesAmount ?? 0);
  const avgEfficiency = totalFacings > 0 ? totalSalesAmount / totalFacings : 0;

  // 大类效率最大值（用于进度条）
  const maxCatEfficiency = Math.max(
    ...categoryEfficiency.map(c => {
      const f = Number(c.totalFacings);
      const s = Number(c.totalSalesAmount);
      return f > 0 ? s / f : 0;
    }),
    1
  );

  // 货架列表按排面效率从低到高排序
  const sortedShelves = [...shelfEfficiencyList].sort((a, b) => {
    const effA = Number(a.totalFacings) > 0 ? Number(a.totalSalesAmount) / Number(a.totalFacings) : 0;
    const effB = Number(b.totalFacings) > 0 ? Number(b.totalSalesAmount) / Number(b.totalFacings) : 0;
    return effA - effB;
  });

  // 健康状态统计
  const dangerCount = sortedShelves.filter(s =>
    getHealthLevel(Number(s.totalSalesAmount), Number(s.totalFacings), Number(s.zeroSalesCount), Number(s.productCount), avgEfficiency) === "danger"
  ).length;
  const warningCount = sortedShelves.filter(s =>
    getHealthLevel(Number(s.totalSalesAmount), Number(s.totalFacings), Number(s.zeroSalesCount), Number(s.productCount), avgEfficiency) === "warning"
  ).length;

  // ── 无数据状态 ──
  if (!sessionLoading && sessionId == null) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
        <div
          className="rounded-2xl p-8 flex flex-col items-center gap-4 text-center"
          style={{ background: "white", boxShadow: "0 4px 20px rgba(0,0,0,0.07)" }}
        >
          <div className="rounded-full p-4" style={{ background: "#fef3c7" }}>
            <AlertCircle size={32} className="text-amber-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-700">暂无数据</h3>
          <p className="text-sm text-gray-500 max-w-xs">
            请先前往「数据上传」模块上传商品储位信息，上传成功后货架生命力透视数据将自动显示。
          </p>
          <a
            href="/upload"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{
              background: "linear-gradient(135deg, oklch(0.65 0.15 185), oklch(0.60 0.18 200))",
              boxShadow: "0 4px 15px oklch(0.65 0.15 185 / 0.4)",
            }}
          >
            前往数据上传
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">

      {/* ── 顶部汇总指标卡 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="总排面数"
          value={isLoading ? "…" : fmtNumber(overallStats?.totalFacings)}
          subtitle="陈列资源总量"
          icon={<Layers size={22} />}
          color="#4f46e5"
          bgColor="#eef2ff"
        />
        <SummaryCard
          title="平均排面效率"
          value={isLoading ? "…" : `${fmtEfficiency(totalSalesAmount, totalFacings)}/面`}
          subtitle="销售额 ÷ 排面数"
          icon={<Activity size={22} />}
          color="#0891b2"
          bgColor="#ecfeff"
        />
        <SummaryCard
          title="0动销商品"
          value={isLoading ? "…" : fmtNumber(overallStats?.zeroSalesCount)}
          subtitle={`浪费 ${fmtNumber(overallStats?.zeroSalesFacings)} 个排面`}
          icon={<TrendingDown size={22} />}
          color="#dc2626"
          bgColor="#fef2f2"
        />
        <SummaryCard
          title="货架健康预警"
          value={isLoading ? "…" : String(dangerCount + warningCount)}
          subtitle={`严重 ${dangerCount} · 需关注 ${warningCount}`}
          icon={<TrendingUp size={22} />}
          color="#d97706"
          bgColor="#fffbeb"
        />
      </div>

      {/* ── 大类排面效率分析 ── */}
      {categoryEfficiency.length > 0 && (
        <div
          className="rounded-2xl p-6"
          style={{ background: "white", boxShadow: "0 4px 20px rgba(0,0,0,0.07)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #667eea, #764ba2)" }} />
            <h2 className="text-base font-bold text-gray-700">大类排面效率分析</h2>
            {catLoading && <RefreshCw size={14} className="text-gray-400 animate-spin ml-1" />}
          </div>
          <div>
            {categoryEfficiency.map((cat) => (
              <CategoryRow
                key={cat.category1}
                category={cat.category1 ?? ""}
                totalFacings={Number(cat.totalFacings)}
                totalSalesAmount={Number(cat.totalSalesAmount)}
                totalGrossProfit={Number(cat.totalGrossProfit)}
                zeroSalesCount={Number(cat.zeroSalesCount)}
                productCount={Number(cat.productCount)}
                maxEfficiency={maxCatEfficiency}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── 货架效率列表 ── */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "white", boxShadow: "0 4px 20px rgba(0,0,0,0.07)" }}
      >
        {/* 区域标题 + 大类筛选 */}
        <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, oklch(0.65 0.15 185), oklch(0.60 0.18 200))" }} />
            <h2 className="text-base font-bold text-gray-700">货架效率排行</h2>
            <span className="text-xs text-gray-400 ml-1">（效率最低的排在最前）</span>
            {shelfLoading && <RefreshCw size={14} className="text-gray-400 animate-spin" />}
            <button
              onClick={() => setShowPlanPanel(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all ml-2"
              style={{
                background: showPlanPanel ? "#4f46e5" : "linear-gradient(135deg, #6366f1, #0891b2)",
                boxShadow: "0 2px 8px rgba(99,102,241,0.35)",
              }}
            >
              <FileDown size={13} />
              生成调整方案
            </button>
          </div>
          {/* 大类筛选器 */}
          {categoryList.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 font-medium">大类：</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedCategory("")}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                  style={{
                    background: selectedCategory === "" ? "linear-gradient(135deg, oklch(0.65 0.15 185), oklch(0.60 0.18 200))" : "#f5f7ff",
                    color: selectedCategory === "" ? "white" : "#374151",
                    border: selectedCategory === "" ? "none" : "1.5px solid #e8ecff",
                    boxShadow: selectedCategory === "" ? "0 2px 8px oklch(0.65 0.15 185 / 0.35)" : "none",
                  }}
                >
                  全部
                </button>
                {categoryList.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                    style={{
                      background: selectedCategory === cat ? "linear-gradient(135deg, oklch(0.65 0.15 185), oklch(0.60 0.18 200))" : "#f5f7ff",
                      color: selectedCategory === cat ? "white" : "#374151",
                      border: selectedCategory === cat ? "none" : "1.5px solid #e8ecff",
                      boxShadow: selectedCategory === cat ? "0 2px 8px oklch(0.65 0.15 185 / 0.35)" : "none",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 调整方案配置面板 */}
        {showPlanPanel && (
          <div
            className="mb-5 p-4 rounded-2xl"
            style={{ background: "#f8faff", border: "1.5px solid #e0e7ff" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <FileDown size={15} className="text-indigo-500" />
              <span className="text-sm font-bold text-gray-700">生成调整方案</span>
              <span className="text-xs text-gray-400">— 选择模式后点击确认生成</span>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              {/* 模式选择 */}
              <div className="flex gap-2">
                <button
                  onClick={() => setPlanMode("category")}
                  className="text-xs px-3 py-2 rounded-lg font-medium transition-all"
                  style={{
                    background: planMode === "category" ? "#4f46e5" : "white",
                    color: planMode === "category" ? "white" : "#374151",
                    border: planMode === "category" ? "none" : "1.5px solid #e8ecff",
                    boxShadow: planMode === "category" ? "0 2px 8px rgba(79,70,229,0.3)" : "0 1px 4px rgba(0,0,0,0.05)",
                  }}
                >
                  按大类调整
                </button>
                <button
                  onClick={() => setPlanMode("urgent")}
                  className="text-xs px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-1"
                  style={{
                    background: planMode === "urgent" ? "#dc2626" : "white",
                    color: planMode === "urgent" ? "white" : "#374151",
                    border: planMode === "urgent" ? "none" : "1.5px solid #fecaca",
                    boxShadow: planMode === "urgent" ? "0 2px 8px rgba(220,38,38,0.3)" : "0 1px 4px rgba(0,0,0,0.05)",
                  }}
                >
                  <AlertTriangle size={12} />
                  紧急问题优先
                </button>
              </div>

              {/* 按大类模式：选择具体大类 */}
              {planMode === "category" && categoryList.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500">选择大类：</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setSelectedCategory("")}
                      className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all"
                      style={{
                        background: selectedCategory === "" ? "#4f46e5" : "white",
                        color: selectedCategory === "" ? "white" : "#374151",
                        border: selectedCategory === "" ? "none" : "1.5px solid #e8ecff",
                      }}
                    >
                      全部
                    </button>
                    {categoryList.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all"
                        style={{
                          background: selectedCategory === cat ? "#4f46e5" : "white",
                          color: selectedCategory === cat ? "white" : "#374151",
                          border: selectedCategory === cat ? "none" : "1.5px solid #e8ecff",
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 紧急模式说明 */}
              {planMode === "urgent" && (
                <span className="text-xs text-gray-500 px-3 py-2 rounded-lg" style={{ background: "#fff5f5", border: "1px solid #fecaca" }}>
                  <AlertTriangle size={11} className="inline mr-1 text-red-500" />
                  跨大类汇总所有15动销商品及排面效率最低的 30% 货架
                </span>
              )}

              {/* 预计规模 */}
              <span className="text-xs text-gray-400">
                预计涉及：
                {planMode === "urgent"
                  ? `${sortedShelves.filter(s => Number(s.zeroSalesCount) > 0 || getHealthLevel(Number(s.totalSalesAmount), Number(s.totalFacings), Number(s.zeroSalesCount), Number(s.productCount), avgEfficiency) === "danger").length} 组货架`
                  : `${sortedShelves.length} 组货架`
                }
              </span>

              {/* 确认按钮 */}
              <button
                onClick={() => {
                  const targetShelves = planMode === "urgent"
                    ? sortedShelves.filter(s =>
                        Number(s.zeroSalesCount) > 0 ||
                        getHealthLevel(Number(s.totalSalesAmount), Number(s.totalFacings), Number(s.zeroSalesCount), Number(s.productCount), avgEfficiency) === "danger"
                      )
                    : sortedShelves;
                  // 跳转到第一个货架的详细诊断页，用户可在那里调整并生成方案
                  // 如果只有一个货架，直接跳转
                  if (targetShelves.length === 1) {
                    setLocation(`/vitality/${encodeURIComponent(targetShelves[0].shelfCode)}`);
                  } else if (targetShelves.length > 1) {
                    // 多个货架：将货架编码列表传入第一个货架的详细页，附带其他货架信息
                    const codes = targetShelves.map(s => s.shelfCode);
                    const params = new URLSearchParams({
                      mode: planMode,
                      category: selectedCategory || "",
                      shelves: codes.join(","),
                    });
                    setLocation(`/vitality/${encodeURIComponent(targetShelves[0].shelfCode)}?${params.toString()}`);
                  }
                  setShowPlanPanel(false);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all"
                style={{
                  background: planMode === "urgent" ? "linear-gradient(135deg, #dc2626, #d97706)" : "linear-gradient(135deg, #6366f1, #0891b2)",
                  boxShadow: planMode === "urgent" ? "0 2px 8px rgba(220,38,38,0.35)" : "0 2px 8px rgba(99,102,241,0.35)",
                }}
              >
                <FileDown size={13} />
                开始诊断并生成方案
              </button>
            </div>
          </div>
        )}

        {/* 货架卡片网格 */}
        {shelfLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-2xl animate-pulse" style={{ height: 180, background: "#f0f4ff" }} />
            ))}
          </div>
        ) : sortedShelves.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="rounded-full p-4" style={{ background: "#f5f7ff" }}>
              <Package size={28} className="text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">
              {selectedCategory ? `大类「${selectedCategory}」无货架数据` : "暂无货架数据"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {sortedShelves.map((shelf) => (
              <ShelfEfficiencyCard
                key={shelf.shelfCode}
                shelfCode={shelf.shelfCode}
                totalFacings={Number(shelf.totalFacings)}
                totalSalesAmount={Number(shelf.totalSalesAmount)}
                totalGrossProfit={Number(shelf.totalGrossProfit)}
                totalSalesQty={Number(shelf.totalSalesQty)}
                productCount={Number(shelf.productCount)}
                zeroSalesCount={Number(shelf.zeroSalesCount)}
                zeroSalesFacings={Number(shelf.zeroSalesFacings)}
                avgEfficiency={avgEfficiency}
                onClick={() => setLocation(`/vitality/${encodeURIComponent(shelf.shelfCode)}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
