export type TaskStatus = 'Pending' | 'In Progress' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High';
export interface Team {
  id: string;
  name: string;
  createdAt: string;
}

export type UserRole = 'Admin' | 'Manager' | 'User';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  createdAt: string;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  user_id: string;
  user_name: string;
}
export interface TodoState {
    tasks: Task[];
    statusFilter: TaskStatus | "All";
    priorityFilter: TaskPriority | "All";
    searchQuery: string;
    sortBy: string;
    sortOrder: string;
    loading: boolean;
    error: string | null;
    stats: TaskStats | null;
    total: number;
    page: number;
    pages: number;
}

export interface AddTaskPayload {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: Task["priority"];
  dueDate?: string;
  assigned_to?: string;
}
export interface UpdateTaskPayload {
  id: string;
  updates: Partial<Omit<Task, "id" | "createdAt">>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  team_id: string | null;
  createdAt: string;
}

export interface UserWithStats extends User {
  task_count: number;
}

export interface AuthState {
  user: User | null;
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

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  team_id?: string | null;
}

export interface UpdateUserPayload {
  id: string;
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  team_id?: string | null;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user_id: string;
  user_name: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  details?: string | null;
  createdAt: string;
  user_id: string;
  user_name: string;
}

export interface TaskStats {
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  total: number;
  overdue: number;
}

export interface PaginatedTasks {
  items: Task[];
  total: number;
  page: number;
  pages: number;
}

export interface UsersState {
  users: UserWithStats[];
  currentUser: UserWithStats | null;
  loading: boolean;
  error: string | null;
}

export interface CommentsState {
  comments: Comment[];
  loading: boolean;
  error: string | null;
}

export interface ActivityState {
  logs: ActivityLog[];
  loading: boolean;
  error: string | null;
}

export interface TeamsState {
  teams: Team[];
  loading: boolean;
  error: string | null;
}

export type NotificationType = 'TASK_ASSIGNED' | 'COMMENT_ADDED' | 'STATUS_CHANGED' | 'TASK_CREATED';

export interface Notification {
  id: string;
  recipient_id: string;
  task_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  createdAt: string;
}

export interface PaginatedNotifications {
  items: Notification[];
  total: number;
  page: number;
  pages: number;
}

export interface NotificationsState {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  pages: number;
  loading: boolean;
  error: string | null;
  panelOpen: boolean;
}
