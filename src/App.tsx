import { useState, useEffect } from "react";
import { useTasks } from "./utils/useTasks";
import { useAppDispatch, useAppSelector } from "./store";
import { fetchTasks } from "./features/todo/todoSlice";
import { checkAuth } from "./features/auth/authSlice";
import TaskList from "./components/TaskList";
import AuthModal from "./components/AuthModal";
import UserMenu from "./components/UserMenu";
import ThemeToggle from "./components/ThemeToggle";
import ToastContainer from "./components/ToastContainer";
import "./App.css";

export default function App() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.token);
  const user = useAppSelector((state) => state.auth.user);

  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (token) {
      dispatch(checkAuth()).finally(() => setAuthChecked(true));
    } else {
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    if (token && user) {
      dispatch(fetchTasks());
    }
  }, [token, user]);

  const isAuthenticated = !!(token && user);

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
    return localStorage.getItem("task_tracker_theme") === "dark";
  });

  useEffect(() => {
    document.body.classList.toggle("dark", isDarkMode);
    localStorage.setItem("task_tracker_theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  return (
    <div className="app-layout">
      {!isAuthenticated && authChecked && <AuthModal />}

      <ToastContainer />

      <div className={`app-content ${!isAuthenticated && authChecked ? "app-blurred" : ""}`}>
        <header className="app-header">
          <div className="app-header-left">
            {isAuthenticated && <UserMenu />}
          </div>
          <div className="app-header-right">
            <ThemeToggle
              isDarkMode={isDarkMode}
              onToggle={() => setIsDarkMode(!isDarkMode)}
            />
          </div>
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
    </div>
  );
}
