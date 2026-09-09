# SiteCheck AI — MASTER SPECIFICATION

**Project status:** Greenfield / new repository  
**Primary developer:** Claude Code  
**Owner:** Fabio  
**Primary objective:** Build a low-cost, highly automated website audit and lead-generation product that can progressively become a self-sustaining revenue engine.

---

# 1. PRODUCT VISION

SiteCheck AI is a lightweight SaaS / lead-generation tool.

A visitor enters a website URL and receives an automated technical and marketing-oriented site audit.

The first launch niche is:

**Italian real estate agencies**

The system must later be reusable for other verticals such as:

- restaurants
- hotels
- dentists
- lawyers
- e-commerce
- gyms
- local businesses
- professional services

The product must start extremely lean and inexpensive.

The owner already has hosting.

The initial external cash budget is approximately:

**€100 total**

Therefore every architectural choice should favor:

1. free tiers
2. open-source libraries
3. server-side deterministic analysis before AI
4. usage-based services
5. low fixed monthly costs
6. portability
7. avoiding unnecessary vendor lock-in

---

# 2. CORE BUSINESS MODEL

The system should eventually monetize through multiple layers.

## Layer 1 — Free audit

Visitor enters a URL and receives a Site Score.

This is the acquisition engine.

## Layer 2 — Affiliate monetization

When the audit detects relevant cookie / consent / privacy configuration issues, the user can be sent to an affiliate partner such as CookieYes.

Affiliate links must be tracked internally before redirect.

Example:

`/go/cookieyes`

The redirect endpoint should log:

- audit_id
- source
- campaign
- detected issue
- timestamp
- destination
- UTM parameters

Then redirect to the configured affiliate URL.

Affiliate URLs must be configured through environment variables or admin settings.

## Layer 3 — Paid report

Potential future product:

**Detailed Site Fix Report**

Possible price:

€9–€19

It should provide:

- all detected issues
- priorities
- explanations
- recommended actions
- implementation checklist
- AI-assisted recommendations

This is NOT required for MVP v1.

## Layer 4 — Monitoring subscription

Potential future product:

**Site Monitor**

Possible starting price:

€4.90–€9.90/month

The system periodically rescans a site and emails the owner when meaningful changes or regressions occur.

This is NOT required for MVP v1.

## Layer 5 — Additional SaaS affiliate revenue

Future affiliate categories:

- cookie / consent tools
- email marketing
- hosting
- analytics
- CRM
- SEO tools
- website builders

Every recommendation must be contextual to a detected need.

---

# 3. PRODUCT PRINCIPLE

The project should eventually create a flywheel:

Traffic
→ audits
→ structured data
→ insights
→ automated content
→ social / SEO distribution
→ more traffic
→ more audits
→ affiliate / paid conversions
→ revenue
→ reinvestment

The important idea is:

**The product itself should generate the data that powers its future marketing.**

---

# 4. MVP V1

The first production version should include ONLY:

1. Landing page
2. URL input
3. URL validation
4. Website fetching / crawl-lite
5. Technical audit
6. Site Score
7. Results page
8. Email capture
9. Audit persistence
10. Affiliate tracking + CookieYes CTA
11. Admin dashboard
12. Basic analytics events
13. Production deployment readiness

The MVP must NOT initially include:

- complex user accounts
- Stripe billing
- paid plans
- full-site crawling
- automated Meta Ads management
- large SEO content engine
- automatic legal conclusions
- enterprise permissions
- complicated CRM features

Build the smallest version that can collect real usage data.

---

# 5. CORE USER JOURNEY

## Landing page

Primary headline concept:

**Quanto è sano il sito della tua agenzia?**

Supporting message:

Analyze key elements related to:

- Cookie
- Privacy
- Tracking
- SEO
- Performance

Main input:

`https://example.com`

CTA:

**Analizza gratis**

---

## Audit loading

After submission:

1. normalize URL
2. validate URL
3. perform safe server-side request
4. inspect HTML
5. run deterministic detectors
6. optionally call external performance API
7. calculate section scores
8. calculate total Site Score
9. generate concise AI explanation from structured audit JSON
10. store results
11. show results page

---

## Results page

Example structure:

### SITE SCORE

`67 / 100`

