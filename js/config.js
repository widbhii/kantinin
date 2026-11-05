"use strict";
/**
 * Konfigurasi aplikasi KANTININ.
 * Semua modul berbagi satu namespace global: window.KN.
 */
window.KN = {
  CONFIG: {
    STORAGE_PREFIX: "kantinin:v6:",
    STATUS: ["Menunggu Konfirmasi", "Sedang Diproses", "Siap Diambil", "Selesai", "Dibatalkan"],
    CATEGORIES: ["Makanan", "Minuman", "Camilan"],
    PRICE_RANGES: [
      {value: "", label: "Semua harga"},
      {value: "lt8", label: "Sampai Rp8.000", test: p => p <= 8000},
      {value: "8to12", label: "Rp8.001 – Rp12.000", test: p => p > 8000 && p <= 12000},
      {value: "gt12", label: "Di atas Rp12.000", test: p => p > 12000}
    ],
    PAYMENT_METHODS: [
      {id: "cash", label: "Tunai di kantin", icon: "payments", desc: "Bayar saat mengambil pesanan"},
      {id: "qris", label: "QRIS", icon: "qr_code_2", desc: "Scan QRIS lewat bank atau e-wallet"}
    ],
    PICKUP_OPTIONS: ["Secepatnya", "Istirahat pertama", "Istirahat kedua"],
    /** true = coba pakai foto sendiri di assets/menu/<nama-menu>.jpg lebih dulu (mis. nasi-goreng-spesial.jpg). */
    LOCAL_PHOTOS: false,
    MAX_LOGIN_ATTEMPTS: 5,
    LOCK_SECONDS: 30
  }
};