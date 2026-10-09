# Math Gap Finder privacy and data handling

## Online tutoring

Choosing **Get help** sends the typed question (up to 6,000 characters), optional work (up to 3,000), selected grade and course, course curriculum scope, help mode, and language to the Math Gap Finder tutor endpoint and Cloudflare Workers AI. If you attach a PNG, JPEG, or WebP photo, the browser resizes and compresses it locally and sends that temporary image only with the request. Photos are not saved to history, notes, or account sync. The endpoint forwards only those allowlisted fields to the model. It does not forward the learner’s name, profile, saved notes, history, email, or separate saved draft. Math Gap Finder does not log or save the tutoring prompt, image, or generated response in its analytics/account database. AI requests require an internet connection.

The tutor also receives ordinary informal phrasing, spelling mistakes, or speech-to-text wording so it can propose a clean math interpretation. That proposed interpretation appears before the explanation, and the learner can accept or edit it. If a key detail is unclear, the app withholds the explanation and asks one question instead of guessing. If the learner changes the proposed problem, the corrected text is sent for a fresh answer; otherwise the first answer stays hidden until confirmation.

Voice dictation uses the browser/device speech recognition feature, which may be processed by that browser or device provider. Math Gap Finder does not submit a microphone recording to the tutor; only text visible in the question box and a photo you explicitly selected are sent. Remove names and personal details before submitting.

Cloudflare’s current [Workers AI data usage documentation](https://developers.cloudflare.com/workers-ai/platform/data-usage/) says customer content is not used to train or improve models and may be stored when a Cloudflare storage service is used with the AI request. Math Gap Finder’s tutoring route does not write prompts or responses to D1 or another storage product. Provider terms can change; read Cloudflare’s linked page for current terms.

Photo tutoring uses Cloudflare Workers AI’s vision model. Its first use may require accepting Meta’s model license. Keep the account on Workers Free and do not enable paid AI credits to keep inference free; after the daily free allowance is exhausted, requests stop until reset. Hosting and optional email delivery may have separate costs.

While tutoring runs, the app streams status updates and elapsed time, then displays the complete structured answer. It does not stream partial answer tokens because the model response uses structured JSON. Learners can cancel; a Cloudflare request may already be running and may still use the free daily allowance. The browser limits use to 40 tutor requests and 30 photos per UTC day. The server also limits each network to 60 tutor requests per minute. These are safeguards, not exact billing meters; the Workers Free daily AI allowance is the provider-side cap. Transient failures show a retry action.

## Local browser data and backups

When Web Crypto and IndexedDB initialize successfully, Math Gap Finder encrypts `mgf-*` localStorage values with AES-GCM before writing them. A non-exportable key is held in this browser profile’s IndexedDB. If encryption is unavailable or a migration is incomplete, the app displays a warning and local values may be readable in browser storage. Fully encrypted values resist casual raw-storage inspection, but this is not an app lock: anyone who can use the same browser profile can open Math Gap Finder and see that profile’s data. The app needs decrypted values in memory while it runs.

Use **Data & privacy → Download encrypted backup** before clearing site data or moving to a new browser. The backup uses a passphrase-derived AES-GCM key and is portable. Keep the backup and passphrase separately; Math Gap Finder cannot recover a forgotten passphrase. Restoring merges history and notes by ID, restores profile/course preferences, and keeps an existing non-empty draft rather than replacing it. The backup excludes account-sync credentials, email, anonymous telemetry consent/ID, and photo-use counters. If local encryption is unavailable, the app says so and uses ordinary browser storage. Clearing all site data may remove local values and their local encryption key; optional account sync or a backup is the recovery path.

History keeps at most 1,000 activity events and saved notes keep at most 100 items. The History & report view displays a rough size estimate and browser-wide storage estimate where supported. Download all notes as Markdown, delete old notes, or clear history there. A failed local encrypted write raises a visible storage warning. Browser quota estimates vary and include other site data; export anything important before cleanup.

## Optional account sync

Local use does not require an account. After a learner chooses account sync, Math Gap Finder stores the username, grade/course, activity records (action type, time, course, and help mode), diagnostic report, study notes, and question draft in its Cloudflare D1 database. Saved notes and drafts can contain math content. Synced account records are not protected by app-level end-to-end encryption and are not included in the tutoring request unless their text is in the active question/work fields.

Synced records remain until deleted or the synced account is deleted. Account deletion removes the synced records, sessions, account, and class links from the app database. An individual deleted record is replaced by an empty deletion marker so its former content is not retained in that record. Cloud free-tier limits can pause sync; pending records stay in local browser storage (encrypted when the browser supports the local vault) until syncing resumes.

Teachers see a learner’s pseudonymous username, activity counts and last activity, and diagnostic level, accuracy, strengths, and gaps only after the learner joins and agrees to share. They do not see exact questions, answers, notes, or drafts. The dashboard is formative guidance, not a tamper-proof audit or grade.

## Other optional data paths

- Anonymous impact reporting is off until the visitor consents. It sends a random visitor ID, course, action type, help mode, and time—not tutoring questions, answers, or voice recordings.
- Daily email summaries are separate from tutoring. If enabled, the email address is used for verification and report delivery.
- **Write optional feedback** creates a draft in the current page’s memory. It is not saved or sent automatically; nothing reaches Casey or another service unless the user copies it and shares it separately.