Sections:

- Privacy
- Cookie & Consent
- Tracking
- SEO
- Performance
- Technical

Each section should show:

- score
- status
- detected checks
- short explanation
- priority

Example:

**Cookie & Consent — 55/100**

Detected:

- cookie banner found
- Meta Pixel found
- Cookie Policy link not detected

Important wording:

The product provides a **technical/informational automated analysis**.

It must avoid pretending to provide formal legal advice.

Use language such as:

- “elemento da verificare”
- “rilevato”
- “non rilevato durante questa scansione”
- “configurazione da approfondire”
- “verifica consigliata”

Avoid definitive legal claims.

---

# 6. AUDIT ENGINE

The audit should rely primarily on deterministic checks.

AI should explain results, not invent them.

## 6.1 URL normalization

Support inputs such as:

- example.com
- www.example.com
- https://example.com
- http://example.com

Normalize to HTTPS when possible.

Validate:

- valid hostname
- public HTTP/HTTPS target
- reject unsafe/private network targets

CRITICAL SECURITY REQUIREMENT:

Protect against SSRF.

Reject access to:

- localhost
- 127.0.0.0/8
- private RFC1918 IPs
- metadata endpoints
- link-local addresses
- internal hostnames
- unsupported protocols

Only HTTP/HTTPS are allowed.

---

# 7. AUDIT CHECKS

Implement checks modularly.

Each detector should return structured output.

Example:

```ts
{
  id: "cookie_policy_detected",
  category: "cookie",
  status: "pass" | "warning" | "fail" | "unknown",
  value: true,
  confidence: 0.9,
  evidence: "...",
  weight: 10
}
```

---

## 7.1 Technical

Check:

- HTTPS
- final status code
- redirects
- canonical
- viewport meta
- language attribute
- title present
- meta description present
- favicon presence
- robots meta
- basic structured data presence

---

## 7.2 SEO

Check:

- title
- title length
- meta description
- H1 presence
- multiple H1
- heading hierarchy
- canonical
- robots meta
- image alt coverage
- Open Graph metadata
- structured data presence
- indexability signals

Keep this as a lightweight homepage audit.

---

## 7.3 Privacy / policy presence

Detect likely links/pages containing:

Italian variants:

- privacy
- privacy policy
- informativa privacy
- informativa sulla privacy
- cookie
- cookie policy
- politica cookie

English variants:

- privacy
- privacy policy
- cookie policy
- cookies

Return presence detection only.

Do not state legal compliance.

---

## 7.4 Cookie / consent platforms

Detect common CMP signatures where feasible.

Initial detectors may include:

- CookieYes
- iubenda
- OneTrust
- Cookiebot
- Complianz
- Quantcast
- generic consent banner patterns

Detection can use:

- script src
- DOM IDs
- classes
- inline script patterns
- known domains

Store detected CMP vendor when identifiable.

---

## 7.5 Tracking / marketing technologies

Detect:

- Google Tag Manager
- Google Analytics / GA4
- Meta Pixel
- TikTok Pixel
- LinkedIn Insight Tag
- Hotjar
- Microsoft Clarity

Store only technical presence detection.

---

## 7.6 Forms

Detect:

- number of forms
- email fields
- telephone fields
- checkbox presence
- likely privacy consent text near forms

Do not infer legal compliance.

---

## 7.7 Performance

Prefer an inexpensive, reliable approach.

Possible order:

1. Google PageSpeed Insights API if available
2. lightweight internal timing metrics
3. fallback “not available”

Store:

- performance score
- accessibility score if available
- best practices score if available
- SEO score if available
- Core Web Vitals if available

External API keys must be optional.

The audit must still work when PageSpeed is unavailable.

---

# 8. SCORING MODEL

Scoring must be transparent and configurable.

Suggested categories:

- Technical: 15%
- SEO: 20%
- Privacy presence: 15%
- Cookie & Consent: 20%
- Tracking hygiene: 15%
- Performance: 15%

These weights are initial defaults.

Store scoring configuration centrally.

Avoid hardcoding scoring logic across UI components.

Each check has:

- category
- weight
- impact
- status
- confidence

Total Site Score:

0–100

Suggested bands:

