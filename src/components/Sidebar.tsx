import { NavLink } from "react-router-dom";
import { useAppSelector } from "../store";

export default function Sidebar() {
  const user = useAppSelector((s) => s.auth.user);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `sidebar-link${isActive ? " active" : ""}`;

  return (
    <nav className="sidebar">
      <div className="sidebar-brand">Task Tracker</div>
      <div className="sidebar-links">
        <NavLink to="/" end className={linkClass}>
          Dashboard
        </NavLink>
        <NavLink to="/tasks" className={linkClass}>
          Tasks
        </NavLink>
        {user?.role === "Admin" && (
          <>
            <NavLink to="/users" className={linkClass}>
              Users
            </NavLink>
            <NavLink to="/teams" className={linkClass}>
              Teams
            </NavLink>
          </>
        )}
      </div>
    </nav>
  );
}
