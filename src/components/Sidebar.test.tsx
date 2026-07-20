import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'
import Sidebar from './Sidebar'
import type { User } from '../types'

function createStore(user: User | null = null) {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: { user, loading: false, error: null } },
  })
}

function renderWith(store = createStore()) {
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    </Provider>,
  )
}

describe('Sidebar', () => {
  it('shows Dashboard and Tasks for User role', () => {
    renderWith(createStore({ id: 'u1', name: 'Test', email: 'a@b.com', role: 'User', team_id: null, createdAt: '' }))
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Tasks')).toBeInTheDocument()
    expect(screen.queryByText('Users')).not.toBeInTheDocument()
  })

  it('shows Dashboard and Tasks for Manager role', () => {
    renderWith(createStore({ id: 'u1', name: 'Test', email: 'a@b.com', role: 'Manager', team_id: null, createdAt: '' }))
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Tasks')).toBeInTheDocument()
    expect(screen.queryByText('Users')).not.toBeInTheDocument()
  })

  it('shows Users link for Admin role', () => {
    renderWith(createStore({ id: 'u1', name: 'Test', email: 'a@b.com', role: 'Admin', team_id: null, createdAt: '' }))
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Tasks')).toBeInTheDocument()
    expect(screen.getByText('Users')).toBeInTheDocument()
  })
})
