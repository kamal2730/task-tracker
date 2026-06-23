import { useEffect, useState,useMemo } from "react"
import type { TaskStatus,  Task } from "../types";
import { storage } from "./storage";

export const useTasks = () =>{
    const [tasks,setTasks] = useState<Task[]>(()=>storage.getTasks());
    const [statusFilter, setStatusFilter] = useState<TaskStatus | 'All'>('All');
    const [searchQuery,setSearchQuery]=useState('');

    useEffect(()=>{
        storage.saveTasks(tasks);
    },[tasks])

    const addTask =(title:string,description?:string,priority:Task['priority'] = 'Medium',dueDate?: string)=>{
        const newTask: Task ={
            id:crypto.randomUUID(),
            title,
            description,
            status:'Pending',
            priority,
            dueDate,
            createdAt:new Date().toISOString(),
        };
        setTasks((prev)=>[...prev,newTask])
    }

    const updateTask = (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => {
        setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, ...updates } : task)));
    };


    const deleteTask = (id: string) => {
        setTasks((prev) => prev.filter((task) => task.id !== id));
    };

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
        setStatusFilter,
        searchQuery,
        setSearchQuery,
        addTask,
        updateTask,
        deleteTask,
    };
}