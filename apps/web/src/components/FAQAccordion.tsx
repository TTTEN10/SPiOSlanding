import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

type FAQItem = {
  q: string
  a: string
}

interface FAQAccordionProps {
  items: FAQItem[]
  answerClassName?: string
}

const FAQAccordion: React.FC<FAQAccordionProps> = ({ items, answerClassName = 'text-sm sm:text-base' }) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  return (
    <div className="max-w-3xl mx-auto space-y-1">
      {items.map((item, i) => (
        <div key={i} className="border-b border-neutral-200 dark:border-white/20">
          <button
            type="button"
            onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
            className="w-full py-3 sm:py-4 flex items-center justify-between gap-3 text-left min-h-[44px] hover:bg-neutral-50 dark:hover:bg-white/5 rounded-lg transition-colors"
            aria-expanded={openFaqIndex === i}
            aria-controls={`faq-answer-${i}`}
            id={`faq-question-${i}`}
          >
            <span className="text-heading font-medium text-sm sm:text-base">{item.q}</span>
            {openFaqIndex === i ? (
              <ChevronUp className="w-4 h-4 text-body flex-shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-body flex-shrink-0" />
            )}
          </button>
          <div
            id={`faq-answer-${i}`}
            role="region"
            aria-labelledby={`faq-question-${i}`}
            className={`overflow-hidden transition-all duration-200 ease-out ${
              openFaqIndex === i ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <p className={`text-body pb-4 pl-0 pr-8 whitespace-pre-line ${answerClassName}`}>
              {item.a}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default FAQAccordion
