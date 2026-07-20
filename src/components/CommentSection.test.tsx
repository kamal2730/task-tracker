import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import commentsReducer from '../features/comments/commentsSlice'
import authReducer from '../features/auth/authSlice'
import CommentSection from './CommentSection'

vi.mock('../services/api', () => ({
  api: {
    getComments: vi.fn(),
    addComment: vi.fn(),
    deleteComment: vi.fn(),
  },
}))

function createStore(comments: any[] = [], user: any = null) {
  return configureStore({
    reducer: { comments: commentsReducer, auth: authReducer },
    preloadedState: {
      comments: { comments, loading: false, error: null },
      auth: { user, loading: false, error: null },
    },
  })
}

describe('CommentSection', () => {
  it('renders "No comments yet." when empty', async () => {
    const { api } = await import('../services/api')
    vi.mocked(api.getComments).mockResolvedValue([])

    render(
      <Provider store={createStore()}>
        <CommentSection taskId="t1" />
      </Provider>,
    )
    expect(screen.getByText('Comments')).toBeInTheDocument()
    expect(await screen.findByText('No comments yet.')).toBeInTheDocument()
  })

  it('renders comment list', async () => {
    const { api } = await import('../services/api')
    vi.mocked(api.getComments).mockResolvedValue([
      { id: 'c1', content: 'Nice work!', createdAt: '2026-07-01T12:00:00Z', user_id: 'u1', user_name: 'Alice' },
    ])

    render(
      <Provider store={createStore()}>
        <CommentSection taskId="t1" />
      </Provider>,
    )
    expect(await screen.findByText('Nice work!')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })
})