- 85–100: Strong
- 70–84: Good
- 50–69: Needs attention
- 0–49: Critical improvements

Wording should stay advisory and technical.

---

# 9. AI LAYER

The AI layer must be provider-agnostic.

Create an interface such as:

```ts
interface AIProvider {
  generateAuditSummary(input: AuditSummaryInput): Promise<AuditSummary>
  generateContent?(input: ContentInput): Promise<GeneratedContent>
}
```

Use environment variables for:

- provider
- model
- API key
- max tokens
- temperature

The default runtime goal is:

**use a low-cost model for routine tasks**

The AI should receive structured JSON only.

Avoid sending complete raw HTML unless a specific feature later requires it.

Example AI input:

```json
{
  "site_score": 67,
  "industry": "real_estate",
  "checks": [
    {
      "id": "meta_pixel",
      "status": "detected"
    },
    {
      "id": "cookie_policy",
      "status": "not_detected"
    }
  ]
}
```

Expected AI output should use structured JSON schema.

Example:

```json
{
  "summary": "...",
  "top_priorities": [
    {
      "title": "...",
      "reason": "...",
      "severity": "high"
    }
  ]
}
```

Validate model output before storing/displaying it.

Fallback:

If AI fails, generate deterministic text from templates.

The audit must never depend entirely on AI availability.

---

# 10. DATABASE

Use PostgreSQL.

Supabase is acceptable and preferred if it reduces development time and fixed cost.

Keep DB implementation portable.

Initial tables:

## audits

- id
- normalized_url
- hostname
- industry
- site_score
- status
- started_at
- completed_at
- created_at
- source
- utm_source
- utm_medium
- utm_campaign

## audit_checks

- id
- audit_id
- check_id
- category
- status
- numeric_score
- confidence
- value_json
- evidence
- created_at

## audit_summaries

- id
- audit_id
- provider
- model
- summary
- priorities_json
- created_at

## leads

- id
- audit_id
- email
- first_name nullable
- consent_marketing boolean
- created_at

## affiliate_clicks

- id
- audit_id nullable
- partner
- destination
- detected_issue nullable
- utm_source nullable
- utm_campaign nullable
- created_at

## analytics_events

- id
- session_id
- audit_id nullable
- event_name
- metadata_json
- created_at

## app_settings

Use carefully for non-secret configuration.

Secrets belong in environment variables.

---

# 11. EMAIL CAPTURE

MVP should support email capture.

Possible flow:

Show partial result immediately.

Then:

**Ricevi il report completo via email**

Capture:

- email
- optional first name
- explicit marketing consent separate from service delivery when applicable

Keep service email and marketing consent separate in data modeling.

Email provider should be abstracted.

Possible provider:

Resend or equivalent low-cost transactional service.

Provide a dev/mock mode.

---

# 12. COOKIEYES AFFILIATE FLOW

The main affiliate CTA should appear only when relevant.

Example:

Audit detects consent/cookie-related concern.

UI:

**Approfondisci la gestione cookie e consenso**

Click goes to:

`GET /go/cookieyes?audit=<id>`

Backend:

1. validates partner
2. logs affiliate_click
3. appends configured UTM parameters
4. redirects with HTTP 302/307 to affiliate URL

Environment variable example:

`COOKIEYES_AFFILIATE_URL`

Never hardcode personal affiliate IDs in source.

Build affiliate partner routing generically:

`/go/[partner]`

Possible future partners can reuse the same system.

---

# 13. ADMIN DASHBOARD

MVP admin should show:

- total audits
- audits today
- audits last 7 days
- average Site Score
- email leads
- email capture rate
- affiliate clicks
- affiliate CTR
- top detected issues
- top technologies detected
- source / UTM breakdown

Also show recent audits.

Admin authentication should be simple but secure.

Use Supabase Auth if Supabase is adopted.

MVP can support one admin user.

---

# 14. ANALYTICS EVENTS

Track at minimum:

- landing_view
- audit_started
- audit_completed
- audit_failed
- results_viewed
- email_submitted
- affiliate_clicked

These events should live in the internal DB.

External analytics may be added later.

---

# 15. CONTENT ENGINE — PHASE 2

After MVP receives enough real audits, build the automated content engine.

IMPORTANT:

