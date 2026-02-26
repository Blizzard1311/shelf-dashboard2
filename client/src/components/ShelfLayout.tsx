import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  Upload,
  BarChart3,
  Grid3X3,
  Menu,
  X,
  LogOut,
  User,
  ChevronRight,
  KeyRound,
  Shield,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

type NavItem = {
  key: string;
  label: string;
  icon: typeof Upload;
  path: string;
  gradient: string;
  shadowColor: string;
  description: string;
  adminOnly?: boolean;
};

const baseNavItems: NavItem[] = [
  {
    key: "upload",
    label: "数据上传",
    icon: Upload,
    path: "/upload",
    gradient: "from-blue-500 to-indigo-600",
    shadowColor: "oklch(0.55 0.18 260)",
    description: "导入与管理数据",
  },
  {
    key: "perspective",
    label: "货架卡看板",
    icon: BarChart3,
    path: "/shelf",
    gradient: "from-violet-500 to-purple-600",
    shadowColor: "oklch(0.55 0.18 300)",
    description: "KPI 指标 · 趋势分析",
  },
  {
    key: "grid",
    label: "货架生命力透视",
    icon: Grid3X3,
    path: "/grid",
    gradient: "from-teal-500 to-cyan-600",
    shadowColor: "oklch(0.65 0.15 185)",
    description: "空间布局 · 占位分析",
  },
];

const adminNavItems: NavItem[] = [
  {
    key: "license",
    label: "序列号管理",
    icon: KeyRound,
    path: "/admin/license",
    gradient: "from-amber-500 to-orange-600",
    shadowColor: "oklch(0.65 0.18 70)",
    description: "生成与管理授权序列号",
    adminOnly: true,
  },
  {
    key: "tenants",
    label: "租户数据",
    icon: Users,
    path: "/admin/tenants",
    gradient: "from-rose-500 to-pink-600",
    shadowColor: "oklch(0.60 0.18 10)",
    description: "查看与导出租户数据",
    adminOnly: true,
  },
];

interface ShelfLayoutProps {
  children: React.ReactNode;
}

