# VMS Lite: Architectural Analysis & Verification Report

This report evaluates the implementation of **vms-lite** against the goals defined in `research/VMS_Lite_Architecture.md` and the progress tracked in `vms-lite/IMPLEMENTATION_PLAN.md`.

## 1. Compliance with Core Mandates

### ✅ Clean Architecture
The project successfully adheres to Hexagonal Architecture principles. 
- **Domain:** Pure entities (`Entities.hpp`) with no external dependencies.
- **Ports:** Abstract interfaces for Inference, Repository, and Streaming.
- **Adapters:** Concrete implementations for DarkHelp, SQLite, OpenCV, and Crow.

### ✅ Zero-Copy Pipeline
The implementation correctly utilizes `std::shared_ptr<cv::Mat>` across all layers. This ensures that frames are not unnecessarily copied between the capture adapter, the inference service, and the streaming server, minimizing CPU usage.

### ✅ Concurrency Model
The "One Thread per Camera" mandate is fulfilled via `vms::StreamManager` using `std::jthread`. Each thread operates its own capture-inference-process loop, ensuring isolation and stability.

### ✅ Technical Stack Alignment
- **Web:** Crow is integrated and running on port 5000 with IPv4 (`0.0.0.0`) binding.
- **Web Serving:** Manual binary serving with explicit MIME-type mapping and SPA fallback logic.
- **Inference:** DarkHelp adapter is implemented with the required 416x416 downscaling.
- **Storage:** SQLite circular buffer (30-day retention) is implemented in `SQLiteCameraRepository`.
- **RTSP:** Forced TCP mode is implemented in `OpenCVStreamAdapter`.

---

## 2. Resolved Misalignments & Bugs

The following critical issues have been successfully addressed to meet the "Zero-Config" and "Professional Deployment" goals:

### ✅ Web GUI Serving & SPA Reliability
*   **Resolution:** Implemented a manual file-serving strategy in `CrowRestServer` to bypass MIME-type detection issues in older Crow versions. Added a `CROW_CATCHALL_ROUTE` to serve `index.html` for non-file requests.
*   **Impact:** Ensures the React frontend loads reliably across all browsers and supports deep-linking/page refreshes without 404 errors.

### ✅ Bounding Box Scaling Fix
*   **Resolution:** `DarkHelpInferenceAdapter::infer` now calculates horizontal and vertical scale factors based on the original frame dimensions and applies them to the detection coordinates.
*   **Impact:** Detections are now correctly positioned and scaled on the original high-resolution frames.

### ✅ Dynamic Path Resolution (Zero-Config)
*   **Resolution:** Absolute hardcoded paths have been removed. `main.cpp` now dynamically resolves paths for:
    - **YOLO Models:** Checks `./yoloweights/` (dev) and `/usr/share/vms-lite/models/` (prod).
    - **Database:** Checks local `history.db` (dev) and `/var/lib/vms-lite/` (prod).
    - **GUI Assets:** Checks `./visionguard/client/dist` (dev) and `/usr/share/vms-lite/www/` (prod).
*   **Impact:** The binary is now portable and adheres to the Master Architecture Guide's "Zero-Config" strategy.

### ✅ Security & User Model
*   **Resolution:** The application and service no longer run as `root`. A dedicated `vms-lite` system user and group are created during installation.
*   **Impact:** Significantly reduces the attack surface and aligns with Linux security best practices.

### ✅ Packaging & Deployment (Phase 5)
*   **Systemd:** A `vms-lite.service` unit file has been created to enable background operation and automatic restarts.
*   **CPack:** `CMakeLists.txt` is updated with CPack logic to generate standard `.deb` packages.
*   **FHS Compliance:** Installation paths corrected to align with Linux Filesystem Hierarchy Standard (`/usr/bin`, `/usr/share/vms-lite`, etc.).

## 3. Recent Technical Fixes (Apr 2026)

The following refinements were made during the final code analysis phase:

### ✅ C++20 Modernization
*   **Update:** Upgraded the project from C++17 to **C++20** in `CMakeLists.txt`.
*   **Reason:** Native support for `std::jthread` and `std::stop_token` significantly simplifies camera thread lifecycle management and prevents race conditions during shutdown.

### ✅ DarkHelp API Alignment
*   **Update:** Corrected `DarkHelpInferenceAdapter` to access `threshold` via `m_nn.config.threshold`.
*   **Reason:** Aligns with the version of DarkHelp used in the workspace, ensuring model settings are correctly applied.

### ✅ StreamManager Interface Correction
*   **Update:** Exposed `startCamera` and `stopCamera` in the public header.
*   **Reason:** Allows the Web API to control individual camera streams dynamically.

---

## 4. Current Status
The core architecture is now stable, portable, and ready for deployment. Future work should focus on per-camera AI thresholds and advanced post-install automation.
