import { useState } from 'react';
import { useTransition, animated } from 'react-spring';
import type { Task, TaskStatus, AddTaskPayload, UpdateTaskPayload } from '../types';
import TaskItem from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  statusFilter: TaskStatus | 'All';
  onStatusFilterChange: (status: TaskStatus | 'All') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusCounts: Record<string, number>;
  onAddTask: (payload: AddTaskPayload) => void;
  onUpdateTask: (payload: UpdateTaskPayload) => void;
  onDeleteTask: (id: string) => void;
  loading: boolean;
  error: string | null;
}

export default function TaskList({
  tasks,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchChange,
  statusCounts,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  loading,
  error,
}: TaskListProps) {
  const [inputValue, setInputValue] = useState('');

  const filterOptions: (TaskStatus | 'All')[] = ['All', 'Pending', 'In Progress', 'Done'];

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
          {filterOptions.map((option) => (
            <button
              key={option}
              onClick={() => onStatusFilterChange(option)}
              className={`filter-btn ${statusFilter === option ? 'active' : ''}`}
            >
              {option}{statusCounts[option] !== undefined ? ` (${statusCounts[option]})` : ''}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      {loading && tasks.length === 0 && (
        <div className="loading-spinner">Loading tasks...</div>
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
        {tasks.length === 0 && (
          <p className="no-tasks-message">
            {searchQuery
              ? `No tasks matching "${searchQuery}"`
              : statusFilter !== 'All'
              ? `No tasks with status "${statusFilter}".`
              : 'No tasks yet. Type above and press Enter to add one.'}
          </p>
        )}
      </div>
      )}
    </div>
  );
}