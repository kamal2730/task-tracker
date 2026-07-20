import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store";
import { fetchUsers, updateUserRole, deleteUser } from "../features/users/usersSlice";
import { fetchTeams } from "../features/teams/teamsSlice";
import { showToast } from "../utils/toast";
import ConfirmDialog from "../components/ConfirmDialog";
import UserFormDialog from "../components/UserFormDialog";
import type { UserRole } from "../types";

const ROLES: UserRole[] = ["User", "Manager", "Admin"];

export default function UserManagementPage() {
  const dispatch = useAppDispatch();
  const { users, loading, error } = useAppSelector((s) => s.users);
  const currentUser = useAppSelector((s) => s.auth.user);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const teamMap = useAppSelector((s) => {
    const map: Record<string, string> = {};
    for (const t of s.teams.teams) map[t.id] = t.name;
    return map;
  });

  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchTeams());
  }, []);

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await dispatch(updateUserRole({ id: userId, role })).unwrap();
      showToast(`Role updated to ${role}`, "success");
    } catch {
      showToast("Failed to update role", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await dispatch(deleteUser(deleteTarget)).unwrap();
      showToast("User deleted", "success");
      setDeleteTarget(null);
    } catch {
      showToast("Failed to delete user", "error");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="loading-spinner">Loading users...</div>;
  if (error) return <div className="error-banner">{error}</div>;

  return (
    <div className="user-management">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h2 className="page-title" style={{ margin: 0 }}>User Management</h2>
        <button className="btn-save" onClick={() => setShowForm(true)}>Add User</button>
      </div>

      <UserFormDialog open={showForm} onClose={() => setShowForm(false)} />

      <div className="user-table-wrapper">
        <table className="user-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Team</th>
              <th>Tasks</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <Link to={`/users/${u.id}`} className="user-link">{u.name}</Link>
                </td>
                <td>{u.email}</td>
                <td>
                  {u.id === currentUser?.id ? (
                    <span className="role-badge">{u.role}</span>
                  ) : (
                    <select
                      className="role-select"
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  )}
                </td>
                <td><span className="role-badge">{teamMap[u.team_id ?? ""] || "—"}</span></td>
                <td>{u.task_count}</td>
                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td>
                  {u.id !== currentUser?.id && (
                    <button
                      className="btn-delete"
                      onClick={() => setDeleteTarget(u.id)}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete User"
        message="Delete this user? All their tasks, comments, and activity will be permanently removed."
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {users.length === 0 && !loading && (
        <p className="no-tasks-message">No users found.</p>
      )}
    </div>
  );
}

