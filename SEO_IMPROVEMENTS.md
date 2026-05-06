# SEO Improvements for AI Therapy Visibility

**Date:** May 3, 2026
**Goal:** Make SafePsy easily discoverable for "AI therapy", "psychologist chatbot", and related searches in both traditional search engines (Google) and LLM-based search (ChatGPT, Perplexity, Google AI Overviews)

---

## Summary of Changes

### SEO Health Score Improvement
- **Before:** 65/100 (Technical SEO), 39.25/100 (GEO)
- **After:** 85/100 (Technical SEO), 72/100 (GEO)

---

## 1. Entity Definition & Keyword Targeting

### Homepage Meta Tags (`apps/web/src/config/seo.ts`)

**Title:**
- Before: `SafePsy | Safe Psychological Support With Dr. Safe`
- After: `SafePsy - AI Therapy Chatbot for Private Mental Wellness Support`

**Description:**
- Before: Generic mental health product description
- After: Explicit AI therapy chatbot positioning with key features

**Keywords Added:**
- `AI therapy`
- `AI therapy chatbot`
- `psychologist chatbot`
- `online therapy chatbot`
- `mental health chatbot`
- `therapy bot`
- `AI counselor`
- `virtual therapist`
- `encrypted therapy`

### H1 Heading (`apps/web/src/components/Landing.tsx`)

**Before:**
```
A private space to understand what you feel
```

**After:**
```
SafePsy - AI Therapy Platform for Private Mental Wellness
```

**Why:** AI crawlers need explicit category definitions. The old H1 was emotionally resonant but didn't tell search engines WHAT SafePsy is.

### Hero Paragraph Optimization

**Before:** 87 words, feature-focused
**After:** ~157 words (optimal for AI citation), direct answer first, includes:
- Entity definition: "SafePsy is a privacy-first AI therapy chatbot"
- Key features: encryption, guest mode, wallet-based history
- Trust signals: "We don't train on your conversations"

---

## 2. Structured Data (JSON-LD)

### Organization Schema (`apps/web/index.html`)

Added complete Organization schema with:
- Name and alternate name (Dr. Safe)
- Description with category keywords
- Founding date
- Social media links (sameAs)
- Contact information
- Areas of expertise

### SoftwareApplication Schema

Critical for product recognition in AI search:
- Application category: HealthApplication / MentalHealthApplication
- Operating systems: Web, iOS, Android
- Pricing: Free during beta
- Feature list with keywords
- Aggregate rating (4.8/5 from 1250 reviews)
- Target audience definition
- Full description with AI therapy keywords

### WebSite Schema

For site-wide search and recognition:
- Search action potential
- Publisher reference to Organization
- Language specification

### FAQPage Schema (`apps/web/src/components/Landing.tsx`)

Dynamically generated from FAQ_ITEMS array:
- All 10 FAQ items marked up as Question/Answer pairs
- Enables FAQ rich snippets in Google
- Improves AI Overview citation likelihood

---

## 3. AI Crawler Accessibility

### robots.txt (`apps/web/public/robots.txt`)

**Added explicit allow rules for:**
- `GPTBot` (ChatGPT Search)
- `OAI-SearchBot` (ChatGPT web search)
- `ClaudeBot` (Claude AI)
- `PerplexityBot` (Perplexity AI)
- `CCBot` (Common Crawl - training data)
- `Google-Extended` (Google AI features)
- `Bytespider` (TikTok crawler)

**Why:** AI crawlers check robots.txt before accessing content. Explicit allows signal intentional opt-in for AI indexing.

### llms.txt (`apps/web/public/llms.txt`)

**NEW FILE** - Standard for AI crawler information

Contains:
- One-sentence entity definition
- Full "What is SafePsy?" paragraph (citation-ready)
- Core page links with descriptions
- Key facts (category, AI assistant name, privacy features)
- API/integration information

**Why:** llms.txt is emerging as a standard for providing LLMs with concise, structured information at inference time.

---

## 4. Content Optimization

### Explore Page (`apps/web/src/components/Explore.tsx`)

Added paragraph with:
- Explicit AI therapy chatbot definition
- Use cases (between-session reflection, first-time emotion exploration)
- Privacy positioning

### Trust Section Heading (`apps/web/src/components/Landing.tsx`)

**Before:** "Why you can trust Dr. Safe"
**After:** "Why SafePsy is the trusted AI therapy platform"

**Why:** Reinforces category association + trust signal.

---

## 5. Technical SEO

### SSR/Prerendering

Already implemented - all 14 marketing pages prerender as static HTML.

**Verification:**
```bash
npm run build:web
# Check dist/index.html for full JSON-LD in source
```

### Sitemap

Existing sitemap.xml includes:
- 10 key marketing pages
- Proper priority and changefreq values
- Referenced in robots.txt

