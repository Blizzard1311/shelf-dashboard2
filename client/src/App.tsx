import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ShelfLayout from "./components/ShelfLayout";
import Dashboard from "./pages/Dashboard";
import DataUpload from "./pages/DataUpload";
import ShelfPerspective from "./pages/ShelfPerspective";
import GridChart from "./pages/GridChart";
import Planogram from "./pages/Planogram";
import VitalityDetail from "./pages/VitalityDetail";
import AdjustmentPlan from "./pages/AdjustmentPlan";

function Router() {
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
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </ShelfLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
