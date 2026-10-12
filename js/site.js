/* Genel site. Tüm içerik Supabase'ten gelir; mekan panelden girer, siteye otomatik düşer. */
(function () {
  'use strict';
  var O = window.ORTAK, esc = O.esc, ik = O.ikon, A = window.AYAR;
  var $ = function (s, k) { return (k || document).querySelector(s); };
  var $$ = function (s, k) { return Array.prototype.slice.call((k || document).querySelectorAll(s)); };

  var sb = null, M = null;
  var D = { salonlar: [], foto: [], video: [], kat: [], kalem: [], menu: [], ozellik: [], firma: [] };

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
    yukle().then(ciz).catch(function (e) {
      var m = e && e.message;
      if (m === 'mekan_yok') hataSayfasi('Mekan bulunamadı', 'Bu adres şu anda yayında değil.');
      else hataSayfasi('Sayfa yüklenemedi', 'İnternet bağlantınızı kontrol edip sayfayı yenileyin.');
      if (window.console) console.error(e);
    });
  }

  async function yukle() {
    var r = await sb.from('mekanlar').select('*').eq('slug', A.MEKAN_SLUG).maybeSingle();
    if (r.error) throw r.error;
    if (!r.data) throw new Error('mekan_yok');
    M = r.data;
    function s(t) { return sb.from(t).select('*').eq('mekan_id', M.id).order('sira', { ascending: true }); }
    var x = await Promise.all([s('salonlar'), s('mekan_fotograflari'), s('mekan_videolari'), s('fiyat_kategorileri'),
      s('fiyat_kalemleri'), s('menuler'), s('ozellikler'), s('anlasmali_firmalar')]);
    x.forEach(function (q) { if (q.error) throw q.error; });
    D.salonlar = x[0].data || []; D.foto = x[1].data || []; D.video = x[2].data || []; D.kat = x[3].data || [];
    D.kalem = x[4].data || []; D.menu = x[5].data || []; D.ozellik = x[6].data || []; D.firma = x[7].data || [];
  }

  function acik(k) { return !(M.bolumler && M.bolumler[k] === false); }

  /* ---------- Sayfa çizimi ---------- */
  function ciz() {
    O.renkUygula(M.ana_renk);
    document.title = M.ad + ' | Düğün ve organizasyon';

    var galeri = D.foto.filter(function (f) { return f.tur === 'galeri'; });
    if (!galeri.length && window.AYAR && window.AYAR.GALERI) galeri = window.AYAR.GALERI.map(function (u, i) { return { url: u, baslik: '' }; });   // geçici: mekan fotoğrafı yüklenene kadar
    var heroFoto = M.hero_url || (D.foto.filter(function (f) { return f.tur === 'hero'; })[0] || {}).url || (window.AYAR && window.AYAR.HERO) || (galeri[0] || {}).url || '';
    var wa = O.waLink(M.whatsapp || M.telefon, 'Merhaba, ' + M.ad + ' hakkında bilgi almak istiyorum.');
    var tel = String(M.telefon || '').replace(/[^\d+]/g, '');
    var harita = O.guvenliUrl(M.harita_url);
    var logo = O.guvenliUrl(M.logo_url) || (window.AYAR && window.AYAR.LOGO) || '';

    var videolar = acik('shorts') ? D.video.filter(function (v) { return v.bolum === 'shorts'; }) : [];
    var ozelAcik = acik('cift_ozel');
    var yak = acik('yakinda');                       // "Yakında" kutuları gösterilsin mi
    var klipler = acik('klipler') ? D.video.filter(function (v) { return v.bolum === 'klip'; }) : [];
    var ikinci = ozelAcik || videolar.length > 0 || yak;

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
      (D.kalem.length ? '<button class="btn cizgi" data-islem="fiyatlar">Fiyatları gör</button>' : '<button class="btn cizgi" data-islem="talep">Talep gir</button>') +
      '</div></div></div>';

    if (acik('tarih_sorgu')) {
      h += '<div class="tarih-kart"><h2>Düğün tarihiniz müsait mi?</h2><p class="not alt">Tarihi seçin, anında görün.</p>' +
        '<div class="tarih-satir"><label class="sr" for="tarihSor">Düğün tarihi</label><input type="date" id="tarihSor" min="' + O.bugunISO() + '"></div>' +
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
      { k: 'talep', ad: 'Talep gir', i: 'kalem', on: acik('talep') },
      { k: 'firmalar', ad: 'Anlaşmalı firmalar', i: 'el', alt: 'Gelin arabası, çiçekçi, fotoğrafçı, gelinlikçi, make-up, bando, catering', on: acik('firmalar') },
      { k: 'dj', ad: 'DJ müzik yükle', i: 'muzik', yak: true },
      { k: 'menu', ad: 'Menü', i: 'tabak', on: acik('menu') },
      { k: 'makeup', ad: 'Make-up', i: 'makyaj', yak: true },
      { k: 'ozellikler', ad: 'Mekan özellikleri', i: 'yildiz', on: acik('ozellikler') }
    ];
    var K = [
      { k: 'ciftlerimiz', ad: 'Çiftlerimiz', yak: true },
      { k: 'klipler', ad: 'Kliplerimiz', on: klipler.length > 0, yak: klipler.length === 0 },
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

    var kutular = T.map(function (x) { return kutuHtml(x, false); }).join('');
    var kucukler = K.map(function (x) { return kutuHtml(x, true); }).join('');
    var serit = '';
    if (yak) serit += '<button type="button" class="islem yok mini serit-soz" disabled aria-disabled="true"><b>Sözleşme</b><small>Yakında</small></button>';
    if (M.erken_rez_aktif && M.erken_rez_oran > 0) {
      serit += '<button type="button" class="erken-kutu" data-islem="talep"><b>Erken rezervasyon</b><span>%' + esc(M.erken_rez_oran) + ' indirim · en az ' + esc(M.erken_rez_ay) + ' ay önce</span></button>';
    }

    h += '<div class="iki-kol"><div class="kisim k-islem"><h2>İncele, fiyat gör, teklif al</h2>' +
      '<div class="kutular">' + kutular + '</div>' +
      (kucukler ? '<div class="kutular dort kucuk-sira">' + kucukler + '</div>' : '') +
      (serit ? '<div class="serit">' + serit + '</div>' : '') + '</div>';

    h += '<div class="kisim k-iletisim" id="iletisimK"><h2>Bize ulaşın</h2><div class="iletisim">' +
      (wa ? '<a href="' + esc(wa) + '" target="_blank" rel="noopener">' + ik('whatsapp', 26) + 'WhatsApp</a>' : '') +
      (tel ? '<a href="tel:' + esc(tel) + '">' + ik('telefon', 26) + 'Ara</a>' : '') +
      (harita ? '<a href="' + esc(harita) + '" target="_blank" rel="noopener">' + ik('konum', 26) + 'Konum</a>' : '') +
      '</div>' + (M.adres ? '<p class="adres">' + esc(M.adres) + '</p>' : '') + haritaHtml(harita) + '</div></div>';

    h += '</section>';

    /* Bölme 2: mini uygulamalar, çiftlere özel, kısa videolar */
    if (ikinci) {
      h += '<section class="bolme" id="b1" aria-labelledby="s1">';
      var mini = '';
      if (yak) ['Movi İmaj', 'Foto İmaj', 'Foto Dergi'].forEach(function (a) { mini += '<button type="button" class="islem yok mini" disabled aria-disabled="true"><b>' + esc(a) + '</b><small>Yakında</small></button>'; });
      if (ozelAcik) mini += '<button type="button" class="islem mini" data-ankraj="ozelK"><b>Foto ve video indir</b></button>';
      if (mini) h += '<div class="kisim k-mini"><h2>Mini uygulamalarımız</h2><div class="kutular dort kucuk-sira">' + mini + '</div></div>';
      if (ozelAcik) {
        h += '<div class="kisim k-ozel" id="ozelK"><div class="ozel" id="ozelKutu"><h2>Foto ve video indir</h2><p class="not">' + esc(M.ad) + ' ile anlaşan çiftler, size verilen şifreyle buradan fotoğraf ve videolarına ulaşır.</p>' +
          '<form id="ozelForm" novalidate><label class="alan"><span>Şifreniz</span><input id="ozelKod" class="kod" autocomplete="off" autocapitalize="characters" maxlength="12" placeholder="ABCD-1234"></label>' +
          '<div id="ozelHata"></div><button class="btn ana tam" type="submit">' + ik('kilit', 20) + 'Giriş yap</button></form></div></div>';
      }
      if (videolar.length) {
        h += '<div class="kisim k-video"><h2>Shorts</h2><div class="video-izgara">';
        videolar.forEach(function (v, i) {
          h += '<button type="button" class="video" data-video="' + i + '" aria-label="' + esc((v.baslik || 'Videoyu') + ' oynat') + '"><span class="pl">' + ik('oynat', 26) + '</span><span class="et">' + esc(v.baslik || '') + '</span></button>';
        });
        h += '</div>';
        if (M.instagram) h += '<p style="margin:14px 4px 0"><a class="btn hafif" target="_blank" rel="noopener" href="' + esc(O.instagramUrl(M.instagram)) + '">' + ik('instagram', 20) + 'Instagram\'da takip et</a></p>';
        h += '</div>';
      }
      h += '</section>';
    }
    h += '</main>';
    h += '<footer class="alt-bilgi"><button type="button" id="kvkkAc">Aydınlatma metni</button><div>Evliliğe Evet ile hazırlandı</div></footer>';

    var nav = '<nav class="ust-nav" aria-label="Sayfa menüsü">';
    ISLEMLER.forEach(function (x) { if (x.k !== 'teklif' && x.k !== 'talep') nav += '<button type="button" data-islem="' + x.k + '">' + esc(x.ad) + '</button>'; });
    nav += '<button type="button" data-ankraj="iletisimK">İletişim</button>';
    if (ozelAcik) nav += '<button type="button" data-ankraj="ozelK">Foto ve video indir</button>';
    nav += '</nav>' + (acik('teklif') ? '<button type="button" class="btn ana kucuk ust-cta" data-islem="teklif">Teklif al</button>' : '');
    h = h.replace('<!--NAV-->', nav);
    $('#uygulama').innerHTML = '<div class="sayfa">' + h + '</div>';
    VIDEOLAR = videolar;
    KLIPLER = klipler;
    GALERI = galeri;
    bagla();
    cerezUyari();
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

  var ISLEMLER = [], VIDEOLAR = [], KLIPLER = [], GALERI = [];

  /* ---------- Olaylar ---------- */
  function islemCalistir(k, ek) {
    ({ fiyatlar: fiyatlarAc, teklif: function () { formAc('teklif', ek); }, talep: function () { formAc('talep', ek); },
      firmalar: firmalarAc, menu: menuAc, ozellikler: ozelliklerAc, klipler: klipAc, galeri: galeriAc })[k]();
  }

  function sekmeAc(i) {
    $$('.bolme').forEach(function (b, n) { b.classList.toggle('aktif', n === i); });
    $$('.sekme button').forEach(function (b, n) { b.setAttribute('aria-selected', n === i ? 'true' : 'false'); });
    window.scrollTo({ top: 0 });
  }

  function bagla() {
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-islem]');
      if (b) { islemCalistir(b.getAttribute('data-islem')); return; }
      var an = e.target.closest('[data-ankraj]');
      if (an) { var hd = document.getElementById(an.getAttribute('data-ankraj')); if (hd) { var pn = hd.closest('.bolme'); if (pn && !pn.classList.contains('aktif') && !window.matchMedia('(min-width: 960px)').matches) sekmeAc(+pn.id.slice(1)); hd.scrollIntoView({ behavior: 'smooth', block: 'start' }); } return; }
      var s = e.target.closest('.sekme button');
      if (s) { sekmeAc(+s.getAttribute('data-s')); return; }
      var f = e.target.closest('[data-foto]');
      if (f) { buyut(+f.getAttribute('data-foto')); return; }
      var v = e.target.closest('[data-video], [data-klip]');
      if (v) { videoOynat(v); }
    });
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
      m.addEventListener('touchstart', function (e) { var t0 = e.touches[0]; x0 = t0.clientX; y0 = t0.clientY; yok = !!e.target.closest('.galeri-seri, iframe, input'); }, { passive: true });
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

  function buyut(i) {
    if (!GALERI[i]) return;
    var l = document.createElement('div');
    l.className = 'lightbox'; l.setAttribute('role', 'dialog'); l.setAttribute('aria-label', 'Fotoğraf');
    var coklu = GALERI.length > 1;
    l.innerHTML = '<button class="kapat" aria-label="Kapat">' + ik('kapat', 26) + '</button>' +
      (coklu ? '<button class="lb-ok sol" aria-label="Önceki">' + ik('sol', 28) + '</button><button class="lb-ok sag" aria-label="Sonraki">' + ik('sag', 28) + '</button>' : '') +
      '<img alt=""><div class="lb-say"></div>';
    var img = $('img', l), say = $('.lb-say', l);
    function goster() {
      var f = GALERI[i];
      img.src = O.guvenliUrl(f.url) || ''; img.alt = f.baslik || M.ad;
      say.textContent = (f.baslik ? f.baslik + '  ' : '') + (i + 1) + ' / ' + GALERI.length;
    }
    function git(d) { i = (i + d + GALERI.length) % GALERI.length; goster(); }
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
    if (r.error) { kutu.className = 'tarih-sonuc bilgi'; kutu.textContent = 'Şu an kontrol edilemedi. Talep girerek sorabilirsiniz.'; return; }
    var n = (r.data || []).length, salon = Math.max(1, D.salonlar.length);
    var tr = O.tarihTR(d), msg, sinif;
    if (n >= salon) { sinif = 'dolu'; msg = tr + ' için tüm salonlarımız dolu görünüyor. Yine de talep girerek yer açılırsa haberdar olabilirsiniz.'; }
    else if (n > 0) { sinif = 'musait'; msg = tr + ' için ' + (salon - n) + ' salonumuz müsait.'; }
    else { sinif = 'musait'; msg = tr + ' müsait görünüyor.'; }
    kutu.className = 'tarih-sonuc ' + sinif;
    kutu.innerHTML = '<span>' + esc(msg) + '</span><button class="btn ana kucuk" type="button" id="tarihTalep">Bu tarih için talep gir</button>';
    $('#tarihTalep').addEventListener('click', function () { formAc('talep', { tarih: d }); });
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

  function klipAc() {
    var h = '<div class="video-izgara">';
    KLIPLER.forEach(function (v, i) {
      h += '<button type="button" class="video" data-klip="' + i + '" aria-label="' + esc((v.baslik || 'Videoyu') + ' oynat') + '"><span class="pl">' + ik('oynat', 26) + '</span><span class="et">' + esc(v.baslik || '') + '</span></button>';
    });
    pencere('Kliplerimiz', h + '</div>');
  }

  function menuAc() {
    if (!D.menu.length) { pencere('Menü', '<div class="bos">Menü yakında burada olacak.</div>'); return; }
    var h = '<ul class="liste-yalin">';
    D.menu.forEach(function (m) {
      h += '<li><b>' + esc(m.ad) + (m.fiyat_kisi != null ? '<span class="menu-fy">' + esc(O.para(m.fiyat_kisi)) + ' <small>kişi başı</small></span>' : '') + '</b>' +
        (m.aciklama ? '<span>' + esc(m.aciklama) + '</span>' : '') + (m.icerik ? '<div class="not" style="margin-top:6px;white-space:pre-line">' + esc(m.icerik) + '</div>' : '') + '</li>';
    });
    pencere('Menü', h + '</ul>');
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
      ? 'İstediğiniz hizmetleri seçin. ' + esc(M.ad) + ' size özel fiyatı hazırlayıp e-posta ya da WhatsApp ile iletir.'
      : 'Düğününüzle ilgili isteklerinizi yazın. ' + esc(M.ad) + ' size en kısa sürede dönüş yapar.') + '</p>';
    h += '<div class="ikili"><label class="alan"><span>Düğün tarihi</span><input type="date" name="tarih" min="' + O.bugunISO() + '" value="' + esc(ek.tarih || '') + '" required></label>' +
      '<label class="alan"><span>Kişi sayısı <em>(tahmini)</em></span><input type="number" name="kisi" inputmode="numeric" min="1" max="5000" placeholder="300"></label></div>';
    if (D.salonlar.length > 1) {
      h += '<label class="alan"><span>Salon</span><select name="salon"><option value="">Fark etmez</option>' +
        D.salonlar.map(function (s) { return '<option value="' + esc(s.id) + '">' + esc(s.ad) + (s.kapasite ? ' (' + esc(s.kapasite) + ' kişi)' : '') + '</option>'; }).join('') + '</select></label>';
    }
    if (D.menu.length && acik('menu')) {
      h += '<label class="alan"><span>Menü <em>(isteğe bağlı)</em></span><select name="menu"><option value="">Henüz seçmedim</option>' +
        D.menu.map(function (m) { return '<option value="' + esc(m.id) + '">' + esc(m.ad) + (m.fiyat_kisi != null ? ' - ' + esc(O.para(m.fiyat_kisi)) + ' / kişi' : '') + '</option>'; }).join('') + '</select></label>';
    }
    h += secimListesi(teklifMi);
    h += '<div class="ikili"><label class="alan"><span>Adınız</span><input name="ad" autocomplete="given-name" required></label>' +
      '<label class="alan"><span>Soyadınız</span><input name="soyad" autocomplete="family-name" required></label></div>';
    h += '<label class="alan"><span>Telefon</span><input name="tel" type="tel" inputmode="tel" autocomplete="tel" placeholder="0532 123 45 67" required></label>';
    h += '<label class="alan"><span>E-posta</span><input name="eposta" type="email" inputmode="email" autocomplete="email" placeholder="ad@ornek.com" required></label>';
    h += '<label class="alan"><span>' + (teklifMi ? 'Eklemek istedikleriniz' : 'Talepleriniz') + ' <em>(isteğe bağlı)</em></span><textarea name="not" maxlength="1500"></textarea></label>';
    h += '<label class="onay"><input type="checkbox" name="kvkk"><span>Kişisel verilerimin teklif ve rezervasyon için işlenmesine ilişkin <button type="button" class="kvkk-link" style="border:0;background:none;padding:0;text-decoration:underline">aydınlatma metnini</button> okudum, onaylıyorum.</span></label>';
    h += '<div id="tfHata"></div><button class="btn ana tam" type="submit">' + (teklifMi ? 'Teklif iste' : 'Talebi gönder') + '</button></form>';

    var ic = pencere(teklifMi ? 'Teklif al' : 'Talep gir', h);
    var f = $('#tf', ic);
    $('.kvkk-link', ic).addEventListener('click', kvkkAc);
    f.addEventListener('submit', function (e) { e.preventDefault(); formGonder(f, ic, tur); });
  }

  function formGonder(f, ic, tur) {
    var v = function (n) { var x = f.elements[n]; return x ? String(x.value || '').trim() : ''; };
    var kutu = $('#tfHata', ic);
    function hata(m) { kutu.innerHTML = '<div class="hata-kutu" role="alert">' + esc(m) + '</div>'; kutu.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    var tel = v('tel').replace(/\D/g, '');
    if (!v('tarih')) return hata('Düğün tarihini seçin.');
    if (v('tarih') < O.bugunISO()) return hata(O.hataMetni({ message: 'tarih_gecersiz' }));
    if (v('ad').length < 2 || v('soyad').length < 2) return hata(O.hataMetni({ message: 'ad_soyad_gerekli' }));
    if (tel.length < 10 || tel.length > 13) return hata(O.hataMetni({ message: 'telefon_gecersiz' }));
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v('eposta'))) return hata(O.hataMetni({ message: 'eposta_gecersiz' }));
    if (!f.elements.kvkk.checked) return hata(O.hataMetni({ message: 'kvkk_onayi_gerekli' }));
    var kalemler = $$('input[name=kalem]:checked', f).map(function (i) { return i.value; });
    if (tur === 'teklif' && D.kalem.length && !kalemler.length && !v('menu')) return hata('Teklif için en az bir hizmet ya da menü seçin.');

    var dugme = $('button[type=submit]', f); dugme.disabled = true; dugme.textContent = 'Gönderiliyor...';
    sb.rpc('talep_olustur', {
      p_slug: A.MEKAN_SLUG, p_tur: tur, p_ad: v('ad'), p_soyad: v('soyad'), p_telefon: v('tel'), p_eposta: v('eposta'),
      p_dugun_tarihi: v('tarih'), p_kvkk: true, p_kisi_sayisi: v('kisi') ? parseInt(v('kisi'), 10) : null,
      p_salon_id: v('salon') || null, p_menu_id: v('menu') || null, p_not: v('not') || null, p_kalemler: kalemler
    }).then(function (r) {
      if (r.error) {
        dugme.disabled = false; dugme.textContent = tur === 'teklif' ? 'Teklif iste' : 'Talebi gönder';
        return hata(O.hataMetni(r.error));
      }
      var wa = O.waLink(M.whatsapp || M.telefon, 'Merhaba, ' + O.tarihTR(v('tarih')) + ' tarihli düğünümüz için ' + (tur === 'teklif' ? 'teklif' : 'talep') + ' gönderdim. Adım: ' + v('ad') + ' ' + v('soyad'));
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
      (x.bitis ? '<p class="not" style="margin:12px 0 0">Bu alan ' + esc(O.tarihTR(x.bitis)) + ' tarihine kadar açık.</p>' : '') + '</div>';
  }

  /* ---------- Videolar ---------- */
  function videoOynat(btn) {
    var v = btn.hasAttribute('data-klip') ? KLIPLER[+btn.getAttribute('data-klip')] : VIDEOLAR[+btn.getAttribute('data-video')]; if (!v) return;
    var src = '', u = String(v.url || ''), m;
    if (v.platform === 'youtube') {
      m = u.match(/(?:shorts\/|v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
      if (m) src = 'https://www.youtube.com/embed/' + m[1] + '?autoplay=1&playsinline=1&rel=0';
    } else {
      m = u.match(/instagram\.com\/(reel|reels|p|tv)\/([A-Za-z0-9_-]+)/);
      if (m) src = 'https://www.instagram.com/' + (m[1] === 'reels' ? 'reel' : m[1]) + '/' + m[2] + '/embed';
    }
    var link = O.guvenliUrl(u);
    if (!src) { if (link) window.open(link, '_blank', 'noopener'); return; }
    btn.outerHTML = '<div class="video"><iframe title="' + esc(v.baslik || 'Video') + '" src="' + esc(src) + '" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>';
  }

  /* ---------- Çerez bilgisi ---------- */
  function cerezUyari() {
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
