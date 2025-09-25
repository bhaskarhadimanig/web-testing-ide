import React from 'react'
import { render, screen } from '@testing-library/react'
import App from '../App'

test('renders Web Testing IDE title', () => {
  render(<App />)
  const titleElement = screen.getByText(/Web Testing IDE/i)
  expect(titleElement).toBeInTheDocument()
})

test('renders toolbar buttons', () => {
  render(<App />)
  expect(screen.getByText('Record')).toBeInTheDocument()
  expect(screen.getByText('Stop')).toBeInTheDocument()
  expect(screen.getByText('Generate')).toBeInTheDocument()
  expect(screen.getByText('Run')).toBeInTheDocument()
  expect(screen.getByText('Export')).toBeInTheDocument()
})

test('renders recording steps panel', () => {
  render(<App />)
  const stepsPanel = screen.getByRole('heading', { name: /Recording Steps/i })
  expect(stepsPanel).toBeInTheDocument()
})

test('renders tab navigation', () => {
  render(<App />)
  expect(screen.getByText('Steps')).toBeInTheDocument()
  expect(screen.getByText('Code')).toBeInTheDocument()
})