Never publish invented statistics.

Statistics derived from the audit database must have a minimum sample size.

Default:

**minimum n = 30**

Example allowed:

“Su 126 siti di agenzie immobiliari analizzati…”

Before the threshold is reached, publish evergreen educational content.

---

# 16. AUTOMATIC CONTENT TYPES

Create configurable content formats.

Initial formats:

1. Data Insight
2. Educational
3. Problem / Pain
4. Quiz
5. Site Score concept
6. Conversion CTA

Example scheduling:

- Monday: Data insight
- Wednesday: Educational
- Friday: Conversion

The content engine should eventually run automatically.

---

# 17. CONTENT GENERATION PIPELINE

Possible flow:

Weekly scheduler
→ query audit DB
→ compute verified insights
→ select content format
→ AI generates copy
→ validate output
→ render creative
→ place in queue
→ publish through existing social integration

The owner already has Claude/social-related setup outside this repository.

Claude Code should first inspect what integrations or capabilities are actually available in the current environment before designing a new publisher.

Prefer reusing an existing social publishing setup where practical.

If direct publishing is unavailable, support an adapter interface.

Example:

```ts
interface SocialPublisher {
  publish(post: SocialPost): Promise<PublishResult>
  schedule?(post: SocialPost): Promise<PublishResult>
}
```

Potential implementations:

- existing Claude-connected social workflow
- Buffer
- Meta APIs
- LinkedIn APIs
- other provider

Do not tightly couple the content engine to one provider.

---

# 18. AUTOMATIC CREATIVE GENERATION

Avoid random AI image generation for the standard feed.

Use deterministic branded templates.

Recommended:

HTML/CSS templates rendered to 1080×1350 PNG.

Templates should accept:

- eyebrow
- headline
- stat
- body
- CTA
- footer/domain

Create approximately 6–10 reusable layouts over time.

Rendering options:

- Playwright screenshot
- Puppeteer
- Satori
- Sharp

Choose the lightest solution compatible with deployment.

The system should generate consistent, premium editorial graphics.

---

# 19. CONTENT QUEUE DATABASE

Future tables:

## content_posts

- id
- type
- source_type
- source_reference
- headline
- body
- cta
- image_url
- status
- scheduled_at
- published_at
- created_at

## content_publications

- id
- content_post_id
- platform
- external_id
- status
- published_at
- metadata_json

## content_insights

- id
- industry
- metric
- sample_size
- value
- period_start
- period_end
- source_query_hash
- created_at

Every data-driven claim should be traceable.

---

# 20. SEO ENGINE — PHASE 3

Later, use real insights to create useful SEO content.

Examples:

- cookie policy for real estate agency websites
- Meta Pixel on real estate websites
- website performance for agencies
- website audit checklist for agencies

Avoid mass publishing low-quality AI pages.

Every article should have:

- clear search intent
- useful original insight
- human-readable structure
- internal link to free audit
- factual source for SiteCheck-derived statistics

Future vertical pages:

- /site-check/agenzie-immobiliari
- /site-check/hotel
- /site-check/ristoranti
- /site-check/ecommerce

---

# 21. ADS ENGINE — PHASE 4

Ads automation is a future module.

Start with manual campaign creation.

Track conversions accurately first.

Desired funnel metrics:

- spend
- impressions
- clicks
- landing views
- audit_started
- audit_completed
- email leads
- affiliate clicks
- paid conversions where measurable

Primary business KPI:

**cost per completed audit**

Later:

**revenue / profit per acquired audit**

---

# 22. META ADS AUTOMATION

Future design should support:

- Meta Marketing API
- campaign performance ingestion
- creative-level metrics
- spend caps
- automatic pause rules
- controlled budget scaling
- creative replacement queue

Safety rules are mandatory.

Example configuration:

- daily budget cap
- monthly budget cap
- maximum CPA
- maximum daily increase percentage
- emergency stop
- minimum data threshold before actions

Example rules:

If:
- spend >= €15
- completed audits = 0

Then:
- pause ad

If:
- cost per completed audit below target
- enough conversions collected

Then:
- increase budget by a limited percentage

Automated ads changes must be conservative and auditable.

Never build an unbounded autonomous spending loop.

