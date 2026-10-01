/** All user-facing microcopy (Indonesian). Single source, see docs/06_UI_UX_DESIGN.md section 8. */
export const COPY = {
  appName: 'AcneVision AI',
  disclaimer:
    'Hasil ini merupakan analisis AI dan bukan diagnosis medis. Konsultasikan ke dokter kulit untuk penanganan yang tepat.',
  loginGateChat: 'Masuk untuk bertanya lebih lanjut ke asisten AI',
  loginGateSave:
    'Masuk untuk menyimpan hasil ke riwayat. Setelah masuk, lakukan scan ulang agar hasil tersimpan.',
  loginGateHistory: 'Masuk untuk melihat riwayat analisis kamu',
  noLesion:
    'Tidak ada jerawat terdeteksi. Coba foto ulang dengan pencahayaan lebih terang dan wajah lebih dekat.',
  lowConf: 'AI kurang yakin dengan lesi ini',
  analyzing: 'Menganalisis foto kamu...',
  severityNote: 'Estimasi berdasarkan jumlah lesi yang terdeteksi',
  photoTips: [
    'Pastikan pencahayaan cukup',
    'Wajah terlihat jelas dan menghadap kamera',
    'Jaga kamera tetap stabil',
    'Hindari makeup tebal',
  ],
} as const;
