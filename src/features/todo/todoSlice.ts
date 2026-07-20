import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { AddTaskPayload, TaskPriority, TaskStatus, TodoState, UpdateTaskPayload } from "../../types";
import type { TaskQuery } from "../../services/api";
import { api } from "../../services/api";


const initialState: TodoState = {
    tasks: [],
    statusFilter: 'All',
    priorityFilter: 'All',
    searchQuery: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    loading: false,
    error: null,
    stats: null,
    total: 0,
    page: 1,
    pages: 1,
};

export const fetchTasks = createAsyncThunk(
    'todos/fetchTasks',
    async (params?: TaskQuery) => {
        const data = await api.getTasks(params ?? {});
        return data;
    }
);

export const addTaskAsync = createAsyncThunk(
    'todos/addTaskAsync',
    async (payload: AddTaskPayload) => {
        return await api.createTask(payload);
    }
);

export const updateTaskAsync = createAsyncThunk(
    'todos/updateTaskAsync',
    async (payload: UpdateTaskPayload) => {
        const { id, updates } = payload;
        return await api.updateTask(id, updates);
    }
);

export const deleteTaskAsync = createAsyncThunk(
    'todos/deleteTaskAsync',
    async (id: string) => {
        await api.deleteTask(id);
        return id;
    }
);

export const fetchTaskStats = createAsyncThunk(
    'todos/fetchTaskStats',
    async () => {
        return await api.getTaskStats();
    }
);

const todoSlice = createSlice({
  name: "todos",
  initialState,
  reducers: {
    setStatusFilter:(state,action:PayloadAction<TaskStatus | 'All'>)=>{
        state.statusFilter=action.payload
    },
    setPriorityFilter:(state,action:PayloadAction<TaskPriority | 'All'>)=>{
        state.priorityFilter=action.payload
    },
    setSearchQuery:(state,action:PayloadAction<string>)=>{
        state.searchQuery=action.payload
    },
    setSortBy:(state,action:PayloadAction<string>)=>{
        state.sortBy=action.payload
    },
    setSortOrder:(state,action:PayloadAction<string>)=>{
        state.sortOrder=action.payload
    },
    setPage:(state,action:PayloadAction<number>)=>{
        state.page=action.payload
    },
  },
  extraReducers: (builder) => {
    builder
        .addCase(fetchTasks.pending, (state) => {
            state.loading = true;
            state.error = null;
        })
        .addCase(fetchTasks.fulfilled, (state, action) => {
            state.loading = false;
            state.tasks = action.payload.items;
            state.total = action.payload.total;
            state.page = action.payload.page;
            state.pages = action.payload.pages;
        })
        .addCase(fetchTasks.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message ?? 'Failed to fetch tasks';
        })
        .addCase(addTaskAsync.fulfilled, (state, action) => {
            state.tasks.push(action.payload);
        })
        .addCase(addTaskAsync.rejected, (state, action) => {
            state.error = action.error.message ?? 'Failed to add task';
        })
        .addCase(updateTaskAsync.fulfilled, (state, action) => {
            const index = state.tasks.findIndex(t => t.id === action.payload.id);
            if (index !== -1) {
                state.tasks[index] = action.payload;
            }
        })
        .addCase(updateTaskAsync.rejected, (state, action) => {
            state.error = action.error.message ?? 'Failed to update task';
        })
        .addCase(deleteTaskAsync.fulfilled, (state, action) => {
            state.tasks = state.tasks.filter(t => t.id !== action.payload);
        })
        .addCase(deleteTaskAsync.rejected, (state, action) => {
            state.error = action.error.message ?? 'Failed to delete task';
        })
        .addCase(fetchTaskStats.fulfilled, (state, action) => {
            state.stats = action.payload;
        });
  },
});

export const { setSearchQuery, setStatusFilter, setPriorityFilter, setSortBy, setSortOrder, setPage } = todoSlice.actions;
export default todoSlice.reducer;
