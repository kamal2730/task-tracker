import {useMemo } from "react"
import type { TaskStatus, AddTaskPayload, UpdateTaskPayload } from "../types";
import { addTaskAsync, deleteTaskAsync, setSearchQuery, setStatusFilter, updateTaskAsync } from "../features/todo/todoSlice";
import { useAppDispatch, useAppSelector } from "../store";
import { showToast } from "./toast";

export const useTasks = () =>{
    const tasks = useAppSelector((state) => state.todos.tasks);
    const statusFilter = useAppSelector((state) => state.todos.statusFilter);
    const searchQuery = useAppSelector((state) => state.todos.searchQuery);
    const loading = useAppSelector((state) => state.todos.loading);
    const error = useAppSelector((state) => state.todos.error);

    const dispatch = useAppDispatch();


    const handleAddTask = async (payload: AddTaskPayload) => {
        try {
            await dispatch(addTaskAsync(payload)).unwrap();
            showToast("Task added", "success");
        } catch (err) {
            showToast((err as { message?: string })?.message ?? "An error occurred", "error");
        }
    }

    const handleUpdateTask = async (payload: UpdateTaskPayload) => {
        try {
            await dispatch(updateTaskAsync(payload)).unwrap();
            showToast("Task updated", "success");
        } catch (err) {
            showToast((err as { message?: string })?.message ?? "An error occurred", "error");
        }
    };


    const handleDeleteTask = async (payload: string) => {
        try {
            await dispatch(deleteTaskAsync(payload)).unwrap();
            showToast("Task deleted", "success");
        } catch (err) {
            showToast((err as { message?: string })?.message ?? "An error occurred", "error");
        }
    };

    const handleSetSearchQuery=(payload:string) =>{
        dispatch(setSearchQuery(payload))
    }
    const handleSetStatusFilter=(payload:TaskStatus|'All') =>{
        dispatch(setStatusFilter(payload))
    }

    const filteredTasks = useMemo(() => {
        return tasks
        .filter((task) => statusFilter === 'All' || task.status === statusFilter)
        .filter((task) => {
            const query = searchQuery.toLowerCase();
            return (
            task.title.toLowerCase().includes(query) ||
            task.description?.toLowerCase().includes(query)
            );
        });
    }, [tasks, statusFilter, searchQuery]);

    const statusCounts = useMemo(() => ({
        All: tasks.length,
        Pending: tasks.filter(t => t.status === 'Pending').length,
        'In Progress': tasks.filter(t => t.status === 'In Progress').length,
        Done: tasks.filter(t => t.status === 'Done').length,
    }), [tasks]);

    return {
        tasks: filteredTasks,
        statusCounts,
        statusFilter,
        handleSetStatusFilter,
        searchQuery,
        handleSetSearchQuery,
        handleAddTask,
        handleUpdateTask,
        handleDeleteTask,
        loading,
        error,
    };
}
