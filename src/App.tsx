import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "./store";
import { checkAuth } from "./features/auth/authSlice";
import { fetchTasks } from "./features/todo/todoSlice";
import AuthModal from "./components/AuthModal";
import UserMenu from "./components/UserMenu";
import ThemeToggle from "./components/ThemeToggle";
import Sidebar from "./components/Sidebar";
import NotificationBell from "./components/NotificationBell";
import ProtectedRoute from "./components/ProtectedRoute";
import ToastContainer from "./components/ToastContainer";
import DashboardPage from "./pages/DashboardPage";
import TaskListPage from "./pages/TaskListPage";
import TaskDetailPage from "./pages/TaskDetailPage";
import UserManagementPage from "./pages/UserManagementPage";
import TeamManagementPage from "./pages/TeamManagementPage";
import TeamDetailPage from "./pages/TeamDetailPage";
import UserDetailPage from "./pages/UserDetailPage";
import "./App.css";

function AppShell() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    dispatch(checkAuth()).finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (user && authChecked) {
      dispatch(fetchTasks());
    }
  }, [user, authChecked]);

  const isAuthenticated = !!(user && authChecked);

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
        {isAuthenticated && (
          <div className="app-sidebar-layout">
            <Sidebar />
            <div className="app-main-area">
              <header className="app-header">
                <div className="app-header-left">
                  <UserMenu />
                </div>
                <div className="app-header-right">
                  <NotificationBell />
                  <ThemeToggle
                    isDarkMode={isDarkMode}
                    onToggle={() => setIsDarkMode(!isDarkMode)}
                  />
                </div>
              </header>

              <main className="app-main-content">
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/tasks" element={<TaskListPage />} />
                  <Route
                    path="/tasks/:id"
                    element={
                      <ProtectedRoute>
                        <TaskDetailPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/users"
                    element={
                      <ProtectedRoute roles={["Admin"]}>
                        <UserManagementPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/users/:id"
                    element={
                      <ProtectedRoute roles={["Admin"]}>
                        <UserDetailPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/teams"
                    element={
                      <ProtectedRoute roles={["Admin"]}>
                        <TeamManagementPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/teams/:id"
                    element={
                      <ProtectedRoute roles={["Admin"]}>
                        <TeamDetailPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          </div>
        )}

        {!isAuthenticated && authChecked && (
          <div className="app-blurred-fallback">
            <p className="app-blurred-text">Sign in to access Task Tracker</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
