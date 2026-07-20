import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store";
import { fetchTeams, createTeam, updateTeam, deleteTeam } from "../features/teams/teamsSlice";
import { showToast } from "../utils/toast";
import ConfirmDialog from "../components/ConfirmDialog";

export default function TeamManagementPage() {
  const dispatch = useAppDispatch();
  const { teams, loading, error } = useAppSelector((s) => s.teams);
  const [name, setName] = useState("");
  const [editTarget, setEditTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(fetchTeams());
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await dispatch(createTeam(name.trim())).unwrap();
      showToast("Team created", "success");
      setName("");
    } catch {
      showToast("Failed to create team", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRename = async () => {
    if (!editTarget || !editTarget.name.trim()) return;
    setSaving(true);
    try {
      await dispatch(updateTeam({ id: editTarget.id, name: editTarget.name.trim() })).unwrap();
      showToast("Team renamed", "success");
      setEditTarget(null);
    } catch {
      showToast("Failed to rename team", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await dispatch(deleteTeam(deleteTarget)).unwrap();
      showToast("Team deleted", "success");
      setDeleteTarget(null);
    } catch {
      showToast("Failed to delete team", "error");
    }
  };

  if (loading) return <div className="loading-spinner">Loading teams...</div>;
  if (error) return <div className="error-banner">{error}</div>;

  return (
    <div className="user-management">
      <h2 className="page-title">Team Management</h2>

      <form onSubmit={handleCreate} style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <input
          className="form-input"
          style={{ flex: 1 }}
          placeholder="New team name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn-save" type="submit" disabled={saving || !name.trim()}>
          {saving ? "Creating..." : "Add Team"}
        </button>
      </form>

      <div className="user-table-wrapper">
        <table className="user-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.id}>
                <td>
                  {editTarget?.id === t.id ? (
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <input
                        className="form-input"
                        value={editTarget.name}
                        onChange={(e) => setEditTarget({ ...editTarget, name: e.target.value })}
                        autoFocus
                      />
                      <button className="btn-save" onClick={handleRename} disabled={saving}>Save</button>
                      <button className="btn-cancel" onClick={() => setEditTarget(null)}>Cancel</button>
                    </div>
                  ) : (
                    <Link to={`/teams/${t.id}`} className="user-link">{t.name}</Link>
                  )}
                </td>
                <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                <td>
                  <button
                    className="btn-cancel"
                    style={{ marginRight: "0.5rem" }}
                    onClick={() => setEditTarget({ id: t.id, name: t.name })}
                  >
                    Rename
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => setDeleteTarget(t.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {teams.length === 0 && !loading && (
        <p className="no-tasks-message">No teams yet. Create one above.</p>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Team"
        message="Delete this team? Users in this team will become unassigned."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
