import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { ActivityState } from "../../types";
import { api } from "../../services/api";

const initialState: ActivityState = {
  logs: [],
  loading: false,
  error: null,
};

export const fetchActivity = createAsyncThunk(
  "activity/fetch",
  async (taskId: string) => {
    return await api.getActivity(taskId);
  }
);

const activitySlice = createSlice({
  name: "activity",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchActivity.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.logs = [];
      })
      .addCase(fetchActivity.fulfilled, (state, action) => {
        state.loading = false;
        state.logs = action.payload;
      })
      .addCase(fetchActivity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Failed to load activity";
      });
  },
});

export default activitySlice.reducer;
