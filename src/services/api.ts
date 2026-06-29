import type { AddTaskPayload, Task } from "../types";

const BASE_URL = "http://localhost:8000";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export const api = {
  getTasks(): Promise<Task[]> {
    return fetch(`${BASE_URL}/tasks`).then(handleResponse<Task[]>);
  },

  createTask(payload: AddTaskPayload): Promise<Task> {
    return fetch(`${BASE_URL}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handleResponse<Task>);
  },

  updateTask(
    id: string,
    updates: Partial<Omit<Task, "id" | "createdAt">>
  ): Promise<Task> {
    return fetch(`${BASE_URL}/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }).then(handleResponse<Task>);
  },

  deleteTask(id: string): Promise<void> {
    return fetch(`${BASE_URL}/tasks/${id}`, {
      method: "DELETE",
    }).then(handleResponse<void>);
  },
};
