# SOLVENT T

Dashboard prototipe sesuai SOLVENT_T_Dashboard_Brief.pdf. HTML, CSS, dan JavaScript biasa, tanpa build atau instalasi dependensi.

## Menjalankan

1. Buka folder ini di terminal.
2. Jalankan `npm start` (Node.js diperlukan).
3. Buka `http://127.0.0.1:4173`.

Alternatif: buka `dist/index.html` langsung di browser. Penyimpanan lokal mengikuti kebijakan browser untuk file lokal; gunakan server untuk perilaku penyimpanan yang konsisten. Font Google bersifat opsional, dengan fallback Arial bila offline.

## Fitur sesuai brief

| Kebutuhan | Implementasi |
| --- | --- |
| Dua tab, blend menjadi dasar pasokan | Pemilihan & blending / Pasokan & stok memakai state yang sama |
| Cargo, supplier, garam, BS&W editable | Tabel mutu cargo, termasuk basis Case / Asumsi / Hasil uji |
| Proporsi H/SH/L, kapasitas, efisiensi | Input angka dan slider; total harus 100%; efisiensi di bawah 100% |
| Perhitungan langsung | Garam dan BS&W inlet, outlet prediksi, screening garam <2 PTB |
| Status garam dan verifikasi terpisah | Screening garam + catatan hasil uji kompatibilitas, BS&W outlet, TAN, metal |
| Pasokan harian | Kapasitas × proporsi H/SH/L |
| Stok light | Target, cakupan, dan tambahan stok; stok aktual kosong sampai diisi |
| Buffer dan catatan manual | Hari buffer, jadwal pengiriman, supplier cadangan, umur stok |
| Bandingkan skenario | Tiga demo brief dan daftar snapshot pengguna |
| Simpan lokal | Snapshot input, catatan, basis angka, dan verifikasi ke localStorage |
| CSV | Skenario aktif, demo, dan tersimpan; beserta input, output, sumber angka, catatan |
| Visual | Putih dan hijau, kartu angka, responsif, tanpa animasi |
| Transparansi | Dialog rumus dan basis data; pembulatan hanya untuk tampilan |

## Perhitungan dan validasi

- Garam inlet = Σ(porsi volume × garam cargo).
- BS&W inlet = Σ(porsi volume × BS&W cargo).
- Outlet prediksi = garam inlet × (1 − efisiensi/100).
- Kebutuhan crude/hari = kapasitas × proporsi/100.
- Target light = kebutuhan light/hari × buffer.
- Cakupan = stok layak pakai / kebutuhan light/hari, hanya saat light >0 dan stok sudah diisi.
- Tambahan stok = maks(0, target − stok), hanya setelah stok diisi.
- Input kosong wajib, input negatif, BS&W >100%, proporsi >100%, total bukan 100%, atau efisiensi ≥100% memblokir hasil, simpan, dan ekspor.
- Status screening menggunakan angka penuh, bukan hasil pembulatan. Tepat 2 PTB tidak memenuhi batas <2 PTB.
- BS&W outlet harus <0,05%; tepat 0,05% tidak memenuhi.
- Perubahan blend, cargo atau proses mereset catatan verifikasi untuk menghindari pemakaian hasil uji lama.

## Angka demo terverifikasi

| Skenario | H/SH/L | Inlet | Outlet, efisiensi 97% |
| --- | --- | --- | --- |
| Awal | 50/40/10 | 67,85 PTB | 2,036 PTB |
| Porsi SH dikurangi | 55/35/10 | 64,20 PTB | 1,926 PTB |
| SH lebih bersih | 50/40/10 | 49,85 PTB | 1,496 PTB |

Awal: salt 42/115/8,5 PTB; BS&W 1,20/3,80/0,15%; kapasitas 300.000 bbl/hari. SH lebih bersih mengasumsikan salt SH 70 PTB dan BS&W 1,50%. Kebutuhan awal 150.000/120.000/30.000 bbl/hari, target light 150.000 bbl dengan buffer 5 hari. Stok 90.000 bbl memberi cakupan 3 hari dan tambahan 60.000 bbl.

## Batas prototipe

Data stok dan cargo belum terhubung ke sistem operasional. Nama supplier awal adalah label case. Status hasil uji dicatat pengguna secara manual. Batas TAN dan metal harus dikonfirmasi terhadap unit; tidak diasumsikan oleh aplikasi. Screening garam tidak menetapkan kelayakan operasional blend. Kapasitas tangki perlu dikonfirmasi; buffer mengasumsikan pasokan domestik tetap masuk.

Data localStorage tersimpan per browser/per alamat situs. Menghapus data browser menghapus skenario. CSV adalah ringkasan, bukan mekanisme impor. Tidak ada database, backend, atau optimasi margin pada versi awal ini.

## Struktur

- `dist/index.html`: antarmuka dan dialog.
- `dist/styles.css`: visual dan breakpoint responsif.
- `dist/model.js`: state awal, skenario demo, validasi, rumus.
- `dist/app.js`: input, rendering, tab, simpan/muat, CSV, catatan uji.
- `server.cjs`: server lokal sederhana menggunakan modul bawaan Node.js.
- `verify.cjs`: pemeriksaan formula, demo, dan batas validasi; jalankan `npm test`.
- `.openai/hosting.json`: konfigurasi publikasi Sites privat.

Basis: brief SOLVENT T, Semifinal Case 2026, SOLVENT Track C Optimize, dan ZEKINDO Integrated Solution sebagaimana disebut dalam dokumen brief.
