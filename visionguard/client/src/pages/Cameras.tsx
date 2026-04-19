import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import type { Camera } from "@shared/schema";
import { Plus, Camera as CameraIcon, Trash2, Edit, Eye, ToggleLeft, ToggleRight, Wifi, WifiOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCameraSchema, type InsertCamera } from "@shared/schema";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Slider } from "@/components/ui/slider";

function CameraFormDialog({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Camera }) {
  const { toast } = useToast();
  const isEdit = !!initial;

  const form = useForm<InsertCamera>({
    resolver: zodResolver(insertCameraSchema),
    defaultValues: initial ?? {
      name: "",
      streamUrl: "",
      protocol: "rtsp",
      location: "",
      status: "active",
      detectionEnabled: true,
      modelConfig: "/opt/darknet/cfg/yolov4-tiny.cfg",
      modelWeights: "/opt/darknet/weights/yolov4-tiny.weights",
      modelNames: "/opt/darknet/data/coco.names",
      confidenceThreshold: 0.5,
      nmsThreshold: 0.45,
      thumbnailUrl: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertCamera) => apiRequest("POST", "/api/cameras", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/cameras"] }); toast({ title: "Camera added" }); onClose(); },
    onError: () => toast({ title: "Failed to add camera", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: InsertCamera) => apiRequest("PATCH", `/api/cameras/${initial?.id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/cameras"] }); toast({ title: "Camera updated" }); onClose(); },
    onError: () => toast({ title: "Failed to update camera", variant: "destructive" }),
  });

  const onSubmit = (data: InsertCamera) => {
    if (isEdit) updateMutation.mutate(data);
    else createMutation.mutate(data);
  };

  const conf = form.watch("confidenceThreshold");
  const nms = form.watch("nmsThreshold");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl" style={{ background: "hsl(var(--card))", borderColor: "hsl(220 15% 20%)" }}>
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">{isEdit ? "Edit Camera" : "Add Camera"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Camera Name</FormLabel>
                  <FormControl><Input {...field} className="h-8 text-xs" placeholder="Front Entrance" data-testid="input-camera-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="protocol" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Protocol</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-8 text-xs" data-testid="select-protocol"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rtsp">RTSP</SelectItem>
                      <SelectItem value="http">HTTP</SelectItem>
                      <SelectItem value="onvif">ONVIF</SelectItem>
                      <SelectItem value="rtmp">RTMP</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="streamUrl" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Stream URL</FormLabel>
                <FormControl><Input {...field} className="h-8 text-xs font-mono" placeholder="rtsp://192.168.1.100:554/stream1" data-testid="input-stream-url" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="location" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Location</FormLabel>
                <FormControl><Input {...field} className="h-8 text-xs" placeholder="Building A – Main Lobby" data-testid="input-location" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="border-t pt-3 space-y-3" style={{ borderColor: "hsl(220 15% 18%)" }}>
              <p className="text-xs font-medium text-foreground">Darknet / DarkHelp Configuration</p>

              <FormField control={form.control} name="modelConfig" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Model .cfg path</FormLabel>
                  <FormControl><Input {...field} className="h-8 text-xs font-mono" placeholder="/opt/darknet/cfg/yolov4-tiny.cfg" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="modelWeights" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Model .weights path</FormLabel>
                  <FormControl><Input {...field} className="h-8 text-xs font-mono" placeholder="/opt/darknet/weights/yolov4-tiny.weights" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="modelNames" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Model .names path</FormLabel>
                  <FormControl><Input {...field} className="h-8 text-xs font-mono" placeholder="/opt/darknet/data/coco.names" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Confidence Threshold: {conf}</Label>
                  <Slider
                    min={0.1} max={0.99} step={0.01}
                    value={[conf ?? 0.5]}
                    onValueChange={([v]) => form.setValue("confidenceThreshold", v)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label className="text-xs">NMS Threshold: {nms}</Label>
                  <Slider
                    min={0.1} max={0.99} step={0.01}
                    value={[nms ?? 0.45]}
                    onValueChange={([v]) => form.setValue("nmsThreshold", v)}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="text-xs">Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="detectionEnabled" render={({ field }) => (
                <FormItem className="flex items-center gap-2 mt-5">
                  <FormControl>
                    <button type="button" onClick={() => field.onChange(!field.value)} data-testid="toggle-detection">
                      {field.value ? <ToggleRight size={24} style={{ color: "hsl(195 85% 48%)" }} /> : <ToggleLeft size={24} style={{ color: "hsl(210 10% 40%)" }} />}
                    </button>
                  </FormControl>
                  <FormLabel className="text-xs !mt-0">AI Detection</FormLabel>
                </FormItem>
              )} />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" size="sm" className="text-xs h-8" onClick={onClose}>Cancel</Button>
              <Button type="submit" size="sm" className="text-xs h-8" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-camera">
                {isEdit ? "Save Changes" : "Add Camera"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function Cameras() {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editCam, setEditCam] = useState<Camera | undefined>();

  const { data: cameras = [], isLoading } = useQuery<Camera[]>({
    queryKey: ["/api/cameras"],
    queryFn: () => apiRequest("GET", "/api/cameras").then((r) => r.json()),
    refetchInterval: 15000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/cameras/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/cameras"] }); toast({ title: "Camera removed" }); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      apiRequest("PATCH", `/api/cameras/${id}`, { detectionEnabled: enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/cameras"] }),
  });

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === "active") return <Wifi size={14} style={{ color: "var(--color-success)" }} />;
    if (status === "error") return <AlertCircle size={14} style={{ color: "var(--color-alert)" }} />;
    return <WifiOff size={14} style={{ color: "var(--color-inactive)" }} />;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b flex-shrink-0 flex items-center justify-between" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
        <h1 className="text-lg font-semibold text-foreground">Camera Management</h1>
        <Button size="sm" className="text-xs h-8 gap-1.5" onClick={() => setAddOpen(true)} data-testid="button-add-camera">
          <Plus size={13} />
          Add Camera
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 skeleton rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {cameras.map((cam) => (
              <div
                key={cam.id}
                className="rounded-lg border p-4 flex items-center gap-4"
                style={{ background: "hsl(var(--card))", borderColor: "hsl(220 15% 18%)" }}
                data-testid={`camera-card-${cam.id}`}
              >
                {/* Status + icon */}
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "hsl(220 20% 8%)" }}>
                  <StatusIcon status={cam.status} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{cam.name}</span>
                    <Badge variant="outline" className="text-xs px-1.5 h-4 border-0" style={{
                      background: cam.status === "active" ? "hsl(142 70% 45% / 0.1)" : cam.status === "error" ? "hsl(4 85% 55% / 0.1)" : "hsl(220 15% 20%)",
                      color: cam.status === "active" ? "var(--color-success)" : cam.status === "error" ? "var(--color-alert)" : "hsl(210 10% 45%)",
                    }}>
                      {cam.status}
                    </Badge>
                    {cam.detectionEnabled && <Badge variant="outline" className="text-xs px-1.5 h-4 border-0" style={{ background: "hsl(195 85% 48% / 0.1)", color: "hsl(195 85% 55%)" }}>AI ON</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs font-mono truncate" style={{ color: "hsl(210 10% 40%)" }}>{cam.streamUrl}</span>
                    <span className="text-xs flex-shrink-0" style={{ color: "hsl(210 10% 35%)" }}>{cam.location}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: "hsl(210 10% 35%)" }}>
                    <span>Protocol: <span className="uppercase text-foreground">{cam.protocol}</span></span>
                    <span>Confidence: <span className="font-mono" style={{ color: "hsl(195 85% 55%)" }}>{cam.confidenceThreshold}</span></span>
                    <span>NMS: <span className="font-mono" style={{ color: "hsl(195 85% 55%)" }}>{cam.nmsThreshold}</span></span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    className="p-1.5 rounded transition-colors"
                    style={{ color: cam.detectionEnabled ? "hsl(195 85% 55%)" : "hsl(210 10% 40%)" }}
                    onClick={() => toggleMutation.mutate({ id: cam.id, enabled: !cam.detectionEnabled })}
                    title={cam.detectionEnabled ? "Disable AI detection" : "Enable AI detection"}
                    data-testid={`button-toggle-detection-${cam.id}`}
                  >
                    {cam.detectionEnabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                  <button
                    className="p-1.5 rounded transition-colors hover:text-foreground"
                    style={{ color: "hsl(210 10% 40%)" }}
                    onClick={() => setEditCam(cam)}
                    data-testid={`button-edit-${cam.id}`}
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    className="p-1.5 rounded transition-colors"
                    style={{ color: "hsl(210 10% 40%)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-alert)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "hsl(210 10% 40%)")}
                    onClick={() => {
                      if (confirm(`Remove camera "${cam.name}"?`)) deleteMutation.mutate(cam.id);
                    }}
                    data-testid={`button-delete-${cam.id}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}

            {cameras.length === 0 && (
              <div className="py-16 text-center" style={{ color: "hsl(210 10% 30%)" }}>
                <CameraIcon size={40} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">No cameras configured</p>
                <Button size="sm" className="mt-4 text-xs h-8 gap-1.5" onClick={() => setAddOpen(true)}>
                  <Plus size={13} />Add your first camera
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <CameraFormDialog open={addOpen} onClose={() => setAddOpen(false)} />
      {editCam && <CameraFormDialog open={!!editCam} onClose={() => setEditCam(undefined)} initial={editCam} />}
    </div>
  );
}
