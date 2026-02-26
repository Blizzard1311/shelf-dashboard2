import React, { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  Package,
  ShoppingCart,
  TrendingUp,
  Filter,
  X,
  Search,
  ChevronDown,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PAGE_SIZE = 20;

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

// ─────────────────────────────────────────────
// 看板统计卡片
// ─────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

function StatCard({ title, value, subtitle, icon, color, bgColor }: StatCardProps) {
  return (
    <div
      className="rounded-2xl p-5 flex items-start gap-4"
      style={{
        background: "white",
        boxShadow: "0 4px 20px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div
        className="rounded-xl p-3 flex-shrink-0"
        style={{ background: bgColor }}
      >
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
// 货架方块卡片（立体感）
// ─────────────────────────────────────────────
interface ShelfCardProps {
  shelfCode: string;
  totalSalesAmount: number;
  totalGrossProfit: number;
  totalSalesQty: number;
  productCount: number;
  rank: number;
  onViewPlanogram?: () => void;
}

function ShelfCard({ shelfCode, totalSalesAmount, totalGrossProfit, totalSalesQty, productCount, rank, onViewPlanogram }: ShelfCardProps) {
  const handleClick = () => { if (onViewPlanogram) onViewPlanogram(); };
  const colorSets = [
    { bg: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", shadow: "rgba(102,126,234,0.35)" },
    { bg: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", shadow: "rgba(245,87,108,0.35)" },
    { bg: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", shadow: "rgba(79,172,254,0.35)" },
    { bg: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)", shadow: "rgba(67,233,123,0.35)" },
    { bg: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)", shadow: "rgba(250,112,154,0.35)" },
    { bg: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)", shadow: "rgba(161,140,209,0.35)" },
    { bg: "linear-gradient(135deg, #fda085 0%, #f6d365 100%)", shadow: "rgba(253,160,133,0.35)" },
    { bg: "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)", shadow: "rgba(161,196,253,0.35)" },
    { bg: "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)", shadow: "rgba(132,250,176,0.35)" },
    { bg: "linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)", shadow: "rgba(150,230,161,0.35)" },
  ];
  const colorSet = colorSets[rank % colorSets.length];

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3 cursor-pointer select-none transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02]"
      onClick={handleClick}
      style={{
        background: colorSet.bg,
        boxShadow: `0 8px 24px ${colorSet.shadow}, 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.2)`,
        minHeight: 160,
      }}
    >
      {/* 货架编码 + 排名 */}
      <div className="flex items-center justify-between">
        <span
          className="text-sm font-bold px-3 py-1 rounded-full"
          style={{ background: "rgba(255,255,255,0.28)", color: "white" }}
        >
          {shelfCode}
        </span>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ background: "rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.85)" }}
        >
          #{rank + 1}
        </span>
      </div>

      {/* 销售金额 */}
      <div>
        <p className="text-xs font-medium mb-0.5" style={{ color: "rgba(255,255,255,0.72)" }}>
          销售金额
        </p>
        <p className="text-2xl font-bold" style={{ color: "white", textShadow: "0 1px 3px rgba(0,0,0,0.15)" }}>
          ¥ {fmtAmount(totalSalesAmount)}
        </p>
      </div>

      {/* 销售毛利 */}
      <div>
        <p className="text-xs font-medium mb-0.5" style={{ color: "rgba(255,255,255,0.72)" }}>
          销售毛利
        </p>
        <p className="text-xl font-bold" style={{ color: "white", textShadow: "0 1px 3px rgba(0,0,0,0.15)" }}>
          ¥ {fmtAmount(totalGrossProfit)}
        </p>
      </div>

      {/* 底部统计 */}
      <div className="flex gap-4 mt-auto pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.2)" }}>
        <div>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>销售数量</p>
          <p className="text-sm font-semibold" style={{ color: "white" }}>
            {fmtNumber(totalSalesQty)}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>SKU</p>
          <p className="text-sm font-semibold" style={{ color: "white" }}>
            {fmtNumber(productCount)}
          </p>
        </div>
        <div className="ml-auto flex items-center" style={{ color: "rgba(255,255,255,0.6)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 筛选对话框（货架编码筛选，仅在无大类筛选时使用）
// ─────────────────────────────────────────────
interface FilterDialogProps {
  shelfCodes: string[];
  selected: string[];
  onConfirm: (codes: string[]) => void;
  onClose: () => void;
}

function FilterDialog({ shelfCodes, selected, onConfirm, onClose }: FilterDialogProps) {
  const [search, setSearch] = useState("");
  const [localSelected, setLocalSelected] = useState<string[]>(selected);

  const filtered = shelfCodes.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (code: string) => {
    setLocalSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-md mx-4 flex flex-col gap-4"
        style={{
          background: "white",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          maxHeight: "80vh",
        }}
      >
        {/* 标题 */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Filter size={18} className="text-indigo-500" />
            筛选货架编码
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* 搜索框 */}
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ background: "#f5f7ff", border: "1.5px solid #e8ecff" }}
        >
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="搜索货架编码..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-gray-700 outline-none"
          />
        </div>

        {/* 全选/清空 */}
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setLocalSelected([...shelfCodes])}
            className="text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ background: "#eef2ff", color: "#4f46e5" }}
          >
            全选
          </button>
          <button
            onClick={() => setLocalSelected([])}
            className="text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ background: "#fef2f2", color: "#ef4444" }}
          >
            清空
          </button>
          <span className="ml-auto text-xs text-gray-400">
            已选 {localSelected.length} / {shelfCodes.length}
          </span>
        </div>

        {/* 货架编码列表 */}
        <div className="overflow-y-auto flex-1" style={{ maxHeight: 280 }}>
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((code) => {
              const isSelected = localSelected.includes(code);
              return (
                <button
                  key={code}
                  onClick={() => toggle(code)}
                  className="text-left px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150"
                  style={{
                    background: isSelected ? "#4f46e5" : "#f5f7ff",
                    color: isSelected ? "white" : "#374151",
                    border: isSelected ? "1.5px solid #4f46e5" : "1.5px solid transparent",
                    boxShadow: isSelected ? "0 2px 8px rgba(79,70,229,0.3)" : "none",
                  }}
                >
                  {code}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="col-span-2 text-center text-sm text-gray-400 py-4">无匹配结果</p>
            )}
          </div>
        </div>

        {/* 确认按钮 */}
        <Button
          onClick={() => { onConfirm(localSelected); onClose(); }}
          className="w-full rounded-xl font-semibold text-white"
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            border: "none",
            boxShadow: "0 4px 15px rgba(102,126,234,0.4)",
          }}
        >
          确认筛选
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 分页控件
// ─────────────────────────────────────────────
interface PaginationProps {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

function Pagination({ page, total, pageSize, onChange }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: "1px solid #f0f4ff" }}>
      <span className="text-xs text-gray-400">
        第 {start}–{end} 条，共 {total} 个货架
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: page <= 1 ? "#f5f7ff" : "white",
            border: "1.5px solid #e8ecff",
            color: "#4f46e5",
          }}
        >
          <ChevronLeft size={15} />
        </button>

        {/* 页码按钮：最多显示5个 */}
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => {
            if (totalPages <= 5) return true;
            if (p === 1 || p === totalPages) return true;
            return Math.abs(p - page) <= 1;
          })
          .reduce<(number | "...")[]>((acc, p, idx, arr) => {
            if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
              acc.push("...");
            }
            acc.push(p);
            return acc;
          }, [])
          .map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-gray-400">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onChange(p as number)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: p === page ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "white",
                  border: p === page ? "none" : "1.5px solid #e8ecff",
                  color: p === page ? "white" : "#374151",
                  boxShadow: p === page ? "0 2px 8px rgba(102,126,234,0.4)" : "none",
                }}
              >
                {p}
              </button>
            )
          )
        }

        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: page >= totalPages ? "#f5f7ff" : "white",
            border: "1.5px solid #e8ecff",
            color: "#4f46e5",
          }}
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 主页面
// ─────────────────────────────────────────────
export default function ShelfPerspective() {
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [page, setPage] = useState(1);
  const [, setLocation] = useLocation();

  // 获取最新 sessionId
  const { data: sessionData, isLoading: sessionLoading } =
    trpc.shelf.latestSession.useQuery();
  const sessionId = sessionData?.sessionId ?? null;

  // 看板统计
  const { data: stats, isLoading: statsLoading } =
    trpc.shelf.dashboardStats.useQuery(
      { sessionId: sessionId! },
      { enabled: sessionId != null }
    );

  // 大类列表（用于筛选器下拉）
  const { data: categoryList = [] } =
    trpc.shelf.categoryList.useQuery(
      { sessionId: sessionId! },
      { enabled: sessionId != null }
    );

  // 分页货架列表（支持大类筛选）
  const { data: pagedData, isLoading: listLoading } =
    trpc.shelf.shelfListPaged.useQuery(
      {
        sessionId: sessionId!,
        page,
        pageSize: PAGE_SIZE,
        category: selectedCategory || undefined,
      },
      { enabled: sessionId != null }
    );

  const shelfList = pagedData?.rows ?? [];
  const totalShelves = pagedData?.total ?? 0;

  // 货架编码列表（筛选对话框用，仅在无大类筛选时使用）
  const { data: shelfCodes = [] } =
    trpc.shelf.shelfCodes.useQuery(
      { sessionId: sessionId! },
      { enabled: sessionId != null }
    );

  // 切换大类时重置页码
  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setPage(1);
    setSelectedCodes([]);
  };

  // 切换页码
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const isLoading = sessionLoading || statsLoading || listLoading;
  const hasData = sessionId != null;

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
            请先前往「数据上传」模块上传商品储位信息，上传成功后货架透视数据将自动显示。
          </p>
          <a
            href="/upload"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              boxShadow: "0 4px 15px rgba(102,126,234,0.4)",
            }}
          >
            前往数据上传
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── 顶部操作栏 ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* 大类筛选器 */}
        <div className="flex items-center gap-2 flex-wrap">
          {categoryList.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 font-medium">大类：</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => handleCategoryChange("")}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                  style={{
                    background: selectedCategory === "" ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "#f5f7ff",
                    color: selectedCategory === "" ? "white" : "#374151",
                    border: selectedCategory === "" ? "none" : "1.5px solid #e8ecff",
                    boxShadow: selectedCategory === "" ? "0 2px 8px rgba(102,126,234,0.35)" : "none",
                  }}
                >
                  全部
                </button>
                {categoryList.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                    style={{
                      background: selectedCategory === cat ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "#f5f7ff",
                      color: selectedCategory === cat ? "white" : "#374151",
                      border: selectedCategory === cat ? "none" : "1.5px solid #e8ecff",
                      boxShadow: selectedCategory === cat ? "0 2px 8px rgba(102,126,234,0.35)" : "none",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 货架编码筛选按钮 */}
        <div className="flex items-center gap-2 flex-wrap">
          {selectedCodes.length > 0 && (
            <Badge
              variant="secondary"
              className="flex items-center gap-1 cursor-pointer px-3 py-1.5 rounded-xl"
              onClick={() => setSelectedCodes([])}
              style={{ background: "#eef2ff", color: "#4f46e5" }}
            >
              已筛选 {selectedCodes.length} 个货架
              <X size={12} />
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterOpen(true)}
            disabled={!hasData}
            className="flex items-center gap-2 rounded-xl font-medium"
            style={{
              background: "white",
              border: "1.5px solid #e8ecff",
              color: "#4f46e5",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            <Filter size={15} />
            筛选货架
            <ChevronDown size={14} />
          </Button>
        </div>
      </div>

      {/* ── 数据看板（4个统计卡片）── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="货架总数"
          value={isLoading ? "…" : fmtNumber(stats?.totalShelfCodes)}
          subtitle="组"
          icon={<Package size={22} />}
          color="#4f46e5"
          bgColor="#eef2ff"
        />
        <StatCard
          title="商品数量"
          value={isLoading ? "…" : fmtNumber(stats?.totalProductCodes)}
          subtitle="SKU"
          icon={<ShoppingCart size={22} />}
          color="#0891b2"
          bgColor="#ecfeff"
        />
        <StatCard
          title="销售总金额"
          value={isLoading ? "…" : `¥ ${fmtAmount(stats?.totalSalesAmount)}`}
          subtitle="元"
          icon={<TrendingUp size={22} />}
          color="#059669"
          bgColor="#ecfdf5"
        />
        <StatCard
          title="储位记录数"
          value={isLoading ? "…" : fmtNumber(stats?.totalRows)}
          subtitle="条储位记录"
          icon={<BarChart3 size={22} />}
          color="#d97706"
          bgColor="#fffbeb"
        />
      </div>

      {/* ── 货架方块区域 ── */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: "white",
          boxShadow: "0 4px 20px rgba(0,0,0,0.07)",
        }}
      >
        {/* 区域标题 */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div
              className="w-1 h-5 rounded-full"
              style={{ background: "linear-gradient(180deg, #667eea, #764ba2)" }}
            />
            <h2 className="text-base font-bold text-gray-700">
              货架销售总览
            </h2>
            {selectedCategory && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium ml-1"
                style={{ background: "#eef2ff", color: "#4f46e5" }}
              >
                {selectedCategory}
              </span>
            )}
          </div>
          {isLoading && (
            <RefreshCw size={16} className="text-gray-400 animate-spin" />
          )}
        </div>

        {/* 货架方块网格 */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl animate-pulse"
                style={{ height: 160, background: "#f0f4ff" }}
              />
            ))}
          </div>
        ) : shelfList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="rounded-full p-4" style={{ background: "#f5f7ff" }}>
              <Package size={28} className="text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">
              {selectedCategory ? `大类「${selectedCategory}」无货架数据` : "暂无货架数据"}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {shelfList.map((shelf, idx) => (
                <ShelfCard
                  key={shelf.shelfCode}
                  shelfCode={shelf.shelfCode}
                  totalSalesAmount={Number(shelf.totalSalesAmount)}
                  totalGrossProfit={Number((shelf as any).totalGrossProfit ?? 0)}
                  totalSalesQty={Number(shelf.totalSalesQty)}
                  productCount={Number(shelf.productCount)}
                  rank={(page - 1) * PAGE_SIZE + idx}
                  onViewPlanogram={() => setLocation(`/planogram/${encodeURIComponent(shelf.shelfCode)}`)}
                />
              ))}
            </div>

            {/* 分页控件 */}
            <Pagination
              page={page}
              total={totalShelves}
              pageSize={PAGE_SIZE}
              onChange={handlePageChange}
            />
          </>
        )}
      </div>

      {/* 筛选对话框 */}
      {filterOpen && (
        <FilterDialog
          shelfCodes={shelfCodes}
          selected={selectedCodes}
          onConfirm={(codes) => {
            setSelectedCodes(codes);
            setPage(1);
          }}
          onClose={() => setFilterOpen(false)}
        />
      )}
    </div>
  );
}
