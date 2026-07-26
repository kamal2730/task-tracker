import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store";
import { fetchTeams } from "../features/teams/teamsSlice";
import { fetchUsers, updateUser } from "../features/users/usersSlice";
import { showToast } from "../utils/toast";
import ConfirmDialog from "../components/ConfirmDialog";

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { teams, loading: teamsLoading } = useAppSelector((s) => s.teams);
  const { users } = useAppSelector((s) => s.users);
  const [confirmTarget, setConfirmTarget] = useState<{ userId: string; userName: string } | null>(null);

  const team = teams.find((t) => t.id === id);

  const managers = users.filter((u) => u.role === "Manager" && u.team_id === id);
  const members = users.filter((u) => u.role === "User" && u.team_id === id);
  const unassigned = users.filter((u) => !u.team_id && u.role !== "Admin");

  useEffect(() => {
    dispatch(fetchTeams());
    dispatch(fetchUsers());
  }, []);

  const handleAddMember = async (userId: string) => {
    if (!id) return;
    try {
      await dispatch(updateUser({ id: userId, team_id: id })).unwrap();
      showToast("User added to team", "success");
    } catch {
      showToast("Failed to add user", "error");
    }
  };

  const handleRemoveMember = async () => {
    if (!confirmTarget) return;
    try {
      await dispatch(updateUser({ id: confirmTarget.userId, team_id: null })).unwrap();
      showToast("User removed from team", "success");
    } catch {
      showToast("Failed to remove user", "error");
    } finally {
      setConfirmTarget(null);
    }
  };

  if (!team) {
    if (teamsLoading) return <div className="loading-spinner">Loading team...</div>;
    return <div className="error-banner">Team not found</div>;
  }

  return (
    <div className="team-detail">
      <Link to="/teams" className="back-link">&larr; Back to teams</Link>

      <div className="task-detail-card" style={{ marginBottom: "1.5rem" }}>
        <h2>{team.name}</h2>
        <div className="task-detail-meta">
          <div className="meta-row">
            <span className="meta-label">Created</span>
            <span>{new Date(team.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Managers</span>
            <span>{managers.length}</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Members</span>
            <span>{members.length}</span>
          </div>
        </div>
      </div>

      <div className="team-section">
        <div className="team-section-header">
          <h3>Managers</h3>
          {unassigned.length > 0 && (
            <select
              className="form-input"
              style={{ width: "auto", minWidth: "200px" }}
              value=""
              onChange={(e) => { if (e.target.value) handleAddMember(e.target.value); }}
            >
              <option value="">+ Add Manager</option>
              {unassigned.filter((u) => u.role === "Manager" || u.role === "User").map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.email}) — {u.role}</option>
              ))}
            </select>
          )}
        </div>
        {managers.length === 0 ? (
          <p className="no-tasks-message">No managers assigned to this team.</p>
        ) : (
          <div className="user-table-wrapper">
            <table className="user-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {managers.map((u) => (
                  <tr key={u.id}>
                    <td><Link to={`/users/${u.id}`} className="user-link">{u.name}</Link></td>
                    <td>{u.email}</td>
                    <td>
                      <button
                        className="btn-delete"
                        onClick={() => setConfirmTarget({ userId: u.id, userName: u.name })}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="team-section">
        <div className="team-section-header">
          <h3>Members</h3>
          {unassigned.length > 0 && (
            <select
              className="form-input"
              style={{ width: "auto", minWidth: "200px" }}
              value=""
              onChange={(e) => { if (e.target.value) handleAddMember(e.target.value); }}
            >
              <option value="">+ Add Member</option>
              {unassigned.filter((u) => u.role === "User").map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
          )}
        </div>
        {members.length === 0 ? (
          <p className="no-tasks-message">No members assigned to this team.</p>
        ) : (
          <div className="user-table-wrapper">
            <table className="user-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((u) => (
                  <tr key={u.id}>
                    <td><Link to={`/users/${u.id}`} className="user-link">{u.name}</Link></td>
                    <td>{u.email}</td>
                    <td>
                      <button
                        className="btn-delete"
                        onClick={() => setConfirmTarget({ userId: u.id, userName: u.name })}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmTarget}
        title="Remove from Team"
        message={`Remove ${confirmTarget?.userName ?? ""} from this team?`}
        confirmLabel="Remove"
        confirmLoadingLabel="Removing..."
        onConfirm={handleRemoveMember}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}