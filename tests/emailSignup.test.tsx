import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EmailSignup from '../apps/web/src/components/EmailSignup'

// Mock fetch
global.fetch = vi.fn()

describe('EmailSignup Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders email signup form correctly', () => {
      render(<EmailSignup />)
      
      expect(screen.getByText('Be the first to know')).toBeInTheDocument()
      expect(screen.getByText(/Join our waitlist to get early access/)).toBeInTheDocument()
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /join waitlist/i })).toBeInTheDocument()
      expect(screen.getByText(/We respect your privacy/)).toBeInTheDocument()
    })

    it('renders form elements with correct attributes', () => {
      render(<EmailSignup />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })
      
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('placeholder', 'Enter your email address')
      expect(emailInput).toHaveAttribute('required')
      expect(submitButton).toHaveAttribute('type', 'submit')
    })
  })

  describe('Email Validation', () => {
    it('shows error for empty email', async () => {
      const user = userEvent.setup()
      render(<EmailSignup />)
      
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })
      
      await user.click(submitButton)
      
      expect(screen.getByText('Please enter your email address')).toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveClass('bg-red-50')
    })

    it('shows error for invalid email format', async () => {
      const user = userEvent.setup()
      render(<EmailSignup />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })
      
      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)
      
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveClass('bg-red-50')
    })

    it('shows error for email with spaces only', async () => {
      const user = userEvent.setup()
      render(<EmailSignup />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })
      
      await user.type(emailInput, '   ')
      await user.click(submitButton)
      
      expect(screen.getByText('Please enter your email address')).toBeInTheDocument()
    })

    it('accepts valid email formats', async () => {
      const user = userEvent.setup()
      const mockResponse = { success: true, message: 'Successfully joined our waitlist!' }
      
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      render(<EmailSignup />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })
      
      // Test various valid email formats
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'test+tag@example.org',
        'user123@subdomain.example.com'
      ]

      for (const email of validEmails) {
        await user.clear(emailInput)
        await user.type(emailInput, email)
        await user.click(submitButton)
        
        await waitFor(() => {
          expect(screen.getByText('Successfully joined our waitlist!')).toBeInTheDocument()
        })
        
        // Reset for next iteration
        vi.clearAllMocks()
        ;(global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        })
      }
    })
  })

  describe('Happy Path - Successful Submission', () => {
    it('submits valid email successfully', async () => {
      const user = userEvent.setup()
      const mockResponse = { 
        success: true, 
        message: 'Successfully joined our waitlist! We\'ll notify you when SafePsy launches.' 
      }
      
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
        expect(screen.getByText('Successfully joined our waitlist! We\'ll notify you when SafePsy launches.')).toBeInTheDocument()
      })
      
      expect(global.fetch).toHaveBeenCalledWith('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      })
    })

    it('clears email input after successful submission', async () => {
      const user = userEvent.setup()
      const mockResponse = { success: true, message: 'Successfully joined our waitlist!' }
      
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
        expect(emailInput).toHaveValue('')
      })
    })

    it('shows success message with correct styling', async () => {
      const user = userEvent.setup()
      const mockResponse = { success: true, message: 'Successfully joined our waitlist!' }
      
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
        const statusMessage = screen.getByRole('status')
        expect(statusMessage).toHaveClass('bg-green-50')
        expect(statusMessage).toHaveClass('text-green-800')
        expect(statusMessage).toHaveClass('border-green-200')
      })
    })

    it('normalizes email to lowercase before sending', async () => {
      const user = userEvent.setup()
      const mockResponse = { success: true, message: 'Successfully joined our waitlist!' }
      
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      render(<EmailSignup />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })
      
      await user.type(emailInput, 'TEST@EXAMPLE.COM')
      await user.click(submitButton)
      
      expect(global.fetch).toHaveBeenCalledWith('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      })
    })
  })

  describe('Error Handling', () => {
    it('handles duplicate email error', async () => {
      const user = userEvent.setup()
      const mockResponse = { 
        success: false, 
        message: 'This email is already on our waitlist' 
      }
      
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => mockResponse,
      })

      render(<EmailSignup />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })
      
      await user.type(emailInput, 'existing@example.com')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('This email is already on our waitlist')).toBeInTheDocument()
      })
      
      const statusMessage = screen.getByRole('status')
      expect(statusMessage).toHaveClass('bg-red-50')
    })

    it('handles server validation errors', async () => {
      const user = userEvent.setup()
      const mockResponse = { 
        success: false, 
        message: 'Please provide a valid email address' 
      }
      
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockResponse,
      })

      render(<EmailSignup />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })
      
      await user.type(emailInput, 'invalid@')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Please provide a valid email address')).toBeInTheDocument()
      })
    })

    it('handles server errors without message', async () => {
      const user = userEvent.setup()
      const mockResponse = { success: false }
      
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => mockResponse,
      })

      render(<EmailSignup />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument()
      })
    })

    it('handles rate limiting (429) responses', async () => {
      const user = userEvent.setup()
      const mockResponse = { 
        success: false, 
        message: 'Too many subscription attempts. Please wait a minute before trying again.' 
      }
      
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => mockResponse,
      })

      render(<EmailSignup />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Too many attempts. Please wait a minute before trying again.')).toBeInTheDocument()
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

    it('handles fetch timeout', async () => {
      const user = userEvent.setup()
      
      ;(global.fetch as any).mockRejectedValueOnce(new Error('timeout'))

      render(<EmailSignup />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Network error. Please check your connection and try again.')).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
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
      expect(emailInput).toBeDisabled()
    })

    it('disables form elements during loading', async () => {
      const user = userEvent.setup()
      
      ;(global.fetch as any).mockImplementationOnce(() => new Promise(() => {}))

      render(<EmailSignup />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)
      
      expect(submitButton).toBeDisabled()
      expect(emailInput).toBeDisabled()
    })

    it('re-enables form elements after error', async () => {
      const user = userEvent.setup()
      
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      render(<EmailSignup />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled()
        expect(emailInput).not.toBeDisabled()
      })
    })
  })

  describe('Inline Validation', () => {
    it('shows inline validation errors after form submission', async () => {
      const user = userEvent.setup()
      render(<EmailSignup />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })
      
      // Submit empty form
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Please enter your email address')).toBeInTheDocument()
      })
      
      // Check for inline error
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(emailInput).toHaveAttribute('aria-invalid', 'true')
    })

    it('shows inline validation for invalid email format', async () => {
      const user = userEvent.setup()
      render(<EmailSignup />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })
      
      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
      })
      
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(emailInput).toHaveAttribute('aria-invalid', 'true')
    })

    it('clears inline validation errors when typing valid email', async () => {
      const user = userEvent.setup()
      render(<EmailSignup />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })
      
      // Submit invalid email
      await user.type(emailInput, 'invalid')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
      
      // Clear and type valid email
      await user.clear(emailInput)
      await user.type(emailInput, 'test@example.com')
      
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      })
      
      expect(emailInput).toHaveAttribute('aria-invalid', 'false')
    })

    it('disables submit button when there are validation errors', async () => {
      const user = userEvent.setup()
      render(<EmailSignup />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })
      
      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })
    })
  })

  describe('Success State', () => {
    it('shows success confirmation instead of form', async () => {
      const user = userEvent.setup()
      const mockResponse = { 
        success: true, 
        message: 'Successfully joined our waitlist! We\'ll notify you when SafePsy launches.' 
      }
      
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
        expect(screen.getByText('You\'re all set!')).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /join waitlist/i })).not.toBeInTheDocument()
        expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument()
      })
    })

    it('shows success message with proper styling', async () => {
      const user = userEvent.setup()
      const mockResponse = { 
        success: true, 
        message: 'Successfully joined our waitlist! We\'ll notify you when SafePsy launches.' 
      }
      
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
        const statusMessage = screen.getByRole('status')
        expect(statusMessage).toHaveClass('bg-green-50')
        expect(statusMessage).toHaveClass('text-green-800')
        expect(statusMessage).toHaveClass('border-green-200')
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<EmailSignup />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      expect(emailInput).toHaveAttribute('aria-invalid', 'false')
    })

    it('updates ARIA attributes on error', async () => {
      const user = userEvent.setup()
      render(<EmailSignup />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })
      
      await user.click(submitButton)
      
      expect(emailInput).toHaveAttribute('aria-invalid', 'true')
      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
    })

    it('has proper form labels', () => {
      render(<EmailSignup />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      expect(emailInput).toHaveAttribute('id', 'email')
    })

    it('has proper loading state accessibility', async () => {
      const user = userEvent.setup()
      
      ;(global.fetch as any).mockImplementationOnce(() => new Promise(() => {})) // Never resolves

      render(<EmailSignup />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)
      
      expect(screen.getByText('Submitting your email...')).toBeInTheDocument()
      expect(submitButton).toHaveAttribute('aria-describedby', 'loading-status')
    })
  })

  describe('Edge Cases', () => {
    it('handles very long email addresses', async () => {
      const user = userEvent.setup()
      const longEmail = 'a'.repeat(50) + '@' + 'b'.repeat(50) + '.com'
      const mockResponse = { success: true, message: 'Successfully joined our waitlist!' }
      
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      render(<EmailSignup />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })
      
      await user.type(emailInput, longEmail)
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Successfully joined our waitlist!')).toBeInTheDocument()
      })
    })

    it('handles email with special characters', async () => {
      const user = userEvent.setup()
      const specialEmail = 'test+tag@example-domain.co.uk'
      const mockResponse = { success: true, message: 'Successfully joined our waitlist!' }
      
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      render(<EmailSignup />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })
      
      await user.type(emailInput, specialEmail)
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Successfully joined our waitlist!')).toBeInTheDocument()
      })
    })

    it('handles rapid form submissions', async () => {
      const user = userEvent.setup()
      const mockResponse = { success: true, message: 'Successfully joined our waitlist!' }
      
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      render(<EmailSignup />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })
      
      await user.type(emailInput, 'test@example.com')
      
      // Rapid clicks
      await user.click(submitButton)
      await user.click(submitButton)
      await user.click(submitButton)
      
      // Should only make one API call due to loading state
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })
    })
  })
})
