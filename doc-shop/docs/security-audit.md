# Security Audit & Secret Handling Report

## 1. Executive Summary

During the architectural review of the original monolithic `index.html`, several security-critical concerns were identified and addressed:
1. **Exposed Webhook Secrets in Frontend Source**: Discord Webhook URL was hardcoded directly in client scripts.
2. **Exposed AI Model Credentials**: Any client setting `window.OPENAI_API_KEY` was exposed to client-side inspect tools.
3. **Broad Database Subscriptions**: Normal clients subscribed to all users and all transaction nodes, exposing transaction amounts and user IDs.
4. **Client-Side Balance Calculation**: Client code performed arithmetic directly before updating user balance without server-side validation.
5. **Arbitrary File Uploads**: Uploads had no file size limits or strict MIME type verification.

---

## 2. Issues Remedied

### 2.1. Environment Variable & Secret Isolation
* All sensitive credentials have been removed from source code and relocated to `.env` / `import.meta.env` via `src/config/environment.js`.
* Discord Webhook and AI API endpoints can be pointed to a serverless proxy (e.g. Firebase Functions / Vercel API routes) to ensure zero browser exposure of upstream private API keys.
* `.env.example` provides a clear template without committing production private keys to version control.

### 2.2. Query & Data Exposure Elimination
* Normal users **only** fetch their own user profile (`users/{uid}`), their own purchases (`purchases` query with `userId == currentUser.uid`), and their own transactions.
* Normal users never receive or listen to `reports`, `keyUsageLogs`, or `users` nodes.
* Admin views enforce `authService.isAdmin()` checks before triggering queries for admin datasets.

### 2.3. Input Sanitization & XSS Prevention
* Created `src/utils/sanitize.js` with `safe()` escaping `&`, `<`, `>`, `"`, and `'`.
* Replaced unsafe direct interpolation with escaped strings across all renderers.
* Modals and form dialogs bind values safely to input element properties rather than string-concatenating user input into innerHTML.

### 2.4. File Upload Verification
* Cloudinary file upload in `src/services/upload.service.js` now enforces `src/utils/validation.js`:
  * Maximum file size: **5MB**
  * Allowed types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
  * Reject invalid files on the client before network requests are dispatched.

### 2.5. Financial Transaction Validation
* Before creating a purchase, `PurchaseService` verifies:
  * User is authenticated
  * Balance is strictly greater than or equal to `doc.price`
  * Document is not already purchased
* Deposit processing enforces 3 confirmation dialog prompts to prevent accidental submissions.
