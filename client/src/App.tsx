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

function Router() {
  return (
    <ShelfLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/upload" component={DataUpload} />
        <Route path="/perspective" component={ShelfPerspective} />
        <Route path="/grid" component={GridChart} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </ShelfLayout>
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
