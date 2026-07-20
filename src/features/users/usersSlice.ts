import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { CreateUserPayload, UpdateUserPayload, UsersState, UserWithStats } from "../../types";
import { api } from "../../services/api";

const initialState: UsersState = {
  users: [],
  currentUser: null,
  loading: false,
  error: null,
};

export const fetchUsers = createAsyncThunk("users/fetchAll", async () => {
  return await api.getUsers();
});

export const fetchUser = createAsyncThunk(
  "users/fetchOne",
  async (id: string) => {
    return await api.getUser(id);
  }
);

export const updateUserRole = createAsyncThunk(
  "users/updateRole",
  async ({ id, role }: { id: string; role: string }) => {
    await api.updateUserRole(id, role);
    return { id, role };
  }
);

export const deleteUser = createAsyncThunk(
  "users/delete",
  async (id: string) => {
    await api.deleteUser(id);
    return id;
  }
);

export const createUser = createAsyncThunk(
  "users/create",
  async (payload: CreateUserPayload) => {
    return await api.createUser(payload);
  }
);

export const updateUser = createAsyncThunk(
  "users/update",
  async ({ id, ...payload }: UpdateUserPayload) => {
    return await api.updateUser(id, payload);
  }
);

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Failed to load users";
      })
      .addCase(fetchUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = action.payload;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Failed to load user";
      })
      .addCase(updateUserRole.fulfilled, (state, action) => {
        const idx = state.users.findIndex((u) => u.id === action.payload.id);
        if (idx !== -1) state.users[idx].role = action.payload.role as UserWithStats["role"];
        if (state.currentUser?.id === action.payload.id && state.currentUser) {
          state.currentUser.role = action.payload.role as UserWithStats["role"];
        }
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.users = state.users.filter((u) => u.id !== action.payload);
        if (state.currentUser?.id === action.payload) state.currentUser = null;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.users.unshift(action.payload);
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        const idx = state.users.findIndex((u) => u.id === action.payload.id);
        if (idx !== -1) state.users[idx] = action.payload;
        if (state.currentUser?.id === action.payload.id) state.currentUser = action.payload;
      });
  },
});

export default usersSlice.reducer;
