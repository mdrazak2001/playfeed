# Playfeed

**Swipe through tiny games in your browser — tap to play, swipe to the next, and an agent can invent a new one in under a minute.**

Production: https://playfeed-lyart.vercel.app  
Embed demo: https://playfeed-lyart.vercel.app/demo-host.html

## What it is

A TikTok-style vertical feed of tiny Phaser games. An agent writes a validated JSON spec — never raw JavaScript. Any website can host the feed with one script tag.

- Neon arcade feed of five seed games (emoji skins, glow, particles, haptics)
- Create sandbox: prompt → OpenAI → Zod → play → publish
- Seeds always work if the agent is offline
- Bubble widget: floating 🎮 opens a playable panel over someone else’s site

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173

Put `OPENAI_API_KEY` in `.env`. Vite serves `/api/generate` in development, so you do not need `vercel dev`.

```bash
npm test
npm run build
```

## Embed on any site

```html
<script src="https://playfeed-lyart.vercel.app/bubble.js" defer></script>
```

Click the circle to open a small Playfeed panel. Play-only mode uses `/?embed=1`.

## Deploy

```bash
npx vercel login
npx vercel env add OPENAI_API_KEY
npx vercel --prod
```

Set `OPENAI_API_KEY` for Production and Preview. Do **not** create `VITE_OPENAI_API_KEY`.

## 90-second demo

1. Play Lava Leap, then swipe to Spike Rain.
2. Tap **Make one** → `tap to jump across three platforms over lava` → Generate → Publish.
3. Open `/demo-host.html` → click 🎮 → play over a fake law-firm page.

If the model is down, swipe the seeds. The feed is the product.
