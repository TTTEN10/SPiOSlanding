import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import ContactUs from '../ContactUs'

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

describe('ContactUs Component', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('renders the contact form with all fields', () => {
    render(
      <TestWrapper>
        <ContactUs />
      </TestWrapper>
    )

    expect(screen.getByText('Get in')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/touch/i)
    expect(screen.getByText('Send us a Message')).toBeInTheDocument()
    
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/subject/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/your message/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument()
  })

  it('allows user to type in form fields', async () => {
    const user = userEvent.setup()
    
    render(
      <TestWrapper>
        <ContactUs />
      </TestWrapper>
    )

    const fullNameInput = screen.getByLabelText(/full name/i)
    const emailInput = screen.getByLabelText(/email address/i)
    const subjectInput = screen.getByLabelText(/subject/i)
    const messageTextarea = screen.getByLabelText(/your message/i)

    await user.type(fullNameInput, 'John Doe')
    await user.type(emailInput, 'john@example.com')
    await user.type(subjectInput, 'Test Subject')
    await user.type(messageTextarea, 'This is a test message')

    expect(fullNameInput).toHaveValue('John Doe')
    expect(emailInput).toHaveValue('john@example.com')
    expect(subjectInput).toHaveValue('Test Subject')
    expect(messageTextarea).toHaveValue('This is a test message')
  })

  it('has required attributes on all form fields', () => {
    render(
      <TestWrapper>
        <ContactUs />
      </TestWrapper>
    )

    expect(screen.getByLabelText(/full name/i)).toHaveAttribute('required')
    expect(screen.getByLabelText(/email address/i)).toHaveAttribute('required')
    expect(screen.getByLabelText(/subject/i)).toHaveAttribute('required')
    expect(screen.getByLabelText(/your message/i)).toHaveAttribute('required')
  })

  it('submits form with correct data structure', async () => {
    const user = userEvent.setup()
    
    // Mock successful response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: 'Success!' }),
    })

    render(
      <TestWrapper>
        <ContactUs />
      </TestWrapper>
    )

    const fullNameInput = screen.getByLabelText(/full name/i)
    const emailInput = screen.getByLabelText(/email address/i)
    const subjectInput = screen.getByLabelText(/subject/i)
    const messageTextarea = screen.getByLabelText(/your message/i)
    const submitButton = screen.getByRole('button', { name: /send message/i })

    await user.type(fullNameInput, 'John Doe')
    await user.type(emailInput, 'john@example.com')
    await user.type(subjectInput, 'Test Subject')
    await user.type(messageTextarea, 'This is a test message')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/contact/),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'John Doe',
          email: 'john@example.com',
          subject: 'Test Subject',
          message: 'This is a test message'
        })
      }
    )
    })
  })

  it('shows success message after successful submission', async () => {
    const user = userEvent.setup()
    
    // Mock successful response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: 'Message sent successfully!' }),
    })

    render(
      <TestWrapper>
        <ContactUs />
      </TestWrapper>
    )

    const fullNameInput = screen.getByLabelText(/full name/i)
    const emailInput = screen.getByLabelText(/email address/i)
    const subjectInput = screen.getByLabelText(/subject/i)
    const messageTextarea = screen.getByLabelText(/your message/i)
    const submitButton = screen.getByRole('button', { name: /send message/i })

    await user.type(fullNameInput, 'John Doe')
    await user.type(emailInput, 'john@example.com')
    await user.type(subjectInput, 'Test Subject')
    await user.type(messageTextarea, 'This is a test message')
    await user.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getAllByText('Message sent successfully!').length
      ).toBeGreaterThanOrEqual(1)
    })
  })

  it('shows error message for network errors', async () => {
    const user = userEvent.setup()
    
    // Mock network error
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(
      <TestWrapper>
        <ContactUs />
      </TestWrapper>
    )

    const fullNameInput = screen.getByLabelText(/full name/i)
    const emailInput = screen.getByLabelText(/email address/i)
    const subjectInput = screen.getByLabelText(/subject/i)
    const messageTextarea = screen.getByLabelText(/your message/i)
    const submitButton = screen.getByRole('button', { name: /send message/i })

    await user.type(fullNameInput, 'John Doe')
    await user.type(emailInput, 'john@example.com')
    await user.type(subjectInput, 'Test Subject')
    await user.type(messageTextarea, 'This is a test message')
    await user.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getAllByText('Network error. Check your connection and try again.')
          .length
      ).toBeGreaterThanOrEqual(1)
    })
  })

  it('clears form after successful submission', async () => {
    const user = userEvent.setup()
    
    // Mock successful response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: 'Success!' }),
    })

    render(
      <TestWrapper>
        <ContactUs />
      </TestWrapper>
    )

    const fullNameInput = screen.getByLabelText(/full name/i)
    const emailInput = screen.getByLabelText(/email address/i)
    const subjectInput = screen.getByLabelText(/subject/i)
    const messageTextarea = screen.getByLabelText(/your message/i)
    const submitButton = screen.getByRole('button', { name: /send message/i })

    await user.type(fullNameInput, 'John Doe')
    await user.type(emailInput, 'john@example.com')
    await user.type(subjectInput, 'Test Subject')
    await user.type(messageTextarea, 'This is a test message')
    await user.click(submitButton)

    await waitFor(() => {
      expect(fullNameInput).toHaveValue('')
      expect(emailInput).toHaveValue('')
      expect(subjectInput).toHaveValue('')
      expect(messageTextarea).toHaveValue('')
    })
  })
})