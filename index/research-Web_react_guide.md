# VMS Lite UI Development Guideline

This document defines the recommended frontend architecture for the VMS Lite web management UI. It is based on the current VMS Lite system architecture and current React ecosystem guidance. The VMS Lite frontend is a React SPA compiled to static files, served by the C++ backend, using MJPEG for live streams and REST plus polling for data operations. [file:1] React’s official guidance centers on building UIs from reusable components, Vite is recommended as a modern build tool for React apps, React Router is positioned as a current router bridging React 18 to React 19, and TanStack Query remains a standard choice for managing async server state in React applications. [web:3][web:17][web:28][web:23]

## Purpose

The UI should support the core operational needs already defined in the architecture: camera management, live preview of RTSP sources through MJPEG, and searchable detection history backed by SQLite. [file:1] The frontend should remain lightweight, operationally focused, and easy to package as static files into `/usr/share/vms-lite/www/` as part of the `.deb` deployment model. [file:1]

## Recommended stack

Use the following package and tooling baseline for the first implementation. React provides the component model, Vite provides a current build workflow, React Router provides app-level routing, and TanStack Query provides a clean separation between server state and local UI state. [web:3][web:17][web:28][web:23]

```md
Core:
- react
- react-dom
- vite
- @vitejs/plugin-react

Routing:
- react-router-dom

Data layer:
- @tanstack/react-query

Useful utilities:
- clsx
- zod
- date-fns

Styling:
- Plain CSS
- CSS variables for tokens
- No heavy UI framework for v1
```

Suggested setup commands:

```bash
npm create vite@latest vms-lite-ui -- --template react
cd vms-lite-ui
npm install react-router-dom @tanstack/react-query clsx zod date-fns
```

## Architectural principles

The VMS Lite frontend should mirror the backend contract instead of inventing a more complex client architecture. The backend already defines a React SPA served by the C++ service, camera configuration over REST, MJPEG live previews, and polling-based detection history retrieval. [file:1] That means the UI should be organized around route pages, reusable components, API service modules, and hooks for server communication rather than around one oversized dashboard file. [file:1]

Use these design rules:

- Treat cameras and detections as server state. [file:1]
- Treat modals, selected camera, filter text, grid mode, and open panels as UI state.
- Keep MJPEG rendering simple with HTML `<img>` elements that point to `/api/v1/stream/{id}`. [file:1]
- Use semantic HTML because this is an admin-style operational tool.
- Compile everything into static frontend assets to be served by the backend. [file:1]

## UI information architecture

The page structure should map directly to the VMS Lite capabilities already defined in the architecture. A small admin shell with persistent navigation is a better fit than a collection of unrelated standalone views because the system revolves around monitoring and configuration workflows. [file:1]

Recommended pages:

- Dashboard, summary of camera count, service state, and recent detection activity. [file:1]
- Cameras, CRUD-like management surface for RTSP sources exposed through `GET /api/v1/cameras` and `POST /api/v1/cameras`. [file:1]
- Monitor, grid and focus view for MJPEG streams exposed through `GET /api/v1/stream/{id}`. [file:1]
- Detections, searchable or filterable history from `GET /api/v1/detections?limit=50`. [file:1]
- Settings, read-only system paths and later system-health controls derived from the deployment architecture. [file:1]

## Recommended src tree

The following folder tree is sized correctly for the current scope while leaving room for future service diagnostics and expanded API features. The structure keeps route pages, feature logic, reusable UI components, and lower-level services separate. [file:1][web:3][web:23]

