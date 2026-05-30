# 📅 Daily Sprint Checklist & Quick Reference
## Docs Analysis Platform — 14 Day POC

---

## 🎯 Quick Links

- **Task Breakdown:** `task-breakdown-complete.md`
- **Full PRD:** `docs-analysis-prd.md`
- **Implementation Guide:** `corrected-implementation-guide.md`
- **Architecture:** `revised-analysis-architecture.md`
- **GitHub Repo:** [Your Repo URL]
- **Vercel Staging:** [Your Vercel URL]
- **Supabase Dashboard:** [Your Supabase URL]
- **n8n Instance:** [Your n8n URL]

---

## 📋 Day-by-Day Checklist

### Day 1: Foundation & Next.js Setup

**Goal:** Skeleton app deployed to Vercel

**Tasks:**
- [ ] Task 2.1: Create Next.js project
  - `npx create-next-app@latest docs-analysis ...`
  - `npm run dev` works
  - Deployed to Vercel
  
- [ ] Task 2.2: Install dependencies
  - [ ] All deps installed
  - [ ] `npm audit` clean
  - [ ] `npm run lint` passes
  
- [ ] Task 2.3: Create folder structure
  - [ ] All folders created
  - [ ] `.gitkeep` files added
  
- [ ] Task 2.4: Configure TypeScript
  - [ ] `tsconfig.json` strict
  - [ ] `.eslintrc.json` configured
  - [ ] `prettier.config.js` configured
  
- [ ] Task 2.5: Create core library files
  - [ ] `src/lib/db.ts` ✓
  - [ ] `src/lib/auth.ts` ✓
  - [ ] `src/lib/ai/openai.ts` ✓
  
- [ ] Task 2.6: Setup validation schemas
  - [ ] Zod schemas created
  - [ ] Types inferred

**Daily Standup:**
```
👇 Did:
- Created Next.js project
- Setup Tailwind + shadcn/ui
- Deployed to Vercel

👉 Doing today:
- Database schema
- Authentication setup

🚧 Blockers:
- None
```

**EOD Verification:**
```bash
# Should pass:
npm run dev        # ✓ Runs locally
npm run build      # ✓ No errors
npm run lint       # ✓ No warnings
git status         # ✓ All committed
```

**Expected State:** ✅ Live at `https://[project].vercel.app/`

---

### Day 2: Database Schema & Authentication

**Goal:** Database ready, auth working

**Tasks:**
- [ ] Task 3.1: Create Supabase tables
  - [ ] All tables created
  - [ ] All indexes created
  - [ ] RLS policies enabled
  - [ ] Search function created
  - [ ] Test query successful

- [ ] Task 3.2: Setup authentication
  - [ ] Auth providers configured
  - [ ] Callback route created
  - [ ] Sign-in page working
  - [ ] Middleware configured
  - [ ] Can sign in/out

- [ ] Task 3.3: Test DB connectivity
  - [ ] Can connect to Supabase
  - [ ] Can CRUD teams table
  - [ ] RLS policies working
  - [ ] Error handling works

**Daily Standup:**
```
👇 Did:
- Created all database tables
- Enabled pgvector extension
- Setup Supabase Auth

👉 Doing today:
- Projects CRUD endpoints
- Projects list page

🚧 Blockers:
- None
```

**EOD Verification:**
```bash
# Test database
npm run test:db

# Test auth
npm run dev
# Navigate to /auth/signin
# Sign in with email
# Should redirect to /en/projects
```

**Expected State:** ✅ Can sign in and see empty dashboard

---

### Days 3-4: Projects Module

**Goal:** Projects CRUD fully functional

**Day 3 Tasks:**
- [ ] Task 4.1: Create Projects CRUD actions
  - [ ] `createProject` working
  - [ ] `updateProject` working
  - [ ] `updateProjectStage` working
  - [ ] `deleteProject` working
  - [ ] Audit logs created

- [ ] Task 4.2: Create Projects list page
  - [ ] Displays all team projects
  - [ ] Sorted correctly
  - [ ] Pagination if needed
  - [ ] Mobile responsive

