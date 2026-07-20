import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store";
import { fetchTaskStats } from "../features/todo/todoSlice";
import { api } from "../services/api";
import { showToast } from "../utils/toast";
import type { Task, TaskStatus } from "../types";
import { STATUS_COLORS } from "../utils/constants";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const PRIORITY_COLORS: Record<string, string> = {
  High: "#ef4444",
  Medium: "#f59e0b",
  Low: "#22c55e",
};

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const stats = useAppSelector((s) => s.todos.stats);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  useEffect(() => {
    dispatch(fetchTaskStats());
    api.getTasks({ limit: 5, sort_by: "createdAt", sort_order: "desc" })
      .then((data) => setRecentTasks(data.items))
      .catch(() => showToast("Failed to load recent tasks", "error"))
      .finally(() => setRecentLoading(false));
  }, []);

  const currentUser = useAppSelector((s) => s.auth.user);

  if (!stats) {
    return <div className="loading-spinner">Loading dashboard...</div>;
  }

  const statusData = Object.entries(stats.byStatus).map(([name, value]) => ({ name, value }));
  const priorityData = Object.entries(stats.byPriority).map(([name, value]) => ({ name, value }));

  return (
    <div className="dashboard">
      <h2 className="dashboard-title">Dashboard</h2>

      {currentUser?.role === "Manager" && !currentUser.team_id && (
        <div className="error-banner" style={{ marginBottom: "1rem" }}>
          You haven't been assigned to a team yet. Please contact an administrator to join one.
        </div>
      )}

      <div className="stat-cards">
        <div className="stat-card stat-card-total">
          <span className="stat-label">Total</span>
          <span className="stat-value">{stats.total}</span>
        </div>
        <div className="stat-card stat-card-pending">
          <span className="stat-label">Pending</span>
          <span className="stat-value">{stats.byStatus.Pending || 0}</span>
        </div>
        <div className="stat-card stat-card-progress">
          <span className="stat-label">In Progress</span>
          <span className="stat-value">{stats.byStatus["In Progress"] || 0}</span>
        </div>
        <div className="stat-card stat-card-done">
          <span className="stat-label">Done</span>
          <span className="stat-value">{stats.byStatus.Done || 0}</span>
        </div>
        <div className="stat-card stat-card-overdue">
          <span className="stat-label">Overdue</span>
          <span className="stat-value">{stats.overdue}</span>
        </div>
      </div>

      <div className="charts-row">
        <div className="chart-card">
          <h3>Tasks by Status</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                nameKey="name"
              >
                {statusData.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name as TaskStatus] || "#888"} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Tasks by Priority</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={priorityData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                nameKey="name"
              >
                {priorityData.map((entry) => (
                  <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name] || "#888"} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="recent-tasks-section">
        <h3>Recent Tasks</h3>
        {recentLoading ? (
          <div className="skeleton-container">
            <div className="skeleton-card"><div className="skeleton-row"><div className="skeleton-line skeleton-line-title" /></div></div>
            <div className="skeleton-card"><div className="skeleton-row"><div className="skeleton-line skeleton-line-title" /></div></div>
            <div className="skeleton-card"><div className="skeleton-row"><div className="skeleton-line skeleton-line-title" /></div></div>
          </div>
        ) : recentTasks.length === 0 ? (
          <p className="no-tasks-message">No tasks created yet.</p>
        ) : (
          <div className="recent-tasks-list">
            {recentTasks.map((t) => (
              <Link key={t.id} to={`/tasks/${t.id}`} className="recent-task-item">
                <span className="recent-task-title">{t.title}</span>
                <span className={`priority-badge priority-${t.priority.toLowerCase()}`}>{t.priority}</span>
                <span
                  className="status-dot"
                  style={{ backgroundColor: STATUS_COLORS[t.status] }}
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

