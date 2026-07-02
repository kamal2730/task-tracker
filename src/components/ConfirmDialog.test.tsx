import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ConfirmDialog from './ConfirmDialog'

describe('ConfirmDialog', () => {
  it('should render when open is true', () => {
    render(
      <ConfirmDialog
        open
        title="Delete Task"
        message="Are you sure?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(screen.getByText('Delete Task')).toBeInTheDocument()
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('should return null when open is false', () => {
    const { container } = render(
      <ConfirmDialog
        open={false}
        title="Delete Task"
        message="Are you sure?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('should call onConfirm when Delete is clicked', () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        open
        title="Delete"
        message="Sure?"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('should call onCancel when Cancel is clicked', () => {
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        open
        title="Delete"
        message="Sure?"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    )
    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('should call onCancel when overlay is clicked', () => {
    const onCancel = vi.fn()
    const { container } = render(
      <ConfirmDialog
        open
        title="Delete"
        message="Sure?"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    )
    fireEvent.click(container.firstElementChild!)
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('should disable buttons when loading', () => {
    render(
      <ConfirmDialog
        open
        title="Delete"
        message="Sure?"
        onConfirm={() => {}}
        onCancel={() => {}}
        loading
      />,
    )
    expect(screen.getByText('Deleting...')).toBeDisabled()
    expect(screen.getByText('Cancel')).toBeDisabled()
  })
})