---

# 23. SELF-SUSTAINING GROWTH LOOP

Long-term target:

Ads / SEO / social
→ visitors
→ audits
→ verified data
→ automated insights
→ content
→ more traffic
→ affiliate + paid revenue
→ controlled reinvestment

This is a gradual system.

Prioritize unit economics over feature count.

---

# 24. TECHNOLOGY STACK

Claude Code should select a modern, maintainable stack.

Preferred baseline:

- Next.js
- TypeScript
- App Router
- Tailwind CSS
- PostgreSQL
- Supabase where useful
- Zod
- server-side API routes / server actions where appropriate

Deployment must remain compatible with common Node-compatible hosting.

The owner already has hosting.

Before committing to a deployment architecture, document:

- Node support required
- background jobs / cron requirements
- database connectivity
- environment variable support
- storage needs

Avoid assuming Vercel is required.

---

# 25. REPOSITORY STRUCTURE

Suggested structure:

```text
/
├── AI/
│   ├── MASTER_SPEC.md
│   ├── CURRENT_TASK.md
│   ├── ARCHITECTURE.md
│   ├── DECISIONS.md
│   └── CHANGELOG_AI.md
├── src/
│   ├── app/
│   ├── components/
│   ├── features/
│   │   ├── audit/
│   │   ├── affiliate/
│   │   ├── leads/
│   │   ├── analytics/
│   │   ├── admin/
│   │   └── content/
│   └── lib/
│       ├── db/
│       ├── ai/
│       ├── security/
│       └── config/
├── scripts/
├── tests/
├── .env.example
├── CLAUDE.md
└── README.md
```

Claude may adjust this structure when there is a strong technical reason.

Document any significant deviation in `AI/DECISIONS.md`.

---

# 26. SECURITY REQUIREMENTS

Security is important because users submit arbitrary URLs.

Mandatory:

- SSRF protection
- URL scheme validation
- DNS/IP validation
- request timeout
- response size limit
- redirect limit
- rate limiting
- safe HTML parsing
- no arbitrary script execution
- no browser execution against untrusted pages during MVP unless strongly sandboxed
- sanitize displayed strings
- validate all API payloads
- protect admin routes
- secrets only in environment variables
- log failures without exposing secrets

If browser automation is later used, isolate it carefully.

---

# 27. ABUSE PREVENTION

MVP should implement reasonable limits.

Examples:

- per-IP audit rate limit
- per-session audit limit
- timeout
- max response size
- max redirects
- CAPTCHA integration only if abuse becomes real

Avoid adding friction before abuse exists.

---

# 28. PRIVACY PRINCIPLES

Store the minimum necessary data.

Audit data can include:

- URL
- detected technologies
- scores
- timestamps

Avoid storing entire fetched HTML indefinitely.

If raw HTML is temporarily needed for processing:

- keep in memory when possible
- discard after analysis
- avoid persistent storage by default

Email addresses should be stored securely.

Marketing consent must be explicit and separated from transactional delivery.

---

# 29. OBSERVABILITY

Provide basic structured logs.

Track:

- audit duration
- fetch errors
- detector errors
- external API failures
- AI failures
- affiliate redirect errors
- email delivery errors

One failing detector should not crash the entire audit.

Use graceful degradation.

---

# 30. TESTING

At minimum:

## Unit tests

- URL normalization
- SSRF blocker
- score calculation
- detector functions
- affiliate redirects
- AI output validation

## Integration tests

- audit endpoint
- DB persistence
- results retrieval
- lead capture

## E2E

Basic happy path:

Landing
→ submit URL
→ complete audit
→ results
→ submit email
→ click affiliate CTA

---

# 31. DEVELOPMENT PRINCIPLES

Claude Code must:

1. read this file before major work
2. update architecture documentation
3. work in small verified phases
4. commit frequently with clear messages
5. keep builds green
6. avoid premature abstraction
7. avoid premature paid infrastructure
8. prefer deterministic code over AI when possible
9. make integrations replaceable
10. document manual setup steps clearly

---

# 32. PHASED DELIVERY PLAN

## PHASE 0 — Foundation

Deliver:

- initialize Next.js + TypeScript
- lint
- formatting
- env validation
- README
- base app shell
- DB decision
- architecture documentation
- GitHub-ready project

