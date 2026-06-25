import { useState, useEffect } from 'react';
import { useTasks } from './utils/useTasks';
import { storage } from './utils/storage';
import TaskList from './components/TaskList';
import './App.css';
import ThemeToggle from './components/ThemeToggle';

export default function App() {
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
  } = useTasks();

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => storage.getTheme());

  useEffect(() => {
    document.body.classList.toggle('dark', isDarkMode);
    storage.saveTheme(isDarkMode);
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
          />
        </section>
      </main>
    </div>
  );
}
