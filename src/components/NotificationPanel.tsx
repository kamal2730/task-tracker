import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store";
import {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "../features/notifications/notificationsSlice";
import type { Notification } from "../types";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationPanel({ onClose }: { onClose: () => void }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { notifications, loading, page, pages, total } = useAppSelector((s) => s.notifications);

  useEffect(() => {
    dispatch(fetchNotifications(1));
  }, [dispatch]);

  const handleClick = (notif: Notification) => {
    if (!notif.is_read) dispatch(markAsRead(notif.id));
    if (notif.task_id) {
      navigate(`/tasks/${notif.task_id}`);
    }
    onClose();
  };

  return (
    <div className="notification-panel">
      <div className="notification-panel-header">
        <span className="notification-panel-title">Notifications</span>
        {total > 0 && (
          <button
            className="notification-mark-all"
            onClick={() => dispatch(markAllAsRead())}
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="notification-list">
        {notifications.length === 0 && !loading && (
          <div className="notification-empty">No notifications yet.</div>
        )}
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`notification-item ${n.is_read ? "" : "unread"}`}
            onClick={() => handleClick(n)}
          >
            <div className="notification-dot-wrapper">
              {!n.is_read && <span className="notification-dot" />}
            </div>
            <div className="notification-content">
              <div className="notification-title">{n.title}</div>
              <div className="notification-message">{n.message}</div>
              <div className="notification-time">{timeAgo(n.createdAt)}</div>
            </div>
            <button
              className="notification-delete"
              onClick={(e) => { e.stopPropagation(); dispatch(deleteNotification(n.id)); }}
              aria-label="Delete notification"
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      {pages > 1 && page < pages && (
        <div className="notification-load-more">
          <button
            className="notification-load-more-btn"
            onClick={() => dispatch(fetchNotifications(page + 1))}
            disabled={loading}
          >
            {loading ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
