import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EmailSignup from '../components/EmailSignup'

// Mock fetch
global.fetch = vi.fn()

describe('EmailSignup Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders email signup form correctly', () => {
    render(<EmailSignup />)
    
    expect(screen.getByText('Be the first to know')).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /join waitlist/i })).toBeInTheDocument()
  })

  it('validates email input', async () => {
    const user = userEvent.setup()
    render(<EmailSignup />)
    
    const emailInput = screen.getByLabelText(/email address/i)
    const submitButton = screen.getByRole('button', { name: /join waitlist/i })
    
    // Test empty email
    await user.click(submitButton)
    expect(screen.getByText('Please enter your email address')).toBeInTheDocument()
    
    // Test invalid email
    await user.type(emailInput, 'invalid-email')
    await user.click(submitButton)
    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
  })

  it('submits valid email successfully', async () => {
    const user = userEvent.setup()
    const mockResponse = { success: true, message: 'Successfully joined waitlist!' }
    
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    render(<EmailSignup />)
    
    const emailInput = screen.getByLabelText(/email address/i)
    const submitButton = screen.getByRole('button', { name: /join waitlist/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Successfully joined waitlist!')).toBeInTheDocument()
    })
    
    expect(global.fetch).toHaveBeenCalledWith('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    })
  })

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup()
    const mockResponse = { success: false, message: 'Email already exists' }
    
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => mockResponse,
    })

    render(<EmailSignup />)
    
    const emailInput = screen.getByLabelText(/email address/i)
    const submitButton = screen.getByRole('button', { name: /join waitlist/i })
    
    await user.type(emailInput, 'existing@example.com')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeInTheDocument()
    })
  })

  it('handles network errors', async () => {
    const user = userEvent.setup()
    
    ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

    render(<EmailSignup />)
    
    const emailInput = screen.getByLabelText(/email address/i)
    const submitButton = screen.getByRole('button', { name: /join waitlist/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Network error. Please check your connection and try again.')).toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    
    ;(global.fetch as any).mockImplementationOnce(() => new Promise(() => {})) // Never resolves

    render(<EmailSignup />)
    
    const emailInput = screen.getByLabelText(/email address/i)
    const submitButton = screen.getByRole('button', { name: /join waitlist/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)
    
    expect(screen.getByText('Joining...')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })
})
