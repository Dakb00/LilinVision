import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import type { Model } from "@shared/schema";
import { Cpu, Plus, Trash2, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertModelSchema, type InsertModel } from "@shared/schema";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

function ModelStatusIcon({ status }: { status: string }) {
  if (status === "ready") return <CheckCircle size={14} style={{ color: "var(--color-success)" }} />;
  if (status === "loading") return <Loader2 size={14} className="animate-spin" style={{ color: "var(--color-warning)" }} />;
  return <AlertCircle size={14} style={{ color: "var(--color-alert)" }} />;
}

function ModelFormDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const form = useForm<InsertModel>({
    resolver: zodResolver(insertModelSchema),
    defaultValues: {
      name: "",
      description: "",
      cfgPath: "",
      weightsPath: "",
      namesPath: "",
      classes: "[]",
      type: "yolov4",
      status: "ready",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertModel) => apiRequest("POST", "/api/models", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/models"] }); toast({ title: "Model added" }); onClose(); },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent style={{ background: "hsl(var(--card))", borderColor: "hsl(220 15% 20%)" }}>
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">Add AI Model</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Model Name</FormLabel>
                  <FormControl><Input {...field} className="h-8 text-xs" placeholder="YOLOv4-tiny" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yolov4">YOLOv4</SelectItem>
                      <SelectItem value="yolov4-tiny">YOLOv4-tiny</SelectItem>
                      <SelectItem value="yolov7">YOLOv7</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Description</FormLabel>
                <FormControl><Input {...field} className="h-8 text-xs" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="cfgPath" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">.cfg path</FormLabel>
                <FormControl><Input {...field} className="h-8 text-xs font-mono" placeholder="/opt/darknet/cfg/yolov4.cfg" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="weightsPath" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">.weights path</FormLabel>
                <FormControl><Input {...field} className="h-8 text-xs font-mono" placeholder="/opt/darknet/weights/yolov4.weights" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="namesPath" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">.names path</FormLabel>
                <FormControl><Input {...field} className="h-8 text-xs font-mono" placeholder="/opt/darknet/data/coco.names" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="classes" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Classes (JSON array)</FormLabel>
                <FormControl><Textarea {...field} className="text-xs font-mono h-20 resize-none" placeholder='["person", "car", "truck"]' /></FormControl>
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="ghost" size="sm" className="text-xs h-8" onClick={onClose}>Cancel</Button>
              <Button type="submit" size="sm" className="text-xs h-8" disabled={createMutation.isPending}>Add Model</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function Models() {
  const [addOpen, setAddOpen] = useState(false);
  const { toast } = useToast();

  const { data: models = [], isLoading } = useQuery<Model[]>({
    queryKey: ["/api/models"],
    queryFn: () => apiRequest("GET", "/api/models").then((r) => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/models/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/models"] }); toast({ title: "Model removed" }); },
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b flex-shrink-0 flex items-center justify-between" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
        <div>
          <h1 className="text-lg font-semibold text-foreground">AI Models</h1>
          <p className="text-xs mt-0.5" style={{ color: "hsl(210 10% 40%)" }}>Darknet / DarkHelp neural network models</p>
        </div>
        <Button size="sm" className="text-xs h-8 gap-1.5" onClick={() => setAddOpen(true)} data-testid="button-add-model">
          <Plus size={13} />
          Add Model
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 skeleton rounded-lg" />)}</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {models.map((model) => {
              const classes: string[] = JSON.parse(model.classes || "[]");
              return (
                <div
                  key={model.id}
                  className="rounded-lg border p-5"
                  style={{ background: "hsl(var(--card))", borderColor: "hsl(220 15% 18%)" }}
                  data-testid={`model-card-${model.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "hsl(195 85% 48% / 0.1)" }}>
                        <Cpu size={16} style={{ color: "hsl(195 85% 55%)" }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{model.name}</span>
                          <Badge variant="outline" className="text-xs px-1.5 h-4 border-0" style={{ background: "hsl(220 15% 16%)", color: "hsl(210 10% 55%)" }}>
                            {model.type}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <ModelStatusIcon status={model.status} />
                            <span className="text-xs capitalize" style={{
                              color: model.status === "ready" ? "var(--color-success)" : model.status === "loading" ? "var(--color-warning)" : "var(--color-alert)"
                            }}>
                              {model.status}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "hsl(210 10% 45%)" }}>{model.description}</p>
                      </div>
                    </div>
                    <button
                      className="p-1.5 rounded"
                      style={{ color: "hsl(210 10% 35%)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-alert)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "hsl(210 10% 35%)")}
                      onClick={() => { if (confirm(`Remove model "${model.name}"?`)) deleteMutation.mutate(model.id); }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {[
                      { label: ".cfg", value: model.cfgPath || "—" },
                      { label: ".weights", value: model.weightsPath || "—" },
                      { label: ".names", value: model.namesPath || "—" },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded p-2" style={{ background: "hsl(220 20% 7%)" }}>
                        <p className="text-xs font-mono" style={{ color: "hsl(210 10% 35%)" }}>{label}</p>
                        <p className="text-xs font-mono truncate mt-0.5" style={{ color: "hsl(195 85% 55%)" }}>{value}</p>
                      </div>
                    ))}
                  </div>

                  {classes.length > 0 && (
                    <div>
                      <p className="text-xs mb-1.5" style={{ color: "hsl(210 10% 40%)" }}>
                        {classes.length} detection classes
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {classes.slice(0, 20).map((cls) => (
                          <Badge key={cls} variant="outline" className="text-xs px-1.5 py-0 h-4 border-0 font-normal" style={{ background: "hsl(220 15% 14%)", color: "hsl(210 10% 55%)" }}>
                            {cls}
                          </Badge>
                        ))}
                        {classes.length > 20 && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0 h-4 border-0" style={{ background: "hsl(220 15% 14%)", color: "hsl(210 10% 40%)" }}>
                            +{classes.length - 20} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ModelFormDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
