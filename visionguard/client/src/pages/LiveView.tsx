import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect, useRef } from "react";
import type { Camera, Detection } from "@shared/schema";
import { Grid2x2, Grid3x3, LayoutGrid, Maximize2, Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type GridSize = 1 | 2 | 4 | 6;

// Simulated video feed — shows stream URL + animated detection boxes
function CameraFeed({ camera, detections }: { camera: Camera; detections: Detection[] }) {
  const recent = detections
    .filter((d) => d.cameraId === camera.id && !d.acknowledged)
    .slice(0, 4);

  const bboxClass = (label: string) => {
    if (["person"].includes(label)) return "person";
    if (["car", "truck", "motorcycle"].includes(label)) return "car";
    return "default";
  };

  const bboxColor = (label: string) => {
    if (label === "person") return "#22c55e";
    if (["car", "truck", "motorcycle"].includes(label)) return "#3b82f6";
    return "#f59e0b";
  };

  return (
    <div className="camera-feed scanline-overlay w-full h-full flex flex-col rounded-lg overflow-hidden border" style={{ borderColor: "hsl(220 15% 18%)", minHeight: 0 }}>
      {/* Camera header overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-2 py-1.5" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)" }}>
        <div className="flex items-center gap-1.5">
          <span className={`status-dot ${camera.status}`} />
          <span className="text-xs font-medium text-white">{camera.name}</span>
        </div>
        <div className="flex items-center gap-1">
          {camera.detectionEnabled && camera.status === "active" && (
            <Badge className="text-xs px-1 h-4" style={{ background: "hsl(195 85% 48% / 0.8)", color: "white", border: "none" }}>
              AI ON
            </Badge>
          )}
          <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.5)" }}>
            {camera.protocol.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Feed area */}
      <div className="relative flex-1 flex items-center justify-center" style={{ background: "hsl(220 25% 5%)" }}>
        {camera.status === "active" ? (
          <>
            {/* Simulated feed — in production would be HLS/WebRTC stream */}
            <div className="w-full h-full relative overflow-hidden">
              {/* Grid pattern background simulating a real feed */}
              <div className="absolute inset-0" style={{
                background: `
                  radial-gradient(ellipse at 30% 40%, hsl(220 25% 10%) 0%, hsl(220 25% 6%) 100%)
                `,
              }}>
                {/* Simulated scene elements */}
                <div className="absolute bottom-0 left-0 right-0 h-1/3" style={{ background: "hsl(220 20% 8%)", borderTop: "1px solid hsl(220 15% 12%)" }} />
                <div className="absolute top-1/4 left-1/4 w-4 h-10 opacity-20" style={{ background: "hsl(0 0% 80%)" }} />
                <div className="absolute top-1/4 right-1/3 w-3 h-8 opacity-15" style={{ background: "hsl(0 0% 75%)" }} />
              </div>

              {/* Detection bounding boxes */}
              {recent.map((det) => {
                const bb = JSON.parse(det.boundingBox);
                return (
                  <div
                    key={det.id}
                    className="bbox"
                    style={{
                      left: `${bb.x * 100}%`,
                      top: `${bb.y * 100}%`,
                      width: `${bb.w * 100}%`,
                      height: `${bb.h * 100}%`,
                      borderColor: bboxColor(det.label),
                    }}
                  >
                    <span
                      className="absolute -top-5 left-0 text-xs px-1 font-medium leading-none py-0.5 rounded-sm"
                      style={{ background: bboxColor(det.label), color: "white", fontSize: 10, whiteSpace: "nowrap" }}
                    >
                      {det.label} {(det.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Stream info bottom overlay */}
            <div className="absolute bottom-0 left-0 right-0 px-2 py-1 z-10" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)" }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>
                  {camera.streamUrl}
                </span>
                <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </>
        ) : camera.status === "error" ? (
          <div className="flex flex-col items-center gap-2" style={{ color: "hsl(4 85% 55%)" }}>
            <WifiOff size={28} />
            <span className="text-xs font-medium">Connection Error</span>
            <span className="text-xs" style={{ color: "hsl(210 10% 35%)" }}>{camera.streamUrl}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2" style={{ color: "hsl(210 10% 35%)" }}>
            <WifiOff size={24} />
            <span className="text-xs">Camera Offline</span>
          </div>
        )}
      </div>

      {/* Alert indicator */}
      {recent.some((d) => d.severity === "alert") && (
        <div className="absolute top-6 right-2 z-10">
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ background: "hsl(4 85% 55% / 0.9)" }}>
            <AlertTriangle size={10} className="text-white" />
            <span className="text-white text-xs font-bold">ALERT</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function LiveView() {
  const [gridSize, setGridSize] = useState<GridSize>(4);
  const [selectedCam, setSelectedCam] = useState<number | null>(null);

  const { data: cameras = [] } = useQuery<Camera[]>({
    queryKey: ["/api/cameras"],
    queryFn: () => apiRequest("GET", "/api/cameras").then((r) => r.json()),
    refetchInterval: 30000,
  });

  const { data: detections = [], refetch } = useQuery<Detection[]>({
    queryKey: ["/api/detections", "live"],
    queryFn: () => apiRequest("GET", "/api/detections?limit=100&acknowledged=false").then((r) => r.json()),
    refetchInterval: 3000,
  });

  // WebSocket for live updates
  useEffect(() => {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}/ws`);
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "detection") refetch();
    };
    return () => ws.close();
  }, []);

  const displayedCams = selectedCam !== null
    ? cameras.filter((c) => c.id === selectedCam)
    : cameras.slice(0, gridSize);

  const gridClass = selectedCam !== null ? "camera-grid-1" : {
    1: "camera-grid-1",
    2: "camera-grid-2",
    4: "camera-grid-4",
    6: "camera-grid-6",
  }[gridSize];

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-foreground">Live View</h1>
          <div className="flex items-center gap-1">
            <span className="status-dot active" />
            <span className="text-xs" style={{ color: "hsl(210 10% 45%)" }}>{cameras.filter((c) => c.status === "active").length} streams</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedCam !== null && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedCam(null)} className="text-xs h-7">
              ← All Cameras
            </Button>
          )}
          <div className="flex items-center border rounded-md overflow-hidden" style={{ borderColor: "hsl(220 15% 20%)" }}>
            {([1, 2, 4, 6] as GridSize[]).map((size) => (
              <button
                key={size}
                className="px-2.5 py-1.5 text-xs transition-colors"
                style={{
                  background: gridSize === size ? "hsl(195 85% 48% / 0.15)" : "transparent",
                  color: gridSize === size ? "hsl(195 85% 55%)" : "hsl(210 10% 45%)",
                }}
                onClick={() => { setGridSize(size); setSelectedCam(null); }}
                data-testid={`grid-${size}`}
              >
                {size}×
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Camera grid */}
      <div className="flex-1 p-3 overflow-hidden">
        <div
          className={`grid gap-2 h-full ${gridClass}`}
          style={{ gridAutoRows: selectedCam ? "1fr" : undefined }}
        >
          {displayedCams.map((cam) => (
            <div key={cam.id} className="relative min-h-0" onDoubleClick={() => setSelectedCam(cam.id === selectedCam ? null : cam.id)}>
              <CameraFeed camera={cam} detections={detections} />
              <button
                className="absolute bottom-6 right-2 z-10 p-1 rounded opacity-0 hover:opacity-100 transition-opacity"
                style={{ background: "rgba(0,0,0,0.5)" }}
                onClick={() => setSelectedCam(cam.id)}
                title="Full screen"
              >
                <Maximize2 size={12} className="text-white" />
              </button>
            </div>
          ))}

          {/* Empty slots */}
          {Array.from({ length: Math.max(0, gridSize - displayedCams.length) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="rounded-lg border flex items-center justify-center"
              style={{ background: "hsl(220 22% 6%)", borderColor: "hsl(220 15% 14%)" }}
            >
              <div className="text-center" style={{ color: "hsl(210 10% 25%)" }}>
                <Camera size={20} className="mx-auto mb-1" />
                <p className="text-xs">No camera</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live detection ticker */}
      <div className="flex-shrink-0 border-t px-4 py-2 flex items-center gap-4 overflow-hidden" style={{ borderColor: "hsl(var(--sidebar-border))", background: "hsl(220 22% 6%)" }}>
        <span className="text-xs font-medium flex-shrink-0" style={{ color: "hsl(195 85% 55%)" }}>LIVE</span>
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide text-xs" style={{ color: "hsl(210 10% 45%)" }}>
          {detections.slice(0, 12).map((d) => (
            <span key={d.id} className="flex-shrink-0 flex items-center gap-1">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: d.severity === "alert" ? "var(--color-alert)" : d.severity === "warning" ? "var(--color-warning)" : "var(--color-success)" }}
              />
              <span className="capitalize font-medium text-foreground">{d.label}</span>
              <span>{(d.confidence * 100).toFixed(0)}%</span>
              <span className="opacity-50">·</span>
            </span>
          ))}
          {detections.length === 0 && <span>No recent detections</span>}
        </div>
      </div>
    </div>
  );
}
