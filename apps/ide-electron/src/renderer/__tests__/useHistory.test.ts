import { renderHook, act } from '@testing-library/react'
import { useHistory } from '../hooks/useHistory'

describe('useHistory', () => {
  test('initializes with provided state', () => {
    const { result } = renderHook(() => useHistory('initial'))
    
    expect(result.current.state).toBe('initial')
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  test('can set new state and undo', () => {
    const { result } = renderHook(() => useHistory('initial'))
    
    act(() => {
      result.current.set('second')
    })
    
    expect(result.current.state).toBe('second')
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(false)
    
    act(() => {
      result.current.undo()
    })
    
    expect(result.current.state).toBe('initial')
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(true)
  })

  test('can redo after undo', () => {
    const { result } = renderHook(() => useHistory('initial'))
    
    act(() => {
      result.current.set('second')
      result.current.undo()
      result.current.redo()
    })
    
    expect(result.current.state).toBe('second')
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(false)
  })

  test('clears future when setting new state after undo', () => {
    const { result } = renderHook(() => useHistory('initial'))
    
    act(() => {
      result.current.set('second')
      result.current.undo()
      result.current.set('third')
    })
    
    expect(result.current.state).toBe('third')
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(false)
  })

  test('can reset history', () => {
    const { result } = renderHook(() => useHistory('initial'))
    
    act(() => {
      result.current.set('second')
      result.current.set('third')
      result.current.reset('reset')
    })
    
    expect(result.current.state).toBe('reset')
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })
})
