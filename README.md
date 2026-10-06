# 📦 Mudancy

**Selling your stuff because you're moving?** Mudancy is a small website where you list the things you want to sell, with photos, prices and categories. Visitors browse, and reserve what they like by leaving their name and phone number. You manage everything from a private admin panel.

Mudancy is free, open source, and runs on free tiers of [Supabase](https://supabase.com) (database, login, photo storage) and [Vercel](https://vercel.com) (hosting). It speaks **English and Spanish**, and both visitors and admins can switch language at any time.

## What you get

- **Public catalog** with photos, prices, categories and status (available / reserved / sold).
- **Reservations without online payment:** the visitor leaves their name and phone, you contact them to arrange pickup. A reserved item can't be reserved twice, even if two people click at the same moment.
- **Admin panel** to add and edit products, drag photos to reorder them, manage categories, mark items as sold, and see who reserved what.
- **Bilingual content:** write each product's title, description and condition in English and Spanish. If you only write one, visitors in the other language still see it.
- **Passwordless login:** you sign in with a link sent to your email. There is no password to choose, store, or leak.
- **Mobile friendly.**

---

## Set it up in about 20 minutes

You need: [Supabase](https://supabase.com) and [Vercel](https://vercel.com). You do **not** need to install anything on your computer.

### 1. Get your own copy of the code

1. Open this repository on GitHub and click **Fork** (top right), then **Create fork**.
2. You now have your own copy under your account. Keep this tab open.

### 2. Create your Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and click **New project**.
2. Pick a name (e.g. `mudancy`) and a region close to you.
3. Supabase asks for a **database password**. Let it generate one and save it in your password manager. Mudancy never asks you for it again; it only protects direct database access.
4. Click **Create new project** and wait about a minute until it's ready.

### 3. Create the database tables

1. In your Supabase project, open **SQL Editor** in the left menu and click **New query**.
2. On GitHub, open the file [`supabase-schema.sql`](./supabase-schema.sql) in your fork, click the **Copy raw file** button, and paste it into the SQL Editor.
3. Click **Run**. You should see "Success. No rows returned".

This creates the tables, the security rules, the photo storage and a few starter categories.

### 4. Tell Mudancy who the admin is

In the same SQL Editor, open a new query, replace the email with **your own**, and run it:

```sql
insert into admins (email) values ('you@example.com');
```

Only the emails in this list can log in to the admin panel. To add another admin later, run the same line with their email. To remove one: `delete from admins where email = 'someone@example.com';`

### 5. Copy your Supabase keys

Open **Project Settings → API Keys** (the Project URL is under **Project Settings → Data API**, or on the project's home page) and copy two values:

- **Project URL**, which looks like `https://abcdefgh.supabase.co`
- **Publishable key** (or the legacy **anon** key, either works). It starts with `sb_publishable_` or `eyJ`.

> ⚠️ Do **not** copy the `secret` or `service_role` key anywhere. Mudancy never needs it, and anyone who has it can read and change all your data. The publishable/anon key is meant to be public: your data is protected by the security rules you installed in step 3.

### 6. Put the site online with Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and sign in with GitHub.
2. Click **Import** next to your `mudancy` fork.
3. Vercel detects the settings automatically (framework: **Vite**). Open **Environment Variables** and add:

   | Name | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | your Project URL from step 5 |
   | `VITE_SUPABASE_ANON_KEY` | your Publishable (or anon) key from step 5 |

   Optional ones (you can add them later too):

   | Name | Default | What it does |
   | --- | --- | --- |
   | `VITE_SITE_NAME` | `Mudancy` | Name in the header and browser tab |
   | `VITE_CURRENCY` | `USD` | Currency of all prices (`EUR`, `ARS`, `MXN`, ...) |
   | `VITE_DEFAULT_LANG` | `en` | Language for visitors whose browser language is neither English nor Spanish (`en` or `es`) |

4. Click **Deploy**. After a minute Vercel gives you a URL like `https://mudancy-yourname.vercel.app`. Copy it.

### 7. Tell Supabase your website address

This makes the login link bring you back to your site instead of somewhere else.

1. In Supabase, open **Authentication → URL Configuration**.
2. Set **Site URL** to your Vercel URL (e.g. `https://mudancy-yourname.vercel.app`).
3. Under **Redirect URLs**, click **Add URL** and add `https://mudancy-yourname.vercel.app/**` (with your real address).
4. Click **Save**.

Leave **Authentication → Sign In / Providers → "Allow new users to sign up"** switched **on**: strangers still can't get in, because the database only accepts the emails you listed in step 4.

### 8. Log in and add your first product

1. Open `https://your-site.vercel.app/admin`.
2. Type your email and click **Send me a sign-in link**.
3. Open the email and click the link (**on the same device**). The first time, the email may say "Confirm your signup": that's normal.
4. You're in. Add your first product with **New product**. Use the language buttons at the top of the form to write it in English and Spanish.

That's it, your shop is live. Share the link with your friends. 🎉

---

## Everyday use

- **Reservations:** when someone reserves an item, it shows as *Reserved* and the admin list shows their name and phone. Contact them, then press **Mark sold** (or **Mark available** if they back out).
- **Photos:** the first photo is the cover. Drag photos in the product form to reorder them (press and hold on a phone).
- **Categories:** manage them under **Categories** in the admin panel. Write the name in at least one language.
- **Language:** the **EN / ES** buttons are on the public site, the login page and the admin panel. The choice is remembered in the browser.

## Customize it

- **Name, currency, default language:** the environment variables from step 6. Change them in Vercel under **Settings → Environment Variables**, then **Redeploy**.
- **Texts** (tagline, button labels...): edit [`src/i18n/en.json`](./src/i18n/en.json) and [`src/i18n/es.json`](./src/i18n/es.json).
- **Colors:** the variables at the top of [`src/index.css`](./src/index.css).
- **Add another language:** copy `src/i18n/en.json` to `src/i18n/<code>.json` (for example `fr.json`), translate it, and add one line in [`src/i18n/languages.js`](./src/i18n/languages.js). The switcher and the admin forms pick it up automatically. Also add the new language to the starter category names in `supabase-schema.sql` if you want them translated.

## Good to know

- **Login emails:** Supabase's built-in email service is meant for testing and only sends a few emails per hour. That's plenty for one admin who logs in now and then. If you hit the limit, wait a bit, or set up your own email provider under **Authentication → Emails → SMTP Settings** ([guide](https://supabase.com/docs/guides/auth/auth-smtp)).
- **Free tier:** Supabase pauses free projects after a week without activity. Opening your site once resumes them.
- **Privacy:** reservations store the name and phone people type in. Only admins can read them. Delete products (or the reservations table rows) when you no longer need that data.
- **Updating Mudancy:** on GitHub, open your fork and click **Sync fork**. Then run `supabase-schema.sql` again in the SQL Editor if the release notes mention database changes (it's safe to re-run).

## Troubleshooting

| Problem | What to do |
| --- | --- |
| *"We couldn't send the link"* on the login page | The email isn't in the admins list (step 4), or Supabase's hourly email limit was reached. |
| The link opens `localhost` or a "requested path is invalid" page | Fix **Site URL** and **Redirect URLs** (step 7), then request a new link. |
| The link says it expired | Links work once and expire quickly. Request a new one and open it on the same device you logged in from. |
| The site is blank or shows no products after deploying | Check the two `VITE_SUPABASE_*` variables in Vercel, then **Redeploy** (variables only apply to new deployments). |
| *"signed in, but not listed as an admin"* | Your email is not in the `admins` table, or it was typed with different spelling. Emails are stored in lowercase. |
| Photos won't upload | Make sure you ran the whole `supabase-schema.sql` (it creates the `product-images` storage bucket). |

---

## For developers

Stack: React 19 + Vite, React Router, Supabase (Postgres, Auth, Storage), deployed on Vercel.

### Run it on your computer

Requires Node.js 20 or newer.

```bash
git clone https://github.com/<you>/mudancy.git
cd mudancy
npm install
cp .env.example .env.local   # then fill in the two Supabase values
npm run dev
```

Open <http://localhost:5173>. For the login link to work locally, add `http://localhost:5173/**` to **Redirect URLs** in Supabase (step 7). `.env.local` is gitignored: never commit it.

### How the security works

- The browser only has the publishable/anon key. Every table has Row Level Security: everybody can read the catalog, only emails listed in `admins` can write it, and reservations are readable by admins only.
- Visitors reserve through the `reserve_product()` function, which checks and updates the product atomically.
- A database trigger rejects account creation for any email that is not in `admins`.
- There are no passwords or secret keys in this repository or in the deployed site.

### Project layout

```text
mudancy/
├── src/
│   ├── components/      # shared UI (grid, gallery, reserve modal, language switcher...)
│   ├── config.js        # site name, currency, default language (from env vars)
│   ├── i18n/            # en.json, es.json, languages.js, language context
│   ├── lib/             # Supabase client, auth, money/date formatting, translation helpers
│   └── pages/           # Home, ProductPage, admin/ (login + products + categories)
├── scripts/             # optional SQL runner + e2e test helpers
├── supabase-schema.sql  # the whole database: tables, security rules, storage, seed data
├── tests/               # Playwright end-to-end tests
└── vercel.json
```

### Running the tests

```bash
npm run lint
npm run test -- --run     # unit tests (Vitest)
npm run test:e2e          # end-to-end tests (Playwright)
```

The end-to-end tests write real rows, so they need a **separate, empty Supabase project** that is not your shop:

1. Create a second Supabase project (e.g. `mudancy-test`).
2. `cp .env.test.example .env.test.local` and fill it in (project URL, publishable key, `service_role` key, database connection string, and any test email). This file is gitignored.
3. `npm run db:setup:test` creates the tables, a marker table, and the test admin.
4. `npm run test:e2e`.

The suite refuses to run unless the database has the `e2e_environment` marker table, so it can't touch your real shop by mistake. Tests sign in without a password: they ask Supabase (with the service role key of the *test* project) to mint a one-time session for the test admin. Test products are titled `[E2E] ...` and cleaned up afterwards; `npm run test:e2e:cleanup` removes any leftovers (`-- --all` removes all of them).

In GitHub Actions the e2e job only runs if you add these repository secrets (pointing at the test project): `E2E_SUPABASE_URL`, `E2E_SUPABASE_ANON_KEY`, `E2E_SUPABASE_SERVICE_ROLE_KEY`, `E2E_ADMIN_EMAIL`.

### Changing the database

`supabase-schema.sql` is the source of truth and every statement is idempotent. Edit it, run it in the SQL Editor (or `npm run db:push` after setting `POSTGRES_URL_NON_POOLING` in `.env.local`), and run `npm run db:push:test` for the test project.

---

## License

Mudancy is free software under the [GNU Affero General Public License v3.0](./LICENSE). You can use, modify and host it, and if you offer a modified version as a service you must share your changes under the same license.
