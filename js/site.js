/* Genel site. Tüm içerik Supabase'ten gelir; mekan panelden girer, siteye otomatik düşer. */
(function () {
  'use strict';
  var O = window.ORTAK, esc = O.esc, ik = O.ikon, A = window.AYAR;
  var $ = function (s, k) { return (k || document).querySelector(s); };
  var $$ = function (s, k) { return Array.prototype.slice.call((k || document).querySelectorAll(s)); };

  var sb = null, M = null;
  var D = { salonlar: [], foto: [], video: [], kat: [], kalem: [], menu: [], ozellik: [], firma: [], makyaj: [] };

  /* ---------- Başlangıç ---------- */
  function hataSayfasi(baslik, metin) {
    $('#uygulama').innerHTML = '<div class="isleniyor"><h1 style="font:600 24px var(--serif);margin:0 0 8px">' + esc(baslik) + '</h1><p>' + esc(metin) + '</p></div>';
  }

  function basla() {
    if (!window.supabase || !A || !A.SUPABASE_KEY || A.SUPABASE_KEY.indexOf('ANAHTAR') > -1) {
      hataSayfasi('Site henüz hazır değil', 'Bağlantı ayarı eksik. Lütfen daha sonra tekrar deneyin.');
      return;
    }
    sb = window.supabase.createClient(A.SUPABASE_URL, A.SUPABASE_KEY);
    function zamanli(p, ms) { return new Promise(function (ok, no) { var t = setTimeout(function () { no(new Error('zaman_asimi')); }, ms); p.then(function (v) { clearTimeout(t); ok(v); }, function (e) { clearTimeout(t); no(e); }); }); }
    function dene(n) { return zamanli(yukle(), 10000).catch(function (e) { if (n > 0 && !(e && e.message === 'mekan_yok')) return dene(n - 1); throw e; }); }
    var ONB = 'villora_veri_v1_' + A.MEKAN_SLUG, ilk = false, eski = null;
    try { eski = JSON.parse(localStorage.getItem(ONB) || 'null'); } catch (e0) { eski = null; }
    if (eski && eski.M && eski.D) { M = eski.M; D = eski.D; try { ciz(); ilk = true; } catch (e1) { ilk = false; } }
    dene(2).then(function () {
      var yeni = JSON.stringify({ M: M, D: D });
      try { localStorage.setItem(ONB, yeni); } catch (e2) { /* depolama yoksa önemsiz */ }
      if (!ilk) return ciz();
      if (JSON.stringify({ M: eski.M, D: eski.D }) !== yeni && !acikPencere) { var y = window.pageYOffset; ciz(); window.scrollTo(0, y); }
    }).catch(function (e) {
      if (ilk) return;
      var m = e && e.message;
      if (m === 'mekan_yok') hataSayfasi('Mekan bulunamadı', 'Bu adres şu anda yayında değil.');
      else {
        hataSayfasi('Sayfa yüklenemedi', 'İnternet bağlantınızı kontrol edin.');
        var kp = document.createElement('button'); kp.className = 'btn ana'; kp.type = 'button'; kp.style.marginTop = '16px'; kp.textContent = 'Yeniden dene';
        kp.addEventListener('click', function () {
          var biter = function () { location.reload(); };
          try { Promise.all([(navigator.serviceWorker ? navigator.serviceWorker.getRegistrations().then(function (r) { return Promise.all(r.map(function (x) { return x.unregister(); })); }) : 0), (window.caches ? caches.keys().then(function (k) { return Promise.all(k.map(function (x) { return caches.delete(x); })); }) : 0)]).then(biter, biter); } catch (er) { biter(); }
        });
        var kt = $('#uygulama .isleniyor'); if (kt) kt.appendChild(kp);
      }
      if (window.console) console.error(e);
    });
  }

  async function yukle() {
    var r = await sb.from('mekanlar').select('*').eq('slug', A.MEKAN_SLUG).maybeSingle();
    if (r.error) throw r.error;
    if (!r.data) throw new Error('mekan_yok');
    M = r.data;
    var VK = (A.VARSAYILAN || {});   // panelde boş bırakılan alanlar config.js'teki değerle dolar
    Object.keys(VK).forEach(function (k) { if (!M[k]) M[k] = VK[k]; });
    function s(t) { return sb.from(t).select('*').eq('mekan_id', M.id).order('sira', { ascending: true }).order('id', { ascending: true }); }
    var x = await Promise.all([s('salonlar'), s('mekan_fotograflari'), s('mekan_videolari'), s('fiyat_kategorileri'),
      s('fiyat_kalemleri'), s('menuler'), s('ozellikler'), s('anlasmali_firmalar'), s('makyaj_hizmetleri')]);
    x.slice(0, 8).forEach(function (q) { if (q.error) throw q.error; });
    D.salonlar = x[0].data || []; D.foto = x[1].data || []; D.video = x[2].data || []; D.kat = x[3].data || [];
    try {
      var cy = await sb.from('cift_yorumlari').select('*').eq('mekan_id', M.id).eq('durum', 'yayinda').order('sira', { ascending: true }).order('olusturma', { ascending: false });
      D.ciftler = (cy && !cy.error && cy.data) || [];
    } catch (e) { D.ciftler = []; }
    D.kalem = x[4].data || []; D.menu = x[5].data || []; D.ozellik = x[6].data || []; D.firma = x[7].data || []; D.makyaj = (x[8] && !x[8].error && x[8].data) || [];
  }

  function acik(k) { return !(M.bolumler && M.bolumler[k] === false); }

  /* ---------- Sayfa çizimi ---------- */
  function ciz() {
    O.renkUygula(M.ana_renk);
    document.title = M.ad + ' | Düğün ve organizasyon';

    var AY0 = window.AYAR || {};
    var galeri = D.foto.filter(function (f) { return f.tur === 'galeri'; });
    if (!galeri.length && window.AYAR && window.AYAR.GALERI) galeri = window.AYAR.GALERI.map(function (u, i) { return { url: u, baslik: '' }; });   // geçici: mekan fotoğrafı yüklenene kadar
    var heroFoto = M.hero_url || (D.foto.filter(function (f) { return f.tur === 'hero'; })[0] || {}).url || (window.AYAR && window.AYAR.HERO) || (galeri[0] || {}).url || '';
    var wa = O.waLink(M.whatsapp || M.telefon, 'Merhaba, ' + M.ad + ' hakkında bilgi almak istiyorum.');
    var tel = String(M.telefon || '').replace(/[^\d+]/g, '');
    var harita = O.guvenliUrl(M.harita_url);
    var logo = O.guvenliUrl(M.logo_url) || (window.AYAR && window.AYAR.LOGO) || '';

    var videolar = acik('shorts') ? D.video.filter(function (v) { return v.bolum === 'shorts'; }) : [];
    var ozelAcik = acik('cift_ozel');
    var yak = false;                       // "Yakında" kutuları gösterilsin mi
    var klipler = [];                                // Kliplerimiz kaldırıldı (videolar Shorts'ta)
    var makyajFoto = D.foto.filter(function (f) { return f.tur === 'makyaj'; });
    var makyajVideo = D.video.filter(function (v) { return v.bolum === 'makyaj'; });
    var makyajVar = acik('makeup') && !!(D.makyaj.length || makyajFoto.length || makyajVideo.length || M.makyaj_yazi);
    var imajAd = encodeURIComponent(M.ad);
    var imajFiligran = !!(M.bolumler && M.bolumler.imaj_ad === true);
    var fotoImajAcik = acik('foto_imaj'), moviImajAcik = acik('movi_imaj');
    var ikinci = ozelAcik || acik('foto_dergi') || fotoImajAcik || moviImajAcik;

    var h = '';
    h += '<header class="ust"><a class="marka" href="./">' + (logo ? '<img src="' + esc(logo) + '" alt="">' : '') + '<span>' + esc(M.ad) + '</span></a><!--NAV-->' +
      '<button class="menu-dugme" id="menuDugme" aria-label="Menüyü aç">' + ik('menu') + '</button></header>';
    if (ikinci) {
      h += '<div class="sekme" role="tablist"><button role="tab" id="s0" aria-selected="true" data-s="0">Mekan</button>' +
        '<button role="tab" id="s1" aria-selected="false" data-s="1">Mini uygulamalar</button></div>';
    }
    h += '<main>';

    /* Bölme 1 */
    h += '<section class="bolme aktif" id="b0" aria-labelledby="s0">';
    h += '<div class="acilis">' + (heroFoto && O.guvenliUrl(heroFoto) ? '<img src="' + esc(O.guvenliUrl(heroFoto)) + '" alt="' + esc(M.ad) + '" fetchpriority="high">' : '') +
      '<div class="acilis-ic"><h1>' + esc(M.ana_baslik || M.ad) + '</h1>' +
      (M.ana_yazi ? '<p>' + esc(M.ana_yazi) + '</p>' : '') +
      '<div class="satir"><button class="btn ana" data-islem="teklif">Teklif al</button>' +
      (D.menu.length && acik('menu') ? '<button class="btn cizgi" data-ankraj="menulerK">Menüleri gör</button>' : '') +
      (acik('foto_dergi') ? '<button class="btn cizgi" data-islem="dergi">Foto Dergi</button>' : '') +
      '</div></div></div>';

    if (acik('tarih_sorgu')) {
      h += '<div class="tarih-kart"><h2>Düğün tarihiniz müsait mi?</h2><p class="not alt">Tarihi seçin, anında görün.</p>' +
        '<div class="tarih-satir"><label class="sr" for="tarihSor">Düğün tarihi</label><span class="tarih-sar"><input type="date" id="tarihSor" min="' + O.bugunISO() + '"><span class="tarih-ph" aria-hidden="true">gg.aa.yyyy</span></span></div>' +
        '<div class="tarih-sonuc" id="tarihSonuc" aria-live="polite"></div></div>';
    }

    if (galeri.length && acik('galeri')) {
      h += '<div class="kisim k-galeri" id="galeriK"><div class="baslik-satir"><h2>Mekanımız</h2><button type="button" class="btn hafif kucuk" data-islem="galeri">' + ik('galeri', 18) + 'Galeri (' + galeri.length + ')</button></div><div class="galeri"><div class="galeri-seri" id="galeriSeri">';
      galeri.forEach(function (f, i) {
        var u = O.guvenliUrl(f.url); if (!u) return;
        h += '<button type="button" data-foto="' + i + '" aria-label="' + esc(f.baslik || 'Fotoğrafı büyüt') + '"><img loading="lazy" src="' + esc(u) + '" alt="' + esc(f.baslik || M.ad) + '"></button>';
      });
      h += '</div><button class="galeri-ok sol" id="galSol" aria-label="Önceki">' + ik('sol') + '</button><button class="galeri-ok sag" id="galSag" aria-label="Sonraki">' + ik('sag') + '</button></div>';
      h += '<div class="galeri-nokta" id="galNokta" role="tablist" aria-label="Fotoğraf seçici">';
      galeri.forEach(function (f, i) { h += '<button type="button" data-nokta="' + i + '" role="tab" aria-label="' + (i + 1) + '. fotoğraf"' + (i === 0 ? ' class="ak"' : '') + '></button>'; });
      h += '</div></div>';
    }

    /* İşlemler: 4 sütunlu kutular (taslaktaki sıra) */
    var T = [
      { k: 'fiyatlar', ad: 'Güncel fiyatlar', i: 'etiket', on: acik('fiyatlar') },
      { k: 'teklif', ad: 'Teklif al', i: 'belge', vurgu: true, on: acik('teklif') },
      { k: 'firmalar', ad: 'Anlaşmalı firmalar', i: 'el', alt: 'Gelin arabası, çiçekçi, fotoğrafçı, gelinlikçi, make-up, bando, catering', on: acik('firmalar') },
      { k: 'dj', ad: 'DJ müzik yükle', i: 'muzik', yak: true },
      { k: 'menu', ad: 'Menü', i: 'tabak', on: acik('menu') },
      { k: 'makyaj', ad: 'Make-up', i: 'makyaj', on: makyajVar, yak: !makyajVar && acik('makeup') },
      { k: 'ozellikler', ad: 'Mekan özellikleri', i: 'yildiz', on: acik('ozellikler') }
    ];
    var K = [
      { k: 'ciftlerimiz', ad: 'Çiftlerimiz', yak: true },
      { k: 'oturma', ad: 'Oturma düzeni', yak: true },
      { k: 'iptal', ad: 'Rez. iptali', yak: true }
    ];
    function kutuHtml(x, kucuk) {
      if (x.yak) {
        if (!yak) return '';
        return '<button type="button" class="islem yok' + (kucuk ? ' mini' : '') + '" disabled aria-disabled="true">' + (kucuk ? '' : ik(x.i, 26)) + '<b>' + esc(x.ad) + '</b><small>Yakında</small></button>';
      }
      if (!x.on) return '';
      return '<button type="button" class="islem' + (x.vurgu ? ' vurgu' : '') + (kucuk ? ' mini' : '') + '" data-islem="' + x.k + '">' + (kucuk ? '' : ik(x.i, 26)) + '<b>' + esc(x.ad) + '</b>' +
        (x.alt ? '<small class="alt-yazi">' + esc(x.alt) + '</small>' : '') + '</button>';
    }
    ISLEMLER = T.concat(K).filter(function (x) { return x.on && !x.yak; });
    if (galeri.length && acik('galeri')) ISLEMLER.unshift({ k: 'galeri', ad: 'Galeri', i: 'galeri', on: true });
    if (acik('foto_dergi')) ISLEMLER.push({ k: 'dergi', ad: 'Foto Dergi', i: 'galeri', on: true });
    if (acik('ciftlerimiz')) ISLEMLER.push({ k: 'ciftler', ad: 'Çiftlerimiz', i: 'yildiz', on: true });

    /* ---- Yeni düzen: menü kartları, teklif bandı, ek hizmetler, iletişim ---- */
    function bolumAdi(t) { return String(t || '').replace(/\s*\(.*\)\s*$/, '').trim(); }
    if (D.menu.length && acik('menu')) {
      h += '<section class="vt vt-menuler" id="menulerK"><div class="vt-kap"><div class="vt-baslik"><h2>Menülerimiz</h2><p>Size uygun menüyü seçin. Her menünün içeriği ve dahil hizmetleri kartın içinde.</p></div><div class="vt-seri">';
      D.menu.forEach(function (m, i) {
        var bl = O.menuAyir ? O.menuAyir(m.icerik) : [], hz = O.satirlar ? O.satirlar(m.dahil_hizmetler) : [];
        var etiket = bl.map(function (x) { return bolumAdi(x.baslik); }).filter(Boolean);
        h += '<article class="vt-kart"><div class="vt-kart-ust"><span class="vt-no">' + (/^men[uü]\s*\d+/i.test(m.ad) ? esc(m.ad.replace(/^men[uü]\s*/i, '')) : (i + 1)) + '</span><h3>' + esc(m.ad) + (etTuru(m) ? ' <small class="vt-et">(' + esc(etTuru(m)) + ')</small>' : '') + '</h3></div>' +
          '<div class="vt-kart-ic">' +
          (etiket.length ? '<ul class="vt-etiket">' + etiket.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '') +
          (hz.length ? '<p class="vt-dahil"><b>' + hz.length + '</b> hizmet menüye dahil</p>' : '') +
          (fiyatYaz(m) ? '<p class="vt-fiyat">(' + esc(fiyatYaz(m)) + ' <span>kişi başı</span>)' + (m.fiyat_notu ? '<small>' + esc(m.fiyat_notu) + '</small>' : '') + '</p>' : '') +
          '<div class="vt-kart-dugme"><button type="button" class="btn cizgi" data-menu="' + esc(m.id) + '">İncele</button><button type="button" class="btn ana" data-menusec="' + esc(m.id) + '">Teklif al</button></div></div></article>';
      });
      h += '</div></div></section>';
    }

    if (acik('teklif')) {
      h += '<section class="vt vt-band"><div class="vt-kap vt-band-ic"><div><h2>Hayalinizdeki günü birlikte planlayalım</h2><p>Tarihi, kişi sayısını ve menünüzü seçin. Size özel teklifi hazırlayıp iletelim.' +
        (M.erken_rez_aktif && M.erken_rez_oran > 0 ? ' Erken rezervasyonda %' + esc(M.erken_rez_oran) + ' indirim, en az ' + esc(M.erken_rez_ay) + ' ay önce.' : '') + '</p></div>' +
        '<div class="vt-band-dugme"><button type="button" class="btn ana" data-islem="teklif">Teklif al</button>' + (wa ? '<a class="btn cizgi" href="' + esc(wa) + '" target="_blank" rel="noopener">WhatsApp</a>' : '') + '</div></div></section>';
    }

    if (acik('ciftlerimiz')) {
      var cfL = (D.ciftler || []).slice(0, 3);
      h += '<section class="vt vt-ciftler"><div class="vt-kap"><div class="vt-baslik"><h2>Çiftlerimiz</h2><p>' + esc(M.ad) + ' ile evlenen çiftlerin fotoğrafları ve yorumları.</p></div>' +
        (cfL.length ? '<div class="cf-liste">' + cfL.map(function (c) {
          var u = O.guvenliUrl(c.foto_url);
          return '<article class="cf-kart">' + (u ? '<img loading="lazy" src="' + esc(u) + '" alt="' + esc(c.ad) + '">' : '<div class="cf-fotosuz">' + ik('yildiz', 28) + '</div>') +
            '<div class="cf-ic"><small>' + esc(c.kategori || 'Düğün') + '</small><b>' + esc(c.ad) + '</b>' + (c.yorum ? '<blockquote>' + esc(c.yorum) + '</blockquote>' : '') + '</div></article>';
        }).join('') + '</div>' : '') +
        '<div class="vt-cift-dugme"><button type="button" class="btn ana" data-islem="ciftler">' + (cfL.length ? 'Tüm çiftlerimiz' : 'Çiftlerimizi görün') + '</button></div></div></section>';
    }

    var EK = [];
    if (makyajVar && acik('makeup')) EK.push({ k: 'makyaj', ad: M.makyaj_baslik || 'Make-up', i: 'makyaj', y: 'Gelin makyajı ve saç tasarımı seçenekleri.' });
    if (acik('firmalar')) EK.push({ k: 'firmalar', ad: 'Anlaşmalı firmalar', i: 'el', y: 'Gelin arabası, çiçekçi, fotoğrafçı, gelinlikçi, bando ve catering. Çiftlerimize özel indirimler.' });
    if (acik('ciftlerimiz')) EK.unshift({ k: 'ciftler', ad: 'Çiftlerimiz', i: 'yildiz', y: 'Bizimle evlenen çiftlerin fotoğrafları ve yorumları.' });
    if (acik('foto_dergi')) EK.push({ k: 'dergi', ad: 'Foto Dergi', i: 'galeri', y: 'Fotoğraflarınızı seçin, anı dergisini PDF olarak indirin. Yüklenmez, cihazınızda hazırlanır.' });
    if (acik('ozellikler') && D.ozellik.length) EK.push({ k: 'ozellikler', ad: 'Mekan özellikleri', i: 'yildiz', y: 'Mekanın imkanları ve sunduğu olanaklar.' });
    if (EK.length) {
      h += '<section class="vt vt-ek"><div class="vt-kap"><div class="vt-baslik"><h2>Düğününüzü tamamlayan hizmetler</h2></div><div class="vt-ek-izgara">';
      EK.forEach(function (x) { h += '<button type="button" class="vt-ek-kart" data-islem="' + x.k + '">' + ik(x.i, 28) + '<b>' + esc(x.ad) + '</b><span>' + esc(x.y) + '</span><em>İncele</em></button>'; });
      h += '</div></div></section>';
    }

    h += '<section class="vt vt-iletisim" id="iletisimK"><div class="vt-kap vt-il-izgara"><div><h2>Bize ulaşın</h2>' + (M.adres ? '<p class="vt-adres">' + esc(M.adres) + '</p>' : '') +
      '<div class="vt-il-dugme">' + (wa ? '<a class="btn ana" href="' + esc(wa) + '" target="_blank" rel="noopener">' + ik('whatsapp', 20) + 'WhatsApp</a>' : '') +
      (tel ? '<a class="btn cizgi" href="tel:' + esc(tel) + '">' + ik('telefon', 20) + esc(M.telefon) + '</a>' : '') +
      (harita ? '<a class="btn cizgi" href="' + esc(harita) + '" target="_blank" rel="noopener">' + ik('konum', 20) + 'Yol tarifi</a>' : '') +
      (O.sosyalUrl('instagram', M.instagram) ? '<a class="btn ig" href="' + esc(O.sosyalUrl('instagram', M.instagram)) + '" target="_blank" rel="noopener">' + ik('instagram', 20) + 'Instagram</a>' : '') + '</div></div>' +
      '<div class="vt-harita">' + haritaHtml(harita) + '</div></div></section>';

    /* Hakkımızda bandı: yazı panelden (hakkinda) ya da config.js'ten gelir */
    if (acik('hakkimizda') && M.hakkinda) {
      h += '<section class="hakkimizda" id="hakkimizdaK"><div class="hk-ic"><h2>Hakkımızda</h2>' +
        String(M.hakkinda).split(/\n{2,}/).map(function (p) { return '<p>' + esc(p.trim()).replace(/\n/g, '<br>') + '</p>'; }).join('') + '</div></section>';
    }

    h += '</section>';

    /* Bölme 2: mini uygulamalar, çiftlere özel, kısa videolar */
    if (ikinci) {
      h += '<section class="bolme" id="b1" aria-labelledby="s1">';
      var mini = '';
      var imajQ = imajFiligran ? '?ad=' + imajAd : '';
      if (moviImajAcik) mini += '<a class="islem mini baglanti" href="movi-imaj.html' + imajQ + '"><b>Movi İmaj</b></a>';
      if (fotoImajAcik) mini += '<a class="islem mini baglanti" href="foto-imaj.html' + imajQ + '"><b>Foto İmaj</b></a>';
      if (acik('foto_dergi')) mini += '<button type="button" class="islem mini" data-islem="dergi"><b>Foto Dergi</b></button>';
      if (ozelAcik) mini += '<button type="button" class="islem mini" data-ankraj="ozelK"><b>Foto ve video indir</b></button>';
      if (mini) h += '<div class="kisim k-mini"><h2>Mini uygulamalarımız</h2><div class="kutular dort kucuk-sira">' + mini + '</div></div>';
      if (ozelAcik) {
        h += '<div class="kisim k-ozel" id="ozelK"><div class="ozel" id="ozelKutu"><h2>Foto ve video indir</h2><p class="not">' + esc(M.ad) + ' ile anlaşan çiftler, size verilen şifreyle buradan fotoğraf ve videolarına ulaşır.</p>' +
          '<form id="ozelForm" novalidate><label class="alan"><span>Şifreniz</span><input id="ozelKod" class="kod" autocomplete="off" autocapitalize="characters" maxlength="12" placeholder="ABCD-1234"></label>' +
          '<div id="ozelHata"></div><button class="btn ana tam" type="submit">' + ik('kilit', 20) + 'Giriş yap</button></form></div></div>';
      }
      h += '</section>';
    }
    h += '</main>';
    var fl = '';
    var igUrl = O.sosyalUrl('instagram', M.instagram);
    var AY = window.AYAR || {}, SY = AY.SOSYAL || {};
    var fbUrl = O.sosyalUrl('facebook', M.facebook || SY.facebook), ytUrl = O.sosyalUrl('youtube', M.youtube || SY.youtube), ttUrl = O.sosyalUrl('tiktok', M.tiktok || SY.tiktok);
    var webUrl = O.guvenliUrl(M.web);
    if (igUrl) fl += '<a href="' + esc(igUrl) + '" target="_blank" rel="noopener" aria-label="Instagram">' + ik('instagram', 22) + '</a>';
    if (fbUrl) fl += '<a href="' + esc(fbUrl) + '" target="_blank" rel="noopener" aria-label="Facebook">' + ik('facebook', 22) + '</a>';
    if (ytUrl) fl += '<a href="' + esc(ytUrl) + '" target="_blank" rel="noopener" aria-label="YouTube">' + ik('youtube', 22) + '</a>';
    if (ttUrl) fl += '<a href="' + esc(ttUrl) + '" target="_blank" rel="noopener" aria-label="TikTok">' + ik('tiktok', 22) + '</a>';
    if (wa) fl += '<a href="' + esc(wa) + '" target="_blank" rel="noopener" aria-label="WhatsApp">' + ik('whatsapp', 22) + '</a>';
    if (tel) fl += '<a href="tel:' + esc(tel) + '" aria-label="Ara">' + ik('telefon', 22) + '</a>';
    if (M.eposta) fl += '<a href="mailto:' + esc(M.eposta) + '" aria-label="E-posta">' + ik('eposta', 22) + '</a>';
    if (harita) fl += '<a href="' + esc(harita) + '" target="_blank" rel="noopener" aria-label="Konum">' + ik('konum', 22) + '</a>';
    if (webUrl) fl += '<a href="' + esc(webUrl) + '" target="_blank" rel="noopener" aria-label="Web sitesi">' + ik('web', 22) + '</a>';
    if (videolar.length) h += '<button type="button" class="shorts-serit" id="shortsAc" aria-label="' + esc(M.ad) + ' Shorts videolarını aç"><span class="el" aria-hidden="true">👇</span><b>Shorts</b><span class="shorts-peekwrap" aria-hidden="true"><span class="shorts-peek">' + (videolar[0] && ytKapak(videolar[0].url) ? '<img src="' + esc(ytKapak(videolar[0].url)) + '" alt="">' : '') + '</span></span></button>';
    var igMetin = String(M.instagram || ((window.AYAR && window.AYAR.VARSAYILAN) || {}).instagram || '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[\/?].*$/, '').replace(/^@/, '');
    h += '<footer class="alt-bilgi"><div class="alt-ic">' +
      '<div class="alt-marka"><b>' + esc(M.ad) + '</b></div>' +
      (fl ? '<div class="alt-link">' + fl + '</div>' : '') +
      (igUrl ? '<a class="alt-ig" href="' + esc(igUrl) + '" target="_blank" rel="noopener">' + ik('instagram', 20) + '<span>' + (igMetin ? '@' + esc(igMetin) : 'Instagram') + '</span></a>' : '') +
      ((tel || M.adres) ? '<p class="alt-iletisim">' + (tel ? '<a href="tel:' + esc(tel) + '"><span class="tel-ik">' + ik('telefon', 18) + '</span>' + esc(M.telefon) + '</a>' : '') + (tel && M.adres ? '<br>' : '') + (M.adres ? esc(M.adres) : '') + '</p>' : '') +
      '<div class="alt-alt"><span>© ' + new Date().getFullYear() + ' ' + esc(M.ad) + '</span>' +
      '<button type="button" id="kvkkAc">Aydınlatma metni</button></div></div>' +
      '</footer>' +
      (videolar.length ? '<div class="shorts-overlay" id="shortsOverlay" aria-label="Shorts"><button type="button" class="shorts-kapat" id="shortsKapat" aria-label="Kapat">✕</button><div class="shorts-feed" id="shortsFeed"></div></div>' : '');

    var nav = '<nav class="ust-nav" aria-label="Sayfa menüsü">';
    ISLEMLER.forEach(function (x) { if (x.k !== 'teklif' && x.k !== 'talep') nav += '<button type="button" data-islem="' + x.k + '">' + esc(x.ad) + '</button>'; });
    nav += '<button type="button" data-ankraj="iletisimK">İletişim</button>';
    if (ozelAcik) nav += '<button type="button" data-ankraj="ozelK">Foto ve video indir</button>';
    nav += '</nav>' + (acik('teklif') ? '<button type="button" class="btn ana kucuk ust-cta" data-islem="teklif">Teklif al</button>' : '');
    h = h.replace('<!--NAV-->', nav);
    $('#uygulama').innerHTML = '<div class="sayfa">' + h + '</div>';
    VIDEOLAR = videolar;
    KLIPLER = klipler;
    MAKYAJ = { foto: makyajFoto, video: makyajVideo };
    if (window.VSHORTS && videolar.length) window.VSHORTS.kur(videolar, document.getElementById('shortsAc'), document.getElementById('shortsOverlay'), M.ad);
    GALERI = galeri;
    bagla();
    cerezUyari(); tarihIsaret();
  }

  /* Gömülü harita: koordinat harita bağlantısındaki @enlem,boylam'dan ya da config.js KONUM'dan gelir */
  function haritaHtml(url) {
    var k = null, m = String(url || '').match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (m) k = { lat: m[1], lng: m[2] };
    else if (window.AYAR && window.AYAR.KONUM) k = window.AYAR.KONUM;
    if (!k) return '';
    var src = 'https://www.google.com/maps?q=' + encodeURIComponent(k.lat + ',' + k.lng) + '&z=16&hl=tr&output=embed';
    return '<div class="harita"><iframe title="' + esc(M.ad) + ' konumu" src="' + esc(src) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div>';
  }

  var ISLEMLER = [], VIDEOLAR = [], KLIPLER = [], GALERI = [], MAKYAJ = { foto: [], video: [] };

  /* ---------- Olaylar ---------- */
  function islemCalistir(k, ek) {
    ({ fiyatlar: fiyatlarAc, teklif: function () { formAc('teklif', ek); }, talep: function () { formAc('teklif', ek); },
      firmalar: firmalarAc, dergi: dergiAc, ciftler: ciftlerAc, menu: menuAc, ozellikler: ozelliklerAc, galeri: galeriAc, makyaj: makyajAc })[k]();
  }

  function sekmeAc(i) {
    $$('.bolme').forEach(function (b, n) { b.classList.toggle('aktif', n === i); });
    $$('.sekme button').forEach(function (b, n) { b.setAttribute('aria-selected', n === i ? 'true' : 'false'); });
    window.scrollTo({ top: 0 });
  }

  var tikH = null;
  function tarihIsaret(k) { $$('input[type=date]', k || document).forEach(function (i) { i.classList.toggle('dolu', !!i.value); }); }
  document.addEventListener('change', function (e) { if (e.target && e.target.type === 'date') tarihIsaret(e.target.parentNode); });
  document.addEventListener('input', function (e) { if (e.target && e.target.type === 'date') e.target.classList.toggle('dolu', !!e.target.value); });
  function bagla() {
    if (tikH) document.removeEventListener('click', tikH);
    tikH = function (e) {
      var ms = e.target.closest('[data-menusec]');
      if (ms) { islemCalistir('teklif', { menu: ms.getAttribute('data-menusec') }); return; }
      var mi = e.target.closest('[data-menu]');
      if (mi) { menuAc(mi.getAttribute('data-menu')); return; }
      var b = e.target.closest('[data-islem]');
      if (b) { islemCalistir(b.getAttribute('data-islem')); return; }
      var an = e.target.closest('[data-ankraj]');
      if (an) { var hd = document.getElementById(an.getAttribute('data-ankraj')); if (hd) { var pn = hd.closest('.bolme'); if (pn && !pn.classList.contains('aktif') && !window.matchMedia('(min-width: 960px)').matches) sekmeAc(+pn.id.slice(1)); hd.scrollIntoView({ behavior: 'smooth', block: 'start' }); } return; }
      var s = e.target.closest('.sekme button');
      if (s) { sekmeAc(+s.getAttribute('data-s')); return; }
      var f = e.target.closest('[data-foto]');
      if (f) { buyut(+f.getAttribute('data-foto')); return; }
      var mf = e.target.closest('[data-mfoto]');
      if (mf) { buyut(+mf.getAttribute('data-mfoto'), MAKYAJ.foto); return; }
      var v = e.target.closest('[data-video], [data-klip], [data-mvideo]');
      if (v) { videoOynat(v); }
    };
    document.addEventListener('click', tikH);
    $('#menuDugme').addEventListener('click', menuPenceresi);
    $('#kvkkAc').addEventListener('click', kvkkAc);

    var gs = $('#galeriSeri');
    if (gs) {
      var kartlar = $$('button', gs), noktalar = $$('#galNokta button');
      function aktifIdx() {
        if (gs.scrollLeft + gs.clientWidth >= gs.scrollWidth - 4) return kartlar.length - 1;
        var en = 0, fark = 1e9;
        kartlar.forEach(function (k, i) { var d = Math.abs(k.offsetLeft - gs.offsetLeft - gs.scrollLeft); if (d < fark) { fark = d; en = i; } });
        return en;
      }
      function noktaGuncelle() { var a = aktifIdx(); noktalar.forEach(function (n, i) { n.classList.toggle('ak', i === a); }); }
      function git(i) { i = Math.max(0, Math.min(kartlar.length - 1, i)); gs.scrollTo({ left: kartlar[i].offsetLeft - gs.offsetLeft, behavior: 'smooth' }); }
      function adim() { return kartlar.length > 1 ? kartlar[1].offsetLeft - kartlar[0].offsetLeft : gs.clientWidth; }
      $('#galSol').addEventListener('click', function () { gs.scrollBy({ left: -adim(), behavior: 'smooth' }); });
      $('#galSag').addEventListener('click', function () { gs.scrollBy({ left: adim(), behavior: 'smooth' }); });
      noktalar.forEach(function (n, i) { n.addEventListener('click', function () { git(i); }); });
      gs.addEventListener('scroll', function () { window.requestAnimationFrame(noktaGuncelle); }, { passive: true });
      if (kartlar.length < 2) { $('#galSol').classList.add('gizli'); $('#galSag').classList.add('gizli'); $('#galNokta').classList.add('gizli'); }
    }
    var t = $('#tarihSor');
    if (t) t.addEventListener('change', function () { tarihSor(t.value); });

    var of = $('#ozelForm');
    if (of) of.addEventListener('submit', function (e) { e.preventDefault(); ozelGiris(); });

    /* İki bölme arasında yana kaydırma */
    if ($('.sekme')) {
      var x0 = 0, y0 = 0, yok = false;
      var m = $('main');
      m.addEventListener('touchstart', function (e) { var t0 = e.touches[0]; x0 = t0.clientX; y0 = t0.clientY; yok = !!e.target.closest('.galeri-seri, .vt-seri, .cf-liste, iframe, input, textarea, select'); }, { passive: true });
      m.addEventListener('touchend', function (e) {
        if (yok) return;
        var t1 = e.changedTouches[0], dx = t1.clientX - x0, dy = t1.clientY - y0;
        if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) sekmeAc(dx < 0 ? 1 : 0);
      }, { passive: true });
    }
  }

  /* ---------- Pencere ---------- */
  var acikPencere = null;
  function pencere(baslik, govde) {
    kapatPencere();
    var perde = document.createElement('div');
    perde.className = 'perde';
    perde.innerHTML = '<div class="pencere" role="dialog" aria-modal="true" aria-label="' + esc(baslik) + '" tabindex="-1"><div class="pencere-ust"><h2>' + esc(baslik) + '</h2>' +
      '<button class="kapat" type="button" aria-label="Kapat">' + ik('kapat') + '</button></div><div class="pencere-ic">' + govde + '</div></div>';
    document.body.appendChild(perde);
    document.body.style.overflow = 'hidden';
    var onceki = document.activeElement;
    perde.addEventListener('mousedown', function (e) { if (e.target === perde) kapatPencere(); });
    $('.kapat', perde).addEventListener('click', kapatPencere);
    function tus(e) { if (e.key === 'Escape') kapatPencere(); }
    document.addEventListener('keydown', tus);
    acikPencere = { el: perde, tus: tus, onceki: onceki };
    $('.pencere', perde).focus();
    return $('.pencere-ic', perde);
  }
  function kapatPencere() {
    if (!acikPencere) return;
    document.removeEventListener('keydown', acikPencere.tus);
    acikPencere.el.remove();
    document.body.style.overflow = '';
    try { if (acikPencere.onceki && acikPencere.onceki.focus) acikPencere.onceki.focus(); } catch (e) { /* yok say */ }
    acikPencere = null;
  }

  function menuPenceresi() {
    var h = '<div class="menu-liste">';
    ISLEMLER.forEach(function (x) { h += '<button data-m="' + x.k + '">' + ik(x.i) + esc(x.ad) + '</button>'; });
    if ($('.sekme')) h += '<button data-m="_ozel">' + ik('hediye') + 'Mini uygulamalar</button>';
    h += '</div>';
    var ic = pencere(M.ad, h);
    ic.addEventListener('click', function (e) {
      var b = e.target.closest('[data-m]'); if (!b) return;
      var k = b.getAttribute('data-m');
      kapatPencere();
      if (k === '_ozel') sekmeAc(1); else islemCalistir(k);
    });
  }

  /* ---------- Galeri büyütme ---------- */
  function galeriAc() {
    var h = '<div class="galeri-tum">';
    GALERI.forEach(function (f, i) {
      var u = O.guvenliUrl(f.url); if (!u) return;
      h += '<button type="button" data-foto="' + i + '" aria-label="' + esc(f.baslik || 'Fotoğrafı büyüt') + '"><img loading="lazy" src="' + esc(u) + '" alt="' + esc(f.baslik || M.ad) + '"></button>';
    });
    pencere('Galeri', h + '</div>');
  }

  function buyut(i, liste) {
    var GL = liste || GALERI;
    if (!GL[i]) return;
    var l = document.createElement('div');
    l.className = 'lightbox'; l.setAttribute('role', 'dialog'); l.setAttribute('aria-label', 'Fotoğraf');
    var coklu = GL.length > 1;
    l.innerHTML = '<button class="kapat" aria-label="Kapat">' + ik('kapat', 26) + '</button>' +
      (coklu ? '<button class="lb-ok sol" aria-label="Önceki">' + ik('sol', 28) + '</button><button class="lb-ok sag" aria-label="Sonraki">' + ik('sag', 28) + '</button>' : '') +
      '<img alt=""><div class="lb-say"></div>';
    var img = $('img', l), say = $('.lb-say', l);
    function goster() {
      var f = GL[i];
      img.src = O.guvenliUrl(f.url) || ''; img.alt = f.baslik || M.ad;
      say.textContent = (f.baslik ? f.baslik + '  ' : '') + (i + 1) + ' / ' + GL.length;
    }
    function git(d) { i = (i + d + GL.length) % GL.length; goster(); }
    function kapat() { l.remove(); document.removeEventListener('keydown', tus); }
    function tus(e) {
      if (e.key === 'Escape') kapat();
      else if (e.key === 'ArrowLeft' && coklu) git(-1);
      else if (e.key === 'ArrowRight' && coklu) git(1);
    }
    l.addEventListener('click', function (e) {
      if (e.target.closest('.lb-ok')) { git(e.target.closest('.lb-ok').classList.contains('sol') ? -1 : 1); return; }
      if (e.target !== img) kapat();
    });
    var x0 = 0;
    l.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    l.addEventListener('touchend', function (e) { var dx = e.changedTouches[0].clientX - x0; if (coklu && Math.abs(dx) > 50) git(dx < 0 ? 1 : -1); }, { passive: true });
    document.addEventListener('keydown', tus);
    document.body.appendChild(l);
    goster();
    $('.kapat', l).focus();
  }

  /* ---------- Tarih müsaitliği ---------- */
  async function tarihSor(d) {
    var kutu = $('#tarihSonuc');
    if (!d) { kutu.className = 'tarih-sonuc'; return; }
    if (d < O.bugunISO()) { kutu.className = 'tarih-sonuc bilgi'; kutu.textContent = 'Geçmiş bir tarih seçtiniz.'; return; }
    kutu.className = 'tarih-sonuc bilgi'; kutu.textContent = 'Kontrol ediliyor...';
    var r = await sb.rpc('dolu_gunler', { p_slug: A.MEKAN_SLUG, p_bas: d, p_son: d });
    if (r.error) { kutu.className = 'tarih-sonuc bilgi'; kutu.textContent = 'Şu an kontrol edilemedi. Teklif isteyerek sorabilirsiniz.'; return; }
    var n = (r.data || []).length, salon = Math.max(1, D.salonlar.length);
    var tr = O.tarihTR(d), msg, sinif;
    if (n >= salon) { sinif = 'dolu'; msg = tr + ' için tüm salonlarımız dolu görünüyor. Yine de teklif isteyerek yer açılırsa haberdar olabilirsiniz.'; }
    else if (n > 0) { sinif = 'musait'; msg = tr + ' için ' + (salon - n) + ' salonumuz müsait.'; }
    else { sinif = 'musait'; msg = tr + ' müsait görünüyor.'; }
    kutu.className = 'tarih-sonuc ' + sinif;
    kutu.innerHTML = '<span>' + esc(msg) + '</span><button class="btn ana kucuk" type="button" id="tarihTalep">Bu tarih için teklif al</button>';
    $('#tarihTalep').addEventListener('click', function () { formAc('teklif', { tarih: d }); });
  }

  /* ---------- Fiyatlar / menü / özellikler / firmalar ---------- */
  function fiyatMetni(k) {
    if (k.fiyat === null || k.fiyat === undefined) return '<div class="fy yok">Teklif alınız</div>';
    var birim = k.birim === 'kisi_basi' ? 'kişi başı' : (k.birim === 'adet' ? 'adet' : '');
    return '<div class="fy">' + esc(O.para(k.fiyat)) + (birim ? '<small>' + birim + '</small>' : '') + '</div>';
  }
  function kalemSatir(k) {
    return '<div class="kalem"><div><div class="ad">' + esc(k.ad) + '</div>' + (k.aciklama ? '<div class="ac">' + esc(k.aciklama) + '</div>' : '') + '</div>' + fiyatMetni(k) + '</div>';
  }
  function gruplar() {
    var g = D.kat.map(function (c) { return { ad: c.ad, kalemler: D.kalem.filter(function (k) { return k.kategori_id === c.id; }) }; });
    var diger = D.kalem.filter(function (k) { return !k.kategori_id || !D.kat.some(function (c) { return c.id === k.kategori_id; }); });
    if (diger.length) g.push({ ad: g.length ? 'Diğer hizmetler' : 'Hizmetler', kalemler: diger });
    return g.filter(function (x) { return x.kalemler.length; });
  }

  function fiyatlarAc() {
    var g = gruplar(), h = '';
    if (!g.length) h = '<p class="not">Fiyat listesi henüz yayınlanmadı. Teklif isteyebilirsiniz.</p>';
    g.forEach(function (c, i) {
      h += '<details class="kat"' + (i === 0 ? ' open' : '') + '><summary>' + esc(c.ad) + ik('sag', 18) + '</summary>' + c.kalemler.map(kalemSatir).join('') + '</details>';
    });
    h += '<p class="not" style="margin:16px 0 14px">Fiyatlar bilgilendirme amaçlıdır. Tarihe ve kapsama göre kesin fiyatı teklifte görürsünüz.</p>' +
      '<button class="btn ana tam" id="fTeklif">Teklif al</button>';
    var ic = pencere('Güncel fiyatlar', h);
    $('#fTeklif', ic).addEventListener('click', function () { formAc('teklif'); });
  }

  function ytKapak(u) { var m = String(u || '').match(/(?:shorts\/|v=|youtu\.be\/|embed\/|live\/)([A-Za-z0-9_-]{11})/); return m ? 'https://i.ytimg.com/vi/' + m[1] + '/hqdefault.jpg' : ''; }
  function videoKart(attr, i, v) {
    var k = ytKapak(v.url);
    return '<button type="button" class="video' + (k ? ' kapakli' : '') + '" ' + attr + '="' + i + '"' + (k ? ' style="background-image:url(' + esc(k) + ')"' : '') + ' aria-label="' + esc((v.baslik || 'Videoyu') + ' oynat') + '"><span class="pl">' + ik('oynat', 26) + '</span><span class="et">' + esc(v.baslik || '') + '</span></button>';
  }
  function klipAc() {
    var h = '<div class="video-izgara">';
    KLIPLER.forEach(function (v, i) { h += videoKart('data-klip', i, v); });
    pencere('Kliplerimiz', h + '</div>');
  }

  function makyajAc() {
    var h = '';
    if (M.makyaj_yazi) h += String(M.makyaj_yazi).split(/\n{2,}/).map(function (p) { return '<p class="mk-yazi">' + esc(p.trim()).replace(/\n/g, '<br>') + '</p>'; }).join('');
    if (MAKYAJ.foto.length) {
      h += '<div class="mk-foto">' + MAKYAJ.foto.map(function (f, i) {
        var u = O.guvenliUrl(f.url); return u ? '<button type="button" data-mfoto="' + i + '" aria-label="' + esc(f.baslik || 'Fotoğrafı büyüt') + '"><img loading="lazy" src="' + esc(u) + '" alt="' + esc(f.baslik || 'Make-up') + '"></button>' : '';
      }).join('') + '</div>';
    }
    if (D.makyaj.length) {
      h += '<h3 class="mk-alt">Yapılan işlemler</h3><ul class="mk-hiz">' + D.makyaj.map(function (x) {
        return '<li><h3>' + esc(x.baslik) + '</h3>' + (x.aciklama ? String(x.aciklama).split(/\n{2,}/).map(function (p) { return '<p>' + esc(p.trim()).replace(/\n/g, '<br>') + '</p>'; }).join('') : '') +
          (x.fiyat != null && x.fiyat !== '' ? '<span class="mk-fiyat">' + esc(O.para(x.fiyat)) + '</span>' : '') + '</li>';
      }).join('') + '</ul>';
    }
    if (MAKYAJ.video.length) h += '<h3 class="mk-alt">Videolar</h3><div class="video-izgara">' + MAKYAJ.video.map(function (v, i) { return videoKart('data-mvideo', i, v); }).join('') + '</div>';
    var wa = O.waLink(M.whatsapp || M.telefon, 'Merhaba, make-up hizmeti hakkında bilgi almak istiyorum.');
    if (wa) h += '<p style="margin:16px 0 0"><a class="btn ana tam" target="_blank" rel="noopener" href="' + esc(wa) + '">' + ik('whatsapp', 20) + 'Make-up için WhatsApp\'tan yaz</a></p>';
    pencere(M.makyaj_baslik || 'Make-up', h || '<p class="not">Yakında burada.</p>');
  }

  function menuBlok(m) {
    var bolumler = O.menuAyir ? O.menuAyir(m.icerik) : [];
    var h = '';
    bolumler.forEach(function (b) {
      h += '<div class="menu-bolum">' + (b.baslik ? '<h4>' + esc(b.baslik) + '</h4>' : '') + '<ul>' + b.ogeler.map(function (o) { return '<li>' + esc(o) + '</li>'; }).join('') + '</ul></div>';
    });
    var hiz = O.satirlar ? O.satirlar(m.dahil_hizmetler) : [];
    if (hiz.length) h += '<div class="menu-bolum menu-hizmet"><h4>Menüye dahil hizmetler</h4><ul>' + hiz.map(function (o) { return '<li>' + esc(o) + '</li>'; }).join('') + '</ul></div>';
    if (m.not_metni) h += '<p class="menu-not">' + esc(m.not_metni) + '</p>';
    return h;
  }

  function etTuru(m) {
    var bl = O.menuAyir ? O.menuAyir(m.icerik) : [];
    var ana = bl.filter(function (x) { return /ana\s*yemek/i.test(x.baslik); }), kay = ana.length ? ana : bl, k = false, b = false;
    kay.forEach(function (x) { x.ogeler.forEach(function (sat) {
      var t = sat.toLocaleLowerCase('tr');
      if (/kırmızı et/.test(t)) k = true;
      if (/beyaz et/.test(t)) b = true;
      if (/tavuk|piliç|pilic|hindi|balık|balik|somon|levrek|çupra|cupra|karides/.test(t)) b = true;
      else if (/(^|[^a-zçğıöşü])et([^a-zçğıöşü]|$)|etli|dana|kuzu|biftek|bonfile|antrikot|kebap|köfte|kofte|kavurma|tandır|tandir|kaburga|şinitzel|schnitzel|pirzola|incik|döner|doner/.test(t)) k = true;
    }); });
    return k && b ? 'Kırmızı et ve beyaz et menü' : (k ? 'Kırmızı et menü' : (b ? 'Beyaz et menü' : ''));
  }
  function menuAdi(m) { var t = etTuru(m); return m.ad + (t ? ' (' + t + ')' : ''); }
  function fiyatYaz(m) {
    if (m.fiyat_kisi == null && m.fiyat_kisi_max == null) return '';
    var fm = function (n) { return Math.round(+n).toLocaleString('tr-TR'); }, x = m.fiyat_kisi, y = m.fiyat_kisi_max;
    if (x != null && y != null && +y > +x) return fm(x) + ' - ' + fm(y) + ' TL';
    return fm(x != null ? x : y) + ' TL';
  }
  function menuAc(acikId) {
    if (!D.menu.length) { pencere('Menü', '<div class="bos">Menü yakında burada olacak.</div>'); return; }
    var h = '<div class="menu-liste">', secili = acikId ? D.menu.filter(function (m) { return m.id === acikId; }) : [];
    (secili.length ? secili : D.menu).forEach(function (m, i) {
      h += '<details class="menu-kart"' + (secili.length || D.menu.length === 1 ? ' open' : '') + '><summary><b>' + esc(menuAdi(m)) + '</b>' +
        (fiyatYaz(m) ? '<span class="menu-fy">' + esc(fiyatYaz(m)) + ' <small>kişi başı</small></span>' : '') + '</summary>' +
        (m.fiyat_notu ? '<p class="menu-fnot">' + esc(m.fiyat_notu) + '</p>' : '') + (m.aciklama ? '<p class="not" style="margin:8px 0 0">' + esc(m.aciklama) + '</p>' : '') + menuBlok(m) + '</details>';
    });
    pencere(secili.length ? secili[0].ad : 'Menüler', h + '</div>');
  }

  function ciftlerAc() {
    var liste = D.ciftler || [], kat = [];
    liste.forEach(function (c) { var k = c.kategori || 'Düğün'; if (kat.indexOf(k) < 0) kat.push(k); });
    var h = '<div class="cf-chip" role="tablist" aria-label="Kategori"><button type="button" class="ak" data-k="">Tümü</button>' + kat.map(function (k) { return '<button type="button" data-k="' + esc(k) + '">' + esc(k) + '</button>'; }).join('') + '</div><div class="cf-liste" id="cfListe"></div>' +
      '<div class="cf-alt"><b>Siz de yorumunuzu yazın</b><p class="not" style="margin:4px 0 12px">' + esc(M.ad) + ' ile anlaşan çiftler, size verilen şifreyle giriş yapıp yorumlarını yazabilir.</p>' + (acik('cift_ozel') ? '<button type="button" class="btn ana" id="cfYorumGit">Şifremle giriş yap</button>' : '') + '</div>';
    var ic = pencere('Çiftlerimiz', h);
    function ciz(k) {
      if (!liste.length) { $('#cfListe', ic).innerHTML = '<div class="bos">Çiftlerimizin fotoğrafları ve yorumları yakında burada olacak.</div>'; return; }
      $('#cfListe', ic).innerHTML = liste.filter(function (c) { return !k || (c.kategori || 'Düğün') === k; }).map(function (c) {
        var u = O.guvenliUrl(c.foto_url);
        return '<article class="cf-kart">' + (u ? '<img loading="lazy" src="' + esc(u) + '" alt="' + esc(c.ad) + '">' : '<div class="cf-fotosuz">' + ik('yildiz', 28) + '</div>') +
          '<div class="cf-ic"><small>' + esc(c.kategori || 'Düğün') + '</small><b>' + esc(c.ad) + '</b>' + (c.yorum ? '<blockquote>' + esc(c.yorum) + '</blockquote>' : '') + '</div></article>';
      }).join('');
    }
    ciz('');
    $('.cf-chip', ic).addEventListener('click', function (e) {
      var b = e.target.closest('[data-k]'); if (!b) return;
      $$('.cf-chip button', ic).forEach(function (x) { x.classList.toggle('ak', x === b); }); ciz(b.getAttribute('data-k'));
    });
    var g = $('#cfYorumGit', ic);
    if (g) g.addEventListener('click', function () {
      kapatPencere(); var hd = document.getElementById('ozelK');
      if (hd) { var pn = hd.closest('.bolme'); if (pn && !pn.classList.contains('aktif') && !window.matchMedia('(min-width: 960px)').matches) sekmeAc(+pn.id.slice(1)); hd.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  }

  function dergiAc() {
    if (!window.DERGI) { pencere('Foto Dergi', '<div class="bos">Foto Dergi yüklenemedi. Sayfayı yenileyin.</div>'); return; }
    var ig = String(M.instagram || '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[\/?].*$/, '').replace(/^@/, '');
    window.DERGI.ac({ pencere: pencere, mekan: M, ik: ik, instagram: ig ? '@' + ig : '' });
  }

  function ozelliklerAc() {
    if (!D.ozellik.length) { pencere('Mekan özellikleri', '<div class="bos">Mekan özellikleri yakında burada olacak.</div>'); return; }
    var h = '<ul class="liste-yalin">';
    D.ozellik.forEach(function (o) { h += '<li><b>' + esc(o.baslik) + '</b>' + (o.aciklama ? '<span>' + esc(o.aciklama) + '</span>' : '') + '</li>'; });
    pencere('Mekan özellikleri', h + '</ul>');
  }

  function firmalarAc() {
    var h = '<p class="not" style="margin:0 0 14px">' + esc(M.ad) + ' çiftlerine özel indirim sunan firmalar: gelin arabası, çiçekçi, fotoğrafçı, gelinlikçi, make-up, bando ve catering.</p>';
    if (!D.firma.length) h += '<div class="bos">Anlaşmalı firmalar yakında burada olacak.</div>';
    D.firma.forEach(function (f) {
      var ig = O.instagramUrl(f.instagram), web = O.guvenliUrl(f.web), tel = String(f.telefon || '').replace(/[^\d+]/g, '');
      h += '<div class="firma"><div class="firma-ust"><div><h3>' + esc(f.ad) + '</h3>' + (f.kategori ? '<div class="kategori">' + esc(f.kategori) + '</div>' : '') + '</div>' +
        (f.indirim_oran > 0 ? '<span class="indirim">%' + esc(+f.indirim_oran) + ' indirim</span>' : '') + '</div>' +
        (f.aciklama ? '<p>' + esc(f.aciklama) + '</p>' : '<p></p>') + '<div class="satir">' +
        (ig ? '<a class="btn hafif kucuk" data-f="' + esc(f.id) + '" target="_blank" rel="noopener" href="' + esc(ig) + '">' + ik('instagram', 18) + 'Instagram</a>' : '') +
        (web ? '<a class="btn hafif kucuk" data-f="' + esc(f.id) + '" target="_blank" rel="noopener" href="' + esc(web) + '">' + ik('web', 18) + 'Web sitesi</a>' : '') +
        (tel ? '<a class="btn hafif kucuk" data-f="' + esc(f.id) + '" href="tel:' + esc(tel) + '">' + ik('telefon', 18) + 'Ara</a>' : '') +
        '</div></div>';
    });
    var ic = pencere('Anlaşmalı firmalar', h);
    ic.addEventListener('click', function (e) {
      var a = e.target.closest('[data-f]');
      if (a) { try { sb.rpc('firma_yonlendir', { p_firma: a.getAttribute('data-f') }).then(function () { }, function () { }); } catch (x) { /* sayaç hatası önemsiz */ } }
    });
  }

  /* ---------- Teklif / Talep formu ---------- */
  function secimListesi(acikMi) {
    var g = gruplar(); if (!g.length) return '';
    var h = '<details class="sec-kat"' + (acikMi ? ' open' : '') + '><summary style="font-weight:600;min-height:44px;display:flex;align-items:center;cursor:pointer">İstediğiniz hizmetler <span class="not" style="margin-left:8px">(isteğe bağlı)</span></summary>';
    g.forEach(function (c) {
      h += '<div class="sec-kat"><b>' + esc(c.ad) + '</b>';
      c.kalemler.forEach(function (k) {
        h += '<label class="sec"><input type="checkbox" name="kalem" value="' + esc(k.id) + '"><span>' + esc(k.ad) + '</span>' +
          (k.fiyat != null ? '<small>' + esc(O.para(k.fiyat)) + (k.birim === 'kisi_basi' ? ' / kişi' : '') + '</small>' : '') + '</label>';
      });
      h += '</div>';
    });
    return h + '</details>';
  }

  function formAc(tur, ek) {
    ek = ek || {};
    var teklifMi = tur === 'teklif';
    var h = '<form id="tf" novalidate>';
    h += '<p class="not" style="margin:0 0 16px">' + (teklifMi
      ? 'Tarihi, kişi sayınızı ve menünüzü seçin. ' + esc(M.ad) + ' size özel fiyatı hazırlayıp e-posta ya da WhatsApp ile iletir.'
      : 'Düğününüzle ilgili isteklerinizi yazın. ' + esc(M.ad) + ' size en kısa sürede dönüş yapar.') + '</p>';
    h += '<label class="alan"><span>Organizasyon türü</span><select name="tur_org" required><option value="Düğün" selected>Düğün</option><option value="Nişan">Nişan</option><option value="Diğer organizasyon">Diğer organizasyon</option></select></label>';
    h += '<div class="ikili"><label class="alan"><span id="tarihEtiket">Düğün tarihi</span><span class="tarih-sar"><input type="date" name="tarih" min="' + O.bugunISO() + '" value="' + esc(ek.tarih || '') + '" required><span class="tarih-ph" aria-hidden="true">gg.aa.yyyy</span></span></label>' +
      '<label class="alan"><span>Kişi sayısı</span><input type="number" name="kisi" inputmode="numeric" min="1" max="5000" placeholder="300"></label></div>';
    if (D.salonlar.length > 1) {
      h += '<label class="alan"><span>Salon</span><select name="salon"><option value="">Fark etmez</option>' +
        D.salonlar.map(function (s) { return '<option value="' + esc(s.id) + '">' + esc(s.ad) + (s.kapasite ? ' (' + esc(s.kapasite) + ' kişi)' : '') + '</option>'; }).join('') + '</select></label>';
    }
    var seciliMenu = ek.menu ? D.menu.filter(function (m) { return m.id === ek.menu; })[0] : null;
    if (seciliMenu && acik('menu')) {
      h += '<div class="alan"><span>Seçtiğiniz menü</span><div class="menu-secili"><b>' + esc(menuAdi(seciliMenu)) + '</b>' + (fiyatYaz(seciliMenu) ? '<span>' + esc(fiyatYaz(seciliMenu)) + ' / kişi</span>' : '') + '</div><input type="hidden" name="menu" value="' + esc(seciliMenu.id) + '"></div>';
    } else if (D.menu.length && acik('menu')) {
      h += '<label class="alan"><span>Menü</span><select name="menu"><option value="">Henüz seçmedim</option>' +
        D.menu.map(function (m) { return '<option value="' + esc(m.id) + '"' + (ek.menu === m.id ? ' selected' : '') + '>' + esc(menuAdi(m)) + (fiyatYaz(m) ? ' - ' + esc(fiyatYaz(m)) + ' / kişi' : '') + '</option>'; }).join('') + '</select></label>';
    }
    h += '<div id="menuOnizle"></div>';
    h += '<div class="ikili"><label class="alan"><span>Adınız</span><input name="ad" autocomplete="given-name" required></label>' +
      '<label class="alan"><span>Soyadınız</span><input name="soyad" autocomplete="family-name" required></label></div>';
    h += '<label class="alan"><span>Telefon</span><input name="tel" type="tel" inputmode="tel" autocomplete="tel" placeholder="0532 123 45 67" required></label>';
    h += '<label class="alan"><span>E-posta</span><input name="eposta" type="email" inputmode="email" autocomplete="email" placeholder="ad@ornek.com" required></label>';
    h += '<label class="alan"><span>Eklemek istedikleriniz <em>(isteğe bağlı)</em></span><textarea name="not" maxlength="1500"></textarea></label>';
    h += '<label class="onay"><input type="checkbox" name="kvkk"><span>Kişisel verilerimin teklif ve rezervasyon için işlenmesine ilişkin <button type="button" class="kvkk-link" style="border:0;background:none;padding:0;text-decoration:underline">aydınlatma metnini</button> okudum, onaylıyorum.</span></label>';
    h += '<div id="tfHata"></div><button class="btn ana tam" type="submit">' + (teklifMi ? 'Teklif iste' : 'Talebi gönder') + '</button></form>';

    var ic = pencere(teklifMi ? 'Teklif al' : 'Talep gir', h);
    var f = $('#tf', ic); tarihIsaret(f);
    $('.kvkk-link', ic).addEventListener('click', kvkkAc);
    var ms = f.elements.menu;
    var to = f.elements.tur_org;
    function turGuncelle() { var e = $('#tarihEtiket', ic); if (e) e.textContent = (to.value === 'Düğün' ? 'Düğün' : to.value === 'Nişan' ? 'Nişan' : 'Organizasyon') + ' tarihi'; }
    if (to) to.addEventListener('change', turGuncelle);
    function menuOnizleCiz() { var m = D.menu.filter(function (x) { return x.id === ms.value; })[0]; $('#menuOnizle', ic).innerHTML = m ? '<div class="menu-kart acik">' + menuBlok(m) + '</div>' : ''; }
    if (ms && ms.value) menuOnizleCiz();
    if (ms) ms.addEventListener('change', function () {
      var m = D.menu.filter(function (x) { return x.id === ms.value; })[0];
      $('#menuOnizle', ic).innerHTML = m ? '<div class="menu-kart acik">' + menuBlok(m) + '</div>' : '';
    });
    f.addEventListener('submit', function (e) { e.preventDefault(); formGonder(f, ic, tur); });
  }

  function formGonder(f, ic, tur) {
    var v = function (n) { var x = f.elements[n]; return x ? String(x.value || '').trim() : ''; };
    var kutu = $('#tfHata', ic);
    function hata(m) { kutu.innerHTML = '<div class="hata-kutu" role="alert">' + esc(m) + '</div>'; kutu.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    var tel = v('tel').replace(/\D/g, '');
    if (!v('tur_org')) return hata('Organizasyon türünü seçin.');
    if (!v('tarih')) return hata('Tarihi seçin.');
    if (v('tarih') < O.bugunISO()) return hata(O.hataMetni({ message: 'tarih_gecersiz' }));
    if (v('ad').length < 2 || v('soyad').length < 2) return hata(O.hataMetni({ message: 'ad_soyad_gerekli' }));
    if (tel.length < 10 || tel.length > 13) return hata(O.hataMetni({ message: 'telefon_gecersiz' }));
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v('eposta'))) return hata(O.hataMetni({ message: 'eposta_gecersiz' }));
    if (!f.elements.kvkk.checked) return hata(O.hataMetni({ message: 'kvkk_onayi_gerekli' }));
    var kalemler = $$('input[name=kalem]:checked', f).map(function (i) { return i.value; });
    if (tur === 'teklif' && D.menu.length && !v('menu')) return hata('Teklif için bir menü seçin.');

    var dugme = $('button[type=submit]', f); dugme.disabled = true; dugme.textContent = 'Gönderiliyor...';
    sb.rpc('talep_olustur', {
      p_slug: A.MEKAN_SLUG, p_tur: tur, p_ad: v('ad'), p_soyad: v('soyad'), p_telefon: v('tel'), p_eposta: v('eposta'),
      p_dugun_tarihi: v('tarih'), p_kvkk: true, p_kisi_sayisi: v('kisi') ? parseInt(v('kisi'), 10) : null,
      p_salon_id: v('salon') || null, p_menu_id: v('menu') || null, p_not: ('Organizasyon türü: ' + v('tur_org') + (v('not') ? '\n' + v('not') : '')), p_kalemler: kalemler
    }).then(function (r) {
      if (r.error) {
        dugme.disabled = false; dugme.textContent = tur === 'teklif' ? 'Teklif iste' : 'Talebi gönder';
        return hata(O.hataMetni(r.error));
      }
      var wa = O.waLink(M.whatsapp || M.telefon, 'Merhaba, ' + O.tarihTR(v('tarih')) + ' tarihli ' + v('tur_org').toLowerCase() + ' için ' + (tur === 'teklif' ? 'teklif' : 'talep') + ' gönderdim. Adım: ' + v('ad') + ' ' + v('soyad'));
      ic.innerHTML = '<div class="ok-kutu" role="status"><b style="display:block;font-size:18px;margin-bottom:4px">' + (tur === 'teklif' ? 'Teklif talebiniz alındı' : 'Talebiniz alındı') + '</b>' +
        esc(M.ad) + ' en kısa sürede ' + esc(v('eposta')) + ' adresinize ya da telefonunuza dönüş yapacak.</div>' +
        '<div style="display:grid;gap:10px;margin-top:16px">' + (wa ? '<a class="btn hafif tam" target="_blank" rel="noopener" href="' + esc(wa) + '">' + ik('whatsapp', 20) + 'WhatsApp\'tan da yazın</a>' : '') +
        '<button class="btn cizgi tam" id="tamam">Tamam</button></div>';
      $('#tamam', ic).addEventListener('click', kapatPencere);
    }, function (e) { dugme.disabled = false; dugme.textContent = 'Tekrar dene'; hata(O.hataMetni(e)); });
  }

  /* ---------- Aydınlatma metni ---------- */
  function kvkkAc() {
    var metin = M.kvkk_metni || (M.ad + ', teklif ve rezervasyon talebinizi değerlendirmek ve sizinle iletişime geçmek amacıyla adınızı, soyadınızı, telefon numaranızı, e-posta adresinizi, düğün tarihinizi ve yazdığınız notları işler. ' +
      'Bilgileriniz yalnızca bu amaçla kullanılır ve üçüncü kişilerle paylaşılmaz. Verilerinizin silinmesini ya da düzeltilmesini ' + (M.eposta || M.telefon || 'mekan ile iletişime geçerek') + ' üzerinden isteyebilirsiniz.');
    pencere('Aydınlatma metni', '<p style="white-space:pre-line;margin:0">' + esc(metin) + '</p>');
  }

  /* ---------- Çiftlere özel giriş ---------- */
  async function ozelGiris() {
    var kod = $('#ozelKod').value, hataKutu = $('#ozelHata');
    var d = $('button[type=submit]', $('#ozelForm'));
    hataKutu.innerHTML = '';
    if (String(kod).replace(/[^A-Za-z0-9]/g, '').length !== 8) { hataKutu.innerHTML = '<div class="hata-kutu">Şifre 8 karakterdir. Örnek: ABCD-1234</div>'; return; }
    d.disabled = true;
    var r = await sb.rpc('cift_giris', { p_slug: A.MEKAN_SLUG, p_kod: kod });
    d.disabled = false;
    if (r.error) { hataKutu.innerHTML = '<div class="hata-kutu">' + esc(O.hataMetni(r.error)) + '</div>'; return; }
    if (!r.data) { hataKutu.innerHTML = '<div class="hata-kutu">Şifre doğru değil ya da süresi dolmuş. Şifrenizi mekandan tekrar isteyebilirsiniz.</div>'; return; }
    var x = r.data, link = O.guvenliUrl(x.indirme_linki);
    $('#ozelKutu').innerHTML = '<div class="hosgeldin"><h3>Hoş geldiniz, ' + esc(x.ad) + ' ' + esc(x.soyad) + '</h3>' +
      (x.dugun_tarihi ? '<p class="not" style="margin:0 0 8px">Düğün tarihiniz: <b>' + esc(O.tarihTR(x.dugun_tarihi)) + '</b></p>' : '') +
      (x.mesaj ? '<p style="margin:0 0 14px;white-space:pre-line">' + esc(x.mesaj) + '</p>' : '') +
      (link ? '<a class="btn ana tam" target="_blank" rel="noopener" href="' + esc(link) + '">' + ik('indir', 20) + 'Foto ve video indir</a>' +
        '<p class="not" style="margin:10px 0 0">Bağlantı açılmazsa mekanla iletişime geçin.</p>' : '<p class="not" style="margin:0">Fotoğraf ve videolarınız hazır olduğunda burada görünecek.</p>') +
      (x.bitis ? '<p class="not" style="margin:12px 0 0">Bu alan ' + esc(O.tarihTR(x.bitis)) + ' tarihine kadar açık.</p>' : '') +
      '<div class="yorum-kutu"><h4>' + esc(M.ad) + ' hakkında yorumunuz</h4><label class="alan"><span>Adınız <em>(sitede görünür)</em></span><input id="yrAd" maxlength="80" value="' + esc((x.ad + ' ' + x.soyad).trim()) + '"></label>' +
      '<label class="alan"><span>Yorumunuz</span><textarea id="yrMetin" rows="4" maxlength="1000" placeholder="Düğününüz nasıldı? Düşüncelerinizi yazın."></textarea></label><div id="yrH"></div><button type="button" class="btn ana" id="yrGonder">Yorumu gönder</button>' +
      '<p class="not" style="margin:8px 0 0">Yorumunuz ' + esc(M.ad) + ' onayından sonra Çiftlerimiz sayfasında yayınlanır.</p></div></div>';
    sb.rpc('cift_yorum_oku', { p_slug: A.MEKAN_SLUG, p_kod: kod }).then(function (o) {
      if (o && o.data && o.data.yorum) { $('#yrMetin').value = o.data.yorum; if (o.data.ad) $('#yrAd').value = o.data.ad; }
    }, function () { /* tablo yoksa sessiz */ });
    $('#yrGonder').addEventListener('click', async function () {
      var d = $('#yrGonder'), m = $('#yrMetin').value.trim(), hk = $('#yrH');
      if (m.length < 5) { hk.innerHTML = '<div class="hata-kutu">Lütfen yorumunuzu yazın.</div>'; return; }
      d.disabled = true; hk.innerHTML = '';
      var r = await sb.rpc('cift_yorum_yaz', { p_slug: A.MEKAN_SLUG, p_kod: kod, p_ad: $('#yrAd').value.trim(), p_yorum: m });
      d.disabled = false;
      if (r.error || !r.data) { hk.innerHTML = '<div class="hata-kutu">' + esc(r.error ? O.hataMetni(r.error) : 'Yorum kaydedilemedi. Şifrenizi kontrol edin.') + '</div>'; return; }
      hk.innerHTML = '<div class="ok-kutu" role="status">Yorumunuz alındı, teşekkürler. Onaydan sonra yayınlanacak.</div>';
    });
  }

  /* ---------- Videolar ---------- */
  function videoOynat(btn) {
    var v = btn.hasAttribute('data-mvideo') ? MAKYAJ.video[+btn.getAttribute('data-mvideo')] : (btn.hasAttribute('data-klip') ? KLIPLER[+btn.getAttribute('data-klip')] : VIDEOLAR[+btn.getAttribute('data-video')]); if (!v) return;
    var src = '', u = String(v.url || ''), m;
    m = u.match(/(?:shorts\/|v=|youtu\.be\/|embed\/|live\/)([A-Za-z0-9_-]{11})/);
    if (m) {
      src = 'https://www.youtube-nocookie.com/embed/' + m[1] + '?autoplay=1&playsinline=1&rel=0';
    }
    var link = O.guvenliUrl(u);
    if (!src) { if (link) window.open(link, '_blank', 'noopener'); return; }
    btn.outerHTML = '<div class="video"><iframe title="' + esc(v.baslik || 'Video') + '" src="' + esc(src) + '" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>';
  }

  /* ---------- Çerez bilgisi ---------- */
  function cerezUyari() {
    if (document.querySelector('.cerez')) return;
    try { if (localStorage.getItem('cerez_ok') === '1') return; } catch (e) { /* depolama yoksa göster */ }
    var c = document.createElement('div');
    c.className = 'cerez'; c.setAttribute('role', 'region'); c.setAttribute('aria-label', 'Çerez bilgisi');
    c.innerHTML = '<span style="flex:1">Bu site yalnızca çalışması için gerekli çerezleri kullanır. Reklam ya da izleme çerezi kullanılmaz.</span><button class="btn kucuk" type="button">Tamam</button>';
    document.body.appendChild(c);
    $('button', c).addEventListener('click', function () {
      try { localStorage.setItem('cerez_ok', '1'); } catch (e) { /* önemsiz */ }
      c.remove();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', basla); else basla();
})();
