import { describe, it, expect } from 'vitest'
import notificationsReducer, {
  togglePanel, closePanel, clearNotifications,
  fetchNotifications, markAsRead, markAllAsRead, deleteNotification,
} from './notificationsSlice'
import type { NotificationsState, Notification } from '../../types'

const initialState: NotificationsState = {
  notifications: [],
  total: 0,
  unreadCount: 0,
  page: 1,
  pages: 1,
  loading: false,
  error: null,
  panelOpen: false,
}

const mockNotification: Notification = {
  id: 'n1',
  recipient_id: 'u1',
  task_id: 't1',
  type: 'TASK_ASSIGNED',
  title: 'Task Assigned',
  message: 'You have been assigned to Task: API Integration.',
  is_read: false,
  createdAt: '2026-07-20T12:00:00Z',
}

describe('notificationsSlice', () => {
  describe('reducers', () => {
    it('toggles panel', () => {
      const state = notificationsReducer(initialState, togglePanel())
      expect(state.panelOpen).toBe(true)
      const next = notificationsReducer(state, togglePanel())
      expect(next.panelOpen).toBe(false)
    })

    it('closes panel', () => {
      const open = { ...initialState, panelOpen: true }
      const state = notificationsReducer(open, closePanel())
      expect(state.panelOpen).toBe(false)
    })

    it('clears notifications', () => {
      const populated: NotificationsState = {
        ...initialState,
        notifications: [mockNotification],
        total: 1,
        panelOpen: true,
      }
      const state = notificationsReducer(populated, clearNotifications())
      expect(state.notifications).toEqual([])
      expect(state.total).toBe(0)
      expect(state.panelOpen).toBe(false)
    })
  })

  describe('extraReducers', () => {
    it('fetchNotifications.pending', () => {
      const state = notificationsReducer(initialState, { type: fetchNotifications.pending.type })
      expect(state.loading).toBe(true)
      expect(state.error).toBeNull()
    })

    it('fetchNotifications.fulfilled page 1', () => {
      const payload = { items: [mockNotification], total: 1, page: 1, pages: 1 }
      const state = notificationsReducer(initialState, {
        type: fetchNotifications.fulfilled.type,
        payload,
      })
      expect(state.loading).toBe(false)
      expect(state.notifications).toEqual([mockNotification])
      expect(state.total).toBe(1)
      expect(state.page).toBe(1)
    })

    it('fetchNotifications.fulfilled page 2 appends', () => {
      const page1: NotificationsState = {
        ...initialState,
        notifications: [mockNotification],
        page: 1,
      }
      const notif2: Notification = { ...mockNotification, id: 'n2' }
      const payload = { items: [notif2], total: 2, page: 2, pages: 2 }
      const state = notificationsReducer(page1, {
        type: fetchNotifications.fulfilled.type,
        payload,
      })
      expect(state.notifications).toHaveLength(2)
      expect(state.notifications[0].id).toBe('n1')
      expect(state.notifications[1].id).toBe('n2')
    })

    it('fetchNotifications.rejected', () => {
      const state = notificationsReducer(initialState, {
        type: fetchNotifications.rejected.type,
        error: { message: 'Network error' },
      })
      expect(state.loading).toBe(false)
      expect(state.error).toBe('Network error')
    })

    it('markAsRead.fulfilled', () => {
      const populated: NotificationsState = {
        ...initialState,
        notifications: [mockNotification],
      }
      const state = notificationsReducer(populated, {
        type: markAsRead.fulfilled.type,
        payload: 'n1',
      })
      expect(state.notifications[0].is_read).toBe(true)
    })

    it('markAllAsRead.fulfilled', () => {
      const populated: NotificationsState = {
        ...initialState,
        notifications: [mockNotification, { ...mockNotification, id: 'n2' }],
      }
      const state = notificationsReducer(populated, {
        type: markAllAsRead.fulfilled.type,
      })
      expect(state.notifications.every((n) => n.is_read)).toBe(true)
    })

    it('deleteNotification.fulfilled', () => {
      const populated: NotificationsState = {
        ...initialState,
        notifications: [mockNotification],
        total: 1,
      }
      const state = notificationsReducer(populated, {
        type: deleteNotification.fulfilled.type,
        payload: 'n1',
      })
      expect(state.notifications).toHaveLength(0)
      expect(state.total).toBe(0)
    })
  })
})
