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