Success criteria:

- clean install
- app boots
- build passes
- lint passes

---

## PHASE 1 — Audit Engine

Deliver:

- URL form
- URL normalization
- SSRF protection
- safe fetcher
- modular detectors
- score calculation
- results UI
- local/mock persistence where necessary

Success criteria:

A real public website URL produces a meaningful deterministic Site Score.

---

## PHASE 2 — Persistence + Leads + Affiliate

Deliver:

- PostgreSQL/Supabase integration
- audit persistence
- lead capture
- transactional email adapter
- affiliate redirect tracking
- CookieYes configurable destination
- basic admin dashboard

Success criteria:

We can measure:

- number of audits
- leads
- affiliate clicks

---

## PHASE 3 — AI Summaries

Deliver:

- provider abstraction
- economical model configuration
- structured prompts
- JSON schema validation
- deterministic fallback

Success criteria:

The user receives a concise useful interpretation of real audit data.

---

## PHASE 4 — Launch Analytics

Deliver:

- internal event tracking
- UTM capture
- admin conversion metrics
- production deployment documentation

Success criteria:

The MVP is ready to receive paid or organic traffic.

---

## PHASE 5 — Content Engine

Start only after real audit data exists.

Deliver:

- verified aggregate insights
- minimum sample threshold
- content queue
- AI copy
- deterministic creative templates
- social publisher adapter
- scheduler

Success criteria:

At least 3 posts/week can be generated from real data with minimal human work.

---

## PHASE 6 — SEO Engine

Deliver later.

---

## PHASE 7 — Ads Engine

Deliver later after conversion tracking is proven.

---

# 33. INITIAL BUSINESS VALIDATION

The project should be optimized for validation.

Before adding expensive features, measure:

1. landing → audit start rate
2. audit start → audit completion rate
3. results → email capture rate
4. results → affiliate click rate
5. cost per completed audit
6. affiliate conversion when available

The first goal is evidence of demand.

---

# 34. INITIAL TARGET AUDIENCE

Initial niche:

**Italian real estate agencies**

Tone:

- professional
- clear
- practical
- trustworthy
- contemporary
- technical but understandable

Avoid fear-based legal messaging.

Focus on:

- website health
- technical quality
- tracking clarity
- performance
- discoverability
- points worth checking

---

# 35. BRAND DIRECTION

Temporary product name:

**SiteCheck AI**

Brand should feel:

- clean
- technology-driven
- credible
- simple
- slightly premium
- easy to understand in 2 seconds

Avoid generic “AI neon” aesthetics.

Prefer:

- white / near-white background
- dark typography
- one strong accent
- clear score visualization
- editorial UI
- mobile-first layout

---

# 36. HOMEPAGE STRUCTURE

Suggested:

## Hero

Headline:

**Quanto è sano il sito della tua agenzia?**

Subheadline:

**Analizza in pochi secondi cookie, tracking, SEO, performance e altri elementi tecnici del tuo sito.**

URL input

CTA:

**Analizza gratis**

Trust microcopy:

**Analisi tecnica automatizzata. Nessuna installazione richiesta.**

---

## What we check

Five cards:

- Cookie & Consent
- Privacy signals
- Tracking
- SEO
- Performance

---

## How it works

1. Inserisci il sito
2. Lo analizziamo
3. Ricevi il Site Score

---

## Example result

Show a fake/demo visual only clearly labeled as example.

---

## CTA

Repeat audit box.

---

# 37. RESULTS UX

Results should prioritize clarity.

Above the fold:

- URL
- timestamp
- Site Score
- status label
- 3 highest-priority findings

Then category cards.

Then CTA relevant to detected problem.

Then email/report CTA.

Avoid showing dozens of technical checks immediately.

Progressive disclosure:

Summary first
→ details on expand.

---

# 38. ADMIN UX

Simple.

Pages:

- Overview
- Audits
- Leads
- Affiliate
- Insights
- Settings

Future:

- Content
- Social
- Ads

---

# 39. CONFIGURATION

Create `.env.example`.

Possible variables:

