import { describe, it, expect } from 'vitest'
import todoReducer, {
  setSearchQuery,
  setStatusFilter,
  fetchTasks,
  addTaskAsync,
  updateTaskAsync,
  deleteTaskAsync,
} from './todoSlice'
import type { TodoState, Task } from '../../types'

const initialState: TodoState = {
  tasks: [],
  statusFilter: 'All',
  priorityFilter: 'All',
  searchQuery: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  loading: false,
  error: null,
  stats: null,
  total: 0,
  page: 1,
  pages: 1,
}

const sampleTask: Task = {
  id: '1',
  title: 'Test task',
  description: 'A description',
  status: 'Pending',
  priority: 'Medium',
  createdAt: '2026-01-01T00:00:00Z',
  user_id: 'u1',
  user_name: 'Test User',
}

describe('todoSlice reducers', () => {
  it('should return the initial state', () => {
    const state = todoReducer(undefined, { type: 'unknown' })
    expect(state).toEqual(initialState)
  })

  it('should handle setStatusFilter', () => {
    const state = todoReducer(initialState, setStatusFilter('Done'))
    expect(state.statusFilter).toBe('Done')
  })

  it('should handle setSearchQuery', () => {
    const state = todoReducer(initialState, setSearchQuery('buy groceries'))
    expect(state.searchQuery).toBe('buy groceries')
  })
})

describe('todoSlice thunk lifecycle', () => {
  it('should set loading on fetchTasks.pending', () => {
    const state = todoReducer(initialState, fetchTasks.pending('', undefined))
    expect(state.loading).toBe(true)
    expect(state.error).toBeNull()
  })

  it('should populate tasks on fetchTasks.fulfilled', () => {
    const tasks = [sampleTask]
    const payload = { items: tasks, total: 1, page: 1, pages: 1 }
    const state = todoReducer(initialState, fetchTasks.fulfilled(payload, '', undefined))
    expect(state.loading).toBe(false)
    expect(state.tasks).toEqual(tasks)
  })

  it('should set error on fetchTasks.rejected', () => {
    const error = new Error('Network error')
    const state = todoReducer(
      initialState,
      fetchTasks.rejected(error, '', undefined),
    )
    expect(state.loading).toBe(false)
    expect(state.error).toBe('Network error')
  })

  it('should add task on addTaskAsync.fulfilled', () => {
    const state = todoReducer(initialState, addTaskAsync.fulfilled(sampleTask, '', { title: 'Test' }))
    expect(state.tasks).toHaveLength(1)
    expect(state.tasks[0].title).toBe('Test task')
  })

  it('should update task on updateTaskAsync.fulfilled', () => {
    const existing = { ...sampleTask, id: '1' }
    const start: TodoState = { ...initialState, tasks: [existing] }
    const updated = { ...existing, title: 'Updated title' }

    const state = todoReducer(
      start,
      updateTaskAsync.fulfilled(updated, '', { id: '1', updates: { title: 'Updated title' } }),
    )
    expect(state.tasks[0].title).toBe('Updated title')
  })

  it('should remove task on deleteTaskAsync.fulfilled', () => {
    const start: TodoState = { ...initialState, tasks: [sampleTask] }
    const state = todoReducer(start, deleteTaskAsync.fulfilled('1', '', '1'))
    expect(state.tasks).toHaveLength(0)
  })

  it('should set error on addTaskAsync.rejected', () => {
    const error = new Error('Failed to add')
    const state = todoReducer(
      initialState,
      addTaskAsync.rejected(error, '', { title: 'Test' }),
    )
    expect(state.error).toBe('Failed to add')
  })
})