```text
src/
├── app/
│   ├── main.jsx
│   ├── providers.jsx
│   ├── router.jsx
│   └── App.jsx
│
├── assets/
│   └── logo.svg
│
├── components/
│   ├── layout/
│   │   ├── AppShell.jsx
│   │   ├── Sidebar.jsx
│   │   ├── Topbar.jsx
│   │   └── PageHeader.jsx
│   ├── common/
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   ├── EmptyState.jsx
│   │   ├── Loader.jsx
│   │   ├── ErrorBanner.jsx
│   │   └── StatusBadge.jsx
│   └── data-display/
│       ├── CameraTable.jsx
│       ├── DetectionTable.jsx
│       ├── StatCard.jsx
│       └── StreamTile.jsx
│
├── features/
│   ├── dashboard/
│   │   └── DashboardPage.jsx
│   ├── cameras/
│   │   ├── CamerasPage.jsx
│   │   ├── CameraForm.jsx
│   │   ├── cameraApi.js
│   │   └── useCameras.js
│   ├── monitor/
│   │   ├── MonitorPage.jsx
│   │   └── StreamGrid.jsx
│   ├── detections/
│   │   ├── DetectionsPage.jsx
│   │   ├── DetectionFilters.jsx
│   │   ├── detectionsApi.js
│   │   └── useDetections.js
│   └── settings/
│       └── SettingsPage.jsx
│
├── hooks/
│   ├── usePolling.js
│   └── useDocumentTitle.js
│
├── services/
│   ├── apiClient.js
│   └── queryClient.js
│
├── utils/
│   ├── constants.js
│   ├── formatters.js
│   └── validators.js
│
└── styles/
    ├── tokens.css
    ├── base.css
    ├── layout.css
    ├── components.css
    └── pages.css
```

## Package and runtime notes

Vite is a strong fit because React’s documentation explicitly points developers to build tools such as Vite, and React Router is already used as a recommended build-tool path in the React ecosystem. [web:17] React Router is suitable because the VMS Lite UI is a real application with layout nesting and multiple pages, not a single-screen component demo. [web:28] TanStack Query is appropriate because the detections and camera lists are classic server-state problems involving fetch, cache, refresh, and synchronization rather than purely local component state. [web:23]

## Entry point

Use a clean application bootstrap that wires together global providers, styles, and the router. This aligns with current React application patterns and gives you one obvious place to add more providers later if authentication, feature flags, or app-level settings are added. [web:3][web:23][web:28]

```jsx
// src/app/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { AppProviders } from './providers';
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/pages.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </React.StrictMode>
);
```

```jsx
// src/app/providers.jsx
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../services/queryClient';

export function AppProviders({ children }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

```js
// src/services/queryClient.js
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

## Routing guideline

The router should define one shell route and nested page routes. That structure matches the product shape of VMS Lite, where navigation remains constant while the page body changes between dashboard, camera management, monitor, and detections. [file:1][web:28]

```jsx
// src/app/router.jsx
import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import DashboardPage from '../features/dashboard/DashboardPage';
import CamerasPage from '../features/cameras/CamerasPage';
import MonitorPage from '../features/monitor/MonitorPage';
import DetectionsPage from '../features/detections/DetectionsPage';
import SettingsPage from '../features/settings/SettingsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'cameras', element: <CamerasPage /> },
      { path: 'monitor', element: <MonitorPage /> },
      { path: 'detections', element: <DetectionsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);
```

## Layout architecture

The shell should use a persistent sidebar plus topbar so the user always has direct access to monitoring and management sections. This is a better operational pattern than hiding navigation, because VMS Lite is a control panel rather than a content-focused site. [file:1]

