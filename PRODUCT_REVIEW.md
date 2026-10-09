# MathGap AI — usefulness review and changes

## What was making the app hard to use

- **It asks for commitment before delivering value.** The optional profile and course setup still asks for several details before students see its diagnostic. Keep the top-right grade selector and adaptive check optional so learners can reach math help immediately.
- **The progress panel damaged trust.** It showed a preset three-day streak, four completed problems, and two mastered foundation skills. None of those numbers came from the learner’s activity.
- **The product promise was narrower than the product.** The page introduced itself as a calculus companion even though course and lesson support spans much earlier math.
- **Teacher tools were easy to misread.** Local activity generation is useful for a lesson, but a teacher needs a separate consent-based workflow to understand class progress without collecting students’ full work.
- **The limits were not clear at the point of use.** The question area and privacy panel now explain the typed fields and optional photo sent on submission. Photo tutoring still depends on the vision model license and free daily quota.
- **The learning loop needs measurement.** Students can get an explanation and try again. The adaptive check now adjusts difficulty and gives field-level signals, but its small generated sample is not reliable placement or proof of mastery.

## Changes in this edition

- Students land directly on the question box. The adaptive grade diagnostic is optional and is described as formative guidance, not a formal placement decision.
- Removed the invented starter streak, completion count, and foundation-skill total. The panel now reports recorded explanations on this browser and the latest saved check result.
- Changed the learner default from a named founder profile to Guest and broadened the public description to cover foundational math through calculus and statistics.
- Added a plain-language notice beside the question box explaining when question text is sent to the tutor service and asking students to omit personal details.
- Clarified that activity generation remains local and added optional teacher accounts, share-by-code classrooms, and summaries that learners explicitly consent to share. The dashboard shows only pseudonymous handles, activity counts, and diagnostic level, accuracy, strengths, and gaps—not question text, answers, notes, or drafts.
- Added photo analysis through a free-tier vision model. The browser compresses selected images locally; it sends them only with Get help, and does not store them in history or account sync.
- Added session transcript export as Markdown and browser print-to-PDF, plus saved study notes with the final answer and solution steps.
- Expanded grade/course recommendations to eight topics and made the ordering show diagnostic focus and due practice. Correct answers schedule 1, 3, 7, then 14-day reviews; partial/incorrect answers return the skill the next day.
- Added version/date metadata and online/offline/error status messaging. The Teacher Console now links directly to its existing class-code roster and consent-based summaries.
- Warm-ups and exit tickets now display the teacher’s class and objective safely as text, making the activity easier to project and copy without treating the objective as markup.

## Practical teacher and student use

**Students:** Open the page, choose a course if helpful, type the whole question and the step they tried, then choose “Check my work” or “Teach / explain.” Use the follow-up explanation and study note to practice the idea again. Use the adaptive grade check as a formative pointer to skills worth reviewing. Sign in with a pseudonymous username only if cross-device sync is useful; local use remains available without an account.

**Teachers:** Enter a class label and lesson objective, generate a warm-up, use the built-in timer, then generate and copy an exit ticket into the LMS or slides. Use Projector mode for a whole-class explanation. For longitudinal visibility, create a teacher account, share the join code, and review only the summaries learners have chosen to share. Keep student names out of usernames and avoid collecting exact student work in the dashboard.

## What still limits usefulness

- Photo transcription and solving have not yet been measured against a teacher-reviewed image benchmark; learners should check the transcribed question before relying on the solution.
- Teacher-created activities come from a small generic pool and do not yet adapt to the entered objective or course. Review each prompt before assigning it.
- Cloud sync, accounts, and teacher dashboards require the Cloudflare D1 database to be created and the Worker deployed; the public site has not been redeployed by this code change.
- Cloud sync is opt-in and subject to free-tier daily limits. Modern browsers encrypt local `mgf-*` values at rest and the app provides passphrase-encrypted backups, but clearing site data can still remove unsynced work and its local key.
- The teacher view is a small summary dashboard, not a full LMS: it has no assignments, grades, messaging, or student work review.
- Conflict resolution uses last-updated timestamps, so device clock differences can make a conflict resolve in an unexpected direction.
- The adaptive diagnostic uses short generated question sets and has not been validated against a teacher-reviewed benchmark. Do not use it as a grade or high-stakes placement decision.
- The current public UI is only partly translated into Traditional Chinese; teacher-console and privacy notices need a complete localization pass.

## Best next product steps

1. Run short usability sessions with students and teachers; ask them to complete a real help task and a 10-minute class routine, then record where they hesitate.
2. Have math teachers review a benchmark spanning grades and topics. Track transcription errors, mathematical correctness, first-gap accuracy, and whether the next step helps the learner continue independently.
3. Build a genuinely objective-aligned activity bank with answer keys, difficulty levels, and printable or LMS-ready formatting.
4. Pilot the opt-in class summaries with teacher and guardian review; confirm that the fields are useful and that the consent language is clear.
5. Keep progress claims tied to observed activity. Call a skill “mastered” only after repeated evidence, and label the source and date of every score.

## Email verification fix

The verification form now trims pasted input before validating and uses the same email shape and 254-character limit as the Cloudflare endpoint. This avoids browser-specific rejection of addresses the server accepts. Email sending still depends on the deployed host having its email service and database configured.

On the Node deployment, the verification form and event logging now proxy to the Cloudflare Worker when `EMAIL_VERIFICATION_API_URL` is set. Email sending still depends on the Worker’s D1 binding, migrations, and Resend secrets; the app reports a setup error if the Node proxy is not configured.

