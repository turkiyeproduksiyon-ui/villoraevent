/* Mekan paneli: takip, takvim, rapor, içerik, ayarlar. Her mekan sadece kendi verisini görür (veritabanı kuralı). */
(function () {
  'use strict';
  var O = window.ORTAK, esc = O.esc, ik = O.ikon, A = window.AYAR;
  var $ = function (s, k) { return (k || document).querySelector(s); };
  var $$ = function (s, k) { return Array.prototype.slice.call((k || document).querySelectorAll(s)); };

  var sb = null, M = null, MEKANLAR = [], GIZLI = null;
  var D = { salon: [], kat: [], kalem: [], menu: [] };
  var K = [];                       // cift_kayit_ozet satırları
  var sekme = 'takip', filtre = { ara: '', durum: '', yil: '' };

  var DURUM = [['yeni', 'Yeni'], ['teklif_verildi', 'Teklif verildi'], ['rezerve', 'Rezerve'], ['sozlesme', 'Sözleşme yapıldı'], ['tamamlandi', 'Tamamlandı'], ['iptal', 'İptal']];
  var DURUM_AD = {}; DURUM.forEach(function (d) { DURUM_AD[d[0]] = d[1]; });
  var DOLU = ['rezerve', 'sozlesme', 'tamamlandi'];

  /* ---------- Yardımcılar ---------- */
  async function q(p) { var r = await p; if (r.error) throw r.error; return r.data; }
  async function guncelle(tablo, id, obj) {
    var r = await sb.from(tablo).update(obj).eq('id', id).select();
    if (r.error) throw r.error;
    if (!r.data || !r.data.length) throw new Error('yetki_yok');
    return r.data[0];
  }
  async function ekle(tablo, obj) {
    var r = await sb.from(tablo).insert(Object.assign({ mekan_id: M.id }, obj)).select();
    if (r.error) throw r.error;
    return r.data[0];
  }
  async function sil(tablo, id) { var r = await sb.from(tablo).delete().eq('id', id).select(); if (r.error) throw r.error; }
  function hata(e) { if (window.console) console.error(e); O.bildir(O.hataMetni(e), 'hata'); }
  function sayi(v) { return (v === '' || v === null || v === undefined || isNaN(Number(v))) ? null : Number(v); }
  function topla(kalemler) { return (kalemler || []).reduce(function (t, r) { return r.fiyat === null || r.fiyat === undefined || r.fiyat === '' ? t : t + Number(r.fiyat) * (Number(r.adet) || 1); }, 0); }
  function salonAd(id) { var s = D.salon.filter(function (x) { return x.id === id; })[0]; return s ? s.ad : ''; }
  function rozet(d) { return '<span class="rozet d-' + esc(d) + '">' + esc(DURUM_AD[d] || d) + '</span>'; }
  function aktifSayfa() { return document.getElementById('icerik'); }
  function uuid() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)); }

  /* ---------- Pencere ---------- */
  var pencereler = [];
  function pencere(baslik, govde, ops) {
    ops = ops || {};
    var perde = document.createElement('div');
    perde.className = 'perde';
    perde.innerHTML = '<div class="pencere' + (ops.genis ? ' genis' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(baslik) + '" tabindex="-1"><div class="pencere-ust"><h2>' + esc(baslik) + '</h2>' +
      '<button class="kapat" type="button" aria-label="Kapat">' + ik('kapat') + '</button></div><div class="pencere-ic">' + govde + '</div></div>';
    document.body.appendChild(perde);
    document.body.style.overflow = 'hidden';
    var p = { el: perde, ic: $('.pencere-ic', perde), kapat: function () { kapatPencere(p); } };
    perde.addEventListener('mousedown', function (e) { if (e.target === perde) p.kapat(); });
    $('.kapat', perde).addEventListener('click', p.kapat);
    p.tus = function (e) { if (e.key === 'Escape' && pencereler[pencereler.length - 1] === p) p.kapat(); };
    document.addEventListener('keydown', p.tus);
    pencereler.push(p);
    $('.pencere', perde).focus();
    return p;
  }
  function kapatPencere(p) {
    var i = pencereler.indexOf(p); if (i < 0) return;
    pencereler.splice(i, 1);
    document.removeEventListener('keydown', p.tus);
    p.el.remove();
    if (!pencereler.length) document.body.style.overflow = '';
    if (p.kapaninca) p.kapaninca();
  }
  function onay(metin) { return window.confirm(metin); }

  /* ---------- Başlangıç ve giriş ---------- */
  function basla() {
    if (!window.supabase || !A || !A.SUPABASE_KEY || A.SUPABASE_KEY.indexOf('ANAHTAR') > -1) {
      $('#kok').innerHTML = '<div class="giris-kutu"><h1>Panel hazır değil</h1><p class="not">Bağlantı ayarı (js/config.js) eksik.</p></div>';
      return;
    }
    sb = window.supabase.createClient(A.SUPABASE_URL, A.SUPABASE_KEY);
    sb.auth.onAuthStateChange(function (ev) { if (ev === 'SIGNED_OUT') girisCiz(); });
    sb.auth.getSession().then(function (r) {
      if (r.data && r.data.session) panelYukle(); else girisCiz();
    });
  }

  function girisCiz() {
    M = null;
    $('#kok').innerHTML = '<div class="giris-kutu"><h1>Mekan paneli</h1><p class="not" style="margin:0 0 20px">E-posta ve şifrenizle giriş yapın.</p>' +
      '<form id="gf" novalidate><label class="alan"><span>E-posta</span><input name="e" type="email" autocomplete="username" inputmode="email" required></label>' +
      '<label class="alan"><span>Şifre</span><input name="s" type="password" autocomplete="current-password" required></label>' +
      '<div id="gh"></div><button class="btn ana tam" type="submit">Giriş yap</button></form></div>';
    $('#gf').addEventListener('submit', async function (e) {
      e.preventDefault();
      var f = e.target, d = $('button', f); d.disabled = true;
      var r = await sb.auth.signInWithPassword({ email: f.e.value.trim(), password: f.s.value });
      d.disabled = false;
      if (r.error) { $('#gh').innerHTML = '<div class="hata-kutu" role="alert">E-posta ya da şifre yanlış.</div>'; return; }
      panelYukle();
    });
  }

  async function panelYukle() {
    $('#kok').innerHTML = '<div class="isleniyor">Yükleniyor...</div>';
    try {
      var y = await q(sb.from('mekan_yoneticileri').select('mekan_id'));
      if (!y.length) { $('#kok').innerHTML = '<div class="giris-kutu"><h1>Mekan bulunamadı</h1><p class="not">Bu hesaba bağlı bir mekan yok. Lütfen yöneticinizle iletişime geçin.</p><button class="btn cizgi tam" id="cik">Çıkış yap</button></div>'; $('#cik').addEventListener('click', cikis); return; }
      MEKANLAR = await q(sb.from('mekanlar').select('id,ad,slug').in('id', y.map(function (x) { return x.mekan_id; })).order('ad'));
      var secili = null; try { secili = localStorage.getItem('mekan_id'); } catch (e) { /* yok */ }
      await mekanSec(MEKANLAR.filter(function (m) { return m.id === secili; })[0] ? secili : MEKANLAR[0].id);
    } catch (e) { hata(e); $('#kok').innerHTML = '<div class="giris-kutu"><h1>Panel açılamadı</h1><p class="not">' + esc(O.hataMetni(e)) + '</p><button class="btn cizgi tam" id="cik">Çıkış yap</button></div>'; $('#cik').addEventListener('click', cikis); }
  }

  async function mekanSec(id) {
    try { localStorage.setItem('mekan_id', id); } catch (e) { /* yok */ }
    M = await q(sb.from('mekanlar').select('*').eq('id', id).single());
    var g = await sb.from('mekan_gizli').select('ntfy_topic').eq('mekan_id', id).maybeSingle();
    GIZLI = g.data || null;
    O.renkUygula(M.ana_renk);
    var x = await Promise.all([
      q(sb.from('salonlar').select('*').eq('mekan_id', id).order('sira')),
      q(sb.from('fiyat_kategorileri').select('*').eq('mekan_id', id).order('sira')),
      q(sb.from('fiyat_kalemleri').select('*').eq('mekan_id', id).order('sira')),
      q(sb.from('menuler').select('*').eq('mekan_id', id).order('sira'))
    ]);
    D.salon = x[0]; D.kat = x[1]; D.kalem = x[2]; D.menu = x[3];
    await kayitlariYukle();
    iskeletCiz();
  }

  async function cikis() { await sb.auth.signOut(); }

  async function kayitlariYukle() {
    K = await q(sb.from('cift_kayit_ozet').select('*').eq('mekan_id', M.id).order('olusturma', { ascending: false }).limit(3000));
  }

  /* ---------- İskelet ---------- */
  var SEKMELER = [['takip', 'Takip'], ['takvim', 'Takvim'], ['rapor', 'Rapor'], ['icerik', 'Site içeriği'], ['ayar', 'Site ayarı'], ['hesap', 'Hesap']];
  function iskeletCiz() {
    var yeni = K.filter(function (k) { return k.durum === 'yeni'; }).length;
    var h = '<header class="p-ust"><div class="p-marka"><b>' + esc(M.ad) + '</b>' +
      (MEKANLAR.length > 1 ? '<select id="mekanSec" aria-label="Mekan">' + MEKANLAR.map(function (m) { return '<option value="' + esc(m.id) + '"' + (m.id === M.id ? ' selected' : '') + '>' + esc(m.ad) + '</option>'; }).join('') + '</select>' : '') + '</div>' +
      '<div class="p-sag"><a class="btn cizgi kucuk" target="_blank" rel="noopener" href="./">Siteyi aç</a><button class="btn cizgi kucuk" id="cikBtn">Çıkış</button></div></header>';
    h += '<nav class="p-sekme" role="tablist">' + SEKMELER.map(function (s) {
      return '<button role="tab" data-t="' + s[0] + '" aria-selected="' + (s[0] === sekme) + '">' + esc(s[1]) + (s[0] === 'takip' && yeni ? ' <span class="sayac">' + yeni + '</span>' : '') + '</button>';
    }).join('') + '</nav><main id="icerik" class="p-ic"></main>';
    $('#kok').innerHTML = h;
    $('#cikBtn').addEventListener('click', cikis);
    var ms = $('#mekanSec'); if (ms) ms.addEventListener('change', function () { mekanSec(ms.value).catch(hata); });
    $('.p-sekme').addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (b) git(b.getAttribute('data-t')); });
    sekmeCiz();
  }
  function git(t) {
    sekme = t;
    $$('.p-sekme button').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-t') === t ? 'true' : 'false'); });
    sekmeCiz();
  }
  function sekmeCiz() {
    var f = { takip: takipCiz, takvim: takvimCiz, rapor: raporCiz, icerik: icerikCiz, ayar: ayarCiz, hesap: hesapCiz }[sekme];
    Promise.resolve().then(f).catch(hata);
  }
  async function yenile() { await kayitlariYukle(); iskeletCiz(); }

  /* ================= TAKİP ================= */
  function yillar() {
    var s = {}; K.forEach(function (k) { if (k.dugun_tarihi) s[k.dugun_tarihi.slice(0, 4)] = 1; });
    return Object.keys(s).sort().reverse();
  }
  function takipCiz() {
    var say = {}; K.forEach(function (k) { say[k.durum] = (say[k.durum] || 0) + 1; });
    var h = '<div class="arac"><input id="ara" type="search" placeholder="Ad, telefon ya da e-posta ara" value="' + esc(filtre.ara) + '" aria-label="Ara">' +
      '<select id="fd" aria-label="Duruma göre"><option value="">Tüm durumlar</option>' + DURUM.map(function (d) { return '<option value="' + d[0] + '"' + (filtre.durum === d[0] ? ' selected' : '') + '>' + d[1] + (say[d[0]] ? ' (' + say[d[0]] + ')' : '') + '</option>'; }).join('') + '</select>' +
      '<select id="fy" aria-label="Düğün yılı"><option value="">Tüm yıllar</option>' + yillar().map(function (y) { return '<option' + (filtre.yil === y ? ' selected' : '') + '>' + y + '</option>'; }).join('') + '</select>' +
      '<button class="btn ana" id="yeniKayit">Yeni kayıt</button><button class="btn cizgi" id="csv">Excel için indir</button></div><div id="liste"></div>';
    aktifSayfa().innerHTML = h;
    $('#ara').addEventListener('input', function (e) { filtre.ara = e.target.value; listeCiz(); });
    $('#fd').addEventListener('change', function (e) { filtre.durum = e.target.value; listeCiz(); });
    $('#fy').addEventListener('change', function (e) { filtre.yil = e.target.value; listeCiz(); });
    $('#yeniKayit').addEventListener('click', function () { yeniKayitAc(); });
    $('#csv').addEventListener('click', csvIndir);
    listeCiz();
  }
  function listeCiz() {
    var a = filtre.ara.toLocaleLowerCase('tr'), n = 0, h = '';
    K.forEach(function (k) {
      if (filtre.durum && k.durum !== filtre.durum) return;
      if (filtre.yil && (k.dugun_tarihi || '').slice(0, 4) !== filtre.yil) return;
      if (a && (k.ad + ' ' + k.soyad + ' ' + k.telefon + ' ' + (k.eposta || '')).toLocaleLowerCase('tr').indexOf(a) < 0) return;
      n++;
      h += '<button class="kayit' + (k.durum === 'yeni' ? ' yeni' : '') + '" data-id="' + esc(k.id) + '"><div class="k-ust"><b>' + esc(k.ad + ' ' + k.soyad) + '</b>' + rozet(k.durum) + '</div>' +
        '<div class="k-alt"><span>' + esc(k.dugun_tarihi ? O.tarihTR(k.dugun_tarihi) : 'Tarih yok') + '</span>' + (k.salon_id ? '<span>' + esc(salonAd(k.salon_id)) + '</span>' : '') +
        (k.kisi_sayisi ? '<span>' + esc(k.kisi_sayisi) + ' kişi</span>' : '') + '<span class="soluk">' + esc(k.kaynak === 'teklif' ? 'Teklif talebi' : k.kaynak === 'talep' ? 'Talep' : 'Elle girildi') + '</span></div>' +
        (Number(k.tutar) > 0 ? '<div class="k-alt"><span>Tutar <b>' + esc(O.para(k.tutar)) + '</b></span><span>Ödenen <b>' + esc(O.para(k.odenen)) + '</b></span><span>Kalan <b>' + esc(O.para(k.kalan)) + '</b></span></div>' : '') + '</button>';
    });
    $('#liste').innerHTML = n ? h : '<div class="bos">' + (K.length ? 'Bu filtreyle kayıt yok.' : 'Henüz kayıt yok. Sitenizden gelen teklif ve talepler burada görünecek. "Yeni kayıt" ile elle de ekleyebilirsiniz.') + '</div>';
    $$('.kayit', $('#liste')).forEach(function (b) { b.addEventListener('click', function () { kayitAc(b.getAttribute('data-id')); }); });
  }

  /* ---- CSV ---- */
  function csvHucre(v) {
    var s = v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;           // Excel formül enjeksiyonuna karşı
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function csvIndir() {
    var baslik = ['Ad', 'Soyad', 'Telefon', 'E-posta', 'Adres', 'Düğün tarihi', 'Salon', 'Durum', 'Kişi sayısı', 'Tutar', 'Ödenen', 'Kalan', 'Kaynak', 'Kayıt tarihi', 'İç not'];
    var satir = K.map(function (k) {
      return [k.ad, k.soyad, k.telefon, k.eposta, k.adres, k.dugun_tarihi, salonAd(k.salon_id), DURUM_AD[k.durum], k.kisi_sayisi, k.tutar, k.odenen, k.kalan, k.kaynak, (k.olusturma || '').slice(0, 10), k.ic_not].map(csvHucre).join(';');
    });
    var blob = new Blob(['﻿' + baslik.map(csvHucre).join(';') + '\r\n' + satir.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'kayitlar-' + O.bugunISO() + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  /* ---- Yeni kayıt ---- */
  function salonSecenek(secili, bos) {
    return (bos !== false ? '<option value="">' + (bos || 'Seçilmedi') + '</option>' : '') + D.salon.map(function (s) { return '<option value="' + esc(s.id) + '"' + (s.id === secili ? ' selected' : '') + '>' + esc(s.ad) + '</option>'; }).join('');
  }
  function yeniKayitAc(tarih) {
    var p = pencere('Yeni kayıt', '<form id="yk" novalidate><div class="ikili"><label class="alan"><span>Ad</span><input name="ad" required></label><label class="alan"><span>Soyad</span><input name="soyad" required></label></div>' +
      '<div class="ikili"><label class="alan"><span>Telefon</span><input name="telefon" type="tel" required></label><label class="alan"><span>E-posta <em>(isteğe bağlı)</em></span><input name="eposta" type="email"></label></div>' +
      '<div class="ikili"><label class="alan"><span>Düğün tarihi</span><input name="tarih" type="date" value="' + esc(tarih || '') + '"></label><label class="alan"><span>Kişi sayısı</span><input name="kisi" type="number" min="1"></label></div>' +
      '<div class="ikili"><label class="alan"><span>Salon</span><select name="salon">' + salonSecenek('') + '</select></label><label class="alan"><span>Durum</span><select name="durum">' +
      DURUM.map(function (d) { return '<option value="' + d[0] + '"' + (d[0] === 'rezerve' ? ' selected' : '') + '>' + d[1] + '</option>'; }).join('') + '</select></label></div>' +
      '<label class="alan"><span>İç not <em>(çift görmez)</em></span><textarea name="not"></textarea></label><div id="ykh"></div><button class="btn ana tam" type="submit">Kaydet</button></form>');
    $('#yk', p.ic).addEventListener('submit', async function (e) {
      e.preventDefault();
      var f = e.target, v = function (n) { return f.elements[n].value.trim(); };
      if (v('ad').length < 1 || v('soyad').length < 1 || v('telefon').length < 5) { $('#ykh', p.ic).innerHTML = '<div class="hata-kutu">Ad, soyad ve telefon gerekli.</div>'; return; }
      try {
        await ekle('cift_kayitlari', { kaynak: 'elle', durum: v('durum'), ad: v('ad'), soyad: v('soyad'), telefon: v('telefon'), eposta: v('eposta') || null, dugun_tarihi: v('tarih') || null, kisi_sayisi: sayi(v('kisi')), salon_id: v('salon') || null, ic_not: v('not') || null });
        p.kapat(); O.bildir('Kayıt eklendi', 'ok'); await yenile();
      } catch (er) { $('#ykh', p.ic).innerHTML = '<div class="hata-kutu">' + esc(O.hataMetni(er)) + '</div>'; }
    });
  }

  /* ---- Kayıt detayı ---- */
  async function kayitAc(id) {
    var k = K.filter(function (x) { return x.id === id; })[0]; if (!k) return;
    var S = { k: k, kalem: [], odeme: [], hesap: null, silinecek: [], yeniKod: '' };
    try {
      var x = await Promise.all([
        q(sb.from('teklif_kalemleri').select('*').eq('kayit_id', id).order('sira').order('kalem_ad')),
        q(sb.from('odemeler').select('*').eq('kayit_id', id).order('vade_tarihi', { ascending: true, nullsFirst: false })),
        sb.from('cift_hesaplari').select('*').eq('kayit_id', id).maybeSingle()
      ]);
      S.kalem = x[0]; S.odeme = x[1]; S.hesap = x[2].data || null;
    } catch (e) { hata(e); return; }

    var p = pencere(k.ad + ' ' + k.soyad, '<div id="d-bilgi"></div><div id="d-kalem"></div><div id="d-odeme"></div><div id="d-hesap"></div>', { genis: true });
    p.kapaninca = function () { yenile().catch(hata); };
    var ic = p.ic;

    function bolum(baslik, govde, acik) { return '<details class="bolum"' + (acik ? ' open' : '') + '><summary>' + esc(baslik) + '</summary><div class="bolum-ic">' + govde + '</div></details>'; }

    /* a) Bilgiler */
    function cizBilgi() {
      var c = S.k;
      $('#d-bilgi', ic).innerHTML = bolum('Çift ve düğün bilgileri',
        '<div class="ozet-satir">' + rozet(c.durum) + '<span class="soluk">' + esc(c.kaynak === 'teklif' ? 'Siteden teklif talebi' : c.kaynak === 'talep' ? 'Siteden talep' : 'Elle girildi') + ' · ' + esc((c.olusturma || '').slice(0, 10)) + '</span></div>' +
        (c.musteri_notu ? '<div class="alinti"><b>Çiftin notu</b><br>' + esc(c.musteri_notu) + '</div>' : '') +
        '<form id="bf" novalidate><div class="ikili"><label class="alan"><span>Ad</span><input name="ad" value="' + esc(c.ad) + '"></label><label class="alan"><span>Soyad</span><input name="soyad" value="' + esc(c.soyad) + '"></label></div>' +
        '<div class="ikili"><label class="alan"><span>Telefon</span><input name="telefon" type="tel" value="' + esc(c.telefon) + '"></label><label class="alan"><span>E-posta</span><input name="eposta" type="email" value="' + esc(c.eposta || '') + '"></label></div>' +
        '<label class="alan"><span>Adres <em>(isteğe bağlı)</em></span><input name="adres" value="' + esc(c.adres || '') + '"></label>' +
        '<div class="ikili"><label class="alan"><span>Durum</span><select name="durum">' + DURUM.map(function (d) { return '<option value="' + d[0] + '"' + (c.durum === d[0] ? ' selected' : '') + '>' + d[1] + '</option>'; }).join('') + '</select></label>' +
        '<label class="alan"><span>Salon</span><select name="salon">' + salonSecenek(c.salon_id) + '</select></label></div>' +
        '<div class="ikili"><label class="alan"><span>Düğün tarihi</span><input name="tarih" type="date" value="' + esc(c.dugun_tarihi || '') + '"></label><label class="alan"><span>Kişi sayısı</span><input name="kisi" type="number" min="1" value="' + esc(c.kisi_sayisi || '') + '"></label></div>' +
        '<label class="alan"><span>Anlaşılan tutar <em>(boş bırakırsanız teklif toplamı kullanılır)</em></span><input name="tutar" type="number" step="0.01" min="0" value="' + esc(c.anlasma_tutari == null ? '' : c.anlasma_tutari) + '"></label>' +
        '<label class="alan"><span>İç not <em>(çift görmez)</em></span><textarea name="not">' + esc(c.ic_not || '') + '</textarea></label>' +
        '<div id="bfh"></div><button class="btn ana" type="submit">Bilgileri kaydet</button></form>', true);
      $('#bf', ic).addEventListener('submit', async function (e) {
        e.preventDefault();
        var f = e.target, v = function (n) { return f.elements[n].value.trim(); };
        try {
          await guncelle('cift_kayitlari', c.id, { ad: v('ad'), soyad: v('soyad'), telefon: v('telefon'), eposta: v('eposta') || null, adres: v('adres') || null, durum: v('durum'), salon_id: v('salon') || null, dugun_tarihi: v('tarih') || null, kisi_sayisi: sayi(v('kisi')), anlasma_tutari: sayi(v('tutar')), ic_not: v('not') || null });
          await tazele(); O.bildir('Kaydedildi', 'ok');
        } catch (er) { $('#bfh', ic).innerHTML = '<div class="hata-kutu">' + esc(O.hataMetni(er)) + '</div>'; }
      });
    }

    async function tazele() {
      await kayitlariYukle();
      S.k = K.filter(function (x) { return x.id === id; })[0] || S.k;
      S.kalem = await q(sb.from('teklif_kalemleri').select('*').eq('kayit_id', id).order('sira').order('kalem_ad'));
      S.silinecek = [];
      S.odeme = await q(sb.from('odemeler').select('*').eq('kayit_id', id).order('vade_tarihi', { ascending: true, nullsFirst: false }));
      cizBilgi(); cizKalem(); cizOdeme();
    }

    /* b) Teklif kalemleri */
    function teklifMetni() {
      var c = S.k, satirlar = S.kalem.filter(function (r) { return r.fiyat !== null && r.fiyat !== undefined && r.fiyat !== ''; }).map(function (r) {
        return '- ' + r.kalem_ad + (Number(r.adet) !== 1 ? ' (' + r.adet + ' adet/kişi)' : '') + ': ' + O.para(Number(r.fiyat) * Number(r.adet));
      });
      return 'Merhaba ' + c.ad + ', ' + M.ad + ' olarak ' + (c.dugun_tarihi ? O.tarihTR(c.dugun_tarihi) + ' tarihli ' : '') + 'düğününüz için teklifimiz:\n' + satirlar.join('\n') + '\nToplam: ' + O.para(topla(S.kalem)) + '\n\nSorularınız için bize yazabilirsiniz.';
    }
    function cizKalem() {
      var h = '<div class="tablo-kaydir"><table class="tablo"><thead><tr><th>Hizmet</th><th class="sa">Adet / kişi</th><th class="sa">Birim fiyat (TL)</th><th class="sa">Tutar</th><th></th></tr></thead><tbody>';
      S.kalem.forEach(function (r, i) {
        h += '<tr data-i="' + i + '"><td><input class="k-ad" value="' + esc(r.kalem_ad) + '" aria-label="Hizmet"></td><td class="sa"><input class="k-adet" type="number" min="0.01" step="any" value="' + esc(r.adet) + '" aria-label="Adet"></td>' +
          '<td class="sa"><input class="k-fy" type="number" min="0" step="0.01" value="' + esc(r.fiyat == null ? '' : r.fiyat) + '" placeholder="fiyat yazın" aria-label="Birim fiyat"></td><td class="sa k-top">' + esc(r.fiyat == null || r.fiyat === '' ? '' : O.para(Number(r.fiyat) * Number(r.adet))) + '</td>' +
          '<td class="sa"><button class="btn tehlike kucuk k-sil" type="button" aria-label="Satırı sil">Sil</button></td></tr>';
      });
      h += '</tbody><tfoot><tr><td colspan="3" class="sa"><b>Toplam</b></td><td class="sa" id="topTop"><b>' + esc(O.para(topla(S.kalem))) + '</b></td><td></td></tr></tfoot></table></div>';
      if (!S.kalem.length) h = '<div class="bos kucuk-bos">Çift hizmet seçmediyse buradan ekleyebilirsiniz.</div>';
      h += '<div class="satir-arac"><select id="kEkleSec" aria-label="Listeden hizmet ekle"><option value="">Listeden hizmet ekle...</option>' +
        D.kalem.map(function (r) { return '<option value="' + esc(r.id) + '">' + esc(r.ad) + '</option>'; }).join('') + '<option value="_ozel">Özel kalem...</option></select>' +
        '<button class="btn cizgi kucuk" id="kDoldur" type="button">Liste fiyatlarını doldur</button><button class="btn ana kucuk" id="kKaydet" type="button">Teklifi kaydet</button></div>' +
        '<div class="satir-arac"><a class="btn hafif kucuk" id="kWa" target="_blank" rel="noopener">' + ik('whatsapp', 18) + 'WhatsApp ile gönder</a><a class="btn hafif kucuk" id="kMail">E-posta ile gönder</a></div>' +
        '<p class="not">Fiyatları yazıp "Teklifi kaydet" deyin. Gönder düğmeleri teklif metnini hazır açar, siz onaylayıp gönderirsiniz.</p>';
      $('#d-kalem', ic).innerHTML = bolum('Teklif (istenen hizmetler ve fiyatlar)', h, true);
      var govde = $('#d-kalem', ic);
      function hesapla() {
        $('#topTop', govde).innerHTML = '<b>' + esc(O.para(topla(S.kalem))) + '</b>';
        $$('tbody tr', govde).forEach(function (tr) { var r = S.kalem[+tr.getAttribute('data-i')]; $('.k-top', tr).textContent = r.fiyat == null || r.fiyat === '' ? '' : O.para(Number(r.fiyat) * Number(r.adet)); });
        linkler();
      }
      function linkler() {
        var m = teklifMetni(), wa = O.waLink(S.k.telefon, m);
        var a = $('#kWa', govde); if (wa) a.href = wa; else a.classList.add('gizli');
        var e = $('#kMail', govde);
        if (S.k.eposta) e.href = 'mailto:' + encodeURIComponent(S.k.eposta).replace('%40', '@') + '?subject=' + encodeURIComponent(M.ad + ' teklifi') + '&body=' + encodeURIComponent(m); else e.classList.add('gizli');
      }
      linkler();
      var tb = $('tbody', govde);
      if (tb) {
        tb.addEventListener('input', function (e) {
          var tr = e.target.closest('tr'); if (!tr) return;
          var r = S.kalem[+tr.getAttribute('data-i')];
          if (e.target.classList.contains('k-ad')) r.kalem_ad = e.target.value;
          if (e.target.classList.contains('k-adet')) r.adet = e.target.value === '' ? 1 : Number(e.target.value);
          if (e.target.classList.contains('k-fy')) r.fiyat = e.target.value === '' ? null : Number(e.target.value);
          hesapla();
        });
        tb.addEventListener('click', function (e) {
          var b = e.target.closest('.k-sil'); if (!b) return;
          var i = +b.closest('tr').getAttribute('data-i'), r = S.kalem[i];
          if (r.id) S.silinecek.push(r.id);
          S.kalem.splice(i, 1); cizKalem();
        });
      }
      $('#kEkleSec', govde).addEventListener('change', function (e) {
        var v = e.target.value; if (!v) return;
        var l = D.kalem.filter(function (x) { return x.id === v; })[0];
        if (v === '_ozel') S.kalem.push({ kalem_ad: 'Özel kalem', adet: 1, fiyat: null, kalem_id: null });
        else if (l) S.kalem.push({ kalem_ad: l.ad, adet: l.birim === 'kisi_basi' && S.k.kisi_sayisi ? S.k.kisi_sayisi : 1, fiyat: l.fiyat, kalem_id: l.id });
        cizKalem();
      });
      $('#kDoldur', govde).addEventListener('click', function () {
        S.kalem.forEach(function (r) {
          var l = D.kalem.filter(function (x) { return x.id === r.kalem_id; })[0];
          if (l && (r.fiyat === null || r.fiyat === undefined) && l.fiyat != null) { r.fiyat = l.fiyat; if (l.birim === 'kisi_basi' && S.k.kisi_sayisi) r.adet = S.k.kisi_sayisi; }
        });
        cizKalem();
      });
      $('#kKaydet', govde).addEventListener('click', async function () {
        try {
          var ops = [];
          S.silinecek.forEach(function (rid) { ops.push(sil('teklif_kalemleri', rid)); });
          S.kalem.forEach(function (r, i) {
            var o = { kalem_ad: String(r.kalem_ad || '').trim(), adet: Number(r.adet) > 0 ? Number(r.adet) : 1, fiyat: r.fiyat === '' || r.fiyat == null ? null : Number(r.fiyat), sira: i };
            if (!o.kalem_ad) return;
            ops.push(r.id ? guncelle('teklif_kalemleri', r.id, o) : ekle('teklif_kalemleri', Object.assign({ kayit_id: id, kalem_id: r.kalem_id || null }, o)));
          });
          await Promise.all(ops);
          if (S.k.durum === 'yeni' && S.kalem.some(function (r) { return r.fiyat != null && r.fiyat !== ''; })) await guncelle('cift_kayitlari', id, { durum: 'teklif_verildi' });
          await tazele(); O.bildir('Teklif kaydedildi', 'ok');
        } catch (er) { hata(er); }
      });
    }

    /* c) Ödemeler */
    function cizOdeme() {
      var tutar = Number(S.k.tutar) || 0, odenen = S.odeme.filter(function (o) { return o.odendi; }).reduce(function (t, o) { return t + Number(o.tutar); }, 0);
      var bekleyen = S.odeme.filter(function (o) { return !o.odendi; }).reduce(function (t, o) { return t + Number(o.tutar); }, 0);
      var h = '<div class="ozet-kutular"><div><span>Toplam tutar</span><b>' + esc(O.para(tutar)) + '</b></div><div><span>Ödenen</span><b>' + esc(O.para(odenen)) + '</b></div><div><span>Kalan borç</span><b>' + esc(O.para(tutar - odenen)) + '</b></div></div>';
      if (S.odeme.length) {
        h += '<ul class="odeme-liste">' + S.odeme.map(function (o) {
          var gec = !o.odendi && o.vade_tarihi && o.vade_tarihi < O.bugunISO();
          return '<li data-id="' + esc(o.id) + '"><label class="odeme-ok"><input type="checkbox" class="o-ok"' + (o.odendi ? ' checked' : '') + ' aria-label="Ödendi"><span><b>' + esc({ kapora: 'Kapora', taksit: 'Taksit', kalan: 'Kalan', diger: 'Diğer' }[o.tur] || o.tur) + '</b> ' + esc(O.para(o.tutar)) + '</span></label>' +
            '<span class="soluk' + (gec ? ' gecikti' : '') + '">' + (o.odendi ? 'Ödendi' + (o.odeme_tarihi ? ' ' + esc(O.tarihTR(o.odeme_tarihi)) : '') : (o.vade_tarihi ? 'Vade ' + esc(O.tarihTR(o.vade_tarihi)) + (gec ? ' (gecikti)' : '') : 'Vade yok')) + '</span>' +
            '<button class="btn tehlike kucuk o-sil" type="button">Sil</button></li>';
        }).join('') + '</ul>';
      }
      h += '<form id="of" class="satir-arac" novalidate><select name="tur" aria-label="Tür"><option value="kapora">Kapora</option><option value="taksit" selected>Taksit</option><option value="kalan">Kalan</option><option value="diger">Diğer</option></select>' +
        '<input name="tutar" type="number" min="0.01" step="0.01" placeholder="Tutar (TL)" aria-label="Tutar"><input name="vade" type="date" aria-label="Vade tarihi">' +
        '<label class="onay-kucuk"><input type="checkbox" name="odendi"> Ödendi</label><button class="btn ana kucuk" type="submit">Ekle</button></form>' +
        (bekleyen > 0 ? '<p class="not">Bekleyen ödemeler toplamı: ' + esc(O.para(bekleyen)) + '</p>' : '');
      $('#d-odeme', ic).innerHTML = bolum('Kapora, taksit ve kalan borç', h, true);
      var g = $('#d-odeme', ic);
      $('#of', g).addEventListener('submit', async function (e) {
        e.preventDefault();
        var f = e.target, t = sayi(f.tutar.value);
        if (!t || t <= 0) { O.bildir('Tutarı yazın', 'hata'); return; }
        try {
          await ekle('odemeler', { kayit_id: id, tur: f.tur.value, tutar: t, vade_tarihi: f.vade.value || null, odendi: f.odendi.checked, odeme_tarihi: f.odendi.checked ? O.bugunISO() : null });
          await tazele();
        } catch (er) { hata(er); }
      });
      g.addEventListener('change', async function (e) {
        var c = e.target.closest('.o-ok'); if (!c) return;
        var oid = c.closest('li').getAttribute('data-id');
        try { await guncelle('odemeler', oid, { odendi: c.checked, odeme_tarihi: c.checked ? O.bugunISO() : null }); await tazele(); } catch (er) { hata(er); await tazele(); }
      });
      g.addEventListener('click', async function (e) {
        var b = e.target.closest('.o-sil'); if (!b) return;
        if (!onay('Bu ödeme satırı silinsin mi?')) return;
        try { await sil('odemeler', b.closest('li').getAttribute('data-id')); await tazele(); } catch (er) { hata(er); }
      });
    }

    /* d) Çiftlere özel */
    function siteAdresi() { return location.origin + location.pathname.replace(/[^/]*$/, ''); }
    function cizHesap() {
      var hs = S.hesap, h = '';
      if (!hs) {
        h = '<p class="not">Anlaşma yaptığınız çifte bir şifre verin. Çift, sitenizdeki "Çiftlere özel" bölümünden bu şifreyle girip fotoğraf ve video bağlantınıza ulaşır.</p>' +
          '<div class="satir-arac"><label class="alan kucuk-alan"><span>Erişim bitiş tarihi <em>(boşsa süresiz)</em></span><input type="date" id="hBitis"></label><button class="btn ana" id="hOlustur" type="button">' + ik('kilit', 18) + 'Çift için şifre oluştur</button></div>';
      } else {
        h = (S.yeniKod ? '<div class="kod-kutu" role="status"><span>Çiftin şifresi (bir daha gösterilmez, şimdi paylaşın):</span><b id="yKod">' + esc(S.yeniKod) + '</b>' +
          '<div class="satir-arac"><button class="btn cizgi kucuk" id="kodKopya" type="button">Kopyala</button><a class="btn hafif kucuk" target="_blank" rel="noopener" href="' + esc(O.waLink(S.k.telefon, 'Merhaba ' + S.k.ad + ', ' + M.ad + ' çiftlerine özel alanına şu adresten girebilirsiniz: ' + siteAdresi() + ' (Çiftlere özel sekmesi). Şifreniz: ' + S.yeniKod) || '#') + '">' + ik('whatsapp', 18) + 'WhatsApp ile gönder</a></div></div>' : '') +
          '<form id="hf" novalidate><label class="alan"><span>Foto ve video indirme bağlantısı <em>(Google Drive, WeTransfer vb.)</em></span><input name="link" type="url" placeholder="https://drive.google.com/..." value="' + esc(hs.indirme_linki || '') + '"></label>' +
          '<p class="not" style="margin-top:-6px">Drive\'da klasörü "Bağlantıya sahip olan herkes görüntüleyebilir" olarak paylaşın. Dosyayı silerseniz bağlantı çalışmaz.</p>' +
          '<label class="alan"><span>Çifte mesaj <em>(isteğe bağlı)</em></span><textarea name="mesaj" maxlength="600">' + esc(hs.mesaj || '') + '</textarea></label>' +
          '<div class="ikili"><label class="alan"><span>Erişim bitiş tarihi</span><input name="bitis" type="date" value="' + esc(hs.bitis || '') + '"></label><label class="alan"><span>Durum</span><select name="aktif"><option value="1"' + (hs.aktif ? ' selected' : '') + '>Açık</option><option value="0"' + (!hs.aktif ? ' selected' : '') + '>Kapalı</option></select></label></div>' +
          '<div class="satir-arac"><button class="btn ana" type="submit">Kaydet</button><button class="btn cizgi" id="hYeni" type="button">Yeni şifre üret</button></div></form>';
      }
      $('#d-hesap', ic).innerHTML = bolum('Çiftlere özel (şifre ve foto/video bağlantısı)', h, true);
      var g = $('#d-hesap', ic);
      var olus = $('#hOlustur', g);
      async function kodUret(bitis) {
        try {
          var r = await sb.rpc('cift_hesabi_olustur', { p_kayit: id, p_bitis: bitis || null });
          if (r.error) throw r.error;
          S.yeniKod = r.data;
          var hh = await sb.from('cift_hesaplari').select('*').eq('kayit_id', id).maybeSingle();
          S.hesap = hh.data || null; cizHesap();
        } catch (er) { hata(er); }
      }
      if (olus) olus.addEventListener('click', function () { kodUret($('#hBitis', g).value); });
      var yeni = $('#hYeni', g);
      if (yeni) yeni.addEventListener('click', function () { if (onay('Eski şifre geçersiz olur, yeni şifre üretilsin mi?')) kodUret(S.hesap && S.hesap.bitis); });
      var kp = $('#kodKopya', g);
      if (kp) kp.addEventListener('click', function () { try { navigator.clipboard.writeText(S.yeniKod); O.bildir('Kopyalandı', 'ok'); } catch (e) { O.bildir('Kopyalanamadı, elle yazın', 'hata'); } });
      var hf = $('#hf', g);
      if (hf) hf.addEventListener('submit', async function (e) {
        e.preventDefault();
        var l = hf.link.value.trim();
        if (l && !O.guvenliUrl(l)) { O.bildir('Bağlantı http:// ya da https:// ile başlamalı', 'hata'); return; }
        try {
          S.hesap = await guncelle('cift_hesaplari', S.hesap.id, { indirme_linki: l ? O.guvenliUrl(l) : null, mesaj: hf.mesaj.value.trim() || null, bitis: hf.bitis.value || null, aktif: hf.aktif.value === '1' });
          O.bildir('Kaydedildi', 'ok');
        } catch (er) { hata(er); }
      });
    }

    cizBilgi(); cizKalem(); cizOdeme(); cizHesap();
  }

  /* ================= TAKVİM ================= */
  var takvimAy = (function () { var d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; })();
  var takvimSalon = '';
  function takvimCiz() {
    var y = takvimAy.y, m = takvimAy.m, ilk = new Date(y, m, 1), gun = new Date(y, m + 1, 0).getDate();
    var bos = (ilk.getDay() + 6) % 7, bugun = O.bugunISO();
    var gk = {};
    K.forEach(function (k) {
      if (!k.dugun_tarihi || k.durum === 'iptal') return;
      if (takvimSalon && k.salon_id !== takvimSalon) return;
      (gk[k.dugun_tarihi] = gk[k.dugun_tarihi] || []).push(k);
    });
    var h = '<div class="arac"><button class="btn cizgi kucuk" id="tOnce" aria-label="Önceki ay">' + ik('sol', 18) + '</button><b class="ay-baslik">' + O.AYLAR[m] + ' ' + y + '</b><button class="btn cizgi kucuk" id="tSonra" aria-label="Sonraki ay">' + ik('sag', 18) + '</button>' +
      '<button class="btn cizgi kucuk" id="tBugun">Bugün</button>' + (D.salon.length > 1 ? '<select id="tSalon" aria-label="Salon"><option value="">Tüm salonlar</option>' + salonSecenek(takvimSalon, false) + '</select>' : '') + '</div>';
    h += '<div class="takvim" role="grid"><div class="t-ad">Pzt</div><div class="t-ad">Sal</div><div class="t-ad">Çar</div><div class="t-ad">Per</div><div class="t-ad">Cum</div><div class="t-ad">Cmt</div><div class="t-ad">Paz</div>';
    for (var i = 0; i < bos; i++) h += '<div class="t-gun bos-gun"></div>';
    for (var d = 1; d <= gun; d++) {
      var iso = O.isoYap(y, m, d), l = gk[iso] || [], dolu = l.some(function (k) { return DOLU.indexOf(k.durum) > -1; });
      h += '<button class="t-gun' + (iso === bugun ? ' bugun' : '') + (dolu ? ' dolu' : '') + (l.length && !dolu ? ' bekle' : '') + '" data-d="' + iso + '"><span class="t-no">' + d + '</span>' +
        l.slice(0, 2).map(function (k) { return '<span class="t-ad-k d-' + esc(k.durum) + '">' + esc(k.ad + ' ' + k.soyad.charAt(0) + '.') + '</span>'; }).join('') + (l.length > 2 ? '<span class="t-daha">+' + (l.length - 2) + '</span>' : '') + '</button>';
    }
    h += '</div><p class="not">Yeşil günler onaylı (rezerve, sözleşme ya da tamamlanan) düğünlerdir. Sarı günlerde bekleyen teklif ve talepler vardır.</p>';
    aktifSayfa().innerHTML = h;
    $('#tOnce').addEventListener('click', function () { takvimAy.m--; if (takvimAy.m < 0) { takvimAy.m = 11; takvimAy.y--; } takvimCiz(); });
    $('#tSonra').addEventListener('click', function () { takvimAy.m++; if (takvimAy.m > 11) { takvimAy.m = 0; takvimAy.y++; } takvimCiz(); });
    $('#tBugun').addEventListener('click', function () { var n = new Date(); takvimAy = { y: n.getFullYear(), m: n.getMonth() }; takvimCiz(); });
    var ts = $('#tSalon'); if (ts) ts.addEventListener('change', function () { takvimSalon = ts.value; takvimCiz(); });
    $('.takvim').addEventListener('click', function (e) { var b = e.target.closest('.t-gun[data-d]'); if (b) gunAc(b.getAttribute('data-d'), gk[b.getAttribute('data-d')] || []); });
  }
  function gunAc(iso, liste) {
    var h = liste.length ? liste.map(function (k) { return '<button class="kayit" data-id="' + esc(k.id) + '"><div class="k-ust"><b>' + esc(k.ad + ' ' + k.soyad) + '</b>' + rozet(k.durum) + '</div><div class="k-alt"><span>' + esc(salonAd(k.salon_id) || 'Salon seçilmedi') + '</span>' + (k.kisi_sayisi ? '<span>' + esc(k.kisi_sayisi) + ' kişi</span>' : '') + '</div></button>'; }).join('') : '<div class="bos kucuk-bos">Bu gün için kayıt yok.</div>';
    h += '<button class="btn ana tam" id="gunEkle" style="margin-top:12px">Bu güne kayıt ekle</button>';
    var p = pencere(O.tarihTR(iso), h);
    $$('.kayit', p.ic).forEach(function (b) { b.addEventListener('click', function () { p.kapat(); kayitAc(b.getAttribute('data-id')); }); });
    $('#gunEkle', p.ic).addEventListener('click', function () { p.kapat(); yeniKayitAc(iso); });
  }

  /* ================= RAPOR ================= */
  var raporYil = new Date().getFullYear();
  async function raporCiz() {
    var r = await q(sb.rpc('yillik_rapor', { p_mekan: M.id, p_yil: raporYil }));
    var ay = {}; (r || []).forEach(function (x) { ay[x.ay] = x; });
    var topAd = 0, topTut = 0, topOd = 0;
    var satir = '';
    for (var i = 1; i <= 12; i++) {
      var x = ay[i] || { dugun_adedi: 0, toplam_tutar: 0, odenen: 0 };
      topAd += Number(x.dugun_adedi); topTut += Number(x.toplam_tutar); topOd += Number(x.odenen);
      satir += '<tr><td>' + O.AYLAR[i - 1] + '</td><td class="sa">' + esc(x.dugun_adedi) + '</td><td class="sa">' + esc(O.para(x.toplam_tutar)) + '</td><td class="sa">' + esc(O.para(x.odenen)) + '</td><td class="sa">' + esc(O.para(Number(x.toplam_tutar) - Number(x.odenen))) + '</td></tr>';
    }
    var yl = {}; yl[raporYil] = 1; yillar().forEach(function (y) { yl[y] = 1; }); yl[new Date().getFullYear()] = 1;
    var h = '<div class="arac"><label class="alan kucuk-alan" style="margin:0"><span class="sr">Yıl</span><select id="rYil">' + Object.keys(yl).sort().reverse().map(function (y) { return '<option' + (+y === raporYil ? ' selected' : '') + '>' + y + '</option>'; }).join('') + '</select></label><button class="btn cizgi" id="csv2">Tüm kayıtları Excel için indir</button></div>' +
      '<div class="ozet-kutular buyuk"><div><span>Düğün sayısı</span><b>' + topAd + '</b></div><div><span>Anlaşılan toplam</span><b>' + esc(O.para(topTut)) + '</b></div><div><span>Tahsil edilen</span><b>' + esc(O.para(topOd)) + '</b></div><div><span>Kalan borç</span><b>' + esc(O.para(topTut - topOd)) + '</b></div></div>' +
      '<div class="tablo-kaydir"><table class="tablo"><thead><tr><th>Ay</th><th class="sa">Düğün</th><th class="sa">Anlaşılan</th><th class="sa">Ödenen</th><th class="sa">Kalan</th></tr></thead><tbody>' + satir + '</tbody><tfoot><tr><td><b>Toplam</b></td><td class="sa"><b>' + topAd + '</b></td><td class="sa"><b>' + esc(O.para(topTut)) + '</b></td><td class="sa"><b>' + esc(O.para(topOd)) + '</b></td><td class="sa"><b>' + esc(O.para(topTut - topOd)) + '</b></td></tr></tfoot></table></div>' +
      '<p class="not">Rapor, düğün tarihi bu yıla düşen ve durumu rezerve, sözleşme yapıldı ya da tamamlandı olan kayıtları sayar. Eski yıllar silinmez, yıl seçerek görebilirsiniz.</p>';
    aktifSayfa().innerHTML = h;
    $('#rYil').addEventListener('change', function (e) { raporYil = +e.target.value; raporCiz().catch(hata); });
    $('#csv2').addEventListener('click', csvIndir);
  }

  /* ================= İÇERİK ================= */
  var icerikAlt = 'fiyat';
  var ALTLAR = [['fiyat', 'Fiyatlar'], ['menu', 'Menüler'], ['foto', 'Fotoğraflar'], ['video', 'Videolar'], ['firma', 'Anlaşmalı firmalar'], ['ozellik', 'Mekan özellikleri'], ['salon', 'Salonlar']];
  function icerikCiz() {
    aktifSayfa().innerHTML = '<div class="alt-sekme" role="tablist">' + ALTLAR.map(function (a) { return '<button role="tab" data-a="' + a[0] + '" aria-selected="' + (a[0] === icerikAlt) + '">' + a[1] + '</button>'; }).join('') + '</div><div id="altIc"></div>';
    $('.alt-sekme').addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      icerikAlt = b.getAttribute('data-a');
      $$('.alt-sekme button').forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
      altCiz();
    });
    altCiz();
  }
  function altCiz() {
    var kap = $('#altIc');
    if (icerikAlt === 'fiyat') { kap.innerHTML = '<div id="kk"></div><div id="kl" style="margin-top:28px"></div>'; crud($('#kk'), CFG.kat); crud($('#kl'), CFG.kalem); }
    else if (icerikAlt === 'foto') fotoCiz(kap);
    else crud(kap, CFG[icerikAlt]);
  }
  async function yerelTazele() {
    D.salon = await q(sb.from('salonlar').select('*').eq('mekan_id', M.id).order('sira'));
    D.kat = await q(sb.from('fiyat_kategorileri').select('*').eq('mekan_id', M.id).order('sira'));
    D.kalem = await q(sb.from('fiyat_kalemleri').select('*').eq('mekan_id', M.id).order('sira'));
    D.menu = await q(sb.from('menuler').select('*').eq('mekan_id', M.id).order('sira'));
  }

  var SIRA = { k: 'sira', e: 'Sıra', t: 'number', v: 0, yardim: 'Küçük sayı önce görünür.' };
  var AKTIF = { k: 'aktif', e: 'Sitede göster', t: 'bool', v: true };
  var CFG = {
    salon: { tablo: 'salonlar', baslik: 'Salonlar', tek: 'salon', alanlar: [{ k: 'ad', e: 'Salon adı', t: 'text', zor: true }, { k: 'kapasite', e: 'Kapasite (kişi)', t: 'number' }, SIRA, AKTIF], satir: function (r) { return [r.ad, r.kapasite ? r.kapasite + ' kişi' : '']; } },
    kat: { tablo: 'fiyat_kategorileri', baslik: 'Fiyat kategorileri', tek: 'kategori', aciklama: 'Örnek: Yemek, Organizasyon, Müzik. Fiyat kalemlerini bu başlıklar altında gruplarsınız.', alanlar: [{ k: 'ad', e: 'Kategori adı', t: 'text', zor: true }, SIRA, AKTIF], satir: function (r) { return [r.ad, '']; } },
    kalem: { tablo: 'fiyat_kalemleri', baslik: 'Fiyat kalemleri', tek: 'kalem', aciklama: 'Müşterinin sitede gördüğü ve teklifte seçtiği hizmetler. Fiyatı boş bırakırsanız sitede "Teklif alınız" yazar.',
      alanlar: function () { return [{ k: 'ad', e: 'Hizmet adı', t: 'text', zor: true }, { k: 'kategori_id', e: 'Kategori', t: 'select', opt: [['', 'Kategorisiz']].concat(D.kat.map(function (c) { return [c.id, c.ad]; })) }, { k: 'aciklama', e: 'Kısa açıklama', t: 'textarea' },
        { k: 'fiyat', e: 'Fiyat (TL)', t: 'money', yardim: 'Boş bırakırsanız "Teklif alınız" yazar.' }, { k: 'birim', e: 'Fiyat türü', t: 'select', v: 'sabit', opt: [['sabit', 'Sabit ücret'], ['kisi_basi', 'Kişi başı'], ['adet', 'Adet başı']] }, SIRA, AKTIF]; },
      satir: function (r) { var c = D.kat.filter(function (x) { return x.id === r.kategori_id; })[0]; return [r.ad, (c ? c.ad + ' · ' : '') + (r.fiyat == null ? 'Teklif alınız' : O.para(r.fiyat) + (r.birim === 'kisi_basi' ? ' / kişi' : r.birim === 'adet' ? ' / adet' : ''))]; } },
    menu: { tablo: 'menuler', baslik: 'Menüler', tek: 'menü', alanlar: [{ k: 'ad', e: 'Menü adı', t: 'text', zor: true, ornek: 'Kırmızı et menüsü' }, { k: 'aciklama', e: 'Kısa açıklama', t: 'textarea' }, { k: 'icerik', e: 'Menü içeriği (her satıra bir yemek)', t: 'textarea' }, { k: 'fiyat_kisi', e: 'Kişi başı fiyat (TL)', t: 'money' }, SIRA, AKTIF], satir: function (r) { return [r.ad, r.fiyat_kisi == null ? '' : O.para(r.fiyat_kisi) + ' / kişi']; } },
    ozellik: { tablo: 'ozellikler', baslik: 'Mekan özellikleri', tek: 'özellik', alanlar: [{ k: 'baslik', e: 'Başlık', t: 'text', zor: true, ornek: 'Otopark' }, { k: 'aciklama', e: 'Açıklama', t: 'textarea' }, SIRA, AKTIF], satir: function (r) { return [r.baslik, r.aciklama || '']; } },
    firma: { tablo: 'anlasmali_firmalar', baslik: 'Anlaşmalı firmalar', tek: 'firma', aciklama: 'Çiftlere indirim sunan çiçekçi, fotoğrafçı, gelinlikçi vb. firmalar. Sitede kart olarak görünür; kaç kişinin tıkladığını burada izlersiniz.',
      alanlar: [{ k: 'ad', e: 'Firma adı', t: 'text', zor: true }, { k: 'kategori', e: 'Kategori', t: 'text', ornek: 'Çiçekçi' }, { k: 'aciklama', e: 'Kısa açıklama', t: 'textarea' }, { k: 'indirim_oran', e: 'İndirim oranı (%)', t: 'number', max: 100 }, { k: 'instagram', e: 'Instagram', t: 'text', ornek: '@kullaniciadi' }, { k: 'web', e: 'Web sitesi', t: 'url' }, { k: 'telefon', e: 'Telefon', t: 'text' }, SIRA, AKTIF],
      satir: function (r) { return [r.ad, [r.kategori, r.indirim_oran ? '%' + r.indirim_oran + ' indirim' : '', r.yonlendirme_sayisi ? r.yonlendirme_sayisi + ' tıklama' : ''].filter(Boolean).join(' · ')]; } },
    video: { tablo: 'mekan_videolari', baslik: 'Videolar', tek: 'video', aciklama: 'Instagram Reels ya da YouTube Shorts bağlantısı yapıştırın. Sitenin ikinci bölümünde görünür.',
      alanlar: [{ k: 'url', e: 'Video bağlantısı', t: 'url', zor: true, ornek: 'https://www.instagram.com/reel/...' }, { k: 'platform', e: 'Platform', t: 'select', v: 'instagram', opt: [['instagram', 'Instagram'], ['youtube', 'YouTube']] }, { k: 'baslik', e: 'Başlık', t: 'text' }, { k: 'bolum', e: 'Bölüm', t: 'select', v: 'shorts', opt: [['shorts', 'Kısa videolar'], ['klip', 'Kliplerimiz']] }, SIRA, AKTIF],
      satir: function (r) { return [r.baslik || r.url, r.platform === 'youtube' ? 'YouTube' : 'Instagram']; } }
  };

  async function crud(kap, cfg) {
    var alanlar = typeof cfg.alanlar === 'function' ? cfg.alanlar() : cfg.alanlar;
    var satirlar = await q(sb.from(cfg.tablo).select('*').eq('mekan_id', M.id).order('sira'));
    var h = '<div class="crud-ust"><div><h2>' + esc(cfg.baslik) + '</h2>' + (cfg.aciklama ? '<p class="not" style="margin:4px 0 0">' + esc(cfg.aciklama) + '</p>' : '') + '</div><button class="btn ana" type="button" data-yeni>Ekle</button></div>';
    h += satirlar.length ? '<ul class="crud-liste">' + satirlar.map(function (r) {
      var s = cfg.satir(r);
      return '<li><button type="button" class="crud-satir" data-id="' + esc(r.id) + '"><span class="c-ad">' + esc(s[0]) + '</span><span class="c-alt">' + esc(s[1] || '') + '</span></button>' +
        (r.aktif === false ? '<span class="rozet d-iptal">Gizli</span>' : '') + '</li>';
    }).join('') + '</ul>' : '<div class="bos">Henüz ' + esc(cfg.tek) + ' eklenmedi.</div>';
    kap.innerHTML = h;
    $('[data-yeni]', kap).addEventListener('click', function () { crudForm(kap, cfg, null); });
    $$('.crud-satir', kap).forEach(function (b) { b.addEventListener('click', function () { crudForm(kap, cfg, satirlar.filter(function (r) { return r.id === b.getAttribute('data-id'); })[0]); }); });
  }

  function alanHtml(a, deger) {
    var v = deger === undefined || deger === null ? (a.v === undefined ? '' : a.v) : deger, id = 'cf_' + a.k;
    var ek = a.yardim ? '<small class="yardim">' + esc(a.yardim) + '</small>' : '';
    if (a.t === 'bool') return '<label class="onay"><input type="checkbox" name="' + a.k + '"' + (v ? ' checked' : '') + '><span>' + esc(a.e) + '</span></label>';
    var etiket = '<span>' + esc(a.e) + (a.zor ? '' : ' <em>(isteğe bağlı)</em>') + '</span>';
    if (a.t === 'textarea') return '<label class="alan">' + etiket + '<textarea name="' + a.k + '" rows="3">' + esc(v) + '</textarea>' + ek + '</label>';
    if (a.t === 'select') return '<label class="alan">' + etiket + '<select name="' + a.k + '">' + a.opt.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(v) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>' + ek + '</label>';
    var tip = a.t === 'number' || a.t === 'money' ? 'number' : (a.t === 'url' ? 'url' : 'text');
    return '<label class="alan">' + etiket + '<input name="' + a.k + '" type="' + tip + '"' + (tip === 'number' ? ' step="' + (a.t === 'money' ? '0.01' : 'any') + '" min="0"' + (a.max ? ' max="' + a.max + '"' : '') : '') + (a.ornek ? ' placeholder="' + esc(a.ornek) + '"' : '') + ' value="' + esc(v) + '">' + ek + '</label>';
  }

  function crudForm(kap, cfg, satir) {
    var alanlar = typeof cfg.alanlar === 'function' ? cfg.alanlar() : cfg.alanlar;
    var p = pencere((satir ? 'Düzenle' : 'Yeni') + ': ' + cfg.tek, '<form id="cf" novalidate>' + alanlar.map(function (a) { return alanHtml(a, satir ? satir[a.k] : undefined); }).join('') +
      '<div id="cfh"></div><div class="satir-arac"><button class="btn ana" type="submit">Kaydet</button>' + (satir ? '<button class="btn tehlike" type="button" id="cfSil">Sil</button>' : '') + '</div></form>');
    var f = $('#cf', p.ic);
    f.addEventListener('submit', async function (e) {
      e.preventDefault();
      var o = {}, eksik = '';
      alanlar.forEach(function (a) {
        var el = f.elements[a.k]; if (!el) return;
        var v;
        if (a.t === 'bool') v = el.checked;
        else if (a.t === 'number' || a.t === 'money') v = sayi(el.value);
        else { v = el.value.trim(); if (v === '' && !a.zor) v = null; }
        if (a.t === 'url' && v) { var g = O.guvenliUrl(v); if (!g) eksik = a.e + ' http:// ya da https:// ile başlamalı.'; v = g; }
        if (a.zor && (v === null || v === '')) eksik = a.e + ' gerekli.';
        if (a.k === 'sira' && v === null) v = 0;
        if (a.k === 'kategori_id' && v === '') v = null;
        o[a.k] = v;
      });
      if (eksik) { $('#cfh', p.ic).innerHTML = '<div class="hata-kutu">' + esc(eksik) + '</div>'; return; }
      try {
        if (satir) await guncelle(cfg.tablo, satir.id, o); else await ekle(cfg.tablo, o);
        p.kapat(); await yerelTazele(); altCiz(); O.bildir('Kaydedildi', 'ok');
      } catch (er) { $('#cfh', p.ic).innerHTML = '<div class="hata-kutu">' + esc(O.hataMetni(er)) + '</div>'; }
    });
    var sb2 = $('#cfSil', p.ic);
    if (sb2) sb2.addEventListener('click', async function () {
      if (!onay('Bu kayıt silinsin mi? Bu işlem geri alınamaz.')) return;
      try { await sil(cfg.tablo, satir.id); p.kapat(); await yerelTazele(); altCiz(); O.bildir('Silindi', 'ok'); } catch (er) { hata(er); }
    });
  }

  /* ---- Görsel yükleme ---- */
  function kucult(dosya, enBuyuk) {
    return new Promise(function (coz, red) {
      var img = new Image(), u = URL.createObjectURL(dosya);
      img.onload = function () {
        var s = Math.min(1, enBuyuk / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        var tur = dosya.type === 'image/png' ? 'image/png' : 'image/jpeg';
        c.toBlob(function (b) { URL.revokeObjectURL(u); b ? coz({ blob: b, tur: tur }) : red(new Error('Görsel işlenemedi')); }, tur, 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(u); red(new Error('Bu dosya görsel olarak açılamadı')); };
      img.src = u;
    });
  }
  async function gorselYukle(dosya, enBuyuk) {
    var k = await kucult(dosya, enBuyuk || 1800);
    if (k.blob.size > 5 * 1024 * 1024) throw new Error('Görsel 5 MB sınırını aşıyor');
    var yol = M.id + '/' + uuid() + (k.tur === 'image/png' ? '.png' : '.jpg');
    var r = await sb.storage.from('mekan-gorselleri').upload(yol, k.blob, { contentType: k.tur, upsert: false });
    if (r.error) throw r.error;
    return sb.storage.from('mekan-gorselleri').getPublicUrl(yol).data.publicUrl;
  }

  async function fotoCiz(kap) {
    var liste = await q(sb.from('mekan_fotograflari').select('*').eq('mekan_id', M.id).order('sira'));
    var h = '<div class="crud-ust"><div><h2>Fotoğraflar</h2><p class="not" style="margin:4px 0 0">Galeride görünen fotoğraflar. Birden fazla seçebilirsiniz; otomatik küçültülür ve yüklenir.</p></div>' +
      '<label class="btn ana" for="fYukle">Fotoğraf ekle</label><input id="fYukle" class="sr" type="file" accept="image/jpeg,image/png,image/webp" multiple></div><div id="fDurum" class="not" aria-live="polite"></div>';
    h += liste.length ? '<div class="foto-izgara">' + liste.map(function (f) {
      return '<figure class="foto" data-id="' + esc(f.id) + '"><img loading="lazy" src="' + esc(O.guvenliUrl(f.url)) + '" alt="' + esc(f.baslik || 'Fotoğraf') + '"><figcaption>' + esc(f.baslik || '') + (f.aktif === false ? ' (gizli)' : '') + '</figcaption>' +
        '<div class="foto-ara"><button class="btn cizgi kucuk" data-d="duzenle" type="button">Düzenle</button><button class="btn tehlike kucuk" data-d="sil" type="button">Sil</button></div></figure>';
    }).join('') + '</div>' : '<div class="bos">Henüz fotoğraf eklenmedi.</div>';
    kap.innerHTML = h;
    $('#fYukle', kap).addEventListener('change', async function (e) {
      var d = Array.prototype.slice.call(e.target.files || []), ok = 0, durum = $('#fDurum', kap), sira = liste.length;
      for (var i = 0; i < d.length; i++) {
        durum.textContent = 'Yükleniyor: ' + (i + 1) + ' / ' + d.length;
        try { var url = await gorselYukle(d[i], 1800); await ekle('mekan_fotograflari', { url: url, tur: 'galeri', sira: sira + i }); ok++; } catch (er) { hata(er); }
      }
      durum.textContent = ok + ' fotoğraf eklendi.';
      fotoCiz(kap).catch(hata);
    });
    kap.addEventListener('click', async function (e) {
      var b = e.target.closest('[data-d]'); if (!b) return;
      var id = b.closest('.foto').getAttribute('data-id'), f = liste.filter(function (x) { return x.id === id; })[0];
      if (b.getAttribute('data-d') === 'sil') {
        if (!onay('Fotoğraf silinsin mi?')) return;
        try { await sil('mekan_fotograflari', id); fotoCiz(kap).catch(hata); } catch (er) { hata(er); }
      } else {
        var p = pencere('Fotoğrafı düzenle', '<form id="ff" novalidate><label class="alan"><span>Başlık <em>(isteğe bağlı)</em></span><input name="baslik" value="' + esc(f.baslik || '') + '"></label>' +
          '<div class="ikili"><label class="alan"><span>Türü</span><select name="tur"><option value="galeri"' + (f.tur === 'galeri' ? ' selected' : '') + '>Galeri</option><option value="hero"' + (f.tur === 'hero' ? ' selected' : '') + '>Açılış görseli</option></select></label>' +
          '<label class="alan"><span>Sıra</span><input name="sira" type="number" value="' + esc(f.sira) + '"></label></div><label class="onay"><input type="checkbox" name="aktif"' + (f.aktif !== false ? ' checked' : '') + '><span>Sitede göster</span></label><button class="btn ana tam" type="submit">Kaydet</button></form>');
        $('#ff', p.ic).addEventListener('submit', async function (ev) {
          ev.preventDefault(); var fm = ev.target;
          try { await guncelle('mekan_fotograflari', id, { baslik: fm.baslik.value.trim() || null, tur: fm.tur.value, sira: sayi(fm.sira.value) || 0, aktif: fm.aktif.checked }); p.kapat(); fotoCiz(kap).catch(hata); } catch (er) { hata(er); }
        });
      }
    }, { once: false });
  }

  /* ================= SİTE AYARI ================= */
  var BOLUMLER = [['tarih_sorgu', 'Tarih müsaitlik sorgusu'], ['galeri', 'Galeri'], ['fiyatlar', 'Güncel fiyatlar'], ['teklif', 'Teklif al'], ['talep', 'Talep gir'], ['menu', 'Menü'], ['ozellikler', 'Mekan özellikleri'], ['firmalar', 'Anlaşmalı firmalar'], ['cift_ozel', 'Çiftlere özel giriş'], ['shorts', 'Kısa videolar'], ['klipler', 'Kliplerimiz (klip videoları)'], ['yakinda', 'Hazır olmayan kutuları "Yakında" diye göster']];
  function ayarCiz() {
    var b = M.bolumler || {};
    function gorselAlan(ad, e, deger, yardim) {
      return '<div class="alan"><span>' + e + ' <em>(isteğe bağlı)</em></span><div class="gorsel-alan">' + (deger ? '<img src="' + esc(O.guvenliUrl(deger)) + '" alt="">' : '<div class="gorsel-bos">Yok</div>') +
        '<div><label class="btn cizgi kucuk" for="g_' + ad + '">Görsel seç</label><input class="sr" id="g_' + ad + '" data-g="' + ad + '" type="file" accept="image/jpeg,image/png,image/webp">' + (deger ? ' <button class="btn tehlike kucuk" type="button" data-gsil="' + ad + '">Kaldır</button>' : '') + '</div></div>' +
        (yardim ? '<small class="yardim">' + esc(yardim) + '</small>' : '') + '<input type="hidden" name="' + ad + '" value="' + esc(deger || '') + '"></div>';
    }
    function ta(n, e, o) { return '<label class="alan"><span>' + e + '</span><input name="' + n + '" value="' + esc(M[n] || '') + '"' + (o && o.p ? ' placeholder="' + esc(o.p) + '"' : '') + '></label>'; }
    var h = '<form id="af" novalidate><h2 class="alt-baslik">Mekan bilgileri</h2><div class="ikili">' + ta('ad', 'Mekan adı') + ta('yetkili_ad', 'Yetkili adı') + '</div>' +
      '<div class="ikili">' + ta('telefon', 'Telefon', { p: '0532 123 45 67' }) + ta('whatsapp', 'WhatsApp numarası', { p: 'Telefonla aynıysa boş bırakın' }) + '</div>' +
      '<div class="ikili">' + ta('eposta', 'E-posta') + ta('instagram', 'Instagram', { p: '@kullaniciadi' }) + '</div>' +
      '<div class="ikili">' + ta('web', 'Web sitesi') + ta('harita_url', 'Harita bağlantısı', { p: 'Google Haritalar paylaşım bağlantısı' }) + '</div>' + ta('adres', 'Adres') +
      '<h2 class="alt-baslik">Açılış sayfası</h2>' + ta('ana_baslik', 'Ana başlık', { p: 'Boş bırakırsanız mekan adı yazar' }) + '<label class="alan"><span>Ana yazı</span><textarea name="ana_yazi" rows="2">' + esc(M.ana_yazi || '') + '</textarea></label>' +
      gorselAlan('hero_url', 'Açılış görseli', M.hero_url, 'Yatay, geniş bir fotoğraf iyi görünür.') + gorselAlan('logo_url', 'Logo', M.logo_url, 'Saydam arka planlı PNG önerilir.') +
      '<label class="alan"><span>Site rengi</span><input name="ana_renk" type="color" value="' + esc(/^#[0-9a-f]{6}$/i.test(M.ana_renk || '') ? M.ana_renk : '#7a1f3d') + '" style="min-height:52px;padding:4px"></label>' +
      '<h2 class="alt-baslik">Erken rezervasyon indirimi</h2><label class="onay"><input type="checkbox" name="erken_rez_aktif"' + (M.erken_rez_aktif ? ' checked' : '') + '><span>Sitede göster</span></label>' +
      '<div class="ikili"><label class="alan"><span>İndirim oranı (%)</span><input name="erken_rez_oran" type="number" min="0" max="100" value="' + esc(M.erken_rez_oran) + '"></label><label class="alan"><span>En az kaç ay önceden</span><input name="erken_rez_ay" type="number" min="0" value="' + esc(M.erken_rez_ay) + '"></label></div>' +
      '<h2 class="alt-baslik">Sitede görünecek bölümler</h2><div class="bolum-sec">' + BOLUMLER.map(function (x) { return '<label class="onay"><input type="checkbox" name="b_' + x[0] + '"' + (b[x[0]] === false ? '' : ' checked') + '><span>' + esc(x[1]) + '</span></label>'; }).join('') + '</div>' +
      '<h2 class="alt-baslik">Aydınlatma metni (KVKK)</h2><label class="alan"><span>Metin <em>(boşsa genel bir metin gösterilir)</em></span><textarea name="kvkk_metni" rows="6">' + esc(M.kvkk_metni || '') + '</textarea></label>' +
      '<p class="not" style="margin-top:-8px">Resmî metni kendi hukuk danışmanınızla hazırlayın ve buraya yapıştırın.</p><div id="afh"></div><button class="btn ana" type="submit">Ayarları kaydet</button></form>';
    aktifSayfa().innerHTML = h;
    var f = $('#af');
    $$('[data-g]', f).forEach(function (inp) {
      inp.addEventListener('change', async function () {
        var d = inp.files && inp.files[0]; if (!d) return;
        try { O.bildir('Görsel yükleniyor...'); var url = await gorselYukle(d, inp.getAttribute('data-g') === 'logo_url' ? 800 : 2000); f.elements[inp.getAttribute('data-g')].value = url; await ayarKaydet(f, true); } catch (er) { hata(er); }
      });
    });
    $$('[data-gsil]', f).forEach(function (b) { b.addEventListener('click', async function () { f.elements[b.getAttribute('data-gsil')].value = ''; await ayarKaydet(f, true); }); });
    f.addEventListener('submit', function (e) { e.preventDefault(); ayarKaydet(f, false); });
  }
  async function ayarKaydet(f, sessiz) {
    var v = function (n) { return f.elements[n].value.trim(); }, b = {};
    BOLUMLER.forEach(function (x) { b[x[0]] = f.elements['b_' + x[0]].checked; });
    if (!v('ad')) { $('#afh').innerHTML = '<div class="hata-kutu">Mekan adı boş olamaz.</div>'; return; }
    var o = { ad: v('ad'), yetkili_ad: v('yetkili_ad') || null, telefon: v('telefon') || null, whatsapp: v('whatsapp') || null, eposta: v('eposta') || null, instagram: v('instagram') || null,
      web: O.guvenliUrl(v('web')) || null, harita_url: O.guvenliUrl(v('harita_url')) || null, adres: v('adres') || null, ana_baslik: v('ana_baslik') || null, ana_yazi: v('ana_yazi') || null,
      hero_url: v('hero_url') || null, logo_url: v('logo_url') || null, ana_renk: v('ana_renk'), erken_rez_aktif: f.elements.erken_rez_aktif.checked,
      erken_rez_oran: Math.min(100, Math.max(0, sayi(v('erken_rez_oran')) || 0)), erken_rez_ay: Math.max(0, sayi(v('erken_rez_ay')) || 0), bolumler: b, kvkk_metni: v('kvkk_metni') || null };
    try {
      M = await guncelle('mekanlar', M.id, o); O.renkUygula(M.ana_renk);
      var ad = $('.p-marka b'); if (ad) ad.textContent = M.ad;
      O.bildir('Ayarlar kaydedildi', 'ok'); if (sessiz) ayarCiz();
    } catch (er) { hata(er); }
  }

  /* ================= HESAP ================= */
  function hesapCiz() {
    var t = GIZLI && GIZLI.ntfy_topic;
    var h = '<div class="kart"><h2>Şifremi değiştir</h2><form id="sf" novalidate><label class="alan"><span>Yeni şifre <em>(en az 8 karakter)</em></span><input name="s1" type="password" autocomplete="new-password"></label>' +
      '<label class="alan"><span>Yeni şifre (tekrar)</span><input name="s2" type="password" autocomplete="new-password"></label><div id="sh"></div><button class="btn ana" type="submit">Şifreyi değiştir</button></form></div>' +
      '<div class="kart"><h2>Yeni teklif ve talep bildirimi</h2>' + (t ? '<p>Telefonunuza ücretsiz <b>ntfy</b> uygulamasını kurun (App Store ya da Google Play). Uygulamada "Abone ol" deyip aşağıdaki adı yazın. Siteden yeni teklif ya da talep gelince telefonunuza haber düşer. Bildirimde kişisel bilgi olmaz.</p>' +
        '<div class="kod-kutu"><span>Bildirim adınız (kimseyle paylaşmayın):</span><b>' + esc(t) + '</b></div>' : '<p class="not">Bildirim adı bulunamadı.</p>') + '</div>' +
      '<div class="kart"><h2>Verilerinizi yedekleyin</h2><p>Tüm çift kayıtlarınızı Excel\'de açılacak dosya olarak indirebilirsiniz. Düzenli aralıklarla indirip saklamanızı öneririz.</p><button class="btn cizgi" id="csv3">Tüm kayıtları indir</button></div>' +
      '<div class="kart"><button class="btn tehlike" id="cik2">Çıkış yap</button></div>';
    aktifSayfa().innerHTML = h;
    $('#csv3').addEventListener('click', csvIndir);
    $('#cik2').addEventListener('click', cikis);
    $('#sf').addEventListener('submit', async function (e) {
      e.preventDefault(); var f = e.target, kutu = $('#sh');
      if (f.s1.value.length < 8) { kutu.innerHTML = '<div class="hata-kutu">Şifre en az 8 karakter olmalı.</div>'; return; }
      if (f.s1.value !== f.s2.value) { kutu.innerHTML = '<div class="hata-kutu">İki şifre aynı değil.</div>'; return; }
      var r = await sb.auth.updateUser({ password: f.s1.value });
      if (r.error) { kutu.innerHTML = '<div class="hata-kutu">Şifre değiştirilemedi: ' + esc(r.error.message) + '</div>'; return; }
      f.reset(); kutu.innerHTML = '<div class="ok-kutu">Şifreniz değişti.</div>';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', basla); else basla();
})();
