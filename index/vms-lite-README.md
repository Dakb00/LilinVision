# vms-lite: High-Performance VMS Backend

This project is a lightweight Video Management System (VMS) built with C++17, following **Clean/Hexagonal Architecture** principles.

## Core Mandates & Architecture

- **Clean Architecture:** 
  - `src/domain`: Pure entities (Camera, DetectionEvent). No external dependencies.
  - `src/ports`: Abstract interfaces (IInferenceService, ICameraRepository).
  - `src/application`: Orchestration logic (StreamManager).
  - `src/adapters`: Concrete implementations (DarkHelp, SQLite, Crow).
- **Zero-Copy Pipeline:** Frames MUST be passed as `std::shared_ptr<cv::Mat>` through all ports and adapters to minimize CPU usage and prevent redundant memory allocations.
- **Concurrency:** **One Thread per Camera**. Each camera worker thread handles its own MJPEG streaming connections directly.
- **Storage:** SQLite is used for both metadata and **binary JPEG image crops** of detections.
  - *Decision:* Circular buffer implemented to auto-delete detections older than 30 days.
  - *Decision:* Local `history.db` used for development; `/var/lib/vms-lite/` for production.
- **AI Inference:**
  - *Model:* `peoplerpeople` (YOLOv4-Tiny variant).
  - *Decision:* Global confidence threshold set to **0.7**. (Note: Future requirement for per-camera thresholds).
  - *Optimization:* `DarkHelp` handles internal image resizing and coordinate scaling automatically, ensuring efficient GPU utilization (when available) and architectural simplicity.
  - *Logging:* Darknet startup output is redirected to maintain clean application logs.
- **Web GUI Integration:** 
  - *Reliability:* Manual file-serving with explicit MIME-type headers (`application/javascript`, `text/css`) to ensure consistent browser rendering.
  - *SPA Support:* "Catch-All" route serves `index.html` for non-file requests to support client-side React routing.
  - *Network:* Explicit binding to `0.0.0.0` to ensure IPv4 accessibility and avoid IPv6 (`::1`) connection refusals.
- **Zero-Config Deployment:** 
  - Dynamic path resolution for GUI assets, SQLite database, and YOLO model files (checks local dev vs. system paths).
- **Security:**
  - *User Model:* Service runs as a dedicated `vms-lite` system user instead of `root`.
  - *Permissions:* Restricted directory access (read-only for assets, write-only for `/var/lib/vms-lite`).
- **Streaming:**
  - *Protocol:* Force **RTSP over TCP** for stability.
- **CLI:**
  - *Decision:* Use `--mock` flag to toggle between Mock and Real adapters.

## Technical Stack
- **Web:** Crow (running on port **5000**).
- **Inference:** DarkHelp (Darknet wrapper).
- **Capture:** OpenCV.
- **Database:** SQLite3.
- **Service:** Systemd (`vms-lite.service`).
- **Packaging:** CPack (.deb).

## Directory Structure
- `src/domain/`: Pure C++ entities.
- `src/ports/`: Abstract interfaces.
- `src/application/`: Service and orchestration logic.
- `src/adapters/`: Implementation-specific code.
- `gui/`: Static assets for the React frontend (linked to `visionguard/client/dist`).
- `visionguard/`: Original React/TypeScript source code (aligned to C++ API).
- `vms-lite.service`: Systemd service unit.

## Status & Progress
- [x] Directory structure and CMakeLists.txt initialized.
- [x] Abstract Ports defined.
- [x] Domain Entities defined.
- [x] Implement Application Logic (StreamManager).
- [x] Implement Adapters (DarkHelp, SQLite, OpenCV).
- [x] Implement Web Server (Crow) and API endpoints.
- [x] Align visionguard frontend to C++ backend.
- [x] Coordinate scaling fix and dynamic model path resolution.
- [x] Systemd and CPack integration.
- [ ] Final Deployment Testing & .deb validation.

Refer to `vms-lite/IMPLEMENTATION_PLAN.md` for a granular task list.
