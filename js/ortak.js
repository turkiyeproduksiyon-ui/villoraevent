/* Ortak yardımcılar: hem site hem panel kullanır */
(function () {
  'use strict';

  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); }

  var TL = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
  function para(n) { return (n === null || n === undefined || n === '' || isNaN(Number(n))) ? '' : TL.format(Number(n)); }

  var AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  function tarihNesne(iso) {
    if (!iso) return null;
    var p = String(iso).slice(0, 10).split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function tarihTR(iso) {
    var d = tarihNesne(iso);
    return d ? d.getDate() + ' ' + AYLAR[d.getMonth()] + ' ' + d.getFullYear() : '';
  }
  function bugunISO() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function isoYap(y, m, d) { return y + '-' + ('0' + (m + 1)).slice(-2) + '-' + ('0' + d).slice(-2); }

  /* Sadece http(s) bağlantılara izin ver; @kullanici ya da instagram.com/... kabul et */
  function guvenliUrl(u) {
    u = String(u || '').trim();
    if (!u) return '';
    if (/^https?:\/\//i.test(u)) return u;
    if (/^img\/[\w.-]+\.(jpe?g|png|webp)$/i.test(u)) return u;   // sitenin kendi img klasörü
    if (/^(www\.|[a-z0-9-]+\.[a-z]{2,})(\/|$)/i.test(u)) return 'https://' + u;
    return '';
  }
  function instagramUrl(u) {
    u = String(u || '').trim();
    if (!u) return '';
    if (u.charAt(0) === '@') u = u.slice(1);
    if (/^[A-Za-z0-9._]{1,30}$/.test(u)) return 'https://www.instagram.com/' + u + '/';
    return guvenliUrl(u);
  }
  function waNumara(t) {
    var d = String(t || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.indexOf('90') === 0 && d.length >= 12) return d;
    if (d.charAt(0) === '0') return '90' + d.slice(1);
    if (d.length === 10) return '90' + d;
    return d;
  }
  function waLink(tel, metin) {
    var n = waNumara(tel);
    return n ? 'https://wa.me/' + n + (metin ? '?text=' + encodeURIComponent(metin) : '') : '';
  }

  /* Vurgu rengi: geçerli #rrggbb ise kullan, okunur yazı rengini seç */
  function renkUygula(hex) {
    if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return;
    var r = parseInt(hex.substr(1, 2), 16), g = parseInt(hex.substr(3, 2), 16), b = parseInt(hex.substr(5, 2), 16);
    var l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    var root = document.documentElement.style;
    root.setProperty('--accent', hex);
    root.setProperty('--accent-ink', l > 0.62 ? '#17181c' : '#ffffff');
  }

  var IKON = {
    etiket: '<path d="M3 12V4h8l9 9-8 8-9-9z"/><circle cx="7.5" cy="8.5" r="1.2"/>',
    belge: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    kalem: '<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>',
    tabak: '<path d="M7 3v8M5 3v5a2 2 0 004 0V3M7 11v10M17 3c-2 2-3 4-3 7h3v11"/>',
    yildiz: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
    eposta: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    galeri: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M3 17l5-4 4 3 3-2 6 4"/>',
    muzik: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
    makyaj: '<path d="M8 21v-6h8v6zM9 15v-4h6v4M10 11V5.5L14 3v8"/>',
    el: '<path d="M3 11l4-4 5 2 5-2 4 4-7 8a2 2 0 01-3 0z"/>',
    hediye: '<rect x="3" y="9" width="18" height="12" rx="1"/><path d="M12 9v12M3 13h18M12 9c-3-5-7-3-5 0M12 9c3-5 7-3 5 0"/>',
    oynat: '<path d="M8 5v14l11-7z"/>',
    whatsapp: '<path d="M4 20l1.4-4.2A8 8 0 1112 20a8 8 0 01-3.8-1z"/><path d="M9 9c0 3 3 6 6 6l1-1.5-2-1-1 .7c-1-.5-2-1.500-2.500-2.500l.7-1-1-2z"/>',
    telefon: '<path d="M5 4h4l2 5-2.500 1.500a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',
    konum: '<path d="M12 21s7-6.100 7-11a7 7 0 10-14 0c0 4.900 7 11 7 11z"/><circle cx="12" cy="10" r="2.500"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.500" cy="6.500" r="1"/>',
    takvim: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    kapat: '<path d="M6 6l12 12M18 6L6 18"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    ok: '<path d="M5 12l5 5 9-10"/>',
    sag: '<path d="M9 5l7 7-7 7"/>',
    sol: '<path d="M15 5l-7 7 7 7"/>',
    web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    kilit: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
    indir: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>'
  };
  function ikon(ad, boyut) {
    var b = boyut || 22;
    return '<svg class="ik" width="' + b + '" height="' + b + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IKON[ad] || '') + '</svg>';
  }

  var toastT = null;
  function bildir(metin, tur) {
    var t = document.getElementById('bildirim');
    if (!t) { t = document.createElement('div'); t.id = 'bildirim'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
    t.className = 'bildirim ' + (tur || '');
    t.textContent = metin;
    t.classList.add('acik');
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove('acik'); }, tur === 'hata' ? 5200 : 2600);
  }

  var HATA = {
    mekan_yok: 'Mekan bulunamadı.',
    gecersiz_tur: 'Geçersiz istek türü.',
    ad_soyad_gerekli: 'Ad ve soyadı en az 2 harfle yazın.',
    telefon_gecersiz: 'Telefon numarasını başında 0 ile, 11 haneli yazın. Örnek: 0532 123 45 67',
    eposta_gecersiz: 'E-posta adresi geçersiz görünüyor. Örnek: ad@ornek.com',
    tarih_gecersiz: 'Düğün tarihi bugünden sonra olmalı.',
    kvkk_onayi_gerekli: 'Devam etmek için aydınlatma metnini onaylayın.',
    not_cok_uzun: 'Notunuz çok uzun. 1500 karakteri geçmeyin.',
    cok_fazla_kalem: 'Çok fazla hizmet seçildi.',
    cok_fazla_istek: 'Kısa sürede çok fazla istek gönderildi. Lütfen biraz sonra tekrar deneyin.',
    cok_fazla_deneme: 'Çok fazla yanlış deneme yapıldı. 10 dakika sonra tekrar deneyin.',
    salon_gecersiz: 'Seçilen salon geçerli değil.',
    menu_gecersiz: 'Seçilen menü geçerli değil.',
    yetki_yok: 'Bu işlem için yetkiniz yok.',
    kayit_yok: 'Kayıt bulunamadı.'
  };
  function hataMetni(err) {
    var m = err && err.message ? String(err.message) : '';
    if (HATA[m]) return HATA[m];
    if (/Failed to fetch|NetworkError|network/i.test(m)) return 'Bağlantı kurulamadı. İnternetinizi kontrol edip tekrar deneyin.';
    if (/JWT|apikey|Invalid API key/i.test(m)) return 'Site ayarında bir sorun var (anahtar). Lütfen yönetici ile iletişime geçin.';
    if (/row-level security|permission denied/i.test(m)) return 'Bu işlem için yetkiniz yok.';
    if (/duplicate key.*cift_salon_gun_tek/i.test(m)) return 'Bu salonda bu tarih için zaten onaylı bir düğün var.';
    return 'Bir sorun oluştu. Tekrar deneyin. (' + (m || 'bilinmeyen hata') + ')';
  }

  window.ORTAK = {
    esc: esc, para: para, tarihTR: tarihTR, tarihNesne: tarihNesne, bugunISO: bugunISO, isoYap: isoYap, AYLAR: AYLAR,
    guvenliUrl: guvenliUrl, instagramUrl: instagramUrl, waNumara: waNumara, waLink: waLink,
    renkUygula: renkUygula, ikon: ikon, bildir: bildir, hataMetni: hataMetni
  };
})();
