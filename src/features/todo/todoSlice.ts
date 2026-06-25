import { createSlice } from "@reduxjs/toolkit";
import type {PayloadAction} from "@reduxjs/toolkit";
import type { AddTaskPayload, Task, TaskStatus, TodoState, UpdateTaskPayload } from "../../types";
import { storage } from "../../utils/storage";


const initialState: TodoState = {
    tasks : storage.getTasks(),
    statusFilter:'All',
    searchQuery:''
};

const todoSlice = createSlice({
  name: "todos",
  initialState,
  reducers: {
    addTask: {
        reducer:(state, action: PayloadAction<Task>) => {
            state.tasks.push(action.payload)
        },
        prepare:(payload:AddTaskPayload) => {
            return{
                payload:{
                    ...payload,
                    id:crypto.randomUUID(),
                    status:'Pending' as const,
                    priority: payload.priority ?? 'Medium',
                    createdAt: new Date().toISOString()
                }
            }
        }
    },
    updateTask:(state,action:PayloadAction<UpdateTaskPayload>) =>{
        const { id, updates } = action.payload;
        const task = state.tasks.find(t => t.id === id);
        if (task) {
            Object.assign(task, updates);
        }
    },
    deleteTask:(state,action:PayloadAction<string>)=>{
        const id=action.payload;
        state.tasks = state.tasks.filter((task) => task.id !== id);
    },
    setStatusFilter:(state,action:PayloadAction<TaskStatus | 'All'>)=>{
        state.statusFilter=action.payload
    },
    setSearchQuery:(state,action:PayloadAction<string>)=>{
        state.searchQuery=action.payload
    }
  },
});

export const { addTask , updateTask ,deleteTask,setSearchQuery,setStatusFilter} = todoSlice.actions;
export default todoSlice.reducer;