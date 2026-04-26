# Packaging Fix: Dependency Log Detection

This document summarizes the changes made to the `vms-lite` packaging scripts to address issues where missing system-level dependencies were silent or hard to diagnose during installation on a clean/new machine.

## Problem Description
Previously, if `vms-lite` was installed on a machine missing critical system libraries (like `libopencv`, `libopenblas`, or `libgomp`), the installation would appear to succeed, but the service would fail to start with cryptic "shared library not found" errors in the system logs. Users often didn't know which specific libraries were missing.

## Changes to `vms-lite/packaging/postinst`

The following improvements were added to the `postinst` script:

### 1. Automatic Library Path Registration
A new step was added to ensure the private library directory (`/usr/lib/vms-lite`) is recognized by the system linker:
- **Action:** Created `/etc/ld.so.conf.d/vms-lite.conf` containing `/usr/lib/vms-lite`.
- **Benefit:** Allows the system to find bundled libraries like `libdarkhelp.so` and `libdarknet.so` without requiring `LD_LIBRARY_PATH` to be set globally.

### 2. Proactive Dependency Validation Section
A "Dependency Validation Logs" block was introduced to perform real-time checks during the `dpkg --configure` phase.

#### Key Logic:
```bash
# Check if the .so can find its own dependencies (OpenCV, etc.)
MISSING_DEPS=$(LD_LIBRARY_PATH="$VMS_LIBDIR" ldd "$lib_path" | grep "not found" || true)
```

- **LDD Integration:** It runs `ldd` on the primary shared libraries.
- **Contextual Search:** It sets `LD_LIBRARY_PATH` temporarily during the check so that bundled libraries can find each other.
- **Detection:** It greps for "not found" to identify specifically which system-level dependencies are missing.

### 3. User-Friendly Feedback
Instead of failing silently, the script now prints clear `[OK]`, `[WARNING]`, or `[ERROR]` messages directly to the terminal during installation:
- **Binary Check:** Verifies `/usr/bin/vms-lite` exists.
- **Library Check:** Verifies `libdarkhelp.so` and `libdarknet.so` exist in the private directory.
- **Actionable Advice:** If dependencies are missing, it suggests the specific `apt install` command needed to fix the system state (e.g., `sudo apt install libopencv-videoio4.x libopenblas0 libgomp1`).

## Changes to `vms-lite/packaging/postrm`

A corresponding cleanup step was added to the post-removal script to ensure the system state is restored:
- **Action:** If the package is removed or purged, the script deletes `/etc/ld.so.conf.d/vms-lite.conf` and runs `ldconfig`.
- **Benefit:** Prevents stale library paths from persisting in the system configuration.

## Impact on New Machine Installation
When installing on a new machine, the `postinst` output will now look like this if dependencies are missing:

```text
[vms-lite] Validating installation and dependencies...
[OK] vms-lite binary found at /usr/bin/vms-lite
[OK] Found libdarkhelp.so in private directory.
[WARNING] libdarkhelp.so has missing dependencies on this system:
    libopencv_videoio.so.4.5 => not found
    libopenblas.so.0 => not found
Please ensure all required system libraries (OpenCV, OpenBLAS, etc.) are installed.
You might need to run: sudo apt install libopencv-videoio4.x libopenblas0 libgomp1
```

This provides immediate, actionable feedback to the administrator, significantly reducing troubleshooting time.
