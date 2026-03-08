import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Users,
  Download,
  Loader2,
  KeyRound,
  Upload,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  Database,
} from "lucide-react";

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  active: { label: "活跃", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  expired: { label: "已过期", color: "bg-orange-100 text-orange-700", icon: AlertTriangle },
  disabled: { label: "已停用", color: "bg-red-100 text-red-700", icon: XCircle },
};

export default function TenantDataManage() {
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data: tenants, isLoading: tenantsLoading } = trpc.tenantAdmin.list.useQuery();

  // 获取选中租户的数据
  const { data: tenantData, isLoading: dataLoading } = trpc.tenantAdmin.exportData.useQuery(
    { tenantId: selectedTenantId! },
    { enabled: !!selectedTenantId }
  );

  const selectedTenant = useMemo(() => {
    if (!selectedTenantId || !tenants) return null;
    return tenants.find((t) => t.id === selectedTenantId) ?? null;
  }, [selectedTenantId, tenants]);

  // 导出 Excel
  const handleExport = () => {
    if (!tenantData || tenantData.length === 0) {
      toast.error("该租户暂无数据可导出");
      return;
    }
    setExporting(true);
    try {
      // 转换为 Excel 友好格式
      const rows = tenantData.map((row: any) => ({
        "大类": row.category1 ?? "",
        "中类": row.category2 ?? "",
        "小类": row.category3 ?? "",
        "子类": row.category4 ?? "",
        "货架编码": row.shelfCode ?? "",
        "层": row.layer ?? "",
        "序": row.sequence ?? "",
        "排面数": row.facingCount ?? "",
        "商品编码": row.productCode ?? "",
        "商品名称": row.productName ?? "",
        "销售数量": row.salesQty ?? "",
        "销售金额": row.salesAmount ?? "",
        "销售毛利": row.grossProfit ?? "",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);

      // 设置列宽
      ws["!cols"] = [
        { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
        { wch: 12 }, { wch: 6 }, { wch: 6 }, { wch: 8 },
        { wch: 14 }, { wch: 20 },
        { wch: 10 }, { wch: 12 }, { wch: 12 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, "货架数据");

      const tenantName = selectedTenant?.displayName || selectedTenant?.licenseKey || "用户";
      const fileName = `${tenantName}_货架数据_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success("导出成功", { description: fileName });
    } catch (err) {
      toast.error("导出失败");
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* 数据详情 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            数据详情        </CardTitle>
          <CardDescription>
            共 {tenants?.length ?? 0} 个用户，点击查看数据详情
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tenantsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !tenants?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>暂无用户，请先生成序列号并分发给用户</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tenants.map((t) => {
                const status = STATUS_MAP[t.status] || STATUS_MAP.active;
                const StatusIcon = status.icon;
                const isSelected = selectedTenantId === t.id;

                return (
                  <div
                    key={t.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:bg-accent/30"
                    }`}
                    onClick={() => setSelectedTenantId(t.id)}
                  >
                    {/* 租户信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-foreground">
                          {t.displayName || "未命名用户"}
                        </span>
                        <Badge variant="secondary" className={`${status.color} flex items-center gap-1 text-xs`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <KeyRound className="w-3 h-3" />
                          {t.licenseKey}
                        </span>
                        <span className="flex items-center gap-1">
                          <Upload className="w-3 h-3" />
                          已上传 {t.usedUploads} / {t.maxUploads === 0 ? "无限" : t.maxUploads} 次
                        </span>
                        {t.expiresAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            到期 {new Date(t.expiresAt).toLocaleDateString("zh-CN")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 查看按钮 */}
                    <Button
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTenantId(t.id);
                      }}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      {isSelected ? "已选中" : "查看"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 选中租户的数据概览 + 导出 */}
      {selectedTenantId && (
        <>
        {/* 用户名称信息卡 */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium mb-1">用户名称</p>
                <p className="text-lg font-semibold text-blue-900">{selectedTenant?.displayName}</p>
              </div>
              <div className="text-xs text-blue-600 bg-white px-2 py-1 rounded">
                不可修改
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-3 leading-relaxed">
              ✓ 用户名称在首次登录时设置，为了保证数据一致性，已锁定不可修改。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  数据详情
                </CardTitle>
                <CardDescription>
                  {dataLoading
                    ? "加载中..."
                    : tenantData?.length
                    ? `共 ${tenantData.length} 条记录`
                    : "该用户暂无上传数据"}
                </CardDescription>
              </div>
              <Button
                onClick={handleExport}
                disabled={exporting || dataLoading || !tenantData?.length}
                style={{
                  background: "linear-gradient(135deg, oklch(0.55 0.18 260), oklch(0.50 0.20 280))",
                }}
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                导出 Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {dataLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : !tenantData?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Database className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>该租户暂无上传数据</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">货架编码</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">大类</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">商品名称</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">层/序</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">排面数</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">销售数量</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">销售金额</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenantData.slice(0, 50).map((row: any, i: number) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 px-3 font-mono text-xs">{row.shelfCode}</td>
                        <td className="py-2 px-3">{row.category1}</td>
                        <td className="py-2 px-3 truncate max-w-[200px]">{row.productName}</td>
                        <td className="py-2 px-3">{row.layer}/{row.sequence}</td>
                        <td className="py-2 px-3 text-right">{row.facingCount}</td>
                        <td className="py-2 px-3 text-right">{row.salesQty}</td>
                        <td className="py-2 px-3 text-right">
                          {row.salesAmount ? `¥${Number(row.salesAmount).toFixed(2)}` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {tenantData.length > 50 && (
                  <p className="text-center text-xs text-muted-foreground mt-3 py-2">
                    仅显示前 50 条，完整数据请导出 Excel 查看
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        </>
      )}
    </div>
  );
}
