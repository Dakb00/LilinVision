import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, and, gte, lte, like } from "drizzle-orm";
import {
  cameras, detections, models, apiKeys, settings,
  type Camera, type InsertCamera,
  type Detection, type InsertDetection,
  type Model, type InsertModel,
  type ApiKey, type InsertApiKey,
  type Setting,
} from "@shared/schema";
import crypto from "crypto";

const sqlite = new Database("visionguard.db");
const db = drizzle(sqlite);

// ─── Migrate (create tables) ──────────────────────────────────────────────────
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS cameras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    stream_url TEXT NOT NULL,
    protocol TEXT NOT NULL DEFAULT 'rtsp',
    location TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active',
    detection_enabled INTEGER NOT NULL DEFAULT 1,
    model_config TEXT NOT NULL DEFAULT '',
    model_weights TEXT NOT NULL DEFAULT '',
    model_names TEXT NOT NULL DEFAULT '',
    confidence_threshold REAL NOT NULL DEFAULT 0.5,
    nms_threshold REAL NOT NULL DEFAULT 0.45,
    thumbnail_url TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS detections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    camera_id INTEGER NOT NULL REFERENCES cameras(id),
    timestamp TEXT NOT NULL,
    label TEXT NOT NULL,
    confidence REAL NOT NULL,
    bounding_box TEXT NOT NULL,
    frame_url TEXT NOT NULL DEFAULT '',
    track_id INTEGER,
    severity TEXT NOT NULL DEFAULT 'info',
    acknowledged INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    cfg_path TEXT NOT NULL DEFAULT '',
    weights_path TEXT NOT NULL DEFAULT '',
    names_path TEXT NOT NULL DEFAULT '',
    classes TEXT NOT NULL DEFAULT '[]',
    type TEXT NOT NULL DEFAULT 'yolov4',
    status TEXT NOT NULL DEFAULT 'ready',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    key TEXT NOT NULL UNIQUE,
    permissions TEXT NOT NULL DEFAULT '["read"]',
    description TEXT NOT NULL DEFAULT '',
    last_used TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL
  );
