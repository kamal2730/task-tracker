import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import todosReducer from '../features/todo/todoSlice'
import authReducer from '../features/auth/authSlice'
import TaskListPage from './TaskListPage'
import type { TodoState } from '../types'

vi.mock('../services/api', () => ({
  api: {
    getTasks: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pages: 1 }),
  },
}))

function createStore() {
  return configureStore({
    reducer: { todos: todosReducer, auth: authReducer },
    preloadedState: {
      todos: {
        tasks: [],
        statusFilter: 'All', priorityFilter: 'All', searchQuery: '',
        sortBy: 'createdAt', sortOrder: 'desc',
        loading: false, error: null, stats: null,
        total: 15, page: 1, pages: 3,
      } as TodoState,
      auth: { user: null, loading: false, error: null },
    },
  })
}

describe('TaskListPage', () => {
  it('shows pagination when multiple pages exist', () => {
    render(
      <Provider store={createStore()}>
        <MemoryRouter>
          <TaskListPage />
        </MemoryRouter>
      </Provider>,
    )
    expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument()
    expect(screen.getByText(/15 tasks/)).toBeInTheDocument()
    expect(screen.getByText(/Prev/)).toBeDisabled()
    expect(screen.getByText(/Next/)).not.toBeDisabled()
  })
})
