import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAdmin } from "@/contexts/AdminContext";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, TrendingDown, Minus, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function DataComparison() {
  const [, setLocation] = useLocation();
  const { admin } = useAdmin();
  const { tenant } = useTenant();
  const [sessionId1, setSessionId1] = useState<number | null>(null);
  const [sessionId2, setSessionId2] = useState<number | null>(null);

  const isLoggedIn = admin || tenant;

  // 获取当前用户的上传会话列表
  const { data: uploadSessions, isLoading: sessionsLoading } = trpc.shelf.uploadSessions.useQuery();

  // 获取对比数据
  const { data: comparisonData, isLoading: comparisonLoading } = trpc.comparison.compare.useQuery(
    sessionId1 && sessionId2 ? { sessionId1, sessionId2 } : { sessionId1: 0, sessionId2: 0 },
    { enabled: !!sessionId1 && !!sessionId2 }
  );

  const sessions = uploadSessions || [];

  if (!isLoggedIn) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">请先登录</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* 返回按钮 */}
      <button
        type="button"
        onClick={() => setLocation("/")}
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

      {/* 标题 */}
      <div>
        <h1 className="text-3xl font-bold">数据对比分析</h1>
        <p className="text-muted-foreground mt-2">对比不同时间点的货架数据，查看改进情况</p>
      </div>

      {/* 选择器 */}
      <Card>
        <CardHeader>
          <CardTitle>选择对比数据</CardTitle>
          <CardDescription>选择两个不同时间点的上传数据进行对比</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 第一个会话选择 */}
            <div>
              <label className="text-sm font-medium mb-2 block">对比前数据</label>
              <Select value={sessionId1?.toString() || ""} onValueChange={(val) => setSessionId1(parseInt(val))}>
                <SelectTrigger>
                  <SelectValue placeholder="选择上传数据..." />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((session) => (
                    <SelectItem key={session.id} value={session.id.toString()}>
                      {session.fileName} ({new Date(session.createdAt).toLocaleDateString("zh-CN")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 第二个会话选择 */}
            <div>
              <label className="text-sm font-medium mb-2 block">对比后数据</label>
              <Select value={sessionId2?.toString() || ""} onValueChange={(val) => setSessionId2(parseInt(val))}>
                <SelectTrigger>
                  <SelectValue placeholder="选择上传数据..." />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((session) => (
                    <SelectItem key={session.id} value={session.id.toString()}>
                      {session.fileName} ({new Date(session.createdAt).toLocaleDateString("zh-CN")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 对比结果 */}
      {comparisonLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : comparisonData ? (
        <>
          {/* 对比摘要 */}
          <Card>
            <CardHeader>
              <CardTitle>对比摘要</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">改进货架</p>
                <p className="text-2xl font-bold text-green-600">{comparisonData.comparison.improvedShelves}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">下降货架</p>
                <p className="text-2xl font-bold text-red-600">{comparisonData.comparison.declinedShelves}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">平均效率变化</p>
                <p className="text-2xl font-bold">{comparisonData.comparison.avgEfficiencyChange > 0 ? "+" : ""}{comparisonData.comparison.avgEfficiencyChange}%</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">销售数量变化</p>
                <p className="text-2xl font-bold">{comparisonData.comparison.totalSalesQtyChange > 0 ? "+" : ""}{comparisonData.comparison.totalSalesQtyChange}</p>
              </div>
            </CardContent>
          </Card>

          {/* 对比前后数据 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">对比前</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">文件名</span>
                  <span>{comparisonData.session1.fileName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">上传时间</span>
                  <span>{new Date(comparisonData.session1.createdAt).toLocaleDateString("zh-CN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">货架数</span>
                  <span>{comparisonData.session1.shelfCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">商品数</span>
                  <span>{comparisonData.session1.productCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">平均效率</span>
                  <span className="font-semibold">{comparisonData.session1.avgEfficiency}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">销售数量</span>
                  <span>{comparisonData.session1.totalSalesQty}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">对比后</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">文件名</span>
                  <span>{comparisonData.session2.fileName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">上传时间</span>
                  <span>{new Date(comparisonData.session2.createdAt).toLocaleDateString("zh-CN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">货架数</span>
                  <span>{comparisonData.session2.shelfCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">商品数</span>
                  <span>{comparisonData.session2.productCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">平均效率</span>
                  <span className="font-semibold">{comparisonData.session2.avgEfficiency}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">销售数量</span>
                  <span>{comparisonData.session2.totalSalesQty}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 货架变化详情 */}
          <Card>
            <CardHeader>
              <CardTitle>货架效率变化详情</CardTitle>
              <CardDescription>按改进幅度排序</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {comparisonData.comparison.shelfChanges.map((shelf) => (
                  <div key={shelf.shelfCode} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{shelf.shelfCode}</p>
                      <p className="text-xs text-muted-foreground">
                        {shelf.efficiencyBefore}% → {shelf.efficiencyAfter}%
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {shelf.change > 0 ? (
                        <Badge className="bg-green-100 text-green-700">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          +{shelf.change}%
                        </Badge>
                      ) : shelf.change < 0 ? (
                        <Badge className="bg-red-100 text-red-700">
                          <TrendingDown className="w-3 h-3 mr-1" />
                          {shelf.change}%
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Minus className="w-3 h-3 mr-1" />
                          不变
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