**Day 4 Tasks:**
- [ ] Task 4.3: Create Project detail page
  - [ ] Shows project info
  - [ ] Pipeline visualization
  - [ ] Can change stage
  - [ ] Shows attached documents

- [ ] Task 4.4: Create Project form
  - [ ] Validation working
  - [ ] Error messages clear
  - [ ] Create & edit modes

- [ ] Task 4.5: Create Pipeline component
  - [ ] Shows all 6 stages
  - [ ] Highlights current stage
  - [ ] Can move to next stage

- [ ] Task 4.6: Test Projects module
  - [ ] All CRUD operations work
  - [ ] RLS prevents unauthorized
  - [ ] Audit logs recorded

**Daily Standup (Day 3):**
```
👇 Did:
- Created projects CRUD actions
- Created projects list page
- Implemented stage tracking

👉 Doing today:
- Project detail page
- Pipeline visualization
- Form component

🚧 Blockers:
- None
```

**Daily Standup (Day 4):**
```
👇 Did:
- Completed detail page
- Built pipeline component
- All CRUD operations working

👉 Doing today:
- Document upload module
- PDF extraction

🚧 Blockers:
- None
```

**EOD Verification (Day 4):**
```bash
# Test projects
npm run dev

# Manual test:
# 1. Create project "Test Alpha"
# 2. Edit name to "Test Beta"
# 3. Change stage to "planning"
# 4. Verify in database
# 5. Delete project
```

**Expected State:** ✅ Projects fully CRUD, pipeline working

---

### Days 5-6: Documents Module

**Goal:** Upload, embed, and index documents

**Day 5 Tasks:**
- [ ] Task 5.1: Document upload action
  - [ ] Can upload PDF
  - [ ] Validates file size
  - [ ] Uploads to Vercel Blob
  - [ ] Stores in Supabase

- [ ] Task 5.2: PDF text extraction
  - [ ] Can extract text from PDF
  - [ ] Multi-page handling
  - [ ] Preserves structure

- [ ] Task 5.3: Embedding generation
  - [ ] Embedding generated post-upload
  - [ ] Stored in Supabase
  - [ ] Indexed status tracked

**Day 6 Tasks:**
- [ ] Task 5.4: Document upload UI
  - [ ] File input works
  - [ ] Document type selector
  - [ ] Upload progress shown
  - [ ] Success/error messages

- [ ] Task 5.5: Documents list page
  - [ ] Lists all documents
  - [ ] Shows type & upload date
  - [ ] Shows indexed status
  - [ ] Can delete documents

- [ ] Task 5.6: Test document module
  - [ ] Upload ETT document
  - [ ] Upload Hardware document
  - [ ] Documents appear in list
  - [ ] Embeddings generate
  - [ ] Can delete document

**Daily Standup (Day 5):**
```
👇 Did:
- Implemented document upload
- Created PDF extraction
- Setup embedding generation

👉 Doing today:
- Document upload UI
- Documents list page
- Test all operations

🚧 Blockers:
- None
```

**Daily Standup (Day 6):**
```
👇 Did:
- Completed upload UI
- Built documents list
- All tests passing

👉 Doing today:
- Semantic search
- Document selector

🚧 Blockers:
- None
```

**EOD Verification (Day 6):**
```bash
# Test documents
npm run dev

# Manual test:
# 1. Upload ETT spec PDF
# 2. Upload hardware inventory PDF
# 3. Verify in documents list
# 4. Check embedded status
# 5. Delete one document
# 6. Verify delete works
```

**Expected State:** ✅ Can upload, embed, and manage documents

---

### Days 7-8: AI Integration (Semantic Search)

**Goal:** Semantic search fully functional

**Day 7 Tasks:**
- [ ] Task 6.1: Semantic search function
  - [ ] Generates query embedding
  - [ ] Searches pgvector
  - [ ] Returns top-5 results
  - [ ] Includes similarity scores

- [ ] Task 6.2: Document search action
  - [ ] Takes query string
  - [ ] Returns ranked results

**Day 8 Tasks:**
- [ ] Task 6.3: Document selector component
  - [ ] User enters query
  - [ ] Results display with %
  - [ ] Can checkbox-select docs
  - [ ] Shows selected count
  - [ ] Error messages clear

