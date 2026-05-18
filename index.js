  const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
  const qrcode = require('qrcode-terminal');
  const { google } = require('googleapis');
  const cron = require('node-cron');

  const SPREADSHEET_ID = '1_OeZANBUkvAV-uYBq7uujXjJNY0OZ4mNIBwVzcjk5CU';
  const SHEET_JADWAL = 'Jadwal';
  const SHEET_PENERIMA = '👥 Daftar Penerima';
  const CREDENTIALS_PATH = './credentials.json';

  async function getSheets() {
    const auth = new google.auth.GoogleAuth({
      keyFile: CREDENTIALS_PATH,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return google.sheets({ version: 'v4', auth });
  }

  async function getJadwal(sheets) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_JADWAL}!A4:F`,
    });
    return res.data.values || [];
  }

  // Ambil semua penerima beserta grup (SPV/BM)
  async function getAllPenerima(sheets) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_PENERIMA}!A5:D`,
    });
    const rows = res.data.values || [];
    return rows
      .filter(r => r[1])
      .map(r => ({
        nomor: r[1].toString().trim(),
        nama:  r[2] || '',
        grup:  r[3] ? r[3].toString().trim().toUpperCase() : 'SEMUA',
      }));
  }

  function formatTarget(nomor) {
    return `${nomor.replace(/\D/g, '')}@c.us`;
  }

  function personalize(pesan, nama) {
    if (!nama) return pesan;
    return pesan.replace(/\{nama\}/gi, nama.trim());
  }

  async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function sendText(nomor, pesan, nama) {
    try {
      await client.sendMessage(formatTarget(nomor), personalize(pesan, nama));
      console.log(`✅ Teks → ${nama || nomor}`);
    } catch (err) {
      console.error(`❌ Gagal teks → ${nomor}:`, err.message);
    }
  }

  async function sendImage(nomor, pesan, nama) {
    try {
      const [url, caption = ''] = pesan.split('|').map(s => s.trim());
      const media = await MessageMedia.fromUrl(url, { unsafeMime: true });
      await client.sendMessage(formatTarget(nomor), media, {
        caption: personalize(caption, nama)
      });
      console.log(`✅ Gambar → ${nama || nomor}`);
    } catch (err) {
      console.error(`❌ Gagal gambar → ${nomor}:`, err.message);
    }
  }

  // Tentukan daftar penerima berdasarkan keyword
  // SEMUA → semua, SPV → filter grup SPV, BM → filter grup BM, nomor → satu orang
  async function resolvePenerima(target, sheets) {
    const keyword = target.trim().toUpperCase();

    if (keyword === 'SEMUA' || keyword === 'ALL') {
      const semua = await getAllPenerima(sheets);
      console.log(`📢 Broadcast SEMUA → ${semua.length} penerima`);
      return semua;
    }

    if (keyword === 'SPV' || keyword === 'BM') {
      const semua = await getAllPenerima(sheets);
      const filtered = semua.filter(p => p.grup === keyword);
      console.log(`📢 Broadcast ${keyword} → ${filtered.length} penerima`);
      return filtered;
    }

    // Nomor spesifik — cari nama dari Daftar Penerima
const semua = await getAllPenerima(sheets);
const found = semua.find(p => p.nomor === target.trim());
return [{ nomor: target, nama: found ? found.nama : '', grup: '' }];
  }

  async function broadcast(target, pesan, tipe, sheets) {
    const daftar = await resolvePenerima(target, sheets);
    const isGambar = tipe && tipe.trim().toLowerCase() === 'gambar';

    for (const { nomor, nama } of daftar) {
      if (isGambar) {
        await sendImage(nomor, pesan, nama);
      } else {
        await sendText(nomor, pesan, nama);
      }
      await delay(2000);
    }
  }

  async function checkAndSend() {
    const now = new Date();
    const todayDate = now.toLocaleDateString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    }).replace(/\//g, '/');
    const currentTime = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');

    let sheets;
    try { sheets = await getSheets(); }
    catch (err) { console.error('❌ Auth gagal:', err.message); return; }

    let rows;
    try { rows = await getJadwal(sheets); }
    catch (err) { console.error('❌ Baca jadwal gagal:', err.message); return; }

    for (const row of rows) {
      const [tanggal, jam, penerima, pesan, tipe, status] = row;
      if (!tanggal || !jam || !penerima || !pesan) continue;
      if (status === 'TERKIRIM') continue;
      if (tanggal.trim() !== todayDate || jam.trim() !== currentTime) continue;

      console.log(`\n⏰ [${currentTime}] Memproses jadwal → ${penerima}`);
      await broadcast(penerima, pesan, tipe, sheets);
    }
  }

  const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    protocolTimeout: 60000,
  },
});

  client.on('qr', (qr) => {
    console.log('\n📱 Scan QR Code ini dengan WhatsApp pengirim:\n');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    console.log('✅ WhatsApp terhubung!');
    console.log('🤖 Bot aktif...\n');
    cron.schedule('* * * * *', () => checkAndSend());
    console.log('⏰ Scheduler aktif, cek jadwal setiap menit...\n');
  });

  client.on('auth_failure', () => {
    console.error('❌ Autentikasi gagal. Hapus .wwebjs_auth lalu jalankan ulang.');
  });

  client.on('disconnected', (reason) => {
    console.log('⚠️  Terputus:', reason, '— Reconnecting...');
    client.initialize();
  });

  client.initialize();
