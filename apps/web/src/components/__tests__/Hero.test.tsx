import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import Hero from '../Hero'

// Mock Header and Footer components
vi.mock('../Header', () => ({
  default: () => (
    <header data-testid="header">
      Header
    </header>
  ),
}))

vi.mock('../Footer', () => ({
  default: () => <footer data-testid="footer">Footer</footer>
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
)

describe('Hero Component - Waitlist Form', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('renders the waitlist form with email and consent fields', () => {
    render(
      <TestWrapper>
        <Hero />
      </TestWrapper>
    )

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/consent to safepsy/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /join.*waitlist/i })).toBeInTheDocument()
  })

  it('allows user to type in email field', async () => {
    const user = userEvent.setup()
    render(
      <TestWrapper>
        <Hero />
      </TestWrapper>
    )

    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement
    await user.type(emailInput, 'test@example.com')

    expect(emailInput.value).toBe('test@example.com')
  })

  it('allows user to check consent checkbox', async () => {
    const user = userEvent.setup()
    render(
      <TestWrapper>
        <Hero />
      </TestWrapper>
    )

    const consentCheckbox = screen.getByLabelText(/consent to safepsy/i) as HTMLInputElement
    await user.click(consentCheckbox)

    expect(consentCheckbox.checked).toBe(true)
  })

  it('validates email is required', async () => {
    const user = userEvent.setup()
    render(
      <TestWrapper>
        <Hero />
      </TestWrapper>
    )

    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement
    const consentCheckbox = screen.getByLabelText(/consent to safepsy/i) as HTMLInputElement
    const submitButton = screen.getByRole('button', { name: /join.*waitlist/i })

    // Fill consent but leave email empty
    await user.click(consentCheckbox)
    // Remove required attribute to test custom validation
    emailInput.removeAttribute('required')
    await user.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getAllByText(/please enter your email address/i).length
      ).toBeGreaterThanOrEqual(1)
    })
  })

  it('validates consent is required', async () => {
    const user = userEvent.setup()
    render(
      <TestWrapper>
        <Hero />
      </TestWrapper>
    )

    const emailInput = screen.getByLabelText(/email address/i)
    const consentCheckbox = screen.getByLabelText(/consent to safepsy/i) as HTMLInputElement
    const submitButton = screen.getByRole('button', { name: /join.*waitlist/i })

    await user.type(emailInput, 'test@example.com')
    // Remove required attribute to test custom validation
    consentCheckbox.removeAttribute('required')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/you must give consent to join our waitlist/i)).toBeInTheDocument()
    })
  })

  it('submits form with correct data structure and sends email to backend', async () => {
    const user = userEvent.setup()
    
    // Mock successful response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: 'Thanks! We\'ll email you product updates.' }),
    })

    render(
      <TestWrapper>
        <Hero />
      </TestWrapper>
    )

    const emailInput = screen.getByLabelText(/email address/i)
    const consentCheckbox = screen.getByLabelText(/consent to safepsy/i)
    const submitButton = screen.getByRole('button', { name: /join.*waitlist/i })

    await user.type(emailInput, 'test@example.com')
    await user.click(consentCheckbox)
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/subscribe$|\/api\/subscribe/),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            consentGiven: true
          })
        }
      )
    })
  })

  it('shows success message after successful submission', async () => {
    const user = userEvent.setup()
    const mockResponse = { 
      success: true, 
      message: 'Thanks! We\'ll email you product updates.' 
    }
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    render(
      <TestWrapper>
        <Hero />
      </TestWrapper>
    )

    const emailInput = screen.getByLabelText(/email address/i)
    const consentCheckbox = screen.getByLabelText(/consent to safepsy/i)
    const submitButton = screen.getByRole('button', { name: /join.*waitlist/i })

    await user.type(emailInput, 'test@example.com')
    await user.click(consentCheckbox)
    await user.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getAllByText("Thanks! We'll email you product updates.").length
      ).toBeGreaterThanOrEqual(1)
    })
  })

  it('clears form after successful submission', async () => {
    const user = userEvent.setup()
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: 'Thanks! We\'ll email you product updates.' }),
    })

    render(
      <TestWrapper>
        <Hero />
      </TestWrapper>
    )

    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement
    const consentCheckbox = screen.getByLabelText(/consent to safepsy/i) as HTMLInputElement
    const submitButton = screen.getByRole('button', { name: /join.*waitlist/i })

    await user.type(emailInput, 'test@example.com')
    await user.click(consentCheckbox)
    await user.click(submitButton)

    await waitFor(() => {
      expect(emailInput.value).toBe('')
      expect(consentCheckbox.checked).toBe(false)
    })
  })

  it('handles API error response', async () => {
    const user = userEvent.setup()
    const mockResponse = {
      success: false,
      message: 'This email is already on our waitlist',
    }

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => JSON.stringify(mockResponse),
      json: async () => mockResponse,
    })

    render(
      <TestWrapper>
        <Hero />
      </TestWrapper>
    )

    const emailInput = screen.getByLabelText(/email address/i)
    const consentCheckbox = screen.getByLabelText(/consent to safepsy/i)
    const submitButton = screen.getByRole('button', { name: /join.*waitlist/i })

    await user.type(emailInput, 'existing@example.com')
    await user.click(consentCheckbox)
    await user.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getAllByText(
          /This email is already registered\. Try signing in or use a different email address\./
        ).length
      ).toBeGreaterThanOrEqual(1)
    })
  })

  it('handles network errors', async () => {
    const user = userEvent.setup()
    
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(
      <TestWrapper>
        <Hero />
      </TestWrapper>
    )

    const emailInput = screen.getByLabelText(/email address/i)
    const consentCheckbox = screen.getByLabelText(/consent to safepsy/i)
    const submitButton = screen.getByRole('button', { name: /join.*waitlist/i })

    await user.type(emailInput, 'test@example.com')
    await user.click(consentCheckbox)
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getAllByText(/network error/i).length).toBeGreaterThanOrEqual(1)
    })
  })

  it('trims and lowercases email before sending to backend', async () => {
    const user = userEvent.setup()
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: 'Thanks! We\'ll email you product updates.' }),
    })

    render(
      <TestWrapper>
        <Hero />
      </TestWrapper>
    )

    const emailInput = screen.getByLabelText(/email address/i)
    const consentCheckbox = screen.getByLabelText(/consent to safepsy/i)
    const submitButton = screen.getByRole('button', { name: /join.*waitlist/i })

    await user.type(emailInput, '  Test@Example.COM  ')
    await user.click(consentCheckbox)
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/subscribe$|\/api\/subscribe/),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            consentGiven: true
          })
        }
      )
    })
  })
})

