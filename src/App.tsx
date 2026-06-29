import { useState, useEffect } from 'react';
import { useTasks } from './utils/useTasks';
import { useAppDispatch } from './store';
import { fetchTasks } from './features/todo/todoSlice';
import TaskList from './components/TaskList';
import './App.css';
import ThemeToggle from './components/ThemeToggle';

export default function App() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchTasks());
  }, [dispatch]);

  const {
    tasks,
    statusFilter,
    handleSetStatusFilter,
    searchQuery,
    handleSetSearchQuery,
    statusCounts,
    handleAddTask,
    handleUpdateTask,
    handleDeleteTask,
    loading,
    error,
  } = useTasks();

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('task_tracker_theme') === 'dark';
  });

  useEffect(() => {
    document.body.classList.toggle('dark', isDarkMode);
    localStorage.setItem('task_tracker_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  return (
    <div className="app-layout">
      <header className="app-header">
        <ThemeToggle 
          isDarkMode={isDarkMode} 
          onToggle={() => setIsDarkMode(!isDarkMode)} 
        />
      </header>

      <main className="app-main-content">
        <section>
          <TaskList
            tasks={tasks}
            statusFilter={statusFilter}
            onStatusFilterChange={handleSetStatusFilter}
            searchQuery={searchQuery}
            onSearchChange={handleSetSearchQuery}
            statusCounts={statusCounts}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            loading={loading}
            error={error}
          />
        </section>
      </main>
    </div>
  );
}
