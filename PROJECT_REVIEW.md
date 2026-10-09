# Math Gap Finder — Deep Review and College-Project Roadmap

## Executive assessment

The project has a strong college-application core because it begins with a problem Casey observed personally and connects mathematics, tutoring, bilingual access, product design, and software engineering. Its best differentiator is not “AI solves math”; it is “the tutor identifies the earliest prerequisite gap before revealing the answer.”

The project is not yet ready to claim educational impact. Its next level comes from evidence: a teacher-reviewed benchmark, documented failures, real student feedback, and measured improvement.

## Strengths

- Authentic founder story tied to classmates and calculus learning.
- Clear educational philosophy: diagnose first, reveal later.
- Works with typed questions and optional locally compressed photo uploads; photo accuracy still needs a teacher-reviewed benchmark.
- Covers multiple levels from pre-algebra through calculus and statistics.
- English and Traditional Chinese access.
- Structured AI output makes the interface more predictable.
- API secret remains server-side.
- Includes reading confidence, verification checks, text-to-speech, Markdown/PDF transcript export, and study notes with solution steps.
- Has two deployment paths and an AP CSA-friendly Java prompt example.

## Weaknesses and risks

- AI accuracy has not been measured on a teacher-reviewed benchmark.
- The model may transcribe a symbol incorrectly and confidently solve the wrong problem.
- The current five-question placement check is too short to be called a validated placement test.
- Browser localStorage is not an account system and can be cleared or changed by the user.
- Client-side daily limits are easy to bypass. The Node limit resets when the server restarts; the Cloudflare version needs durable server-side enforcement.
- The single large HTML file is harder to maintain than separated CSS and JavaScript modules.
- User feedback is stored locally unless the student opens the external feedback form.
- The optional consent-based teacher dashboard is a lightweight summary, not a full LMS or validated longitudinal assessment.
- Cloud account sync requires the Cloudflare D1 database binding and migration to be configured before deployment.
- AdSense can distract from the educational mission during early testing; impact and trust should come before revenue optimization.

## Best next milestones

1. Build a 100–200 problem benchmark labeled by a math teacher.
2. Measure transcription accuracy, answer accuracy, first-gap agreement, latency, and cost.
3. Add a confirmation screen that asks the student to approve the transcription before spending a solve request.
4. Pilot with 10–20 students using consent and an anonymous study ID.
5. Compare pre-lesson and post-lesson performance on matched questions.
6. Publish results and failures on the Project Lab page.
7. Track sync reliability, quota pauses, and how often teachers use the opt-in class summaries.
8. Refactor the monolithic page into accessible, tested modules.

## What to describe in a college application

Lead with the observed learning problem, then explain the iterations. Discuss one technical failure honestly—for example, keyword matching could not understand math, so the pipeline was redesigned to extract, solve, compare, and verify using a strict schema. Quantify only results that have actually been measured. The strongest story is a cycle of observation, prototype, testing, failure analysis, and improvement.
