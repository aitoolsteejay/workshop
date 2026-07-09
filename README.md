# Myntmore Workshop

A Vite + React + TypeScript single-page app using shadcn/ui, Tailwind, Supabase (session storage only, managed via Lovable), and a Vercel serverless function that proxies Gemini API calls.

## Local development

```sh
npm install
cp .env.example .env   # fill in your Supabase values
npm run dev
```

`npm run dev` runs the Vite dev server only — `/api/gemini` won't resolve locally unless you also run `vercel dev` (which needs `GEMINI_API_KEY` in a local `.env` file, not the client-side `.env` above, since it's a server-only var).

## Environment variables

### Client-side (Vercel → Project Settings → Environment Variables)

These are read via `import.meta.env` and must be prefixed with `VITE_` to be exposed to the browser. Get these values from your Lovable/Supabase project settings (Project Settings → API):

| Variable | Where to find it |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API → anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase → Project Settings → General → Reference ID |

These three are safe to expose to the browser (the anon key is designed for client-side use; access is enforced by Supabase Row Level Security policies). Supabase is only used here to store workshop session progress — it has nothing to do with the AI generation calls.

### Server-side (Vercel → Project Settings → Environment Variables, do NOT prefix with `VITE_`)

| Variable | Where to find it |
| --- | --- |
| `GEMINI_API_KEY` | Google AI Studio → API keys |

`api/gemini.ts` is a Vercel serverless function that proxies Gemini API calls using this key. It stays server-side — never prefix it with `VITE_`, or it would be bundled into the public client JS and anyone could steal it.

## Deploying to Vercel

1. Import this repo into Vercel (Framework Preset: Vite is auto-detected).
2. Add all four env vars above in Vercel → Project Settings → Environment Variables (for Production, Preview, and Development).
3. Deploy. `vercel.json` handles the SPA rewrite so client-side routes (e.g. `/workshop`) resolve correctly on refresh/direct load. `/api/gemini` deploys automatically as a serverless function in the same build — no separate platform or redeploy step needed.
