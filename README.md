# Playfeed

**Swipe through tiny games in your browser — tap to play, swipe to the next, and an agent can invent a new one in under a minute.**

Production URL: https://playfeed-lyart.vercel.app

## What ships

- A mobile-first, snap-scrolling feed of five playable Phaser games.
- One live game canvas at a time, so slide changes do not stack WebGL contexts.
- A Create sandbox that asks OpenAI for a JSON game spec, Zod-validates it, lets you play the draft, and publishes it to browser `localStorage`.
- An offline-safe fallback: seed games always work even when the agent is unavailable.

## Develop

```bash
npm install
npm run dev -- --host
```

Visit the URL Vite prints. To run the Vercel API locally as well, use `npx vercel dev` after linking the project and configuring the environment variable.

## Deploy to Vercel

```bash
npx vercel login
npx vercel env add OPENAI_API_KEY
npx vercel --prod
```

Set `OPENAI_API_KEY` for both Production and Preview. Do not create a `VITE_OPENAI_API_KEY`: it would expose the key in the browser bundle.

## Checks

```bash
npm test
npm run build
npm run lint
```

## Demo path

1. Play Lava Leap, then swipe to Spike Rain.
2. Tap **Make one** and enter a simple game prompt.
3. Play the generated draft, then publish it to the top of the feed.
4. If generation is offline, keep swiping the bundled games—the demo is still complete.
