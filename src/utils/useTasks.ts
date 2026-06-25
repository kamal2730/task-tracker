import {useMemo } from "react"
import type { TaskStatus, AddTaskPayload, UpdateTaskPayload } from "../types";
import { addTask, deleteTask, setSearchQuery, setStatusFilter, updateTask } from "../features/todo/todoSlice";
import { useAppDispatch, useAppSelector } from "../store";

export const useTasks = () =>{
    const tasks = useAppSelector((state) => state.todos.tasks);
    const statusFilter = useAppSelector((state) => state.todos.statusFilter);
    const searchQuery = useAppSelector((state) => state.todos.searchQuery);
    
    const dispatch = useAppDispatch();


    const handleAddTask =(payload:AddTaskPayload)=>{
        dispatch(addTask(payload))
    }

    const handleUpdateTask = (payload:UpdateTaskPayload) => {
        dispatch(updateTask(payload))
    };


    const handleDeleteTask = (payload: string) => {
        dispatch(deleteTask(payload))
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
    };
}