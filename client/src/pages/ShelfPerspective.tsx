import { BarChart3, PieChart, TrendingUp, Wrench } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";

export default function ShelfPerspective() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "oklch(0.55 0.18 300)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-full px-4">
        <div className="text-center max-w-sm">
          <h2 className="text-lg font-bold text-foreground mb-2">请先登录</h2>
          <p className="text-sm text-muted-foreground mb-4">访问此页面需要登录。</p>
          <a href={getLoginUrl()}>
            <Button style={{ background: "linear-gradient(135deg, oklch(0.55 0.18 300), oklch(0.48 0.22 310))" }}>
              立即登录
            </Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col">
      {/* 页面标题 */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, oklch(0.55 0.18 300), oklch(0.48 0.22 310))",
              boxShadow: "0 4px 12px oklch(0.55 0.18 300 / 0.35)",
            }}
          >
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-foreground">货架透视</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-12">多维度数据可视化分析</p>
      </div>

      {/* 占位内容 */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          {/* 动画图标 */}
          <div className="relative mx-auto mb-6 w-24 h-24">
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, oklch(0.55 0.18 300 / 0.12), oklch(0.48 0.22 310 / 0.08))",
                border: "2px dashed oklch(0.55 0.18 300 / 0.3)",
              }}
            >
              <BarChart3 className="w-10 h-10" style={{ color: "oklch(0.55 0.18 300)" }} />
            </div>
            <div
              className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, oklch(0.65 0.18 50), oklch(0.60 0.20 40))",
                boxShadow: "0 3px 8px oklch(0.65 0.18 50 / 0.4)",
              }}
            >
              <Wrench className="w-4 h-4 text-white" />
            </div>
          </div>

          <h2 className="text-lg font-bold text-foreground mb-2">功能开发中</h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            货架透视模块正在开发中，即将提供丰富的数据可视化图表，帮助您深入洞察货架陈列规律与销售趋势。
          </p>

          {/* 即将推出的功能列表 */}
          <div
            className="rounded-2xl p-4 text-left space-y-3"
            style={{
              background: "oklch(0.55 0.18 300 / 0.05)",
              border: "1px solid oklch(0.55 0.18 300 / 0.15)",
            }}
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              即将推出
            </p>
            {[
              { icon: BarChart3, text: "KPI 核心指标仪表盘" },
              { icon: TrendingUp, text: "销售趋势与环比分析" },
              { icon: PieChart, text: "品类占比与分布图表" },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-center gap-2.5">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "oklch(0.55 0.18 300 / 0.15)" }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: "oklch(0.55 0.18 300)" }} />
                  </div>
                  <span className="text-sm text-foreground">{item.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
