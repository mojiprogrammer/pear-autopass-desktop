# PeerVault — Pear AutoPass Desktop

PeerVault is a desktop application for managing private notes and key-value entries. It combines a React and TypeScript user interface with Electron, Vite, the Pear runtime, and [Autopass](https://github.com/holepunchto/autopass) for backend data operations.

Developed as a desktop application engineering assessment, PeerVault focuses on frontend architecture, desktop integration, entry management, and communication between the desktop application and its backend worker.

## Features

- **Entry management** — Create, view, edit, and delete entries.
- **Rich-text editor** — Format content with bold, italic, underline, headings, and ordered or unordered lists.
- **Search** — Filter entries by title or content.
- **Editable titles** — Rename existing entries when supported by the backend save workflow.
- **Light and dark themes** — Switch between visual themes.
- **Interactive feedback** — Display notifications for successful operations, validation errors, and failures.
- **Delete confirmation** — Confirm destructive actions before removing entries.
- **Autopass integration** — Communicate with the backend worker for entry operations.
- **Component-based UI** — Organize the interface into reusable React components.
- **TypeScript** — Use typed application models and service interfaces.
- **Desktop experience** — A custom dashboard with navigation, dialogs, and a desktop-oriented layout.

> **Project scope:** PeerVault is an assessment project integrating Electron, Pear, and Autopass. Features such as end-to-end encrypted messaging, file sharing, multi-device synchronization, and production deployment should not be assumed unless they are separately implemented and tested.

## Technology stack

| Technology | Purpose |
|---|---|
| React | Component-based user interface |
| TypeScript | Type-safe application development |
| HTML and CSS | Application markup, styling, and themes |
| Vite | Frontend development server and build tooling |
| Electron | Desktop application shell and process management |
| Pear runtime | Pear integration and supported peer-to-peer application lifecycle features |
| Autopass | Backend notes and key-value data operations |
| IPC and application bridge | Communication between desktop processes and the worker |
| Node.js and npm | JavaScript runtime and dependency management |
| Electron Forge | Desktop development and packaging workflow, as configured in the project |

The exact dependency versions, runtime configuration, and available commands are defined by `package.json` and the corresponding configuration files.

## Architecture

PeerVault separates the React interface from desktop integration and backend operations.

```text
┌─────────────────────────────────────────────┐
│             PeerVault Desktop               │
│                                             │
│              Electron Shell                 │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │          React + TypeScript           │  │
│  │                                       │  │
│  │ Dashboard · Sidebar · Entry Editor    │  │
│  │ Search · Themes · Toasts · Dialogs    │  │
│  └───────────────────┬───────────────────┘  │
│                      │                      │
│              Application Bridge             │
│                      │                      │
│  ┌───────────────────▼───────────────────┐  │
│  │        Electron Main / Preload        │  │
│  │          IPC and Lifecycle            │  │
│  └───────────────────┬───────────────────┘  │
│                      │                      │
│                 Worker IPC                  │
│                      │                      │
│  ┌───────────────────▼───────────────────┐  │
│  │            Backend Worker             │  │
│  │                                       │  │
│  │          Autopass Integration         │  │
│  │       Entry and Storage Operations    │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

The diagram represents the intended architectural responsibilities. The exact communication path depends on the implementation of the Electron main process, preload bridge, and worker.

### Frontend

The frontend is built with React and TypeScript and is located in `desktop-ui/src/`.

Its responsibilities include:

- Rendering the dashboard and navigation.
- Displaying and searching entries.
- Creating and editing entries.
- Providing rich-text editing controls.
- Managing UI state through React hooks.
- Displaying notifications and confirmation dialogs.
- Supporting light and dark themes.

The frontend uses the service layer to communicate with the application bridge instead of directly managing backend storage.

### Components and state management

The `components/` directory contains the main interface components:

- `Dashboard.tsx` — Dashboard view.
- `Sidebar.tsx` — Application navigation.
- `EntryEditor.tsx` — Entry creation and editing.
- `DeleteDialog.tsx` — Delete confirmation.
- `Toast.tsx` — User-facing notifications.

The `hooks/` directory contains custom React hooks, including `useEntries.ts`, which manages entry-related state and operations.

### Service layer and data types

The `services/autopass-service.ts` module provides the frontend-facing service for Autopass-related operations.

The `types/entry.ts` module defines the TypeScript entry model. Keeping entry types and service contracts explicit helps maintain consistency between UI components and backend communication.

### Electron integration

The `desktop-ui/electron/` directory contains desktop integration code.

- `main.js` — Electron main-process responsibilities, such as application lifecycle and IPC coordination.
- `preload.js` — The controlled API exposed to the renderer.

The preload bridge should expose only the methods required by the frontend. Privileged Node.js operations should remain outside the renderer.

### Backend worker and Autopass

The `desktop-ui/workers/` directory contains the backend worker implementation.

The worker is responsible for initializing and communicating with Autopass, processing supported entry operations, and returning results through the configured messaging mechanism.

The precise behavior depends on the installed Autopass version and the project's implementation. In particular, editing an entry must use the update or replacement strategy actually supported by the worker; a dedicated `update()` method should not be assumed.

## Project structure

```text
pear-autopass-desktop/
├── desktop-ui/
│   ├── electron/
│   │   ├── main.js
│   │   └── preload.js
│   │
│   ├── packaging/
│   │   └── ...
│   │
│   ├── workers/
│   │   └── ...
│   │
│   ├── app.js
│   ├── index.html
│   │
│   └── src/
│       ├── assets/
│       │   ├── css/
│       │   ├── fonts/
│       │   ├── images/
│       │   └── js/
│       │
│       ├── components/
│       │   ├── Dashboard.tsx
│       │   ├── DeleteDialog.tsx
│       │   ├── EntryEditor.tsx
│       │   ├── Sidebar.tsx
│       │   └── Toast.tsx
│       │
│       ├── hooks/
│       │   └── useEntries.ts
│       │
│       ├── services/
│       │   └── autopass-service.ts
│       │
│       ├── types/
│       │   └── entry.ts
│       │
│       ├── App.tsx
│       └── Main.tsx
│
├── forge.config.js
├── package.json
├── pear.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### Directory responsibilities

| Path | Responsibility |
|---|---|
| `desktop-ui/app.js` | JavaScript application bootstrap or runtime entry point, depending on its implementation |
| `desktop-ui/index.html` | HTML document used to load the frontend |
| `desktop-ui/src/App.tsx` | Root React application component |
| `desktop-ui/src/Main.tsx` | Frontend bootstrap or main application module |
| `desktop-ui/src/components/` | Reusable React UI components |
| `desktop-ui/src/hooks/` | Custom React hooks |
| `desktop-ui/src/services/` | Frontend service and backend communication logic |
| `desktop-ui/src/types/` | Shared TypeScript models and contracts |
| `desktop-ui/src/assets/` | CSS, fonts, images, and static resources |
| `desktop-ui/electron/` | Electron main process and preload integration |
| `desktop-ui/workers/` | Backend worker and Autopass integration |
| `desktop-ui/packaging/` | Platform-specific packaging files and resources |
| `forge.config.js` | Electron Forge configuration |
| `package.json` | Dependencies, scripts, and application metadata |
| `pear.json` | Pear configuration |
| `tsconfig.json` | TypeScript compiler settings |
| `vite.config.ts` | Vite development and build configuration |

**Note:** The directory tree reflects the structure supplied for this project. Packaging files and worker filenames are represented with `...` where their exact names have not been specified.

## Requirements

- [Node.js](https://nodejs.org/) compatible with the installed project dependencies.
- npm.
- Project dependencies defined in `package.json`.
- Pear CLI for Pear-specific CLI operations and the configured Pear workflow.
- The platform-specific tooling required by Electron Forge if packaging the application.

## Getting started

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd pear-autopass-desktop
```

Replace `<your-repository-url>` with the actual repository URL.

### 2. Install project dependencies

```bash
npm install
```

This installs the dependencies defined in `package.json`, including the project's configured React, TypeScript, Vite, Electron, and Autopass-related packages.

### 3. Install Pear

Follow the official [Pear CLI installation documentation](https://docs.pears.com/pear/reference/pear/cli/).

For Windows PowerShell, the installer command documented by Pear is:

```powershell
irm https://install.pears.com/pear.ps1 | iex
```

For macOS and Linux, follow the platform-specific instructions in the official documentation.

Verify the installation:

```bash
pear --version
```

If the command is not recognized, follow the installation instructions to configure your `PATH`, then open a new terminal.

### 4. Configure Pear

Review `pear.json` and the relevant configuration in `package.json` to understand how the project initializes the Pear runtime and configures its upgrade link.

If a new Pear application link is required, follow the official [Starting a Pear desktop project](https://docs.pears.com/guide/starting-a-pear-desktop-project) guide and the instructions for the installed Pear version.

Do not replace an existing working upgrade link without understanding how the application uses it.

### 5. Run the application

## Running the Application Locally

The application requires the Vite development server and the Pear/Electron desktop application to run in separate terminals.

### 1. Start the Vite Development Server

Open a terminal in the project root and run:

```powershell
npx vite --config vite.config.ts
```

Keep this terminal running. Vite will display the local development server address, for example:

```text
http://localhost:5173
```

### 2. Start the Desktop Application

Open a **second terminal** in the project root. Set `PEAR_DEV_SERVER_URL` to the local address displayed by Vite, then start the application:

```powershell
$env:PEAR_DEV_SERVER_URL="http://localhost:5173"
npm start
```

Replace `http://localhost:5173` with the actual Vite development server address if it differs.

Keep both terminals running while developing. Start Vite first, then launch the desktop application with `npm start`.


The command must match the `scripts.start` entry in `package.json`. If the project uses another script for development, run that script instead.

Vite and Electron must be configured to work together correctly: Vite serves or builds the React frontend, while Electron loads the appropriate development URL or built HTML entry point.

## Using PeerVault

1. Start the desktop application.
2. Wait for the backend worker and Autopass initialization to complete.
3. Create an entry with a title and content.
4. Open an existing entry to view or edit it.
5. Search entries by title or content.
6. Rename a title or update content when supported by the configured save workflow.
7. Confirm before deleting an entry.
8. Switch between light and dark themes.

The available functionality depends on the current frontend implementation and the backend operations supported by Autopass.

## Development guidelines

### Error handling

The application should handle:

- Worker startup and readiness failures.
- Invalid or empty entry titles and content.
- Duplicate keys, if keys must be unique.
- Failed entry creation, updates, and deletion.
- Unexpected or malformed worker responses.
- Canceled operations and dialog state transitions.

Display understandable error messages without exposing sensitive implementation details.

### Data consistency

Autopass should remain the source of truth for persisted entries.

After successful operations, update the UI using the operation result or supported entry-update notifications. Keep loading, success, and failure states accurate so the interface does not report a change as saved when the backend rejected it.

### Rich-text content and security

- Sanitize rich-text HTML before rendering or storing it.
- Allow only the HTML elements and attributes needed by the editor.
- Never render untrusted HTML without sanitization.
- Validate input in the backend worker as well as the frontend.
- Keep privileged operations outside the renderer.
- Expose only necessary methods through the preload bridge.
- Avoid committing credentials, signing keys, or other secrets.

### TypeScript and maintainability

- Define explicit types for entry data and service results.
- Keep frontend and bridge contracts synchronized.
- Use reusable React components and hooks.
- Keep UI rendering separate from persistence and IPC logic.
- Avoid duplicating business logic across components.
- Handle asynchronous operations and errors consistently.

### Testing checklist

Before submitting changes, verify:

- [ ] The application starts successfully.
- [ ] The React frontend loads in Electron.
- [ ] The worker initializes and reports readiness.
- [ ] Entries can be created and listed.
- [ ] Existing entries can be opened and edited according to the implemented persistence workflow.
- [ ] Entry titles can be renamed when supported.
- [ ] Deletion requires confirmation.
- [ ] Search filters entries correctly.
- [ ] Light and dark themes work.
- [ ] Rich-text content is sanitized.
- [ ] Backend failures produce useful feedback.
- [ ] UI state remains consistent after successful and failed operations.
- [ ] The renderer cannot access unnecessary privileged APIs.
- [ ] The configured packaging workflow completes successfully.

## Pear app sharing and distribution

Pear supports peer-to-peer application distribution and update workflows. Sharing source code through Git is different from publishing and sharing a Pear application.

Before distributing PeerVault:

1. Verify the Pear configuration and upgrade link.
2. Test the application using the supported development workflow.
3. Follow the build and release instructions for the installed Pear CLI version.
4. Verify any signing, staging, or seeding requirements that apply to the release.
5. Share the generated application link according to the official distribution workflow.

Refer to:

- [Starting a Pear desktop project](https://docs.pears.com/guide/starting-a-pear-desktop-project)
- [Sharing a Pear app](https://docs.pears.com/guide/sharing-a-pear-app)
- [Pear documentation](https://docs.pears.com/)

Do not assume that starting the application locally publishes it or makes it available to other peers.

## Assessment context

PeerVault was developed as a desktop application engineering assessment aligned with the frontend, desktop integration, and peer-to-peer technology responsibilities of desktop applications.

The project demonstrates:

- React and TypeScript application development.
- Component-based frontend architecture.
- Desktop integration with Electron.
- Frontend service and custom-hook organization.
- Communication between the UI and backend worker.
- Autopass integration and entry lifecycle management.
- Rich-text editing, validation, and user feedback.
- Separation of frontend, desktop integration, worker logic, and packaging configuration.

## Acknowledgements

- [Autopass](https://github.com/holepunchto/autopass)
- [Pear documentation](https://docs.pears.com/)
- [Starting a Pear desktop project](https://docs.pears.com/guide/starting-a-pear-desktop-project)
- [Sharing a Pear app](https://docs.pears.com/guide/sharing-a-pear-app)
- [Electron](https://www.electronjs.org/)
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/)