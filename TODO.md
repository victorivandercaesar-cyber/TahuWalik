# Implement Mailbox - Private Feedback in Admin

**Status:** In Progress

## Breakdown of Approved Plan:

### 1. Update admin_new_final.js
- [x] Add `fetchMailbox()` function
  - Query Supabase: feedback table where visibility='private'
  - Fallback to localStorage
  - Order by created_at descending
- [x] Add `renderMailbox(feedbackData)` function
  - Display in #mailbox-list
  - Show: rating, name, message, date, whatsapp
  - Add read/unread status if needed
- [x] Add event listener for refresh-mailbox-btn
- [x] Update initTabNavigation() to call fetchMailbox() on mailbox tab

### 2. Verify feedback_new.js
- [ ] Confirm captures visibility radio correctly

### 3. Testing
- [ ] Test mailbox loads private feedback
- [ ] Verify public/private separation in feedback-tab
- [ ] Test refresh button

### 4. Completion
- [ ] attempt_completion with result

**Next Step:** Implement functions in admin_new_final.js