## Speaking feature improvements

Voice dictation now appends only newly finalized speech instead of repeatedly copying interim browser transcripts, which could duplicate text. It updates the live draft as you speak, retains typed text, gives clearer microphone/network errors, and explicitly asks students to check math notation before submitting. Read-aloud now expands common math notation, selects a browser voice for English or Traditional Chinese when available, and speaks long explanations in short chunks so playback is less likely to stall. Recognition and voice quality still depend on the browser and device.

## Grade-matched recommendations

The recommendation panel now prompts for a grade/course before showing suggestions. Learners can save a course without creating a named profile or taking the placement check. It shows eight topics from the selected grade/course and ranks due reviews and diagnostic focus first. Checked outcomes schedule future reviews, so practice order changes from recorded evidence; it does not claim mastery from one correct response.

## Photo input, exports, and app status

Photo analysis uses Cloudflare Workers AI's vision model when a supported image is attached. It requires an internet connection, may require accepting Meta's model license once, and stops when the free daily allowance is exhausted. The app explains that photos are compressed on-device, sent only on submission, and not saved to app history or sync.

Students can download the current session as Markdown, print it to PDF, and save study notes locally or with optional account sync. A note includes the answer and steps so it can support later review. The footer exposes app version and update date; online/offline and runtime errors provide recovery guidance.


Email-form fetch errors now distinguish opening the HTML as a local file from missing Node/Render proxy or Cloudflare service configuration, with next-step instructions instead of the generic browser error.

## Answer reveal

The Reveal answer button opens a dedicated dialog with a short reflection reminder and a prominent answer. If the current explanation has no answer yet, the app requests a solution first. Supported built-in question types can still use the local quick solver when the online tutor is unavailable; unsupported questions need the online tutor to return an answer.

## Projector display

Projector mode hides navigation, setup panels, and student-only controls so the current math work fills a clean, single-column view. Core prompt and solution text starts at 24px or larger. A floating toolbar lets the teacher zoom in or out in 10% steps up to 200%, reset to 100%, and exit; Escape also exits projector mode.

## Classroom question variety

Warm-ups and exit tickets use a persistent sequence with changing values and prompts instead of selecting from a five-question fixed list. The sequence is shared across both activity types and saved in the browser so reloading the page does not restart it or repeat a generated prompt on that device.

## Teacher timer

Teachers can choose 1, 3, 5, 10, 15, 20, or 30 minutes before starting the classroom timer. The chosen duration is remembered on that device and displayed with the countdown.

## Adaptive grade diagnostic

Learners choose their current grade from the top-right selector and start an optional adaptive diagnostic. It asks five new questions at a time, moves up after 5/5, moves down after 0–2/5, and stops in the 60–80% target band or when adjacent levels bound the result. Its report includes an estimated working level, strengths, review priorities, and mastery signals for seven math fields; untested fields are labeled as not assessed. This is a short formative signal, not a validated placement instrument or formal grade.

## Forgiving student input

The question box tells students that typos and rough wording are okay. Tutor prompts infer ordinary spelling, grammar, shorthand, and speech-to-text errors from context, while asking one concise clarification when an uncertain mathematical symbol or value could change the result. This keeps the interaction welcoming without silently changing the problem.


## Question-specific solving and free-tier AI

The same generic response came from the front end’s static fallback and the default tutor instructions: requests were blocked from reaching the model, and “diagnose” mode was told to analyze work that the learner often had not entered. Those two paths are removed. The active tutor receives the exact question, selected grade, course, help mode, and the learner’s attempted work. It is instructed to solve the exact exercise when no work is provided, check an actual mistake when work is present, and adapt vocabulary and steps to the selected grade. The response still keeps the final answer in the reveal-answer dialog.

## Privacy and local data protection

The question area now lists the exact fields forwarded to the tutor, and the Data & privacy panel separates the tutoring request from optional account sync, teacher summaries, anonymous impact reporting, and email summaries. The app allowlists model-bound fields and suppresses prompt/output details in error logs. Modern browsers encrypt local app values with AES-GCM and can export or restore an encrypted backup. Sync and backup recovery remain opt-in; a person using the same browser profile can still access the app’s in-memory data. Feedback is a local draft with a copy button, not an automatic Google Form submission. See [PRIVACY.md](PRIVACY.md) for the complete boundaries.

The Cloudflare Worker and Node server now use Cloudflare Workers AI’s Llama 3.3 70B model and structured JSON responses. There is no OpenAI API call or OpenAI key in the tutoring path. On the Workers Free plan, the daily 10,000-Neuron allocation is no-charge and calls fail after it is used; usage above the allowance can be billed on Workers Paid. To keep inference at $0, keep Cloudflare on Workers Free and do not add paid AI credits. Hosting and optional Resend email costs are separate. See [Cloudflare’s pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) and [structured response documentation](https://developers.cloudflare.com/workers-ai/features/json-mode/).

The offline quick solver remains limited to recognized arithmetic, equation, trig fact, and polynomial-calculus patterns. If it cannot solve a question and the AI service is unavailable, the app reports that directly instead of pretending a generic lesson solved it. Photo analysis is available through Cloudflare Workers AI vision, subject to first-use license acceptance and the free daily quota; image accuracy still needs a teacher-reviewed benchmark. AI-generated solutions can still make mistakes and should be reviewed, especially before classroom projection.
