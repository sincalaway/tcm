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
import Formulas from "./pages/Formulas";
import Herbs from "./pages/Herbs";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

function RoutedPage({ children }: { children: React.ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}

function Router() {
  return (
    <Switch>
      <Route path="/"><RoutedPage><Home /></RoutedPage></Route>
      <Route path="/bencao"><RoutedPage><Herbs /></RoutedPage></Route>
      <Route path="/jingfang"><RoutedPage><Formulas /></RoutedPage></Route>
      <Route path="/guji"><RoutedPage><Classics /></RoutedPage></Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

