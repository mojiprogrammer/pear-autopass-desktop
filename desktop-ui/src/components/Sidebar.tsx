
export type ViewName =
  | "dashboard"
  | "notes"
  | "files"
  | "contacts"
  | "shares";

interface SidebarProps {
  activeView: ViewName;
  onNavigate: (view: ViewName) => void;
  entryCount: number;
}

interface NavigationItem {
  id: ViewName;
  label: string;
  icon: string;
}

const NAVIGATION_ITEMS: NavigationItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "◈" },
  { id: "notes", label: "Notes", icon: "▤" },
  { id: "files", label: "Files", icon: "▧" },
  { id: "contacts", label: "Contacts", icon: "♧" },
  { id: "shares", label: "Shared with me", icon: "⇄" },
];

export default function Sidebar({
  activeView,
  onNavigate,
  entryCount,
}: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="Main navigation">
      <nav className="nav-list">
        {NAVIGATION_ITEMS.map((item) => {
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              className={`nav-item${isActive ? " active" : ""}`}
              type="button"
              data-view={item.id}
              aria-current={isActive ? "page" : undefined}
              onClick={() => onNavigate(item.id)}
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>

              <span className="nav-label">{item.label}</span>

              {item.id === "notes" && entryCount > 0 && (
                <span className="nav-count">{entryCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-spacer" />

      <div className="sidebar-footer">
        <div className="connection-status">
          <span className="connection-dot" aria-hidden="true" />
          <span>Peer AutoPass is Connected</span>
        </div>
      </div>
    </aside>
  );
}
