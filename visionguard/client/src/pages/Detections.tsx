import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import type { Camera, Detection } from "@shared/schema";
import { Shield, Filter, CheckCheck, AlertTriangle, Search, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef } from "react";

export function Detections() {
  const { toast } = useToast();
  const [severity, setSeverity] = useState<string>("all");
  const [acknowledged, setAcknowledged] = useState<string>("all");
  const [cameraFilter, setCameraFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  if (severity !== "all") params.set("severity", severity);
  if (acknowledged !== "all") params.set("acknowledged", acknowledged);
  if (cameraFilter !== "all") params.set("cameraId", cameraFilter);
  if (search) params.set("search", search);

  const { data: detections = [], refetch } = useQuery<Detection[]>({
    queryKey: ["/api/v1/detections", severity, acknowledged, cameraFilter, search, offset],
    queryFn: () => apiRequest("GET", `/api/v1/detections?${params}`).then((r) => r.json()),
    refetchInterval: 5000,
  });

  const { data: cameras = [] } = useQuery<Camera[]>({
    queryKey: ["/api/v1/cameras"],
    queryFn: () => apiRequest("GET", "/api/v1/cameras").then((r) => r.json()),
  });

  // WebSocket live updates
  useEffect(() => {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}/ws`);
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "detection") refetch();
    };
    return () => ws.close();
  }, []);

  const ackMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/detections/${id}/acknowledge`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/v1/detections"] }); queryClient.invalidateQueries({ queryKey: ["/api/detections/stats"] }); },
  });

  const ackAllMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/detections/acknowledge-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/detections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/detections/stats"] });
      toast({ title: "All detections acknowledged" });
    },
  });

  const severityColor = (s: string) =>
    s === "alert" ? "var(--color-alert)" : s === "warning" ? "var(--color-warning)" : "hsl(210 10% 45%)";

  const camMap = Object.fromEntries(cameras.map((c) => [c.id, c.name]));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b flex-shrink-0" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold text-foreground">Detection Events</h1>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 gap-1.5"
            onClick={() => ackAllMutation.mutate()}
            disabled={ackAllMutation.isPending}
            data-testid="button-acknowledge-all"
          >
            <CheckCheck size={13} />
            Acknowledge All
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "hsl(210 10% 40%)" }} />
            <Input
              placeholder="Search label..."
              className="pl-8 h-8 w-40 text-xs"
              style={{ background: "hsl(var(--input))", borderColor: "hsl(220 15% 20%)" }}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
              data-testid="input-search"
            />
          </div>

          <Select value={severity} onValueChange={(v) => { setSeverity(v); setOffset(0); }}>
            <SelectTrigger className="h-8 w-32 text-xs" style={{ background: "hsl(var(--input))", borderColor: "hsl(220 15% 20%)" }} data-testid="select-severity">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="alert">Alert</SelectItem>
            </SelectContent>
          </Select>

          <Select value={acknowledged} onValueChange={(v) => { setAcknowledged(v); setOffset(0); }}>
            <SelectTrigger className="h-8 w-32 text-xs" style={{ background: "hsl(var(--input))", borderColor: "hsl(220 15% 20%)" }} data-testid="select-acknowledged">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="false">Unacknowledged</SelectItem>
              <SelectItem value="true">Acknowledged</SelectItem>
            </SelectContent>
          </Select>

          <Select value={cameraFilter} onValueChange={(v) => { setCameraFilter(v); setOffset(0); }}>
            <SelectTrigger className="h-8 w-40 text-xs" style={{ background: "hsl(var(--input))", borderColor: "hsl(220 15% 20%)" }} data-testid="select-camera">
              <SelectValue placeholder="Camera" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cameras</SelectItem>
              {cameras.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0" style={{ background: "hsl(220 18% 10%)", zIndex: 1 }}>
            <tr style={{ borderBottom: "1px solid hsl(220 15% 18%)" }}>
              {["Timestamp", "Camera", "Object Label", "Confidence", "Track ID", "Bounding Box", "Severity", "Action"].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left font-medium" style={{ color: "hsl(210 10% 40%)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {detections.map((d) => {
              const bb = JSON.parse(d.boundingBox);
              return (
                <tr
                  key={d.id}
                  className={d.severity === "alert" && !d.acknowledged ? "alert-row" : ""}
                  style={{ borderBottom: "1px solid hsl(220 15% 12%)" }}
                  data-testid={`detection-row-${d.id}`}
                >
                  <td className="px-4 py-2.5 font-mono" style={{ color: "hsl(210 10% 55%)" }}>
                    <div>{new Date(d.timestamp).toLocaleDateString()}</div>
                    <div>{new Date(d.timestamp).toLocaleTimeString()}</div>
                  </td>
                  <td className="px-4 py-2.5 text-foreground">{camMap[d.cameraId] ?? `Cam #${d.cameraId}`}</td>
                  <td className="px-4 py-2.5 font-medium text-foreground capitalize">{d.label}</td>
                  <td className="px-4 py-2.5 font-mono" style={{ color: "hsl(195 85% 55%)" }}>
                    {(d.confidence * 100).toFixed(1)}%
                    <div className="w-16 h-1 rounded-full mt-1" style={{ background: "hsl(220 15% 20%)" }}>
                      <div className="h-full rounded-full" style={{ width: `${d.confidence * 100}%`, background: "hsl(195 85% 48%)" }} />
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-mono" style={{ color: "hsl(210 10% 45%)" }}>
                    {d.trackId ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs" style={{ color: "hsl(210 10% 40%)" }}>
                    x:{bb.x?.toFixed(2)} y:{bb.y?.toFixed(2)}<br />
                    w:{bb.w?.toFixed(2)} h:{bb.h?.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge
                      variant="outline"
                      className="text-xs px-1.5 py-0 h-4 border-0"
                      style={{ background: `${severityColor(d.severity)}18`, color: severityColor(d.severity) }}
                    >
                      {d.severity}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    {d.acknowledged ? (
                      <span className="text-xs" style={{ color: "hsl(210 10% 30%)" }}>ACK'd</span>
                    ) : (
                      <button
                        className="text-xs px-2 py-0.5 rounded transition-colors"
                        style={{ color: "hsl(195 85% 55%)", border: "1px solid hsl(195 85% 48% / 0.3)" }}
                        onClick={() => ackMutation.mutate(d.id)}
                        data-testid={`button-ack-${d.id}`}
                      >
                        ACK
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {detections.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center" style={{ color: "hsl(210 10% 30%)" }}>
                  <Shield size={32} className="mx-auto mb-2 opacity-20" />
                  <p>No detection events match your filters</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex-shrink-0 px-4 py-2 border-t flex items-center justify-between" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
        <span className="text-xs" style={{ color: "hsl(210 10% 40%)" }}>
          Showing {offset + 1}–{offset + detections.length}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="h-7 text-xs" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>Previous</Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" disabled={detections.length < limit} onClick={() => setOffset(offset + limit)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
