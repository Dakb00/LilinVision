import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import type { ApiKey } from "@shared/schema";
import { Key, Plus, Trash2, Copy, CheckCircle, ExternalLink, Code2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ENDPOINTS = [
  { method: "GET", path: "/vms/v1/info", desc: "System info & capabilities", auth: "read" },
  { method: "GET", path: "/vms/v1/cameras", desc: "List all cameras", auth: "read" },
  { method: "GET", path: "/vms/v1/cameras/:id", desc: "Get camera details", auth: "read" },
  { method: "GET", path: "/vms/v1/cameras/:id/stream", desc: "Get stream URL", auth: "stream" },
  { method: "POST", path: "/vms/v1/cameras/:id/detect", desc: "Trigger DarkHelp inference", auth: "write" },
  { method: "GET", path: "/vms/v1/detections", desc: "Query detection events", auth: "detections" },
  { method: "GET", path: "/vms/v1/detections/stats", desc: "Detection statistics", auth: "detections" },
  { method: "GET", path: "/vms/v1/models", desc: "List AI models", auth: "read" },
  { method: "GET", path: "/vms/v1/health", desc: "Health check (no auth)", auth: "none" },
  { method: "GET", path: "/vms/v1/openapi.json", desc: "OpenAPI spec", auth: "none" },
];

const PERMISSIONS = ["read", "write", "stream", "detections"];

const SDK_EXAMPLES = {
  curl: `# VisionGuard VMS — External API Example
# Replace YOUR_API_KEY with your actual key

# 1. Health check
curl https://your-vms-host/vms/v1/health

# 2. List cameras (requires: read)
curl -H "Authorization: Bearer YOUR_API_KEY" \\
  https://your-vms-host/vms/v1/cameras

# 3. Query recent detections (requires: detections)
curl -H "Authorization: Bearer YOUR_API_KEY" \\
  "https://your-vms-host/vms/v1/detections?limit=50&severity=alert"

# 4. Trigger manual inference (requires: write)
curl -X POST \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  https://your-vms-host/vms/v1/cameras/1/detect

# 5. Get stream URL (requires: stream)
curl -H "Authorization: Bearer YOUR_API_KEY" \\
  https://your-vms-host/vms/v1/cameras/1/stream`,

  python: `# VisionGuard VMS — Python SDK Integration Example
import requests

BASE_URL = "https://your-vms-host"
API_KEY  = "vg_your_api_key_here"

headers = {"Authorization": f"Bearer {API_KEY}"}

# List cameras
cameras = requests.get(f"{BASE_URL}/vms/v1/cameras", headers=headers).json()
for cam in cameras["cameras"]:
    print(f"{cam['id']} — {cam['name']} ({cam['status']})")

# Fetch recent alerts
dets = requests.get(
    f"{BASE_URL}/vms/v1/detections",
    headers=headers,
    params={"severity": "alert", "limit": 20, "acknowledged": "false"}
).json()

for d in dets["detections"]:
    print(f"[{d['timestamp']}] {d['label']} @ {d['confidence']*100:.1f}% — Cam {d['camera_id']}")

# Trigger inference on camera 1 (DarkHelp Server)
result = requests.post(
    f"{BASE_URL}/vms/v1/cameras/1/detect",
    headers=headers
).json()
print(f"Detected: {result['predictions']}")

# Get detection stats
stats = requests.get(f"{BASE_URL}/vms/v1/detections/stats", headers=headers).json()
print(f"Total: {stats['total']}, Today: {stats['today']}, Alerts: {stats['alerts']}")`,

  milestone: `// VisionGuard → Milestone XProtect SDK Integration (C#)
// Integrates via MIP SDK — feeds VisionGuard detections as analytics events

using VideoOS.Platform;
using System.Net.Http;
using System.Text.Json;

public class VisionGuardPlugin : IAnalyticsPlugin
{
    private const string VG_BASE    = "https://your-vms-host/vms/v1";
    private const string VG_API_KEY = "vg_your_api_key_here";

    private readonly HttpClient _http;

    public VisionGuardPlugin()
    {
        _http = new HttpClient();
        _http.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", VG_API_KEY);
    }

    // Pull unacknowledged detections and push to Milestone as analytics events
    public async Task SyncDetections(Guid cameraGuid, int vgCameraId)
    {
        var resp  = await _http.GetStringAsync(
            $"{VG_BASE}/detections?camera_id={vgCameraId}&acknowledged=false&limit=50");
        var dets  = JsonSerializer.Deserialize<DetectionResponse>(resp);

        foreach (var det in dets.detections)
        {
            var analyticsEvent = new AnalyticsDetectionData
            {
                CameraGuid  = cameraGuid,
                Timestamp   = DateTime.Parse(det.timestamp),
                ObjectClass = det.label,
                Confidence  = (float)det.confidence,
                BoundingBox = new RectF(det.bounding_box.x, det.bounding_box.y,
                                       det.bounding_box.w, det.bounding_box.h),
            };
            EnvironmentManager.Instance.SendMessage(
                new VideoOS.Platform.Messaging.Message(MessageId.Analytics, analyticsEvent));
        }
    }

    // Get stream URL from VisionGuard and register in Milestone
    public async Task<string> GetStreamUrl(int vgCameraId)
    {
        var resp = await _http.GetStringAsync($"{VG_BASE}/cameras/{vgCameraId}/stream");
        var info = JsonSerializer.Deserialize<StreamInfo>(resp);
        return info.stream_url;
    }
}`,
};

function methodColor(method: string) {
  return method === "GET" ? "hsl(195 85% 48%)" : method === "POST" ? "hsl(142 70% 45%)" : "hsl(38 95% 54%)";
}

export function ApiIntegration() {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyDesc, setNewKeyDesc] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<string[]>(["read"]);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  const { data: apiKeys = [] } = useQuery<ApiKey[]>({
    queryKey: ["/api/api-keys"],
    queryFn: () => apiRequest("GET", "/api/api-keys").then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/api-keys", {
      name: newKeyName,
      description: newKeyDesc,
      permissions: JSON.stringify(selectedPerms),
      active: true,
    }).then((r) => r.json()),
    onSuccess: (data: ApiKey) => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      setNewlyCreatedKey(data.key);
      setAddOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/api-keys/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] }),
  });

  const togglePerm = (p: string) => {
    setSelectedPerms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b flex-shrink-0" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
        <h1 className="text-lg font-semibold text-foreground">API Integration</h1>
        <p className="text-xs mt-0.5" style={{ color: "hsl(210 10% 40%)" }}>
          External VMS SDK integration — connect Milestone, Genetec, Avigilon, and more
        </p>
      </div>

      <Tabs defaultValue="keys" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-6 mt-3 mb-0 justify-start h-8 bg-transparent border-b rounded-none w-auto" style={{ borderColor: "hsl(220 15% 18%)" }}>
          {[{ value: "keys", label: "API Keys" }, { value: "endpoints", label: "Endpoints" }, { value: "sdk", label: "SDK Examples" }].map(({ value, label }) => (
            <TabsTrigger key={value} value={value} className="text-xs h-8 rounded-none px-4 border-b-2 border-transparent data-[state=active]:border-current" style={{ color: "hsl(210 10% 45%)" }}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* API Keys tab */}
        <TabsContent value="keys" className="flex-1 overflow-y-auto mt-0 p-6 space-y-4">
          {newlyCreatedKey && (
            <div className="rounded-lg border p-4" style={{ background: "hsl(142 70% 45% / 0.08)", borderColor: "hsl(142 70% 45% / 0.3)" }}>
              <p className="text-xs font-medium mb-1" style={{ color: "var(--color-success)" }}>API key created — save this now, it won't be shown again</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono p-2 rounded" style={{ background: "hsl(220 22% 6%)", color: "hsl(195 85% 60%)" }}>
                  {newlyCreatedKey}
                </code>
                <button onClick={() => { navigator.clipboard.writeText(newlyCreatedKey); toast({ title: "Copied!" }); }} className="p-2 rounded" style={{ background: "hsl(142 70% 45% / 0.15)", color: "var(--color-success)" }}>
                  <Copy size={14} />
                </button>
              </div>
              <button onClick={() => setNewlyCreatedKey(null)} className="text-xs mt-2" style={{ color: "hsl(210 10% 40%)" }}>Dismiss</button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: "hsl(210 10% 40%)" }}>{apiKeys.length} API keys</p>
            <Button size="sm" className="text-xs h-7 gap-1.5" onClick={() => setAddOpen(true)} data-testid="button-create-key">
              <Plus size={12} />Create API Key
            </Button>
          </div>

          <div className="space-y-3">
            {apiKeys.map((key) => {
              const perms: string[] = JSON.parse(key.permissions);
              return (
                <div key={key.id} className="rounded-lg border p-4" style={{ background: "hsl(var(--card))", borderColor: "hsl(220 15% 18%)" }} data-testid={`api-key-${key.id}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "hsl(195 85% 48% / 0.1)" }}>
                        <Key size={14} style={{ color: "hsl(195 85% 55%)" }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{key.name}</span>
                          {key.active ? (
                            <Badge variant="outline" className="h-4 text-xs px-1.5 border-0" style={{ background: "hsl(142 70% 45% / 0.1)", color: "var(--color-success)" }}>active</Badge>
                          ) : (
                            <Badge variant="outline" className="h-4 text-xs px-1.5 border-0" style={{ background: "hsl(220 15% 16%)", color: "hsl(210 10% 40%)" }}>inactive</Badge>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "hsl(210 10% 40%)" }}>{key.description}</p>
                        <code className="text-xs font-mono mt-1 block" style={{ color: "hsl(210 10% 35%)" }}>{key.key}</code>
                      </div>
                    </div>
                    <button
                      className="p-1.5 rounded"
                      style={{ color: "hsl(210 10% 35%)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-alert)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "hsl(210 10% 35%)")}
                      onClick={() => { if (confirm("Revoke this API key?")) deleteMutation.mutate(key.id); }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 mt-3">
                    <Shield size={12} style={{ color: "hsl(210 10% 35%)" }} />
                    {perms.map((p) => (
                      <Badge key={p} variant="outline" className="h-4 text-xs px-1.5 border-0 font-normal" style={{ background: "hsl(220 15% 14%)", color: "hsl(210 10% 50%)" }}>
                        {p}
                      </Badge>
                    ))}
                    {key.lastUsed && (
                      <span className="text-xs ml-2" style={{ color: "hsl(210 10% 30%)" }}>
                        Last used: {new Date(key.lastUsed).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Endpoints tab */}
        <TabsContent value="endpoints" className="flex-1 overflow-y-auto mt-0 p-6">
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: "hsl(220 15% 18%)" }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ background: "hsl(220 20% 8%)", borderBottom: "1px solid hsl(220 15% 18%)" }}>
              <span className="text-xs font-medium text-foreground">External VMS API — /vms/v1/*</span>
              <a
                href="/vms/v1/openapi.json"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs flex items-center gap-1"
                style={{ color: "hsl(195 85% 55%)" }}
              >
                <ExternalLink size={11} />
                OpenAPI JSON
              </a>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid hsl(220 15% 18%)" }}>
                  {["Method", "Endpoint", "Description", "Required Permission"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left font-medium" style={{ color: "hsl(210 10% 40%)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ENDPOINTS.map((ep) => (
                  <tr key={ep.path} style={{ borderBottom: "1px solid hsl(220 15% 12%)" }}>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className="text-xs px-1.5 h-4 border-0 font-mono" style={{ background: `${methodColor(ep.method)}18`, color: methodColor(ep.method) }}>
                        {ep.method}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 font-mono" style={{ color: "hsl(195 85% 60%)" }}>{ep.path}</td>
                    <td className="px-4 py-2.5 text-foreground">{ep.desc}</td>
                    <td className="px-4 py-2.5">
                      {ep.auth === "none" ? (
                        <span style={{ color: "hsl(210 10% 35%)" }}>None</span>
                      ) : (
                        <Badge variant="outline" className="text-xs px-1.5 h-4 border-0" style={{ background: "hsl(220 15% 14%)", color: "hsl(210 10% 55%)" }}>
                          {ep.auth}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-4 rounded-lg" style={{ background: "hsl(220 20% 7%)", border: "1px solid hsl(220 15% 16%)" }}>
            <p className="text-xs font-medium text-foreground mb-2">Authentication</p>
            <pre className="api-block">
{`# Pass API key in Authorization header:
Authorization: Bearer vg_your_api_key_here

# Or as query parameter:
GET /vms/v1/cameras?api_key=vg_your_api_key_here`}
            </pre>
          </div>
        </TabsContent>

        {/* SDK Examples tab */}
        <TabsContent value="sdk" className="flex-1 overflow-y-auto mt-0 p-6 space-y-4">
          {Object.entries(SDK_EXAMPLES).map(([lang, code]) => (
            <div key={lang}>
              <div className="flex items-center gap-2 mb-2">
                <Code2 size={13} style={{ color: "hsl(195 85% 55%)" }} />
                <span className="text-xs font-medium text-foreground capitalize">
                  {lang === "milestone" ? "Milestone XProtect (C# MIP SDK)" : lang === "python" ? "Python" : "cURL"}
                </span>
              </div>
              <pre className="api-block whitespace-pre-wrap">{code}</pre>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      {/* Create API Key dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => !o && setAddOpen(false)}>
        <DialogContent style={{ background: "hsl(var(--card))", borderColor: "hsl(220 15% 20%)" }}>
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Create API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Integration Name</Label>
              <Input
                className="h-8 text-xs mt-1.5"
                placeholder="Milestone XProtect"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                data-testid="input-key-name"
              />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input
                className="h-8 text-xs mt-1.5"
                placeholder="Used by Milestone XProtect VMS SDK"
                value={newKeyDesc}
                onChange={(e) => setNewKeyDesc(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Permissions</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {PERMISSIONS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePerm(p)}
                    className="px-3 py-1 rounded text-xs font-medium transition-colors"
                    style={{
                      background: selectedPerms.includes(p) ? "hsl(195 85% 48% / 0.2)" : "hsl(220 15% 14%)",
                      color: selectedPerms.includes(p) ? "hsl(195 85% 60%)" : "hsl(210 10% 45%)",
                      border: `1px solid ${selectedPerms.includes(p) ? "hsl(195 85% 48% / 0.4)" : "hsl(220 15% 20%)"}`,
                    }}
                    data-testid={`perm-${p}`}
                  >
                    {selectedPerms.includes(p) && <CheckCircle size={10} className="inline mr-1" />}
                    {p}
                  </button>
                ))}
              </div>
              <p className="text-xs mt-2" style={{ color: "hsl(210 10% 35%)" }}>
                read: list cameras/models · write: trigger inference · stream: get stream URLs · detections: query events
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button size="sm" className="text-xs h-8" disabled={!newKeyName || createMutation.isPending} onClick={() => createMutation.mutate()} data-testid="button-create-key-submit">
              Create Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
