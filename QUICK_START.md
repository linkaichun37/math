# MathGap AI — quick start

## Run the app locally

1. Install Node.js 18 or newer.
2. Open a terminal in this folder.
3. For online tutoring through this Node server, set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in the server environment. Keep the account on Cloudflare Workers Free and do not configure paid AI credits to keep inference at $0. The app does not use an OpenAI API key.
4. Run node server.mjs and open http://localhost:3000.

The Cloudflare Worker deployment uses its configured Workers AI binding and does not need those credentials or an AI API key. The Workers Free plan includes 10,000 Neurons per day; when exhausted, requests stop until the daily reset. On Workers Paid, usage above the allowance can be billed. Hosting and optional email-provider costs are separate from AI inference.

Without a configured AI service, the app still serves its local teacher tools and supported quick solvers. It reports a clear service error for other questions instead of showing a generic answer.

Tutor requests show live status and elapsed time, can be canceled, and offer retry after transient failures. The model returns a complete structured answer rather than partial answer tokens. To keep inference free, keep the Cloudflare account on Workers Free and do not enable paid AI credits. The browser has a best-effort limit of 40 tutor requests and 30 photos per UTC day; the hosting route limits a network to 60 requests per minute. The provider's Workers Free AI quota is the hard daily service limit.

Before showing an explanation, the tutor cleans up informal wording and displays the interpreted problem for the learner to confirm or edit. If it cannot tell what a symbol or instruction means, it asks one clarification question rather than guessing. A correction is sent through a fresh solve request.

Local History & report shows a rough app-data size and, where supported, browser-wide storage use. Activity history keeps at most 1,000 events and saved notes at most 100. Export notes as Markdown, delete old notes, clear history, or use Data & privacy to download an encrypted backup before removing site data. If encrypted saving fails, the app shows a storage warning.
## Deployment

The root `render.yaml` and `server.mjs` are for the Node/Render deployment. The `cloudflare-math-gap-finder` folder is a separate deployment path; follow its README and configure its required Cloudflare resources before publishing. Do not combine files from the two deployment paths.

For Cloudflare cross-device sync, create or use a D1 database, replace the database ID placeholder in `cloudflare-math-gap-finder/wrangler.jsonc`, and run `npx wrangler d1 migrations apply math-gap-finder-db --remote` before deploying. Keep the account on Cloudflare Workers Free; its daily D1 quotas pause cloud sync instead of silently switching to a paid service. For a Node-hosted app, set `CLOUDFLARE_WORKER_URL` to the HTTPS base URL of the deployed Worker. Sign-in uses a pseudonymous username, a password, and a one-time recovery code—no email vendor or payment is involved.

## Before sharing with a class

- Use the avatar menu → **Data & privacy** to read exactly what tutoring sends, how local encryption and backups work, what account sync stores, and what teachers can see. Modern secure browsers use Web Crypto plus IndexedDB to encrypt local app values; the panel warns if this cannot complete. Keep an encrypted backup before clearing site data; this local encryption is not a lock against someone using the same browser profile.
- Online tutoring sends the typed question, optional work, grade/course, help mode, and language to Cloudflare Workers AI. Math Gap Finder’s tutoring route does not write prompts or responses to its database or prompt-bearing logs. Cloudflare’s current Workers AI docs say content is not used to train or improve models; review its live policy link in the app for current terms.
- Learners can select their current grade in the top-right corner and take the adaptive diagnostic. Treat its estimated level and field mastery signals as formative guidance only; it is not a validated placement test or grade.
- Photo analysis accepts PNG, JPEG, and WebP. The browser compresses the image locally and sends it only when the learner chooses **Get help**; it is not saved to history or synced. The first vision request may require accepting Meta’s model license. Keep Workers on the Free plan and do not enable paid AI credits; photo tutoring stops when the daily free AI allowance is exhausted.
- Teacher activity generation remains local. Optional synced classrooms let teachers view only pseudonymous learner activity counts and diagnostic strengths/gaps after each learner explicitly joins and agrees. Exact questions, answers, notes, drafts, and profile details are excluded from the teacher view, though optional account sync stores notes and drafts privately in the learner’s account. The dashboard is formative guidance, not a tamper-proof audit. Learners can leave to stop future sharing.

## Offline and conflict behavior

Signed-in changes enter a per-account browser outbox and show a waiting count in the toolbar. The queue retries when connectivity returns. Deletions sync as tombstones. History and notes merge by ID; conflicts use the newest update timestamp, then device ID. Each device has its own question draft, so a draft from another device is shown separately rather than replacing the current one. Local-only use remains available without an account.

## Email verification from a Node deployment

Email summaries are separate from account sync and are disabled unless configured. To use them through this Node server, set `EMAIL_VERIFICATION_API_URL` to the base URL of the deployed Cloudflare Worker. The Worker must have its D1 `ANALYTICS_DB` binding, all migrations applied, and `RESEND_API_KEY` and `REPORT_FROM` configured. No email provider is needed for cross-device account sync.