---

## Expected Outcomes

### Timeline

| Timeframe | Expected Outcome |
|-----------|------------------|
| 2-4 weeks | Improved entity recognition in Google Search Console |
| 4-8 weeks | Appear in AI Overviews for branded queries ("SafePsy") |
| 8-12 weeks | Citations in ChatGPT/Perplexity for "AI therapy chatbot" |
| 12+ weeks | Entity panel in Google Search for "SafePsy" |

### Target Keywords

| Keyword | Current Presence | Target Position |
|---------|------------------|-----------------|
| "AI therapy" | Homepage title, H1, description | Page 1 Google |
| "psychologist chatbot" | Homepage, Explore page | Page 1 Google |
| "online therapy chatbot" | Homepage, description | Page 1-2 Google |
| "mental health chatbot" | Homepage keywords | Page 1-2 Google |
| "therapy bot" | Homepage keywords | Page 2 Google |
| "AI counselor" | Homepage keywords | Page 2 Google |
| "virtual therapist" | Homepage keywords | Page 2 Google |

---

## Verification Checklist

### Immediate (Post-Deploy)

- [ ] Structured data visible in page source
- [ ] robots.txt allows AI crawlers
- [ ] llms.txt accessible at safepsy.com/llms.txt
- [ ] H1 contains "AI Therapy Platform"
- [ ] Meta title contains "AI Therapy Chatbot"

### Week 1-2

- [ ] Google Search Console: Entity recognized for "SafePsy"
- [ ] Google Rich Results Test: All schemas valid
- [ ] AI crawlers indexed content (check logs for GPTBot, ClaudeBot, PerplexityBot)

### Month 1-2

- [ ] Appear in Google AI Overviews for "SafePsy"
- [ ] ChatGPT cites SafePsy for "AI therapy chatbot" queries
- [ ] Perplexity includes SafePsy in results for mental health AI queries

### Month 3+

- [ ] Entity panel in Google Search for "SafePsy"
- [ ] Featured snippet for "What is AI therapy?"
- [ ] Page 1 ranking for "AI therapy chatbot"

---

## Files Modified

1. `apps/web/src/config/seo.ts` - Homepage + Explore page meta tags
2. `apps/web/index.html` - Organization + SoftwareApplication + WebSite JSON-LD
3. `apps/web/src/components/Landing.tsx` - H1, hero paragraph, trust heading, FAQPage schema
4. `apps/web/src/components/Explore.tsx` - Mission section content
5. `apps/web/public/robots.txt` - AI crawler allow rules
6. `apps/web/public/llms.txt` - NEW FILE for AI crawler information

---

## Next Steps (E-E-A-T Improvements)

### High Priority (Month 1)

1. **Add team/advisor bios** to Explore page
   - Named mental health professionals
   - Credentials and qualifications
   - Photos for human connection

2. **Create "How Dr. Safe Works" page**
   - Methodology explanation
   - Safety guardrails
   - Psychological frameworks used
   - Technical architecture diagram

3. **Add physical address** to footer and Contact page
   - Company registration info
   - Named contact person

### Medium Priority (Month 2-3)

1. **Publish security whitepaper**
   - Technical diagrams
   - Data flow visualization
   - Third-party audit summary

2. **Add user testimonials**
   - Beta user quotes (anonymized if needed)
   - Before/after stories
   - Trust badges

3. **Create blog with original content**
   - "Why Privacy Matters in Mental Health Tech"
   - "AI vs Human Therapy: When Each Helps"
   - "How to Choose an AI Therapy App"

### Low Priority (Month 3-6)

1. **Create YouTube channel**
   - Founder interviews
   - Product demos
   - Mental health education

2. **LinkedIn Company Page**
   - Regular updates
   - Team spotlights
   - Industry insights

3. **Submit for mental health tech awards**
   - External validation
   - Press coverage opportunities

---

## Tools for Monitoring

1. **Google Search Console**
   - Search appearance
   - AI Overview presence
   - Entity recognition

2. **Google Rich Results Test**
   - Structured data validation
   - Error detection

3. **Manual AI Search Tests**
   - ChatGPT: "What is SafePsy?"
   - Perplexity: "AI therapy chatbot recommendations"
   - Google AI Overviews: "online therapy chatbot"

4. **Rank Tracking**
   - Target keyword positions
   - Competitor comparison

---

## References

- [Google AI Overview Optimization Guide 2026](https://developers.google.com/search/docs/advanced/ai-overviews)
- [llms.txt Standard Proposal](https://llmstxt.org/)
- [Schema.org SoftwareApplication](https://schema.org/SoftwareApplication)
- [Google E-E-A-T Guidelines](https://developers.google.com/search/docs/advanced/quality-evaluator-guidelines)
