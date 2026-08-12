import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import Audit from "@/pages/Audit";
import AgentDetail from "@/pages/AgentDetail";
import Agents from "@/pages/Agents";
import Commands from "@/pages/Commands";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";
import Quarantine from "@/pages/Quarantine";
import Rdp from "@/pages/Rdp";
import { Route, Switch } from "wouter";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/agents" component={Agents} />
        <Route path="/agents/:id" component={AgentDetail} />
        <Route path="/quarantine" component={Quarantine} />
        <Route path="/commands" component={Commands} />
        <Route path="/rdp" component={Rdp} />
        <Route path="/audit" component={Audit} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
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
