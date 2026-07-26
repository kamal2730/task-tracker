import type {
  AddTaskPayload, Comment, ActivityLog,
  CreateUserPayload, LoginPayload, RegisterPayload, Task, TaskStats,
  PaginatedTasks, User, UserWithStats, UserRole, Team, PaginatedNotifications,
} from "../types";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

let _accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (_accessToken) headers["Authorization"] = `Bearer ${_accessToken}`;
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    let message: string;
    try {
      const parsed = JSON.parse(text);
      message = parsed.detail || text;
    } catch {
      message = text || `HTTP ${response.status}`;
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

async function fetchWithAuth<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const buildOptions = (): RequestInit => ({
    ...options,
    headers: { ...authHeaders(), ...(options.headers as Record<string, string> || {}) },
    credentials: "include",
  });

  let res = await fetch(url, buildOptions());

  if (
    res.status === 401 &&
    !url.includes("/auth/refresh") &&
    !url.includes("/auth/login") &&
    !url.includes("/auth/register")
  ) {
    const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (refreshRes.ok) {
      const refreshData = await refreshRes.json();
      _accessToken = refreshData.access_token;
      res = await fetch(url, buildOptions());
    } else {
      _accessToken = null;
    }
  }

  return handleResponse<T>(res);
}

export type TaskQuery = {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: string;
  status?: string;
  priority?: string;
  q?: string;
  assigned_to?: string;
  user_id?: string;
  due_before?: string;
  due_after?: string;
};

function buildQuery(params: TaskQuery): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") search.set(k, String(v));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const api = {
  // Auth
  login(payload: LoginPayload): Promise<{ access_token: string; user: User }> {
    return fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    }).then(handleResponse<{ access_token: string; user: User }>);
  },

  register(payload: RegisterPayload): Promise<{ access_token: string; user: User }> {
    return fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    }).then(handleResponse<{ access_token: string; user: User }>);
  },

  getProfile(): Promise<User> {
    return fetchWithAuth<User>(`${BASE_URL}/auth/profile`);
  },

  refresh(): Promise<{ access_token: string; user: User }> {
    return fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    }).then(handleResponse<{ access_token: string; user: User }>);
  },

  logoutApi(): Promise<void> {
    return fetchWithAuth<void>(`${BASE_URL}/auth/logout`, { method: "POST" });
  },

  // Tasks
  getTasks(query: TaskQuery = {}): Promise<PaginatedTasks> {
    return fetchWithAuth<PaginatedTasks>(`${BASE_URL}/tasks${buildQuery(query)}`);
  },

  getTaskStats(): Promise<TaskStats> {
    return fetchWithAuth<TaskStats>(`${BASE_URL}/tasks/stats`);
  },

  getTask(id: string): Promise<Task> {
    return fetchWithAuth<Task>(`${BASE_URL}/tasks/${id}`);
  },

  createTask(payload: AddTaskPayload): Promise<Task> {
    return fetchWithAuth<Task>(`${BASE_URL}/tasks`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateTask(
    id: string,
    updates: Partial<Omit<Task, "id" | "createdAt">>
  ): Promise<Task> {
    return fetchWithAuth<Task>(`${BASE_URL}/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  assignTask(id: string, assigned_to: string): Promise<Task> {
    return fetchWithAuth<Task>(`${BASE_URL}/tasks/${id}/assign`, {
      method: "PATCH",
      body: JSON.stringify({ assigned_to }),
    });
  },

  deleteTask(id: string): Promise<void> {
    return fetchWithAuth<void>(`${BASE_URL}/tasks/${id}`, {
      method: "DELETE",
    });
  },

  // Users
  getUsers(): Promise<UserWithStats[]> {
    return fetchWithAuth<UserWithStats[]>(`${BASE_URL}/users`);
  },

  getUser(id: string): Promise<UserWithStats> {
    return fetchWithAuth<UserWithStats>(`${BASE_URL}/users/${id}`);
  },

  updateUserRole(id: string, role: string): Promise<void> {
    return fetchWithAuth<void>(`${BASE_URL}/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  },

  deleteUser(id: string): Promise<void> {
    return fetchWithAuth<void>(`${BASE_URL}/users/${id}`, {
      method: "DELETE",
    });
  },

  createUser(payload: CreateUserPayload): Promise<UserWithStats> {
    return fetchWithAuth<UserWithStats>(`${BASE_URL}/users`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateUser(id: string, payload: { name?: string; email?: string; password?: string; role?: UserRole; team_id?: string | null }): Promise<UserWithStats> {
    return fetchWithAuth<UserWithStats>(`${BASE_URL}/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  // Teams
  getTeams(): Promise<Team[]> {
    return fetchWithAuth<Team[]>(`${BASE_URL}/teams`);
  },

  createTeam(name: string): Promise<Team> {
    return fetchWithAuth<Team>(`${BASE_URL}/teams`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  updateTeam(id: string, name: string): Promise<Team> {
    return fetchWithAuth<Team>(`${BASE_URL}/teams/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
  },

  deleteTeam(id: string): Promise<void> {
    return fetchWithAuth<void>(`${BASE_URL}/teams/${id}`, {
      method: "DELETE",
    });
  },

  // Comments
  getComments(taskId: string): Promise<Comment[]> {
    return fetchWithAuth<Comment[]>(`${BASE_URL}/tasks/${taskId}/comments`);
  },

  addComment(taskId: string, content: string): Promise<Comment> {
    return fetchWithAuth<Comment>(`${BASE_URL}/tasks/${taskId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  },

  deleteComment(commentId: string): Promise<void> {
    return fetchWithAuth<void>(`${BASE_URL}/comments/${commentId}`, {
      method: "DELETE",
    });
  },

  // Activity
  getActivity(taskId: string): Promise<ActivityLog[]> {
    return fetchWithAuth<ActivityLog[]>(`${BASE_URL}/tasks/${taskId}/activity`);
  },

  // Notifications
  getNotifications(page: number = 1, limit: number = 20): Promise<PaginatedNotifications> {
    return fetchWithAuth<PaginatedNotifications>(`${BASE_URL}/notifications?page=${page}&limit=${limit}`);
  },

  getUnreadCount(): Promise<number> {
    return fetchWithAuth<{ count: number }>(`${BASE_URL}/notifications/unread-count`).then((data) => data.count);
  },

  markNotificationRead(id: string): Promise<void> {
    return fetchWithAuth<void>(`${BASE_URL}/notifications/${id}/read`, { method: "PATCH" });
  },

  markAllNotificationsRead(): Promise<void> {
    return fetchWithAuth<void>(`${BASE_URL}/notifications/read-all`, { method: "PATCH" });
  },

  deleteNotification(id: string): Promise<void> {
    return fetchWithAuth<void>(`${BASE_URL}/notifications/${id}`, { method: "DELETE" });
  },
};
