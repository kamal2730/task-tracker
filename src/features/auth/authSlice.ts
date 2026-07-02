import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { AuthState, LoginPayload, RegisterPayload } from "../../types";
import { api } from "../../services/api";

function loadFromStorage() {
  const token = localStorage.getItem("task_tracker_token");
  const user = localStorage.getItem("task_tracker_user");
  return {
    token: token || null,
    user: user ? JSON.parse(user) : null,
  };
}

const { token, user } = loadFromStorage();

const initialState: AuthState = {
  user,
  token,
  loading: false,
  error: null,
};

export const loginAsync = createAsyncThunk(
  "auth/login",
  async (payload: LoginPayload) => {
    const data = await api.login(payload);
    localStorage.setItem("task_tracker_token", data.access_token);
    localStorage.setItem("task_tracker_user", JSON.stringify(data.user));
    return data;
  }
);

export const registerAsync = createAsyncThunk(
  "auth/register",
  async (payload: RegisterPayload) => {
    const data = await api.register(payload);
    localStorage.setItem("task_tracker_token", data.access_token);
    localStorage.setItem("task_tracker_user", JSON.stringify(data.user));
    return data;
  }
);

export const checkAuth = createAsyncThunk(
  "auth/check",
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as { auth: AuthState };
    if (!state.auth.token) return rejectWithValue("No token");
    try {
      const user = await api.getProfile();
      return user;
    } catch {
      localStorage.removeItem("task_tracker_token");
      localStorage.removeItem("task_tracker_user");
      return rejectWithValue("Token expired");
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.error = null;
      localStorage.removeItem("task_tracker_token");
      localStorage.removeItem("task_tracker_user");
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.access_token;
        state.user = action.payload.user;
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Login failed";
      })
      .addCase(registerAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.access_token;
        state.user = action.payload.user;
      })
      .addCase(registerAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Registration failed";
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(checkAuth.rejected, (state) => {
        state.user = null;
        state.token = null;
      });
  },
});

export const { logout, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
