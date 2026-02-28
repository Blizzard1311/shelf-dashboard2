import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TenantProvider, useTenant } from "./contexts/TenantContext";
import { AdminProvider, useAdmin } from "./contexts/AdminContext";
import ShelfLayout from "./components/ShelfLayout";
import Dashboard from "./pages/Dashboard";
import DataUpload from "./pages/DataUpload";
import ShelfPerspective from "./pages/ShelfPerspective";
import GridChart from "./pages/GridChart";
import Planogram from "./pages/Planogram";
import VitalityDetail from "./pages/VitalityDetail";
import AdjustmentPlan from "./pages/AdjustmentPlan";
import TenantLogin from "./pages/TenantLogin";
import LicenseManage from "./pages/LicenseManage";
import TenantDataManage from "./pages/TenantDataManage";

/** 主路由：需要认证（管理员账号密码 或 租户序列号） */
function AuthenticatedRouter() {
  return (
    <Switch>
      {/* 棚格图页面独立展示，不使用侧边栏布局 */}
      <Route path="/planogram/:shelfCode" component={Planogram} />
      {/* 货架生命力透视第二层，独立展示 */}
      <Route path="/vitality/:shelfCode" component={VitalityDetail} />
      {/* 调整方案页面，独立展示 */}
      <Route path="/adjustment-plan" component={AdjustmentPlan} />
      {/* 其他页面使用侧边栏布局 */}
      <Route>
        <ShelfLayout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/upload" component={DataUpload} />
            <Route path="/shelf" component={ShelfPerspective} />
            <Route path="/grid" component={GridChart} />
            {/* 管理员页面 */}
            <Route path="/admin/license" component={LicenseManage} />
            <Route path="/admin/tenants" component={TenantDataManage} />
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </ShelfLayout>
      </Route>
    </Switch>
  );
}

/** 认证门卫：检查是否已登录（管理员账号密码 or 租户序列号） */
function AuthGate() {
  const { admin, loading: adminLoading } = useAdmin();
  const { tenant, loading: tenantLoading } = useTenant();

  // 两个认证源都在加载中
  if (adminLoading || tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  // 管理员已登录（账号密码）或 租户已登录（序列号）
  if (admin || tenant) {
    return <AuthenticatedRouter />;
  }

  // 未登录：显示登录页
  return <TenantLogin />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AdminProvider>
          <TenantProvider>
            <TooltipProvider>
              <Toaster />
              <AuthGate />
            </TooltipProvider>
          </TenantProvider>
        </AdminProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
