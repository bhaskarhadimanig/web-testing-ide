import { useState, useCallback } from 'react'

interface HistoryState<T> {
  past: T[]
  present: T
  future: T[]
}

export const useHistory = <T>(initialState: T) => {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: []
  })

  const canUndo = state.past.length > 0
  const canRedo = state.future.length > 0

  const undo = useCallback(() => {
    if (canUndo) {
      const previous = state.past[state.past.length - 1]
      const newPast = state.past.slice(0, state.past.length - 1)
      setState({
        past: newPast,
        present: previous,
        future: [state.present, ...state.future]
      })
    }
  }, [canUndo, state])

  const redo = useCallback(() => {
    if (canRedo) {
      const next = state.future[0]
      const newFuture = state.future.slice(1)
      setState({
        past: [...state.past, state.present],
        present: next,
        future: newFuture
      })
    }
  }, [canRedo, state])

  const set = useCallback((newPresent: T) => {
    setState({
      past: [...state.past, state.present],
      present: newPresent,
      future: []
    })
  }, [state.past, state.present])

  const reset = useCallback((newPresent: T) => {
    setState({
      past: [],
      present: newPresent,
      future: []
    })
  }, [])

  return { 
    state: state.present, 
    set, 
    undo, 
    redo, 
    canUndo, 
    canRedo, 
    reset 
  }
}
