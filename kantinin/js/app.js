"use strict";
/** Router, kontrol akses, dan penanganan event (event delegation). */
(() => {
  const {$, $$, toast} = KN;
  const ROUTES = {
    public: ["beranda", "katalog", "login"],
    siswa: ["keranjang", "checkout", "pesanan", "sukses"],
    admin: ["admin", "admin-pesanan", "admin-menu"]
  };
  const TITLES = {beranda: "Beranda", katalog: "Menu", keranjang: "Keranjang", checkout: "Checkout", sukses: "Pesanan Berhasil", pesanan: "Pesanan Saya", login: "Login", admin: "Dashboard", "admin-pesanan": "Pesanan Masuk", "admin-menu": "Kelola Menu"};
  const state = {filters: {query: "", category: "Semua", price: "", sort: "recommended"}, editingId: null};

  /* ---------- Router ---------- */
  function resolveRoute(requested) {
    const user = KN.auth.current(), admin = user?.role === "admin";
    if (ROUTES.siswa.includes(requested)) {
      if (!user) { toast("Login dulu ya."); return "login"; }
      return admin ? "admin" : requested;
    }
    if (ROUTES.admin.includes(requested)) {
      if (!user) { toast("Login dulu ya."); return "login"; }
      return admin ? requested : "denied";
    }
    if (requested === "login" && user) return admin ? "admin" : "katalog";
    if (admin && ["beranda", "katalog"].includes(requested)) return "admin";
    return ROUTES.public.includes(requested) ? requested : "beranda";
  }

  function renderHeader(page) {
    const user = KN.auth.current(), admin = user?.role === "admin";
    const nav = admin
      ? [["admin", "Dashboard"], ["admin-pesanan", "Pesanan Masuk"], ["admin-menu", "Kelola Menu"]]
      : [["beranda", "Home"], ["katalog", "Menu"], ["pesanan", "Pesanan Saya"]];
    $("#mainNav").innerHTML = nav.map(([k, l]) => `<a href="#${k}" ${page === k ? 'class="active" aria-current="page"' : ""}>${l}</a>`).join("") + (user ? "" : `<a href="#login" ${page === "login" ? 'class="active" aria-current="page"' : ""}>Login</a>`);
    $("#headerActions").innerHTML =
      (user ? `<button class="user-chip" type="button" data-action="logout" title="Keluar"><span class="material-symbol">logout</span><span>${KN.esc(user.name.split(" ")[0])} · Keluar</span></button>`
            : `<a class="admin-link" href="#login"><span class="material-symbol">login</span><span>Login</span></a>`) +
      (admin ? "" : `<a class="cart-button" href="#keranjang" aria-label="Keranjang, ${KN.cart.count()} item"><span class="material-symbol">shopping_bag</span><span>Keranjang</span><b>${KN.cart.count()}</b></a>`);
    $("#mainNav").classList.remove("open");
    $('[data-action="toggle-nav"]').setAttribute("aria-expanded", "false");
  }

  function renderCatalogGrid() {
    const list = KN.products.search(state.filters);
    $("#catalogGrid").innerHTML = KN.views.productGrid(list);
    $("#resultCount").textContent = `${list.length} menu ditemukan`;
    $$(".filter-chip").forEach(b => { const on = b.dataset.value === state.filters.category; b.classList.toggle("active", on); b.setAttribute("aria-pressed", on); });
    KN.images.hydrate($("#catalogGrid"));
  }

  function render() {
    const requested = (location.hash.slice(1) || "beranda").split("?")[0];
    const page = resolveRoute(requested);
    const html = page === "katalog" ? KN.views.katalog(state.filters)
               : page === "admin-menu" ? KN.views["admin-menu"](state.editingId)
               : KN.views[page]();
    $("#app").innerHTML = html;
    document.title = `${TITLES[page] || "KANTININ"} — KANTININ`;
    renderHeader(page);
    if (page === "katalog") renderCatalogGrid();
    KN.images.hydrate($("#app"));
  }

  const go = page => { if (location.hash === "#" + page) render(); else location.hash = page; window.scrollTo({top: 0}); };

  /* ---------- Aksi (click / change) ---------- */
  const guardOrder = code => KN.orders.forUser(KN.auth.current().nis).some(o => o.code === code);
  const actions = {
    "toggle-nav"() { const nav = $("#mainNav"), open = nav.classList.toggle("open"); $('[data-action="toggle-nav"]').setAttribute("aria-expanded", open); },
    logout() { KN.auth.logout(); toast("Kamu sudah keluar."); go("beranda"); },
    "select-category"(el) { state.filters.category = el.dataset.value; go("katalog"); },
    "set-category"(el) { state.filters.category = el.dataset.value; renderCatalogGrid(); },
    "add-to-cart"(el) {
      const user = KN.auth.current();
      if (!user) { toast("Login dulu untuk memesan."); return go("login"); }
      if (user.role === "admin") return toast("Akun penjual tidak bisa memesan.");
      const p = KN.products.byId(+el.dataset.id);
      if (!p?.available) return toast("Menu sedang habis.");
      KN.cart.add(p.id); renderHeader(location.hash.slice(1) || "beranda"); toast(`${p.name} ditambahkan ke keranjang.`);
    },
    "cart-inc"(el) { KN.cart.change(+el.dataset.id, 1); render(); },
    "cart-dec"(el) { KN.cart.change(+el.dataset.id, -1); render(); },
    "cart-remove"(el) { KN.cart.remove(+el.dataset.id); render(); },
    "cancel-order"(el) {
      const code = el.dataset.code;
      if (!guardOrder(code)) return;
      const order = KN.orders.all().find(o => o.code === code);
      if (order?.status !== KN.CONFIG.STATUS[0]) return toast("Pesanan sudah diproses, tidak bisa dibatalkan.");
      KN.orders.setStatus(code, "Dibatalkan"); render(); toast("Pesanan dibatalkan.");
    },
    "pick-payment"(el) { const box = $("#qrisBox"); if (box) box.hidden = el.value !== "qris"; },
    "toggle-paid"(el) { if (!KN.auth.isAdmin()) return; KN.orders.setPaid(el.dataset.code, el.checked); render(); toast(el.checked ? "Ditandai lunas." : "Status bayar dibatalkan."); },
    "set-status"(el) { if (!KN.auth.isAdmin()) return; KN.orders.setStatus(el.dataset.code, el.value); render(); toast("Status pesanan diperbarui."); },
    "toggle-available"(el) { if (!KN.auth.isAdmin()) return; KN.products.setAvailable(+el.dataset.id, el.checked); render(); toast("Ketersediaan diubah."); },
    "edit-product"(el) { state.editingId = +el.dataset.id; render(); window.scrollTo({top: 0}); },
    "pick-photo"(el) {
      const file = el.files[0]; if (!file) return;
      if (!file.type.startsWith("image/")) return toast("File harus berupa gambar.");
      KN.images.fileToDataUrl(file).then(url => {
        $("#pImageData").value = url; $("#pImg").value = "";
        const pv = $("#photoPreview"); pv.src = url; pv.hidden = false; toast("Foto dipilih. Klik Simpan Menu.");
      }).catch(() => toast("Gambar tidak bisa dibaca."));
    },
    "clear-photo"() { $("#pImageData").value = ""; $("#pImg").value = ""; const pv = $("#photoPreview"); pv.removeAttribute("src"); pv.hidden = true; },
    "cancel-edit"() { state.editingId = null; render(); },
    "delete-product"(el) {
      if (!KN.auth.isAdmin() || !confirm("Hapus menu ini?")) return;
      KN.products.remove(+el.dataset.id); render(); toast("Menu dihapus.");
    }
  };

  document.addEventListener("click", e => {
    const el = e.target.closest("[data-action]");
    if (el && el.dataset.on !== "change") actions[el.dataset.action]?.(el);
  });
  document.addEventListener("change", e => {
    const el = e.target.closest("[data-action][data-on='change']");
    if (el) return actions[el.dataset.action]?.(el);
    const filter = e.target.closest("[data-filter]");
    if (filter && filter.tagName === "SELECT") { state.filters[filter.dataset.filter] = filter.value; renderCatalogGrid(); }
  });
  document.addEventListener("input", e => {
    if (e.target.matches('[data-filter="query"]')) { state.filters.query = e.target.value; renderCatalogGrid(); }
  });

  /* Gambar gagal dimuat: coba Wikipedia sekali; jika tetap gagal sembunyikan <img> (ilustrasi bawaan tampil). */
  document.addEventListener("error", e => {
    const t = e.target;
    if (t.tagName !== "IMG") return;
    if (t.hasAttribute("data-logo")) { t.hidden = true; t.nextElementSibling && (t.nextElementSibling.hidden = false); return; }
    if (t.hasAttribute("data-qris")) { t.hidden = true; t.nextElementSibling && (t.nextElementSibling.hidden = false); return; }
    if (!t.hasAttribute("data-fallback")) return;
    if (t.dataset.wiki !== undefined && !t.dataset.triedWiki) {
      t.dataset.triedWiki = "1"; t.removeAttribute("src"); KN.images.hydrate(t.parentElement);
    } else t.hidden = true;
  }, true);

  /* ---------- Form ---------- */
  const showErrors = (form, errors) => {
    $$("[data-error]", form).forEach(p => { p.textContent = errors[p.dataset.error] || ""; });
    return Object.keys(errors).length === 0;
  };
  const forms = {
    async loginForm(form) {
      const nis = form.nis.value.trim(), password = form.password.value;
      if (!nis || !password) return showErrors(form, {form: "NIS dan password wajib diisi."});
      const result = await KN.auth.login(nis, password);
      if (!result.ok) return showErrors(form, {form: result.error});
      toast(`Halo, ${result.user.name.split(" ")[0]}!`);
      go(result.user.role === "admin" ? "admin" : "katalog");
    },
    checkoutForm(form) {
      const name = form.name.value.trim(), kelas = form.kelas.value.trim(), errors = {};
      if (name.length < 2) errors.name = "Nama minimal 2 karakter.";
      if (!/^[A-Za-z0-9 .\-]{1,15}$/.test(kelas)) errors.kelas = "Isi kelas dengan benar, misal 8A.";
      if (!showErrors(form, errors)) return;
      if (KN.cart.rows().some(r => !r.available)) return toast("Ada menu yang habis. Hapus dari keranjang dulu.");
      const payment = form.payment.value;
      if (!KN.CONFIG.PAYMENT_METHODS.some(m => m.id === payment)) return toast("Pilih metode pembayaran.");
      KN.orders.create({name, kelas, pickup: form.pickup.value, note: form.note.value.trim(), payment});
      go("sukses");
    },
    async productForm(form) {
      if (!KN.auth.isAdmin()) return;
      const name = form.name.value.trim(), price = Number(form.price.value), url = form.image.value.trim(), errors = {};
      const image = form.imageData.value || url, btn = $("button[type=submit]", form);
      if (name.length < 2) errors.form = "Nama menu minimal 2 karakter.";
      else if (!(price >= 500)) errors.form = "Harga minimal Rp500.";
      else if (image && !KN.safeUrl(image)) errors.form = "Alamat foto harus diawali http(s):// atau assets/. Alamat file komputer (C:\\…) tidak bisa dipakai, gunakan tombol Pilih dari perangkat.";
      if (!showErrors(form, errors)) return;
      if (image && !image.startsWith("data:")) {
        btn.disabled = true; btn.textContent = "Memeriksa foto…";
        const ok = await KN.images.canLoad(image);
        btn.disabled = false; btn.textContent = "Simpan Menu";
        if (!ok) return void showErrors(form, {form: "Alamat itu tidak bisa dimuat sebagai gambar. Pastikan alamat langsung ke file gambar (bukan halaman web), atau pakai Pilih dari perangkat."});
      }
      const saved = KN.products.upsert({name, category: form.category.value, price, image, description: form.description.value.trim() || "Menu kantin."}, state.editingId);
      if (!saved) return void showErrors(form, {form: "Penyimpanan browser penuh atau diblokir, perubahan tidak tersimpan. Gunakan foto lebih kecil atau hapus data situs lama."});
      state.editingId = null; render(); toast("Menu disimpan.");
    }
  };
  document.addEventListener("submit", e => {
    const handler = forms[e.target.id];
    if (handler) { e.preventDefault(); handler(e.target); }
  });

  /* ---------- Bootstrap ---------- */
  window.addEventListener("hashchange", () => { state.editingId = null; render(); });
  window.addEventListener("storage", render);
  render();
})();