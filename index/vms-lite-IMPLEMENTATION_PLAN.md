# VMS Lite Implementation Plan

This document tracks the progress of the VMS Lite project, following Clean Architecture principles and the Master Architecture Guide.

## Phase 1: Foundation & Infrastructure
- [x] **Project Setup**
  - [x] Create `vms-lite/` directory structure (`src/domain`, `src/ports`, `src/adapters`, `src/application`).
  - [x] Initialize `CMakeLists.txt` with dependencies (OpenCV, SQLite3, DarkHelp, Darknet).
- [x] **Define Abstract Interfaces (Ports)**
  - [x] `IInferenceService.hpp`: Generic AI detection interface.
  - [x] `ICameraRepository.hpp`: Database interface for camera config.
  - [x] `IStreamSource.hpp`: Interface for RTSP/Video ingestion.

## Phase 2: Core Domain & Logic
- [x] **Define Entities (Domain Layer)**
  - [x] `Entities.hpp`: Camera, DetectionEvent (with binary support).
- [x] **Implement Application Use Cases**
  - [x] `StreamManager`: Orchestrates threads (One Thread per Camera).
  - [x] `DetectionProcessor`: Logic for handling AI results and saving to DB.
- [x] **Quality Assurance (Foundation)**
  - [x] Mock Adapters for verification without dependencies.
  - [x] GoogleTest environment set up.
  - [x] Initial Integration Tests for `StreamManager`.

## Phase 3: Technical Adapters (Implementation)
- [x] **Storage Adapter (SQLite)**
  - [x] Implement `SQLiteCameraRepository`.
  - [x] Schema design (Cameras table, Detections table with BLOB).
  - [x] Circular Buffer logic (auto-delete > 30 days).
- [x] **AI Inference Adapter (DarkHelp)**
  - [x] Implement `DarkHelpInferenceAdapter`.
  - [x] **[OPTIMIZED]** Interface updated to `std::shared_ptr<cv::Mat>` for Zero-Copy compliance.
  - [x] **[OPTIMIZED]** Replaced manual resizing/scaling with DarkHelp's efficient internal processing.
  - [x] Darknet startup logs redirected for cleaner output.
  - [x] Global confidence threshold (0.7) and result sorting implemented.
- [x] **Streaming Adapter (OpenCV)**
  - [x] Implement `OpenCVStreamAdapter`.
  - [x] Forced RTSP-over-TCP mode.
  - [x] Reconnection policy in `StreamManager` (Option B).

## Phase 4: Web API & Frontend
- [x] **C++ Web Server**
  - [x] Integrate `Crow`.
  - [x] Implement REST endpoints (`/api/v1/cameras`, `/api/v1/detections`).
  - [x] **Zero-Config Path Resolution**: Implemented dynamic detection of GUI, DB, and **AI Model** paths.
- [x] **GUI Integration**
  - [x] Implement MJPEG streaming endpoint (`/api/v1/stream/{id}`).
  - [x] Draw AI bounding boxes on live stream.
  - [x] Framerate cap (10 FPS) for streaming.
  - Serve React SPA static assets from `visionguard/dist/public`.

  - [x] Aligned `visionguard/client` frontend to use C++ backend on port 5000.

## Phase 5: Deployment & Packaging
- [x] **Systemd Integration**
  - [x] Create `vms-lite.service` unit file for background operation and auto-restart.
- [x] **DEB Packaging**
  - [x] Configure CPack for `.deb` generation in `CMakeLists.txt`.
- [x] **Post-Install Automation**
  - [x] Write `postinst` script for database directory initialization and user creation.
  - [x] Write `prerm` script for clean service shutdown.

---

## Current Status: [Completed]
- **Last Updated:** Saturday Apr 25, 2026
- **Final Step:** Ready for release and deployment testing.

## Questions & Notes
- *C++ Standard:* Upgraded to **C++20** for `std::jthread` and `std::stop_token` support.
- *Port Selection:* Web server will use port **5000**.
- *Storage:* Database will store **binary JPEG data** (crops) alongside metadata.
- *Performance:* Prioritizing "Zero-Copy" frame passing using `std::shared_ptr<cv::Mat>`.
- *Architecture Note:* `StreamManager` now accepts `ModelConfig` to support dynamic path resolution.
- *Packaging:* Service will be installed to `/lib/systemd/system/` and models to `/usr/share/vms-lite/models/`.
