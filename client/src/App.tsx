/**
 * 宋刻书斋：全站保持浅色宣纸主题；每个检索页均通过统一书斋导航返回其他学习入口。
 */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { SiteChrome } from "./components/SiteChrome";
import { ThemeProvider } from "./contexts/ThemeContext";
import NotFound from "./pages/NotFound";

const Home = lazy(() => import("./pages/Home"));
const Herbs = lazy(() => import("./pages/Herbs"));
const Formulas = lazy(() => import("./pages/Formulas"));
const Classics = lazy(() => import("./pages/Classics"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const StudyDesk = lazy(() => import("./pages/StudyDesk"));
const NotificationCenter = lazy(() => import("./pages/NotificationCenter"));
const KnowledgeBase = lazy(() => import("./pages/KnowledgeBase"));
const DashboardLayout = lazy(() => import("./components/DashboardLayout"));

function RouteFallback() {
  return <main className="route-loading" aria-live="polite">正在展开书页……</main>;
}

function RoutedPage({ children }: { children: React.ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Suspense fallback={<RouteFallback />}><Switch>
      <Route path="/"><RoutedPage><Home /></RoutedPage></Route>
      <Route path="/bencao"><RoutedPage><Herbs /></RoutedPage></Route>
      <Route path="/jingfang"><RoutedPage><Formulas /></RoutedPage></Route>
      <Route path="/guji"><RoutedPage><Classics /></RoutedPage></Route>
      <Route path="/search"><RoutedPage><SearchPage /></RoutedPage></Route>
      <Route path="/notifications"><RoutedPage><NotificationCenter /></RoutedPage></Route>
      <Route path="/knowledge"><RoutedPage><KnowledgeBase /></RoutedPage></Route>
      <Route path="/shuzhai"><DashboardLayout><StudyDesk /></DashboardLayout></Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch></Suspense>
  );
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
