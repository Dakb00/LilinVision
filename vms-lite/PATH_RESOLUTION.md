# Path Resolution Strategy (Zero-Config)

VMS Lite uses a dynamic path resolution strategy to ensure the same binary works seamlessly in both development and production (installed via `.deb` package) environments without manual configuration.

## 1. Web Assets (React GUI)
The backend (Crow) needs to know where the compiled React files are located. The `main.cpp` logic checks for paths in the following priority:

1.  **Command Line Override:** `--gui <path>`
2.  **Development Path:** `./visionguard/client/dist/` (Used when running from the project root).
3.  **Production Path:** `/usr/share/vms-lite/www/` (Standard path defined in the Master Architecture Guide).
4.  **Fallback:** `./www/`

## 2. Database (SQLite)
The detection history and camera configuration are stored in `history.db`. The location is resolved as follows:

1.  **Production Path:** `/var/lib/vms-lite/history.db` (Used if the directory `/var/lib/vms-lite/` exists).
2.  **Development Path:** `history.db` (Local directory).

## 3. Implementation Details

### Backend (C++)
- **`CrowRestServer`**: The constructor accepts a `static_path` string, which is then used by all static route handlers (`/` and `/assets/<path>`).
- **`main.cpp`**: Performs `std::filesystem::exists()` checks at startup to determine the best paths for the current environment.

## 4. Packaging Implications
The `.deb` package configuration (CPack) and `postinst` scripts must ensure:
- Web assets are installed to `/usr/share/vms-lite/www/`.
- The directory `/var/lib/vms-lite/` is created with appropriate write permissions for the `vmslite` user.
