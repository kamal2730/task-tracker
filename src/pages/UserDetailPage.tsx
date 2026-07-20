import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store";
import { fetchUser } from "../features/users/usersSlice";
import { fetchTeams } from "../features/teams/teamsSlice";
import UserFormDialog from "../components/UserFormDialog";
import type { Task } from "../types";
import { api } from "../services/api";
import { showToast } from "../utils/toast";

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { currentUser, loading } = useAppSelector((s) => s.users);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const teamName = useAppSelector((s) => {
    if (!currentUser?.team_id) return null;
    const team = s.teams.teams.find((t) => t.id === currentUser.team_id);
    return team?.name ?? null;
  });

  useEffect(() => {
    if (!id) return;
    dispatch(fetchUser(id));
    dispatch(fetchTeams());
    api.getTasks({ assigned_to: id, limit: 50 })
      .then((data) => setTasks(data.items))
      .catch(() => showToast("Failed to load tasks", "error"))
      .finally(() => setTasksLoading(false));
  }, [id]);

  const handleFormClose = () => {
    setShowForm(false);
    if (id) dispatch(fetchUser(id));
  };

  if (loading || tasksLoading) return <div className="loading-spinner">Loading...</div>;
  if (!currentUser) return <div className="error-banner">User not found</div>;

  return (
    <div className="user-detail">
      <Link to="/users" className="back-link">&larr; Back to users</Link>

      <UserFormDialog open={showForm} onClose={handleFormClose} user={currentUser} />

      <div className="task-detail-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2>{currentUser.name}</h2>
          <button className="btn-save" onClick={() => setShowForm(true)}>Edit</button>
        </div>
        <div className="task-detail-meta">
          <div className="meta-row">
            <span className="meta-label">Email</span>
            <span>{currentUser.email}</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Role</span>
            <span className="role-badge">{currentUser.role}</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Team</span>
            <span>{teamName ?? "—"}</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Tasks</span>
            <span>{currentUser.task_count}</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Joined</span>
            <span>{new Date(currentUser.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <h3 style={{ margin: "1.5rem 0 0.75rem", fontSize: "1rem", color: "var(--text-main)" }}>
        Tasks ({currentUser.task_count})
      </h3>

      {tasks.length === 0 ? (
        <p className="no-tasks-message">No tasks found for this user.</p>
      ) : (
        <div className="task-items-grid">
          {tasks.map((t) => (
            <Link key={t.id} to={`/tasks/${t.id}`} className="task-item-link">
              <div className="task-item">
                <div className="task-item-main">
                  <span className="task-title">{t.title}</span>
                  <span className={`priority-badge priority-${t.priority.toLowerCase()}`}>
                    {t.priority}
                  </span>
                  <span className="due-date">
                    {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : ""}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

