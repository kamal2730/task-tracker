import type { TaskStatus } from "../types";

export const STATUS_COLORS: Record<TaskStatus, string> = {
  'Pending': '#ef4444',
  'In Progress': '#f59e0b',
  'Done': '#22c55e',
};
