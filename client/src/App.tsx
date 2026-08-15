/**
 * 宋刻书斋：全站保持浅色宣纸主题；每个检索页均通过统一书斋导航返回其他学习入口。
 */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { SiteChrome } from "./components/SiteChrome";
import { ThemeProvider } from "./contexts/ThemeContext";
import Classics from "./pages/Classics";
import DashboardLayout from "./components/DashboardLayout";
import Formulas from "./pages/Formulas";
import Herbs from "./pages/Herbs";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import SearchPage from "./pages/SearchPage";
import StudyDesk from "./pages/StudyDesk";

function RoutedPage({ children }: { children: React.ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/"><RoutedPage><Home /></RoutedPage></Route>
      <Route path="/bencao"><RoutedPage><Herbs /></RoutedPage></Route>
      <Route path="/jingfang"><RoutedPage><Formulas /></RoutedPage></Route>
      <Route path="/guji"><RoutedPage><Classics /></RoutedPage></Route>
      <Route path="/search"><RoutedPage><SearchPage /></RoutedPage></Route>
      <Route path="/shuzhai"><DashboardLayout><StudyDesk /></DashboardLayout></Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
