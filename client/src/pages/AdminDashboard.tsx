import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Users, TrendingUp, Database, Clock } from "lucide-react";
import { useLocation } from "wouter";

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-green-100", text: "text-green-700", label: "活跃" },
  expired: { bg: "bg-orange-100", text: "text-orange-700", label: "已过期" },
  disabled: { bg: "bg-red-100", text: "text-red-700", label: "已停用" },
};

const EFFICIENCY_COLORS = (efficiency: number) => {
  if (efficiency >= 80) return "bg-green-50 border-green-200";
  if (efficiency >= 60) return "bg-blue-50 border-blue-200";
  if (efficiency >= 40) return "bg-yellow-50 border-yellow-200";
  return "bg-red-50 border-red-200";
};

const EFFICIENCY_BADGE_COLOR = (efficiency: number) => {
  if (efficiency >= 80) return "bg-green-100 text-green-700";
  if (efficiency >= 60) return "bg-blue-100 text-blue-700";
  if (efficiency >= 40) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
};

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { data: dashboardData, isLoading } = trpc.admin.dashboard.useQuery();

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  const users = dashboardData || [];
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.tenantStatus === "active").length;
  const avgEfficiency = users.length > 0 
    ? Math.round(users.reduce((sum, u) => sum + u.shelfEfficiency, 0) / users.length)
    : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">总用户数</p>
                <p className="text-2xl font-bold">{totalUsers}</p>
              </div>
              <Users className="w-8 h-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">活跃用户</p>
                <p className="text-2xl font-bold">{activeUsers}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">平均货架效率</p>
                <p className="text-2xl font-bold">{avgEfficiency}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">总数据条数</p>
                <p className="text-2xl font-bold">{users.reduce((sum, u) => sum + u.totalDataCount, 0)}</p>
              </div>
              <Database className="w-8 h-8 text-orange-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 用户卡片列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            用户管理
          </CardTitle>
          <CardDescription>
            共 {totalUsers} 个用户，点击卡片查看详细数据
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>暂无用户数据</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((user) => {
                const statusInfo = STATUS_COLORS[user.tenantStatus] || STATUS_COLORS.active;
                const efficiencyColor = EFFICIENCY_BADGE_COLOR(user.shelfEfficiency);

                return (
                  <button
                    key={user.tenantId}
                    onClick={() => setLocation(`/admin/tenants?tenantId=${user.tenantId}`)}
                    className={`p-4 rounded-xl border border-border text-left transition-all hover:shadow-md ${EFFICIENCY_COLORS(user.shelfEfficiency)}`}
                  >
                    {/* 用户名称和状态 */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {user.tenantName}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {user.licenseKey}
                        </p>
                      </div>
                      <Badge variant="secondary" className={`${statusInfo.bg} ${statusInfo.text} ml-2 flex-shrink-0`}>
                        {statusInfo.label}
                      </Badge>
                    </div>

                    {/* 使用统计 */}
                    <div className="space-y-2 mb-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">上传次数</span>
                        <span className="font-medium">
                          {user.usedUploads}/{user.maxUploads === 0 ? "∞" : user.maxUploads}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">数据条数</span>
                        <span className="font-medium">{user.totalDataCount}</span>
                      </div>
                    </div>

                    {/* 货架效率 */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">货架效率</span>
                        <Badge className={efficiencyColor}>
                          {user.shelfEfficiency}%
                        </Badge>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${user.shelfEfficiency}%` }}
                        />
                      </div>
                    </div>

                    {/* 最后使用时间 */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {user.lastUploadTime
                        ? new Date(user.lastUploadTime).toLocaleDateString("zh-CN")
                        : "未使用"}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
