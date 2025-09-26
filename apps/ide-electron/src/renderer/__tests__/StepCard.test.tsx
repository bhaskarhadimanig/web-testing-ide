import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { StepCard } from '../components/StepCard'
import { RecorderStep } from '@web-testing-ide/common'

const mockStep: RecorderStep = {
  id: 'test-step-1',
  type: 'click',
  timestamp: Date.now(),
  url: 'https://example.com',
  viewport: { width: 1280, height: 720 },
  selectors: [{ selector: '.button', type: 'css', score: 1, isUnique: true }],
  metadata: {}
}

describe('StepCard', () => {
  test('renders step information correctly', () => {
    render(<StepCard step={mockStep} index={0} />)
    
    expect(screen.getByText('click')).toBeInTheDocument()
    expect(screen.getByText('Step 1')).toBeInTheDocument()
    expect(screen.getByText('Click → .button (css, score: 1)')).toBeInTheDocument()
  })

  test('calls onRunSingle when run button is clicked', () => {
    const mockRunSingle = jest.fn()
    render(<StepCard step={mockStep} index={0} onRunSingle={mockRunSingle} />)
    
    fireEvent.click(screen.getByText('Run'))
    
    expect(mockRunSingle).toHaveBeenCalledWith(mockStep)
  })

  test('calls onEdit when edit button is clicked', () => {
    const mockEdit = jest.fn()
    render(<StepCard step={mockStep} index={0} onEdit={mockEdit} />)
    
    fireEvent.click(screen.getByText('Edit'))
    
    expect(mockEdit).toHaveBeenCalledWith(mockStep)
  })

  test('calls onDelete when delete button is clicked', () => {
    const mockDelete = jest.fn()
    render(<StepCard step={mockStep} index={0} onDelete={mockDelete} />)
    
    fireEvent.click(screen.getByText('Delete'))
    
    expect(mockDelete).toHaveBeenCalledWith(mockStep.id)
  })

  test('renders step correctly', () => {
    render(<StepCard step={mockStep} index={0} />)
    
    expect(screen.getByText('click')).toBeInTheDocument()
  })
})
