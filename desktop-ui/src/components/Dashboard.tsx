
import type { Entry } from "../types/entry";
import type { ViewName } from "./Sidebar";

interface DashboardProps {
  entries: Entry[];
  totalEntries: number;
  loading: boolean;
  search: string;
  activeView: ViewName;
  onAdd: () => void;
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
  onRefresh: () => void;
  onViewAll: () => void;
}

function getPlainText(value: string): string {
  if (typeof document === "undefined") {
    return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  const element = document.createElement("div");
  element.innerHTML = value;

  return (element.textContent || element.innerText || "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatPreview(value: string): string {
  const text = getPlainText(value);

  if (text.length <= 160) {
    return text;
  }

  return `${text.slice(0, 157)}...`;
}

export default function Dashboard({
  entries,
  totalEntries,
  loading,
  search,
  activeView,
  onAdd,
  onEdit,
  onDelete,
  onRefresh,
  onViewAll,
}: DashboardProps) {
  const isNotesView = activeView === "notes";
  const normalizedSearch = search.trim();

  return (
    <div className="dashboard">
      {/* Page heading */}
      <section className="page-heading">
        <div>
          <p className="eyebrow">YOUR PRIVATE WORKSPACE</p>

          <h1>
            {isNotesView ? "Your notes" : "Welcome to PeerVault"}
          </h1>

          <p className="page-description">
            {isNotesView
              ? "Manage the entries in your private vault."
              : "A calm, private space for your peer-to-peer vault."}
          </p>
        </div>

        <div className="page-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? (
              "Refreshing…"
            ) : (
              <>
                <span aria-hidden="true">↻</span>
                Refresh
              </>
            )}
          </button>

          <button
            className="primary-button"
            type="button"
            onClick={onAdd}
          >
            <span aria-hidden="true">＋</span>
            New entry
          </button>
        </div>
      </section>

      {/* Vault statistics */}
      <section className="stats-grid" aria-label="Vault summary">
        <article className="stat-card">
          <div className="stat-icon stat-icon-notes" aria-hidden="true">
            ▤
          </div>

          <div className="stat-copy">
            <p>Total entries</p>
            <strong>{totalEntries}</strong>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-icon stat-icon-files" aria-hidden="true">
            ▧
          </div>

          <div className="stat-copy">
            <p>Files</p>
            <strong>—</strong>
          </div>
        </article>

        <article className="stat-card">
          <div
            className="stat-icon stat-icon-contacts"
            aria-hidden="true"
          >
            ♧
          </div>

          <div className="stat-copy">
            <p>Contacts</p>
            <strong>—</strong>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-icon stat-icon-shares" aria-hidden="true">
            ⇄
          </div>

          <div className="stat-copy">
            <p>Shares</p>
            <strong>—</strong>
          </div>
        </article>
      </section>

      {/* Entries */}
      <section className="entries-section">
        <div className="section-heading">
          <div>
            <h2>{isNotesView ? "All notes" : "Recent entries"}</h2>

            <p>
              {normalizedSearch
                ? `Results matching “${normalizedSearch}”`
                : "Your latest saved entries"}
            </p>
          </div>

          {!isNotesView && totalEntries > 0 && (
            <button
              className="text-button"
              type="button"
              onClick={onViewAll}
            >
              View all
              <span aria-hidden="true">→</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="entries-message" role="status">
            <span
              className="loading-spinner"
              aria-hidden="true"
            />
            <p>Loading your entries…</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">
              {normalizedSearch ? "⌕" : "▤"}
            </div>

            <h3>
              {normalizedSearch
                ? "No matching entries"
                : "Your vault is ready"}
            </h3>

            <p>
              {normalizedSearch
                ? "Try another search term."
                : "Create your first entry to get started."}
            </p>

            {!normalizedSearch && (
              <button
                className="primary-button"
                type="button"
                onClick={onAdd}
              >
                <span aria-hidden="true">＋</span>
                Create your first entry
              </button>
            )}
          </div>
        ) : (
          <div className="entries-list" id="entries-list">
            {entries.map((entry) => (
              <article className="entry-card" key={entry.key}>
                <button
                  className="entry-main"
                  type="button"
                  onClick={() => onEdit(entry)}
                  aria-label={`Edit ${entry.key}`}
                >
                  <span className="entry-icon" aria-hidden="true">
                    ▤
                  </span>

                  <span className="entry-copy">
                    <strong className="entry-title">
                      {entry.key}
                    </strong>

                    <span className="entry-preview">
                      {formatPreview(entry.value) || "No content"}
                    </span>
                  </span>
                </button>

                <div className="entry-actions">
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`Edit ${entry.key}`}
                    title="Edit entry"
                    onClick={() => onEdit(entry)}
                  >
                    <span aria-hidden="true">✎</span>
                  </button>

                  <button
                    className="icon-button danger"
                    type="button"
                    aria-label={`Delete ${entry.key}`}
                    title="Delete entry"
                    onClick={() => onDelete(entry)}
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      {/* <footer className="dashboard-footer">
        <span>
          {totalEntries} {totalEntries === 1 ? "entry" : "entries"} in
          your vault
        </span>

        <span>
          Your data stays in your peer-to-peer workspace.
        </span>
      </footer> */}
    </div>
  );
}
