import { configureStore } from "@reduxjs/toolkit";
import todoReducer from "./features/todo/todoSlice";
import authReducer from "./features/auth/authSlice";
import usersReducer from "./features/users/usersSlice";
import commentsReducer from "./features/comments/commentsSlice";
import activityReducer from "./features/activity/activitySlice";
import teamsReducer from "./features/teams/teamsSlice";
import notificationsReducer from "./features/notifications/notificationsSlice";
import { useDispatch, useSelector } from "react-redux";


const store = configureStore({
    reducer: {
        todos: todoReducer,
        auth: authReducer,
        users: usersReducer,
        comments: commentsReducer,
        activity: activityReducer,
        teams: teamsReducer,
        notifications: notificationsReducer,
    }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