```jsx
// src/components/layout/AppShell.jsx
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-shell__main">
        <Topbar />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

```jsx
// src/components/layout/Sidebar.jsx
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/cameras', label: 'Cameras' },
  { to: '/monitor', label: 'Monitor' },
  { to: '/detections', label: 'Detections' },
  { to: '/settings', label: 'Settings' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">VMS Lite</div>
      <nav className="sidebar__nav" aria-label="Primary">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
```

```jsx
// src/components/layout/Topbar.jsx
export default function Topbar() {
  return (
    <header className="topbar">
      <div>
        <h1 className="topbar__title">VMS Lite Control Panel</h1>
        <p className="topbar__subtitle">RTSP monitoring and detection management</p>
      </div>
    </header>
  );
}
```

## API service guideline

The API layer should be thin and predictable. Components should never build endpoint URLs inline, because the architecture already gives a stable `/api/v1` contract for the current camera and detection workflows. [file:1]

```js
// src/services/apiClient.js
export async function apiClient(path, options = {}) {
  const response = await fetch(`/api/v1${path}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}
```

```js
// src/features/cameras/cameraApi.js
import { apiClient } from '../../services/apiClient';

export function getCameras() {
  return apiClient('/cameras');
}

export function createCamera(payload) {
  return apiClient('/cameras', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
```

```js
// src/features/detections/detectionsApi.js
import { apiClient } from '../../services/apiClient';

export function getDetections(limit = 50) {
  return apiClient(`/detections?limit=${limit}`);
}
```

## Data hooks guideline

Use TanStack Query for server-backed entities such as cameras and detection history because those entities must be fetched, refreshed, cached, and invalidated in a controlled way. [web:23] This is a cleaner pattern than placing `fetch()` logic directly in each page component. [web:23][web:3]

```js
// src/features/cameras/useCameras.js
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCamera, getCameras } from './cameraApi';

export function useCameras() {
  return useQuery({
    queryKey: ['cameras'],
    queryFn: getCameras,
  });
}

export function useCreateCamera() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCamera,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
    },
  });
}
```

```js
// src/features/detections/useDetections.js
import { useQuery } from '@tanstack/react-query';
import { getDetections } from './detectionsApi';

export function useDetections(limit = 50) {
  return useQuery({
    queryKey: ['detections', limit],
    queryFn: () => getDetections(limit),
    refetchInterval: 5000,
  });
}
```

## Common component guideline

Shared UI components should handle repetitive dashboard patterns such as bordered panels, loading states, empty states, and status labels. This keeps the page files focused on orchestration and data flow. [web:3]

```jsx
// src/components/common/Card.jsx
export default function Card({ title, children, actions }) {
  return (
    <section className="card">
      {(title || actions) && (
        <header className="card__header">
          {title && <h2 className="card__title">{title}</h2>}
          {actions && <div className="card__actions">{actions}</div>}
        </header>
      )}
      <div className="card__body">{children}</div>
    </section>
  );
}
```

```jsx
// src/components/common/StatusBadge.jsx
export default function StatusBadge({ status }) {
  const normalized = String(status || 'unknown').toLowerCase();
  return <span className={`status-badge status-badge--${normalized}`}>{normalized}</span>;
}
```

```jsx
// src/components/common/Loader.jsx
export default function Loader({ label = 'Loading...' }) {
  return <div className="loader" role="status" aria-live="polite">{label}</div>;
}
```

```jsx
// src/components/common/EmptyState.jsx
export default function EmptyState({ title, description }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
```

## Page implementation guideline

Each route page should map to a specific operational workflow. The current architecture suggests four main runtime concerns: summary, camera management, live monitoring, and detection history. [file:1]

### Dashboard page

The dashboard should summarize status rather than embed the full product in one view. It should show camera totals, recent detections, and basic operational indicators. [file:1]

```jsx
// src/features/dashboard/DashboardPage.jsx
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { useCameras } from '../cameras/useCameras';
import { useDetections } from '../detections/useDetections';

export default function DashboardPage() {
  const camerasQuery = useCameras();
  const detectionsQuery = useDetections(10);

  if (camerasQuery.isLoading || detectionsQuery.isLoading) {
    return <Loader label="Loading dashboard..." />;
  }

  if (camerasQuery.isError || detectionsQuery.isError) {
    return <EmptyState title="Dashboard unavailable" description="Could not load camera or detection data." />;
  }

  const cameras = camerasQuery.data || [];
  const detections = detectionsQuery.data || [];

  return (
    <div className="page-grid">
      <Card title="System Overview">
        <div className="stats-grid">
          <div className="stat">
            <span className="stat__label">Total cameras</span>
            <strong className="stat__value">{cameras.length}</strong>
          </div>
          <div className="stat">
            <span className="stat__label">Recent detections</span>
            <strong className="stat__value">{detections.length}</strong>
          </div>
        </div>
      </Card>

      <Card title="Recent Detection Activity">
        {detections.length === 0 ? (
          <EmptyState title="No detections yet" description="Recent detection events will appear here." />
        ) : (
          <ul className="activity-list">
            {detections.map((item, index) => (
              <li key={item.id ?? index}>
                {item.label ?? 'Detection'} from camera {item.cameraId ?? 'unknown'}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
```

### Cameras page

The cameras page should be the primary configuration surface because the architecture defines camera URLs and IDs as part of the JSON config model and exposes list and create endpoints for cameras. [file:1]

```jsx
// src/features/cameras/CameraForm.jsx
import { useState } from 'react';
import { useCreateCamera } from './useCameras';

const initialState = {
  id: '',
  name: '',
  rtspUrl: '',
};

export default function CameraForm() {
  const [form, setForm] = useState(initialState);
  const createCamera = useCreateCamera();

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    createCamera.mutate(form, {
      onSuccess: () => setForm(initialState),
    });
  }

  return (
    <form className="camera-form" onSubmit={handleSubmit}>
      <label>
        Camera ID
        <input name="id" value={form.id} onChange={handleChange} required />
      </label>

      <label>
        Camera Name
        <input name="name" value={form.name} onChange={handleChange} required />
      </label>

      <label>
        RTSP URL
        <input name="rtspUrl" value={form.rtspUrl} onChange={handleChange} required />
      </label>

      <button type="submit" className="button button--primary" disabled={createCamera.isPending}>
        {createCamera.isPending ? 'Saving...' : 'Add Camera'}
      </button>
    </form>
  );
}
```

```jsx
// src/features/cameras/CamerasPage.jsx
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import CameraForm from './CameraForm';
import { useCameras } from './useCameras';

export default function CamerasPage() {
  const { data, isLoading, isError } = useCameras();

  if (isLoading) return <Loader label="Loading cameras..." />;
  if (isError) return <EmptyState title="Camera list unavailable" description="Unable to load configured cameras." />;

  const cameras = data || [];

  return (
    <div className="page-stack">
      <Card title="Add Camera">
        <CameraForm />
      </Card>

      <Card title="Configured Cameras">
        {cameras.length === 0 ? (
          <EmptyState title="No cameras configured" description="Add your first RTSP source to begin monitoring." />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>RTSP URL</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {cameras.map((camera) => (
                <tr key={camera.id}>
                  <td>{camera.id}</td>
                  <td>{camera.name}</td>
                  <td>{camera.rtspUrl}</td>
                  <td><StatusBadge status={camera.status || 'unknown'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
```

### Monitor page

The monitor page should use simple MJPEG `<img>` rendering because the architecture explicitly says live preview comes from MJPEG streams directly from C++ worker threads. [file:1] React should manage layout, selection, and status labels while the browser handles the image stream. [file:1]

```jsx
// src/features/monitor/StreamGrid.jsx
import StatusBadge from '../../components/common/StatusBadge';

export default function StreamGrid({ cameras = [] }) {
  return (
    <div className="stream-grid">
      {cameras.map((camera) => (
        <article className="stream-tile" key={camera.id}>
          <header className="stream-tile__header">
            <div>
              <h3>{camera.name}</h3>
              <p>{camera.id}</p>
            </div>
            <StatusBadge status={camera.status || 'online'} />
          </header>

          <img
            className="stream-tile__image"
            src={`/api/v1/stream/${camera.id}`}
            alt={`Live stream for ${camera.name}`}
          />
        </article>
      ))}
    </div>
  );
}
```

```jsx
// src/features/monitor/MonitorPage.jsx
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { useCameras } from '../cameras/useCameras';
import StreamGrid from './StreamGrid';

export default function MonitorPage() {
  const { data, isLoading, isError } = useCameras();

  if (isLoading) return <Loader label="Loading live monitor..." />;
  if (isError) return <EmptyState title="Monitor unavailable" description="Could not load camera streams." />;

  const cameras = data || [];

  return (
    <Card title="Live Monitor">
      {cameras.length === 0 ? (
        <EmptyState title="No streams available" description="Add a camera to view MJPEG live previews." />
      ) : (
        <StreamGrid cameras={cameras} />
      )}
    </Card>
  );
}
```

### Detections page

The detections page should be table-first because the architecture defines detection history as a searchable SQLite audit trail exposed through polling. [file:1] Filtering and stable table rendering matter more here than decorative visuals. [file:1]

```jsx
// src/features/detections/DetectionFilters.jsx
export default function DetectionFilters({ filters, onChange }) {
  return (
    <div className="filters">
      <label>
        Camera ID
        <input
          name="cameraId"
          value={filters.cameraId}
          onChange={onChange}
          placeholder="Filter by camera"
        />
      </label>

      <label>
        Label
        <input
          name="label"
          value={filters.label}
          onChange={onChange}
          placeholder="Filter by object label"
        />
      </label>
    </div>
  );
}
```

```jsx
// src/components/data-display/DetectionTable.jsx
export default function DetectionTable({ rows }) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Time</th>
          <th>Camera</th>
          <th>Label</th>
          <th>Confidence</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={row.id ?? index}>
            <td>{row.timestamp ?? '-'}</td>
            <td>{row.cameraId ?? '-'}</td>
            <td>{row.label ?? '-'}</td>
            <td>{row.confidence ?? '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

```jsx
// src/features/detections/DetectionsPage.jsx
import { useMemo, useState } from 'react';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import DetectionTable from '../../components/data-display/DetectionTable';
import DetectionFilters from './DetectionFilters';
import { useDetections } from './useDetections';

export default function DetectionsPage() {
  const [filters, setFilters] = useState({ cameraId: '', label: '' });
  const { data, isLoading, isError } = useDetections(50);

  function handleChange(event) {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  }

  const rows = useMemo(() => {
    const items = data || [];
    return items.filter((item) => {
      const matchesCamera = !filters.cameraId || String(item.cameraId || '').includes(filters.cameraId);
      const matchesLabel = !filters.label || String(item.label || '').toLowerCase().includes(filters.label.toLowerCase());
      return matchesCamera && matchesLabel;
    });
  }, [data, filters]);

  if (isLoading) return <Loader label="Loading detections..." />;
  if (isError) return <EmptyState title="Detection history unavailable" description="Could not load detection records." />;

  return (
    <Card title="Detection History">
      <DetectionFilters filters={filters} onChange={handleChange} />
      {rows.length === 0 ? (
        <EmptyState title="No matching detections" description="Adjust the filters or wait for new events." />
      ) : (
        <DetectionTable rows={rows} />
      )}
    </Card>
  );
}
```

### Settings page

The settings page can start as a read-only operational summary because the architecture already defines system paths, deployment locations, and service-related runtime details even though it does not yet define full settings APIs. [file:1]

```jsx
// src/features/settings/SettingsPage.jsx
import Card from '../../components/common/Card';

export default function SettingsPage() {
  return (
    <div className="page-stack">
      <Card title="System Paths">
        <ul className="meta-list">
          <li><strong>Config:</strong> /etc/vms-lite/config.json</li>
          <li><strong>Database:</strong> /var/lib/vms-lite/history.db</li>
          <li><strong>Models:</strong> /usr/share/vms-lite/models/</li>
          <li><strong>Web assets:</strong> /usr/share/vms-lite/www/</li>
        </ul>
      </Card>

      <Card title="Planned Diagnostics">
        <ul className="meta-list">
          <li>Service status</li>
          <li>Per-camera worker health</li>
          <li>Model/version information</li>
          <li>Database retention settings</li>
        </ul>
      </Card>
    </div>
  );
}
```

## CSS architecture guideline

The CSS should stay plain, maintainable, and focused on dashboard readability. Since the frontend is meant to be bundled as static files served by the backend, a token-driven CSS structure is a good balance between simplicity and scalability. [file:1]

```css
/* src/styles/tokens.css */
:root {
  --color-bg: #0b1220;
  --color-surface: #121a2b;
  --color-surface-2: #182235;
  --color-border: #2b3952;
  --color-text: #e6edf7;
  --color-text-muted: #9fb0c7;
  --color-primary: #22c55e;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --radius-md: 10px;
  --radius-lg: 14px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
}
```

```css
/* src/styles/base.css */
*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body,
#root {
  margin: 0;
  min-height: 100%;
}

body {
  font-family: Inter, system-ui, sans-serif;
  background: var(--color-bg);
  color: var(--color-text);
}

img {
  display: block;
  max-width: 100%;
}

button,
input {
  font: inherit;
}
```

```css
/* src/styles/layout.css */
.app-shell {
  display: grid;
  grid-template-columns: 260px 1fr;
  min-height: 100vh;
}

.sidebar {
  padding: var(--space-6);
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
}

.app-shell__main {
  display: flex;
  flex-direction: column;
}

.topbar {
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.page-content {
  padding: var(--space-6);
}
```

```css
/* src/styles/components.css */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.page-stack,
.page-grid {
  display: grid;
  gap: var(--space-6);
}

.stats-grid,
.stream-grid {
  display: grid;
  gap: var(--space-4);
}

.stream-grid {
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}

.stream-tile__image {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: var(--radius-md);
  background: #000;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  text-align: left;
  padding: 12px;
  border-bottom: 1px solid var(--color-border);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  text-transform: capitalize;
}

.status-badge--online,
.status-badge--active {
  background: rgba(34, 197, 94, 0.18);
  color: #86efac;
}

.status-badge--offline,
.status-badge--error {
  background: rgba(239, 68, 68, 0.18);
  color: #fca5a5;
}
```

## HTML and accessibility guideline

Use semantic HTML throughout the app because the UI is a management console with repeated data tables, forms, and navigation landmarks. This improves structure, keyboard navigation, and maintainability. [file:1] Use `<header>`, `<nav>`, `<main>`, `<section>`, `<table>`, `<form>`, `<label>`, and accessible button text by default. [file:1]

Specific guidance:

- The sidebar should be inside `<aside>` plus `<nav>`.
- The top bar should use `<header>`.
- The main routed region should use `<main>`.
- Stream cards can use `<article>`.
- Detection history should use a real `<table>`.
- Every stream image should have meaningful `alt` text.
- Every form field should have a visible `<label>`.

## State management guideline

Separate state into two layers. Use TanStack Query for server-backed entities such as cameras and detection history, and use local React state for transient interface concerns such as open forms, filter inputs, selected stream tile, and grid mode. [web:23][web:3] This keeps the system simple and aligned to the current backend architecture without introducing unnecessary global state. [file:1]

## What not to add in v1

To stay aligned with the VMS Lite scope, avoid adding frontend complexity that the backend does not require. The architecture specifies REST, polling, and MJPEG, so there is no need yet for WebSockets, Redux, SSR, or a complex component framework. [file:1] Keeping the UI smaller will also make packaging into the final `.deb` more predictable. [file:1]

Avoid in v1:

- Redux or other heavy global state layers.
- WebSockets for detections unless the backend adds support later.
- Canvas-based custom stream rendering.
- A heavyweight design system library.
- Multiple frontend apps or micro-frontends.

## Implementation order

Build the frontend in the same incremental order implied by the architecture roadmap so each stage works against real backend capabilities. The roadmap places the web API and GUI in Phase 3 after core inference, config, and persistence work are in place. [file:1]

Recommended implementation order:

1. Create the Vite React app shell and routing. [web:17][web:28]
2. Add the camera list and add-camera form using `GET /api/v1/cameras` and `POST /api/v1/cameras`. [file:1]
3. Add the monitor page using MJPEG streams from `GET /api/v1/stream/{id}`. [file:1]
4. Add the detections page with polling from `GET /api/v1/detections?limit=50`. [file:1]
5. Add the dashboard page as a summary of the above features. [file:1]
6. Add read-only settings and diagnostics panels based on runtime paths and future backend expansion. [file:1]

## Final recommendation

The best implementation for VMS Lite is a Vite-based React SPA using React Router, TanStack Query, semantic HTML, and plain CSS. That approach matches both current React ecosystem standards and the system architecture you already defined for deployment, streaming, configuration, and detection history. [web:17][web:28][web:23][file:1]
