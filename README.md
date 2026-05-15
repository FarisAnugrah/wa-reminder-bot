# 🤖 WA Reminder Bot

Bot WhatsApp otomatis yang baca jadwal dari Google Sheets dan kirim pesan tepat waktu.

## Struktur Kolom Google Sheets

| A (Tanggal) | B (Jam) | C (Tujuan) | D (Pesan) | E (Status) |
|---|---|---|---|---|
| 07/05/2025 | 08:00 | 6281234567890 | Selamat pagi! Jangan lupa absen ya 🙏 | |
| 07/05/2025 | 12:00 | 628xxx@g.us | Reminder: Meeting jam 1 siang | TERKIRIM |
| 07/05/2025 | 17:00 | 6281234567890 | Jangan lupa laporan harian ya! | |

### Cara isi kolom Tujuan:
- **Personal**: isi nomor HP dengan kode negara, contoh: `6281234567890`
- **Grup WA**: isi dengan Chat ID grup, contoh: `120363xxxxxx@g.us`

## Setup & Cara Jalankan

Lihat panduan lengkap dari Faris untuk setup VPS, Google API, dan cara scan QR.
