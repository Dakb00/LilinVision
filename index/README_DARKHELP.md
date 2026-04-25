# DarkHelp Project Context

DarkHelp is a modern C++17 wrapper for the [Darknet YOLO](https://github.com/hank-ai/darknet) object detection framework. It simplifies using Darknet by providing an easy-to-use C++ API for loading neural networks, running inference on images/video, and annotating results.

## Project Overview

- **Core Technology:** C++17, OpenCV (3.x or 4.x), Darknet.
- **Backends:** Supports both `libdarknet.so` and OpenCV's DNN module (`EDriver::kDarknet`, `EDriver::kOpenCV`, `EDriver::kOpenCVCPU`).
- **Key Features:**
  - Automated image tiling for high-resolution images.
  - Annotation "snapping" for precise bounding boxes.
  - Background server (`DarkHelpServer`) for continuous processing.
  - C and Python APIs in addition to the primary C++ API.
  - Support for obfuscated bundles (`.dh` files) containing `.cfg`, `.names`, and `.weights`.

## Directory Structure

- `src-lib/`: Core DarkHelp library (`libdarkhelp`).
- `src-tool/`: Command-line tools:
  - `DarkHelp`: Main CLI for inference and visualization.
  - `DarkHelpServer`: Background service for processing.
  - `DarkHelpCombine`: Tool to create obfuscated `.dh` bundles.
- `src-cam/`: `DarkHelp_cam` application for webcam/IP camera processing.
- `src-apps/`: Collection of simple, single-purpose example applications.
- `src-doc/`: Doxygen documentation source.
- `example_project/`: A standalone example project showing how to integrate DarkHelp.

## Building and Running

### Prerequisites (Ubuntu)
```sh
sudo apt-get install build-essential libtclap-dev libmagic-dev libopencv-dev
# Darknet must be built and installed first
```

### Build Instructions
```sh
mkdir build && cd build
cmake -DCMAKE_BUILD_TYPE=Release ..
make -j$(nproc)
make package # Generates .deb or .exe installer
```

### Running the CLI
```sh
DarkHelp <config.cfg> <weights.weights> <names.names> <image_or_video>
```

## Development Conventions

- **Language:** C++17.
- **API Entry Point:** Include `DarkHelp.hpp`. The main class is `DarkHelp::NN`.
- **Configuration:** Use `DarkHelp::Config` (accessible via `nn.config`) to tune inference and annotation settings.
- **Error Handling:** Uses standard C++ exceptions.
- **Memory Management:** `DarkHelp::NN` manages Darknet's internal pointers; copying/moving `NN` objects is disabled to prevent GPU memory issues.
- **Dependencies:** Managed via `CM_dependencies.cmake`. Uses `TCLAP` for CLI parsing and `libmagic` for file type detection.

## Key Classes & Namespaces

- `DarkHelp::NN`: Primary class for neural network management and inference.
- `DarkHelp::Config`: Comprehensive settings for tiling, snapping, thresholds, and annotations.
- `DarkHelp::PredictionResult`: Structure containing detection details (class, probability, rect, etc.).
- `DarkHelp::PositionTracker`: Utility for tracking objects across video frames.
