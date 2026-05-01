# Integration Testing Checklist

Use this checklist to verify that the frontend-backend integration is working correctly.

## Pre-Test Setup

- [ ] Backend is running on `http://localhost:8000`
- [ ] Frontend is running on `http://localhost:5173`
- [ ] MongoDB is connected and accessible
- [ ] Browser console is open (F12)
- [ ] Backend terminal is visible to check for errors

## Chat Page Tests

### Basic Functionality
- [ ] Type a news claim in the input box
- [ ] Press Enter or click "Analyse" button
- [ ] See loading states (5 stages of progress)
- [ ] Receive analysis result from backend (not mock data)
- [ ] Analysis includes: verdict, score, evidence, summary

### Text Input
- [ ] Submit text claim: "Drinking bleach cures COVID"
- [ ] Backend analyzes and returns FALSE verdict ✓

### URL Input
- [ ] Paste a real URL (e.g., https://www.bbc.com/news)
- [ ] Backend fetches and analyzes the page ✓

### Auto-Detection
- [ ] Paste a URL in the text field
- [ ] System auto-detects it as URL (not text) ✓
- [ ] Paste plain text
- [ ] System auto-detects it as text (not URL) ✓

### Error Handling
- [ ] Submit empty text
- [ ] See error message: "text must not be empty" ✓
- [ ] Submit very long text (>50,000 chars)
- [ ] See error: "exceeds maximum length" ✓
- [ ] Disconnect backend and submit claim
- [ ] See error message: "failed to connect" ✓

### Message Display
- [ ] User message appears on right (bubbles)
- [ ] Assistant message appears on left
- [ ] Messages have timestamps
- [ ] Typing indicator shows during analysis
- [ ] Messages persist during session

## History Page Tests

### Loading
- [ ] Navigate to History page
- [ ] See loading spinner initially
- [ ] After 1-2 seconds, history loads ✓
- [ ] History items display with verdicts and dates

### Display
- [ ] Each history item shows:
  - [ ] Verdict badge (TRUE/FALSE/MIXED)
  - [ ] Credibility score (0-100)
  - [ ] Claim text
  - [ ] Date analyzed
  - [ ] Tags (if any)

### Filtering
- [ ] Click on "All" verdict filter
- [ ] See all analyses ✓
- [ ] Click on "TRUE" filter
- [ ] See only TRUE verdicts ✓
- [ ] Click on "FALSE" filter
- [ ] See only FALSE verdicts ✓

### Sorting
- [ ] Select "Most Recent"
- [ ] Newest items appear first ✓
- [ ] Select "Oldest First"
- [ ] Oldest items appear first ✓
- [ ] Select "Highest Score"
- [ ] Items sorted by score descending ✓
- [ ] Select "Lowest Score"
- [ ] Items sorted by score ascending ✓

### Search
- [ ] Type search term in search box
- [ ] Results filter in real-time ✓
- [ ] Search is case-insensitive ✓
- [ ] Clear search
- [ ] All items show again ✓

### Actions
- [ ] Hover over a history item
- [ ] See pin, delete, and expand buttons ✓
- [ ] Click pin button
- [ ] Item marked as pinned (blue pin icon)
- [ ] Click delete button
- [ ] Item removed from list ✓
- [ ] Click item itself
- [ ] Navigate back to Chat page with that analysis ✓

### Error Handling
- [ ] Disconnect backend
- [ ] See error message on History page ✓
- [ ] Message explains what went wrong
- [ ] Button to retry appears

## Dashboard Page Tests

### Loading
- [ ] Navigate to Dashboard
- [ ] See loading spinner
- [ ] After 1-2 seconds, news loads ✓
- [ ] News items display with verdicts

### News Display
- [ ] Each news item shows:
  - [ ] Headline
  - [ ] Verdict badge with score
  - [ ] Category tag
  - [ ] Source and source credibility
  - [ ] Publication time
  - [ ] Excerpt
  - [ ] "Deep-check" button

### Live Status
- [ ] Live indicator pulses (red dot)
- [ ] Shows count of articles
- [ ] Shows last update time

### Categories
- [ ] Click "All" category
- [ ] All news items show ✓
- [ ] Click "Health" category
- [ ] Only Health articles show ✓
- [ ] Click "Technology" category
- [ ] Only Technology articles show ✓
- [ ] Other categories work too ✓

### Breaking News Banner
- [ ] If any breaking news exists
- [ ] See "Breaking" banner ✓
- [ ] Red alert styling ✓
- [ ] Shows recent breaking stories

### Refresh
- [ ] Click "Refresh" button
- [ ] Spinner appears
- [ ] After animation, time updates
- [ ] News list may update (if backend has new data)

### Deep-Check
- [ ] Click "Deep-check" on any article
- [ ] Navigate to Chat page
- [ ] Article headline appears in input ✓
- [ ] Can analyze it as fact-check ✓

### Credibility Bar
- [ ] Verified TRUE articles show green bar at 100%
- [ ] FALSE articles show red bar at low %
- [ ] MIXED articles show orange bar at middle %

### Error Handling
- [ ] Disconnect backend
- [ ] See error message: "Failed to load news" ✓
- [ ] Empty state still shows gracefully
- [ ] Can still navigate other pages

## API Network Tests

### Check Network Requests (F12 → Network Tab)

#### Chat Page - Analyze Request
- [ ] Request URL: `http://localhost:8000/api/analyze/text` (or /url/auto)
- [ ] Method: POST
- [ ] Status: 200 (success)
- [ ] Headers include Content-Type: application/json
- [ ] Request body has `text` field
- [ ] Response includes `verdict`, `risk_score`, `explanation`

#### History Page - History Request
- [ ] Request URL: `http://localhost:8000/api/analyze/history`
- [ ] Method: GET
- [ ] Status: 200
- [ ] Response is array of analysis objects

#### Dashboard Page - News Request
- [ ] Request URL: `http://localhost:8000/news`
- [ ] Method: GET
- [ ] Status: 200
- [ ] Response includes `articles` array
- [ ] Each article has fields: headline, source, verdict, etc.

### Session Cookies
- [ ] Check Cookies (F12 → Storage → Cookies)
- [ ] See cookie: `seethru_session`
- [ ] Cookie value is UUID format
- [ ] Cookie httponly flag is set
- [ ] Cookie expires in 30 days

## Backend Response Format Tests

### Analyze Response Format
- [ ] Check response includes:
  - [ ] `input_type`: "text" or "url" or "image"
  - [ ] `risk_score`: number 0-100
  - [ ] `label`: verdict string
  - [ ] `verdict`: verdict for display
  - [ ] `explanation`: detailed explanation
  - [ ] `evidence`: array of supporting evidence

### History Response Format
- [ ] Check response is array
- [ ] Each item has:
  - [ ] `timestamp`
  - [ ] `input_type`
  - [ ] `verdict`
  - [ ] `risk_score`
  - [ ] `explanation`

### News Response Format
- [ ] Check response has `articles` key
- [ ] Each article has:
  - [ ] `headline`
  - [ ] `source`
  - [ ] `category`
  - [ ] `excerpt`
  - [ ] `verdict` or score

## Cross-Browser Compatibility

- [ ] Chrome/Edge: Works as expected
- [ ] Firefox: Works as expected
- [ ] Safari: Works as expected

## Performance Tests

- [ ] Chat analysis completes in <10 seconds
- [ ] History loads in <3 seconds
- [ ] Dashboard loads in <5 seconds
- [ ] No console errors or warnings

## Data Persistence Tests

- [ ] Refresh page
- [ ] History from previous session still shows ✓
- [ ] Can continue from same chat
- [ ] Session maintained

## Edge Cases

- [ ] Very long claim text (10,000+ characters)
- [ ] Special characters in input (emoji, unicode)
- [ ] Rapid successive requests
- [ ] Network timeout (backend stops responding)
- [ ] Backend returns 500 error
- [ ] Empty response from backend
- [ ] Missing fields in response

## Final Sign-Off

- [ ] All core functionality works
- [ ] Error handling is graceful
- [ ] UI is responsive
- [ ] Data flows correctly
- [ ] No console errors

---

**Approved for Testing**: [ ]  
**Date**: _______________  
**Tester**: _______________  
**Notes**: ____________________________________________________________

---

## Next Steps After Testing

If all tests pass:
1. ✅ **Ready for Deployment** - Backend and frontend can be deployed
2. 📊 **Monitor Usage** - Check logs and errors in production
3. 🔧 **Optimize Performance** - Add caching, pagination, etc.
4. 📱 **Mobile Optimization** - Test on mobile devices
5. 🔐 **Security Hardening** - Add authentication, input validation, etc.

If tests fail:
1. 🐛 **Debug** - Check console errors and backend logs
2. 📝 **Document** - Note what failed and why
3. 🔨 **Fix** - Update code and run tests again
4. 🔄 **Re-test** - Verify the fix works
