
import type { ReactNode } from 'react';

export type ViewName =
  | 'dashboard'
  | 'notes'
  | 'files'
  | 'contacts'
  | 'shares'

interface SidebarProps {
  activeView: ViewName;
  onNavigate: (view: ViewName) => void;
  entryCount: number;
  onFilesClick?: () => void;
}

interface NavigationItem {
  id: ViewName;
  label: string;
  icon: ReactNode;
}

const navigationItems: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '◈' },
  { id: 'notes', label: 'Notes', icon: '▤' },
  { id: 'files', label: 'Files', icon: '▧' },
  { id: 'contacts', label: 'Contacts', icon: '♧' },
  { id: 'shares', label: 'Shared with me', icon: '⇄' },
];

export default function Sidebar({
  activeView,
  onNavigate,
  entryCount,
  onFilesClick,
}: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="Main navigation">
      <nav className="nav-list">
        {navigationItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item${activeView === item.id ? ' active' : ''}`}
            type="button"
            data-view={item.id}
            aria-current={activeView === item.id ? 'page' : undefined}
            onClick={() => {
  onNavigate(item.id);

  if (item.id === "files") {
    onFilesClick?.();
  }
}}
          >
            <span className="nav-icon" aria-hidden="true">
              {item.icon}
            </span>

            <span className="nav-label">{item.label}</span>

            {item.id === 'notes' && entryCount > 0 && (
              <span className="nav-count">{entryCount}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-spacer" />

      

      <div className="sidebar-footer">
        <div className="connection-status">
          <span
            className="connection-dot"
            aria-hidden="true"
          />
          <span>Peer connection</span>
        </div>

        {/* <p className="sidebar-entry-count">
          {entryCount} {entryCount === 1 ? 'entry' : 'entries'} in your vault
        </p> */}
      </div>
    </aside>
  );
}
