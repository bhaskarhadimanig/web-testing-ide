import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AssertionBuilder } from '../components/AssertionBuilder'

describe('AssertionBuilder', () => {
  test('renders assertion type dropdown', () => {
    render(<AssertionBuilder onSave={jest.fn()} onCancel={jest.fn()} />)
    expect(screen.getByText('Assertion Type')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Element Exists')).toBeInTheDocument()
  })

  test('calls onSave with correct assertion data for exists type', () => {
    const mockSave = jest.fn()
    render(<AssertionBuilder onSave={mockSave} onCancel={jest.fn()} />)
    
    fireEvent.click(screen.getByText('Save Assertion'))
    
    expect(mockSave).toHaveBeenCalledWith({
      type: 'exists',
      expectedValue: undefined,
      description: undefined
    })
  })

  test('shows expected value field for containsText assertion', () => {
    const mockSave = jest.fn()
    render(<AssertionBuilder onSave={mockSave} onCancel={jest.fn()} />)
    
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'containsText' } })
    
    expect(screen.getByPlaceholderText('Text to check for...')).toBeInTheDocument()
  })

  test('calls onSave with expected value for containsText assertion', () => {
    const mockSave = jest.fn()
    render(<AssertionBuilder onSave={mockSave} onCancel={jest.fn()} />)
    
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'containsText' } })
    fireEvent.change(screen.getByPlaceholderText('Text to check for...'), { target: { value: 'Hello World' } })
    fireEvent.click(screen.getByText('Save Assertion'))
    
    expect(mockSave).toHaveBeenCalledWith({
      type: 'containsText',
      expectedValue: 'Hello World',
      description: undefined
    })
  })

  test('calls onCancel when cancel button is clicked', () => {
    const mockCancel = jest.fn()
    render(<AssertionBuilder onSave={jest.fn()} onCancel={mockCancel} />)
    
    fireEvent.click(screen.getByText('Cancel'))
    
    expect(mockCancel).toHaveBeenCalled()
  })

  test('initializes with provided assertion data', () => {
    const initialAssertion = {
      type: 'visible' as const,
      expectedValue: 'test value',
      description: 'test description'
    }
    
    render(
      <AssertionBuilder 
        onSave={jest.fn()} 
        onCancel={jest.fn()} 
        initialAssertion={initialAssertion}
      />
    )
    
    expect(screen.getByDisplayValue('Element Visible')).toBeInTheDocument()
    expect(screen.getByDisplayValue('test description')).toBeInTheDocument()
  })
})
