import { describe, it, expect, beforeEach } from 'vitest'
import authReducer, {
  logout,
  clearAuthError,
  loginAsync,
  registerAsync,
  checkAuth,
} from './authSlice'
import type { AuthState, User } from '../../types'

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
}

const mockUser: User = {
  id: 'u1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'User',
  team_id: null,
  createdAt: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  localStorage.clear()
})

describe('authSlice reducers', () => {
  it('should return the initial state', () => {
    const state = authReducer(undefined, { type: 'unknown' })
    expect(state).toEqual(initialState)
  })

  it('should handle logout', () => {
    const loggedIn: AuthState = {
      user: mockUser,
      loading: false,
      error: null,
    }
    localStorage.setItem('task_tracker_user', JSON.stringify(mockUser))

    const state = authReducer(loggedIn, logout())
    expect(state.user).toBeNull()
    expect(state.error).toBeNull()
    expect(localStorage.getItem('task_tracker_user')).toBeNull()
  })

  it('should handle clearAuthError', () => {
    const withError: AuthState = { ...initialState, error: 'Something went wrong' }
    const state = authReducer(withError, clearAuthError())
    expect(state.error).toBeNull()
  })
})

describe('authSlice thunk lifecycle', () => {
  it('should set loading on loginAsync.pending', () => {
    const state = authReducer(initialState, loginAsync.pending('', { email: 'a@b.com', password: 'p' }))
    expect(state.loading).toBe(true)
    expect(state.error).toBeNull()
  })

  it('should store user on loginAsync.fulfilled', () => {
    const state = authReducer(initialState, loginAsync.fulfilled(mockUser, '', { email: 'a@b.com', password: 'p' }))
    expect(state.loading).toBe(false)
    expect(state.user).toEqual(mockUser)
  })

  it('should set error on loginAsync.rejected', () => {
    const error = new Error('Invalid credentials')
    const state = authReducer(initialState, loginAsync.rejected(error, '', { email: 'a@b.com', password: 'p' }))
    expect(state.loading).toBe(false)
    expect(state.error).toBe('Invalid credentials')
  })

  it('should store user on registerAsync.fulfilled', () => {
    const state = authReducer(
      initialState,
      registerAsync.fulfilled(mockUser, '', { name: 'T', email: 'a@b.com', password: 'p' }),
    )
    expect(state.loading).toBe(false)
    expect(state.user).toEqual(mockUser)
  })

  it('should clear user on checkAuth.rejected', () => {
    const loggedIn: AuthState = { user: mockUser, loading: false, error: null }
    const error = new Error('Token expired')
    const state = authReducer(loggedIn, checkAuth.rejected(error, '', undefined))
    expect(state.user).toBeNull()
  })
})
