import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import activityReducer from '../features/activity/activitySlice'
import authReducer from '../features/auth/authSlice'
import ActivityTimeline from './ActivityTimeline'

vi.mock('../services/api', () => ({
  api: {
    getActivity: vi.fn(),
    getComments: vi.fn().mockResolvedValue([]),
  },
}))

function createStore(logs: any[] = []) {
  return configureStore({
    reducer: { activity: activityReducer, auth: authReducer },
    preloadedState: {
      activity: { logs, loading: false, error: null },
      auth: { user: null, loading: false, error: null },
    },
  })
}

describe('ActivityTimeline', () => {
  it('renders "No activity recorded yet." when empty', async () => {
    const { api } = await import('../services/api')
    vi.mocked(api.getActivity).mockResolvedValue([])

    render(
      <Provider store={createStore()}>
        <ActivityTimeline taskId="t1" />
      </Provider>,
    )
    expect(screen.getByText('Activity')).toBeInTheDocument()
    expect(await screen.findByText('No activity recorded yet.')).toBeInTheDocument()
  })

  it('renders activity log entries', async () => {
    const { api } = await import('../services/api')
    vi.mocked(api.getActivity).mockResolvedValue([
      { id: 'a1', action: 'task.created', user_id: 'u1', user_name: 'Alice', createdAt: '2026-07-01T12:00:00Z', details: null },
    ])

    render(
      <Provider store={createStore()}>
        <ActivityTimeline taskId="t1" />
      </Provider>,
    )
    expect(await screen.findByText('Created')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('maps known action labels', async () => {
    const { api } = await import('../services/api')
    vi.mocked(api.getActivity).mockResolvedValue([
      { id: 'a2', action: 'task.assigned', user_id: 'u2', user_name: 'Bob', createdAt: '2026-07-02T12:00:00Z', details: null },
    ])

    render(
      <Provider store={createStore()}>
        <ActivityTimeline taskId="t1" />
      </Provider>,
    )
    expect(await screen.findByText('Assigned')).toBeInTheDocument()
  })
})
