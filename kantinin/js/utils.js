"use strict";
/** Utilitas umum: DOM, format, penyimpanan, notifikasi. */
(() => {
  KN.$ = (selector, parent = document) => parent.querySelector(selector);
  KN.$$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

  const rupiahFormat = new Intl.NumberFormat("id-ID", {style: "currency", currency: "IDR", maximumFractionDigits: 0});
  KN.rupiah = value => rupiahFormat.format(value);
  KN.dateTime = iso => new Date(iso).toLocaleString("id-ID", {dateStyle: "medium", timeStyle: "short"});

  /** Escape teks sebelum disisipkan ke HTML. */
  KN.esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"}[c]));

  KN.slug = text => String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  /** Hanya izinkan URL http(s) atau path relatif untuk gambar. */
  KN.safeUrl = url => {
    const value = String(url || "").trim();
    return /^(https?:\/\/|assets\/|\.\/)/i.test(value) || /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value) ? value : "";
  };

  /** localStorage dengan fallback memori (mis. mode privat) dan prefix versi. */
  const memory = {};
  KN.storage = {
    get(key, fallback = null) {
      const k = KN.CONFIG.STORAGE_PREFIX + key;
      try {
        const raw = localStorage.getItem(k);
        return raw !== null ? JSON.parse(raw) : (k in memory ? memory[k] : fallback);
      } catch { return k in memory ? memory[k] : fallback; }
    },
    set(key, value) {
      const k = KN.CONFIG.STORAGE_PREFIX + key;
      memory[k] = value;
      try { localStorage.setItem(k, JSON.stringify(value)); return true; }
      catch { return false; }   // penyimpanan penuh / diblokir: data hanya hidup di memori halaman ini
    },
    remove(key) {
      const k = KN.CONFIG.STORAGE_PREFIX + key;
      delete memory[k];
      try { localStorage.removeItem(k); } catch { /* abaikan */ }
    }
  };

  let toastTimer;
  KN.toast = message => {
    const el = KN.$("#toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
  };
})();