`);

// ─── Seed demo data ───────────────────────────────────────────────────────────
function seedIfEmpty() {
  const camCount = db.select().from(cameras).all().length;
  if (camCount > 0) return;

  // Seed cameras
  const cams = [
    { name: "Front Entrance", streamUrl: "rtsp://192.168.1.101:554/stream1", protocol: "rtsp", location: "Building A – Main Lobby", status: "active", detectionEnabled: true, modelConfig: "/opt/darknet/cfg/yolov4-tiny.cfg", modelWeights: "/opt/darknet/weights/yolov4-tiny.weights", modelNames: "/opt/darknet/data/coco.names", confidenceThreshold: 0.5, nmsThreshold: 0.45, thumbnailUrl: "" },
    { name: "Parking Lot North", streamUrl: "rtsp://192.168.1.102:554/stream1", protocol: "rtsp", location: "Parking Structure – Level 1", status: "active", detectionEnabled: true, modelConfig: "/opt/darknet/cfg/yolov4.cfg", modelWeights: "/opt/darknet/weights/yolov4.weights", modelNames: "/opt/darknet/data/coco.names", confidenceThreshold: 0.45, nmsThreshold: 0.45, thumbnailUrl: "" },
    { name: "Server Room", streamUrl: "rtsp://192.168.1.103:554/stream1", protocol: "rtsp", location: "Building B – Floor 3", status: "active", detectionEnabled: true, modelConfig: "/opt/darknet/cfg/yolov4-tiny.cfg", modelWeights: "/opt/darknet/weights/yolov4-tiny.weights", modelNames: "/opt/darknet/data/coco.names", confidenceThreshold: 0.7, nmsThreshold: 0.45, thumbnailUrl: "" },
    { name: "Loading Dock", streamUrl: "rtsp://192.168.1.104:554/stream1", protocol: "rtsp", location: "Building A – Rear Entrance", status: "inactive", detectionEnabled: false, modelConfig: "", modelWeights: "", modelNames: "", confidenceThreshold: 0.5, nmsThreshold: 0.45, thumbnailUrl: "" },
    { name: "Lobby East Wing", streamUrl: "http://192.168.1.105:8080/video", protocol: "http", location: "Building C – East Lobby", status: "active", detectionEnabled: true, modelConfig: "/opt/darknet/cfg/yolov4-tiny.cfg", modelWeights: "/opt/darknet/weights/yolov4-tiny.weights", modelNames: "/opt/darknet/data/coco.names", confidenceThreshold: 0.55, nmsThreshold: 0.45, thumbnailUrl: "" },
    { name: "Roof Access", streamUrl: "rtsp://192.168.1.106:554/stream1", protocol: "rtsp", location: "Building A – Rooftop", status: "error", detectionEnabled: true, modelConfig: "/opt/darknet/cfg/yolov4-tiny.cfg", modelWeights: "/opt/darknet/weights/yolov4-tiny.weights", modelNames: "/opt/darknet/data/coco.names", confidenceThreshold: 0.6, nmsThreshold: 0.45, thumbnailUrl: "" },
  ];
  for (const cam of cams) {
    db.insert(cameras).values({ ...cam, createdAt: new Date().toISOString() }).run();
  }

  // Seed detections
  const allCams = db.select().from(cameras).all();
  const labels = ["person", "car", "truck", "bicycle", "dog", "backpack", "cell phone", "laptop"];
  const severities = ["info", "info", "info", "warning", "alert"];
  for (let i = 0; i < 60; i++) {
    const cam = allCams[Math.floor(Math.random() * allCams.length)];
    const label = labels[Math.floor(Math.random() * labels.length)];
    const ts = new Date(Date.now() - Math.random() * 7 * 24 * 3600 * 1000).toISOString();
    db.insert(detections).values({
      cameraId: cam.id,
      timestamp: ts,
      label,
      confidence: Math.round((0.5 + Math.random() * 0.49) * 100) / 100,
      boundingBox: JSON.stringify({ x: Math.random() * 0.7, y: Math.random() * 0.7, w: 0.1 + Math.random() * 0.3, h: 0.1 + Math.random() * 0.3 }),
      frameUrl: "",
      trackId: Math.floor(Math.random() * 100),
      severity: severities[Math.floor(Math.random() * severities.length)],
      acknowledged: Math.random() > 0.7 ? true : false,
    }).run();
  }

  // Seed models
  const modelSeeds = [
    { name: "YOLOv4", description: "Full YOLOv4 — high accuracy, higher compute", cfgPath: "/opt/darknet/cfg/yolov4.cfg", weightsPath: "/opt/darknet/weights/yolov4.weights", namesPath: "/opt/darknet/data/coco.names", classes: JSON.stringify(["person","bicycle","car","motorcycle","airplane","bus","train","truck","boat","traffic light","fire hydrant","stop sign","parking meter","bench","bird","cat","dog","horse","sheep","cow","elephant","bear","zebra","giraffe","backpack","umbrella","handbag","tie","suitcase","frisbee","skis","snowboard","sports ball","kite","baseball bat","baseball glove","skateboard","surfboard","tennis racket","bottle","wine glass","cup","fork","knife","spoon","bowl","banana","apple","sandwich","orange","broccoli","carrot","hot dog","pizza","donut","cake","chair","couch","potted plant","bed","dining table","toilet","tv","laptop","mouse","remote","keyboard","cell phone","microwave","oven","toaster","sink","refrigerator","book","clock","vase","scissors","teddy bear","hair drier","toothbrush"]), type: "yolov4", status: "ready" },
    { name: "YOLOv4-tiny", description: "Lightweight YOLOv4-tiny — fast inference for edge devices", cfgPath: "/opt/darknet/cfg/yolov4-tiny.cfg", weightsPath: "/opt/darknet/weights/yolov4-tiny.weights", namesPath: "/opt/darknet/data/coco.names", classes: JSON.stringify(["person","bicycle","car","motorcycle","airplane","bus","train","truck","boat","traffic light","fire hydrant","stop sign"]), type: "yolov4-tiny", status: "ready" },
    { name: "Custom Security Model", description: "Trained for security scenarios: person, vehicle, weapon detection", cfgPath: "/opt/darknet/cfg/security-v1.cfg", weightsPath: "/opt/darknet/weights/security-v1.weights", namesPath: "/opt/darknet/data/security.names", classes: JSON.stringify(["person","vehicle","weapon","bag","mask"]), type: "custom", status: "loading" },
  ];
  for (const m of modelSeeds) {
    db.insert(models).values({ ...m, createdAt: new Date().toISOString() }).run();
  }

  // Seed API keys
  db.insert(apiKeys).values({
    name: "Milestone XProtect Integration",
    key: "vg_" + crypto.randomBytes(24).toString("hex"),
    permissions: JSON.stringify(["read", "stream", "detections"]),
    description: "Used by Milestone XProtect VMS SDK",
    active: true,
    createdAt: new Date().toISOString(),
  }).run();

  db.insert(apiKeys).values({
    name: "Genetec Security Center",
    key: "vg_" + crypto.randomBytes(24).toString("hex"),
    permissions: JSON.stringify(["read", "detections"]),
    description: "Read-only integration for Genetec reporting",
    active: true,
    createdAt: new Date().toISOString(),
  }).run();

  // Seed settings
  const defaultSettings = [
    { key: "darkhelp_server_host", value: "127.0.0.1" },
    { key: "darkhelp_server_port", value: "4000" },
    { key: "darknet_cfg_dir", value: "/opt/darknet/cfg" },
    { key: "darknet_weights_dir", value: "/opt/darknet/weights" },
    { key: "recording_path", value: "/var/visionguard/recordings" },
    { key: "max_recording_days", value: "30" },
    { key: "alert_webhook_url", value: "" },
    { key: "detection_interval_ms", value: "500" },
    { key: "system_name", value: "VisionGuard VMS" },
  ];
  for (const s of defaultSettings) {
    db.insert(settings).values(s).run();
  }
}

seedIfEmpty();

// ─── IStorage interface ───────────────────────────────────────────────────────
export interface IStorage {
  // Cameras
  getCameras(): Camera[];
  getCamera(id: number): Camera | undefined;
  createCamera(data: InsertCamera): Camera;
  updateCamera(id: number, data: Partial<InsertCamera>): Camera | undefined;
  deleteCamera(id: number): void;

  // Detections
  getDetections(opts?: { cameraId?: number; limit?: number; offset?: number; severity?: string; acknowledged?: boolean; search?: string }): Detection[];
  getDetection(id: number): Detection | undefined;
  createDetection(data: InsertDetection): Detection;
  acknowledgeDetection(id: number): void;
  acknowledgeAll(): void;
  getDetectionStats(): { total: number; today: number; alerts: number; unacknowledged: number; byLabel: Record<string, number>; byCamera: Record<number, number> };

  // Models
  getModels(): Model[];
  getModel(id: number): Model | undefined;
  createModel(data: InsertModel): Model;
  updateModel(id: number, data: Partial<InsertModel>): Model | undefined;
  deleteModel(id: number): void;

  // API Keys
  getApiKeys(): ApiKey[];
  getApiKey(id: number): ApiKey | undefined;
  getApiKeyByKey(key: string): ApiKey | undefined;
  createApiKey(data: InsertApiKey): ApiKey;
  deleteApiKey(id: number): void;
  touchApiKey(id: number): void;

  // Settings
  getSettings(): Setting[];
  getSetting(key: string): string | undefined;
  setSetting(key: string, value: string): void;
}

// ─── SqliteStorage ────────────────────────────────────────────────────────────
class SqliteStorage implements IStorage {
  getCameras() { return db.select().from(cameras).all(); }
  getCamera(id: number) { return db.select().from(cameras).where(eq(cameras.id, id)).get(); }
  createCamera(data: InsertCamera) { return db.insert(cameras).values({ ...data, createdAt: new Date().toISOString() }).returning().get(); }
  updateCamera(id: number, data: Partial<InsertCamera>) {
    const existing = this.getCamera(id);
    if (!existing) return undefined;
    return db.update(cameras).set(data).where(eq(cameras.id, id)).returning().get();
  }
  deleteCamera(id: number) {
    db.delete(detections).where(eq(detections.cameraId, id)).run();
    db.delete(cameras).where(eq(cameras.id, id)).run();
  }

  getDetections(opts: { cameraId?: number; limit?: number; offset?: number; severity?: string; acknowledged?: boolean; search?: string } = {}) {
    let query = db.select().from(detections).$dynamic();
    const conditions = [];
    if (opts.cameraId !== undefined) conditions.push(eq(detections.cameraId, opts.cameraId));
    if (opts.severity) conditions.push(eq(detections.severity, opts.severity));
    if (opts.acknowledged !== undefined) conditions.push(eq(detections.acknowledged, opts.acknowledged));
    if (opts.search) conditions.push(like(detections.label, `%${opts.search}%`));
    if (conditions.length > 0) query = query.where(and(...conditions));
    const results = query.orderBy(desc(detections.timestamp)).all();
    const offset = opts.offset ?? 0;
    const limit = opts.limit ?? 100;
    return results.slice(offset, offset + limit);
  }
  getDetection(id: number) { return db.select().from(detections).where(eq(detections.id, id)).get(); }
  createDetection(data: InsertDetection) { return db.insert(detections).values(data).returning().get(); }
  acknowledgeDetection(id: number) { db.update(detections).set({ acknowledged: true }).where(eq(detections.id, id)).run(); }
  acknowledgeAll() { db.update(detections).set({ acknowledged: true }).where(eq(detections.acknowledged, false)).run(); }
  getDetectionStats() {
    const all = db.select().from(detections).all();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const byLabel: Record<string, number> = {};
    const byCamera: Record<number, number> = {};
    let todayCount = 0, alertCount = 0, unack = 0;
    for (const d of all) {
      if (new Date(d.timestamp) >= today) todayCount++;
      if (d.severity === "alert") alertCount++;
      if (!d.acknowledged) unack++;
      byLabel[d.label] = (byLabel[d.label] || 0) + 1;
      byCamera[d.cameraId] = (byCamera[d.cameraId] || 0) + 1;
    }
    return { total: all.length, today: todayCount, alerts: alertCount, unacknowledged: unack, byLabel, byCamera };
  }

  getModels() { return db.select().from(models).all(); }
  getModel(id: number) { return db.select().from(models).where(eq(models.id, id)).get(); }
  createModel(data: InsertModel) { return db.insert(models).values({ ...data, createdAt: new Date().toISOString() }).returning().get(); }
  updateModel(id: number, data: Partial<InsertModel>) {
    const existing = this.getModel(id);
    if (!existing) return undefined;
    return db.update(models).set(data).where(eq(models.id, id)).returning().get();
  }
  deleteModel(id: number) { db.delete(models).where(eq(models.id, id)).run(); }

  getApiKeys() { return db.select().from(apiKeys).all(); }
  getApiKey(id: number) { return db.select().from(apiKeys).where(eq(apiKeys.id, id)).get(); }
  getApiKeyByKey(key: string) { return db.select().from(apiKeys).where(eq(apiKeys.key, key)).get(); }
  createApiKey(data: InsertApiKey) {
    const key = "vg_" + require("crypto").randomBytes(24).toString("hex");
    return db.insert(apiKeys).values({ ...data, key, createdAt: new Date().toISOString() }).returning().get();
  }
  deleteApiKey(id: number) { db.delete(apiKeys).where(eq(apiKeys.id, id)).run(); }
  touchApiKey(id: number) { db.update(apiKeys).set({ lastUsed: new Date().toISOString() }).where(eq(apiKeys.id, id)).run(); }

  getSettings() { return db.select().from(settings).all(); }
  getSetting(key: string) { return db.select().from(settings).where(eq(settings.key, key)).get()?.value; }
  setSetting(key: string, value: string) {
    const existing = db.select().from(settings).where(eq(settings.key, key)).get();
    if (existing) {
      db.update(settings).set({ value }).where(eq(settings.key, key)).run();
    } else {
      db.insert(settings).values({ key, value }).run();
    }
  }
}

export const storage = new SqliteStorage();
