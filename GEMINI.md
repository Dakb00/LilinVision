# LilinVision Workspace

LilinVision is a unified workspace for advanced video surveillance and AI-powered object detection. It integrates three major open-source projects to provide a comprehensive vision solution.

## Project Overview

- **[Darknet (YOLO)](darknet/):** A state-of-the-art, real-time object detection framework. This version (V3+) is modernized with C++17, CUDA, and ROCm support, maintaining the legacy of YOLOv3, YOLOv4, and YOLOv7.
- **[DarkHelp](DarkHelp/):** A C++17 wrapper for Darknet YOLO.
- **[vms-lite](vms-lite/):** A custom, high-performance VMS backend built with Clean Architecture. It uses DarkHelp for inference, SQLite for storage, and Crow for the web API.
- **[ZoneMinder](zoneminder/):** A full-featured, open-source video surveillance software system.

## Main Technologies

### vms-lite (The "Desk" Project)
- **Languages:** C++17.
- **Frameworks:** Crow (Web), OpenCV (Capture/Processing), SQLite3 (Storage).
- **Architecture:** Hexagonal / Clean Architecture.
- **Goal:** Lightweight `.deb` package for Ubuntu/WSL2.

### Darknet (YOLO)
- **Languages:** C++17, C, CUDA (NVIDIA GPUs), HIP/ROCm (AMD GPUs).
- **Core Libraries:** OpenCV (mandatory), OpenBLAS (for CPU-only), Protobuf (for ONNX export), GTest (optional for testing).
- **Architectures:** Supports x86_64, ARM (Jetson Orin), and more.

### DarkHelp
- **Languages:** C++17.
- **Dependencies:** Darknet (required), OpenCV, `tclap` (CLI parsing), `libmagic`.
- **Core Components:** `libdarkhelp` (C++ API), `DarkHelp` CLI, `DarkHelpServer`, and `DarkHelp_cam`.

### ZoneMinder
- **Core Technologies:** C++17 (backend daemons), PHP/CakePHP (web frontend), Perl (management daemons and utility scripts), MySQL/MariaDB (database).
- **Libraries:** FFMPEG (>= 55.34.100), MySQL/MariaDB client, libjpeg, libcurl, GnuTLS/OpenSSL, libpcre2.
- **Submodules:** This project uses git submodules for some web components.

## Directory Structure

- `darknet/`: Core neural network framework and YOLO implementation.
- `DarkHelp/`: C++ wrapper library and tools for Darknet.
- `vms-lite/`: Custom VMS implementation using Clean Architecture.
- `zoneminder/`: Video surveillance server and management system.

## Building and Running

### Darknet
Refer to [darknet/GEMINI.md](darknet/GEMINI.md) for detailed instructions.
- **Build:**
  ```sh
  mkdir build && cd build
  cmake -DCMAKE_BUILD_TYPE=Release ..
  make -j$(nproc) package
  ```
- **Run:** `darknet version`

### DarkHelp
Refer to [DarkHelp/GEMINI.md](DarkHelp/GEMINI.md) for detailed instructions. Darknet must be installed first.
- **Build:**
  ```sh
  mkdir build && cd build
  cmake -DCMAKE_BUILD_TYPE=Release ..
  make -j$(nproc) package
  ```
- **Run:** `DarkHelp --config <cfg> --weights <weights> --names <names> <image>`

### ZoneMinder
Refer to [zoneminder/GEMINI.md](zoneminder/GEMINI.md) for detailed instructions.
- **Build:**
  ```sh
  mkdir build && cd build
  cmake ..
  make
  ```
- **Run:** `zmpkg.pl start`

## Development Conventions

- **Modular Integration:** Each project maintains its own development lifecycle and configuration.
- **Vision AI:** Use DarkHelp as a bridge to integrate Darknet's object detection into ZoneMinder's analysis pipeline or other C++ applications.
- **Standards:** All backend components follow modern C++ (C++17) standards.
- **Testing:**
  - Darknet: Uses GTest for unit tests in `src-test/`.
  - DarkHelp: Uses functional tests and examples in `src-apps/`.
  - ZoneMinder: Uses Catch2-based test suite in `tests/`.
