import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Sidebar } from "./components/Sidebar";
import { LiveView } from "./pages/LiveView";
import { Detections } from "./pages/Detections";
import { Cameras } from "./pages/Cameras";
import { Models } from "./pages/Models";
import { ApiIntegration } from "./pages/ApiIntegration";
import { Settings } from "./pages/Settings";
import { Dashboard } from "./pages/Dashboard";
import NotFound from "./pages/not-found";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router hook={useHashLocation}>
        <div className="flex h-screen w-screen overflow-hidden bg-background">
          <Sidebar />
          <main className="flex-1 overflow-hidden">
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/live" component={LiveView} />
              <Route path="/detections" component={Detections} />
              <Route path="/cameras" component={Cameras} />
              <Route path="/models" component={Models} />
              <Route path="/api" component={ApiIntegration} />
              <Route path="/settings" component={Settings} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
        <Toaster />
      </Router>
    </QueryClientProvider>
  );
}
