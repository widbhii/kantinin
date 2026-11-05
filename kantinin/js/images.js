"use strict";
/**
 * Foto menu. Urutan sumber untuk setiap menu:
 *   1. `image` milik menu (URL atau path lokal, mis. "assets/menu/nasi-goreng.jpg")
 *   2. Foto lokal assets/menu/<slug>.jpg  (hanya jika CONFIG.LOCAL_PHOTOS = true)
 *   3. `photo`: pencarian spesifik di Wikimedia Commons (disaring berdasarkan judul file, tidak boleh sama dengan menu lain)
 *   4. Wikipedia: judul artikel di `wiki`, lalu pencarian berdasarkan nama menu
 *   5. Ilustrasi bawaan (selalu tampil, tidak perlu internet)
 * Judul artikel diambil sekaligus dalam 1-2 permintaan (Action API + origin=*), hasilnya di-cache.
 */
(() => {
  const API = "https://en.wikipedia.org/w/api.php";
  const COMMONS = "https://commons.wikimedia.org/w/api.php";
  const CACHE_KEY = "imgcache";
  const readCache = () => KN.storage.get(CACHE_KEY, {});
  let warned = false;

  async function getJSON(params, base = API) {
    const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 9000);
    try {
      const res = await fetch(`${base}?${new URLSearchParams({format: "json", origin: "*", ...params})}`, {signal: ctrl.signal});
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } finally { clearTimeout(timer); }
  }
  function warnOnce(err) {
    console.warn("[KANTININ] Foto dari Wikipedia tidak bisa dimuat:", err);
    if (!warned) { warned = true; KN.toast("Foto menu belum bisa dimuat. Cek koneksi internet."); }
  }

  /** Ambil thumbnail untuk banyak judul sekaligus. Mengembalikan {judul: url|""}; judul tanpa foto = "". */
  async function resolveTitles(titles) {
    const out = {};
    for (let i = 0; i < titles.length; i += 40) {
      const chunk = titles.slice(i, i + 40);
      const json = await getJSON({action: "query", redirects: "1", prop: "pageimages", piprop: "thumbnail", pithumbsize: "500",
        titles: chunk.map(t => t.replace(/_/g, " ")).join("|")});
      const q = json.query || {}, norm = {}, redir = {}, byTitle = {};
      (q.normalized || []).forEach(n => { norm[n.from] = n.to; });
      (q.redirects || []).forEach(r => { redir[r.from] = r.to; });
      Object.values(q.pages || {}).forEach(p => { if (p.thumbnail) byTitle[p.title] = p.thumbnail.source; });
      chunk.forEach(t => { let n = t.replace(/_/g, " "); n = norm[n] || n; n = redir[n] || n; out[t] = byTitle[n] || ""; });
    }
    return out;
  }
  async function searchPhoto(query) {
    const json = await getJSON({action: "query", generator: "search", gsrlimit: "5", prop: "pageimages", piprop: "thumbnail", pithumbsize: "500", gsrsearch: query + " food"});
    const pages = Object.values(json.query?.pages || {}).sort((a, b) => a.index - b.index);
    return pages.find(p => p.thumbnail)?.thumbnail.source || "";
  }

  /** Normalisasi spec `photo`: string -> {q, need: kata-kata dalam q}. */
  const specOf = raw => {
    if (!raw) return null;
    const s = typeof raw === "string" ? {q: raw, need: raw.split(/\s+/)} : raw;
    return {q: s.q, need: s.need || s.q.split(/\s+/), not: s.not || []};
  };
  const specKey = spec => "c:" + spec.q.toLowerCase();
  const titleOk = (title, spec) => {
    const t = title.replace(/^File:/i, "").toLowerCase().replace(/[_\-.()]/g, " ");
    return spec.need.every(re => new RegExp(re, "i").test(t)) && !spec.not.some(re => new RegExp(re, "i").test(t));
  };
  /** Cari foto di Commons; ambil yang judulnya cocok dan belum dipakai menu lain. */
  async function searchCommons(spec, claimed) {
    const json = await getJSON({action: "query", generator: "search", gsrnamespace: "6", gsrlimit: "20", prop: "imageinfo",
      iiprop: "url|mime|size", iiurlwidth: "500", gsrsearch: `${spec.q} filetype:bitmap`}, COMMONS);
    const pages = Object.values(json.query?.pages || {}).sort((a, b) => a.index - b.index);
    for (const p of pages) {
      const info = p.imageinfo?.[0];
      if (!info?.thumburl || !/^image\/(jpeg|png)$/.test(info.mime) || info.width < 500) continue;
      if (titleOk(p.title, spec) && !claimed.has(info.thumburl)) return info.thumburl;
    }
    return "";
  }

  const titlesOf = el => (el.dataset.wiki || "").split("|").filter(Boolean);
  const cachedUrl = (titles, cache) => { for (const t of titles) if (cache[t]) return cache[t]; return ""; };

  /** Tag <img> siap pakai untuk satu menu. */
  function attrs(p, cls = "") {
    const c = cls ? ` class="${cls}"` : "", alt = KN.esc(p.name);
    const spec = specOf(p.photo);
    const photoAttr = spec ? ` data-photo="${KN.esc(JSON.stringify(spec))}"` : "";
    const meta = `${photoAttr} data-wiki="${KN.esc(p.wiki || "")}" data-query="${spec ? "" : KN.esc(p.name)}" data-alt="${alt}" data-fallback`;
    const mine = KN.safeUrl(p.image);
    // Foto yang diatur penjual dipakai apa adanya. Jika gagal dimuat -> ilustrasi, TIDAK diganti foto lain diam-diam.
    if (mine) return `<img${c} src="${KN.esc(mine)}" alt="${alt}" loading="lazy" data-fallback data-own>`;
    const local = KN.CONFIG.LOCAL_PHOTOS ? `assets/menu/${KN.slug(p.name)}.jpg` : "";
    if (local) return `<img${c} src="${KN.esc(local)}" alt="${alt}" loading="lazy" ${meta}>`;
    const cache = readCache();
    const hit = (spec && cache[specKey(spec)]) || (!spec && cachedUrl((p.wiki || "").split("|").filter(Boolean), cache)) || (!spec && cache["q:" + p.name.toLowerCase()]);
    if (hit) return `<img${c} src="${KN.esc(hit)}" alt="${alt}" loading="lazy" data-tried-wiki="1" ${meta}>`;
    return `<img${c} alt="" ${meta}>`;
  }

  /** Isi semua <img> tanpa src di dalam root dengan foto Wikipedia. */
  async function hydrate(root = document) {
    const all = KN.$$("img[data-wiki]:not([src])", root);
    if (!all.length) return;
    let cache = readCache();
    const claimed = new Set(Object.values(cache).filter(Boolean));
    const markApplied = (img, url) => { if (url && img.isConnected && !img.getAttribute("src")) { img.dataset.triedWiki = "1"; img.alt = img.dataset.alt || ""; img.src = url; } };

    // 1) Foto spesifik dari Commons (berurutan agar tidak ada dua menu dengan foto yang sama)
    for (const img of all.filter(el => el.dataset.photo)) {
      let spec; try { spec = JSON.parse(img.dataset.photo); } catch { continue; }
      const key = specKey(spec);
      let url = cache[key];
      if (url === undefined) {
        try { url = await searchCommons(spec, claimed); cache = {...readCache(), [key]: url}; KN.storage.set(CACHE_KEY, cache); if (url) claimed.add(url); }
        catch (err) { warnOnce(err); url = undefined; }
      }
      if (url) markApplied(img, url);
    }
    const imgs = all.filter(el => !el.getAttribute("src"));
    const need = [...new Set(imgs.flatMap(titlesOf))].filter(t => !(t in cache));
    if (need.length) {
      try {
        const got = await resolveTitles(need);
        cache = {...readCache(), ...got};
        KN.storage.set(CACHE_KEY, cache);
      } catch (err) { warnOnce(err); }
    }
    const apply = markApplied;
    const rest = [];
    imgs.forEach(img => { const url = cachedUrl(titlesOf(img), cache); url ? apply(img, url) : rest.push(img); });

    // Tanpa judul / judul tidak punya foto: cari berdasarkan nama menu (maks. 4 paralel).
    let i = 0;
    const worker = async () => {
      while (i < rest.length) {
        const img = rest[i++], key = "q:" + (img.dataset.query || "").toLowerCase();
        let url = readCache()[key];
        if (url === undefined && img.dataset.query) {
          try { url = await searchPhoto(img.dataset.query); KN.storage.set(CACHE_KEY, {...readCache(), [key]: url}); }
          catch (err) { warnOnce(err); url = ""; }
        }
        apply(img, url);
      }
    };
    await Promise.all(Array.from({length: Math.min(4, rest.length)}, worker));
  }

  /** Cek apakah URL benar-benar gambar yang bisa dimuat. */
  const canLoad = url => new Promise(resolve => {
    const im = new Image(), timer = setTimeout(() => resolve(false), 8000);
    im.onload = () => { clearTimeout(timer); resolve(im.naturalWidth > 0); };
    im.onerror = () => { clearTimeout(timer); resolve(false); };
    im.src = url;
  });
  /** File dari perangkat -> data URL JPEG (maks. 640px) agar hemat penyimpanan browser. */
  const fileToDataUrl = file => new Promise((resolve, reject) => {
    const src = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      const scale = Math.min(1, 640 / Math.max(im.naturalWidth, im.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(im.naturalWidth * scale); canvas.height = Math.round(im.naturalHeight * scale);
      canvas.getContext("2d").drawImage(im, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(src);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    im.onerror = () => { URL.revokeObjectURL(src); reject(new Error("bukan gambar")); };
    im.src = src;
  });

  KN.images = {canLoad, fileToDataUrl, attrs, hydrate, _resolveTitles: resolveTitles, _searchCommons: searchCommons, _specOf: specOf};
})();