- [ ] Task 6.4: Test semantic search
  - [ ] Search returns relevant docs
  - [ ] Top result is most similar
  - [ ] No results handled
  - [ ] Selection works

- [ ] Task 6.5: Document search page
  - [ ] Standalone search UI
  - [ ] Can search all documents
  - [ ] Filter by type works

**Daily Standup (Day 7):**
```
👇 Did:
- Implemented semantic search
- Created search action
- pgvector queries working

👉 Doing today:
- Document selector component
- Document search page
- Integration tests

🚧 Blockers:
- None
```

**Daily Standup (Day 8):**
```
👇 Did:
- Built document selector
- Created search page
- All tests passing

👉 Doing today:
- Analysis trigger
- n8n integration

🚧 Blockers:
- None
```

**EOD Verification (Day 8):**
```bash
# Test semantic search
npm run dev

# Manual test:
# 1. Go to /en/documents/search
# 2. Search "antenna RF specifications"
# 3. Verify relevant docs appear
# 4. Check similarity scores
# 5. Select 2 documents
# 6. Verify checkbox state
```

**Expected State:** ✅ Can search and select documents semantically

---

### Days 9-10: Analysis Module & n8n

**Goal:** Full analysis workflow end-to-end

**Day 9 Tasks:**
- [ ] Task 7.1: Trigger analysis action
  - [ ] Takes selected documents
  - [ ] Creates analysis record
  - [ ] Sends webhook to n8n
  - [ ] Returns analysisId
  - [ ] Audit log created

- [ ] Task 7.2: n8n webhook client
  - [ ] Calls n8n webhook
  - [ ] Sends correct payload
  - [ ] Handles timeouts/errors

- [ ] Task 7.3: n8n webhook receiver
  - [ ] Receives webhook from n8n
  - [ ] Validates payload
  - [ ] Updates analysis with ZIP URL
  - [ ] Revalidates project page

**Day 10 Tasks:**
- [ ] Task 7.4: Create n8n workflow
  - [ ] Webhook receiver working
  - [ ] Downloads PDFs
  - [ ] Python annotation runs
  - [ ] ZIP created
  - [ ] ZIP uploaded
  - [ ] Response sent back

- [ ] Task 7.5: Python annotation script
  - [ ] Extracts PDF text
  - [ ] Identifies matches
  - [ ] Annotates PDFs
  - [ ] Returns metadata

- [ ] Task 7.6: Test analysis & n8n
  - [ ] Can trigger from UI
  - [ ] Status shows "processing"
  - [ ] n8n webhook received
  - [ ] Workflow executes
  - [ ] ZIP created
  - [ ] Status updates to "completed"
  - [ ] ZIP downloadable

**Daily Standup (Day 9):**
```
👇 Did:
- Implemented trigger analysis
- Created n8n client
- Webhook receiver ready
- n8n workflow skeleton

👉 Doing today:
- Finish n8n workflow
- Python annotation script
- Integration testing

🚧 Blockers:
- None
```

**Daily Standup (Day 10):**
```
👇 Did:
- Completed n8n workflow
- Python script working
- End-to-end tests passing

👉 Doing today:
- Document-project linking
- Analysis results display
- i18n setup

🚧 Blockers:
- None
```

**EOD Verification (Day 10):**
```bash
# Test analysis workflow
npm run dev

# Manual test:
# 1. Create project "Test Analysis"
# 2. Attach ETT document
# 3. Go to analysis page
# 4. Search for "requirement"
# 5. Select 2 documents
# 6. Click "Run Analysis"
# 7. Status shows "processing"
# 8. Wait 5-10 minutes for n8n
# 9. Status updates to "completed"
# 10. Download ZIP
# 11. Extract and verify PDFs annotated
```

**Expected State:** ✅ Full analysis workflow working, ZIP downloadable

---

### Days 11-12: Linking & Polish

**Goal:** Feature complete, i18n and SEO ready

**Day 11 Tasks:**
- [ ] Task 8.1: Attach documents action
  - [ ] Can attach to project
  - [ ] Prevents duplicates
  - [ ] Audit log created

- [ ] Task 8.2: Attach documents dialog
  - [ ] Shows available documents
  - [ ] Checkbox selection
  - [ ] "Attach Selected" works

