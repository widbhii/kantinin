"use strict";
/**
 * Data awal (seed). Menu bisa diubah penjual lewat dashboard; hasilnya disimpan di localStorage.
 * Foto: `photo` (opsional) = pencarian foto spesifik di Wikimedia Commons: teks, atau {q, need:[regex judul file], not:[regex yang dihindari]}.
 * `wiki` berisi judul artikel Wikipedia (dipisah "|", dicoba berurutan). Foto diambil otomatis dari
 * Wikipedia oleh js/images.js. Isi `image` (URL atau path "assets/menu/xxx.jpg") untuk memakai foto sendiri.
 */
(() => {
  const P = (id, name, category, price, wiki, description, o = {}) =>
    ({id, name, category, price, description, wiki, photo: o.photo || null, image: o.image || "", badge: o.badge || "", popular: !!o.popular, available: o.available !== false});

  KN.SEED_PRODUCTS = [
    // Makanan
    P(1, "Nasi Ayam Teriyaki", "Makanan", 15000, "Teriyaki", "Nasi hangat dengan ayam teriyaki dan sayuran.", {badge: "Paling laris", popular: true}),
    P(2, "Nasi Goreng Spesial", "Makanan", 13000, "Nasi_goreng", "Nasi goreng gurih dengan telur dan pelengkap.", {badge: "Favorit", popular: true}),
    P(3, "Chicken Katsu", "Makanan", 16000, "Katsu|Tonkatsu", "Ayam katsu renyah dengan nasi dan saus pilihan."),
    P(4, "Mie Goreng", "Makanan", 10000, "Mie_goreng", "Mie goreng dengan sayuran dan telur.", {popular: true}),
    P(5, "Nasi Ayam Geprek", "Makanan", 14000, "Ayam_geprek|Fried_chicken", "Ayam crispy diulek sambal bawang, level pedas bisa diatur.", {popular: true}),
    P(6, "Nasi Telur Balado", "Makanan", 11000, "Telur_balado|Sambal", "Telur bumbu balado dengan nasi dan lalapan."),
    P(7, "Mie Ayam Bakso", "Makanan", 12000, "Mie_ayam|Bakmi", "Mie ayam dengan bakso dan kuah kaldu hangat."),
    P(8, "Soto Ayam", "Makanan", 12000, "Soto_(food)", "Soto ayam kuah kuning dengan nasi dan koya."),
    P(9, "Nasi Uduk Komplit", "Makanan", 12000, "Nasi_uduk", "Nasi uduk dengan ayam, telur dadar, dan bihun."),
    P(10, "Bakso Kuah", "Makanan", 11000, "Bakso", "Bakso sapi dengan mie, sayur, dan kuah gurih."),
    P(11, "Spaghetti Bolognese", "Makanan", 15000, "Spaghetti_alla_bolognese|Bolognese_sauce|Spaghetti", "Spaghetti saus daging tomat dengan taburan keju."),
    P(12, "Nasi Kuning Ayam Suwir", "Makanan", 10000, "Nasi_kuning", "Nasi kuning dengan ayam suwir, telur, dan kering tempe."),
    P(13, "Roti Bakar Cokelat Keju", "Makanan", 9000, "Roti_bakar|Toast", "Roti bakar tebal dengan cokelat dan keju parut.", {badge: "Baru"}),
    // Camilan
    P(14, "Kentang Goreng", "Camilan", 8000, "French_fries", "Kentang goreng renyah dan gurih.", {popular: true}),
    P(15, "Roti Cokelat", "Camilan", 6000, "Pain_au_chocolat", "Roti lembut dengan isian cokelat."),
    P(16, "Pisang Cokelat", "Camilan", 7000, "Pisang_goreng", "Pisang manis dibalut kulit renyah."),
    P(17, "Donat Mini", "Camilan", 5000, "Doughnut", "Donat mini dengan topping gula."),
    P(18, "Puding Cokelat", "Camilan", 5000, "Chocolate_pudding|Pudding", "Puding cokelat lembut dan manis."),
    P(19, "Nugget Ayam", "Camilan", 8000, "Chicken_nugget", "Nugget ayam goreng dengan saus sambal."),
    P(20, "Sosis Bakar", "Camilan", 6000, "Sausage", "Sosis bakar dengan saus tomat dan mayones."),
    P(21, "Risoles Mayo", "Camilan", 5000, "Risoles|Rissole", "Risoles isi sayur, telur, dan mayones."),
    P(22, "Tahu Crispy", "Camilan", 5000, "", "Tahu goreng tepung dengan bumbu tabur.", {photo: {q: "tahu goreng", need: ["tahu"], not: ["pecel", "sumedang"]}}),
    P(23, "Cireng Bumbu Rujak", "Camilan", 6000, "", "Cireng goreng dengan bumbu rujak pedas manis.", {photo: {q: "cireng", need: ["cireng"], not: ["rujak"]}}),
    P(24, "Siomay", "Camilan", 9000, "Siomay", "Siomay ikan dengan saus kacang dan jeruk limau.", {popular: true}),
    P(25, "Sandwich Telur", "Camilan", 7000, "Egg_sandwich|Sandwich", "Roti lembut isi telur, selada, dan tomat."),
    // Minuman
    P(26, "Es Teh Manis", "Minuman", 4000, "Iced_tea", "Teh manis dingin yang menyegarkan.", {popular: true}),
    P(27, "Jus Jeruk", "Minuman", 7000, "Orange_juice", "Jus jeruk segar untuk siang hari.", {available: false}),
    P(28, "Susu Stroberi", "Minuman", 6000, "", "Susu rasa stroberi yang creamy.", {photo: "strawberry milk"}),
    P(29, "Es Cokelat", "Minuman", 8000, "", "Cokelat dingin yang creamy.", {popular: true, photo: "iced chocolate"}),
    P(30, "Air Mineral", "Minuman", 3000, "Bottled_water", "Air mineral botol 600 ml."),
    P(31, "Teh Hangat", "Minuman", 3000, "Tea", "Teh manis hangat."),
    P(32, "Es Lemon Tea", "Minuman", 6000, "", "Teh dingin dengan perasan lemon.", {photo: "lemon tea"}),
    P(33, "Jus Alpukat", "Minuman", 10000, "", "Jus alpukat kental dengan susu cokelat.", {photo: "avocado juice"}),
    P(34, "Jus Mangga", "Minuman", 9000, "", "Jus mangga segar tanpa pengawet.", {photo: "mango juice"}),
    P(35, "Es Milo", "Minuman", 7000, "", "Milo dingin dengan susu.", {photo: {q: "milo drink", need: ["milo", "drink|iced|dinosaur|beverage|glass|cup"], not: ["yiannopoulos"]}}),
    P(36, "Susu Cokelat", "Minuman", 6000, "", "Susu cokelat dingin.", {photo: "chocolate milk"})
  ];

  /**
   * AKUN DEMO. Jangan dipakai di produksi: password di file frontend bisa dibaca siapa saja.
   * Untuk sistem sungguhan, ganti KN.auth.authenticate() di services.js dengan panggilan ke API sekolah.
   */
  KN.SCHOOL_USERS = [
    {nis: "admin01", name: "Bu Sari (Penjual Kantin)", password: "kantin123", role: "admin", kelas: ""},
    {nis: "2024001", name: "Rani Putri", password: "siswa123", role: "siswa", kelas: "8A"},
    {nis: "2024002", name: "Dimas Pratama", password: "siswa123", role: "siswa", kelas: "9B"}
  ];
})();