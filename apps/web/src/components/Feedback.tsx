import React, { useState } from 'react'
import Header from './Header'
import Footer from './Footer'

const Feedback: React.FC = () => {
  const [email, setEmail] = useState('')
  const [feedback, setFeedback] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedback.trim()) return
    setSubmitted(true)
    setEmail('')
    setFeedback('')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main id="main-content" className="flex-1 section-padding py-8 lg:py-12" role="main" aria-label="Beta feedback" tabIndex={-1}>
        <div className="container-max max-w-3xl">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl text-heading mb-4">
            <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent font-bold">
              Beta feedback
            </span>
          </h1>
          <p className="text-body mb-8">
            Help us improve Dr. Safe and the homepage experience. Share what felt clear, confusing, or emotionally helpful.
          </p>

          <form onSubmit={onSubmit} className="bg-white/70 dark:bg-black/30 border border-neutral-dark/20 dark:border-white/20 rounded-2xl p-6 sm:p-8 space-y-4">
            <div>
              <label htmlFor="feedback-email" className="block text-heading mb-2">Email (optional)</label>
              <input
                id="feedback-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="feedback-content" className="block text-heading mb-2">Your feedback *</label>
              <textarea
                id="feedback-content"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="input-field min-h-36"
                placeholder="What should we improve first?"
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full sm:w-auto px-8">Send feedback</button>
            {submitted && <p className="text-body">Thank you. Your feedback has been noted for the beta roadmap.</p>}
          </form>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default Feedback