- [ ] Task 8.3: Update project detail
  - [ ] Shows attached documents
  - [ ] Can remove attachment
  - [ ] "Attach More" button

**Day 12 Tasks:**
- [ ] Task 8.4: Analysis results component
  - [ ] Shows status (pending/completed)
  - [ ] Loading spinner works
  - [ ] ZIP download link shows
  - [ ] Auto-refresh every 5s

- [ ] Task 8.5: Project analysis page
  - [ ] Shows DocumentSelector
  - [ ] Shows AnalysisResults
  - [ ] Can run multiple analyses

- [ ] Task 8.6: Setup i18n
  - [ ] Routes work `/en/` and `/es/`
  - [ ] Translations complete
  - [ ] Language switcher works
  - [ ] hreflang tags present

- [ ] Task 8.7: Setup SEO
  - [ ] All pages have titles
  - [ ] All pages have descriptions
  - [ ] OG tags working
  - [ ] robots.txt configured
  - [ ] sitemap.xml generating

- [ ] Task 8.8: Accessibility audit
  - [ ] Skip link works
  - [ ] All inputs labeled
  - [ ] Focus outlines visible
  - [ ] Color contrast ≥4.5:1
  - [ ] Keyboard nav works

**Daily Standup (Day 11):**
```
👇 Did:
- Document linking complete
- Analysis results display
- i18n routes setup

👉 Doing today:
- Finish i18n
- SEO setup
- Accessibility audit

🚧 Blockers:
- None
```

**Daily Standup (Day 12):**
```
👇 Did:
- i18n fully functional (EN/ES)
- SEO metadata complete
- Accessibility audit passed

👉 Doing today:
- Unit tests
- E2E tests
- Final optimization

🚧 Blockers:
- None
```

**EOD Verification (Day 12):**
```bash
# Test i18n
npm run dev
# Switch between /en and /es
# Verify translations

# Test SEO
# Check page source
# Verify title, description, og:tags

# Test accessibility
# Tab through entire app
# Test with screen reader
# Run Lighthouse
```

**Expected State:** ✅ Feature complete, i18n + SEO + A11y

---

### Days 13-14: Testing & Deployment

**Goal:** Production ready, deployed, monitored

**Day 13 Tasks:**
- [ ] Task 9.1: Unit tests
  - [ ] DocumentUploader tests
  - [ ] DocumentSelector tests
  - [ ] ProjectForm tests
  - [ ] 80%+ coverage

- [ ] Task 9.2: E2E tests
  - [ ] Upload document test
  - [ ] Create project test
  - [ ] Attach document test
  - [ ] Trigger analysis test
  - [ ] Download ZIP test

- [ ] Task 9.3: Performance testing
  - [ ] LCP < 2.5s ✓
  - [ ] INP < 200ms ✓
  - [ ] CLS < 0.1 ✓
  - [ ] Lighthouse >90 ✓

**Day 14 Tasks:**
- [ ] Task 9.4: Security audit
  - [ ] No hardcoded secrets
  - [ ] HTTPS everywhere
  - [ ] RLS policies verified
  - [ ] Injection prevention
  - [ ] XSS prevention

- [ ] Task 9.5: Final QA
  - [ ] No critical bugs
  - [ ] All tests passing
  - [ ] Cross-browser tested
  - [ ] Mobile tested
  - [ ] Edge cases handled

- [ ] Task 9.6: Documentation
  - [ ] README updated
  - [ ] CONTRIBUTING guide
  - [ ] API documentation
  - [ ] Deployment guide

- [ ] Task 9.7: Final deployment
  - [ ] All tests pass in CI
  - [ ] Merged to main
  - [ ] Vercel deployment successful
  - [ ] Monitoring active
  - [ ] Team trained

**Daily Standup (Day 13):**
```
👇 Did:
- Created unit tests (80%+ coverage)
- Created E2E tests (all passing)
- Performance optimization complete
- Lighthouse score: 92

👉 Doing today:
- Security audit
- Final QA
- Documentation
- Deploy to production

🚧 Blockers:
- None
```

