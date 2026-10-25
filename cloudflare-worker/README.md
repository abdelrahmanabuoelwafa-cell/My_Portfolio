# Gemini proxy deployment

The portfolio is hosted on GitHub Pages, so the Gemini key must stay in a server-side secret and must never be added to `index.html` or browser JavaScript.

1. In Cloudflare, create or select the account that will own the Worker. From the `cloudflare-worker` directory, deploy this Worker with Wrangler using `wrangler.toml`.
2. Add the secret `GEMINI_API_KEY` to this Worker in Cloudflare's dashboard (Settings → Variables and Secrets → Add, type Secret), or use Wrangler's interactive `secret put` command. Enter the key directly into Cloudflare/your terminal; do not paste it into a source file.
3. Copy the deployed `*.workers.dev` URL and replace `YOUR-WORKER-NAME.YOUR-ACCOUNT` in `assets/js/ai-planner.js` with the deployed Worker hostname. Alternatively, define `window.PORTFOLIO_AI_ENDPOINT` before `ai-planner.js` loads.
4. Keep the portfolio origin `https://abdelrahmanabuoelwafa-cell.github.io` in the Worker CORS allowlist. The worker accepts only JSON `{ messages: [{ role: "user"|"assistant", content: "..." }] }`, fixes the model server-side, validates input, and applies a best-effort per-IP limit.
5. If the API key already appeared in a chat, issue a new key in Google AI Studio before configuring the Worker.

The Worker returns an OpenAI-compatible JSON envelope consumed by the planner. The public portfolio remains usable if the proxy is unavailable; plan generation will show its existing error state.
