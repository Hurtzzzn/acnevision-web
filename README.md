# AcneVision AI Mobile (Frontend)

Aplikasi mobile untuk pemindaian wajah, deteksi dini kondisi jerawat, perbandingan progres kulit, dan konsultasi asisten AI berbasis **React**, **TypeScript**, **Vite**, **Tailwind CSS**, dan **Capacitor (Android Native)**.

> [!NOTE]
> Proyek ini mencakup antarmuka **Frontend Mobile Web & Android (Capacitor)** pada direktori `src/` dan `android/`. Untuk dokumentasi layanan REST API FastAPI & model inference, lihat [`backend/README.md`](backend/README.md).

---

## Daftar Isi
- [Fitur Utama](#fitur-utama)
- [Metode & Pendekatan Teknis](#metode--pendekatan-teknis)
- [Teknologi yang Digunakan](#teknologi-yang-digunakan)
- [Struktur Direktori](#struktur-direktori)
- [Panduan Penginstalan & Menjalankan Aplikasi](#panduan-penginstalan--menjalankan-aplikasi)
- [Menjalankan di Android Studio & Perangkat Fisik](#menjalankan-di-android-studio--perangkat-fisik)
- [Skrip & Pengujian](#skrip--pengujian)
- [Akun Demo](#akun-demo)

---

## Fitur Utama

1. **Beranda Dinamis & Sapaan Waktu Aktual**:
   - Menampilkan tanggal dan sapaan otomatis berdasarkan jam lokal perangkat (`Pagi`, `Siang`, `Sore`, `Malam`) serta ringkasan hasil pemindaian terakhir dan selisih perubahannya.
2. **Alur Kamera Terpandu & Ramah Privasi**:
   - **Izin Kamera & Fallback Galeri**: Penjelasan privasi sebelum meminta izin kamera, serta panduan aktivasi jika izin ditolak dengan opsi unggah dari galeri.
   - **Kamera Live Full-Bleed**: Deteksi wajah langsung menggunakan garis panduan oval, evaluasi pencahayaan, dan toggle kamera depan/belakang serta flash.
   - **Pratinjau & Crop Foto Interaktif**: Pratinjau foto kamera/galeri disertai kanvas *crop* grid 3×3 bebas rasio sebelum foto dikirim untuk analisis.
   - **Persetujuan Penyimpanan Foto (*Per-Photo Consent*)**: Pengguna dapat memilih **Setuju, simpan dan analisis** (tersimpan di riwayat) atau **Analisis tanpa menyimpan**.
3. **Hasil Analisis & Visualisasi Deteksi**:
   - Menampilkan *bounding box* dan skor *confidence* (`%`), indikator total *Acne Count*, estimasi tingkat keparahan (`Ringan`, `Sedang`, `Berat`, `Sangat Berat`), rincian jenis lesi (*Komedo*, *Papula*, *Pustula*), serta langkah perawatan awal.
4. **Perbandingan Sebelum & Sesudah (`/compare`)**:
   - Pemilih berbasis galeri foto 2 kolom dengan tampilan **tanggal dan jam lengkap** (membedakan beberapa foto di hari yang sama) serta validasi kronologis ketat (`waktu(SESUDAH) >= waktu(SEBELUM)`).
5. **Riwayat & Tren Progres (`/history`)**:
   - Grafik tren jumlah jerawat interaktif, filter otomatis per bulan, dan detail tiap riwayat pemindaian.
6. **Konsultasi Asisten AI (`/chat`)**:
   - Ruang percakapan edukatif yang dapat menyertakan konteks hasil pemindaian terbaru pengguna.
7. **Profil, Pengingat, & Hapus Semua Data (`/profile`)**:
   - Pengelolaan akun, jadwal pengingat pindai, manajemen izin kamera, dan penghapusan permanen seluruh data riwayat & foto pengguna.

---

## Metode & Pendekatan Teknis

### 1. Client-Side Face Landmarker (`@mediapipe/tasks-vision`)
- Menggunakan model **MediaPipe Face Landmarker** yang di-host secara lokal pada `public/mediapipe/` (`face_landmarker.task` & modul WASM), sehingga pelacakan wajah berjalan langsung di perangkat tanpa mengirimkan *video stream* mentah ke server pihak ketiga.
- Konfigurasi `minFaceDetectionConfidence: 0.3`, `minFacePresenceConfidence: 0.3`, dan `minTrackingConfidence: 0.3` diterapkan pada [`src/lib/faceLandmarker.ts`](src/lib/faceLandmarker.ts) agar pelacakan tetap stabil untuk pose wajah lurus, **kepala miring (*roll*)**, maupun **menoleh menyamping (*yaw* hingga ±60°, *pitch* ±40°)**.

### 2. Strict Alignment Gate & Optimasi Rendering Kamera
- **Aturan Wajib Pas di Garis (`src/lib/faceGuide.ts`)**: Tombol potret dikunci (`disabled`) sebelum seluruh kondisi terpenuhi: wajah terdeteksi, ukuran dahi–dagu proporsional terhadap lingkaran oval (`checkPositionInOval`), orientasi kepala dalam batas toleransi (`checkGaze`), dan pencahayaan memadai (`checkLighting`).
- **Performa Preview 60fps**: Pengukuran DOM memakai `ResizeObserver` untuk menghindari *layout reflow* berulang, inferensi MediaPipe hanya dijalankan saat ada frame video baru (`video.currentTime` berubah), dan kotak deteksi dirender pada elemen `<canvas>` overlay terpisah dengan *Exponential Moving Average* (EMA) smoothing.
- **Capture Bersih (`src/lib/capture.ts`)**: `frameToBlob` mengambil frame langsung dari elemen `<video>` kamera dengan batas dimensi opsional (`maxDimension: 1280`) sehingga hasil potret bebas dari garis panduan/overlay UI.

### 3. Integrasi API & Mode Mock Offline
- Melalui [`src/lib/runtime.ts`](src/lib/runtime.ts), aplikasi mendukung dua mode lewat variabel lingkungan `.env`:
  - `VITE_USE_MOCK=true`: Menggunakan backend tiruan di browser (`localStorage` + simulasi respons) agar frontend tetap bisa dikembangkan dan diuji tanpa server backend aktif.
  - `VITE_USE_MOCK=false`: Menghubungkan seluruh request REST API (`POST /detect`, `POST /analyze`, `/scans`, `/chat`, `/me`, `/admin`) ke server FastAPI melalui Axios.

---

## Teknologi yang Digunakan

| Kategori | Teknologi / Paket |
|---|---|
| **Framework & Bahasa** | React 18, TypeScript 5, Vite 5 |
| **Styling & Ikon** | Tailwind CSS 3, Lucide React |
| **Native Mobile Bridge** | Capacitor 8 (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`) |
| **Computer Vision (Client)** | `@mediapipe/tasks-vision`, `react-webcam` |
| **State & Routing** | Zustand, React Router DOM v6 |
| **HTTP & Grafik** | Axios, Recharts |
| **Pengujian** | Vitest |

---

## Struktur Direktori

```text
acnevision-mobile/
├── android/                  # Proyek native Android Studio (Gradle, AndroidManifest)
├── design/                   # Referensi desain layar UI
├── public/mediapipe/         # Model & file WASM MediaPipe Face Landmarker (self-hosted)
├── src/
│   ├── assets/               # Aset gambar statis
│   ├── components/           # Komponen reusable, Layout, navigasi mobile, & izin kamera
│   ├── lib/                  # Utilitas inti (faceGuide, faceLandmarker, capture, compare, dateTime)
│   ├── pages/                # Halaman aplikasi (Home, Dashboard, Scan, Preview, Crop, Consent, Analyzing, DetectResult, Compare, History, Chat, Profile, DeleteData, Auth, admin/)
│   ├── shared/               # API client, tipe TypeScript, konstanta, & mock offline
│   ├── store/                # State global Zustand (auth, scan, settings, ui)
│   ├── App.tsx               # Konfigurasi routing aplikasi
│   └── main.tsx              # Entry point React
├── backend/                  # Layanan FastAPI terpisah (lihat backend/README.md)
├── capacitor.config.ts       # Konfigurasi Capacitor Android
├── package.json              # Daftar dependensi & skrip npm
└── vite.config.ts            # Konfigurasi Vite
```

---

## Panduan Penginstalan & Menjalankan Aplikasi

### Prasyarat
- **Node.js** versi 18 atau 20+ (disarankan LTS) beserta **npm**
- **Android Studio** + **Android SDK** (jika ingin membangun atau menjalankan di emulator/HP Android)
- *(Opsional)* **Python 3.11+** jika ingin menjalankan server [`backend/`](backend/README.md) secara lokal

### 1. Kloning & Instalasi Dependensi
```bash
git clone https://github.com/keannnw/acnevision-mobile.git
cd acnevision-mobile
npm install
```

### 2. Konfigurasi File `.env`
Salin template konfigurasi lingkungan:
```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# Linux / macOS
cp .env.example .env
```

Isi file `.env` sesuai kebutuhan:
- **Mode Frontend Standalone / Mock Offline (tanpa backend):**
  ```env
  VITE_USE_MOCK=true
  VITE_API_BASE_URL=http://localhost:8000/api/v1
  ```
- **Mode Terhubung ke Backend FastAPI:**
  ```env
  VITE_USE_MOCK=false
  VITE_API_BASE_URL=http://localhost:8000/api/v1
  ```

### 3. Menjalankan Server Development (Browser)
```bash
npm run dev
```
Aplikasi web dapat diakses melalui browser di `http://localhost:5173/`.

---

## Menjalankan di Android Studio & Perangkat Fisik

Proyek ini telah dikonfigurasi menggunakan **Capacitor** dengan `appId: com.acnevision.mobile` dan izin hardware kamera pada `android/app/src/main/AndroidManifest.xml`.

1. **Build aset produksi & sinkronisasi ke folder `android/`:**
   ```bash
   npm run build
   npx cap sync android
   ```
2. **Buka proyek Android di Android Studio:**
   ```bash
   npx cap open android
   ```
   *(Atau jalankan sekaligus dengan `npm run android`).*
   > **Penting:** Jika membuka manual melalui **File → Open** di Android Studio, pilih subfolder **`android/`** (bukan folder root proyek) agar Gradle terdeteksi dengan benar.
3. **Jalankan ke HP Android / Emulator:**
   - Aktifkan **USB Debugging** pada perangkat Android Anda dan sambungkan ke komputer.
   - Pilih perangkat pada toolbar Android Studio, lalu klik **Run (▶)** atau tekan `Shift + F10`.

---

## Skrip & Pengujian

Perintah yang tersedia pada [`package.json`](package.json):

| Perintah | Deskripsi |
|---|---|
| `npm run dev` | Menjalankan server development Vite (`localhost:5173`). |
| `npm run build` | Mengecek tipe TypeScript (`tsc --noEmit`) dan membuat bundle produksi ke `dist/`. |
| `npm run typecheck` | Menjalankan pemeriksaan tipe TypeScript saja. |
| `npm test` | Menjalankan seluruh unit test menggunakan Vitest. |
| `npm run cap:sync` | Menyinkronkan hasil build `dist/` ke proyek native Android. |
| `npm run cap:open` | Membuka proyek `android/` di Android Studio. |
| `npm run android` | Menjalankan `npm run build`, `cap sync android`, dan `cap open android`. |

Untuk memverifikasi seluruh unit test frontend (mencakup helper panduan wajah, deteksi cahaya, pemotongan gambar, aturan kronologis perbandingan foto, format tanggal aktual, dan manajemen cache):
```bash
npm test
```

---

## Akun Demo

Saat menjalankan aplikasi dalam mode mock (`VITE_USE_MOCK=true`), tersedia akun bawaan di [`src/shared/api/mock.ts`](src/shared/api/mock.ts) yang dapat langsung digunakan:

| Role | Email | Password |
|---|---|---|
| **User** | `demo@acnevision.test` | `demo12345` |
| **Admin** | `admin@acnevision.test` | `admin12345` |