**Daily Standup (Day 14):**
```
👇 Did:
- Security audit passed ✓
- Final QA complete ✓
- Documentation complete ✓
- Deployed to production ✓
- Monitoring active ✓

👉 Demo & handoff

🚧 Blockers:
- None

🎉 POC COMPLETE!
```

**Final Verification (EOD Day 14):**
```bash
# Production deployment
# Live at: https://[your-domain].com

# All tests pass
npm run test          # ✓ Unit tests
npm run test:e2e      # ✓ E2E tests

# Production checks
# 1. Sign in works
# 2. Upload document works
# 3. Create project works
# 4. Semantic search works
# 5. Trigger analysis works
# 6. Download ZIP works
# 7. i18n works (/en and /es)
# 8. SEO metadata present
# 9. A11y passed
# 10. Mobile responsive

# Monitoring
# - Vercel: No deploy errors
# - Sentry: No errors
# - Analytics: Traffic flowing
# - Uptime: 100% last 24h
```

**Expected State:** ✅ **PRODUCTION READY POC SHIPPED**

---

## 📊 Daily Standup Template

```
🚀 What did I ship yesterday?
- [Feature/task completed]
- [Another completed item]

📝 What am I building today?
- [Today's focus #1]
- [Today's focus #2]

🚧 Blockers / Help needed?
- [Issue #1]
- [Need help with X]
```

**Time:** 9 AM daily  
**Duration:** 15 min  
**Format:** Async via Slack, sync standup if needed

---

## 🔑 Key Files to Monitor

### Core Files (Daily Commits)
```
src/app/[lang]/projects/
src/app/[lang]/documents/
src/app/[lang]/projects/[id]/analysis/
src/components/
src/lib/
```

### Configuration
```
.env.local
tsconfig.json
next.config.ts
tailwind.config.ts
```

### Tests
```
src/**/*.test.tsx
tests/**/*.spec.ts
```

---

## 🐛 Common Issues & Fixes

### Issue: TypeScript errors
```bash
# Fix:
npx tsc --noEmit
npm run lint
# Fix issues, commit
```

### Issue: Vercel deployment fails
```bash
# Fix:
npm run build
npm run lint
# Check for type errors
# Commit and push
```

### Issue: Supabase connection timeout
```bash
# Fix:
# Check .env.local has correct keys
# Verify Supabase instance is running
# Check network connectivity
```

### Issue: OpenAI API rate limit
```bash
# Fix:
# Check usage at platform.openai.com
# Increase rate limit if needed
# Queue requests if exceeding limits
```

### Issue: n8n workflow not executing
```bash
# Fix:
# Verify webhook URL is correct
# Check n8n logs for errors
# Test webhook manually
# Verify n8n instance is running
```

---

## 📞 Quick Contacts

```
Tech Lead:     [Name] ([Slack] | [Email])
DevOps:        [Name] ([Slack] | [Email])
QA:            [Name] ([Slack] | [Email])
Product:       [Name] ([Slack] | [Email])

Emergencies:
Slack: #docs-analysis
Page: [Pagerduty/On-call]
```

---

## 📅 Sprint Calendar

```
Day 1-2:   Foundation, Database, Auth
Day 3-4:   Projects Module
Day 5-6:   Documents Module
Day 7-8:   Semantic Search
Day 9-10:  Analysis + n8n
Day 11-12: Linking, i18n, SEO, A11y
Day 13-14: Testing, Deployment, Launch

Week 3-4: Monitoring, Feedback, Case Study
```

---

## 🎯 Daily Goals Summary

| Day | Goal | Status |
|-----|------|--------|
| 1 | Skeleton app deployed | ⬜ |
| 2 | Database + Auth | ⬜ |
| 3-4 | Projects CRUD | ⬜ |
| 5-6 | Documents upload | ⬜ |
| 7-8 | Semantic search | ⬜ |
| 9-10 | Analysis workflow | ⬜ |
| 11-12 | Polish + i18n + SEO | ⬜ |
| 13-14 | Testing + Deploy | ⬜ |

---

## 📝 Notes

```
[Space for daily notes, blockers, decisions]
```

---

**Sprint Owner:** [Name]  
**Sprint Start:** [Date]  
**Sprint End:** [Date]  
**Status:** Ready to Launch 🚀
