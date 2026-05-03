# Mac ARM (OrbStack) Build & Installation Guide

This document describes the environment configuration and specific modifications required to build and run the LilinVision project on a Mac with Apple Silicon (ARM64) using OrbStack.

## Environment Overview
- **Host:** macOS (ARM64)
- **Virtualization:** [OrbStack](https://orbstack.dev/)
- **VM Guest:** Ubuntu 24.04 (Noble Numbat) - ARM64

## 1. Prerequisites
Ensure OrbStack is installed and a default Ubuntu machine is running.

### Private Forks & Submodules
The submodules `darknet` and `DarkHelp` have been migrated to private GitHub forks to preserve custom patches (like the OpenBLAS fix) across environments:
- `darknet` -> `https://github.com/Dakb00/darknet-private.git`
- `DarkHelp` -> `https://github.com/Dakb00/darkhelp-private.git`

When cloning this project on a new machine, ensure you have GitHub CLI (`gh`) or SSH access to your private repos, then run:
```bash
git submodule update --init --recursive
```

### Host Dependencies
- Node.js & npm (for building the React frontend)

### VM Guest Dependencies
Run the following inside the Ubuntu VM:
```bash
sudo apt-get update
sudo apt-get install -y \
    build-essential cmake git file \
    libopencv-dev libtclap-dev libmagic-dev \
    libopenblas-dev libblas-dev liblapack-dev \
    protobuf-compiler libprotobuf-dev \
    libsqlite3-dev libgtest-dev libasio-dev
```

## 2. Darknet Modifications
A patch was applied to `darknet/src-lib/blas.hpp` to handle OpenBLAS header location differences in Ubuntu ARM64.

### The Patch
```cpp
// darknet/src-lib/blas.hpp
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

## 3. Build Process

### Step A: Build Frontend (Mac Host)
The frontend is built on the macOS host for speed and then served by the backend in the VM.
```bash
cd LilinVision-Web
npm install
npm run build
```

### Step B: Build Darknet (VM)
```bash
cd darknet
mkdir build && cd build
cmake -DCMAKE_BUILD_TYPE=Release \
      -DDARKNET_TRY_CUDA=OFF \
      -DDARKNET_TRY_ROCM=OFF \
      -DDARKNET_TRY_OPENBLAS=ON \
      -DBLAS_LIBRARIES=/usr/lib/aarch64-linux-gnu/libopenblas.so \
      -DCMAKE_CXX_FLAGS="-I/usr/include/aarch64-linux-gnu/openblas-pthread" \
      -DCMAKE_C_FLAGS="-I/usr/include/aarch64-linux-gnu/openblas-pthread" \
      ..
make -j$(nproc)
make package
sudo dpkg -i darknet-*.deb
```

### Step C: Build DarkHelp (VM)
```bash
cd DarkHelp
mkdir build && cd build
cmake -DCMAKE_BUILD_TYPE=Release ..
make -j$(nproc)
make package
sudo dpkg -i darkhelp-*.deb
```

### Step D: Build VMS Lite (VM)
```bash
cd vms-lite
mkdir build && cd build
cmake -DCMAKE_BUILD_TYPE=Release ..
make -j$(nproc)
make package
sudo dpkg -i vms-lite-*.deb
```

## 4. Running the Service
The `vms-lite` package installs a systemd service.
```bash
# Check status
orb -m ubuntu systemctl status vms-lite

# View logs
orb -m ubuntu journalctl -u vms-lite -f
```

The Web GUI is accessible at `http://ubuntu.orb.local:5000` or the VM's IP on port 5000.
