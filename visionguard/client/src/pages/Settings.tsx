import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { Settings2, Server, Database, Bell, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Settings() {
  const { toast } = useToast();
  const { data: settings = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
    queryFn: () => apiRequest("GET", "/api/settings").then((r) => r.json()),
  });

  const [form, setForm] = useState<Record<string, string>>({});
  useEffect(() => { if (Object.keys(settings).length > 0) setForm({ ...settings }); }, [settings]);

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/settings", form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/settings"] }); toast({ title: "Settings saved" }); },
  });

  const field = (key: string, label: string, placeholder?: string, mono?: boolean) => (
    <div key={key}>
      <Label className="text-xs">{label}</Label>
      <Input
        className={`h-8 text-xs mt-1.5 ${mono ? "font-mono" : ""}`}
        placeholder={placeholder}
        value={form[key] ?? ""}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        data-testid={`input-${key}`}
      />
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b flex-shrink-0 flex items-center justify-between" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
        <h1 className="text-lg font-semibold text-foreground">Settings</h1>
        <Button size="sm" className="text-xs h-8 gap-1.5" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-settings">
          <Save size={13} />
          Save Changes
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* System */}
        <Card className="border-0" style={{ background: "hsl(var(--card))" }}>
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Settings2 size={14} />System
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-3">
            {field("system_name", "System Name", "VisionGuard VMS")}
          </CardContent>
        </Card>

        {/* DarkHelp Server */}
        <Card className="border-0" style={{ background: "hsl(var(--card))" }}>
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Server size={14} />DarkHelp Server
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-3">
            <p className="text-xs" style={{ color: "hsl(210 10% 40%)" }}>
              DarkHelp Server is a persistent daemon that loads Darknet neural networks once and serves inference requests. Configure the connection below.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {field("darkhelp_server_host", "DarkHelp Server Host", "127.0.0.1", true)}
              {field("darkhelp_server_port", "Port", "4000", true)}
            </div>
            {field("darknet_cfg_dir", "Darknet .cfg Directory", "/opt/darknet/cfg", true)}
            {field("darknet_weights_dir", "Darknet .weights Directory", "/opt/darknet/weights", true)}
            <div className="mt-2 p-3 rounded" style={{ background: "hsl(220 22% 6%)", border: "1px solid hsl(220 15% 16%)" }}>
              <p className="text-xs font-mono" style={{ color: "hsl(210 10% 40%)" }}>
                # Start DarkHelp Server (example)
              </p>
              <p className="text-xs font-mono mt-1" style={{ color: "hsl(195 85% 55%)" }}>
                darkhelp-server --port {form.darkhelp_server_port || "4000"} --cfg /path/to/model.cfg --weights /path/to/model.weights --names /path/to/model.names
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Detection */}
        <Card className="border-0" style={{ background: "hsl(var(--card))" }}>
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database size={14} />Detection & Recording
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-3">
            {field("detection_interval_ms", "Detection Interval (ms)", "500", true)}
            {field("recording_path", "Recording Storage Path", "/var/visionguard/recordings", true)}
            {field("max_recording_days", "Max Recording Retention (days)", "30", true)}
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="border-0" style={{ background: "hsl(var(--card))" }}>
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bell size={14} />Alerts & Webhooks
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-3">
            <p className="text-xs" style={{ color: "hsl(210 10% 40%)" }}>
              Configure a webhook to receive real-time detection alerts via HTTP POST (JSON payload).
            </p>
            {field("alert_webhook_url", "Alert Webhook URL", "https://your-server.com/vms-alerts")}
            <div className="p-3 rounded text-xs font-mono" style={{ background: "hsl(220 22% 6%)", border: "1px solid hsl(220 15% 16%)", color: "hsl(210 10% 40%)" }}>
              <p style={{ color: "hsl(210 10% 50%)" }}>// Webhook payload example:</p>
              <pre style={{ color: "hsl(195 85% 60%)" }}>{`{
  "event": "detection",
  "camera": { "id": 1, "name": "Front Entrance" },
  "detection": {
    "label": "person",
    "confidence": 0.92,
    "severity": "alert",
    "timestamp": "2026-04-13T12:00:00Z",
    "bounding_box": { "x": 0.1, "y": 0.2, "w": 0.15, "h": 0.35 }
  }
}`}</pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
