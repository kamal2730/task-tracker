export type TaskStatus = 'Pending' | 'In Progress' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  createdAt: string;
}
export interface TodoState {
    tasks: Task[];
    statusFilter:TaskStatus|"All";
    searchQuery:string;
    loading: boolean;
    error: string | null;
}

export interface AddTaskPayload {
  title: string;
  description?: string;
  priority?: Task["priority"];
  dueDate?: string;
}
export interface UpdateTaskPayload {
  id: string;
  updates: Partial<Omit<Task, "id" | "createdAt">>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}
