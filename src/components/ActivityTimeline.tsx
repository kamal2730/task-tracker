import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../store";
import { fetchActivity } from "../features/activity/activitySlice";

interface Props {
  taskId: string;
}

const ACTION_LABELS: Record<string, string> = {
  "task.created": "Created",
  "task.updated": "Updated",
  "task.assigned": "Assigned",
  "task.deleted": "Deleted",
  "comment.added": "Comment added",
  "comment.deleted": "Comment deleted",
};

export default function ActivityTimeline({ taskId }: Props) {
  const dispatch = useAppDispatch();
  const { logs, loading } = useAppSelector((s) => s.activity);

  useEffect(() => {
    dispatch(fetchActivity(taskId));
  }, [taskId]);

  return (
    <div className="activity-timeline">
      <h3>Activity</h3>
      {loading && <div className="loading-spinner">Loading activity...</div>}
      {logs.length === 0 && !loading && (
        <p className="no-tasks-message">No activity recorded yet.</p>
      )}
      <div className="timeline-list">
        {logs.map((log) => (
          <div key={log.id} className="timeline-item">
            <div className="timeline-dot" />
            <div className="timeline-content">
              <div className="timeline-header">
                <span className="timeline-action">
                  {ACTION_LABELS[log.action] || log.action}
                </span>
                <span className="timeline-user">{log.user_name}</span>
                <span className="timeline-date">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
              {log.details && <p className="timeline-details">{log.details}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
