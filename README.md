# Math Gap Finder — deployment-ready MVP

The app has a focused AP Calculus tutor interface, including parametric derivatives, and a server endpoint for real handwritten-work analysis.

## Run locally

1. Install Node.js 18 or newer.
2. In this folder, set your secret API key: `set OPENAI_API_KEY=your_key_here`
3. Run: `node server.mjs`
4. Open `http://localhost:3000`.

Never place the API key in `index.html` or upload it to GitHub.

## Publish on Render (recommended)

1. Create a free [Render](https://render.com) account and connect GitHub.
2. Put this `outputs` folder in a GitHub repository.
3. In Render, choose **New → Blueprint**, select the repository, and approve the `render.yaml` configuration.
4. Add `OPENAI_API_KEY` as a secret environment variable, then deploy.
5. Render will provide a public `https://…onrender.com` link that anyone can open.

The included `render.yaml` uses `node server.mjs` and needs Node 18+.

After deployment, connect a custom domain. To appear on Google, create a Google Search Console property for that domain and submit its sitemap after the public page is live. Search placement is not immediate or guaranteed.

## Capacity

The server validates images and queues at most four AI analyses at once, so a burst of 20 uploads is queued rather than overwhelming the API. For larger classes, use a serverless host with automatic scaling, object storage for images, and a production database for user progress.
