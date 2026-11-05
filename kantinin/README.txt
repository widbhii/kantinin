KANTININ — Smart School Canteen (prototype frontend)

STRUKTUR FOLDER (harus persis seperti ini)
  index.html
  css/style.css
  js/config.js  data.js  utils.js  images.js  services.js  views.js  app.js
  assets/kantinin.png        <- logo
  assets/menu/               <- (opsional) foto menu sendiri

MENJALANKAN
  Buka folder di VS Code -> klik kanan index.html -> Open with Live Server. Tekan Ctrl+Shift+R setelah mengganti file.

AKUN DEMO (js/data.js)
  Siswa   : NIS 2024001 / siswa123
  Penjual : NIS admin01 / kantin123
  Untuk NIS dan password sekolah sungguhan, ganti KN.auth.authenticate() di js/services.js dengan panggilan ke API sekolah.

FOTO MENU
  Urutan: image milik menu -> (opsional) assets/menu/<nama-menu>.jpg -> Wikipedia -> ilustrasi bawaan.
  Foto sendiri: isi kolom URL foto di Kelola Menu, atau set LOCAL_PHOTOS: true di js/config.js lalu simpan foto
  dengan nama seperti nasi-goreng-spesial.jpg, es-teh-manis.jpg di assets/menu/.

BATASAN
  Data (akun demo, menu, pesanan) tersimpan di localStorage browser, bukan database. Pesanan antar perangkat belum tersinkron.