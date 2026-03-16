// ============================================================
//  SUPABASE CONFIGURATION
//  Replace these values with your actual Supabase project info
//  Found in: Supabase Dashboard → Settings → API
// ============================================================

const SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_PUBLIC_KEY";

// Initialize Supabase client (loaded via CDN in HTML)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
//  ADMIN CREDENTIALS  (used to log in at /admin)
//  ID    : 123456789        ← use as the email prefix, e.g. 123456789@yourdomain.com
//  Pass  : Admin@123
//  NOTE  : Supabase Auth requires an email address.
//          Go to Supabase → Authentication → Users → Add user
//          and create:  email = 123456789@yourdomain.com  |  password = Admin@123
// ============================================================

// ============================================================
//  RESTAURANT CONFIG
//  Edit these defaults — they are also editable via Admin Panel
// ============================================================
const RESTAURANT_CONFIG = {
  name: "La Bella Cucina",
  tagline: "Authentic flavors, crafted with love since 1998",
  phone: "+1 (555) 123-4567",
  address: "123 Olive Street, Little Italy, New York, NY 10013",
  openTime: "Mon–Fri: 11am–10pm  |  Sat–Sun: 10am–11pm",
  mapEmbedUrl:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3023.0!2d-74.005!3d40.7195!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDDCsDQzJzEwLjIiTiA3NMKwMDAnMTguMCJX!5e0!3m2!1sen!2sus!4v1234567890",
  heroImage:
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&q=80",
  storageUrl: `https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/menu-images/`,

  // ── WiFi defaults (also editable live via Admin Panel → Restaurant Info) ──
  wifiEnabled:  true,
  wifiName:     "LaBellaCucina_Guest",
  wifiPassword: "welcome2024",
};
