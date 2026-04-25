# Darknet Object Detection Framework (YOLO)

Darknet is an open-source neural network framework written in C, C++, and CUDA/ROCm. It serves as the core implementation for YOLO (You Only Look Once) object detection. This repository is a modernized version (v3+) emphasizing C++17, unified CMake builds, and enhanced performance.

## Project Overview

- **Core Technology:** C++17, CUDA (NVIDIA), ROCm/HIP (AMD), OpenCV.
- **Main Components:**
  - `libdarknet`: Shared library providing the core neural network functionality.
  - `darknet`: Primary CLI tool for training and inference.
  - `src-examples`: A collection of standalone sample applications for specific use cases (e.g., video processing, RTSP streams, image-to-JSON).
  - `src-test`: Unit testing suite based on Google Test.
  - `src-onnx`: Experimental tool for exporting Darknet models to ONNX format.
  - `src-python`: Python bindings for the Darknet library.
- **Architecture:** The project follows a modular structure where the core logic resides in `src-lib`, CLI-specific code in `src-cli`, and various utility/example apps in their respective directories.

## Building and Running

### Prerequisites
- **Mandatory:** C++17 compiler (GCC 9+, Clang, or MSVC 2022), CMake 3.24+, OpenCV 4.x.
- **Optional:**
  - **NVIDIA GPU:** CUDA Toolkit, cuDNN.
  - **AMD GPU:** ROCm/HIP.
  - **CPU Acceleration:** OpenBLAS.
  - **Testing:** Google Test (`gtest`).

### Linux Build Steps
```sh
mkdir build && cd build
cmake -DCMAKE_BUILD_TYPE=Release ..
make -j$(nproc) package
sudo dpkg -i darknet-*.deb  # Install the generated package
```

### Key Commands
- **Check Version:** `darknet version`
- **Help:** `darknet help`
- **Inference (Example):** `darknet_02_display_annotated_images coco.cfg image.jpg`
- **Training:** `darknet detector train animals.data animals.cfg`
- **ONNX Export:** `darknet_onnx_export model.cfg`

## Development Conventions

- **Modern C++:** Migration from legacy C to C++17 is ongoing. Prefer `std::vector`, `std::string`, and `cv::Mat` over raw pointers and custom C-style structures where applicable.
- **Namespaced API:** 
  - **C API:** Functions prefixed with `darknet_` (e.g., `darknet_load_neural_network`).
  - **C++ API:** Defined in `darknet.hpp` under the `Darknet` namespace.
  - **Legacy:** Original Darknet C API is available by defining `DARKNET_INCLUDE_ORIGINAL_API`.
- **Logging:** All `printf` and `std::cout` calls should be replaced with the unified logging system to allow redirection.
- **Build System:** Always use CMake. Do not use old Makefiles or manual build scripts.
- **Testing:** Add unit tests in `src-test` for any new core functionality. Run tests using `ctest` or the `darknet_tests` executable.

## Directory Structure
- `cfg/`: Neural network configuration files (`.cfg`), class names (`.names`), and metadata (`.data`).
- `src-lib/`: Core framework implementation (layers, activations, BLAS, etc.).
- `src-cli/`: Entry point for the main `darknet` executable.
- `src-examples/`: Sample apps (e.g., `darknet_01_inference_images.cpp`).
- `src-onnx/`: Protobuf-based ONNX export logic.
- `src-python/`: Python bindings and sample scripts.
- `doc/`: Documentation and Doxygen configuration.
- `artwork/`: Sample images and project logos.
