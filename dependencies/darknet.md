# Darknet Dependencies

This document lists the external dependencies required to build and run the modernized Darknet (YOLO) framework.

## Build System & Compiler
- **CMake** (>= 3.24)
- **C++17 and C Compiler** (GCC 9+, Clang, or MSVC)
- **Git** (to clone the repository and manage submodules)

## Core Libraries (Mandatory)
- **OpenCV** (Mandatory)
    - Used for image loading, processing, and display.
- **Threads** (Pthreads)
    - Required for multi-threading support.

## GPU Acceleration (Optional but Recommended)
### NVIDIA CUDA Support
- **CUDA Toolkit**
    - Required for running on NVIDIA GPUs.
- **cuDNN** (Highly Recommended)
    - NVIDIA's deep neural network library for optimized performance.

### AMD ROCm Support
- **ROCm / HIP**
    - Required for running on AMD GPUs.
- **hipblas**, **hiprand**, **amd_smi**
    - Specific ROCm libraries for BLAS, random number generation, and system management.

## CPU Optimization (Optional)
- **OpenBLAS** (or other BLAS provider)
    - Required only for CPU-only builds to speed up linear algebra operations.
- **OpenMP**
    - Used for parallel processing on multi-core CPUs.
- **AVX & SSE**
    - Hardware-specific optimizations for Intel and AMD CPUs (enabled via compiler flags).

## Additional Tools & Libraries (Optional)
- **Protobuf** (Protocol Buffers)
    - Required for ONNX export functionality.
- **GTest** (Google Test)
    - Required for building and running unit tests.
- **Doxygen**
    - Required for generating API documentation.

## Platform Specifics
- **Linux:** Standard development tools (`build-essential`).
- **Windows:** Visual Studio with C++ support or MinGW.
- **macOS:** Xcode Command Line Tools.
