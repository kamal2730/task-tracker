import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../store";
import { fetchUnreadCount, togglePanel } from "../features/notifications/notificationsSlice";
import NotificationPanel from "./NotificationPanel";

export default function NotificationBell() {
  const dispatch = useAppDispatch();
  const { panelOpen, unreadCount } = useAppSelector((s) => s.notifications);
  const user = useAppSelector((s) => s.auth.user);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    dispatch(fetchUnreadCount());
    const interval = setInterval(() => dispatch(fetchUnreadCount()), 30000);
    return () => clearInterval(interval);
  }, [user, dispatch]);

  useEffect(() => {
    if (!user) return;
    const onFocus = () => dispatch(fetchUnreadCount());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user, dispatch]);

  useEffect(() => {
    if (!panelOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        dispatch(togglePanel());
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [panelOpen, dispatch]);

  return (
    <div className="notification-bell-wrapper" ref={bellRef}>
      <button
        className="notification-bell"
        onClick={() => dispatch(togglePanel())}
        aria-label="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && <span className="notification-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>
      {panelOpen && <NotificationPanel onClose={() => dispatch(togglePanel())} />}
    </div>
  );
}
