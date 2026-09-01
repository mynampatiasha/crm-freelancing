# FreelanceCRM

A CRM for freelancers — manage clients, leads, projects, payments, and demo
bookings from a dashboard.

## Tech stack

Static HTML, CSS, and vanilla JavaScript (no build step) on the frontend,
backed by both Firebase and Supabase (`js/firebase.js`, `js/supabase.js`).
A Supabase Edge Function (`supabase/functions/update-user-password/`)
handles password updates server-side.

## Structure

- `index.html` — login
- `dashboard.html` — main dashboard
- `clients.html`, `leads.html`, `projects.html`, `payments.html`, `users.html`, `demos.html` — CRM sections
- `js/` — Firebase/Supabase client setup and page logic
- `css/` — styles
- `supabase/` — Supabase project config and edge functions

## Running locally

```bash
python -m http.server 8000
```

Requires Firebase and Supabase project credentials configured in
`js/firebase.js` and `js/supabase.js`. The `update-user-password` edge
function needs to be deployed separately via the Supabase CLI:

```bash
cd supabase
supabase functions deploy update-user-password
```
