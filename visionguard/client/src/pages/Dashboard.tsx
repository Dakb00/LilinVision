import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Shield, Camera, AlertTriangle, Activity, TrendingUp, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useRef, useState } from "react";
import type { Camera as CameraType, Detection } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

export function Dashboard() {
  const { data: status } = useQuery({
    queryKey: ["/api/system/status"],
    queryFn: () => apiRequest("GET", "/api/system/status").then((r) => r.json()),
    refetchInterval: 10000,
  });

  const { data: cameras = [] } = useQuery<CameraType[]>({
    queryKey: ["/api/cameras"],
    queryFn: () => apiRequest("GET", "/api/cameras").then((r) => r.json()),
    refetchInterval: 15000,
  });

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["/api/detections/stats"],
    queryFn: () => apiRequest("GET", "/api/detections/stats").then((r) => r.json()),
    refetchInterval: 5000,
  });

  const { data: recentDetections = [], refetch: refetchDets } = useQuery<Detection[]>({
    queryKey: ["/api/detections", "recent"],
    queryFn: () => apiRequest("GET", "/api/detections?limit=10").then((r) => r.json()),
    refetchInterval: 5000,
  });

  // WebSocket for live detection events
  const wsRef = useRef<WebSocket | null>(null);
  const [liveCount, setLiveCount] = useState(0);
  useEffect(() => {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}/ws`);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "detection") {
        setLiveCount((c) => c + 1);
        refetchDets();
        refetchStats();
      }
    };
    return () => ws.close();
  }, []);

  const byLabel = stats?.byLabel ?? {};
  const labelData = Object.entries(byLabel)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 8)
    .map(([label, count]) => ({ label, count }));

  const cameraStats = {
    active: cameras.filter((c) => c.status === "active").length,
    inactive: cameras.filter((c) => c.status === "inactive").length,
    error: cameras.filter((c) => c.status === "error").length,
  };

  const severityColor = (s: string) =>
    s === "alert" ? "var(--color-alert)" : s === "warning" ? "var(--color-warning)" : "hsl(210 10% 45%)";

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
            <p className="text-xs mt-0.5" style={{ color: "hsl(210 10% 45%)" }}>
              {status?.systemName ?? "VisionGuard VMS"} — Overview
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="status-dot active" />
            <span className="text-xs" style={{ color: "hsl(210 10% 45%)" }}>Live</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* KPI row */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="border-0" style={{ background: "hsl(var(--card))" }}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: "hsl(210 10% 45%)" }}>Active Cameras</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{cameraStats.active}</p>
                  <p className="text-xs mt-1" style={{ color: "hsl(210 10% 45%)" }}>
                    {cameraStats.error > 0 && <span style={{ color: "var(--color-alert)" }}>{cameraStats.error} error</span>}
                    {cameraStats.error > 0 && cameraStats.inactive > 0 && " · "}
                    {cameraStats.inactive > 0 && `${cameraStats.inactive} offline`}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "hsl(195 85% 48% / 0.12)" }}>
                  <Camera size={16} style={{ color: "hsl(195 85% 55%)" }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0" style={{ background: "hsl(var(--card))" }}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: "hsl(210 10% 45%)" }}>Total Detections</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stats?.total ?? 0}</p>
                  <p className="text-xs mt-1" style={{ color: "hsl(210 10% 45%)" }}>
                    <span style={{ color: "var(--color-success)" }}>{stats?.today ?? 0} today</span>
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "hsl(142 70% 45% / 0.12)" }}>
                  <Shield size={16} style={{ color: "var(--color-success)" }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0" style={{ background: "hsl(var(--card))" }}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: "hsl(210 10% 45%)" }}>Unacknowledged</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stats?.unacknowledged ?? 0}</p>
                  <p className="text-xs mt-1" style={{ color: "hsl(210 10% 45%)" }}>Pending review</p>
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "hsl(38 95% 54% / 0.12)" }}>
                  <Eye size={16} style={{ color: "var(--color-warning)" }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0" style={{ background: "hsl(var(--card))" }}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: "hsl(210 10% 45%)" }}>Alerts</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stats?.alerts ?? 0}</p>
                  <p className="text-xs mt-1" style={{ color: "hsl(210 10% 45%)" }}>
                    <span style={{ color: liveCount > 0 ? "var(--color-success)" : "hsl(210 10% 45%)" }}>
                      +{liveCount} live
                    </span>
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "hsl(4 85% 55% / 0.12)" }}>
                  <AlertTriangle size={16} style={{ color: "var(--color-alert)" }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts + recent detections */}
        <div className="grid grid-cols-3 gap-4">
          {/* Label breakdown chart */}
          <Card className="col-span-2 border-0" style={{ background: "hsl(var(--card))" }}>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                <TrendingUp size={14} />
                Detection Breakdown by Object Class
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {labelData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={labelData} barSize={20}>
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(210 10% 45%)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(210 10% 45%)" }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip
                      contentStyle={{ background: "hsl(220 20% 8%)", border: "1px solid hsl(220 15% 18%)", borderRadius: 6, fontSize: 12 }}
                      labelStyle={{ color: "hsl(210 15% 88%)" }}
                      itemStyle={{ color: "hsl(195 85% 55%)" }}
                    />
                    <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                      {labelData.map((_, i) => (
                        <Cell key={i} fill={`hsl(${195 + i * 15} 75% ${48 + i * 2}%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-44 flex items-center justify-center" style={{ color: "hsl(210 10% 35%)" }}>
                  <div className="text-center">
                    <Shield size={28} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No detection data yet</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Camera status */}
          <Card className="border-0" style={{ background: "hsl(var(--card))" }}>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                <Camera size={14} />
                Camera Status
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {cameras.slice(0, 6).map((cam) => (
                <div key={cam.id} className="flex items-center gap-2.5" data-testid={`camera-status-${cam.id}`}>
                  <span className={`status-dot ${cam.status}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{cam.name}</p>
                    <p className="text-xs truncate" style={{ color: "hsl(210 10% 40%)" }}>{cam.location}</p>
                  </div>
                  {cam.detectionEnabled && cam.status === "active" && (
                    <span className="text-xs" style={{ color: "hsl(195 85% 50%)", fontSize: 10 }}>AI</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent detections */}
        <Card className="border-0" style={{ background: "hsl(var(--card))" }}>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
              <Activity size={14} />
              Recent Detection Events
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid hsl(220 15% 18%)" }}>
                  {["Time", "Camera", "Object", "Confidence", "Severity", "Status"].map((h) => (
                    <th key={h} className="px-4 py-2 text-left font-medium" style={{ color: "hsl(210 10% 40%)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentDetections.map((d) => {
                  const cam = cameras.find((c) => c.id === d.cameraId);
                  return (
                    <tr
                      key={d.id}
                      className={d.severity === "alert" ? "alert-row" : ""}
                      style={{ borderBottom: "1px solid hsl(220 15% 14%)" }}
                      data-testid={`detection-row-${d.id}`}
                    >
                      <td className="px-4 py-2 font-mono" style={{ color: "hsl(210 10% 55%)" }}>
                        {new Date(d.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-2 text-foreground">{cam?.name ?? `Cam #${d.cameraId}`}</td>
                      <td className="px-4 py-2 font-medium text-foreground capitalize">{d.label}</td>
                      <td className="px-4 py-2 font-mono" style={{ color: "hsl(195 85% 55%)" }}>
                        {(d.confidence * 100).toFixed(1)}%
                      </td>
                      <td className="px-4 py-2">
                        <Badge
                          variant="outline"
                          className="text-xs px-1.5 py-0 h-4 border-0"
                          style={{
                            background: `${severityColor(d.severity)}18`,
                            color: severityColor(d.severity),
                          }}
                        >
                          {d.severity}
                        </Badge>
                      </td>
                      <td className="px-4 py-2">
                        {d.acknowledged ? (
                          <span style={{ color: "hsl(210 10% 35%)" }}>ACK</span>
                        ) : (
                          <span style={{ color: "var(--color-warning)" }} className="font-medium">Pending</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {recentDetections.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center" style={{ color: "hsl(210 10% 35%)" }}>No detections yet</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
