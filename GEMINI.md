# LilinVision Workspace

LilinVision is a unified workspace for advanced video surveillance and AI-powered object detection. 

**Note: For the complete documentation index, see [index/INDEX.md](index/INDEX.md).**

## Project Overview

- **[Darknet (YOLO)](darknet/README.md):** A state-of-the-art, real-time object detection framework.
- **[DarkHelp](DarkHelp/README_DARKHELP.md):** A C++20 wrapper for Darknet YOLO.
- **[vms-lite](index/vms-lite-README.md):** A custom, high-performance VMS backend built with Clean Architecture.
- **[ZoneMinder](zoneminder/README_ZONEMINDER.md):** A full-featured, open-source video surveillance software system.

## Main Technologies

### vms-lite (The "Desk" Project)
- **Languages:** C++20.
- **Architecture:** Hexagonal / Clean Architecture.
- **Documentation:** [vms-lite-README.md](index/vms-lite-README.md).

### Darknet (YOLO)
- **Architectures:** Supports x86_64, ARM (Jetson Orin).
- **Documentation:** [README_DARKNET.md](darknet/README_DARKNET.md).

### DarkHelp
- **Documentation:** [README_DARKHELP.md](DarkHelp/README_DARKHELP.md).

## Building and Running

### Darknet
Refer to [darknet/README_DARKNET.md](darknet/README_DARKNET.md) for detailed instructions.

### DarkHelp
Refer to [DarkHelp/README_DARKHELP.md](DarkHelp/README_DARKHELP.md) for detailed instructions.

### vms-lite
Refer to [index/vms-lite-README.md](index/vms-lite-README.md) for detailed instructions.
Latest updates include improved `.deb` packaging with proactive dependency validation and system diagnostics during installation.

---
*Primary Entry Point: LilinVision/GEMINI.md*
