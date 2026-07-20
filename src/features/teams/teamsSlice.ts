import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { TeamsState } from "../../types";
import { api } from "../../services/api";

const initialState: TeamsState = {
  teams: [],
  loading: false,
  error: null,
};

export const fetchTeams = createAsyncThunk("teams/fetchAll", async () => {
  return await api.getTeams();
});

export const createTeam = createAsyncThunk(
  "teams/create",
  async (name: string) => {
    return await api.createTeam(name);
  }
);

export const updateTeam = createAsyncThunk(
  "teams/update",
  async ({ id, name }: { id: string; name: string }) => {
    return await api.updateTeam(id, name);
  }
);

export const deleteTeam = createAsyncThunk(
  "teams/delete",
  async (id: string) => {
    await api.deleteTeam(id);
    return id;
  }
);

const teamsSlice = createSlice({
  name: "teams",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeams.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeams.fulfilled, (state, action) => {
        state.loading = false;
        state.teams = action.payload;
      })
      .addCase(fetchTeams.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Failed to load teams";
      })
      .addCase(createTeam.fulfilled, (state, action) => {
        state.teams.push(action.payload);
      })
      .addCase(updateTeam.fulfilled, (state, action) => {
        const idx = state.teams.findIndex((t) => t.id === action.payload.id);
        if (idx !== -1) state.teams[idx] = action.payload;
      })
      .addCase(deleteTeam.fulfilled, (state, action) => {
        state.teams = state.teams.filter((t) => t.id !== action.payload);
      });
  },
});

export default teamsSlice.reducer;
