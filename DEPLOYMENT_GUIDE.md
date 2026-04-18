# Tipping Stars — Deployment Guide
## Get live in ~30 minutes, zero cost

---

## STEP 1 — Create your Supabase project (5 min)

1. Go to **https://supabase.com** → click "Start your project" → sign up with GitHub or email
2. Click "New project"
   - Name: `tipping-stars`
   - Database password: choose a strong one and save it somewhere
   - Region: pick the closest to Australia (e.g. Singapore or Sydney)
3. Wait ~2 minutes for it to spin up

4. Go to **SQL Editor** (left sidebar) → click "New query"
5. Open the file `supabase_schema.sql` from this folder
6. Copy the entire contents and paste it into the SQL editor
7. Click "Run" — you should see "Success"

8. Go to **Settings → API** (left sidebar)
   - Copy **Project URL** → save it (looks like `https://abcxyz.supabase.co`)
   - Copy **anon public** key → save it (long string starting with `eyJ...`)

---

## STEP 2 — Make yourself admin

After you first sign up on the website (Step 4), come back to Supabase:

1. Go to **Table Editor → profiles**
2. Find your row (your email)
3. Click the row → edit → set `is_super_admin` to `true` → save

You only need to do this once. From then on, you'll see "Admin" in the nav.

---

## STEP 3 — Deploy to Vercel (10 min)

### 3a — Put the code on GitHub
1. Go to **https://github.com** → sign in (or create free account)
2. Click "+" → "New repository" → name it `tipping-stars` → Create
3. On your computer, open Terminal in the `tipping-stars` folder and run:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/tipping-stars.git
git push -u origin main
```

### 3b — Deploy on Vercel
1. Go to **https://vercel.com** → sign in with GitHub
2. Click "Add New → Project"
3. Import your `tipping-stars` repository
4. Click "Environment Variables" and add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key
5. Click **Deploy** → wait ~2 minutes
6. Vercel gives you a free URL like `https://tipping-stars-xyz.vercel.app`

That's your live site! Share this URL with friends.

---

## STEP 4 — First time setup (5 min)

1. Visit your Vercel URL
2. Click "Create account" → sign up with your email
3. Go to Supabase → Table Editor → profiles → find your row → set `is_super_admin = true`
4. Refresh the site → you'll see "Admin" button in the header

---

## STEP 5 — Create your first tournament

1. Click "Admin" → you're now in the admin panel
2. Under "Setup" tab → fill in "Create New Tournament":
   - Name: e.g. "Backyard Boys Cup"
   - Description: brief description
   - Entry fee: e.g. `20` (for $20 AUD)
3. Click "Create tournament"

4. Adjust the **Points Config** for this tournament:
   - Correct winner: 2 pts (default)
   - Correct goal diff: 3 pts (default)
   - Exact score: 5 pts (default)
   - Big margin bonus: 3 pts (default, triggers at 3+ goal difference)
   - etc.
5. Click "Save settings"

6. You can create multiple tournaments — one per friend group!

---

## STEP 6 — Add matches

1. Admin → "Matches" tab
2. Add each match:
   - Home team, Away team
   - Kickoff time (enter in your local time)
   - Round (group, r32, r16, etc.)
   - Group name (e.g. "Group A") for group stage games

**Tip:** The FIFA World Cup 2026 schedule will be released closer to June 2026. You can add matches in bulk as the schedule drops.

Tips automatically lock 2 hours before each kickoff — no action needed from you.

---

## STEP 7 — Share with friends

1. Send friends your Vercel URL
2. They click "Create account" → sign up
3. They click "Request to join" on your tournament
4. You go to Admin → Members → approve them
5. They're in and can start tipping!

---

## ONGOING: Entering results

After each match ends:
1. Admin → select the tournament → "Results" tab
2. Enter the final score → click "Enter result"
3. Points are calculated instantly and the leaderboard updates

For tournament-end predictions (winner, top scorer etc.):
1. Admin → "Results" → scroll to tournament tips section
2. Enter the actual winner, top scorer, etc.
3. Points are awarded automatically

---

## TIPS & TRICKS

**Multiple tournaments:** Create one per friend group. Each has its own members, points config, entry fee, and leaderboard. The same match schedule applies across all of them — but you'll need to add matches to each tournament separately (or we can automate this later).

**Entry fees:** The app tracks who has/hasn't paid. Toggle the "$ Paid / $ Unpaid" badge next to each member in the Members tab. The actual money collection is handled by you (bank transfer, PayPal, etc.).

**Tipping deadline:** Tips lock exactly 2 hours before kickoff automatically — no manual action needed.

**Leaderboard:** Updates the moment you enter a result. Points include the phase multiplier (1x group, 2x R32, etc.).

**Forgot to approve someone?** Members → find them → click Approve anytime (they just can't tip on matches that have already locked).

---

## COSTS

| Service | Free tier | When you'd pay |
|---------|-----------|----------------|
| Supabase | 500MB DB, 50k users | If you somehow exceed this |
| Vercel | Unlimited deployments | If you need custom domain (optional, ~$15/yr) |

For a friend group of 30–60 people: **$0 forever**.

---

## CUSTOM DOMAIN (optional, ~$15/yr)

Instead of `tipping-stars-xyz.vercel.app` you could have `tippingstars.com.au`:
1. Buy domain at Namecheap (~$15/yr AUD)
2. Vercel → your project → Settings → Domains → add your domain
3. Follow the DNS instructions

---

## NEED HELP?

Common issues:
- **Can't log in after sign up?** Check your email for a confirmation link (Supabase sends one)
- **Admin panel not showing?** Make sure `is_super_admin = true` in Supabase profiles table
- **Tips not locking?** Check that kickoff times were entered correctly (with timezone)
- **Leaderboard empty?** Points only show after match results are entered
