# Myntmore Workshop

A Vite + React + TypeScript single-page app using shadcn/ui, Tailwind, and Supabase (managed via Lovable).

## Local development

```sh
npm install
cp .env.example .env   # fill in your Supabase values
npm run dev
```

## Environment variables

This app is a client-side SPA — all env vars are read via `import.meta.env` and must be prefixed with `VITE_` to be exposed to the browser. Get these values from your Lovable/Supabase project settings (Project Settings → API):

| Variable | Where to find it |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API → anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase → Project Settings → General → Reference ID |

These three are safe to expose to the browser (the anon key is designed for client-side use; access is enforced by Supabase Row Level Security policies).

### Supabase Edge Function secret (not a Vercel env var)

`supabase/functions/gemini` calls the Gemini API and expects `GEMINI_API_KEY` as a Supabase secret, not a Vercel env var — it runs on Supabase's infrastructure, not on Vercel. Set it via the Supabase dashboard (Edge Functions → gemini → Secrets) or:

```sh
supabase secrets set GEMINI_API_KEY=your-gemini-api-key
```

## Deploying to Vercel

1. Import this repo into Vercel (Framework Preset: Vite is auto-detected).
2. Add the three `VITE_SUPABASE_*` env vars above in Vercel → Project Settings → Environment Variables (for Production, Preview, and Development).
3. Deploy. `vercel.json` handles the SPA rewrite so client-side routes (e.g. `/workshop`) resolve correctly on refresh/direct load.
