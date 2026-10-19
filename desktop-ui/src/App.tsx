
import { useCallback, useEffect, useMemo, useState } from 'react';

import Sidebar, { type ViewName } from './components/Sidebar';
import Dashboard from './components/Dashboard';
import EntryEditor from './components/EntryEditor';
import DeleteDialog from './components/DeleteDialog';
import Toast, { type ToastMessage } from './components/Toast';

import { useEntries } from './hooks/useEntries';
import type { Entry } from './types/entry';
import logoUrl from './assets/images/logo.svg';

const THEME_STORAGE_KEY = 'peervault-theme';
const DEFAULT_THEME = 'dark';

type Theme = 'dark' | 'light';

function getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

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

    const [activeView, setActiveView] = useState<ViewName>('dashboard');
    const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

    const [editorOpen, setEditorOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

    const [deleteTarget, setDeleteTarget] = useState<Entry | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [toast, setToast] = useState<ToastMessage | null>(null);
    const [search, setSearch] = useState('');

    const showToast = useCallback(
        (message: string, type: ToastMessage['type'] = 'info') => {
            setToast({
                id: Date.now(),
                message,
                type,
            });
        },
        [],
    );

    // Restore the saved theme.
    useEffect(() => {
        try {
            const savedTheme = sessionStorage.getItem(THEME_STORAGE_KEY);

            if (savedTheme === 'light' || savedTheme === 'dark') {
                setTheme(savedTheme);
            }
        } catch {
            // Keep the default theme if session storage is unavailable.
        }
    }, []);

    // Apply and persist the current theme.
    useEffect(() => {
        document.documentElement.dataset.theme = theme;

        try {
            sessionStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch {
            // The theme still applies to the current session.
        }

        const themeColor = theme === 'dark' ? '#111318' : '#f5f7f8';

        document
            .querySelector('meta[name="theme-color"]')
            ?.setAttribute('content', themeColor);
    }, [theme]);

    // Surface initialization and refresh errors from the entries hook.
    useEffect(() => {
        if (!error) {
            return;
        }

        console.error('[PeerVault] Entry service error:', error);
        showToast(error, 'error');
    }, [error, showToast]);

    // Entry editor.
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
                    showToast('Entry updated successfully.', 'success');
                } else {
                    await add(key, value);
                    showToast('Entry created successfully.', 'success');
                }

                closeEditor();
            } catch (saveError: unknown) {
                console.error('[PeerVault] Save failed:', saveError);

                // EntryEditor displays the error and keeps the dialog open.
                throw saveError;
            }
        },
        [editingEntry, update, add, closeEditor, showToast],
    );

    // Delete entries.
    const handleDeleteEntry = useCallback(
        async (entry: Entry): Promise<void> => {
            try {
                await remove(entry.key);
                showToast('Entry deleted successfully.', 'success');
            } catch (deleteError: unknown) {
                console.error('[PeerVault] Delete failed:', deleteError);

                // DeleteDialog displays the error and allows the user to retry.
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
            // DeleteDialog handles the error message.
        } finally {
            setDeleting(false);
        }
    }, [deleteTarget, deleting, handleDeleteEntry]);

    // Theme toggle.
    const toggleTheme = useCallback(() => {
        setTheme((currentTheme) =>
            currentTheme === 'dark' ? 'light' : 'dark',
        );
    }, []);

    // Refresh entries.
    const handleRefresh = useCallback(() => {
        void refresh().catch((refreshError: unknown) => {
            console.error('[PeerVault] Refresh failed:', refreshError);

            // The hook records the error for the global notification effect.
        });
    }, [refresh]);

    // Filter entries by title or content.
    const filteredEntries = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) {
            return entries;
        }

        return entries.filter((entry) =>
            entry.key.toLowerCase().includes(query) ||
            entry.value.toLowerCase().includes(query),
        );
    }, [entries, search]);

    const displayedEntries = useMemo(
        () =>
            activeView === 'dashboard'
                ? filteredEntries.slice(0, 5)
                : filteredEntries,
        [activeView, filteredEntries],
    );

    // Navigation.
    const handleNavigate = useCallback(
        (view: ViewName) => {
            const unavailableViews: Partial<Record<ViewName, string>> = {
                files: 'Files feature is coming soon.',
                contacts: 'Contacts feature is coming soon.',
                shares: 'Shared with me feature is coming soon.',
            };

            const message = unavailableViews[view];

            if (message) {
                showToast(message, 'info');
                return;
            }

            setActiveView(view);
        },
        [showToast],
    );

    const handleViewAll = useCallback(() => {
        setActiveView('notes');
    }, []);

    const handleReturnToDashboard = useCallback(() => {
        setActiveView('dashboard');
    }, []);

    const handleDismissToast = useCallback(() => {
        setToast(null);
    }, []);

    const handleCancelDelete = useCallback(() => {
        if (!deleting) {
            setDeleteTarget(null);
        }
    }, [deleting]);

    return (
        <div className="app-shell">
            <header className="topbar">
                <div className="topbar-left">
                    <a
                        className="topbar-brand"
                        href="#dashboard"
                        onClick={(event) => {
                            event.preventDefault();
                            handleReturnToDashboard();
                        }}
                        aria-label="Pear AutoPass home"
                    >
                        <img
                            className="brand-mark"
                            src={logoUrl}
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
                        <span className="visually-hidden">
                            Search entries
                        </span>

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
                            theme === 'dark' ? 'light' : 'dark'
                        } theme`}
                        aria-pressed={theme === 'light'}
                        title={`Switch to ${
                            theme === 'dark' ? 'light' : 'dark'
                        } theme`}
                    >
                        <span aria-hidden="true">
                            {theme === 'dark' ? '☀' : '☾'}
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
                    {activeView === 'dashboard' || activeView === 'notes' ? (
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
                            onViewAll={handleViewAll}
                        />
                    ) : (
                        <section className="placeholder-view">
                            <p className="eyebrow">YOUR PRIVATE WORKSPACE</p>

                            <h1>
                                {activeView.charAt(0).toUpperCase() +
                                    activeView.slice(1)}
                            </h1>

                            <p>This section is not implemented yet.</p>

                            <button
                                className="primary-button"
                                type="button"
                                onClick={handleReturnToDashboard}
                            >
                                Back to dashboard
                            </button>
                        </section>
                    )}
                </main>
            </div>

            <EntryEditor
                open={editorOpen}
                entry={editingEntry}
                onClose={closeEditor}
                onSave={handleSaveEntry}
            />

            <DeleteDialog
                open={deleteTarget !== null}
                entryTitle={deleteTarget?.key ?? ''}
                onCancel={handleCancelDelete}
                onConfirm={handleConfirmDelete}
            />

            <Toast
                toast={toast}
                onDismiss={handleDismissToast}
            />
        </div>
    );
}
