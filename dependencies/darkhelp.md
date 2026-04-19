# DarkHelp Dependencies

This document lists the external dependencies required to build and run the DarkHelp C++17 wrapper for Darknet (YOLO).

## Build System & Compiler
- **CMake** (>= 3.20)
- **C++17 Compiler** (GCC 9+, Clang, or MSVC)

## Core Libraries (Mandatory)
- **Darknet** (Required)
    - DarkHelp is a wrapper and links against `libdarknet.so` (Linux) or `darknet.lib` (Windows).
- **OpenCV** (Mandatory)
    - Essential for image processing, annotation, and display functions.
- **Threads** (Pthreads)
    - Required for multi-threading.
- **TCLAP** (Templatized Command Line Argument Parser)
    - Required for parsing command-line arguments in the CLI tools.
- **libmagic** (Linux Only)
    - Used for file type detection (detecting if a file is an image or video).

## Additional Tools (Optional)
- **Doxygen**
    - Used for generating HTML documentation from the source code.

## Platform Specifics
- **Linux:**
    - Standard development packages: `build-essential`, `libmagic-dev`, `libtclap-dev`, `libopencv-dev`.
- **Windows:**
    - Visual Studio (with C++17 support).
    - Recommendation: Use `vcpkg` to manage dependencies (like `tclap`).
- **macOS:**
    - Xcode Command Line Tools.
    - OpenCV and other dependencies can be installed via Homebrew.
