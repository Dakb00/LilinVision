# VMS Lite Web GUI Architecture

This document explains how the VMS Lite backend serves the React-based LilinVision-Web frontend, including the recent architectural changes made to ensure reliable deployment and "Zero-Config" operation.

## 1. Recent Changes Summary

To achieve a production-ready state, the following critical updates were implemented:

- **Manual Asset Handling:** Switched from Crow's default `set_static_file_info` to a manual binary stream approach. This was necessary to ensure precise control over MIME types (e.g., ensuring `.js` is served as `application/javascript`), preventing browsers from blocking script execution.
- **SPA Fallback (Catch-All):** Added a `CROW_CATCHALL_ROUTE` that serves `index.html` for any unknown URL. This is mandatory for React applications using client-side routing (like `wouter` or `react-router`), allowing users to refresh the page on deep links without getting a 404.
- **Automated Frontend Integration:** Established a pipeline to build the `LilinVision-Web` React project and sync its `dist` output into the `vms-lite/gui` directory for inclusion in the Debian package.
- **Port Conflict Resolution:** Identified and resolved a conflict with Port 5000 (previously used by Frigate).
- **Security hardening:** Transitioned the service from `root` to a dedicated `vms-lite` system user with restricted permissions.

## 2. Path Resolution Logic

The application uses a multi-stage discovery logic in `src/main.cpp` to find the web assets, allowing the same binary to run in development and production:

1.  **Local Dev:** Checks for `./LilinVision-Web/dist/index.html`.
2.  **System Install:** Checks for `/usr/share/vms-lite/www/index.html` (the standard FHS path).
3.  **Fallback:** Defaults to a local `./www` folder.

This path is then passed to the `CrowRestServer` as `m_staticPath`.

## 3. How CrowRestServer Serves the GUI

The `CrowRestServer` implements three distinct strategies for web serving:

### A. The Root Route (`/`)
When a user hits the base URL, the server manually opens the `index.html` file, reads it into a string buffer, and returns it with an explicit `text/html` header.

### B. Static Assets (`/assets/<string>`)
To support Vite's bundled output, the server handles requests for `/assets/` by:
1.  Mapping the URL string to the physical file on disk.
2.  Opening the file in **binary mode** (critical for images and minified JS).
3.  Performing a manual extension check to set the correct `Content-Type`:
    - `.js` -> `application/javascript`
    - `.css` -> `text/css`
    - `.svg` -> `image/svg+xml`
    - `.png`/`.jpg` -> `image/...`

### C. SPA Support (Catch-All)
If a request is made to a path that isn't a known API endpoint or a physical file, the server defaults to serving `index.html`. This allows the React application to take over the URL and render the correct sub-page internally.

## 4. Packaging and Deployment

The deployment is handled by **CPack** and **Debian control scripts**:

1.  **CMakeLists.txt:** Instructs the installer to copy the `gui/` directory to `/usr/share/vms-lite/www`.
2.  **Post-Install (`postinst`):**
    - Creates the `vms-lite` system user and group.
    - Creates `/var/lib/vms-lite` for the SQLite database.
    - Sets ownership so the `vms-lite` user can read assets but only write to the database folder.
    - Enables and starts the `systemd` service.
3.  **Pre-Removal (`prerm`):** Ensures a clean shutdown of the camera threads and web server before the package is removed.

## 5. Summary of Service Configuration

- **Binary:** `/usr/bin/vms-lite`
- **Static Assets:** `/usr/share/vms-lite/www`
- **Database:** `/var/lib/vms-lite/history.db`
- **Service:** `vms-lite.service` (Systemd)
- **Port:** 5000 (Default)
