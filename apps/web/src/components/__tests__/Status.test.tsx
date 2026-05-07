import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import Status from '../Status'

// Mock Header and Footer components
vi.mock('../Header', () => ({
  default: () => (
    <header data-testid="header">
      Header
    </header>
  )
}))

vi.mock('../Footer', () => ({
  default: () => <footer data-testid="footer">Footer</footer>
}))

// Mock navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
)

const healthyFetchResponse = () =>
  Promise.resolve({
    ok: true,
    status: 200,
    text: async () => '',
    json: async () => ({}),
  })

describe('Status Component', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockImplementation(healthyFetchResponse)
    mockNavigate.mockClear()
    vi.clearAllTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the status page with loading state', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}))

    render(
      <TestWrapper>
        <Status />
      </TestWrapper>
    )

    expect(screen.getByText(/checking status/i)).toBeInTheDocument()
    expect(screen.getByText(/please wait while we check/i)).toBeInTheDocument()
  })

  it('displays live status when API is healthy', async () => {
    render(
      <TestWrapper>
        <Status />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/system live/i)).toBeInTheDocument()
      expect(screen.getByText(/all systems are operational/i)).toBeInTheDocument()
    })

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('displays offline status and redirects when API is down', async () => {
    mockFetch.mockReset()
    mockFetch.mockImplementation(() =>
      Promise.reject(new Error('Network error'))
    )

    render(
      <TestWrapper>
        <Status />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/system offline/i)).toBeInTheDocument()
      expect(screen.getByText(/system is currently unavailable/i)).toBeInTheDocument()
    })

    // Redirect uses real setTimeout(3000); advance real time (fake timers would not fire it).
    await act(
      async () =>
        await new Promise<void>((resolve) => setTimeout(resolve, 3100))
    )
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/500', { replace: true })
    })
  })

  it('allows manual refresh of status', async () => {
    const user = userEvent.setup({ delay: null })

    render(
      <TestWrapper>
        <Status />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/system live/i)).toBeInTheDocument()
    })

    const refreshButton = screen.getByRole('button', { name: /refresh status/i })
    await user.click(refreshButton)

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('shows status details when available', async () => {
    render(
      <TestWrapper>
        <Status />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/status details/i)).toBeInTheDocument()
      expect(screen.getAllByText(/operational/i).length).toBeGreaterThanOrEqual(1)
    })
  })

  it('displays error message when health check fails', async () => {
    mockFetch.mockReset()
    mockFetch.mockImplementation(() =>
      Promise.reject(new Error('Connection timeout'))
    )

    render(
      <TestWrapper>
        <Status />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(
        screen.getByText(/The system is currently unavailable/i)
      ).toBeInTheDocument()
    })
  })

  it('tries multiple health endpoints', async () => {
    mockFetch.mockReset()
    mockFetch
      .mockRejectedValueOnce(new Error('Endpoint 1 failed'))
      .mockImplementation(healthyFetchResponse)

    render(
      <TestWrapper>
        <Status />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/system live/i)).toBeInTheDocument()
    })

    // /healthz fails then /readyz succeeds (two endpoints in Status.checkHealth)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('auto-refreshes status periodically', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(
      <TestWrapper>
        <Status />
      </TestWrapper>
    )

    await waitFor(
      () => {
        expect(screen.getByText(/system live/i)).toBeInTheDocument()
      },
      { advanceTimers: (ms) => vi.advanceTimersByTime(ms) }
    )

    const initialCallCount = mockFetch.mock.calls.length
    await act(async () => {
      vi.advanceTimersByTime(30000)
    })

    await waitFor(
      () => {
        expect(mockFetch.mock.calls.length).toBeGreaterThan(initialCallCount)
      },
      { advanceTimers: (ms) => vi.advanceTimersByTime(ms) }
    )
    vi.useRealTimers()
  })

  it('stops auto-refresh after 10 attempts', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({
      delay: null,
      advanceTimers: vi.advanceTimersByTime,
    })

    render(
      <TestWrapper>
        <Status />
      </TestWrapper>
    )

    await waitFor(
      () => {
        expect(screen.getByText(/system live/i)).toBeInTheDocument()
      },
      { advanceTimers: (ms) => vi.advanceTimersByTime(ms) }
    )

    // Should show remaining auto-refreshes initially
    expect(screen.getByText(/auto-refreshing every 30 seconds/i)).toBeInTheDocument()
    expect(screen.getByText(/remaining/i)).toBeInTheDocument()

    // Fast-forward 10 auto-refreshes (10 * 30 seconds = 300 seconds)
    for (let i = 0; i < 10; i++) {
      await act(async () => {
        vi.advanceTimersByTime(30000)
      })
    }

    // Should show quota limit reached message
    await waitFor(
      () => {
        expect(screen.getByText(/auto-refresh limit reached/i)).toBeInTheDocument()
        expect(
          screen.getByText(/automatic refreshes have been disabled/i)
        ).toBeInTheDocument()
      },
      { advanceTimers: (ms) => vi.advanceTimersByTime(ms) }
    )

    // Manual refresh button should still work
    const refreshButton = screen.getByRole('button', { name: /refresh status/i })
    expect(refreshButton).toBeInTheDocument()
    expect(refreshButton).not.toBeDisabled()

    // Fast-forward more time - should not auto-refresh
    const callCountBefore = mockFetch.mock.calls.length
    await act(async () => {
      vi.advanceTimersByTime(30000)
      // Give it a moment, then verify no new calls were made
      vi.advanceTimersByTime(100)
    })
    expect(mockFetch.mock.calls.length).toBe(callCountBefore)

    // Manual refresh should still work
    await user.click(refreshButton)
    await waitFor(
      () => {
        expect(mockFetch.mock.calls.length).toBeGreaterThan(callCountBefore)
      },
      { advanceTimers: (ms) => vi.advanceTimersByTime(ms) }
    )
    vi.useRealTimers()
  })

  it('shows remaining auto-refresh count', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(
      <TestWrapper>
        <Status />
      </TestWrapper>
    )

    await waitFor(
      () => {
        expect(screen.getByText(/system live/i)).toBeInTheDocument()
      },
      { advanceTimers: (ms) => vi.advanceTimersByTime(ms) }
    )

    // Initially should show 10 remaining (or close to it)
    expect(screen.getByText(/remaining/i)).toBeInTheDocument()

    // Trigger a few auto-refreshes
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        vi.advanceTimersByTime(30000)
      })
    }

    // Should still show remaining count (should be less than 10)
    await waitFor(
      () => {
        expect(screen.getByText(/remaining/i)).toBeInTheDocument()
      },
      { advanceTimers: (ms) => vi.advanceTimersByTime(ms) }
    )
    vi.useRealTimers()
  })

  it('manual refresh does not count towards quota', async () => {
    const user = userEvent.setup({ delay: null })

    render(
      <TestWrapper>
        <Status />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/system live/i)).toBeInTheDocument()
    })

    const remainingFrom = (text: string | null) =>
      text?.match(/\((\d+)\s+remaining\)/)?.[1]

    const initialRemaining = remainingFrom(
      screen.getByText(/remaining/i).textContent
    )
    expect(initialRemaining).toBeDefined()

    // Manually refresh multiple times
    const refreshButton = screen.getByRole('button', { name: /refresh status/i })
    for (let i = 0; i < 5; i++) {
      await user.click(refreshButton)
      await waitFor(() => {
        // Wait for refresh to complete
      }, { timeout: 500 })
    }

    // Quota number should not change; "Last checked" may update each refresh.
    await waitFor(() => {
      expect(
        remainingFrom(screen.getByText(/remaining/i).textContent)
      ).toBe(initialRemaining)
    })
  })
})

