import type { AddTaskPayload, LoginPayload, RegisterPayload, Task, User } from "../types";

const BASE_URL = "http://localhost:8000";

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

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("task_tracker_token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export const api = {
  // Auth
  login(payload: LoginPayload): Promise<{ access_token: string; user: User }> {
    return fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handleResponse<{ access_token: string; user: User }>);
  },

  register(payload: RegisterPayload): Promise<{ access_token: string; user: User }> {
    return fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handleResponse<{ access_token: string; user: User }>);
  },

  getProfile(): Promise<User> {
    return fetch(`${BASE_URL}/auth/profile`, {
      headers: authHeaders(),
    }).then(handleResponse<User>);
  },

  // Tasks
  getTasks(): Promise<Task[]> {
    return fetch(`${BASE_URL}/tasks`, {
      headers: authHeaders(),
    }).then(handleResponse<Task[]>);
  },

  createTask(payload: AddTaskPayload): Promise<Task> {
    return fetch(`${BASE_URL}/tasks`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }).then(handleResponse<Task>);
  },

  updateTask(
    id: string,
    updates: Partial<Omit<Task, "id" | "createdAt">>
  ): Promise<Task> {
    return fetch(`${BASE_URL}/tasks/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(updates),
    }).then(handleResponse<Task>);
  },

  deleteTask(id: string): Promise<void> {
    return fetch(`${BASE_URL}/tasks/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    }).then(handleResponse<void>);
  },
};
