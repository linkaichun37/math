// Math Gap Finder server — Node 18+; keep OPENAI_API_KEY in the host's secret settings.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const port = Number(process.env.PORT || 3000);
const maxBodyBytes = 12 * 1024 * 1024;
const maxConcurrentAnalyses = 4;
let running = 0;
const queue = [];

function runWithLimit(work) {
  return new Promise((resolve, reject) => {
    queue.push({ work, resolve, reject });
    drainQueue();
  });
}
function drainQueue() {
  while (running < maxConcurrentAnalyses && queue.length) {
    const { work, resolve, reject } = queue.shift();
    running++;
    work().then(resolve, reject).finally(() => { running--; drainQueue(); });
  }
}
function send(res, status, data, type = 'application/json') {
  res.writeHead(status, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store' });
  res.end(type === 'application/json' ? JSON.stringify(data) : data);
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = ''; let bytes = 0;
    req.on('data', chunk => { bytes += chunk.length; if (bytes > maxBodyBytes) { reject(new Error('Image is too large (12 MB max).')); req.destroy(); } else body += chunk; });
    req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('Invalid request.')); } });
    req.on('error', reject);
  });
}
function parseJsonResponse(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('The tutor returned an invalid response. Please try again.');
  const answer = JSON.parse(match[0]);
  if (!answer.issue || !answer.gap || !Array.isArray(answer.steps)) throw new Error('The tutor response was incomplete. Please try again.');
  return answer;
}
async function analyze({ imageDataUrl, question, level, mode, studentAnswer }) {
  if (!process.env.OPENAI_API_KEY) throw new Error('AI analysis is not configured yet. Add OPENAI_API_KEY to your host’s environment variables.');
  const task = mode === 'explain' ? 'Answer the student’s conceptual question directly in clear, friendly language. Use a small intuitive example when helpful; do not force a gap diagnosis.' : mode === 'solve' ? `Solve the problem accurately. ${studentAnswer ? `The student proposed this answer: "${studentAnswer}". Say whether it is correct and explain the key correction if needed.` : 'Do not reveal the final answer in issue, gap, or steps; guide the student through the method.'}` : 'Analyze the student’s work. Do not simply give the final answer. Identify the first incorrect or uncertain step if visible.';
  const prompt = `You are Math Gap Finder, a supportive AP Calculus and AP Statistics tutor. ${task} Focus especially on calculus: parametric functions, derivatives, integrals, limits, series, and applications. Return ONLY valid JSON: {"encouragement":"short supportive sentence","issue":"specific explanation or diagnostic","gap":"core idea or prerequisite concept","steps":["guided next step 1","guided next step 2","guided next step 3"],"answer":"the complete final answer, including conditions or + C when relevant"}. Course level: ${level || 'AP Calculus AB / BC'}. Student note: ${question || '(none)'}`;
  const content = [{ type: 'input_text', text: prompt }];
  if (imageDataUrl) content.push({ type: 'input_image', image_url: imageDataUrl });
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: 'gpt-5.6', input: [{ role: 'user', content }] })
  });
  if (!response.ok) throw new Error(`The AI service could not analyze this work (${response.status}). Please try again shortly.`);
  const payload = await response.json();
  return parseJsonResponse(payload.output_text || '');
}

const mime = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.css':'text/css', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml' };
createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/analyze') {
      const input = await readJson(req);
      if (!input.question && !input.imageDataUrl) return send(res, 400, { error: 'Add a question or a photo of your work.' });
      if (input.imageDataUrl && !/^data:image\/(png|jpeg|webp);base64,/.test(input.imageDataUrl)) return send(res, 400, { error: 'Please use a PNG, JPG, or WebP image.' });
      const result = await runWithLimit(() => analyze(input));
      return send(res, 200, result);
    }
    if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed.' });
    const path = req.url === '/' ? 'index.html' : req.url.replace(/^\//, '');
    if (path.includes('..')) return send(res, 400, { error: 'Invalid path.' });
    const file = await readFile(join(process.cwd(), path), 'utf8');
    send(res, 200, file, mime[extname(path)] || 'text/plain');
  } catch (error) { send(res, 500, { error: error.message || 'Unexpected server error.' }); }
}).listen(port, () => console.log(`Math Gap Finder running at http://localhost:${port}`));