export default function ShelfLayout({ children }: ShelfLayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { tenant, logout: tenantLogout } = useTenant();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.href = "/";
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleTenantLogout = async () => {
    await tenantLogout();
    window.location.href = "/";
  };

  const isAdmin = isAuthenticated && user?.role === 'admin';

  // 根据角色动态生成导航项
  const navItems: NavItem[] = isAdmin
    ? [...baseNavItems, ...adminNavItems]
    : baseNavItems;

  const userInitial = user?.name
    ? user.name.charAt(0).toUpperCase()
    : user?.email
    ? user.email.charAt(0).toUpperCase()
    : tenant?.displayName
    ? tenant.displayName.charAt(0).toUpperCase()
    : "T";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* 移动端遮罩层 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 flex flex-col
          bg-white border-r border-border
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
        style={{
          boxShadow: "4px 0 24px oklch(0 0 0 / 0.06)",
        }}
      >
        {/* Logo 区域 */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, oklch(0.55 0.18 260), oklch(0.50 0.20 280))",
              boxShadow: "0 4px 12px oklch(0.55 0.18 260 / 0.4)",
            }}
          >
            {/* 空间透视图标：三维货架透视效果 */}
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
              {/* 后平面 */}
              <rect x="7" y="4" width="12" height="9" rx="0.5" stroke="white" strokeWidth="1.2" strokeOpacity="0.5" fill="none"/>
              {/* 前平面 */}
              <rect x="3" y="10" width="12" height="9" rx="0.5" stroke="white" strokeWidth="1.4" fill="white" fillOpacity="0.15"/>
              {/* 透视连接线 - 左上 */}
              <line x1="3" y1="10" x2="7" y2="4" stroke="white" strokeWidth="1" strokeOpacity="0.7"/>
              {/* 透视连接线 - 右上 */}
              <line x1="15" y1="10" x2="19" y2="4" stroke="white" strokeWidth="1" strokeOpacity="0.7"/>
              {/* 透视连接线 - 右下 */}
              <line x1="15" y1="19" x2="19" y2="13" stroke="white" strokeWidth="1" strokeOpacity="0.7"/>
              {/* 货架横隔板 - 前 */}
              <line x1="3" y1="14" x2="15" y2="14" stroke="white" strokeWidth="1" strokeOpacity="0.8"/>
              {/* 货架横隔板 - 后（透视缩短） */}
              <line x1="7" y1="7.5" x2="19" y2="7.5" stroke="white" strokeWidth="0.8" strokeOpacity="0.4"/>
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-foreground truncate" style={{fontSize: '20px'}}>货架效率透析系统</h1>
            <p className="text-xs text-muted-foreground truncate">内部数据管理系统</p>
          </div>
          {/* 移动端关闭按钮 */}
          <button
            className="ml-auto lg:hidden p-1 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* 导航区域 */}
        <nav className="flex-1 px-3 py-6 flex flex-col min-h-0">
          <p className="px-3 mb-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-shrink-0" style={{fontSize: '17px'}}>
            功能模块
          </p>
          <div className="flex flex-col justify-around flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin" style={{paddingTop: '16px', paddingBottom: '15px'}}>
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            // 在管理员导航项前添加分隔线
            const showAdminDivider = item.adminOnly && (index === 0 || !navItems[index - 1]?.adminOnly);

            return (
              <div key={item.key}>
                {showAdminDivider && (
                  <p className="px-3 mt-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    管理功能
                  </p>
                )}
              <Link href={item.path}>
                <button
                  className={`
                    nav-btn-3d w-full flex items-center gap-3 px-4 py-3 rounded-xl
                    text-sm font-medium transition-all duration-200
                    ${
                      isActive
                        ? "nav-btn-3d-active text-white"
                        : "bg-white text-foreground hover:bg-accent hover:text-accent-foreground"
                    }
                  `}
                  style={
                    isActive
                      ? {
                          background: `linear-gradient(135deg, ${item.gradient
                            .replace("from-", "")
                            .replace(" to-", ", ")})`,
                        }
                      : {}
                  }
                  onClick={() => setSidebarOpen(false)}
                >
                  <span
                    className={`
                      w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                      ${isActive ? "bg-white/20" : `bg-gradient-to-br ${item.gradient}`}
                    `}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-white"}`} />
                  </span>
                  <span className="flex-1 text-left">{item.label}</span>
                  {!isActive && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-50" />
                  )}
                </button>
              </Link>
              </div>
            );
          })}
          </div>
        </nav>

        {/* 租户使用情况提示 */}
        {tenant && !isAdmin && (
          <div className="px-3 py-2 border-t border-border">
            <div className="px-3 py-2 rounded-lg bg-blue-50 text-xs text-blue-700">
              <div className="flex items-center gap-1 mb-1">
                <KeyRound className="w-3 h-3" />
                <span className="font-medium">授权信息</span>
              </div>
              <p>已用上传：{tenant.usedUploads} / {tenant.maxUploads === 0 ? '无限' : tenant.maxUploads} 次</p>
              {tenant.expiresAt && (
                <p>到期时间：{new Date(tenant.expiresAt).toLocaleDateString('zh-CN')}</p>
              )}
            </div>
          </div>
        )}

        {/* 用户信息区域 */}
        <div className="px-3 py-4 border-t border-border">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/50">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback
                  className="text-xs font-semibold text-white"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.55 0.18 260), oklch(0.50 0.20 280))",
                  }}
                >
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {user.name || user.email || "用户"}
                </p>
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {user.role === "admin" ? "管理员" : "普通用户"}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors flex-shrink-0"
                title="退出登录"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : tenant ? (
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/50">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback
                  className="text-xs font-semibold text-white"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.65 0.15 185), oklch(0.55 0.18 200))",
                  }}
                >
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {tenant.displayName || '租户'}
                </p>
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  <KeyRound className="w-3 h-3" />
                  序列号用户
                </p>
              </div>
              <button
                onClick={handleTenantLogout}
                className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors flex-shrink-0"
                title="退出登录"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <a href={getLoginUrl()}>
              <Button
                className="w-full"
                style={{
                  background: "linear-gradient(135deg, oklch(0.55 0.18 260), oklch(0.50 0.20 280))",
                  boxShadow: "0 2px 8px oklch(0.55 0.18 260 / 0.35)",
                }}
              >
                <User className="w-4 h-4 mr-2" />
                登录
              </Button>
            </a>
          )}
        </div>
      </aside>

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 顶部 Header */}
        <header
          className="flex items-center gap-3 px-4 lg:px-6 py-3 bg-white border-b border-border flex-shrink-0"
          style={{ boxShadow: "0 1px 8px oklch(0 0 0 / 0.05)" }}
        >
          {/* 移动端汉堡菜单 */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>

          {/* 当前页面标题 */}
          <div className="flex-1 min-w-0">
            {navItems.map((item) =>
              location === item.path ? (
                <div key={item.key} className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground" style={{fontSize: '20px'}}>{item.label}</span>
                  <span className="hidden sm:inline text-xs text-muted-foreground" style={{fontSize: '14px'}}>
                    — {item.description}
                  </span>
                </div>
              ) : null
            )}
            {location === "/" && (
              <span className="text-sm font-semibold text-foreground">仪表盘</span>
            )}
          </div>

          {/* 右侧用户信息（桌面端） */}
          {(isAuthenticated && user) ? (
            <div className="hidden lg:flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {user.name || user.email}
              </span>
              {isAdmin && (
                <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">管理员</span>
              )}
              <Avatar className="w-7 h-7">
                <AvatarFallback
                  className="text-xs font-semibold text-white"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.55 0.18 260), oklch(0.50 0.20 280))",
                  }}
                >
                  {userInitial}
                </AvatarFallback>
              </Avatar>
            </div>
          ) : tenant ? (
            <div className="hidden lg:flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {tenant.displayName || tenant.licenseKey}
              </span>
              <Avatar className="w-7 h-7">
                <AvatarFallback
                  className="text-xs font-semibold text-white"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.65 0.15 185), oklch(0.55 0.18 200))",
                  }}
                >
                  {userInitial}
                </AvatarFallback>
              </Avatar>
            </div>
          ) : null}
        </header>

        {/* 页面内容 */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
