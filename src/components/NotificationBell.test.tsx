import { describe, it, expect, vi } from 'vitest'
import type { UserRole } from '../types'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import notificationsReducer from '../features/notifications/notificationsSlice'
import authReducer from '../features/auth/authSlice'
import NotificationBell from './NotificationBell'

vi.mock('../services/api', () => ({
  api: {
    getUnreadCount: vi.fn().mockResolvedValue(0),
    getNotifications: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pages: 1 }),
  },
}))

function renderBell(unreadCount = 0) {
  const store = configureStore({
    reducer: {
      notifications: notificationsReducer,
      auth: authReducer,
    },
    preloadedState: {
      auth: { user: { id: 'u1', name: 'Test', email: 't@t.com', role: 'User' as UserRole, team_id: null, createdAt: '' }, loading: false, error: null },
      notifications: {
        notifications: [],
        total: 0,
        unreadCount,
        page: 1,
        pages: 1,
        loading: false,
        error: null,
        panelOpen: false,
      },
    },
  })
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    </Provider>,
  )
}

describe('NotificationBell', () => {
  it('renders the bell icon', () => {
    renderBell()
    expect(screen.getByLabelText('Notifications')).toBeInTheDocument()
  })

  it('shows unread badge when count > 0', () => {
    renderBell(5)
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('hides badge when count is 0', () => {
    renderBell(0)
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('shows 99+ for counts > 99', () => {
    renderBell(150)
    expect(screen.getByText('99+')).toBeInTheDocument()
  })

  it('opens panel on click', async () => {
    renderBell()
    const btn = screen.getByLabelText('Notifications')
    btn.click()
    expect(await screen.findByText('Notifications')).toBeInTheDocument()
  })
})
