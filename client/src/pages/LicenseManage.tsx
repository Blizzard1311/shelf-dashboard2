import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  KeyRound,
  Plus,
  Copy,
  Ban,
  Trash2,
  Loader2,
  Clock,
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  active: { label: "待激活", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  used: { label: "已使用", color: "bg-blue-100 text-blue-700", icon: Clock },
  expired: { label: "已过期", color: "bg-orange-100 text-orange-700", icon: AlertTriangle },
  disabled: { label: "已停用", color: "bg-red-100 text-red-700", icon: XCircle },
};

export default function LicenseManage() {
  const [maxUploads, setMaxUploads] = useState("3");
  const [validDays, setValidDays] = useState("30");
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);

  const utils = trpc.useUtils();
  const { data: licenses, isLoading } = trpc.license.list.useQuery();

  const createMutation = trpc.license.create.useMutation({
    onSuccess: (data) => {
      toast.success("序列号已生成", { description: data.key });
      setNote("");
      utils.license.list.invalidate();
    },
    onError: (err) => {
      toast.error("生成失败", { description: err.message });
    },
  });

  const disableMutation = trpc.license.disable.useMutation({
    onSuccess: () => {
      toast.success("序列号已停用");
      utils.license.list.invalidate();
    },
    onError: (err) => {
      toast.error("操作失败", { description: err.message });
    },
  });

  const deleteMutation = trpc.license.delete.useMutation({
    onSuccess: () => {
      toast.success("序列号已删除");
      utils.license.list.invalidate();
    },
    onError: (err) => {
      toast.error("删除失败", { description: err.message });
    },
  });

  const handleCreate = async () => {
    setCreating(true);
    await createMutation.mutateAsync({
      maxUploads: parseInt(maxUploads),
      validDays: parseInt(validDays),
      note: note.trim() || undefined,
    });
    setCreating(false);
  };

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("已复制到剪贴板");
  };

  const handleDisable = (id: number, key: string) => {
    if (confirm(`确定要停用序列号 ${key} 吗？停用后关联的租户也将无法使用。`)) {
      disableMutation.mutate({ id });
    }
  };

  const handleDelete = (id: number, key: string) => {
    if (confirm(`确定要删除序列号 ${key} 吗？此操作将同时删除该序列号关联的所有租户数据，且无法恢复。`)) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* 生成序列号 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            生成授权序列号
          </CardTitle>
          <CardDescription>
            为新租户生成授权序列号，设置上传次数和有效期限制
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* 上传次数 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">上传次数</label>
              <Select value={maxUploads} onValueChange={setMaxUploads}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 次</SelectItem>
                  <SelectItem value="10">10 次</SelectItem>
                  <SelectItem value="0">无限制</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 有效天数 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">有效期</label>
              <Select value={validDays} onValueChange={setValidDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 天</SelectItem>
                  <SelectItem value="90">90 天</SelectItem>
                  <SelectItem value="0">无限制</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 备注 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">备注</label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="例如：华南区-深圳店"
              />
            </div>

            {/* 生成按钮 */}
            <div className="flex items-end">
              <Button
                onClick={handleCreate}
                disabled={creating}
                className="w-full"
                style={{
                  background: "linear-gradient(135deg, oklch(0.55 0.18 260), oklch(0.50 0.20 280))",
                }}
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <KeyRound className="w-4 h-4 mr-2" />
                )}
                生成序列号
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 序列号列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            序列号列表
          </CardTitle>
          <CardDescription>
            共 {licenses?.length ?? 0} 个序列号
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !licenses?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <KeyRound className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>暂无序列号，点击上方按钮生成</p>
            </div>
          ) : (
            <div className="space-y-3">
              {licenses.map((lic) => {
                const status = STATUS_MAP[lic.status] || STATUS_MAP.active;
                const StatusIcon = status.icon;
                return (
                  <div
                    key={lic.id}
                    className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent/30 transition-colors"
                  >
                    {/* 序列号 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm font-mono font-semibold text-foreground">
                          {lic.key}
                        </code>
                        <button
                          onClick={() => handleCopy(lic.key)}
                          className="p-1 rounded hover:bg-muted transition-colors"
                          title="复制序列号"
                        >
                          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Upload className="w-3 h-3" />
                          {lic.maxUploads === 0 ? "无限" : `${lic.maxUploads}次`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {lic.validDays === 0 ? "无限期" : `${lic.validDays}天`}
                        </span>
                        {lic.note && (
                          <span className="truncate max-w-[200px]">{lic.note}</span>
                        )}
                      </div>
                    </div>

                    {/* 状态 */}
                    <Badge variant="secondary" className={`${status.color} flex items-center gap-1`}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </Badge>

                    {/* 操作 */}
                    <div className="flex gap-2">
                      {(lic.status === "active" || lic.status === "used") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisable(lic.id, lic.key)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Ban className="w-3.5 h-3.5 mr-1" />
                          停用
                        </Button>
                      )}
                      {lic.status === "disabled" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(lic.id, lic.key)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          disabled={deleteMutation.isPending}
                        >
                          {deleteMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                          )}
                          删除
                        </Button>
                      )}
                    </div>

                    {/* 创建时间 */}
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {lic.createdAt ? new Date(lic.createdAt).toLocaleDateString("zh-CN") : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
