
import { useCallback, useEffect, useMemo, useState } from "react";

import Sidebar, { type ViewName } from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import EntryEditor from "./components/EntryEditor";
import DeleteDialog from "./components/DeleteDialog";
import Toast, { type ToastMessage } from "./components/Toast";

import { useEntries } from "./hooks/useEntries";
import type { Entry } from "./types/entry";

export default function App() {
  const {
    entries,
    loading,
    error,
    add,
    update,
    remove,
    refresh,
  } = useEntries();

  const [activeView, setActiveView] = useState<ViewName>("dashboard");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Entry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [search, setSearch] = useState("");

  // ---------------------------------------------------------
  // Toast notifications
  // ---------------------------------------------------------

  const showToast = useCallback(
    (message: string, type: ToastMessage["type"] = "info") => {
      setToast({
        id: Date.now(),
        message,
        type,
      });
    },
    [],
  );

  // ---------------------------------------------------------
  // Restore the saved theme
  // ---------------------------------------------------------

  useEffect(() => {
    try {
      const savedTheme = sessionStorage.getItem("peervault-theme");

      if (savedTheme === "light" || savedTheme === "dark") {
        setTheme(savedTheme);
      }
    } catch {
      // Use the default theme when session storage is unavailable.
    }
  }, []);

  // ---------------------------------------------------------
  // Apply the theme
  // ---------------------------------------------------------

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    try {
      sessionStorage.setItem("peervault-theme", theme);
    } catch {
      // The theme remains applied for the current session.
    }

    const themeColor =
      theme === "dark" ? "#111318" : "#f5f7f8";

    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", themeColor);
  }, [theme]);

  // ---------------------------------------------------------
  // Report errors from useEntries
  // ---------------------------------------------------------

  useEffect(() => {
    if (error) {
      console.error("[PeerVault] Entry service error:", error);
      showToast(error, "error");
    }
  }, [error, showToast]);

  // ---------------------------------------------------------
  // Entry editor
  // ---------------------------------------------------------

  const openNewEntry = useCallback(() => {
    setEditingEntry(null);
    setEditorOpen(true);
  }, []);

  const openEditEntry = useCallback((entry: Entry) => {
    setEditingEntry(entry);
    setEditorOpen(true);
  }, []);

  const closeEditor = useCallback(() => {
    setEditorOpen(false);
    setEditingEntry(null);
  }, []);

  const handleSaveEntry = useCallback(
    async (key: string, value: string): Promise<void> => {
      try {
        if (editingEntry) {
          await update(editingEntry.key, value);
          showToast("Entry updated successfully.", "success");
        } else {
          await add(key, value);
          showToast("Entry created successfully.", "success");
        }

        closeEditor();
      } catch (saveError) {
        const message =
          saveError instanceof Error
            ? saveError.message
            : "Failed to save the entry.";

        console.error("[PeerVault] Save failed:", saveError);
        showToast(message, "error");

        // Keep the editor open so the user can retry.
        throw saveError;
      }
    },
    [editingEntry, update, add, closeEditor, showToast],
  );

  // ---------------------------------------------------------
  // Delete entries
  // ---------------------------------------------------------

  const handleDeleteEntry = useCallback(
    async (entry: Entry): Promise<void> => {
      try {
        await remove(entry.key);
        showToast("Entry deleted successfully.", "success");
      } catch (deleteError) {
        const message =
          deleteError instanceof Error
            ? deleteError.message
            : "Failed to delete the entry.";

        console.error("[PeerVault] Delete failed:", deleteError);
        showToast(message, "error");

        throw deleteError;
      }
    },
    [remove, showToast],
  );

  const handleConfirmDelete = useCallback(async (): Promise<void> => {
    if (!deleteTarget || deleting) {
      return;
    }

    setDeleting(true);

    try {
      await handleDeleteEntry(deleteTarget);
      setDeleteTarget(null);
    } catch {
      // The error has already been reported by handleDeleteEntry.
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, deleting, handleDeleteEntry]);

  // ---------------------------------------------------------
  // Theme toggle
  // ---------------------------------------------------------

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  // ---------------------------------------------------------
  // Refresh entries
  // ---------------------------------------------------------

  const handleRefresh = useCallback(() => {
    void refresh().catch((refreshError: unknown) => {
      console.error("[PeerVault] Refresh failed:", refreshError);

      // useEntries is expected to record the error for the UI.
    });
  }, [refresh]);

  // ---------------------------------------------------------
  // Search
  // ---------------------------------------------------------

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return entries;
    }

    return entries.filter((entry) => {
      const key = entry.key.toLowerCase();
      const value = entry.value.toLowerCase();

      return key.includes(query) || value.includes(query);
    });
  }, [entries, search]);

  const displayedEntries = useMemo(() => {
    if (activeView === "dashboard") {
      return filteredEntries.slice(0, 5);
    }

    return filteredEntries;
  }, [activeView, filteredEntries]);

  // ---------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------

  const handleNavigate = useCallback(
  (view: ViewName) => {
    if (view === "files") {
      showToast("Files feature is coming soon.", "info");
      return;
    }

    if (view === "contacts") {
      showToast("Contacts feature is coming soon.", "info");
      return;
    }

    if (view === "shares") {
      showToast("Shared with me feature is coming soon.", "info");
      return;
    }

    setActiveView(view);
  },
  [showToast],
);

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-left">
          <a
            className="topbar-brand"
            href="#dashboard"
            onClick={(event) => {
              event.preventDefault();
              setActiveView("dashboard");
            }}
            aria-label="Pear AutoPass home"
          >
            <img
              className="brand-mark"
              src="../src/assets/images/logo.svg"
              alt=""
            />

            <span>
              Pear AutoPass
              <span className="brand-caption">
                Private peer-to-peer workspace
              </span>
            </span>
          </a>
        </div>

        <div className="topbar-right">
          <label className="topbar-search">
            <span aria-hidden="true">⌕</span>

            <span className="visually-hidden">Search entries</span>

            <input
              id="search-input"
              type="search"
              placeholder="Search your vault..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <button
            id="theme-toggle"
            className="topbar-button"
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${
              theme === "dark" ? "light" : "dark"
            } theme`}
            aria-pressed={theme === "light"}
            title={`Switch to ${
              theme === "dark" ? "light" : "dark"
            } theme`}
          >
            <span aria-hidden="true">
              {theme === "dark" ? "☀" : "☾"}
            </span>
          </button>
        </div>
      </header>

      <div className="app-layout">
      <Sidebar
  activeView={activeView}
  onNavigate={handleNavigate}
  entryCount={entries.length}
/>

        <main className="main-content">
          {activeView === "dashboard" || activeView === "notes" ? (
            <Dashboard
              entries={displayedEntries}
              totalEntries={entries.length}
              loading={loading}
              search={search}
              activeView={activeView}
              onAdd={openNewEntry}
              onEdit={openEditEntry}
              onDelete={setDeleteTarget}
              onRefresh={handleRefresh}
              onViewAll={() => setActiveView("notes")}
            />
          ) : (
            <section className="placeholder-view">
              <p className="eyebrow">YOUR PRIVATE WORKSPACE</p>

              <h1>
                {activeView.charAt(0).toUpperCase() +
                  activeView.slice(1)}
              </h1>

              <p>
                This section is not implemented yet.
              </p>

              <button
                className="primary-button"
                type="button"
                onClick={() => setActiveView("dashboard")}
              >
                Back to dashboard
              </button>
            </section>
          )}
        </main>
      </div>

      {/* Create and edit entry dialog */}
      <EntryEditor
        open={editorOpen}
        entry={editingEntry}
        onClose={closeEditor}
        onSave={handleSaveEntry}
      />

      {/* Delete confirmation dialog */}
      <DeleteDialog
        open={deleteTarget !== null}
        entryTitle={deleteTarget?.key ?? ""}
        onCancel={() => {
          if (!deleting) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={handleConfirmDelete}
      />

      {/* Global notifications */}
      <Toast
        toast={toast}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}
