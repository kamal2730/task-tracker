import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { AddTaskPayload, TaskStatus, TodoState, UpdateTaskPayload } from "../../types";
import { api } from "../../services/api";


const initialState: TodoState = {
    tasks: [],
    statusFilter:'All',
    searchQuery:'',
    loading: false,
    error: null,
};

export const fetchTasks = createAsyncThunk(
    'todos/fetchTasks',
    async () => {
        return await api.getTasks();
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

const todoSlice = createSlice({
  name: "todos",
  initialState,
  reducers: {
    setStatusFilter:(state,action:PayloadAction<TaskStatus | 'All'>)=>{
        state.statusFilter=action.payload
    },
    setSearchQuery:(state,action:PayloadAction<string>)=>{
        state.searchQuery=action.payload
    }
  },
  extraReducers: (builder) => {
    builder
        .addCase(fetchTasks.pending, (state) => {
            state.loading = true;
            state.error = null;
        })
        .addCase(fetchTasks.fulfilled, (state, action) => {
            state.loading = false;
            state.tasks = action.payload;
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
        });
  },
});

export const { setSearchQuery, setStatusFilter } = todoSlice.actions;
export default todoSlice.reducer;
