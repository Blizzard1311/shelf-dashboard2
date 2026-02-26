import { Link } from "wouter";
import { Upload, BarChart3, Grid3X3, ArrowRight, TrendingUp, Database, Activity } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";

const featureCards = [
  {
    key: "upload",
    label: "数据上传",
    icon: Upload,
    path: "/upload",
    gradient: "from-blue-500 to-indigo-600",
    bgGradient: "linear-gradient(135deg, oklch(0.55 0.18 260), oklch(0.50 0.20 280))",
    shadowColor: "oklch(0.55 0.18 260 / 0.35)",
    description: "上传并管理货架数据文件，支持多种格式导入",
    stats: "支持 CSV / Excel / JSON",
    statIcon: Database,
  },
  {
    key: "perspective",
    label: "货架卡看板",
    icon: BarChart3,
    path: "/perspective",
    gradient: "from-violet-500 to-purple-600",
    bgGradient: "linear-gradient(135deg, oklch(0.55 0.18 300), oklch(0.48 0.22 310))",
    shadowColor: "oklch(0.55 0.18 300 / 0.35)",
    description: "全场货架全局扫描，快速发现销售异常货架",
    stats: "排面动效率 · 销售总金额",
    statIcon: TrendingUp,
  },
  {
    key: "grid",
    label: "货架生命力透视",
    icon: Grid3X3,
    path: "/grid",
    gradient: "from-teal-500 to-cyan-600",
    bgGradient: "linear-gradient(135deg, oklch(0.65 0.15 185), oklch(0.60 0.18 200))",
    shadowColor: "oklch(0.65 0.15 185 / 0.35)",
    description: "深入单组货架诊断，排面效率色阶可视化",
    stats: "效率色阶 · 排面调整模拟",
    statIcon: Activity,
  },
];

const statCards = [
  { label: "数据集总数", value: "—", unit: "个", color: "oklch(0.55 0.18 260)" },
  { label: "本月上传", value: "—", unit: "次", color: "oklch(0.55 0.18 300)" },
  { label: "货架数量", value: "—", unit: "个", color: "oklch(0.65 0.15 185)" },
  { label: "最近更新", value: "—", unit: "", color: "oklch(0.65 0.18 50)" },
];

export default function Dashboard() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border-3 border-t-transparent animate-spin"
            style={{ borderColor: "oklch(0.55 0.18 260)", borderTopColor: "transparent" }}
          />
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-full px-4">
        <div className="text-center max-w-sm">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{
              background: "linear-gradient(135deg, oklch(0.55 0.18 260), oklch(0.50 0.20 280))",
              boxShadow: "0 8px 24px oklch(0.55 0.18 260 / 0.35)",
            }}
          >
            <Database className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">请先登录</h2>
          <p className="text-sm text-muted-foreground mb-6">
            货架数据平台是内部系统，需要登录后才能访问。
          </p>
          <a href={getLoginUrl()}>
            <Button
              className="px-6"
              style={{
                background: "linear-gradient(135deg, oklch(0.55 0.18 260), oklch(0.50 0.20 280))",
                boxShadow: "0 4px 12px oklch(0.55 0.18 260 / 0.4)",
              }}
            >
              立即登录
            </Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* 欢迎横幅 */}
      <div
        className="relative rounded-2xl p-5 lg:p-6 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, oklch(0.55 0.18 260), oklch(0.48 0.22 290))",
          boxShadow: "0 8px 32px oklch(0.55 0.18 260 / 0.30)",
        }}
      >
        {/* 装饰圆圈 */}
        <div
          className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10"
          style={{ background: "white" }}
        />
        <div
          className="absolute -bottom-6 right-16 w-24 h-24 rounded-full opacity-10"
          style={{ background: "white" }}
        />
        <div className="relative z-10">
          <p className="text-white/70 text-sm mb-1">欢迎回来</p>
          <h2 className="text-white text-xl lg:text-2xl font-bold mb-1">
            {user?.name || user?.email || "用户"}
          </h2>
          <p className="text-white/60 text-sm">货架效率透析系统 · 内部管理系统</p>
        </div>
      </div>

      {/* 统计卡片行 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="card-elevated bg-card rounded-xl p-4 transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <div
                className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
                style={{ background: stat.color }}
              />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-foreground">{stat.value}</span>
              {stat.unit && (
                <span className="text-xs text-muted-foreground">{stat.unit}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 功能模块卡片 */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          功能模块
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {featureCards.map((card) => {
            const Icon = card.icon;
            const StatIcon = card.statIcon;
            return (
              <Link key={card.key} href={card.path}>
                <div
                  className="card-elevated bg-card rounded-2xl p-5 cursor-pointer group transition-all duration-200 hover:-translate-y-1"
                >
                  {/* 图标 */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{
                      background: card.bgGradient,
                      boxShadow: `0 6px 16px ${card.shadowColor}`,
                    }}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  {/* 标题 */}
                  <h4 className="text-base font-bold text-foreground mb-1.5">{card.label}</h4>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    {card.description}
                  </p>

                  {/* 底部信息 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <StatIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{card.stats}</span>
                    </div>
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center group-hover:translate-x-0.5 transition-transform"
                      style={{
                        background: card.bgGradient,
                        boxShadow: `0 3px 8px ${card.shadowColor}`,
                      }}
                    >
                      <ArrowRight className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
