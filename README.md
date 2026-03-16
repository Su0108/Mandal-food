# 🍽 La Bella Cucina — Restaurant Website

A complete restaurant website with public menu, contact info, and a secure admin dashboard to manage everything — built with HTML/CSS/JS, Supabase, and deployed to Cloudflare Pages.

---

## 📁 Project Structure

```
restaurant-site/
├── index.html          ← Home page (hero, menu preview, about, contact)
├── menu.html           ← Full menu listing
├── admin.html          ← Admin login + dashboard (/admin)
├── css/
│   ├── style.css       ← Customer-facing styles
│   └── admin.css       ← Admin panel styles
└── js/
    ├── config.js       ← ⚠️  YOUR SUPABASE KEYS GO HERE
    ├── main.js         ← Home page logic
    ├── menu.js         ← Menu page logic
    └── admin.js        ← Admin dashboard logic
```

---

## 🗄 STEP 1 — Supabase Setup

### 1.1 Create a Supabase project
1. Go to **https://supabase.com** → New Project
2. Note your **Project URL** and **anon public key** (Settings → API)

---

### 1.2 Create the `menu` table

Run this SQL in **Supabase → SQL Editor**:

```sql
CREATE TABLE menu (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  price      NUMERIC(10,2) NOT NULL,
  image_url  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow public reads (customers can view the menu)
ALTER TABLE menu ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read menu"
  ON menu FOR SELECT
  USING (true);

-- Only authenticated users can write
CREATE POLICY "Authenticated can insert"
  ON menu FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update"
  ON menu FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can delete"
  ON menu FOR DELETE
  TO authenticated
  USING (true);
```

---

### 1.3 Create the `settings` table

```sql
CREATE TABLE settings (
  id              INT PRIMARY KEY DEFAULT 1,
  phone           TEXT,
  address         TEXT,
  open_time       TEXT,
  map_embed_url   TEXT
);

-- Prevent more than one row
ALTER TABLE settings ADD CONSTRAINT single_row CHECK (id = 1);

-- Public reads
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read settings"
  ON settings FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can upsert settings"
  ON settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert the initial row (edit values as needed)
INSERT INTO settings (id, phone, address, open_time, map_embed_url)
VALUES (
  1,
  '+1 (555) 123-4567',
  '123 Olive Street, Little Italy, New York, NY 10013',
  'Mon–Fri: 11am–10pm  |  Sat–Sun: 10am–11pm',
  'https://www.google.com/maps/embed?pb=YOUR_EMBED_CODE'
);
```

---

### 1.4 Create the Storage bucket for food images

1. Go to **Supabase → Storage → New Bucket**
2. Name it: `menu-images`
3. Set it to **Public**
4. Go to **Policies → New Policy** and add:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated can upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'menu-images');

-- Allow public to read images
CREATE POLICY "Public can view images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'menu-images');
```

---

### 1.5 Create your admin user

1. Go to **Supabase → Authentication → Users → Invite user**
2. Enter your admin email — you'll receive a setup email
3. Set your password via the email link

---

## 🔑 STEP 2 — Configure the Site

Open `js/config.js` and replace the placeholder values:

```js
const SUPABASE_URL     = "https://YOUR_PROJECT_REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_PUBLIC_KEY";
```

Also update `RESTAURANT_CONFIG` with your restaurant's real details:
- `name`, `tagline`, `phone`, `address`, `openTime`
- `mapEmbedUrl` — paste from Google Maps → Share → Embed a map → copy the `src="..."` URL
- `heroImage` — URL to your hero photo (or use a local file path)

> **Note:** The anon/public key is safe to expose in frontend code. It only allows
> operations permitted by your Row Level Security policies.

---

## 🌐 STEP 3 — Get a Google Maps Embed URL

1. Open **Google Maps**, search for your restaurant address
2. Click **Share** → **Embed a map**
3. Copy the URL inside `src="..."` from the iframe code
4. Paste it into `js/config.js` → `mapEmbedUrl`
5. Also paste it into the Supabase `settings` table via admin panel

---

## ☁️ STEP 4 — Deploy to Cloudflare Pages

### Option A: Connect GitHub (recommended)

1. Push your project to a GitHub repository
2. Go to **Cloudflare Dashboard → Pages → Create a project**
3. Connect your GitHub account and select the repository
4. Build settings:
   - **Build command:** *(leave empty — this is a static site)*
   - **Build output directory:** `/` (root)
5. Click **Save and Deploy**
6. Cloudflare auto-assigns a URL like `your-project.pages.dev`

### Option B: Direct Upload (no git required)

1. Go to **Cloudflare Dashboard → Pages → Create a project**
2. Choose **Direct Upload**
3. Drag and drop your entire `restaurant-site/` folder
4. Click **Deploy**

---

### 4.1 Set up the `/admin` URL route

By default, `/admin` points to `admin.html`. To make it work cleanly without
the `.html` extension, add a `_redirects` file in your project root:

```
/admin   /admin.html   200
```

Create the file at: `restaurant-site/_redirects` with that content.

---

### 4.2 Custom Domain (optional)

1. In Cloudflare Pages → your project → **Custom Domains**
2. Add your domain (e.g. `labelacucina.com`)
3. Follow the DNS instructions
4. SSL is automatic ✓

---

## 🔗 STEP 5 — Link in Google Maps Business Profile

1. Go to **Google Business Profile** (business.google.com)
2. Select your business → **Edit profile** → **Website**
3. Enter your Cloudflare Pages URL (e.g. `https://labelacucina.pages.dev`)
4. Save

---

## 👨‍💼 Using the Admin Panel

Navigate to `yoursite.com/admin`

| Feature | How |
|---|---|
| Login | Email + password (Supabase Auth) |
| Add menu item | Sidebar → Add New Item |
| Upload food image | Drag & drop or click in the image zone |
| Edit menu item | Menu Items → ✏️ Edit |
| Delete menu item | Menu Items → 🗑 Delete |
| Update phone/address/hours | Sidebar → Restaurant Info → Save |
| Update map | Restaurant Info → paste new embed URL |

---

## 🛠 Customisation Tips

- **Restaurant name:** Change `La Bella Cucina` in `index.html`, `menu.html`, `admin.html`, and `config.js`
- **Colors:** Edit CSS variables at the top of `css/style.css`
- **Hero image:** Change `RESTAURANT_CONFIG.heroImage` in `config.js`
- **Fonts:** Replace Google Fonts import URLs in `css/style.css`
- **About section:** Edit the text directly in `index.html` (search for "about-text")
- **Stats (25+ years, etc.):** Edit the `.about-stats` section in `index.html`

---

## ⚡ Performance Notes

- All menu images are loaded with `loading="lazy"`
- Supabase JS is loaded from jsDelivr CDN
- Fonts are loaded from Google Fonts with `display=swap`
- No build step required — pure static files
- Cloudflare CDN provides global edge caching automatically

---

## 🔒 Security Notes

- The `SUPABASE_ANON_KEY` is safe to expose — Supabase RLS policies control access
- Admin writes require authentication via Supabase Auth
- The admin page has `<meta name="robots" content="noindex">` to prevent indexing
- All user inputs are HTML-escaped before rendering
