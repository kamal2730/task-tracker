import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../store";
import { fetchComments, addComment, deleteComment } from "../features/comments/commentsSlice";
import { showToast } from "../utils/toast";

interface Props {
  taskId: string;
}

export default function CommentSection({ taskId }: Props) {
  const dispatch = useAppDispatch();
  const { comments, loading } = useAppSelector((s) => s.comments);
  const currentUser = useAppSelector((s) => s.auth.user);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchComments(taskId));
  }, [taskId]);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await dispatch(addComment({ taskId, content: content.trim() })).unwrap();
      setContent("");
      showToast("Comment added", "success");
    } catch {
      showToast("Failed to add comment", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await dispatch(deleteComment(commentId)).unwrap();
      showToast("Comment deleted", "success");
    } catch {
      showToast("Failed to delete comment", "error");
    }
  };

  return (
    <div className="comment-section">
      <h3>Comments</h3>

      <div className="comment-form">
        <textarea
          className="comment-input"
          placeholder="Add a comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
        />
        <button
          className="btn-save"
          onClick={handleSubmit}
          disabled={!content.trim() || submitting}
        >
          {submitting ? "Posting..." : "Post Comment"}
        </button>
      </div>

      {loading && <div className="loading-spinner">Loading comments...</div>}

      <div className="comment-list">
        {comments.length === 0 && !loading && (
          <p className="no-tasks-message">No comments yet.</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="comment-item">
            <div className="comment-header">
              <span className="comment-author">{c.user_name}</span>
              <span className="comment-date">
                {new Date(c.createdAt).toLocaleDateString()}
              </span>
              {(currentUser?.id === c.user_id || currentUser?.role === "Admin") && (
                <button
                  className="btn-delete comment-delete"
                  onClick={() => handleDelete(c.id)}
                >
                  Delete
                </button>
              )}
            </div>
            <p className="comment-content">{c.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
