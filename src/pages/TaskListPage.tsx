import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../store";
import { setPage } from "../features/todo/todoSlice";
import TaskList from "../components/TaskList";
import { useTasks } from "../utils/useTasks";

type TaskView = "my" | "team" | "all";

export default function TaskListPage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const page = useAppSelector((s) => s.todos.page);
  const pages = useAppSelector((s) => s.todos.pages);
  const total = useAppSelector((s) => s.todos.total);
  const statusFilter = useAppSelector((s) => s.todos.statusFilter);
  const priorityFilter = useAppSelector((s) => s.todos.priorityFilter);
  const searchQuery = useAppSelector((s) => s.todos.searchQuery);
  const sortBy = useAppSelector((s) => s.todos.sortBy);
  const sortOrder = useAppSelector((s) => s.todos.sortOrder);

  const role = user?.role;
  const availableViews: TaskView[] =
    role === "Admin" ? ["all"] :
    role === "Manager" ? ["my", "team"] :
    ["my"];

  const viewLabels: Record<TaskView, string> = {
    my: "My Tasks",
    team: "My Team Tasks",
    all: "All Tasks",
  };

  const [taskView, setTaskView] = useState<TaskView>(availableViews[0]);

  const {
    tasks,
    handleSetStatusFilter,
    handleSetPriorityFilter,
    handleSetSearchQuery,
    handleSetSort,
    statusCounts,
    handleAddTask,
    handleUpdateTask,
    handleDeleteTask,
    fetchWithFilters,
    loading,
    error,
  } = useTasks();

  useEffect(() => {
    const overrides: Record<string, string | number | undefined> = {};
    if (taskView === "my" && role === "Manager" && user?.id) {
      overrides.assigned_to = user.id;
    }
    fetchWithFilters(overrides);
  }, [taskView, role, user?.id]);

  const goToPage = (p: number) => {
    dispatch(setPage(p));
    const overrides: Record<string, string | number | undefined> = { page: p };
    if (taskView === "my" && role === "Manager" && user?.id) {
      overrides.assigned_to = user.id;
    }
    fetchWithFilters(overrides);
  };

  const switchView = (view: TaskView) => {
    if (view === taskView) return;
    setTaskView(view);
    dispatch(setPage(1));
  };

  const noTeam = role === "Manager" && !user?.team_id;

  return (
    <div>
      {noTeam && (
        <div className="error-banner" style={{ marginBottom: "1rem" }}>
          You haven't been assigned to a team yet. Please contact an administrator to join one.
        </div>
      )}

      {availableViews.length > 1 && (
        <div className="task-view-tabs">
          {availableViews.map((v) => (
            <button
              key={v}
              className={`task-view-tab${taskView === v ? " active" : ""}`}
              onClick={() => switchView(v)}
            >
              {viewLabels[v]}
            </button>
          ))}
        </div>
      )}

      <TaskList
        tasks={tasks}
        statusFilter={statusFilter}
        onStatusFilterChange={handleSetStatusFilter}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={handleSetPriorityFilter}
        searchQuery={searchQuery}
        onSearchChange={handleSetSearchQuery}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSetSort}
        statusCounts={statusCounts}
        onAddTask={handleAddTask}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
        loading={loading}
        error={error}
      />

      {pages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
          >
            &larr; Prev
          </button>
          <span className="pagination-info">
            Page {page} of {pages} ({total} tasks)
          </span>
          <button
            className="pagination-btn"
            disabled={page >= pages}
            onClick={() => goToPage(page + 1)}
          >
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
