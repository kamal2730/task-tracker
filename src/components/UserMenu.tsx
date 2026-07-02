import { useState, useRef, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../store";
import { logout } from "../features/auth/authSlice";

export default function UserMenu() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!user) return null;

  const initial = user.name.charAt(0).toUpperCase();

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="user-menu-trigger"
        onClick={() => setOpen(!open)}
      >
        <span className="user-avatar">{initial}</span>
        <span className="user-name">{user.name}</span>
      </button>

      {open && (
        <div className="user-dropdown">
          <div className="user-dropdown-info">
            <p className="user-dropdown-name">{user.name}</p>
            <p className="user-dropdown-email">{user.email}</p>
          </div>
          <div className="user-dropdown-divider" />
          <button
            type="button"
            className="user-dropdown-logout"
            onClick={() => { dispatch(logout()); setOpen(false); }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
