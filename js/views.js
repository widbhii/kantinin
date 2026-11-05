"use strict";
/** Template halaman. Semua fungsi murni: menerima data, mengembalikan string HTML. */
(() => {
  const {esc, rupiah, dateTime, safeUrl} = KN;
  const {STATUS, CATEGORIES, PRICE_RANGES, PICKUP_OPTIONS, PAYMENT_METHODS} = KN.CONFIG;
  const statusClass = s => ({"Sedang Diproses": "processing", "Siap Diambil": "ready", "Selesai": "done", "Dibatalkan": "rejected"}[s] || "");

  /* ---------- Komponen ---------- */
  /* Ilustrasi bawaan (tampil jika foto belum/tidak bisa dimuat). */
  const ART = {
    rice: '<path d="M24 60h72c0 22-14 36-36 36S24 82 24 60z" fill="#c9783a"/><path d="M30 60c0-20 13-32 30-32s30 12 30 32z" fill="#fff8ea"/><circle cx="48" cy="46" r="4" fill="#f4a261"/><circle cx="66" cy="40" r="3" fill="#f4a261"/><circle cx="74" cy="50" r="4" fill="#e76f51"/>',
    noodle: '<path d="M24 62h72c0 22-14 36-36 36S24 84 24 62z" fill="#c9783a"/><path d="M30 62c4-16 10-22 18-22s8 8 14 8 8-8 16-8 14 6 12 22z" fill="#f6d28b"/><path d="M36 58c8-6 12 4 20-2s12 4 22-2" stroke="#e0a64a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M82 24L64 58M90 28L70 60" stroke="#8e4e14" stroke-width="3" stroke-linecap="round"/>',
    soup: '<path d="M22 58h76c0 24-15 38-38 38S22 82 22 58z" fill="#c9783a"/><ellipse cx="60" cy="58" rx="38" ry="9" fill="#f2b45f"/><circle cx="50" cy="57" r="6" fill="#f7e3c6"/><circle cx="68" cy="58" r="5" fill="#f7e3c6"/><path d="M46 44c-5-8 5-10 0-18M62 44c-5-8 5-10 0-18M78 44c-5-8 5-10 0-18" stroke="#c9783a" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>',
    snack: '<path d="M40 52l4-26M52 52l1-30M64 52l-1-28M76 52l-5-24" stroke="#f2c14e" stroke-width="7" stroke-linecap="round"/><path d="M34 52h52l-6 44H40z" fill="#e76f51"/><rect x="34" y="48" width="52" height="8" rx="3" fill="#d9573b"/>',
    bread: '<path d="M32 44c-8-4-8-22 6-24 8-1 12 4 22 4s14-5 22-4c14 2 14 20 6 24v38c0 6-4 10-10 10H42c-6 0-10-4-10-10z" fill="#e8b676"/><path d="M40 48h40v32c0 4-2 6-6 6H46c-4 0-6-2-6-6z" fill="#f8e2b8"/>',
    drink: '<path d="M38 36h44l-5 56c0 4-3 6-7 6H50c-4 0-7-2-7-6z" fill="#fff" fill-opacity=".85" stroke="#c9783a" stroke-width="3"/><path d="M41 58h38l-3 34c0 3-2 4-5 4H49c-3 0-5-1-5-4z" fill="#e8a05a"/><path d="M66 36l10-20h8" stroke="#e76f51" stroke-width="4" fill="none" stroke-linecap="round"/>'
  };
  const artFor = p => {
    const n = p.name.toLowerCase();
    if (p.category === "Minuman") return "drink";
    if (/soto|bakso|sup/.test(n)) return "soup";
    if (/mie|spaghetti|pasta/.test(n)) return "noodle";
    if (/roti|sandwich|donat|toast/.test(n)) return "bread";
    if (p.category === "Camilan") return "snack";
    return "rice";
  };
  const artSvg = p => `<svg viewBox="0 0 120 120" aria-hidden="true">${ART[artFor(p)]}</svg>`;

  const heading = (title, desc, linkText = "", href = "#katalog") =>
    `<div class="section-heading"><div><h2>${title}</h2><p>${desc}</p></div>${linkText ? `<a class="text-link" href="${href}">${linkText} →</a>` : ""}</div>`;
  const pageIntro = (eyebrow, title, desc = "") =>
    `<div class="page-intro">${eyebrow ? `<span class="eyebrow">${eyebrow}</span>` : ""}<h1>${title}</h1>${desc ? `<p>${desc}</p>` : ""}</div>`;
  const emptyState = (icon, title, text, action = "") =>
    `<div class="content-card empty-state"><div class="empty-icon">${icon}</div><h2>${title}</h2><p>${text}</p>${action}</div>`;
  const options = (list, selected) => list.map(([v, l]) => `<option value="${esc(v)}" ${v === selected ? "selected" : ""}>${esc(l)}</option>`).join("");

  function productCard(p) {
    const sold = !p.available;
    return `<article class="product-card ${sold ? "sold" : ""}">
      <div class="product-image"><span class="img-placeholder" aria-hidden="true">${artSvg(p)}</span>
        ${KN.images.attrs(p)}
        ${sold ? `<span class="product-badge sold">Habis</span>` : p.badge ? `<span class="product-badge">${esc(p.badge)}</span>` : ""}</div>
      <div class="product-info"><span class="product-category">${esc(p.category.toUpperCase())}</span><h3>${esc(p.name)}</h3>
        <p class="product-description">${esc(p.description)}</p>
        <div class="product-bottom"><span class="product-price">${rupiah(p.price)}</span>
          <button class="add-button" type="button" data-action="add-to-cart" data-id="${p.id}" ${sold ? "disabled" : ""} aria-label="Tambah ${esc(p.name)} ke keranjang"><span class="material-symbol">add</span></button></div></div></article>`;
  }
  const productGrid = list => list.length
    ? list.map(productCard).join("")
    : `<div style="grid-column:1/-1">${emptyState("🔎", "Menu tidak ditemukan", "Coba ubah kata kunci, kategori, atau rentang harga.")}</div>`;

  const orderLines = o => o.items.map(i => `<div class="summary-row"><span>${esc(i.name)} × ${i.quantity}</span><strong>${rupiah(i.price * i.quantity)}</strong></div>`).join("");
  const timeline = status => {
    if (status === "Dibatalkan") return "";
    const idx = STATUS.indexOf(status);
    return `<div class="timeline">${STATUS.slice(0, 4).map((s, i) => `<div class="timeline-step ${i <= idx ? "active" : ""}">${s}</div>`).join("")}</div>`;
  };
  const statusSelect = o => `<select data-action="set-status" data-on="change" data-code="${esc(o.code)}" aria-label="Ubah status ${esc(o.code)}">${STATUS.map(s => `<option ${o.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>`;

  const qrisPanel = total => `<div class="qris-panel"><div class="qris-img"><img src="assets/qris.png" alt="Kode QRIS KANTININ" data-qris><p class="qris-missing" hidden>QRIS belum dipasang.<br>Simpan gambar QRIS kantin di <b>assets/qris.png</b>.</p></div>
    <div><h4>Bayar dengan QRIS</h4><ol><li>Buka aplikasi bank atau e-wallet, pilih Scan / QRIS.</li><li>Scan kode ini, lalu masukkan nominal <b>${rupiah(total)}</b>.</li><li>Tunjukkan bukti pembayaran ke penjual saat mengambil pesanan.</li></ol></div></div>`;
  const payLabel = o => `${esc(o.payment)} · ${o.paid ? "Lunas" : o.payment === "QRIS" ? "Menunggu verifikasi penjual" : "Bayar di kantin"}`;

  /* ---------- Halaman siswa ---------- */
  const views = KN.views = {};

  views.beranda = () => {
    const popular = KN.products.all().filter(p => p.popular && p.available).slice(0, 8);
    const cats = [["rice_bowl", "Makanan"], ["local_cafe", "Minuman"], ["bakery_dining", "Camilan"], ["restaurant_menu", "Semua"]];
    return `<div class="container">
      <section class="hero"><div class="hero-copy"><span class="eyebrow">Teman istirahatmu setiap hari</span>
        <h1>Lapar? <span>Pesan Aja, Nggak Perlu Antre!</span></h1>
        <p>KANTININ membantu kamu melihat menu kantin, memesan dari kelas, dan memantau status pesanan sampai siap diambil.</p>
        <div class="hero-actions"><a class="button" href="#katalog">Lihat Menu <span class="material-symbol">arrow_forward</span></a><a class="button outline" href="#pesanan">Pesanan Saya</a></div></div>
        <div class="hero-visual"><div class="hero-food"><img alt="" data-alt="Hidangan kantin" data-wiki="Nasi_goreng|Indonesian_cuisine" data-fallback></div>
          <div class="floating-note note-top"><span class="material-symbol">star</span> Menu favorit siswa</div>
          <div class="floating-note note-bottom"><span class="material-symbol">schedule</span> Pesan sebelum istirahat</div></div></section>
      <section class="section">${heading("Kategori", "Cari menu sesuai yang sedang kamu inginkan.")}
        <div class="category-row">${cats.map(([e, n]) => `<button class="category-card" type="button" data-action="select-category" data-value="${n}"><span class="category-icon"><span class="material-symbol">${e}</span></span><strong>${n === "Semua" ? "Semua Menu" : n}</strong></button>`).join("")}</div></section>
      <section class="section">${heading("Menu Populer", "Menu yang banyak dipilih teman-teman di sekolah.", "Lihat semua menu")}
        <div class="product-grid">${popular.map(productCard).join("")}</div></section>
      <section class="section">${heading("Jam Operasional Kantin", "Pesananmu diproses selama kantin buka.")}
        <div class="hours-card"><div><span>Senin – Jumat</span><strong>06.30 – 15.00</strong></div><div><span>Istirahat pertama</span><strong>09.30 – 10.00</strong></div><div><span>Istirahat kedua</span><strong>12.00 – 12.45</strong></div></div></section></div>`;
  };

  views.katalog = f => `<div class="container">
    ${pageIntro("PILIHAN MENU KANTIN", "Menu Makanan & Minuman", "Cari menu, filter kategori dan harga, lalu tambahkan ke keranjang.")}
    <div class="catalog-toolbar">
      <label class="search-box"><span class="material-symbol">search</span><input id="menuSearch" type="search" data-filter="query" placeholder="Cari nama menu…" value="${esc(f.query)}" aria-label="Cari menu"></label>
      <select class="select-control" data-filter="price" aria-label="Filter harga">${options(PRICE_RANGES.map(r => [r.value, r.label]), f.price)}</select>
      <select class="select-control" data-filter="sort" aria-label="Urutkan">${options([["recommended", "Rekomendasi"], ["low", "Harga terendah"], ["high", "Harga tertinggi"], ["name", "Nama A–Z"]], f.sort)}</select>
    </div>
    <div class="filter-list" role="group" aria-label="Kategori">${["Semua", ...CATEGORIES].map(c => `<button class="filter-chip ${f.category === c ? "active" : ""}" type="button" data-action="set-category" data-value="${c}" aria-pressed="${f.category === c}">${c}</button>`).join("")}</div>
    <p class="result-count" id="resultCount"></p>
    <div id="catalogGrid" class="product-grid"></div></div>`;
  views.productGrid = productGrid;

  views.keranjang = () => {
    const rows = KN.cart.rows();
    if (!rows.length) return `<div class="container">${pageIntro("", "Keranjang")}${emptyState("🛍️", "Keranjangmu masih kosong", "Yuk, pilih makanan atau minuman favoritmu.", `<a class="button" href="#katalog">Lihat Menu</a>`)}</div>`;
    const blocked = rows.some(r => !r.available);
    return `<div class="container">${pageIntro("", "Keranjang", "Periksa kembali menu yang ingin kamu pesan.")}<div class="split-layout">
      <section class="content-card"><h3>Daftar Pesanan (${KN.cart.count()} item)</h3>${rows.map(r => `<div class="cart-item">
        ${KN.images.attrs(r)}
        <div><h3>${esc(r.name)}</h3><p>${rupiah(r.price)} / item${r.available ? "" : ` · <b style="color:#b44636">Habis — hapus dari keranjang</b>`}</p>
          <div class="quantity-control"><button type="button" data-action="cart-dec" data-id="${r.id}" aria-label="Kurangi ${esc(r.name)}">−</button><span>${r.quantity}</span><button type="button" data-action="cart-inc" data-id="${r.id}" aria-label="Tambah ${esc(r.name)}">+</button></div>
          <button class="remove-button" type="button" data-action="cart-remove" data-id="${r.id}">Hapus</button></div>
        <strong>${rupiah(r.price * r.quantity)}</strong></div>`).join("")}</section>
      <aside class="content-card"><h3>Ringkasan</h3><div class="summary-row"><span>Subtotal</span><strong>${rupiah(KN.cart.total())}</strong></div>
        <div class="summary-row summary-total"><span>Total pembayaran</span><strong>${rupiah(KN.cart.total())}</strong></div>
        <a class="button full-button" href="#checkout" ${blocked ? 'aria-disabled="true" style="opacity:.5;pointer-events:none"' : ""}>Lanjut ke Checkout <span class="material-symbol">arrow_forward</span></a></aside></div></div>`;
  };

  views.checkout = () => {
    const rows = KN.cart.rows(), user = KN.auth.current();
    if (!rows.length) return `<div class="container">${pageIntro("", "Checkout")}${emptyState("🛍️", "Belum ada menu untuk checkout", "Tambahkan menu ke keranjang terlebih dahulu.", `<a class="button" href="#katalog">Pilih Menu</a>`)}</div>`;
    return `<div class="container">${pageIntro("", "Checkout Pesanan", "Lengkapi data berikut untuk membuat pesanan.")}<div class="split-layout">
      <form class="content-card" id="checkoutForm" novalidate><h3>Informasi Pemesan</h3><div class="form-grid">
        <div class="form-field"><label for="cName">Nama pemesan</label><input id="cName" name="name" value="${esc(user.name)}" autocomplete="name"><p class="field-error" data-error="name"></p></div>
        <div class="form-field"><label for="cClass">Kelas</label><input id="cClass" name="kelas" value="${esc(user.kelas)}" placeholder="Contoh: 8A"><p class="field-error" data-error="kelas"></p></div>
        <div class="form-field"><label for="cPickup">Waktu pengambilan</label><select id="cPickup" name="pickup">${PICKUP_OPTIONS.map(o => `<option>${o}</option>`).join("")}</select></div>
        <div class="form-field"><label for="cPickupInfo">Pengambilan</label><input id="cPickupInfo" value="Di kantin sekolah" readonly></div>
        <fieldset class="form-field full pay-group"><legend>Metode pembayaran</legend><div class="pay-options">${PAYMENT_METHODS.map((m, i) => `<label class="pay-option"><input type="radio" name="payment" value="${m.id}" data-action="pick-payment" data-on="change" ${i === 0 ? "checked" : ""}><span class="pay-card"><span class="material-symbol">${m.icon}</span><strong>${m.label}</strong><small>${m.desc}</small></span></label>`).join("")}</div></fieldset>
        <div class="form-field full" id="qrisBox" hidden>${qrisPanel(KN.cart.total())}</div>
        <div class="form-field full"><label for="cNote">Catatan untuk penjual (opsional)</label><textarea id="cNote" name="note" maxlength="150" placeholder="Contoh: tidak pakai saus"></textarea></div></div>
        <button class="button full-button" type="submit">Konfirmasi Pesanan — ${rupiah(KN.cart.total())}</button></form>
      <aside class="content-card"><h3>Ringkasan Pesanan</h3>${rows.map(r => `<div class="summary-row"><span>${esc(r.name)} × ${r.quantity}</span><strong>${rupiah(r.price * r.quantity)}</strong></div>`).join("")}
        <div class="summary-row summary-total"><span>Total pembayaran</span><strong>${rupiah(KN.cart.total())}</strong></div></aside></div></div>`;
  };

  views.sukses = () => {
    const code = KN.storage.get("lastOrder", "-"), o = KN.orders.all().find(x => x.code === code);
    const qris = o?.payment === "QRIS";
    return `<div class="container"><div class="content-card empty-state" style="margin-top:40px"><div class="empty-icon">✅</div><h2>Pesanan berhasil dibuat</h2><p>Nomor pesananmu</p>
    <div class="success-no">${esc(code)}</div>
    ${qris ? `<div style="text-align:left;max-width:520px;margin:0 auto 18px">${qrisPanel(o.total)}</div><p>Pesanan diproses setelah penjual memverifikasi pembayaranmu.</p>` : `<p>Bayar tunai di kantin saat mengambil pesanan.</p>`}
    <a class="button" href="#pesanan">Lihat Pesanan Saya</a></div></div>`;
  };

  views.pesanan = () => {
    const list = KN.orders.forUser(KN.auth.current().nis);
    return `<div class="container">${pageIntro("RIWAYAT PESANAN", "Pesanan Saya", "Status berubah saat penjual memperbaruinya di browser yang sama. Belum ada sinkronisasi real-time antar perangkat.")}
      ${list.length ? list.map(o => `<article class="content-card order-card"><div class="order-top"><div><div class="order-code">${esc(o.code)}</div><div class="order-date">${dateTime(o.createdAt)}</div></div><span class="status ${statusClass(o.status)}">${o.status}</span></div>
        ${timeline(o.status)}
        <details class="order-detail"><summary>Lihat detail</summary>${orderLines(o)}<div class="summary-row"><span>Pengambilan</span><strong>${esc(o.pickup)}</strong></div><div class="summary-row"><span>Pembayaran</span><strong>${payLabel(o)}</strong></div>${o.note ? `<div class="summary-row"><span>Catatan</span><strong>${esc(o.note)}</strong></div>` : ""}</details>
        <div class="order-bottom" style="margin-top:14px"><span class="order-total">${rupiah(o.total)}</span>${o.status === STATUS[0] ? `<button class="button danger small" type="button" data-action="cancel-order" data-code="${esc(o.code)}">Batalkan</button>` : ""}</div></article>`).join("")
        : emptyState("🧾", "Belum ada pesanan", "Pesanan yang kamu buat akan tampil di sini.", `<a class="button" href="#katalog">Mulai Pesan</a>`)}</div>`;
  };

  views.login = () => `<div class="container auth-wrap"><div class="content-card"><span class="eyebrow">MASUK KE KANTININ</span>
    <h1 style="margin:8px 0 6px;font-size:26px">Login</h1><p style="color:var(--muted);font-size:11px;margin:0 0 14px">Gunakan NIS dan password dari sekolah.</p>
    <form id="loginForm" novalidate><div class="form-field"><label for="lNis">NIS</label><input id="lNis" name="nis" inputmode="numeric" autocomplete="username" placeholder="Nomor Induk Siswa"></div>
      <div class="form-field"><label for="lPass">Password</label><input id="lPass" name="password" type="password" autocomplete="current-password"></div>
      <p class="field-error" data-error="form" role="alert"></p><button class="button full-button" type="submit">Masuk</button></form>
    <div class="demo-box"><b>Akun demo</b> (data contoh di js/data.js):<br>Siswa: NIS 2024001 / siswa123<br>Penjual: NIS admin01 / kantin123</div></div></div>`;

  /* ---------- Admin ---------- */
  function adminShell(active, title, desc, body) {
    const links = [["admin", "dashboard", "Dashboard"], ["admin-pesanan", "receipt_long", "Pesanan Masuk"], ["admin-menu", "restaurant_menu", "Kelola Menu"]];
    return `<div class="admin-shell"><aside class="admin-sidebar" aria-label="Menu penjual"><h3>MENU PENJUAL</h3>${links.map(([k, i, t]) => `<a href="#${k}" ${active === k ? 'class="active" aria-current="page"' : ""}><span class="material-symbol">${i}</span><span>${t}</span></a>`).join("")}</aside>
      <section class="admin-main"><div class="admin-heading"><div><h1>${title}</h1><p>${desc}</p></div><span class="admin-date">${new Date().toLocaleDateString("id-ID", {dateStyle: "full"})}</span></div>${body}</section></div>`;
  }
  const ordersTable = list => `<div class="content-card admin-table-wrap"><table class="admin-table"><thead><tr><th>KODE</th><th>PEMESAN</th><th>PESANAN</th><th>TOTAL</th><th>BAYAR</th><th>STATUS</th><th>UBAH STATUS</th></tr></thead><tbody>
    ${list.length ? list.map(o => `<tr><td><strong>${esc(o.code)}</strong><br><small>${dateTime(o.createdAt)}</small></td><td>${esc(o.name)}<br><small>${esc(o.kelas)} · NIS ${esc(o.nis)}</small></td>
      <td style="white-space:normal;min-width:210px">${o.items.map(i => `${esc(i.name)} ×${i.quantity}`).join(", ")}${o.note ? `<br><small>Catatan: ${esc(o.note)}</small>` : ""}<br><small>Ambil: ${esc(o.pickup)}</small></td>
      <td>${rupiah(o.total)}</td><td><label><input type="checkbox" data-action="toggle-paid" data-on="change" data-code="${esc(o.code)}" ${o.paid ? "checked" : ""}> ${esc(o.payment)}<br><small>${o.paid ? "Lunas" : "Belum lunas"}</small></label></td><td><span class="status ${statusClass(o.status)}">${o.status}</span></td><td>${statusSelect(o)}</td></tr>`).join("") : `<tr><td colspan="7" style="text-align:center;padding:28px;color:#867468">Belum ada pesanan masuk.</td></tr>`}</tbody></table></div>`;

  views.admin = () => {
    const s = KN.orders.stats();
    return adminShell("admin", "Dashboard Kantin", "Ringkasan pesanan kantin.", `<div class="stats-grid">
      <article class="stat-card"><span>Total Pesanan</span><strong>${s.total}</strong><small>Semua pesanan</small></article>
      <article class="stat-card"><span>Menunggu Konfirmasi</span><strong>${s.waiting}</strong><small>Perlu diperiksa</small></article>
      <article class="stat-card"><span>Sedang Diproses</span><strong>${s.processing}</strong><small>Pesanan aktif</small></article>
      <article class="stat-card"><span>Total Penjualan</span><strong style="font-size:17px">${rupiah(s.sales)}</strong><small>Tanpa pesanan dibatalkan</small></article></div>
      <div class="admin-section-title"><h2>Pesanan Terbaru</h2><a class="text-link" href="#admin-pesanan">Lihat semua →</a></div>${ordersTable(KN.orders.all().slice(0, 6))}
      <p class="demo-note">Prototype: data tersimpan di browser ini dan belum tersambung ke server.</p>`);
  };
  views["admin-pesanan"] = () => adminShell("admin-pesanan", "Pesanan Masuk", "Lihat detail dan ubah status pesanan.", ordersTable(KN.orders.all()));

  views["admin-menu"] = editingId => {
    const list = KN.products.all();
    const e = list.find(p => p.id === editingId) || {name: "", category: CATEGORIES[0], price: "", description: "", image: ""};
    const isData = /^data:image\//.test(e.image || "");
    return adminShell("admin-menu", "Kelola Menu", "Tambah, ubah, hapus menu, dan atur ketersediaan.", `
      <p class="demo-note" style="margin:0 0 12px">Menu tersimpan di browser ini (<b>${esc(location.origin)}</b>). Perubahan hanya terlihat di browser dan alamat yang sama.</p>
      <form class="content-card" id="productForm" novalidate><h3>${editingId ? "Edit Menu" : "Tambah Menu"}</h3><div class="form-grid">
        <div class="form-field"><label for="pName">Nama menu</label><input id="pName" name="name" value="${esc(e.name)}"></div>
        <div class="form-field"><label for="pCat">Kategori</label><select id="pCat" name="category">${CATEGORIES.map(c => `<option ${e.category === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>
        <div class="form-field"><label for="pPrice">Harga (Rp)</label><input id="pPrice" name="price" type="number" min="500" step="500" value="${esc(e.price)}"></div>
        <div class="form-field full"><label>Foto menu</label>
          <div class="photo-edit"><div class="photo-preview"><img id="photoPreview" alt="Pratinjau foto" ${isData || KN.safeUrl(e.image) ? `src="${esc(KN.safeUrl(e.image))}"` : "hidden"}></div>
            <div class="photo-controls"><label class="button outline small" for="pFile"><span class="material-symbol">upload</span> Pilih dari perangkat</label>
              <input id="pFile" type="file" accept="image/*" data-action="pick-photo" data-on="change" hidden>
              <button class="button outline small" type="button" data-action="clear-photo">Hapus foto</button>
              <input id="pImg" name="image" value="${isData ? "" : esc(e.image)}" placeholder="atau tempel alamat gambar (https://…/foto.jpg)">
              <input type="hidden" id="pImageData" name="imageData" value="${isData ? esc(e.image) : ""}">
              <p class="field-hint">Pakai alamat langsung ke file gambar (berakhiran .jpg/.png), bukan alamat halaman web. Kosongkan untuk foto bawaan.</p></div></div></div>
        <div class="form-field full"><label for="pDesc">Deskripsi singkat</label><input id="pDesc" name="description" maxlength="90" value="${esc(e.description)}"></div></div>
        <p class="field-error" data-error="form" role="alert"></p>
        <button class="button" type="submit">Simpan Menu</button> ${editingId ? `<button class="button outline" type="button" data-action="cancel-edit">Batal</button>` : ""}</form>
      <div class="admin-section-title"><h2>Daftar Menu (${list.length})</h2></div>
      <div class="content-card admin-table-wrap"><table class="admin-table"><thead><tr><th>MENU</th><th>KATEGORI</th><th>HARGA</th><th>TERSEDIA</th><th></th></tr></thead><tbody>
      ${list.map(p => `<tr><td><div class="admin-product">${KN.images.attrs(p)}<strong>${esc(p.name)}</strong></div></td><td>${esc(p.category)}</td><td>${rupiah(p.price)}</td>
        <td><label><input type="checkbox" data-action="toggle-available" data-on="change" data-id="${p.id}" ${p.available ? "checked" : ""}> <span class="${p.available ? "stock-good" : "stock-low"}">${p.available ? "Tersedia" : "Habis"}</span></label></td>
        <td><div class="row-actions"><button class="button outline small" type="button" data-action="edit-product" data-id="${p.id}">Edit</button><button class="button danger small" type="button" data-action="delete-product" data-id="${p.id}">Hapus</button></div></td></tr>`).join("")}</tbody></table></div>`);
  };

  views.denied = () => `<div class="container">${emptyState("🔒", "Khusus penjual", "Akun siswa tidak dapat membuka dashboard penjual.", `<a class="button" href="#katalog">Kembali ke Menu</a>`)}</div>`;
})();