import React from 'react'
import { render, screen } from '@testing-library/react'
import App from '../App'

test('renders welcome message', () => {
  render(<App />)
  const welcomeElement = screen.getByText(/Welcome to Web Testing IDE/i)
  expect(welcomeElement).toBeInTheDocument()
})

test('renders phase 1 message', () => {
  render(<App />)
  const phaseElement = screen.getByText(/Phase 1: Basic Electron shell is ready!/i)
  expect(phaseElement).toBeInTheDocument()
})
