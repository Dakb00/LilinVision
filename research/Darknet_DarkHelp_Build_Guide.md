# Darknet and DarkHelp Build Documentation (CPU-only + OpenBLAS)

This document details the steps taken to build and install Darknet and DarkHelp on Ubuntu 24.04 for use with `vms-lite`, specifically targeting a CPU-only environment with OpenBLAS optimizations.

## 1. Prerequisites and Dependencies

The following packages were installed to support the build process:

```bash
sudo apt-get update
sudo apt-get install -y \
    build-essential \
    cmake \
    libopencv-dev \
    libtclap-dev \
    libmagic-dev \
    libopenblas-dev \
    libblas-dev \
    liblapack-dev \
    protobuf-compiler \
    libprotobuf-dev
```

## 2. Darknet Build Process

### Source Modification
A patch was applied to `darknet/src-lib/blas.hpp` to ensure compatibility with Ubuntu's OpenBLAS header locations. The original code hardcoded `cblas-openblas64.h`, which is not standard on this distribution.

**Change:**
```cpp
#ifdef DARKNET_USE_OPENBLAS
    #ifdef WIN32
        #include <openblas/cblas.h>
    #else
        #if __has_include(<cblas-openblas64.h>)
            #include <cblas-openblas64.h>
        #else
            #include <cblas.h>
        #endif
    #endif
```

### Compilation
Darknet was configured to disable GPU support and explicitly use OpenBLAS.

```bash
cd darknet
mkdir build && cd build
cmake -DCMAKE_BUILD_TYPE=Release \
      -DDARKNET_TRY_CUDA=OFF \
      -DDARKNET_TRY_ROCM=OFF \
      -DDARKNET_TRY_OPENBLAS=ON \
      -DBLAS_LIBRARIES=/usr/lib/x86_64-linux-gnu/libopenblas.so \
      -DCMAKE_CXX_FLAGS="-I/usr/include/x86_64-linux-gnu/openblas-pthread" \
      -DCMAKE_C_FLAGS="-I/usr/include/x86_64-linux-gnu/openblas-pthread" \
      ..
make -j$(nproc)
make package
sudo dpkg -i darknet-5.1.97-Linux.deb
```

## 3. DarkHelp Build Process

DarkHelp was built as a wrapper for the previously installed Darknet library.

```bash
cd DarkHelp
mkdir build && cd build
cmake -DCMAKE_BUILD_TYPE=Release ..
make -j$(nproc)
make package
sudo dpkg -i darkhelp-1.9.8-1-Linux-x86_64-Ubuntu-24.04.deb
```

## 4. Verification

After installation, the following commands were used to verify that the binaries were correctly compiled with the intended features:

### Darknet Verification
```bash
darknet version
```
**Expected Output:**
- `Darknet is compiled to use the CPU. GPU is disabled.`
- `OpenBLAS 0.3.26, Protobuf 3.21.12, OpenCV 4.6.0`

### DarkHelp Verification
```bash
DarkHelp --version
```
**Expected Output:**
- `DarkHelp v1.9.8-1`
- `Darknet v5.1.97`
