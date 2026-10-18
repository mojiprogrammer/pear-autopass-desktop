# PeerVault — Pear AutoPass Desktop

A desktop application for managing private notes and key-value entries using [Autopass](https://github.com/holepunchto/autopass), built on the Pear/Electron desktop runtime stack.

PeerVault was developed as a desktop application assessment focused on frontend engineering, desktop integration, and peer-to-peer technology. It combines a custom dashboard with entry management, a rich-text editing experience, and integration with an Autopass backend worker.

## Features

- **Entry management** — Create, view, edit, and delete entries.
- **Rich-text editor** — Format content with bold, italic, underline, headings, and ordered or unordered lists.
- **Search** — Filter entries by their title or content.
- **Light and dark themes** — Switch between visual themes.
- **Interactive feedback** — Display notifications for successful operations, validation errors, and failures.
- **Delete confirmation** — Confirm destructive actions before removing entries.
- **Autopass integration** — Communicate with the backend worker for entry operations.
- **Desktop experience** — A custom dashboard designed for a desktop application.

> PeerVault is an assessment project built on Pear/Electron and Autopass. Features such as end-to-end encrypted messaging, file sharing, multi-device synchronization, and production deployment should not be assumed unless implemented separately.

## Technology Stack

| Technology | Purpose |
|---|---|
| HTML, CSS, JavaScript | Dashboard and user interface |
| Electron | Desktop application shell |
| Pear runtime | Embedded runtime and worker integration |
| Autopass | Backend entry management |
| IPC | Communication between the application and its worker |

## Architecture

PeerVault separates the user interface from the backend operations handled by the Autopass worker.

```text
┌─────────────────────────────────────┐
│          PeerVault Desktop          │
│                                     │
│  Dashboard · Search · Entry Editor  │
│  Themes · Notifications · Dialogs   │
└──────────────────┬──────────────────┘
                   │
            Application Bridge
                   │
┌──────────────────▼──────────────────┐
│          Pear Runtime Worker        │
│                                     │
│       Autopass API Operations       │
│      List · Add · Get · Remove      │
│                                     │
└─────────────────────────────────────┘
```

### Frontend

The frontend manages the dashboard, entry list, editor, validation, theme preferences, and user feedback. It communicates with the backend through the application's bridge rather than directly managing Autopass storage.

### Backend worker

The worker handles Autopass operations and communicates with the desktop application through the runtime's messaging mechanism.

The frontend bridge exposes the application-facing operations, including:

- `ready()` — Wait for the backend to become ready.
- `list()` — Retrieve available entries.
- `get(key)` — Retrieve an entry by key.
- `add(key, value)` — Add an entry.
- `remove(key)` — Remove an entry.
- `onEntriesUpdated(callback)` — Subscribe to entry updates, where supported by the bridge.

The precise behavior of each operation depends on the worker and bridge implementation. In particular, editing an existing entry must follow the actual update semantics supported by the installed Autopass version.

## Project Structure

The following illustrates the main application areas; adapt the paths to match the final repository.

pear-autopass-desktop/
├── assets/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── home.js
│   └── images/
├── desktop-ui/
│   ├── index.html
│   └── app.js
├── src/
│   ├── electron/
│   │   ├── main.js
│   │   └── preload.js
│   └── workers/
│       └── autopass-service.js
├── package.json
├── pear.json
├── forge.config.js
└── README.md

**Note:** Keep the actual directory names and configuration files from the working project. Remove any paths above that do not exist in the final repository.

## Requirements

- [Node.js](https://nodejs.org/)
- npm
- The dependencies specified in `package.json`
- The Pear CLI/runtime requirements for the configured application workflow

## Getting Started

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd pear-autopass-desktop
```

Replace `<your-repository-url>` with the actual repository URL.

### 2. Install dependencies

```bash
npm install
```

If the project uses a repository-specific installation script or workspace setup, follow the instructions defined in `package.json` instead.

### 3. Start the application

```bash
npm start
```

The start command should match the script defined in the project's `package.json`. For the Electron Forge configuration that uses `electron-forge start -- --no-updates`, this starts the application in development mode with automatic updates disabled.

### 4. Use PeerVault

1. Launch the application.
2. Wait for the backend to become ready.
3. Create a new entry and provide its key and content.
4. View, search, or edit existing entries.
5. Delete entries after confirming the action.
6. Switch between light and dark themes as desired.

The available functionality depends on the current implementation and the state of the Autopass backend.

## Development Notes

### Error handling

The application should handle backend readiness failures, invalid input, duplicate keys, failed saves, and failed deletions with clear feedback to the user.

### Data handling

Entry operations should use the Autopass integration rather than an unrelated in-memory collection as the source of truth. The frontend should refresh or consume update events after successful changes.

### Security

- Validate entry keys and content before submitting operations.
- Sanitize rich-text HTML before storing or rendering it.
- Avoid rendering untrusted entry content directly as unsanitized HTML.
- Keep privileged operations out of the renderer and expose only the necessary methods through the application bridge.
- Do not commit credentials, signing keys, or other secrets to the repository.

### Testing

Before submitting changes, verify the core application flows:

- The application starts and the backend becomes ready.
- Entries can be created and listed.
- Existing entries can be edited according to the supported Autopass semantics.
- Deletion requires confirmation.
- Invalid input and backend failures produce appropriate feedback.
- Search and theme switching work correctly.
- Entry updates are reflected in the interface when update notifications are supported.

## Assessment Context

PeerVault was built as a desktop application engineering assessment aligned with the technologies and responsibilities associated with Keet Desktop.

The project demonstrates work on:

- Desktop UI design and interaction.
- Integration between a frontend and a backend worker.
- Autopass API integration.
- Entry lifecycle management.
- Input validation and user feedback.
- Maintainable application structure.

## Acknowledgements

- [Autopass](https://github.com/holepunchto/autopass)
- [Pear documentation](https://docs.pears.com/)
- [Electron](https://www.electronjs.org/)

