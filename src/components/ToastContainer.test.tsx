import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import ToastContainer from './ToastContainer'
import { showToast } from '../utils/toast'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ToastContainer', () => {
  it('should return null when no toasts', () => {
    const { container } = render(<ToastContainer />)
    expect(container.innerHTML).toBe('')
  })

  it('should render a toast when showToast is called', () => {
    render(<ToastContainer />)

    act(() => {
      showToast('Task created', 'success')
    })

    expect(screen.getByText('Task created')).toBeInTheDocument()
  })

  it('should render error toast with correct class', () => {
    render(<ToastContainer />)

    act(() => {
      showToast('Something went wrong', 'error')
    })

    const toast = screen.getByText('Something went wrong').closest('.toast')
    expect(toast).toHaveClass('toast-error')
  })

  it('should auto-dismiss toast after 3 seconds', () => {
    render(<ToastContainer />)

    act(() => {
      showToast('Temp message', 'success')
    })

    expect(screen.getByText('Temp message')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(screen.queryByText('Temp message')).not.toBeInTheDocument()
  })

  it('should close toast when close button is clicked', () => {
    render(<ToastContainer />)

    act(() => {
      showToast('Dismiss me', 'success')
    })

    expect(screen.getByText('Dismiss me')).toBeInTheDocument()

    act(() => {
      screen.getByText('✕').click()
    })

    expect(screen.queryByText('Dismiss me')).not.toBeInTheDocument()
  })
})
