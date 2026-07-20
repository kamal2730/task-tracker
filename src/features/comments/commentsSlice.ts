import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { CommentsState } from "../../types";
import { api } from "../../services/api";

const initialState: CommentsState = {
  comments: [],
  loading: false,
  error: null,
};

export const fetchComments = createAsyncThunk(
  "comments/fetch",
  async (taskId: string) => {
    return await api.getComments(taskId);
  }
);

export const addComment = createAsyncThunk(
  "comments/add",
  async ({ taskId, content }: { taskId: string; content: string }) => {
    return await api.addComment(taskId, content);
  }
);

export const deleteComment = createAsyncThunk(
  "comments/delete",
  async (commentId: string) => {
    await api.deleteComment(commentId);
    return commentId;
  }
);

const commentsSlice = createSlice({
  name: "comments",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchComments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchComments.fulfilled, (state, action) => {
        state.loading = false;
        state.comments = action.payload;
      })
      .addCase(fetchComments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Failed to load comments";
      })
      .addCase(addComment.fulfilled, (state, action) => {
        state.comments.push(action.payload);
      })
      .addCase(deleteComment.fulfilled, (state, action) => {
        state.comments = state.comments.filter((c) => c.id !== action.payload);
      });
  },
});

export default commentsSlice.reducer;
