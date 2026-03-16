/* ============================================================
   menu.js — Full Menu Page Logic
   Loads all menu items from Supabase and renders them
   ============================================================ */

(async function () {
  "use strict";

  /* ── DOM refs ── */
  const navbar      = document.getElementById("navbar");
  const hamburger   = document.getElementById("hamburger");
  const mobileMenu  = document.getElementById("mobileMenu");
  const mobileClose = document.getElementById("mobileClose");
  const menuGrid    = document.getElementById("menuGrid");
  const menuCount   = document.getElementById("menuCount");
  const menuCallBtn = document.getElementById("menuCallBtn");
  const footerYear  = document.getElementById("footerYear");

  /* ── Footer year ── */
  if (footerYear) footerYear.textContent = new Date().getFullYear();

  /* ── Navbar scroll ── */
  window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 60);
  }, { passive: true });

  /* ── Mobile menu ── */
  hamburger.addEventListener("click", () => {
    mobileMenu.classList.add("open");
    document.body.style.overflow = "hidden";
  });

  function closeMobileMenu() {
    mobileMenu.classList.remove("open");
    document.body.style.overflow = "";
  }

  mobileClose.addEventListener("click", closeMobileMenu);
  mobileMenu.querySelectorAll("a").forEach(a => a.addEventListener("click", closeMobileMenu));

  /* ── Load phone for CTA button ── */
  async function loadPhone() {
    try {
      const { data } = await supabase
        .from("settings")
        .select("phone")
        .limit(1)
        .single();
      const phone = (data && data.phone) ? data.phone : RESTAURANT_CONFIG.phone;
      if (menuCallBtn) {
        menuCallBtn.href = `tel:${phone.replace(/[^0-9+]/g, "")}`;
      }
    } catch {
      if (menuCallBtn) {
        menuCallBtn.href = `tel:${RESTAURANT_CONFIG.phone.replace(/[^0-9+]/g, "")}`;
      }
    }
  }

  /* ── Build card ── */
  function buildCard(item, delay = 0) {
    const price = parseFloat(item.price).toFixed(2);
    const imgSrc = item.image_url
      ? item.image_url
      : "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=70";

    const card = document.createElement("article");
    card.className = "menu-card";
    card.style.animationDelay = `${Math.min(delay, 600)}ms`;
    card.innerHTML = `
      <div class="card-image-wrap">
        <img
          src="${escapeHtml(imgSrc)}"
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

  /* ── Load all menu items ── */
  async function loadMenu() {
    try {
      const { data, error } = await supabase
        .from("menu")
        .select("id, name, price, image_url")
        .order("created_at", { ascending: false });

      if (error) throw error;

      menuGrid.innerHTML = "";

      if (!data || data.length === 0) {
        menuGrid.innerHTML = `
          <div class="menu-empty">
            <div class="menu-empty-icon">🍽</div>
            <p style="font-size:1rem; color:var(--text-light);">
              Our menu is being updated — check back soon!
            </p>
          </div>`;
        if (menuCount) menuCount.textContent = "";
        return;
      }

      data.forEach((item, i) => {
        menuGrid.appendChild(buildCard(item, i * 60));
      });

      if (menuCount) {
        menuCount.textContent = `${data.length} item${data.length !== 1 ? "s" : ""} available`;
      }

    } catch (err) {
      console.error("Menu load error:", err);
      menuGrid.innerHTML = `
        <div class="menu-empty">
          <div class="menu-empty-icon">⚠️</div>
          <p style="font-size:1rem; color:var(--text-light);">
            Unable to load the menu right now. Please try again later.
          </p>
        </div>`;
    }
  }

  /* ── Utility ── */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ── Init ── */
  await Promise.all([loadMenu(), loadPhone()]);

})();
