import { useState } from 'react';
import { useTransition, animated } from 'react-spring';
import type { Task, TaskStatus, TaskPriority, AddTaskPayload, UpdateTaskPayload } from '../types';
import TaskItem from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  statusFilter: TaskStatus | 'All';
  onStatusFilterChange: (status: TaskStatus | 'All') => void;
  priorityFilter: TaskPriority | 'All';
  onPriorityFilterChange: (priority: TaskPriority | 'All') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: string;
  sortOrder: string;
  onSortChange: (sortBy: string, sortOrder: string) => void;
  statusCounts: Record<string, number>;
  onAddTask: (payload: AddTaskPayload) => void;
  onUpdateTask: (payload: UpdateTaskPayload) => void;
  onDeleteTask: (id: string) => void;
  loading: boolean;
  error: string | null;
}

const STATUS_OPTIONS: (TaskStatus | 'All')[] = ['All', 'Pending', 'In Progress', 'Done'];
const PRIORITY_OPTIONS: (TaskPriority | 'All')[] = ['All', 'Low', 'Medium', 'High'];

const SORT_OPTIONS = [
  { label: 'Newest', sortBy: 'createdAt', sortOrder: 'desc' },
  { label: 'Oldest', sortBy: 'createdAt', sortOrder: 'asc' },
  { label: 'Due Date', sortBy: 'dueDate', sortOrder: 'asc' },
  { label: 'Priority', sortBy: 'priority', sortOrder: 'desc' },
  { label: 'Title A-Z', sortBy: 'title', sortOrder: 'asc' },
];

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-row">
        <div className="skeleton-badge" />
        <div className="skeleton-line skeleton-line-title" />
        <div className="skeleton-circle" />
      </div>
      <div className="skeleton-line skeleton-line-desc" />
    </div>
  );
}

export default function TaskList({
  tasks,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  searchQuery,
  onSearchChange,
  sortBy,
  sortOrder,
  onSortChange,
  statusCounts,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  loading,
  error,
}: TaskListProps) {
  const [inputValue, setInputValue] = useState('');

  const currentSort = SORT_OPTIONS.find((o) => o.sortBy === sortBy && o.sortOrder === sortOrder) ?? SORT_OPTIONS[0];

  const handleInputChange = (value: string) => {
    setInputValue(value);
    onSearchChange(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      onAddTask({ title: inputValue.trim() });
      setInputValue('');
      onSearchChange('');
    }
  };

  const hasText = inputValue.trim().length > 0;

  const transitions = useTransition(tasks, {
    keys: (task: Task) => task.id,
    from: { opacity: 0, transform: 'translateY(-8px)' },
    enter: { opacity: 1, transform: 'translateY(0)' },
    leave: { opacity: 0, transform: 'translateY(-8px)' },
    config: { tension: 200, friction: 25 },
  });

  return (
    <div>
      <div className="unified-input-wrapper">
        <span className="unified-input-icon">+</span>
        <input
          type="text"
          placeholder="Add a task or search..."
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="unified-input"
        />
        {hasText && <span className="unified-input-hint">&#x23CE; add</span>}
      </div>

      <div className="task-controls">
        <div className="filter-buttons">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => onStatusFilterChange(option)}
              className={`filter-btn ${statusFilter === option ? 'active' : ''}`}
            >
              {option}{statusCounts[option] !== undefined ? ` (${statusCounts[option]})` : ''}
            </button>
          ))}
        </div>
        <div className="filter-buttons">
          {PRIORITY_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => onPriorityFilterChange(option)}
              className={`filter-btn ${priorityFilter === option ? 'active' : ''}`}
            >
              {option}
            </button>
          ))}
        </div>
        <select
          className="sort-select"
          value={`${currentSort.sortBy}-${currentSort.sortOrder}`}
          onChange={(e) => {
            const opt = SORT_OPTIONS.find((o) => `${o.sortBy}-${o.sortOrder}` === e.target.value);
            if (opt) onSortChange(opt.sortBy, opt.sortOrder);
          }}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={`${opt.sortBy}-${opt.sortOrder}`} value={`${opt.sortBy}-${opt.sortOrder}`}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      {loading && tasks.length === 0 && (
        <div className="skeleton-container">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!loading && (
      <div className="task-items-grid">
        {transitions((style, task) => (
          <animated.div style={style}>
            <TaskItem
              key={task.id}
              task={task}
              onUpdate={(id, updates) => onUpdateTask({ id, updates })}
              onDelete={onDeleteTask}
            />
          </animated.div>
        ))}
        {tasks.length === 0 && !error && (
          <div className="empty-state">
            <span className="empty-state-icon">
              {searchQuery ? "🔍" : statusFilter !== "All" ? "📋" : "📝"}
            </span>
            <p className="empty-state-text">
              {searchQuery
                ? `No tasks matching "${searchQuery}"`
                : statusFilter !== 'All'
                ? `No tasks with status "${statusFilter}"`
                : 'No tasks yet. Create your first task by typing above and pressing Enter.'}
            </p>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