```env
DATABASE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

AI_PROVIDER=
AI_API_KEY=
AI_MODEL=

PAGESPEED_API_KEY=

EMAIL_PROVIDER=
EMAIL_API_KEY=
EMAIL_FROM=

COOKIEYES_AFFILIATE_URL=

ADMIN_EMAIL=

APP_URL=
```

Names can be improved, but keep config centralized.

---

# 40. COST CONTROL

The system should expose or log external usage where practical.

Avoid:

- AI call per detector
- huge prompts
- raw HTML sent to AI
- unnecessary browser sessions
- expensive background jobs
- frequent rescans before monetization exists

Prefer:

one AI summary call per completed audit.

Later optimize with caching.

---

# 41. FUTURE SITE MONITORING

Architecture should make recurring scans possible later.

Future tables might include:

- monitored_sites
- monitoring_runs
- monitoring_changes
- subscriptions

Do not implement yet.

---

# 42. FUTURE REFERRAL LOOP

Possible future mechanic:

Invite another business owner
→ unlock advanced analysis / additional scan

Do not implement initially.

---

# 43. FUTURE INDUSTRY CLASSIFICATION

Possible approaches:

- user selects industry
- infer from site
- hybrid

For MVP real estate campaign, default industry can be:

`real_estate`

Keep DB field generic.

---

# 44. DATA-DRIVEN CONTENT INTEGRITY

This is a core rule.

Every statistic published from SiteCheck data should be reproducible.

For every insight store:

- sample size
- time period
- vertical
- metric definition
- query/version hash where feasible

AI can explain data.

AI cannot fabricate data.

---

# 45. ADS SAFETY

Future automation must always include:

- fixed account-level spend limits
- per-day limits
- per-campaign limits
- change logs
- manual emergency stop
- maximum percentage budget increase
- minimum data thresholds

No autonomous unbounded budget scaling.

---

# 46. CLAUDE CODE WORKING PROTOCOL

Claude Code is the primary implementation agent.

Before starting a phase:

1. read `CLAUDE.md`
2. read `AI/MASTER_SPEC.md`
3. read `AI/ARCHITECTURE.md`
4. read `AI/DECISIONS.md`
5. inspect repository
6. update `AI/CURRENT_TASK.md`

During work:

- implement one coherent phase
- run tests
- run lint
- run build
- fix failures
- document decisions

After work:

- update `AI/CHANGELOG_AI.md`
- update architecture if needed
- summarize changes
- list manual steps
- list environment variables
- list blockers
- commit changes

---

# 47. FIRST TASK FOR CLAUDE CODE

After reading this file, execute only:

## Phase 0 — Foundation

Tasks:

1. inspect repository state
2. ensure repository naming/branch state is sane
3. establish `main` as the durable primary branch if practical
4. initialize a modern Next.js TypeScript project
5. configure linting
6. configure formatting
7. configure environment validation
8. create `.env.example`
9. establish the proposed modular project structure
10. create a minimal polished landing-page shell
11. document architecture
12. document important decisions
13. make sure `npm install`, lint and production build succeed
14. commit the foundation

Do not implement the full audit engine yet.

At completion, report:

- stack
- project structure
- commands
- build status
- test status
- architecture decisions
- manual setup required
- next recommended task

Then wait for approval before Phase 1.

---

# 48. DEFINITION OF SUCCESS FOR THE BUSINESS

The early version is successful when:

- a visitor can enter a URL
- the system returns a credible Site Score
- the owner can see completed audits
- a visitor can leave an email
- relevant visitors can click an affiliate recommendation
- acquisition and conversion are measurable
- software cost stays extremely low
- future content automation can use real collected data

---

# 49. CORE MENTAL MODEL

Build this project as a small profitable machine, not as a large SaaS from day one.

The order is:

**Useful tool → traffic → data → conversion → revenue → automation → scale**

Every feature should justify its place in that sequence.

---

# 50. CLAUDE FINAL INSTRUCTION

Claude Code:

Treat this specification as the primary product brief.

Use your engineering judgment where implementation details are unspecified.

When a decision materially changes cost, architecture, security, vendor lock-in, or business behavior, document it in `AI/DECISIONS.md`.

Build incrementally.

Prioritize working software, measurable conversion, low operating cost, and maintainability.

Start with **Phase 0 only**.
