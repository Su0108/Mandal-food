/* ============================================================
   main.js — Home Page Logic
   Handles: nav, hero, featured menu preview, contact section
   ============================================================ */

(async function () {
  "use strict";

  /* ── DOM refs ── */
  const navbar       = document.getElementById("navbar");
  const hamburger    = document.getElementById("hamburger");
  const mobileMenu   = document.getElementById("mobileMenu");
  const mobileClose  = document.getElementById("mobileClose");
  const heroBg       = document.getElementById("heroBg");
  const featuredGrid = document.getElementById("featuredGrid");
  const mapEmbed     = document.getElementById("mapEmbed");
  const footerYear   = document.getElementById("footerYear");

  /* ── Footer year ── */
  if (footerYear) footerYear.textContent = new Date().getFullYear();

  /* ── Navbar scroll effect ── */
  window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 60);
  }, { passive: true });

  /* ── Mobile menu toggle ── */
  hamburger.addEventListener("click", () => {
    mobileMenu.classList.add("open");
    hamburger.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  });

  function closeMobileMenu() {
    mobileMenu.classList.remove("open");
    hamburger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  mobileClose.addEventListener("click", closeMobileMenu);
  mobileMenu.querySelectorAll("a").forEach(a => a.addEventListener("click", closeMobileMenu));

  /* ── Hero background ── */
  if (heroBg && RESTAURANT_CONFIG.heroImage) {
    heroBg.style.backgroundImage = `url('${RESTAURANT_CONFIG.heroImage}')`;
  }

  /* ── Load settings from Supabase (or fall back to config) ── */
  async function loadSettings() {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .limit(1)
        .single();

      if (error || !data) throw new Error("No settings row");

      return {
        phone:        data.phone         || RESTAURANT_CONFIG.phone,
        address:      data.address       || RESTAURANT_CONFIG.address,
        openTime:     data.open_time      || RESTAURANT_CONFIG.openTime,
        mapUrl:       data.map_embed_url  || RESTAURANT_CONFIG.mapEmbedUrl,
        wifiEnabled:  data.wifi_enabled  !== undefined ? data.wifi_enabled  : RESTAURANT_CONFIG.wifiEnabled,
        wifiName:     data.wifi_name     || RESTAURANT_CONFIG.wifiName,
        wifiPassword: data.wifi_password || RESTAURANT_CONFIG.wifiPassword,
      };
    } catch {
      return {
        phone:        RESTAURANT_CONFIG.phone,
        address:      RESTAURANT_CONFIG.address,
        openTime:     RESTAURANT_CONFIG.openTime,
        mapUrl:       RESTAURANT_CONFIG.mapEmbedUrl,
        wifiEnabled:  RESTAURANT_CONFIG.wifiEnabled,
        wifiName:     RESTAURANT_CONFIG.wifiName,
        wifiPassword: RESTAURANT_CONFIG.wifiPassword,
      };
    }
  }

  /* ── Populate contact section + WiFi ── */
  async function populateContact() {
    const s = await loadSettings();

    const addrEl  = document.getElementById("contactAddress");
    const phoneEl = document.getElementById("contactPhone");
    const hoursEl = document.getElementById("contactHours");
    const callBtn = document.getElementById("callBtn");
    const callBtnContact = document.getElementById("callBtnContact");
    const directionsBtn  = document.getElementById("directionsBtn");

    if (addrEl)  addrEl.textContent  = s.address;
    if (phoneEl) phoneEl.textContent = s.phone;
    if (hoursEl) hoursEl.textContent = s.openTime;

    const tel = s.phone.replace(/[^0-9+]/g, "");
    if (callBtn) callBtn.href = `tel:${tel}`;
    if (callBtnContact) callBtnContact.href = `tel:${tel}`;

    if (directionsBtn) {
      directionsBtn.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}`;
    }

    if (mapEmbed && s.mapUrl && s.mapUrl !== "") {
      mapEmbed.src = s.mapUrl;
    }

    // ── WiFi ──
    const wifiSection  = document.getElementById("wifiSection");
    const wifiNameEl   = document.getElementById("wifiNameDisplay");
    const wifiPassEl   = document.getElementById("wifiPassDisplay");
    const togglePassBtn = document.getElementById("toggleWifiPass");
    const copyNameBtn  = document.getElementById("copyWifiName");
    const copyPassBtn  = document.getElementById("copyWifiPass");

    if (wifiSection && s.wifiEnabled) {
      wifiSection.style.display = "block";

      const wifiName = s.wifiName     || "—";
      const wifiPass = s.wifiPassword || "—";
      let   passVisible = false;

      if (wifiNameEl) wifiNameEl.textContent = wifiName;
      if (wifiPassEl) wifiPassEl.textContent  = "••••••••";

      // Show/hide password
      togglePassBtn && togglePassBtn.addEventListener("click", () => {
        passVisible = !passVisible;
        wifiPassEl.textContent     = passVisible ? wifiPass : "••••••••";
        togglePassBtn.textContent  = passVisible ? "🙈" : "👁";
      });

      // Copy network name
      copyNameBtn && copyNameBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(wifiName);
          copyNameBtn.textContent = "Copied!";
          setTimeout(() => (copyNameBtn.textContent = "Copy"), 2000);
        } catch { copyNameBtn.textContent = wifiName; }
      });

      // Copy password
      copyPassBtn && copyPassBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(wifiPass);
          copyPassBtn.textContent = "Copied!";
          setTimeout(() => (copyPassBtn.textContent = "Copy"), 2000);
        } catch { copyPassBtn.textContent = wifiPass; }
      });
    } else if (wifiSection) {
      wifiSection.style.display = "none";
    }
  }

  /* ── Build a menu card HTML ── */
  function buildCard(item, delay = 0) {
    const price = parseFloat(item.price).toFixed(2);
    const imgSrc = item.image_url
      ? item.image_url
      : "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=70";

    const card = document.createElement("article");
    card.className = "menu-card";
    card.style.animationDelay = `${delay}ms`;
    card.innerHTML = `
      <div class="card-image-wrap">
        <img
          src="${imgSrc}"
          alt="${escapeHtml(item.name)}"
          class="card-image"
          loading="lazy"
          onerror="this.src='https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=70'"
        />
      </div>
      <div class="card-body">
        <div class="card-name">${escapeHtml(item.name)}</div>
        <div class="card-price">${price}</div>
      </div>
    `;
    return card;
  }

  /* ── Load featured menu items (max 6) ── */
  async function loadFeaturedMenu() {
    try {
      const { data, error } = await supabase
        .from("menu")
        .select("id, name, price, image_url")
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) throw error;

      featuredGrid.innerHTML = "";

      if (!data || data.length === 0) {
        featuredGrid.innerHTML = `
          <div class="menu-empty">
            <div class="menu-empty-icon">🍽</div>
            <p>Menu coming soon — check back shortly!</p>
          </div>`;
        return;
      }

      data.forEach((item, i) => {
        featuredGrid.appendChild(buildCard(item, i * 80));
      });

    } catch (err) {
      console.error("Menu load error:", err);
      featuredGrid.innerHTML = `
        <div class="menu-empty">
          <div class="menu-empty-icon">⚠️</div>
          <p>Couldn't load menu right now. Please try again later.</p>
        </div>`;
    }
  }

  /* ── Utility: escape HTML ── */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ── Initialise ── */
  await Promise.all([loadFeaturedMenu(), populateContact()]);

})();
