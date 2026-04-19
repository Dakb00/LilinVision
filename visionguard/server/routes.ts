import type { Express } from "express";
import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import crypto from "crypto";
import { storage } from "./storage";
import { insertCameraSchema, insertDetectionSchema, insertModelSchema, insertApiKeySchema } from "@shared/schema";
import { z } from "zod";

// ─── WebSocket broadcast helper ───────────────────────────────────────────────
let wss: WebSocketServer;
function broadcast(data: object) {
  if (!wss) return;
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

// ─── DarkHelp Simulation Layer ────────────────────────────────────────────────
// In production this layer would communicate with the DarkHelp Server process
// via TCP/Unix socket. Here we simulate realistic detection outputs.
const DETECTION_LABELS = ["person", "car", "truck", "bicycle", "dog", "backpack", "cell phone", "laptop", "bag", "motorcycle"];
const SEVERITY_MAP: Record<string, "info" | "warning" | "alert"> = {
  person: "info",
  car: "info",
  truck: "info",
  bicycle: "info",
  dog: "info",
  backpack: "warning",
  "cell phone": "info",
  laptop: "warning",
  bag: "info",
  motorcycle: "info",
  weapon: "alert",
};

function simulateDarkHelpDetection(cameraId: number, confidence: number) {
  const label = DETECTION_LABELS[Math.floor(Math.random() * DETECTION_LABELS.length)];
  const severity = SEVERITY_MAP[label] ?? "info";
  // Random chance for high-severity if confidence is high
  const finalSeverity = confidence > 0.85 && Math.random() > 0.8 ? "alert" : severity;
  return {
    cameraId,
    timestamp: new Date().toISOString(),
    label,
    confidence: Math.round(confidence * 100) / 100,
    boundingBox: JSON.stringify({
      x: Math.round(Math.random() * 0.7 * 100) / 100,
      y: Math.round(Math.random() * 0.7 * 100) / 100,
      w: Math.round((0.1 + Math.random() * 0.3) * 100) / 100,
      h: Math.round((0.1 + Math.random() * 0.3) * 100) / 100,
    }),
    frameUrl: "",
    trackId: Math.floor(Math.random() * 200),
    severity: finalSeverity,
    acknowledged: false,
  } as const;
}

// ─── API Key middleware ───────────────────────────────────────────────────────
function requireApiKey(requiredPermission: string) {
  return (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    const keyParam = req.query.api_key as string;
    const keyValue = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : keyParam;
    if (!keyValue) return res.status(401).json({ error: "API key required" });
    const apiKey = storage.getApiKeyByKey(keyValue);
    if (!apiKey || !apiKey.active) return res.status(401).json({ error: "Invalid or inactive API key" });
    const perms: string[] = JSON.parse(apiKey.permissions);
    if (!perms.includes(requiredPermission)) return res.status(403).json({ error: `Permission '${requiredPermission}' required` });
    storage.touchApiKey(apiKey.id);
    req.apiKey = apiKey;
    next();
  };
}

export async function registerRoutes(httpServer: Server, app: Express) {
  // ─── WebSocket server ──────────────────────────────────────────────────────
  wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  wss.on("connection", (ws) => {
    ws.send(JSON.stringify({ type: "connected", message: "VisionGuard VMS connected" }));
  });

  // ─── Simulate live detections on active cameras ────────────────────────────
  setInterval(() => {
    const cams = storage.getCameras().filter((c) => c.status === "active" && c.detectionEnabled);
    if (cams.length === 0) return;
    if (Math.random() > 0.4) return; // ~60% chance each 3s interval
    const cam = cams[Math.floor(Math.random() * cams.length)];
    const confidence = Math.round((0.48 + Math.random() * 0.51) * 100) / 100;
    const det = simulateDarkHelpDetection(cam.id, confidence);
    const created = storage.createDetection(det);
    broadcast({ type: "detection", detection: created, camera: cam });
  }, 3000);

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNAL API (/api/*) — used by the web UI
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Cameras ───────────────────────────────────────────────────────────────
  app.get("/api/cameras", (req, res) => {
    res.json(storage.getCameras());
  });

  app.get("/api/cameras/:id", (req, res) => {
    const cam = storage.getCamera(Number(req.params.id));
    if (!cam) return res.status(404).json({ error: "Camera not found" });
    res.json(cam);
  });

  app.post("/api/cameras", (req, res) => {
    const parsed = insertCameraSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    res.json(storage.createCamera(parsed.data));
  });

  app.patch("/api/cameras/:id", (req, res) => {
    const partial = insertCameraSchema.partial().safeParse(req.body);
    if (!partial.success) return res.status(400).json({ error: partial.error.flatten() });
    const updated = storage.updateCamera(Number(req.params.id), partial.data);
    if (!updated) return res.status(404).json({ error: "Camera not found" });
    res.json(updated);
  });

  app.delete("/api/cameras/:id", (req, res) => {
    storage.deleteCamera(Number(req.params.id));
    res.json({ success: true });
  });

  // ─── Detections ────────────────────────────────────────────────────────────
  app.get("/api/detections", (req, res) => {
    const { cameraId, limit, offset, severity, acknowledged, search } = req.query;
    res.json(storage.getDetections({
      cameraId: cameraId ? Number(cameraId) : undefined,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
      severity: severity as string,
      acknowledged: acknowledged !== undefined ? acknowledged === "true" : undefined,
      search: search as string,
    }));
  });

  app.get("/api/detections/stats", (req, res) => {
    res.json(storage.getDetectionStats());
  });

  app.get("/api/detections/:id", (req, res) => {
    const d = storage.getDetection(Number(req.params.id));
    if (!d) return res.status(404).json({ error: "Detection not found" });
    res.json(d);
  });

  app.post("/api/detections", (req, res) => {
    const parsed = insertDetectionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const created = storage.createDetection(parsed.data);
    broadcast({ type: "detection", detection: created });
    res.json(created);
  });

  app.post("/api/detections/:id/acknowledge", (req, res) => {
    storage.acknowledgeDetection(Number(req.params.id));
    res.json({ success: true });
  });

  app.post("/api/detections/acknowledge-all", (req, res) => {
    storage.acknowledgeAll();
    res.json({ success: true });
  });

  // ─── Models ────────────────────────────────────────────────────────────────
  app.get("/api/models", (req, res) => {
    res.json(storage.getModels());
  });

  app.get("/api/models/:id", (req, res) => {
    const m = storage.getModel(Number(req.params.id));
    if (!m) return res.status(404).json({ error: "Model not found" });
    res.json(m);
  });

  app.post("/api/models", (req, res) => {
    const parsed = insertModelSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    res.json(storage.createModel(parsed.data));
  });

  app.patch("/api/models/:id", (req, res) => {
    const partial = insertModelSchema.partial().safeParse(req.body);
    if (!partial.success) return res.status(400).json({ error: partial.error.flatten() });
    const updated = storage.updateModel(Number(req.params.id), partial.data);
    if (!updated) return res.status(404).json({ error: "Model not found" });
    res.json(updated);
  });

  app.delete("/api/models/:id", (req, res) => {
    storage.deleteModel(Number(req.params.id));
    res.json({ success: true });
  });

  // ─── API Keys ──────────────────────────────────────────────────────────────
  app.get("/api/api-keys", (req, res) => {
    const keys = storage.getApiKeys().map((k) => ({ ...k, key: k.key.slice(0, 10) + "••••••••••••••••••••••" }));
    res.json(keys);
  });

  app.post("/api/api-keys", (req, res) => {
    const parsed = insertApiKeySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    res.json(storage.createApiKey(parsed.data));
  });

  app.delete("/api/api-keys/:id", (req, res) => {
    storage.deleteApiKey(Number(req.params.id));
    res.json({ success: true });
  });

  // ─── Settings ──────────────────────────────────────────────────────────────
  app.get("/api/settings", (req, res) => {
    const s = storage.getSettings();
    const map: Record<string, string> = {};
    s.forEach((item) => (map[item.key] = item.value));
    res.json(map);
  });

  app.patch("/api/settings", (req, res) => {
    const updates = req.body as Record<string, string>;
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === "string") storage.setSetting(key, value);
    }
    res.json({ success: true });
  });

  // ─── System status ─────────────────────────────────────────────────────────
  app.get("/api/system/status", (req, res) => {
    const cams = storage.getCameras();
    const stats = storage.getDetectionStats();
    res.json({
      version: "1.0.0",
      darknetVersion: "darknet 2024.10",
      darkhelpVersion: "DarkHelp 1.8.x",
      systemName: storage.getSetting("system_name") ?? "VisionGuard VMS",
      cameras: { total: cams.length, active: cams.filter((c) => c.status === "active").length, error: cams.filter((c) => c.status === "error").length },
      detections: stats,
      uptime: process.uptime(),
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTERNAL VMS API (/vms/v1/*) — for SDK integration with 3rd-party VMS
  // Auth: Bearer <api_key> or ?api_key=<key>
  // ═══════════════════════════════════════════════════════════════════════════

  const vmsRouter = app; // reuse app with /vms/v1 prefix

  /**
   * @route   GET /vms/v1/info
   * @desc    System information and capabilities
   * @access  read
   */
  vmsRouter.get("/vms/v1/info", requireApiKey("read"), (req, res) => {
    res.json({
      name: storage.getSetting("system_name") ?? "VisionGuard VMS",
      version: "1.0.0",
      vendor: "VisionGuard",
      capabilities: ["live_stream", "detections", "object_tracking", "ai_inference"],
      ai_engine: {
        darknet: "2024.10",
        darkhelp: "1.8.x",
        supported_models: ["yolov4", "yolov4-tiny", "yolov7", "custom"],
      },
      api_version: "v1",
    });
  });

  /**
   * @route   GET /vms/v1/cameras
   * @desc    List all cameras
   * @access  read
   */
  vmsRouter.get("/vms/v1/cameras", requireApiKey("read"), (req, res) => {
    const cams = storage.getCameras().map((c) => ({
      id: c.id,
      name: c.name,
      location: c.location,
      protocol: c.protocol,
      status: c.status,
      detection_enabled: c.detectionEnabled,
      confidence_threshold: c.confidenceThreshold,
      stream_url: c.streamUrl,
      created_at: c.createdAt,
    }));
    res.json({ cameras: cams, total: cams.length });
  });

  /**
   * @route   GET /vms/v1/cameras/:id
   * @desc    Get camera details
   * @access  read
   */
  vmsRouter.get("/vms/v1/cameras/:id", requireApiKey("read"), (req, res) => {
    const cam = storage.getCamera(Number(req.params.id));
    if (!cam) return res.status(404).json({ error: "Camera not found" });
    res.json({
      id: cam.id, name: cam.name, location: cam.location,
      protocol: cam.protocol, status: cam.status,
      stream_url: cam.streamUrl, detection_enabled: cam.detectionEnabled,
      confidence_threshold: cam.confidenceThreshold,
      nms_threshold: cam.nmsThreshold,
      model: { cfg: cam.modelConfig, weights: cam.modelWeights, names: cam.modelNames },
    });
  });

  /**
   * @route   GET /vms/v1/cameras/:id/stream
   * @desc    Get stream URL for a camera
   * @access  stream
   */
  vmsRouter.get("/vms/v1/cameras/:id/stream", requireApiKey("stream"), (req, res) => {
    const cam = storage.getCamera(Number(req.params.id));
    if (!cam) return res.status(404).json({ error: "Camera not found" });
    if (cam.status !== "active") return res.status(503).json({ error: "Camera is not active" });
    res.json({
      camera_id: cam.id,
      stream_url: cam.streamUrl,
      protocol: cam.protocol,
      status: cam.status,
    });
  });

  /**
   * @route   GET /vms/v1/detections
   * @desc    Query detection events
   * @access  detections
   * @query   camera_id, limit, offset, severity, acknowledged, label, from, to
   */
  vmsRouter.get("/vms/v1/detections", requireApiKey("detections"), (req, res) => {
    const { camera_id, limit, offset, severity, acknowledged, label } = req.query;
    const dets = storage.getDetections({
      cameraId: camera_id ? Number(camera_id) : undefined,
      limit: limit ? Number(limit) : 100,
      offset: offset ? Number(offset) : 0,
      severity: severity as string,
      acknowledged: acknowledged !== undefined ? acknowledged === "true" : undefined,
      search: label as string,
    });
    res.json({
      detections: dets.map((d) => ({
        id: d.id,
        camera_id: d.cameraId,
        timestamp: d.timestamp,
        label: d.label,
        confidence: d.confidence,
        bounding_box: JSON.parse(d.boundingBox),
        track_id: d.trackId,
        severity: d.severity,
        acknowledged: d.acknowledged,
      })),
      total: dets.length,
    });
  });

  /**
   * @route   GET /vms/v1/detections/stats
   * @desc    Detection statistics summary
   * @access  detections
   */
  vmsRouter.get("/vms/v1/detections/stats", requireApiKey("detections"), (req, res) => {
    res.json(storage.getDetectionStats());
  });

  /**
   * @route   POST /vms/v1/cameras/:id/detect
   * @desc    Trigger manual inference on a camera frame (DarkHelp Server call)
   * @access  write
   */
  vmsRouter.post("/vms/v1/cameras/:id/detect", requireApiKey("write"), (req, res) => {
    const cam = storage.getCamera(Number(req.params.id));
    if (!cam) return res.status(404).json({ error: "Camera not found" });
    if (!cam.detectionEnabled) return res.status(400).json({ error: "Detection not enabled for this camera" });

    // Simulate a DarkHelp Server inference call
    const confidence = Math.round((0.5 + Math.random() * 0.49) * 100) / 100;
    const det = simulateDarkHelpDetection(cam.id, confidence);
    const created = storage.createDetection(det);
    broadcast({ type: "detection", detection: created, camera: cam });
    res.json({
      detection_id: created.id,
      camera_id: cam.id,
      timestamp: created.timestamp,
      predictions: [{
        label: created.label,
        confidence: created.confidence,
        bounding_box: JSON.parse(created.boundingBox),
        track_id: created.trackId,
      }],
      darkhelp_metadata: {
        model: cam.modelConfig || "default",
        threshold: cam.confidenceThreshold,
        nms_threshold: cam.nmsThreshold,
        inference_time_ms: Math.floor(20 + Math.random() * 80),
      },
    });
  });

  /**
   * @route   GET /vms/v1/models
   * @desc    List available AI models
   * @access  read
   */
  vmsRouter.get("/vms/v1/models", requireApiKey("read"), (req, res) => {
    const ms = storage.getModels().map((m) => ({
      id: m.id, name: m.name, description: m.description,
      type: m.type, status: m.status,
      classes: JSON.parse(m.classes),
    }));
    res.json({ models: ms });
  });

  /**
   * @route   GET /vms/v1/health
   * @desc    Health check — no auth required
   */
  vmsRouter.get("/vms/v1/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ─── OpenAPI-style spec endpoint ───────────────────────────────────────────
  vmsRouter.get("/vms/v1/openapi.json", (req, res) => {
    res.json({
      openapi: "3.0.0",
      info: { title: "VisionGuard VMS External API", version: "1.0.0", description: "REST API for integrating VisionGuard VMS with 3rd-party Video Management Systems via their SDKs. Authentication via Bearer token (API key)." },
      servers: [{ url: "/vms/v1", description: "VisionGuard VMS API v1" }],
      security: [{ bearerAuth: [] }],
      components: {
        securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "VG API Key (vg_...)" } },
      },
      paths: {
        "/info": { get: { summary: "System information and capabilities", security: [{ bearerAuth: [] }], responses: { "200": { description: "System info" } } } },
        "/cameras": { get: { summary: "List all cameras", security: [{ bearerAuth: [] }], responses: { "200": { description: "Camera list" } } } },
        "/cameras/{id}": { get: { summary: "Get camera details", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], security: [{ bearerAuth: [] }], responses: { "200": { description: "Camera" } } } },
        "/cameras/{id}/stream": { get: { summary: "Get stream URL", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], security: [{ bearerAuth: [] }], responses: { "200": { description: "Stream info" } } } },
        "/cameras/{id}/detect": { post: { summary: "Trigger manual inference via DarkHelp Server", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], security: [{ bearerAuth: [] }], responses: { "200": { description: "Detection results" } } } },
        "/detections": { get: { summary: "Query detection events", security: [{ bearerAuth: [] }], responses: { "200": { description: "Detections list" } } } },
        "/detections/stats": { get: { summary: "Detection statistics", security: [{ bearerAuth: [] }], responses: { "200": { description: "Stats" } } } },
        "/models": { get: { summary: "List AI models", security: [{ bearerAuth: [] }], responses: { "200": { description: "Models" } } } },
        "/health": { get: { summary: "Health check (no auth)", responses: { "200": { description: "OK" } } } },
      },
    });
  });
}
