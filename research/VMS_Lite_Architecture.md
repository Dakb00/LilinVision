# Master Architecture Guide: VMS Lite

This is the **single source of truth** for the VMS Lite project. It defines the goals, technical stack, filesystem hierarchy, and implementation strategy.

---

## 1. Project Overview
**Goal:** Create a lightweight, high-performance Video Management System (VMS) for Ubuntu and WSL2 that:
*   Ingests multiple RTSP streams.
*   Performs real-time object detection using Darknet (YOLO).
*   Stores detection history in a searchable database.
*   Provides a simple web-based GUI for camera management.
*   Installs as a professional `.deb` package with a single command.

---

## 2. Core System Architecture

### A. Backend: Inference Engine (C++17)
*   **RTSP Ingestion:** OpenCV via DarkHelp.
*   **Inference:** DarkHelp wrapper for Darknet (Statically Linked).
*   **Processing Mode:** CPU-only with **OpenBLAS (OpenMP)** for multi-core optimization.
*   **Web Server:** `cpp-httplib` or `Crow` serving both API and static GUI files.
*   **Concurrency:** **One Thread per Camera** (isolated worker threads).

### B. Frontend: Management GUI (React SPA)
*   **Deployment:** Compiled to static files and served by the C++ backend.
*   **Live Preview:** **MJPEG** streams directly from the C++ worker threads.
*   **Communication:** REST API for configuration, Polling (Pull) for detection history.

---

## 3. Technical Implementation Details

### A. Data & Configuration
*   **Configuration (JSON):** `/etc/vms-lite/config.json` (Camera URLs, IDs, and general settings).
*   **Detection History (SQLite):** `/var/lib/vms-lite/history.db` (Searchable audit trail).
*   **Models:** `/usr/share/vms-lite/models/` (Standard Darknet `.weights` and `.cfg` files).

### B. The "Fat Binary" Strategy
To ensure maximum portability and ease of installation:
*   **Darknet & DarkHelp:** Statically linked (`.a` files) into the main `vms-lite` binary.
*   **Runtime Dependencies (APT):** `libopencv-videoio4.5`, `libopenblas0-openmp`, `libprotobuf23`, `libmagic1`, `libsqlite3-0`.

---

## 4. Professional Linux Deployment (FHS)

The `.deb` package follows the Linux Filesystem Hierarchy Standard:
*   **Binary:** `/usr/bin/vms-lite`
*   **Web Assets:** `/usr/share/vms-lite/www/`
*   **System Service:** `/lib/systemd/system/vms-lite.service`
*   **Install Logs:** `/var/log/vms-lite-install.log`

### Post-Install Hooks
The installer (`postinst`) will:
1.  Create the `vmslite` system user.
2.  Initialize the SQLite database.
3.  Auto-start the background service.
4.  Run a validation check (`vms-lite --version`).

---

## 5. API & Connectivity

### Camera Management
*   `GET /api/v1/cameras` - List all cameras.
*   `POST /api/v1/cameras` - Add new RTSP source.

### Streaming & Detections
*   **Stream:** `GET /api/v1/stream/{id}` (MJPEG multipart response).
*   **Events:** `GET /api/v1/detections?limit=50` (Pull recent events from SQLite).

---

## 6. Development Roadmap

1.  **Phase 1: CLI Prototype** (Basic inference + RTSP in a single thread).
2.  **Phase 2: Data & Service** (JSON config, SQLite logging, Systemd setup).
3.  **Phase 3: Web API & GUI** (C++ web server + React frontend).
4.  **Phase 4: Packaging** (Final `.deb` creation and validation).
