# 🤖 Bot WhatsApp v1

Bot WhatsApp berbasis [Baileys](https://github.com/WhiskeySockets/Baileys) dengan fitur admin grup dan AI (Groq).

---

## ✨ Fitur

- 🔐 Login via **Pairing Code** (tanpa QR)
- 👋 **Welcome / Goodbye** otomatis saat member masuk/keluar grup
- 🚫 **Anti-link saluran** — auto delete & kick member yang kirim link saluran WA
- 🤖 **Fitur AI** menggunakan Groq API (LLaMA 3.3 70B)
- ⚙️ Manajemen akses: addakses, delakses, listakses
- 🔒 Open / close grup
- 🗑️ Delete pesan & kick member

---

## 📋 Perintah

| Perintah | Keterangan | Akses |
|---|---|---|
| `.menu` | Tampilkan menu | Admin / Owner |
| `.kick` | Keluarkan member (reply/tag) | Admin / Owner |
| `.del` | Hapus pesan (reply) | Admin / Owner |
| `.open` | Buka grup | Admin / Owner |
| `.close` | Tutup grup | Admin / Owner |
| `.addakses` | Tambah akses user (tag) | Admin / Owner |
| `.delakses` | Hapus akses user (tag) | Owner |
| `.listakses` | Lihat daftar akses | Owner |
| `.ai <pertanyaan>` | Tanya AI | Admin / Owner |

---

## 🚀 Cara Install

### 1. Clone repo

```bash
git clone https://github.com/username/bot-wa.git
cd bot-wa
```

### 2. Install dependencies

```bash
npm install
```

### 3. Buat file `.env`

```bash
cp .env.example .env
```

Lalu edit `.env` dan isi dengan data kamu:

```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OWNER_NUMBER=628xxxxxxxxxxxx
```

> 🔑 Dapatkan Groq API Key gratis di: https://console.groq.com

### 4. Jalankan bot

```bash
npm start
```

### 5. Hubungkan ke WhatsApp

- Masukkan nomor HP kamu saat diminta (format: `628xxx`)
- Buka WhatsApp → **Setelan** → **Perangkat Tertaut** → **Tautkan Perangkat**
- Masukkan kode pairing yang tampil di terminal

---

## 📁 Struktur Project

```
bot-wa/
├── index.js          # Entry point & koneksi WA
├── handler.js        # Logic semua perintah
├── database.json     # Data allowedUsers
├── lib/
│   └── welcome.js    # Fitur welcome/goodbye
├── .env              # Secrets (tidak di-push ke GitHub)
├── .env.example      # Template .env
├── .gitignore
└── package.json
```

---

## ⚠️ Catatan

- Folder `session/` otomatis dibuat saat pertama login — **jangan di-push ke GitHub**
- File `.env` sudah masuk `.gitignore` — **jangan pernah share API key kamu**
- Bot harus jadi **admin grup** agar bisa kick, delete pesan, open/close grup

---

## 📦 Dependencies

- [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys)
- [dotenv](https://github.com/motdotla/dotenv)
- [pino](https://github.com/pinojs/pino)
- [@hapi/boom](https://github.com/hapijs/boom)
