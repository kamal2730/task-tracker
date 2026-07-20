import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../store";
import { createUser, updateUser } from "../features/users/usersSlice";
import { fetchTeams } from "../features/teams/teamsSlice";
import { showToast } from "../utils/toast";
import type { UserWithStats, UserRole } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  user?: UserWithStats | null;
}

const ROLES: UserRole[] = ["User", "Manager", "Admin"];

export default function UserFormDialog({ open, onClose, user }: Props) {
  const dispatch = useAppDispatch();
  const { teams } = useAppSelector((s) => s.teams);
  const isEdit = !!user;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("User");
  const [teamId, setTeamId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      dispatch(fetchTeams());
      setName(user?.name ?? "");
      setEmail(user?.email ?? "");
      setPassword("");
      setRole(user?.role ?? "User");
      setTeamId(user?.team_id ?? "");
    }
  }, [open, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    if (!isEdit && !password.trim()) return;

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        role,
        team_id: teamId || null,
      };
      if (isEdit) {
        await dispatch(updateUser({
          id: user!.id,
          ...payload,
          ...(password.trim() ? { password: password.trim() } : {}),
        })).unwrap();
        showToast("User updated", "success");
      } else {
        await dispatch(createUser({
          ...payload,
          password: password.trim(),
        })).unwrap();
        showToast("User created", "success");
      }
      onClose();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Something went wrong", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>{isEdit ? "Edit User" : "Create User"}</h3>
        <form onSubmit={handleSubmit}>
          <label className="form-label">
            Name
            <input
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="form-label">
            Email
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="form-label">
            Password {isEdit && <span className="form-hint">(leave blank to keep current)</span>}
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!isEdit}
            />
          </label>
          <label className="form-label">
            Role
            <select
              className="form-input"
              value={role}
              onChange={(e) => { const parsed = ROLES.find(r => r === e.target.value) ?? "User"; setRole(parsed); }}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="form-label">
            Team
            <select
              className="form-input"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
            >
              <option value="">— No team —</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
