import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import todosReducer from '../features/todo/todoSlice'
import authReducer from '../features/auth/authSlice'
import DashboardPage from './DashboardPage'
import type { TodoState } from '../types'

function createStore() {
  return configureStore({
    reducer: { todos: todosReducer, auth: authReducer },
    preloadedState: {
      todos: {
        tasks: [],
        statusFilter: 'All', priorityFilter: 'All', searchQuery: '',
        sortBy: 'createdAt', sortOrder: 'desc',
        loading: false, error: null,
        total: 0, page: 1, pages: 1,
        stats: {
          byStatus: { Pending: 2, 'In Progress': 1, Done: 3 },
          byPriority: { Low: 1, Medium: 3, High: 2 },
          total: 6,
          overdue: 1,
        },
      } as TodoState,
      auth: { user: null, loading: false, error: null },
    },
  })
}

describe('DashboardPage', () => {
  it('renders stat cards and chart headings', () => {
    render(
      <Provider store={createStore()}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </Provider>,
    )
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
    expect(screen.getByText('Overdue')).toBeInTheDocument()
    expect(screen.getByText('Tasks by Status')).toBeInTheDocument()
    expect(screen.getByText('Tasks by Priority')).toBeInTheDocument()
    expect(screen.getByText('Recent Tasks')).toBeInTheDocument()
  })
})
