# Birthday Quest

Web daftar ulang tahun 46 orang dengan intro sandi bergaya game, suara unik per orang, dan kartu detail.

## Struktur

```
birthday-quest/
├── index.html
├── assets/
│   ├── style.css     tema warna dan animasi
│   ├── script.js     intro, daftar, modal, suara
│   └── data.js       data 46 orang (edit di sini)
└── foto/             foto tiap orang (.jpg)
```

## Mengisi data

Buka `assets/data.js`. Satu blok satu orang: nama, tanggal lahir (`TTTT-BB-HH`), dan daftar `links`.
Tombol di halaman detail hanya menampilkan nama media sosialnya (Instagram, TikTok, dan seterusnya).

```js
{ name: "Aditya Pratama Putra", date: "2000-01-14",
  links: [ig("username_asli"), tt("username_asli"), wa("62812xxxxxxx")] }
```

- `ig("...")` dan `tt("...")` menerima username atau link lengkap. Username tidak harus sama dengan nama orangnya.
- `wa("62812xxxxxxx")` membuat tombol WhatsApp. Pakai kode negara tanpa tanda + dan tanpa 0 di depan.
- `link("YouTube", "https://...")` membuat tombol dengan tulisan bebas, misalnya Facebook, Telegram, atau Website.
- Hapus bagian yang tidak perlu. Orang tanpa TikTok cukup `links: [ig("username")]`.
- Untuk menambah orang, salin satu blok dan ubah isinya. Jumlah di judul halaman ikut menyesuaikan.

## Mengisi foto

Simpan foto ke `foto/` sesuai `foto/DAFTAR-NAMA-FILE.txt`, atau isi `photo: "nama-file.jpg"` di data untuk nama file lain. Foto yang belum ada diganti avatar inisial.
Format lain (misalnya png): tulis nama lengkap dengan ekstensinya di `photo`, misalnya `photo: "admin.png"`.

## Sandi intro

Sandi mengikuti tahun berjalan (2026, 2027, dan seterusnya). Untuk sandi tetap, ubah `getCode` di `CONFIG` pada `assets/script.js`.

## Logo di tab browser (favicon)

Simpan gambar logo bernama `logo.png` di folder `assets/`. Ukuran yang disarankan 512x512 piksel, persegi, latar transparan atau berwarna.
Ganti nama file atau formatnya lewat dua baris `<link rel="icon">` dan `<link rel="apple-touch-icon">` di `index.html`.
Kalau logo tidak berubah setelah deploy, refresh dengan Ctrl+F5 atau buka di jendela penyamaran.

## Ulasan lewat Gmail dan WhatsApp

Tombol "Kirim Ulasan" ada di bagian bawah halaman. Ganti tujuannya di `CONFIG` pada `assets/script.js`:

```js
feedbackEmail: "emailkamu@gmail.com",
feedbackWhatsapp: "628123456789",   // kode negara, tanpa + dan tanpa 0 di depan
```

Pengunjung mengisi nama, penilaian bintang, dan ulasan, lalu memilih "Kirim lewat Gmail" (membuka Gmail di browser) atau "Kirim lewat WhatsApp" (membuka chat ke nomormu). Pengunjung masih harus menekan kirim di Gmail atau WhatsApp.
