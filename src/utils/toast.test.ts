import { describe, it, expect } from 'vitest'
import { showToast, subscribe } from './toast'

describe('toast pub/sub', () => {
  it('should call all subscribed listeners when showToast is called', () => {
    const calls: string[] = []
    const unsub = subscribe((event) => {
      calls.push(event.message)
    })

    showToast('Hello', 'success')
    expect(calls).toEqual(['Hello'])
    unsub()
  })

  it('should pass correct event shape', () => {
    const events: unknown[] = []
    const unsub = subscribe((event) => {
      events.push(event)
    })

    showToast('Task saved', 'success')
    expect(events).toHaveLength(1)
    const ev = events[0] as { id: number; message: string; type: string }
    expect(ev.id).toBeTypeOf('number')
    expect(ev.message).toBe('Task saved')
    expect(ev.type).toBe('success')
    unsub()
  })

  it('should not call listener after unsubscribe', () => {
    let count = 0
    const unsub = subscribe(() => {
      count++
    })

    showToast('first', 'success')
    unsub()
    showToast('second', 'success')
    expect(count).toBe(1)
  })

  it('should support multiple listeners', () => {
    const results: string[] = []
    const u1 = subscribe((e) => results.push(`a:${e.message}`))
    const u2 = subscribe((e) => results.push(`b:${e.message}`))

    showToast('hi', 'success')
    expect(results).toEqual(['a:hi', 'b:hi'])
    u1()
    u2()
  })
})
