# LilinVision Distribution & Compatibility Guide

This guide explains how to build a "Universal" version of LilinVision (vms-lite) that can be distributed as a `.deb` package to other machines with maximum compatibility.

## 1. The "Golden Rule" of Compatibility
**Build on the oldest target OS.**
* If you want to support Ubuntu 22.04 and 24.04, you **MUST** build the package on Ubuntu 22.04.
* A binary built on 22.04 will run on 24.04.
* A binary built on 24.04 will **NOT** run on 22.04 (due to GLIBC version mismatch).

## 2. Creating a "Safe" CPU-Only Build
To ensure your `.deb` works on any Intel/AMD machine regardless of their GPU (NVIDIA, AMD, or Intel), you must compile Darknet and DarkHelp in CPU-only mode.

### Step A: Build Darknet (CPU-Only)
```bash
cd darknet
mkdir build_cpu && cd build_cpu
cmake -DCMAKE_BUILD_TYPE=Release \
      -DENABLE_CUDA=OFF \
      -DENABLE_CUDNN=OFF \
      -DENABLE_OPENCV=ON \
      ..
make -j$(nproc)
sudo make install
```

### Step B: Build DarkHelp
```bash
cd DarkHelp
mkdir build && cd build
cmake -DCMAKE_BUILD_TYPE=Release ..
make -j$(nproc)
sudo make install
```

### Step C: Build vms-lite Package
```bash
cd vms-lite
mkdir build && cd build
cmake -DCMAKE_BUILD_TYPE=Release ..
make package
```

## 3. Hardware Acceleration Trade-offs

| Build Type | Compatibility | Performance | Requirements |
|------------|---------------|-------------|--------------|
| **CPU Only** | **Universal** | Low (Good for TinyYOLO) | None |
| **NVIDIA CUDA**| NVIDIA Only | **High** | NVIDIA Drivers + CUDA |
| **AMD ROCm** | AMD Only | High | ROCm Runtime installed |

## 4. Troubleshooting a New Install
When a user installs your `.deb` on a fresh system, they should use `apt` to handle the standard dependencies (like OpenCV):

```bash
# Recommended way
sudo apt install ./vms-lite-0.1.0-Linux.deb
```

If the program fails to start with "Library not found", the user can run:
```bash
sudo ldconfig
```
This refreshes the system's knowledge of the bundled libraries we included in `/usr/lib/`.
