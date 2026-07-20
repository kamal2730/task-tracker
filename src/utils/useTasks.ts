import { useMemo, useRef, useCallback } from "react"
import type { TaskPriority, TaskStatus, AddTaskPayload, UpdateTaskPayload } from "../types";
import { addTaskAsync, fetchTasks, fetchTaskStats, deleteTaskAsync, setSearchQuery, setStatusFilter, setPriorityFilter, setSortBy, setSortOrder, updateTaskAsync } from "../features/todo/todoSlice";
import { useAppDispatch, useAppSelector } from "../store";
import { showToast } from "./toast";

function useDebounce() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback((fn: () => void, ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(fn, ms);
  }, []);
}

export const useTasks = () =>{
    const tasks = useAppSelector((state) => state.todos.tasks);
    const statusFilter = useAppSelector((state) => state.todos.statusFilter);
    const priorityFilter = useAppSelector((state) => state.todos.priorityFilter);
    const searchQuery = useAppSelector((state) => state.todos.searchQuery);
    const sortBy = useAppSelector((state) => state.todos.sortBy);
    const sortOrder = useAppSelector((state) => state.todos.sortOrder);
    const page = useAppSelector((state) => state.todos.page);
    const loading = useAppSelector((state) => state.todos.loading);
    const error = useAppSelector((state) => state.todos.error);
    const total = useAppSelector((state) => state.todos.total);
    const pages = useAppSelector((state) => state.todos.pages);
    const stats = useAppSelector((state) => state.todos.stats);

    const dispatch = useAppDispatch();
    const debounce = useDebounce();

    const fetchWithFilters = (overrides?: Record<string, string | number | undefined>) => {
      dispatch(fetchTasks({
        page,
        status: statusFilter === "All" ? undefined : statusFilter,
        priority: priorityFilter === "All" ? undefined : priorityFilter,
        q: searchQuery || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        ...overrides,
      }));
      dispatch(fetchTaskStats());
    };

    const handleAddTask = async (payload: AddTaskPayload) => {
        try {
            await dispatch(addTaskAsync(payload)).unwrap();
            showToast("Task added", "success");
            fetchWithFilters();
        } catch (err) {
            showToast((err as { message?: string })?.message ?? "An error occurred", "error");
        }
    }

    const handleUpdateTask = async (payload: UpdateTaskPayload) => {
        try {
            await dispatch(updateTaskAsync(payload)).unwrap();
            showToast("Task updated", "success");
            fetchWithFilters();
        } catch (err) {
            showToast((err as { message?: string })?.message ?? "An error occurred", "error");
        }
    };

    const handleDeleteTask = async (payload: string) => {
        try {
            await dispatch(deleteTaskAsync(payload)).unwrap();
            showToast("Task deleted", "success");
            fetchWithFilters();
        } catch (err) {
            showToast((err as { message?: string })?.message ?? "An error occurred", "error");
        }
    };

    const handleSetSearchQuery=(payload:string) =>{
        dispatch(setSearchQuery(payload))
        debounce(() => fetchWithFilters({ page: 1 }), 300);
    }

    const handleSetStatusFilter=(payload:TaskStatus|'All') =>{
        dispatch(setStatusFilter(payload))
        fetchWithFilters({ status: payload === "All" ? undefined : payload, page: 1 });
    }

    const handleSetPriorityFilter=(payload:TaskPriority|'All') =>{
        dispatch(setPriorityFilter(payload))
        fetchWithFilters({ priority: payload === "All" ? undefined : payload, page: 1 });
    }

    const handleSetSort=(sort_by: string, sort_order: string) =>{
        dispatch(setSortBy(sort_by))
        dispatch(setSortOrder(sort_order))
        fetchWithFilters({ sort_by, sort_order, page: 1 });
    }

    const statusCounts = useMemo(() => ({
        All: total,
        Pending: stats?.byStatus.Pending ?? 0,
        'In Progress': stats?.byStatus['In Progress'] ?? 0,
        Done: stats?.byStatus.Done ?? 0,
    }), [total, stats]);

    return {
        tasks,
        statusCounts,
        total,
        pages,
        page,
        statusFilter,
        handleSetStatusFilter,
        priorityFilter,
        handleSetPriorityFilter,
        searchQuery,
        handleSetSearchQuery,
        sortBy,
        sortOrder,
        handleSetSort,
        handleAddTask,
        handleUpdateTask,
        handleDeleteTask,
        fetchWithFilters,
        loading,
        error,
    };
}
