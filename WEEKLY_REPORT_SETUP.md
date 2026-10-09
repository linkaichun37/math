# Weekly founder report setup

Learning history stays on each device unless the learner opts into the separate
account-sync feature. With explicit consent, anonymous impact reporting can also
send action counts to the Cloudflare Worker. It never includes question text,
answers, voice recordings, names, or visitor email addresses.

The only weekly report recipient is `732cst003@gmail.com` unless the private
`REPORT_EMAIL` Worker secret is changed.

## Activate durable anonymous analytics

1. In the `cloudflare-math-gap-finder` folder, create or reuse the configured
   database: `npx wrangler d1 create math-gap-finder-db`.
2. Replace the D1 ID placeholder in `wrangler.jsonc`; the `ANALYTICS_DB` binding
   is already declared there.
3. Apply all pending migrations:
   `npx wrangler d1 migrations apply math-gap-finder-db --remote`
4. Create and verify a sending domain in Resend.
5. Add private Worker secrets. Do not put these values in HTML or GitHub:
   - `npx wrangler secret put RESEND_API_KEY`
   - `npx wrangler secret put REPORT_FROM`
   - `npx wrangler secret put REPORT_EMAIL`
6. Set `REPORT_EMAIL` to `732cst003@gmail.com` and `REPORT_FROM` to a sender on
   the verified domain, such as `Math Gap Finder <reports@yourdomain.com>`.
7. Deploy the Worker. Its Cron Trigger runs Mondays at 16:00 UTC, which is
   9:00 AM in Arizona. A second trigger runs daily student summaries at
   15:00 UTC, which is 8:00 AM in Arizona.

The migration command applies the anonymous usage table, optional email tables,
and account-sync tables. Account sync does not require Resend. A student must receive and enter a six-digit
code before daily delivery is enabled. Every daily email includes an
unsubscribe link.

Without these private host settings, the student-facing history and downloaded
weekly report still work, but automatic owner email remains inactive.
