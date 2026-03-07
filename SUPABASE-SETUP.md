# 🗄️ SitePro — Supabase Setup Guide (10 minutes)

This guide walks you through creating your free cloud database
so all your employees can see the same data.

---

## STEP 1: Create Supabase Account (2 minutes)

1. Go to **https://supabase.com**
2. Click **"Start your project"**
3. Click **"Continue with GitHub"** (use the same GitHub account you made for Vercel)
4. Authorize Supabase

---

## STEP 2: Create a New Project (2 minutes)

1. Click **"New Project"**
2. Fill in:
   - **Name:** `sitepro`
   - **Database Password:** Make a strong password and **SAVE IT SOMEWHERE** (you won't need it often, but don't lose it)
   - **Region:** Pick the closest to you (e.g., "East US" if you're in California is fine, or "West US" if available)
3. Click **"Create new project"**
4. Wait 1-2 minutes while it sets up

---

## STEP 3: Create the Database Tables (3 minutes)

1. In your Supabase project, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. **Copy ALL the text** from the file called `supabase-schema.sql` (included in this project)
4. **Paste it** into the SQL editor
5. Click **"Run"** (the green play button)
6. You should see "Success. No rows returned" — that means it worked!

---

## STEP 4: Get Your API Keys (2 minutes)

1. Click **"Project Settings"** (gear icon) in the left sidebar
2. Click **"API"** under Configuration
3. You need TWO values:

   **Project URL** — looks like: `https://abcdefg.supabase.co`

   **anon public key** — a long string starting with `eyJ...`

4. Copy these values. You'll paste them into the app.

---

## STEP 5: Update the App (1 minute)

1. Open the file `src/supabase.js` in the project
2. Replace the placeholder values:

```
const SUPABASE_URL = 'https://YOUR-PROJECT-ID.supabase.co';
const SUPABASE_KEY = 'eyJ-YOUR-ANON-KEY-HERE';
```

3. Save the file
4. Upload the updated file to GitHub
5. Vercel auto-deploys in ~1 minute

---

## STEP 6: Create Your Admin Account

1. Open your app in the browser
2. You'll see a login screen
3. Click **"Create Account"**
4. Enter your email and a password
5. Check your email for a confirmation link
6. Click the link → you're in!

---

## STEP 7: Invite Your Employees

1. In the app, go to **Employees** section
2. For each employee, give them:
   - The app URL
   - Tell them to click "Create Account"
   - They use their own email and pick a password
3. Once they log in, they see all the same projects and data!

---

## How It Works

- All data is stored in Supabase's cloud database (PostgreSQL)
- Every employee logs in with their own email/password
- Everyone in your company sees the same projects, hours, expenses, etc.
- Data syncs instantly — if someone logs hours on their phone, you see it immediately
- Supabase free tier includes:
  - 50,000 monthly active users
  - 500 MB database
  - 1 GB file storage
  - Unlimited API requests
  - This is MORE than enough for a construction company

---

## Troubleshooting

**"I get an error when running the SQL"**
→ Make sure you copied ALL the text from supabase-schema.sql
→ Try running it again — it's safe to run multiple times

**"Login isn't working"**
→ Check that you copied the URL and key correctly into supabase.js
→ The URL should start with https:// and end with .supabase.co
→ The key should start with eyJ

**"I don't see the confirmation email"**
→ Check your spam folder
→ In Supabase, go to Authentication → Settings → you can disable email confirmation for testing

**"My employees can't see my projects"**
→ Make sure they signed up at the same app URL
→ All users automatically share the same company data
