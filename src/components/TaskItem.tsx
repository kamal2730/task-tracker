import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Task, TaskStatus, TaskPriority } from '../types';
import { STATUS_COLORS } from '../utils/constants';
import ConfirmDialog from './ConfirmDialog';

interface TaskItemProps {
  task: Task;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
}

const STATUS_ORDER: TaskStatus[] = ['Pending', 'In Progress', 'Done'];

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  'Pending': 'In Progress',
  'In Progress': 'Done',
  'Done': 'Pending',
};

const NEXT_PRIORITY: Record<TaskPriority, TaskPriority> = {
  'Low': 'Medium',
  'Medium': 'High',
  'High': 'Low',
};

export default function TaskItem({ task, onUpdate, onDelete }: TaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || '');
  const [editPriority, setEditPriority] = useState<TaskPriority>(task.priority);
  const [editDueDate, setEditDueDate] = useState(task.dueDate || '');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      setEditTitle(task.title);
      setEditDescription(task.description || '');
      setEditPriority(task.priority);
      setEditDueDate(task.dueDate || '');
    }
  }, [isExpanded, task.title, task.description, task.priority, task.dueDate]);

  const handleSave = () => {
    if (!editTitle.trim()) return;
    onUpdate(task.id, {
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      priority: editPriority,
      dueDate: editDueDate || undefined,
    });
    setIsExpanded(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsExpanded(!isExpanded);
    }
    if (e.key === 'Escape' && isExpanded) {
      setIsExpanded(false);
    }
  };

  return (
    <div className={`task-item${isExpanded ? ' expanded' : ''}`}>
      <div
        className="task-item-main"
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
      >
        <span
          className={`priority-badge priority-${task.priority.toLowerCase()}`}
          style={{ cursor: 'pointer' }}
          onClick={(e) => { e.stopPropagation(); onUpdate(task.id, { priority: NEXT_PRIORITY[task.priority] }); }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onUpdate(task.id, { priority: NEXT_PRIORITY[task.priority] }); } }}
        >{task.priority}</span>
        <Link
          to={`/tasks/${task.id}`}
          className="task-title"
          onClick={(e) => e.stopPropagation()}
        >{task.title}</Link>
        <Link
          to={`/users/${task.assigned_to || task.user_id}`}
          className="task-assignee-avatar"
          onClick={(e) => e.stopPropagation()}
          title={task.assigned_to_name || task.user_name}
        >
          {(task.assigned_to_name || task.user_name).charAt(0).toUpperCase()}
        </Link>
        {task.dueDate && <span className="due-date">{new Date(task.dueDate).toLocaleDateString()}</span>}
        <span
          className="status-circle"
          style={{ backgroundColor: STATUS_COLORS[task.status] }}
          onClick={(e) => { e.stopPropagation(); onUpdate(task.id, { status: NEXT_STATUS[task.status] }); }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onUpdate(task.id, { status: NEXT_STATUS[task.status] }); } }}
        />
      </div>

      {task.description && (
        <div className="task-description-preview">{task.description}</div>
      )}

      {isExpanded && (
        <div className="task-expanded-content" onClick={(e) => e.stopPropagation()}>
          <div className="expanded-section">
            <div className="status-selector">
              {STATUS_ORDER.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`status-option ${task.status === s ? 'active' : ''}`}
                  onClick={() => onUpdate(task.id, { status: s })}
                >
                  <span className="status-dot" style={{ backgroundColor: STATUS_COLORS[s] }} />
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="expanded-section">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Task title"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            />
          </div>

          <div className="expanded-section">
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Add a description..."
              rows={2}
            />
          </div>

          <div className="expanded-section">
            <select
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <div className="expanded-section">
            <input
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
            />
          </div>

          <div className="expanded-actions">
            <button type="button" className="btn-save" onClick={handleSave}>Save</button>
            <button type="button" className="btn-delete" onClick={() => setShowConfirm(true)}>Delete</button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showConfirm}
        title="Delete Task"
        message={`Are you sure you want to delete "${task.title}"?`}
        onConfirm={() => { onDelete(task.id); setShowConfirm(false); }}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
