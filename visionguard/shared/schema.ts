import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Cameras ─────────────────────────────────────────────────────────────────
export const cameras = sqliteTable("cameras", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  streamUrl: text("stream_url").notNull(),
  protocol: text("protocol").notNull().default("rtsp"), // rtsp | http | onvif | rtmp
  location: text("location").notNull().default(""),
  status: text("status").notNull().default("active"), // active | inactive | error
  detectionEnabled: integer("detection_enabled", { mode: "boolean" }).notNull().default(true),
  modelConfig: text("model_config").notNull().default(""), // path to .cfg
  modelWeights: text("model_weights").notNull().default(""), // path to .weights
  modelNames: text("model_names").notNull().default(""), // path to .names
  confidenceThreshold: real("confidence_threshold").notNull().default(0.5),
  nmsThreshold: real("nms_threshold").notNull().default(0.45),
  thumbnailUrl: text("thumbnail_url").notNull().default(""),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertCameraSchema = createInsertSchema(cameras).omit({ id: true, createdAt: true });
export type InsertCamera = z.infer<typeof insertCameraSchema>;
export type Camera = typeof cameras.$inferSelect;

// ─── Detection Events ─────────────────────────────────────────────────────────
export const detections = sqliteTable("detections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cameraId: integer("camera_id").notNull().references(() => cameras.id),
  timestamp: text("timestamp").notNull(),
  label: text("label").notNull(),
  confidence: real("confidence").notNull(),
  boundingBox: text("bounding_box").notNull(), // JSON: {x, y, w, h} normalized
  frameUrl: text("frame_url").notNull().default(""),
  trackId: integer("track_id"), // DarkHelp tracker ID
  severity: text("severity").notNull().default("info"), // info | warning | alert
  acknowledged: integer("acknowledged", { mode: "boolean" }).notNull().default(false),
});

export const insertDetectionSchema = createInsertSchema(detections).omit({ id: true });
export type InsertDetection = z.infer<typeof insertDetectionSchema>;
export type Detection = typeof detections.$inferSelect;

// ─── AI Models ───────────────────────────────────────────────────────────────
export const models = sqliteTable("models", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  cfgPath: text("cfg_path").notNull().default(""),
  weightsPath: text("weights_path").notNull().default(""),
  namesPath: text("names_path").notNull().default(""),
  classes: text("classes").notNull().default("[]"), // JSON string[]
  type: text("type").notNull().default("yolov4"), // yolov4 | yolov4-tiny | yolov7 | custom
  status: text("status").notNull().default("ready"), // ready | loading | error
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertModelSchema = createInsertSchema(models).omit({ id: true, createdAt: true });
export type InsertModel = z.infer<typeof insertModelSchema>;
export type Model = typeof models.$inferSelect;

// ─── API Keys (for external VMS SDK integration) ─────────────────────────────
export const apiKeys = sqliteTable("api_keys", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  key: text("key").notNull().unique(),
  permissions: text("permissions").notNull().default('["read"]'), // JSON: ["read","write","stream","detections"]
  description: text("description").notNull().default(""),
  lastUsed: text("last_used"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({ id: true, createdAt: true, lastUsed: true });
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;

// ─── System Settings ──────────────────────────────────────────────────────────
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export type Setting = typeof settings.$inferSelect;
