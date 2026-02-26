import { useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { getLoginUrl } from "@/const";

export default function TenantLogin() {
  const { login } = useTenant();
  const [licenseKey, setLicenseKey] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) {
      setError("请输入序列号");
      return;
    }
    setError("");
    setLoading(true);
    const result = await login(licenseKey.trim(), displayName.trim() || undefined);
    setLoading(false);
    if (!result.success) {
      setError(result.error || "登录失败");
    }
    // 成功后 TenantProvider 会自动更新 tenant 状态，App 层会切换到主界面
  };

  // 格式化序列号输入（自动大写、加连字符）
  const handleKeyInput = (value: string) => {
    // 移除非字母数字字符（保留连字符）
    let cleaned = value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    setLicenseKey(cleaned);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20"
          style={{ background: "linear-gradient(135deg, oklch(0.55 0.18 260), oklch(0.50 0.20 280))" }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-15"
          style={{ background: "linear-gradient(135deg, oklch(0.65 0.15 185), oklch(0.55 0.18 200))" }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: "linear-gradient(135deg, oklch(0.55 0.18 260), oklch(0.50 0.20 280))",
              boxShadow: "0 8px 24px oklch(0.55 0.18 260 / 0.35)",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8" xmlns="http://www.w3.org/2000/svg">
              <rect x="7" y="4" width="12" height="9" rx="0.5" stroke="white" strokeWidth="1.2" strokeOpacity="0.5" fill="none"/>
              <rect x="3" y="10" width="12" height="9" rx="0.5" stroke="white" strokeWidth="1.4" fill="white" fillOpacity="0.15"/>
              <line x1="3" y1="10" x2="7" y2="4" stroke="white" strokeWidth="1" strokeOpacity="0.7"/>
              <line x1="15" y1="10" x2="19" y2="4" stroke="white" strokeWidth="1" strokeOpacity="0.7"/>
              <line x1="15" y1="19" x2="19" y2="13" stroke="white" strokeWidth="1" strokeOpacity="0.7"/>
              <line x1="3" y1="14" x2="15" y2="14" stroke="white" strokeWidth="1" strokeOpacity="0.8"/>
              <line x1="7" y1="7.5" x2="19" y2="7.5" stroke="white" strokeWidth="0.8" strokeOpacity="0.4"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">货架效率透析系统</h1>
          <p className="text-sm text-muted-foreground mt-1">请输入授权序列号登录系统</p>
        </div>

        {/* 登录卡片 */}
        <Card className="shadow-xl border-0" style={{ boxShadow: "0 8px 40px oklch(0 0 0 / 0.08)" }}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="w-5 h-5 text-primary" />
              序列号登录
            </CardTitle>
            <CardDescription>
              输入管理员提供的授权序列号即可使用系统
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 序列号输入 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">授权序列号</label>
                <Input
                  value={licenseKey}
                  onChange={(e) => handleKeyInput(e.target.value)}
                  placeholder="SH-XXXX-XXXX-XXXX"
                  className="font-mono text-center text-lg tracking-wider h-12"
                  autoFocus
                  disabled={loading}
                />
              </div>

              {/* 显示名称（可选） */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  门店/用户名称 <span className="text-muted-foreground font-normal">(可选)</span>
                </label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="例如：华南区-深圳旗舰店"
                  className="h-10"
                  disabled={loading}
                />
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* 登录按钮 */}
              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold"
                disabled={loading || !licenseKey.trim()}
                style={{
                  background: "linear-gradient(135deg, oklch(0.55 0.18 260), oklch(0.50 0.20 280))",
                  boxShadow: "0 4px 16px oklch(0.55 0.18 260 / 0.35)",
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    验证中...
                  </>
                ) : (
                  <>
                    登录系统
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            {/* 管理员入口 */}
            <div className="mt-6 pt-4 border-t border-border text-center">
              <p className="text-xs text-muted-foreground mb-2">管理员？</p>
              <a
                href={getLoginUrl()}
                className="text-sm text-primary hover:underline font-medium"
              >
                使用管理员账号登录 →
              </a>
            </div>
          </CardContent>
        </Card>

        {/* 底部说明 */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          序列号由系统管理员生成并分发，如需获取请联系管理员
        </p>
      </div>
    </div>
  );
}
