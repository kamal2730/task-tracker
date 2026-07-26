import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import todosReducer from '../features/todo/todoSlice'
import authReducer from '../features/auth/authSlice'
import commentsReducer from '../features/comments/commentsSlice'
import activityReducer from '../features/activity/activitySlice'
import TaskDetailPage from './TaskDetailPage'
import type { Task, UserWithStats, UserRole, TodoState } from '../types'

const mockTask: Task = {
  id: 't1',
  title: 'Test Task',
  description: 'A task for testing',
  status: 'Pending',
  priority: 'High',
  createdAt: '2026-07-01T12:00:00Z',
  assigned_to: null,
  assigned_to_name: null,
  user_id: 'u1',
  user_name: 'Alice',
}

const mockUsers: UserWithStats[] = [
  { id: 'u1', name: 'Alice', email: 'alice@test.com', role: 'User', team_id: null, createdAt: '', task_count: 2 },
  { id: 'u2', name: 'Bob', email: 'bob@test.com', role: 'User', team_id: null, createdAt: '', task_count: 1 },
]

vi.mock('../services/api', () => ({
  api: {
    getTask: vi.fn(),
    getUsers: vi.fn(),
    updateTask: vi.fn(),
    assignTask: vi.fn(),
    getTasks: vi.fn(),
    getComments: vi.fn().mockResolvedValue([]),
    getActivity: vi.fn().mockResolvedValue([]),
  },
}))

function createStore(userRole: UserRole, task?: Task, teamId?: string) {
  return configureStore({
    reducer: {
      todos: todosReducer,
      auth: authReducer,
      comments: commentsReducer,
      activity: activityReducer,
      teams: () => ({ teams: [], loading: false, error: null }),
    },
    preloadedState: {
      todos: {
        tasks: task ? [task] : [],
        statusFilter: 'All', priorityFilter: 'All', searchQuery: '',
        sortBy: 'createdAt', sortOrder: 'desc',
        loading: false, error: null, stats: null,
        total: 0, page: 1, pages: 1,
      } as TodoState,
      auth: {
        user: { id: 'u1', name: 'Alice', email: 'alice@test.com', role: userRole, team_id: teamId ?? null, createdAt: '' },
        loading: false, error: null,
      },
      comments: { comments: [], loading: false, error: null },
      activity: { logs: [], loading: false, error: null },
    },
  })
}

function renderPage(userRole: UserRole, teamId?: string) {
  return render(
    <Provider store={createStore(userRole, mockTask, teamId)}>
      <MemoryRouter initialEntries={['/tasks/t1']}>
        <Routes>
          <Route path="/tasks/:id" element={<TaskDetailPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )
}

describe('TaskDetailPage assignment', () => {
  it('shows assign dropdown for Admin', async () => {
    const { api } = await import('../services/api')
    vi.mocked(api.getTask).mockResolvedValue(mockTask)
    vi.mocked(api.getUsers).mockResolvedValue(mockUsers)

    renderPage('Admin')

    expect(await screen.findByText('Test Task')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Unassigned/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Alice/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Bob/ })).toBeInTheDocument()
  })

  it('shows assign dropdown for Manager', async () => {
    const { api } = await import('../services/api')
    vi.mocked(api.getTask).mockResolvedValue(mockTask)
    vi.mocked(api.getUsers).mockResolvedValue(mockUsers)

    renderPage('Manager', 'team1')

    expect(await screen.findByText('Test Task')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('hides assign dropdown for regular User', async () => {
    const { api } = await import('../services/api')
    vi.mocked(api.getTask).mockResolvedValue(mockTask)

    renderPage('User')

    expect(await screen.findByText('Test Task')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.getByText('Unassigned')).toBeInTheDocument()
  })
})
