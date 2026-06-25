import { configureStore } from "@reduxjs/toolkit";
import todoReducer from "./features/todo/todoSlice";
import { useDispatch, useSelector } from "react-redux";
import { storage } from "./utils/storage";


const store = configureStore({
    reducer:{
        todos:todoReducer
    }
});

store.subscribe(()=>{
    const state=store.getState()
    storage.saveTasks(state.todos.tasks)
})

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();