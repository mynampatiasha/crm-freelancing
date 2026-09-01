# 📇 FreelanceCRM

`Firebase` `Supabase` `HTML/CSS/JS` `CRM`

> A CRM built for freelancers.

## What is FreelanceCRM?

A CRM for freelancers — manage clients, leads, projects, payments, and demo
bookings from a dashboard.

## ✨ Features

- 👥 Client and lead management
- 📁 Project tracking
- 💳 Payment tracking
- 📅 Demo booking management

## 🛠️ Tech Stack

Static **HTML**, **CSS**, and vanilla **JavaScript** on the frontend, backed
by both **Firebase** and **Supabase**. A Supabase Edge Function handles
password updates server-side.

## 📁 Structure

```
index.html                                    # login
dashboard.html                                  # main dashboard
clients.html, leads.html, projects.html,
payments.html, users.html, demos.html            # CRM sections
js/                                               # Firebase/Supabase setup + page logic
css/                                                # styles
supabase/                                            # Supabase config + edge functions
```

## 🚀 Running Locally

```bash
python -m http.server 8000
```

Requires Firebase and Supabase credentials in `js/firebase.js` and
`js/supabase.js`. Deploy the edge function separately:

```bash
cd supabase
supabase functions deploy update-user-password
```

## 🔒 Security

Never commit real Firebase/Supabase credentials — use environment-specific
config for production.
