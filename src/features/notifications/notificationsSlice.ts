import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { NotificationsState } from "../../types";
import { api } from "../../services/api";

const initialState: NotificationsState = {
    notifications: [],
    total: 0,
    unreadCount: 0,
    page: 1,
    pages: 1,
    loading: false,
    error: null,
    panelOpen: false,
};

export const fetchNotifications = createAsyncThunk(
    "notifications/fetch",
    async (page: number = 1) => {
        return await api.getNotifications(page);
    },
);

export const fetchUnreadCount = createAsyncThunk(
    "notifications/unreadCount",
    async () => {
        return await api.getUnreadCount();
    },
);

export const markAsRead = createAsyncThunk(
    "notifications/markRead",
    async (id: string) => {
        await api.markNotificationRead(id);
        return id;
    },
);

export const markAllAsRead = createAsyncThunk(
    "notifications/markAllRead",
    async () => {
        await api.markAllNotificationsRead();
    },
);

export const deleteNotification = createAsyncThunk(
    "notifications/delete",
    async (id: string) => {
        await api.deleteNotification(id);
        return id;
    },
);

const notificationsSlice = createSlice({
    name: "notifications",
    initialState,
    reducers: {
        togglePanel(state) {
            state.panelOpen = !state.panelOpen;
        },
        closePanel(state) {
            state.panelOpen = false;
        },
        clearNotifications(state) {
            state.notifications = [];
            state.total = 0;
            state.unreadCount = 0;
            state.page = 1;
            state.pages = 1;
            state.panelOpen = false;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchNotifications.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchNotifications.fulfilled, (state, action) => {
                state.loading = false;
                const { items, total, page, pages } = action.payload;
                if (page === 1) {
                    state.notifications = items;
                } else {
                    state.notifications = [...state.notifications, ...items];
                }
                state.total = total;
                state.page = page;
                state.pages = pages;
            })
            .addCase(fetchNotifications.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message ?? "Failed to fetch notifications";
            })
            .addCase(fetchUnreadCount.fulfilled, (state, action) => {
                state.unreadCount = action.payload;
            })
            .addCase(markAsRead.fulfilled, (state, action) => {
                const notif = state.notifications.find((n) => n.id === action.payload);
                if (notif) notif.is_read = true;
            })
            .addCase(markAllAsRead.fulfilled, (state) => {
                state.notifications.forEach((n) => { n.is_read = true; });
                state.unreadCount = 0;
            })
            .addCase(deleteNotification.fulfilled, (state, action) => {
                state.notifications = state.notifications.filter((n) => n.id !== action.payload);
                state.total = Math.max(0, state.total - 1);
            });
    },
});

export const { togglePanel, closePanel, clearNotifications } = notificationsSlice.actions;
export default notificationsSlice.reducer;
