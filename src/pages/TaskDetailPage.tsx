import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../store";
import { fetchTasks } from "../features/todo/todoSlice";
import { api } from "../services/api";
import { showToast } from "../utils/toast";
import { STATUS_COLORS } from "../utils/constants";
import type { Task, UserWithStats } from "../types";
import CommentSection from "../components/CommentSection";
import ActivityTimeline from "../components/ActivityTimeline";

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const localTask = useAppSelector((s) => s.todos.tasks.find((t) => t.id === id));
  const location = useLocation();

  const [task, setTask] = useState<Task | null>(localTask ?? null);
  const [loading, setLoading] = useState(!localTask);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    api.getTask(id)
      .then(setTask)
      .catch(() => setError("Task not found"))
      .finally(() => setLoading(false));
  }, [id, location.key]);

  useEffect(() => {
    if (user?.role === "Admin" || user?.role === "Manager") {
      api.getUsers().then(setUsers).catch(() => showToast("Failed to load users", "error"));
    }
  }, [user?.role]);

  if (loading) return <div className="loading-spinner">Loading task...</div>;
  if (error || !task) return <div className="error-banner">{error || "Task not found"}</div>;

  const canAssign = user?.role === "Admin" || user?.role === "Manager";
  const noTeam = user?.role === "Manager" && !user.team_id;

  const handleStatusChange = async (status: string) => {
    try {
      const updated = await api.updateTask(task.id, { status: status as Task["status"] });
      setTask(updated);
      dispatch(fetchTasks());
      setLastUpdated(Date.now());
      showToast("Status updated", "success");
    } catch {
      showToast("Failed to update status", "error");
    }
  };

  const handleAssign = async (userId: string) => {
    if (!userId) return;
    setAssigning(true);
    try {
      const updated = await api.assignTask(task.id, userId);
      setTask(updated);
      dispatch(fetchTasks());
      setLastUpdated(Date.now());
      showToast("Task assigned", "success");
    } catch {
      showToast("Failed to assign task", "error");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="task-detail">
      <Link to="/tasks" className="back-link">&larr; Back to tasks</Link>

      <div className="task-detail-card">
        <div className="task-detail-header">
          <h2>{task.title}</h2>
          <span className={`priority-badge priority-${task.priority.toLowerCase()}`}>
            {task.priority}
          </span>
        </div>

        {task.description && <p className="task-detail-desc">{task.description}</p>}

        <div className="task-detail-meta">
          <div className="meta-row">
            <span className="meta-label">Status</span>
            <div className="status-selector">
              {(["Pending", "In Progress", "Done"] as const).map((s) => (
                <button
                  key={s}
                  className={`status-option ${task.status === s ? "active" : ""}`}
                  onClick={() => handleStatusChange(s)}
                >
                  <span className="status-dot" style={{ background: STATUS_COLORS[s] }} />
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="meta-row">
            <span className="meta-label">Due</span>
            <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}</span>
          </div>

          <div className="meta-row">
            <span className="meta-label">Created</span>
            <span>{new Date(task.createdAt).toLocaleDateString()}</span>
          </div>

          <div className="meta-row">
            <span className="meta-label">Assigned to</span>
            {canAssign && !noTeam ? (
              <select
                className="assign-select"
                value={task.assigned_to || ""}
                onChange={(e) => handleAssign(e.target.value)}
                disabled={assigning}
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
            ) : noTeam ? (
              <span className="text-muted">Contact administrator to join a team</span>
            ) : (
              <span>
                {task.assigned_to_name || "Unassigned"}
                {task.assigned_to === user?.id ? " (You)" : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="task-detail-bottom">
        <CommentSection taskId={task.id} lastUpdated={lastUpdated} onDataChanged={() => setLastUpdated(Date.now())} />
        <ActivityTimeline taskId={task.id} lastUpdated={lastUpdated} />
      </div>
    </div>
  );
}

