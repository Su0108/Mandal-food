/* ============================================================
   admin.js — Admin Dashboard Logic
   Handles: Supabase auth, CRUD for menu items, settings,
            image upload to Supabase Storage
   ============================================================ */

(function () {
  "use strict";

  /* ══════════════════════════════════════════
     STATE
  ══════════════════════════════════════════ */
  let currentUser    = null;
  let allMenuItems   = [];
  let pendingImageFile   = null;  // for add form
  let editPendingFile    = null;  // for edit modal
  let deleteTargetId     = null;
  let currentImageUrl    = null;  // current image on edit item

  /* ══════════════════════════════════════════
     DOM REFS
  ══════════════════════════════════════════ */
  const loginPage     = document.getElementById("loginPage");
  const dashboardPage = document.getElementById("dashboardPage");
  const loginBtn      = document.getElementById("loginBtn");
  const logoutBtn     = document.getElementById("logoutBtn");
  const loginEmail    = document.getElementById("loginEmail");
  const loginPassword = document.getElementById("loginPassword");
  const loginError    = document.getElementById("loginError");
  const sidebarUserEmail = document.getElementById("sidebarUserEmail");
  const sidebar       = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const adminToast    = document.getElementById("adminToast");

  /* ══════════════════════════════════════════
     UTILITY: Toast
  ══════════════════════════════════════════ */
  let toastTimer = null;

  function showToast(msg, type = "info") {
    adminToast.textContent = msg;
    adminToast.className = `admin-toast ${type} show`;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      adminToast.className = "admin-toast";
    }, 3500);
  }

  /* ══════════════════════════════════════════
     UTILITY: Escape HTML
  ══════════════════════════════════════════ */
  function esc(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ══════════════════════════════════════════
     UTILITY: Format date
  ══════════════════════════════════════════ */
  function fmtDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  /* ══════════════════════════════════════════
     PANEL NAVIGATION
  ══════════════════════════════════════════ */
  function showPanel(name) {
    document.querySelectorAll(".panel-section").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".sidebar-nav a").forEach(a => a.classList.remove("active"));

    const target = document.getElementById(`panel-${name}`);
    if (target) target.classList.add("active");

    document.querySelectorAll(`.sidebar-nav a[data-panel="${name}"]`).forEach(a => a.classList.add("active"));

    // Close mobile sidebar after navigation
    if (window.innerWidth <= 900) {
      sidebar.classList.remove("open");
    }

    // Refresh data when switching panels
    if (name === "overview") renderOverview();
    if (name === "menu")     renderMenuTable();
  }

  // Wire sidebar nav links
  document.querySelectorAll(".sidebar-nav a[data-panel]").forEach(link => {
    link.addEventListener("click", () => showPanel(link.dataset.panel));
  });

  // Wire shortcut buttons that switch panels
  ["overviewAddBtn", "menuAddBtn"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", () => showPanel("add-item"));
  });

  document.getElementById("cancelAddBtn").addEventListener("click", () => showPanel("menu"));

  /* ── Mobile sidebar toggle ── */
  sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });

  // Close sidebar when clicking outside on mobile
  document.addEventListener("click", (e) => {
    if (
      window.innerWidth <= 900 &&
      sidebar.classList.contains("open") &&
      !sidebar.contains(e.target) &&
      e.target !== sidebarToggle
    ) {
      sidebar.classList.remove("open");
    }
  });

  /* ══════════════════════════════════════════
     AUTH
  ══════════════════════════════════════════ */
  async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      currentUser = session.user;
      showDashboard();
    } else {
      showLogin();
    }
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) {
      currentUser = session.user;
      showDashboard();
    } else {
      showLogin();
    }
  });

  function showLogin() {
    loginPage.style.display = "flex";
    dashboardPage.style.display = "none";
  }

  function showDashboard() {
    loginPage.style.display = "none";
    dashboardPage.style.display = "block";
    if (sidebarUserEmail) sidebarUserEmail.textContent = currentUser?.email || "";
    showPanel("overview");
    loadAllMenuItems();
    loadSettings();
  }

  /* ── Login ── */
  loginBtn.addEventListener("click", async () => {
    const email = loginEmail.value.trim();
    const pass  = loginPassword.value;
    let valid   = true;

    document.getElementById("emailError").classList.remove("show");
    document.getElementById("passwordError").classList.remove("show");
    loginError.classList.remove("show");
    loginError.textContent = "";

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      document.getElementById("emailError").classList.add("show");
      valid = false;
    }
    if (!pass) {
      document.getElementById("passwordError").classList.add("show");
      valid = false;
    }
    if (!valid) return;

    loginBtn.textContent = "Signing in…";
    loginBtn.disabled = true;

    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });

    loginBtn.textContent = "Sign In →";
    loginBtn.disabled = false;

    if (error) {
      loginError.textContent = error.message || "Invalid credentials. Please try again.";
      loginError.classList.add("show");
    }
  });

  /* Allow Enter key to submit login */
  [loginEmail, loginPassword].forEach(el => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") loginBtn.click();
    });
  });

  /* ── Logout ── */
  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
  });

  /* ══════════════════════════════════════════
     MENU DATA
  ══════════════════════════════════════════ */
  async function loadAllMenuItems() {
    try {
      const { data, error } = await supabase
        .from("menu")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      allMenuItems = data || [];
      updateStats();
      renderOverview();
      renderMenuTable();
    } catch (err) {
      console.error("Load menu error:", err);
      showToast("Failed to load menu items", "error");
    }
  }

  function updateStats() {
    const total      = allMenuItems.length;
    const withImages = allMenuItems.filter(i => i.image_url).length;
    const statMenu   = document.getElementById("statMenuCount");
    const statImgs   = document.getElementById("statWithImages");
    if (statMenu) statMenu.textContent = total;
    if (statImgs) statImgs.textContent = withImages;
    const countEl    = document.getElementById("menuItemsCount");
    if (countEl)  countEl.textContent = `${total} item${total !== 1 ? "s" : ""}`;
  }

  /* ── Render overview table (last 5) ── */
  function renderOverview() {
    const tbody = document.getElementById("overviewTableBody");
    if (!tbody) return;

    const items = allMenuItems.slice(0, 5);

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td class="table-empty" colspan="5">No menu items yet. <a href="#" data-panel="add-item" style="color:var(--burgundy);">Add one →</a></td></tr>`;
      tbody.querySelector("a[data-panel]")?.addEventListener("click", (e) => {
        e.preventDefault();
        showPanel("add-item");
      });
      return;
    }

    tbody.innerHTML = items.map(item => tableRow(item)).join("");
    wireTableButtons(tbody);
  }

  /* ── Render full menu table ── */
  function renderMenuTable() {
    const tbody = document.getElementById("menuTableBody");
    if (!tbody) return;

    if (allMenuItems.length === 0) {
      tbody.innerHTML = `<tr><td class="table-empty" colspan="5">No menu items yet. <a href="#" style="color:var(--burgundy);" id="tableAddLink">Add your first item →</a></td></tr>`;
      tbody.querySelector("#tableAddLink")?.addEventListener("click", (e) => {
        e.preventDefault();
        showPanel("add-item");
      });
      return;
    }

    tbody.innerHTML = allMenuItems.map(item => tableRow(item)).join("");
    wireTableButtons(tbody);
  }

  function tableRow(item) {
    const price = parseFloat(item.price).toFixed(2);
    const thumb = item.image_url
      ? `<img src="${esc(item.image_url)}" alt="${esc(item.name)}" class="table-thumb" loading="lazy" onerror="this.style.display='none'" />`
      : `<div class="table-thumb-placeholder">🍽</div>`;

    return `
      <tr data-id="${item.id}">
        <td>${thumb}</td>
        <td style="font-weight:500;">${esc(item.name)}</td>
        <td>$${price}</td>
        <td style="color:var(--text-light); font-size:0.82rem;">${fmtDate(item.created_at)}</td>
        <td>
          <div class="table-actions" style="justify-content:flex-end;">
            <button class="btn-admin btn-admin-outline btn-admin-sm edit-btn" data-id="${item.id}">✏️ Edit</button>
            <button class="btn-admin btn-admin-danger btn-admin-sm delete-btn" data-id="${item.id}" data-name="${esc(item.name)}">🗑</button>
          </div>
        </td>
      </tr>`;
  }

  function wireTableButtons(container) {
    container.querySelectorAll(".edit-btn").forEach(btn => {
      btn.addEventListener("click", () => openEditModal(btn.dataset.id));
    });
    container.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", () => openDeleteModal(btn.dataset.id, btn.dataset.name));
    });
  }

  /* ══════════════════════════════════════════
     ADD MENU ITEM
  ══════════════════════════════════════════ */
  const dropZone      = document.getElementById("dropZone");
  const imageFile     = document.getElementById("imageFile");
  const imagePreview  = document.getElementById("imagePreview");
  const imagePreviewWrap = document.getElementById("imagePreviewWrap");
  const uploadProgress   = document.getElementById("uploadProgress");
  const progressBar      = document.getElementById("progressBar");
  const progressText     = document.getElementById("progressText");

  imageFile.addEventListener("change", () => {
    const file = imageFile.files[0];
    if (file) handleImageSelect(file, "add");
  });

  ["dragover", "dragenter"].forEach(evt => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.add("drag-over");
    });
  });
  ["dragleave", "drop"].forEach(evt => {
    dropZone.addEventListener(evt, () => dropZone.classList.remove("drag-over"));
  });
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleImageSelect(file, "add");
  });

  function handleImageSelect(file, context = "add") {
    if (!file.type.startsWith("image/")) {
      showToast("Please select a valid image file (JPEG, PNG, WebP)", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be smaller than 5 MB", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (context === "add") {
        pendingImageFile = file;
        imagePreview.src = e.target.result;
        imagePreviewWrap.classList.add("show");
      } else {
        editPendingFile = file;
        document.getElementById("editImagePreview").src = e.target.result;
        document.getElementById("editImagePreviewWrap").classList.add("show");
      }
    };
    reader.readAsDataURL(file);
  }

  /* ── Upload image to Supabase Storage ── */
  async function uploadImage(file, showProgress = true) {
    const ext      = file.name.split(".").pop().toLowerCase();
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const path     = `menu/${filename}`;

    if (showProgress) {
      uploadProgress.classList.add("show");
      progressBar.style.width = "0%";
      progressText.textContent = "Uploading image…";
    }

    const { error } = await supabase.storage
      .from("menu-images")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (error) throw new Error(`Upload failed: ${error.message}`);

    if (showProgress) {
      progressBar.style.width = "100%";
      progressText.textContent = "Upload complete ✓";
      setTimeout(() => uploadProgress.classList.remove("show"), 1500);
    }

    const { data: urlData } = supabase.storage
      .from("menu-images")
      .getPublicUrl(path);

    return urlData.publicUrl;
  }

  /* ── Save new item ── */
  document.getElementById("saveItemBtn").addEventListener("click", async () => {
    const name  = document.getElementById("itemName").value.trim();
    const price = parseFloat(document.getElementById("itemPrice").value);
    let valid = true;

    document.getElementById("itemNameError").classList.remove("show");
    document.getElementById("itemPriceError").classList.remove("show");

    if (!name) { document.getElementById("itemNameError").classList.add("show"); valid = false; }
    if (isNaN(price) || price < 0) { document.getElementById("itemPriceError").classList.add("show"); valid = false; }
    if (!valid) return;

    const saveBtn = document.getElementById("saveItemBtn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";

    try {
      let imageUrl = null;

      if (pendingImageFile) {
        imageUrl = await uploadImage(pendingImageFile, true);
      }

      const { error } = await supabase
        .from("menu")
        .insert([{ name, price, image_url: imageUrl }]);

      if (error) throw error;

      showToast(`"${name}" added to menu! ✓`, "success");
      resetAddForm();
      await loadAllMenuItems();
      showPanel("menu");

    } catch (err) {
      console.error("Save error:", err);
      showToast(err.message || "Failed to save item", "error");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "💾 Save Item";
    }
  });

  function resetAddForm() {
    document.getElementById("itemName").value = "";
    document.getElementById("itemPrice").value = "";
    imageFile.value = "";
    pendingImageFile = null;
    imagePreviewWrap.classList.remove("show");
    uploadProgress.classList.remove("show");
    progressBar.style.width = "0%";
  }

  /* ══════════════════════════════════════════
     EDIT MODAL
  ══════════════════════════════════════════ */
  const editModal     = document.getElementById("editModal");
  const editModalClose = document.getElementById("editModalClose");
  const editCancelBtn  = document.getElementById("editCancelBtn");
  const editImageFile  = document.getElementById("editImageFile");

  function openEditModal(id) {
    const item = allMenuItems.find(i => i.id === id);
    if (!item) return;

    document.getElementById("editItemId").value    = item.id;
    document.getElementById("editItemName").value  = item.name;
    document.getElementById("editItemPrice").value = item.price;
    currentImageUrl = item.image_url;
    editPendingFile = null;

    const previewWrap = document.getElementById("editImagePreviewWrap");
    const preview     = document.getElementById("editImagePreview");

    if (item.image_url) {
      preview.src = item.image_url;
      previewWrap.classList.add("show");
    } else {
      previewWrap.classList.remove("show");
    }

    document.getElementById("editItemNameError").classList.remove("show");
    document.getElementById("editItemPriceError").classList.remove("show");

    editModal.classList.add("open");
  }

  function closeEditModal() {
    editModal.classList.remove("open");
    editPendingFile = null;
  }

  editModalClose.addEventListener("click", closeEditModal);
  editCancelBtn.addEventListener("click",  closeEditModal);
  editModal.addEventListener("click", (e) => {
    if (e.target === editModal) closeEditModal();
  });

  editImageFile.addEventListener("change", () => {
    const file = editImageFile.files[0];
    if (file) handleImageSelect(file, "edit");
  });

  /* ── Update item ── */
  document.getElementById("updateItemBtn").addEventListener("click", async () => {
    const id    = document.getElementById("editItemId").value;
    const name  = document.getElementById("editItemName").value.trim();
    const price = parseFloat(document.getElementById("editItemPrice").value);
    let valid = true;

    document.getElementById("editItemNameError").classList.remove("show");
    document.getElementById("editItemPriceError").classList.remove("show");

    if (!name)  { document.getElementById("editItemNameError").classList.add("show"); valid = false; }
    if (isNaN(price) || price < 0) { document.getElementById("editItemPriceError").classList.add("show"); valid = false; }
    if (!valid) return;

    const updateBtn = document.getElementById("updateItemBtn");
    updateBtn.disabled = true;
    updateBtn.textContent = "Updating…";

    try {
      let imageUrl = currentImageUrl;

      if (editPendingFile) {
        imageUrl = await uploadImage(editPendingFile, false);
      }

      const { error } = await supabase
        .from("menu")
        .update({ name, price, image_url: imageUrl })
        .eq("id", id);

      if (error) throw error;

      showToast(`"${name}" updated! ✓`, "success");
      closeEditModal();
      await loadAllMenuItems();

    } catch (err) {
      console.error("Update error:", err);
      showToast(err.message || "Failed to update item", "error");
    } finally {
      updateBtn.disabled = false;
      updateBtn.textContent = "💾 Update Item";
    }
  });

  /* ══════════════════════════════════════════
     DELETE MODAL
  ══════════════════════════════════════════ */
  const deleteModal     = document.getElementById("deleteModal");
  const deleteModalClose = document.getElementById("deleteModalClose");
  const deleteCancelBtn  = document.getElementById("deleteCancelBtn");
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

  function openDeleteModal(id, name) {
    deleteTargetId = id;
    document.getElementById("deleteItemId").value    = id;
    document.getElementById("deleteItemName").textContent = name;
    deleteModal.classList.add("open");
  }

  function closeDeleteModal() {
    deleteModal.classList.remove("open");
    deleteTargetId = null;
  }

  deleteModalClose.addEventListener("click", closeDeleteModal);
  deleteCancelBtn.addEventListener("click",  closeDeleteModal);
  deleteModal.addEventListener("click", (e) => {
    if (e.target === deleteModal) closeDeleteModal();
  });

  confirmDeleteBtn.addEventListener("click", async () => {
    if (!deleteTargetId) return;

    confirmDeleteBtn.disabled = true;
    confirmDeleteBtn.textContent = "Deleting…";

    try {
      const { error } = await supabase
        .from("menu")
        .delete()
        .eq("id", deleteTargetId);

      if (error) throw error;

      showToast("Item deleted ✓", "success");
      closeDeleteModal();
      await loadAllMenuItems();

    } catch (err) {
      console.error("Delete error:", err);
      showToast(err.message || "Failed to delete item", "error");
    } finally {
      confirmDeleteBtn.disabled = false;
      confirmDeleteBtn.textContent = "🗑 Delete";
    }
  });

  /* ══════════════════════════════════════════
     SETTINGS
  ══════════════════════════════════════════ */
  async function loadSettings() {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      const s = data || {};
      document.getElementById("settingPhone").value    = s.phone      || RESTAURANT_CONFIG.phone;
      document.getElementById("settingAddress").value  = s.address    || RESTAURANT_CONFIG.address;
      document.getElementById("settingOpenTime").value = s.open_time  || RESTAURANT_CONFIG.openTime;
      document.getElementById("settingMapUrl").value   = s.map_embed_url || RESTAURANT_CONFIG.mapEmbedUrl;

      // WiFi
      const wifiOn = s.wifi_enabled !== undefined ? s.wifi_enabled : RESTAURANT_CONFIG.wifiEnabled;
      setWifiToggle(wifiOn);
      document.getElementById("settingWifiName").value = s.wifi_name     || RESTAURANT_CONFIG.wifiName;
      document.getElementById("settingWifiPass").value = s.wifi_password || RESTAURANT_CONFIG.wifiPassword;

    } catch (err) {
      console.error("Settings load error:", err);
      document.getElementById("settingPhone").value    = RESTAURANT_CONFIG.phone;
      document.getElementById("settingAddress").value  = RESTAURANT_CONFIG.address;
      document.getElementById("settingOpenTime").value = RESTAURANT_CONFIG.openTime;
      document.getElementById("settingMapUrl").value   = RESTAURANT_CONFIG.mapEmbedUrl;
      setWifiToggle(RESTAURANT_CONFIG.wifiEnabled);
      document.getElementById("settingWifiName").value = RESTAURANT_CONFIG.wifiName;
      document.getElementById("settingWifiPass").value = RESTAURANT_CONFIG.wifiPassword;
    }
  }

  document.getElementById("saveSettingsBtn").addEventListener("click", async () => {
    const phone    = document.getElementById("settingPhone").value.trim();
    const address  = document.getElementById("settingAddress").value.trim();
    const openTime = document.getElementById("settingOpenTime").value.trim();
    const mapUrl   = document.getElementById("settingMapUrl").value.trim();

    const saveBtn = document.getElementById("saveSettingsBtn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";

    try {
      const { error } = await supabase
        .from("settings")
        .upsert(
          { id: 1, phone, address, open_time: openTime, map_embed_url: mapUrl },
          { onConflict: "id" }
        );

      if (error) throw error;

      showToast("Settings saved! ✓", "success");

    } catch (err) {
      console.error("Settings save error:", err);
      showToast(err.message || "Failed to save settings", "error");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "💾 Save Settings";
    }
  });

  /* ── WiFi Toggle ── */
  function setWifiToggle(enabled) {
    const track    = document.getElementById("wifiToggleTrack");
    const checkbox = document.getElementById("wifiEnabled");
    const fields   = document.getElementById("wifiFieldsWrap");
    if (!track) return;
    if (enabled) {
      track.classList.add("on");
      checkbox.checked = true;
      fields.style.display = "block";
    } else {
      track.classList.remove("on");
      checkbox.checked = false;
      fields.style.display = "none";
    }
  }

  document.getElementById("wifiToggleTrack").addEventListener("click", () => {
    const checkbox = document.getElementById("wifiEnabled");
    setWifiToggle(!checkbox.checked);
  });

  /* ── Show/hide WiFi password in admin ── */
  document.getElementById("toggleAdminWifiPass").addEventListener("click", () => {
    const input = document.getElementById("settingWifiPass");
    const btn   = document.getElementById("toggleAdminWifiPass");
    if (input.type === "password") {
      input.type = "text";
      btn.textContent = "🙈";
    } else {
      input.type = "password";
      btn.textContent = "👁";
    }
  });

  /* ── Save WiFi settings ── */
  document.getElementById("saveWifiBtn").addEventListener("click", async () => {
    const wifiEnabled  = document.getElementById("wifiEnabled").checked;
    const wifiName     = document.getElementById("settingWifiName").value.trim();
    const wifiPassword = document.getElementById("settingWifiPass").value.trim();

    const saveBtn = document.getElementById("saveWifiBtn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";

    try {
      const { error } = await supabase
        .from("settings")
        .upsert(
          { id: 1, wifi_enabled: wifiEnabled, wifi_name: wifiName, wifi_password: wifiPassword },
          { onConflict: "id" }
        );

      if (error) throw error;

      showToast(
        wifiEnabled
          ? `WiFi saved! Showing "${wifiName}" on site ✓`
          : "WiFi hidden from public site ✓",
        "success"
      );

    } catch (err) {
      console.error("WiFi save error:", err);
      showToast(err.message || "Failed to save WiFi settings", "error");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "📶 Save WiFi Settings";
    }
  });

  /* ══════════════════════════════════════════
     INIT
  ══════════════════════════════════════════ */
  checkSession();

})();
