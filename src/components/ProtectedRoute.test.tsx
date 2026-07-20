import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'
import ProtectedRoute from './ProtectedRoute'
import type { User } from '../types'

function createStore(user: User | null = null) {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: { user, loading: false, error: null } },
  })
}

function renderWith(store = createStore(), roles?: string[]) {
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <ProtectedRoute roles={roles}>
          <div data-testid="protected-child">Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    </Provider>,
  )
}

describe('ProtectedRoute', () => {
  it('renders children when user is authenticated', () => {
    renderWith(createStore({ id: 'u1', name: 'Test', email: 'a@b.com', role: 'User', team_id: null, createdAt: '' }))
    expect(screen.getByTestId('protected-child')).toBeInTheDocument()
  })

  it('redirects when user is null', () => {
    renderWith(createStore(null))
    expect(screen.queryByTestId('protected-child')).not.toBeInTheDocument()
  })

  it('redirects when role is not allowed', () => {
    renderWith(
      createStore({ id: 'u1', name: 'Test', email: 'a@b.com', role: 'User', team_id: null, createdAt: '' }),
      ['Admin'],
    )
    expect(screen.queryByTestId('protected-child')).not.toBeInTheDocument()
  })

  it('renders children when role matches', () => {
    renderWith(
      createStore({ id: 'u1', name: 'Test', email: 'a@b.com', role: 'Admin', team_id: null, createdAt: '' }),
      ['Admin'],
    )
    expect(screen.getByTestId('protected-child')).toBeInTheDocument()
  })

  it('allows any role when roles prop is not specified', () => {
    renderWith(createStore({ id: 'u1', name: 'Test', email: 'a@b.com', role: 'Manager', team_id: null, createdAt: '' }))
    expect(screen.getByTestId('protected-child')).toBeInTheDocument()
  })
})
