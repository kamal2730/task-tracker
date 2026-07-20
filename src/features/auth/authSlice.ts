import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { AuthState, LoginPayload, RegisterPayload } from "../../types";
import { api, setAccessToken } from "../../services/api";

function loadFromStorage() {
  const user = localStorage.getItem("task_tracker_user");
  return { user: user ? JSON.parse(user) : null };
}

const { user } = loadFromStorage();

const initialState: AuthState = {
  user,
  loading: false,
  error: null,
};

export const loginAsync = createAsyncThunk(
  "auth/login",
  async (payload: LoginPayload) => {
    const data = await api.login(payload);
    setAccessToken(data.access_token);
    localStorage.setItem("task_tracker_user", JSON.stringify(data.user));
    return data.user;
  }
);

export const registerAsync = createAsyncThunk(
  "auth/register",
  async (payload: RegisterPayload) => {
    const data = await api.register(payload);
    setAccessToken(data.access_token);
    localStorage.setItem("task_tracker_user", JSON.stringify(data.user));
    return data.user;
  }
);

export const checkAuth = createAsyncThunk(
  "auth/check",
  async (_, { rejectWithValue }) => {
    try {
      const data = await api.refresh();
      setAccessToken(data.access_token);
      localStorage.setItem("task_tracker_user", JSON.stringify(data.user));
      return data.user;
    } catch {
      localStorage.removeItem("task_tracker_user");
      setAccessToken(null);
      return rejectWithValue("Session expired");
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.error = null;
      setAccessToken(null);
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
        state.user = action.payload;
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
        state.user = action.payload;
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
      });
  },
});

export const { logout, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
