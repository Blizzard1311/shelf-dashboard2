import { useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { useAdmin } from "@/contexts/AdminContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, Loader2, AlertCircle, ArrowRight, Shield, Eye, EyeOff } from "lucide-react";

type LoginMode = "tenant" | "admin";

export default function TenantLogin() {
  const { login: tenantLogin } = useTenant();
  const { login: adminLogin } = useAdmin();

  const [mode, setMode] = useState<LoginMode>("tenant");

  // 序列号登录状态
  const [licenseKey, setLicenseKey] = useState("");
  const [displayName, setDisplayName] = useState("");

  // 管理员登录状态
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleTenantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) {
      setError("请输入序列号");
      return;
    }
    setError("");
    setLoading(true);
    const result = await tenantLogin(licenseKey.trim(), displayName.trim() || undefined);
    setLoading(false);
    if (!result.success) {
      setError(result.error || "登录失败");
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("请输入用户名和密码");
      return;
    }
    setError("");
    setLoading(true);
    const result = await adminLogin(username.trim(), password);
    setLoading(false);
    if (!result.success) {
      setError(result.error || "登录失败");
    }
  };

  // 格式化序列号输入（自动大写）
  const handleKeyInput = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    setLicenseKey(cleaned);
  };

  const switchMode = (newMode: LoginMode) => {
    setMode(newMode);
    setError("");
    setLicenseKey("");
    setDisplayName("");
    setUsername("");
    setPassword("");
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
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "tenant" ? "请输入授权序列号登录系统" : "管理员登录"}
          </p>
        </div>

        {/* 模式切换标签 */}
        <div className="flex rounded-xl bg-muted/60 p-1 mb-4 gap-1">
          <button
            onClick={() => switchMode("tenant")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
              mode === "tenant"
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <KeyRound className="w-4 h-4" />
            序列号登录
          </button>
          <button
            onClick={() => switchMode("admin")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
              mode === "admin"
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Shield className="w-4 h-4" />
            管理员登录
          </button>
        </div>

        {/* 登录卡片 */}
        <Card className="shadow-xl border-0" style={{ boxShadow: "0 8px 40px oklch(0 0 0 / 0.08)" }}>
          {mode === "tenant" ? (
            <>
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
                <form onSubmit={handleTenantSubmit} className="space-y-4">
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

                  {error && (
                    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </div>
                  )}

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
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="w-5 h-5 text-amber-600" />
                  管理员登录
                </CardTitle>
                <CardDescription>
                  使用管理员账号和密码登录，管理序列号和租户数据
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAdminSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">用户名</label>
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="请输入管理员用户名"
                      className="h-11"
                      autoFocus
                      disabled={loading}
                      autoComplete="username"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">密码</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="请输入密码"
                        className="h-11 pr-10"
                        disabled={loading}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11 text-base font-semibold"
                    disabled={loading || !username.trim() || !password}
                    style={{
                      background: "linear-gradient(135deg, oklch(0.65 0.18 70), oklch(0.55 0.20 50))",
                      boxShadow: "0 4px 16px oklch(0.65 0.18 70 / 0.35)",
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        登录中...
                      </>
                    ) : (
                      <>
                        管理员登录
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>

        {/* 底部说明 */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          {mode === "tenant"
            ? "序列号由系统管理员生成并分发，如需获取请联系管理员"
            : "管理员账号由系统内部管理，如忘记密码请联系技术支持"}
        </p>
      </div>
    </div>
  );
}
