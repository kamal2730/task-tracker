import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'
import AuthModal from './AuthModal'

function createStore(initial?: Partial<ReturnType<typeof authReducer>>) {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: { user: null, token: null, loading: false, error: null, ...initial } },
  })
}

function renderWithStore(store = createStore()) {
  return render(
    <Provider store={store}>
      <AuthModal />
    </Provider>,
  )
}

describe('AuthModal', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should render login form by default', () => {
    renderWithStore()
    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Name')).not.toBeInTheDocument()
  })

  it('should toggle to register form', () => {
    renderWithStore()
    fireEvent.click(screen.getByText('Register here'))
    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Confirm password')).toBeInTheDocument()
  })

  it('should show validation error for empty email on login submit', () => {
    renderWithStore()
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))
    expect(screen.getByText('Email is required')).toBeInTheDocument()
  })

  it('should show validation error for empty password on login submit', () => {
    renderWithStore()
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'a@b.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))
    expect(screen.getByText('Password is required')).toBeInTheDocument()
  })

  it('should show validation error for missing name on register', () => {
    renderWithStore()
    fireEvent.click(screen.getByText('Register here'))
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }))
    expect(screen.getByText('Name is required')).toBeInTheDocument()
  })

  it('should show validation error for short password on register', () => {
    renderWithStore()
    fireEvent.click(screen.getByText('Register here'))
    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'Test' } })
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'ab' } })
    fireEvent.change(screen.getByPlaceholderText('Confirm password'), { target: { value: 'ab' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }))
    expect(screen.getByText('Password must be at least 4 characters')).toBeInTheDocument()
  })

  it('should show validation error for mismatched passwords', () => {
    renderWithStore()
    fireEvent.click(screen.getByText('Register here'))
    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'Test' } })
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: '12345' } })
    fireEvent.change(screen.getByPlaceholderText('Confirm password'), { target: { value: '12346' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }))
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
  })

  it('should show server error from Redux state after dispatch', () => {
    const store = createStore()
    renderWithStore(store)

    act(() => {
      store.dispatch({ type: 'auth/login/rejected', error: { message: 'Invalid email or password' } })
    })

    expect(screen.getByText('Invalid email or password')).toBeInTheDocument()
  })

  it('should disable submit button while loading', () => {
    const store = createStore({ loading: true })
    renderWithStore(store)
    expect(screen.getByRole('button', { name: 'Signing in...' })).toBeDisabled()
  })
})
