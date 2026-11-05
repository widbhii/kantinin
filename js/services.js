"use strict";
/** Lapisan data: autentikasi, produk, keranjang, pesanan. Semua persistensi lewat KN.storage. */
(() => {
  const {STATUS, MAX_LOGIN_ATTEMPTS, LOCK_SECONDS} = KN.CONFIG;
  const store = KN.storage;

  /* ---------- Autentikasi ---------- */
  KN.auth = {
    current: () => store.get("user", null),
    isAdmin() { return this.current()?.role === "admin"; },

    /** Titik integrasi: ganti isi fungsi ini dengan fetch() ke API sekolah. Harus mengembalikan user atau null. */
    async authenticate(nis, password) {
      // const res = await fetch("/api/login", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({nis, password})});
      // return res.ok ? await res.json() : null;   // {nis, name, kelas, role}
      const user = KN.SCHOOL_USERS.find(u => u.nis === nis && u.password === password);
      return user ? {nis: user.nis, name: user.name, kelas: user.kelas, role: user.role} : null;
    },

    lockRemaining() {
      const state = store.get("loginGuard", {count: 0, until: 0});
      return Math.max(0, Math.ceil((state.until - Date.now()) / 1000));
    },

    /** @returns {{ok:boolean, error?:string, user?:object}} */
    async login(nis, password) {
      const wait = this.lockRemaining();
      if (wait) return {ok: false, error: `Terlalu banyak percobaan. Coba lagi dalam ${wait} detik.`};
      const user = await this.authenticate(nis, password);
      if (!user) {
        const state = store.get("loginGuard", {count: 0, until: 0});
        state.count += 1;
        if (state.count >= MAX_LOGIN_ATTEMPTS) { state.count = 0; state.until = Date.now() + LOCK_SECONDS * 1000; }
        store.set("loginGuard", state);
        return {ok: false, error: "NIS atau password salah."};
      }
      store.set("loginGuard", {count: 0, until: 0});
      store.set("user", user);
      return {ok: true, user};
    },
    logout() { store.remove("user"); KN.cart.clear(); }
  };

  /* ---------- Produk ---------- */
  KN.products = {
    all() {
      const saved = store.get("products", null);
      if (saved) return saved;
      store.set("products", KN.SEED_PRODUCTS);
      return KN.SEED_PRODUCTS;
    },
    byId(id) { return this.all().find(p => p.id === id); },
    save(list) { return store.set("products", list); },
    upsert(data, id = null) {
      const list = this.all();
      if (id) return this.save(list.map(p => p.id === id ? {...p, ...data} : p));
      return this.save([...list, {id: Math.max(0, ...list.map(p => p.id)) + 1, available: true, popular: false, badge: "", ...data}]);
    },
    remove(id) { this.save(this.all().filter(p => p.id !== id)); KN.cart.remove(id); },
    setAvailable(id, available) { this.save(this.all().map(p => p.id === id ? {...p, available} : p)); },
    search({query = "", category = "Semua", price = "", sort = "recommended"}) {
      const range = KN.CONFIG.PRICE_RANGES.find(r => r.value === price);
      const q = query.trim().toLowerCase();
      const list = this.all().filter(p =>
        (category === "Semua" || p.category === category) &&
        (!range?.test || range.test(p.price)) &&
        (!q || `${p.name} ${p.description}`.toLowerCase().includes(q)));
      const sorters = {low: (a, b) => a.price - b.price, high: (a, b) => b.price - a.price, name: (a, b) => a.name.localeCompare(b.name)};
      if (sorters[sort]) list.sort(sorters[sort]);
      return list;
    }
  };

  /* ---------- Keranjang ---------- */
  KN.cart = {
    items: () => store.get("cart", []),
    save(items) { store.set("cart", items); },
    count() { return this.items().reduce((s, i) => s + i.quantity, 0); },
    rows() { return this.items().map(i => ({...KN.products.byId(i.id), quantity: i.quantity})).filter(r => r.id); },
    total() { return this.rows().reduce((s, r) => s + r.price * r.quantity, 0); },
    add(id) {
      const items = this.items(), item = items.find(i => i.id === id);
      item ? item.quantity++ : items.push({id, quantity: 1});
      this.save(items);
    },
    change(id, delta) {
      this.save(this.items().map(i => i.id === id ? {...i, quantity: i.quantity + delta} : i).filter(i => i.quantity > 0));
    },
    remove(id) { this.save(this.items().filter(i => i.id !== id)); },
    clear() { this.save([]); }
  };

  /* ---------- Pesanan ---------- */
  KN.orders = {
    all: () => store.get("orders", []),
    forUser(nis) { return this.all().filter(o => o.nis === nis); },
    create({name, kelas, pickup, note, payment = "cash"}) {
      const user = KN.auth.current(), seq = store.get("orderSeq", 1000) + 1;
      const order = {
        code: `KN-${seq}`, nis: user.nis, name, kelas, pickup, note, payment: KN.CONFIG.PAYMENT_METHODS.find(m => m.id === payment)?.label || "Tunai di kantin", paid: false,
        items: KN.cart.rows().map(r => ({id: r.id, name: r.name, price: r.price, quantity: r.quantity})),
        total: KN.cart.total(), status: STATUS[0], createdAt: new Date().toISOString()
      };
      store.set("orderSeq", seq);
      store.set("orders", [order, ...this.all()]);
      store.set("lastOrder", order.code);
      KN.cart.clear();
      return order;
    },
    setStatus(code, status) {
      if (!STATUS.includes(status)) return;
      store.set("orders", this.all().map(o => o.code === code ? {...o, status} : o));
    },
    setPaid(code, paid) {
      store.set("orders", this.all().map(o => o.code === code ? {...o, paid: !!paid} : o));
    },
    stats() {
      const all = this.all();
      return {
        total: all.length,
        waiting: all.filter(o => o.status === STATUS[0]).length,
        processing: all.filter(o => o.status === STATUS[1]).length,
        sales: all.filter(o => o.status !== "Dibatalkan").reduce((s, o) => s + o.total, 0)
      };
    }
  };
})();