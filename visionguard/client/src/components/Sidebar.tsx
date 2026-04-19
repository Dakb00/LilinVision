import { useLocation, Link } from "wouter";
import { LayoutDashboard, Video, Shield, Camera, Cpu, Key, Settings, Activity, Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/live", icon: Video, label: "Live View" },
  { href: "/detections", icon: Shield, label: "Detections" },
  { href: "/cameras", icon: Camera, label: "Cameras" },
  { href: "/models", icon: Cpu, label: "AI Models" },
  { href: "/api", icon: Key, label: "API Integration" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const [location] = useLocation();

  const { data: status } = useQuery({
    queryKey: ["/api/system/status"],
    queryFn: () => apiRequest("GET", "/api/system/status").then((r) => r.json()),
    refetchInterval: 10000,
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/detections/stats"],
    queryFn: () => apiRequest("GET", "/api/detections/stats").then((r) => r.json()),
    refetchInterval: 5000,
  });

  const unack = stats?.unacknowledged ?? 0;

  return (
    <aside
      className="flex flex-col w-56 flex-shrink-0 border-r"
      style={{ background: "hsl(var(--sidebar-bg))", borderColor: "hsl(var(--sidebar-border))" }}
    >
      {/* Logo */}
      <div className="px-4 py-4 border-b" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
        <div className="flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-label="VisionGuard" className="flex-shrink-0">
            <rect width="32" height="32" rx="6" fill="hsl(195 85% 48% / 0.15)" />
            <circle cx="16" cy="14" r="5" stroke="hsl(195 85% 55%)" strokeWidth="2" fill="none" />
            <circle cx="16" cy="14" r="2" fill="hsl(195 85% 55%)" />
            <path d="M10 14 Q8 10 6 14" stroke="hsl(195 85% 55%)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M22 14 Q24 10 26 14" stroke="hsl(195 85% 55%)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <rect x="13" y="22" width="6" height="3" rx="1" fill="hsl(195 85% 55%)" />
            <rect x="15" y="19" width="2" height="3" fill="hsl(195 85% 55%)" />
          </svg>
          <div>
            <div className="text-sm font-semibold text-foreground leading-none">VisionGuard</div>
            <div className="text-xs mt-0.5" style={{ color: "hsl(210 10% 45%)" }}>VMS Lite</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = location === href || (href !== "/" && location.startsWith(href));
          return (
            <Link key={href} href={href}>
              <div className={`sidebar-nav-item ${isActive ? "active" : ""}`} data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}>
                <Icon size={16} className="flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {label === "Detections" && unack > 0 && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0 h-4 min-w-4 flex items-center justify-center">
                    {unack > 99 ? "99+" : unack}
                  </Badge>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* System status footer */}
      <div className="px-3 pb-3 border-t pt-3 space-y-2" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
        <div className="flex items-center gap-2 text-xs" style={{ color: "hsl(210 10% 45%)" }}>
          <Activity size={12} />
          <span>System</span>
        </div>
        <div className="space-y-1 text-xs" style={{ color: "hsl(210 10% 45%)" }}>
          <div className="flex justify-between">
            <span>Cameras active</span>
            <span className="text-foreground font-medium">{status?.cameras?.active ?? "–"}/{status?.cameras?.total ?? "–"}</span>
          </div>
          <div className="flex justify-between">
            <span>Detections today</span>
            <span className="text-foreground font-medium">{stats?.today ?? "–"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>DarkHelp</span>
            <span style={{ color: "var(--color-success)" }} className="font-medium">online</span>
          </div>
        </div>
        <div className="mt-2 px-2 py-1.5 rounded text-xs font-mono" style={{ background: "hsl(220 20% 6%)", color: "hsl(210 10% 40%)" }}>
          darknet v2024.10
        </div>
      </div>
    </aside>
  );
}
