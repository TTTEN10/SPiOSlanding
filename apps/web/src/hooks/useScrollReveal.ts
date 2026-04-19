import { useEffect } from 'react'

type UseScrollRevealOptions = {
  selector?: string
  rootMargin?: string
  threshold?: number
}

export function useScrollReveal(options: UseScrollRevealOptions = {}) {
  const { selector = '[data-reveal]', rootMargin = '0px 0px -10% 0px', threshold = 0.12 } = options

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(selector))
    if (elements.length === 0) return

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      elements.forEach((el) => el.classList.add('is-visible'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            ;(entry.target as HTMLElement).classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { root: null, rootMargin, threshold }
    )

    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [selector, rootMargin, threshold])
}

