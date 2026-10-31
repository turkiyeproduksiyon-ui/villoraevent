/* Villora Event: Foto Dergi. Hazır sayfa şablonları, fotoğrafı çerçeveye bırak, kaydırarak kırp, PDF indir.
   Fotoğraflar hiçbir yere yüklenmez; her şey çiftin kendi telefonunda / bilgisayarında olur. */
(function () {
  'use strict';
  var O = window.ORTAK, esc = O.esc;
  var MAX_FOTO = 30, MAX_SAYFA = 18, W = 1240, H = 1754;
  var SERIF = 'Georgia, "Times New Roman", serif', SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
  /* Alan: [x, y, genişlik, yükseklik], içerik alanına göre oran (0-1) */
  var SABLON = {
    kapak: { ad: 'Kapak', alan: [[0, 0, 1, 1]], tam: true },
    tam: { ad: 'Tam sayfa', alan: [[0, 0, 1, 1]], tam: true },
    arka: { ad: 'Arka kapak', alan: [[0, 0, 1, 1]], tam: true },
    orta: { ad: 'Orta sayfa', alan: [[0, 0, 1, 1]], tam: true, cift: true },
    bosS: { ad: 'Boş', alan: [] },
    iki: { ad: 'İki dikey', alan: [[0, 0, 0.49, 1], [0.51, 0, 0.49, 1]] },
    uc: { ad: 'Geniş + dar', alan: [[0, 0, 0.64, 1], [0.66, 0, 0.34, 1]] },
    ud: { ad: 'Dar + geniş', alan: [[0, 0, 0.34, 1], [0.36, 0, 0.64, 1]] },
    sol: { ad: 'Dikey + iki yatay', alan: [[0, 0, 0.48, 1], [0.5, 0, 0.5, 0.49], [0.5, 0.51, 0.5, 0.49]] },
    bol: { ad: 'İkiye bölünmüş', alan: [[0, 0, 1, 0.49], [0, 0.51, 1, 0.49]] }
  };
  var SIRA = ['tam', 'iki', 'uc', 'ud', 'sol', 'bol'];
  var HAZIR = ['kapak', 'tam', 'sol', 'iki', 'tam', 'sol', 'bol', 'orta', 'sol', 'iki', 'sol', 'ud', 'sol', 'bol', 'arka'];   // 15 kayıt, orta sayfa 2 sayfa sayılır: PDF 16 sayfa, tam 30 fotoğraf yeri
  /* 5 hazır tasarım: renk, yazı, kapak ve fotoğraf çerçevesi */
  var TEMA = {
    klasik:   { ad: 'Klasik pembe', bg: '#fff8fb', acc: null, yazi: '#7a5a68', serif: SERIF, kA: 'rgba(200,50,99,0)', kB: 'rgba(160,25,75,.92)', kYazi: '#fff', cizgi: true, kenar: 0, golge: 0, yuv: 0, sonA: '#ee5f96', sonB: null },
    modern:   { ad: 'Modern siyah-beyaz', bg: '#ffffff', acc: '#111111', yazi: '#555555', serif: SANS, kA: 'rgba(0,0,0,0)', kB: 'rgba(0,0,0,.88)', kYazi: '#fff', cizgi: true, kenar: 0, golge: 0, yuv: 0, sonA: '#333333', sonB: '#000000' },
    romantik: { ad: 'Romantik krem', bg: '#fbf1ea', acc: '#b76e79', yazi: '#8c6a62', serif: 'Georgia, "Palatino Linotype", serif', kA: 'rgba(183,110,121,0)', kB: 'rgba(140,70,85,.9)', kYazi: '#fff', cizgi: true, kenar: 22, kenarRenk: '#ffffff', golge: 1, yuv: 0, sonA: '#d9a1a8', sonB: '#b76e79' },
    luks:     { ad: 'Altın lüks', bg: '#17130f', acc: '#d4af37', yazi: '#cdb57a', serif: SERIF, kA: 'rgba(15,12,8,0)', kB: 'rgba(15,12,8,.94)', kYazi: '#e6c866', cizgi: true, kenar: 6, kenarRenk: '#d4af37', golge: 0, yuv: 0, sonA: '#2a2216', sonB: '#0f0c08' },
    minimal:  { ad: 'Minimal beyaz', bg: '#ffffff', acc: '#9aa0a6', yazi: '#9aa0a6', serif: SANS, kA: 'rgba(255,255,255,0)', kB: 'rgba(0,0,0,.5)', kYazi: '#fff', cizgi: false, kenar: 34, kenarRenk: '#ffffff', golge: 0, yuv: 0, sonA: '#f2f2f2', sonB: '#d9d9d9', kapakGolge: 1 }
  };
  var IC = { x: 0.07, y: 0.085, w: 0.86, h: 0.835 };       // iç sayfaların fotoğraf alanı (sayfa oranı)

  function yukle(src) { return new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { rej(new Error('Fotoğraf açılamadı')); }; im.src = src; }); }
  function kucultFoto(file) {
    return new Promise(function (res, rej) {
      var u = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var k = Math.min(1, 2200 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
        c.toBlob(function (b) { if (!b) return rej(new Error('Fotoğraf işlenemedi')); res({ blob: b, url: URL.createObjectURL(b), w: c.width, h: c.height, zoom: 1, px: 0.5, py: 0.4 }); }, 'image/jpeg', 0.9);
      };
      im.onerror = function () { URL.revokeObjectURL(u); rej(new Error('Bu dosya fotoğraf olarak açılamadı: ' + file.name)); };
      im.src = u;
    });
  }
  /* Fotoğrafın çerçevede nasıl durduğunu hesaplar: kaynak dikdörtgen */
  function kaynak(f, sw, sh) {
    var k = Math.max(sw / f.w, sh / f.h) * f.zoom, kw = sw / k, kh = sh / k;
    return { sx: (f.w - kw) * f.px, sy: (f.h - kh) * f.py, sw: kw, sh: kh, k: k };
  }
  function jpeg(canvas) {
    return new Promise(function (res, rej) { canvas.toBlob(function (b) { if (!b) return rej(new Error('Sayfa oluşturulamadı')); b.arrayBuffer().then(function (ab) { res(new Uint8Array(ab)); }); }, 'image/jpeg', 0.84); });
  }
  function sigdir(ctx, metin, font, gen) { var p = parseInt((font.match(/(\d+)px/) || [])[1], 10); ctx.font = font; while (ctx.measureText(metin).width > gen && p > 28) { p -= 4; ctx.font = font.replace(/\d+px/, p + 'px'); } }

  /* ---- Çok sade PDF yazıcı: her sayfa tek JPEG ---- */
  function pdfYap(sayfalar) {
    var enc = new TextEncoder(), parcalar = [], uz = 0, ofs = [], N = sayfalar.length, PW = 595.28, PH = 841.89;
    function koy(x) { var b = typeof x === 'string' ? enc.encode(x) : x; parcalar.push(b); uz += b.length; }
    function ac(n) { ofs[n] = uz; koy(n + ' 0 obj\n'); }
    function kapa() { koy('endobj\n'); }
    koy('%PDF-1.4\n');
    ac(1); koy('<< /Type /Catalog /Pages 2 0 R >>\n'); kapa();
    var kids = []; for (var i = 0; i < N; i++) kids.push((3 + i * 3) + ' 0 R');
    ac(2); koy('<< /Type /Pages /Count ' + N + ' /Kids [' + kids.join(' ') + '] >>\n'); kapa();
    sayfalar.forEach(function (s, i) {
      var p = 3 + i * 3, c = p + 1, g = p + 2, icerik = 'q ' + PW + ' 0 0 ' + PH + ' 0 0 cm /Im0 Do Q';
      ac(p); koy('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Resources << /XObject << /Im0 ' + g + ' 0 R >> >> /Contents ' + c + ' 0 R >>\n'); kapa();
      ac(c); koy('<< /Length ' + icerik.length + ' >>\nstream\n' + icerik + '\nendstream\n'); kapa();
      ac(g); koy('<< /Type /XObject /Subtype /Image /Width ' + W + ' /Height ' + H + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + s.length + ' >>\nstream\n'); koy(s); koy('\nendstream\n'); kapa();
    });
    var toplam = 2 + N * 3, xr = uz;
    koy('xref\n0 ' + (toplam + 1) + '\n0000000000 65535 f \n');
    for (var n = 1; n <= toplam; n++) koy(('0000000000' + ofs[n]).slice(-10) + ' 00000 n \n');
    koy('trailer\n<< /Size ' + (toplam + 1) + ' /Root 1 0 R >>\nstartxref\n' + xr + '\n%%EOF');
    return new Blob(parcalar, { type: 'application/pdf' });
  }

  /* ---- PDF sayfası çizimi ---- */
  function alanPx(sb, sayfa) {      // şablon alanı -> sayfa pikseli
    if (sb.tam) return sb.alan.map(function (a) { return [a[0] * W, a[1] * H, a[2] * W, a[3] * H]; });
    var X = IC.x * W, Y = IC.y * H, GW = IC.w * W, GH = IC.h * H;
    return sb.alan.map(function (a) { return [X + a[0] * GW, Y + a[1] * GH, a[2] * GW, a[3] * GH]; });
  }
  /* Sayfanın tam ortasında ince, sade yazı bandı: çift adı, Düğün hikayemiz, tarih */
  function merkezYazi(ctx, bilgi, T, cy) {
    var bh = 420, g = ctx.createLinearGradient(0, cy - bh / 2, 0, cy + bh / 2);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.28, 'rgba(0,0,0,.34)'); g.addColorStop(0.72, 'rgba(0,0,0,.34)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, cy - bh / 2, W, bh);
    ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = T.kYazi; ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 12;
    var y = cy - (bilgi.ad ? 40 : 0);
    if (bilgi.ad) { sigdir(ctx, bilgi.ad, '400 74px ' + SERIF, W - 220); try { ctx.letterSpacing = '2px'; } catch (e0) { /* eski tarayıcı */ } ctx.fillText(bilgi.ad, W / 2, y); try { ctx.letterSpacing = '0px'; } catch (e1) { /* önemsiz */ } y += 62; }
    ctx.font = 'italic 400 44px ' + SERIF; ctx.fillText('Düğün hikayemiz', W / 2, y);
    if (bilgi.tarih) { try { ctx.letterSpacing = '3px'; } catch (e2) { /* önemsiz */ } ctx.font = '400 32px ' + SANS; ctx.fillText(bilgi.tarih, W / 2, y + 64); try { ctx.letterSpacing = '0px'; } catch (e3) { /* önemsiz */ } }
    ctx.restore();
  }
  /* Arka kapak altı: Evliliğe Evet logosu (img/evlilige-evet-logo.png varsa o, yoksa sade halka işareti) */
  function markaCiz(ctx, bilgi, T, cx, cy) {
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 8; ctx.fillStyle = T.kYazi; ctx.strokeStyle = T.kYazi; ctx.textAlign = 'center';
    if (bilgi.marka) {
      var h = 64, w = bilgi.marka.width * h / bilgi.marka.height; ctx.drawImage(bilgi.marka, cx - w / 2, cy - h / 2 - 14, w, h);
      ctx.font = '22px ' + SANS; ctx.fillText('Evliliğe Evet', cx, cy + 50);
    } else {
      ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx - 13, cy - 26, 17, 0, 6.283); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + 13, cy - 26, 17, 0, 6.283); ctx.stroke();
      ctx.font = '34px ' + SERIF; ctx.fillText('Evliliğe Evet', cx, cy + 36);
    }
    ctx.restore();
  }
  async function sayfaCiz(ctx, sayfa, no, toplam, bilgi, acc0) {
    var T = TEMA[bilgi.tema] || TEMA.klasik, acc = T.acc || acc0, SF = T.serif;
    var sb = SABLON[sayfa.t], kapak = sayfa.t === 'kapak', px = alanPx(sb, sayfa);
    var arka = sayfa.t === 'arka', tamS = !!sb.tam;
    ctx.fillStyle = tamS ? (bilgi.tema === 'luks' ? '#000' : '#fff') : T.bg; ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < px.length; i++) {
      var r = px[i], f = sayfa.f[i];
      if (f) {
        var p = tamS ? 0 : T.kenar, im = await yukle(f.url), s = kaynak(f, r[2] - 2 * p, r[3] - 2 * p);
        if (p) {
          ctx.save(); if (T.golge) { ctx.shadowColor = 'rgba(60,20,30,.28)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10; }
          ctx.fillStyle = T.kenarRenk; ctx.fillRect(r[0], r[1], r[2], r[3]); ctx.restore();
        }
        ctx.drawImage(im, s.sx, s.sy, s.sw, s.sh, r[0] + p, r[1] + p, r[2] - 2 * p, r[3] - 2 * p); im.src = '';
      }
    }
    if (kapak) {
      if (bilgi.tema === 'luks') { ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 4; ctx.strokeRect(40, 40, W - 80, H - 80); }
      ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 14;
      ctx.fillStyle = T.kYazi; ctx.textAlign = 'left'; ctx.font = '36px ' + SF; ctx.fillText(bilgi.mekan, 90, 118);
      ctx.shadowBlur = 0;
      merkezYazi(ctx, bilgi, T, H / 2);
    } else if (arka) {
      var g2 = ctx.createLinearGradient(0, H * 0.72, 0, H); g2.addColorStop(0, T.kA); g2.addColorStop(1, T.kB);
      ctx.fillStyle = g2; ctx.fillRect(0, H * 0.72, W, H * 0.28);
      merkezYazi(ctx, bilgi, T, H / 2);
      ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 12;
      ctx.fillStyle = T.kYazi; ctx.textAlign = 'center'; ctx.font = '30px ' + SF; ctx.fillText(bilgi.mekan, W / 2, H - 215);
      ctx.font = '24px ' + SANS; ctx.fillText([bilgi.telefon, bilgi.instagram].filter(Boolean).join('   '), W / 2, H - 175);
      ctx.shadowBlur = 0; markaCiz(ctx, bilgi, T, W / 2, H - 95); ctx.textAlign = 'left';
    } else if (tamS) {
      ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.font = '28px ' + SANS; ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 8;
      ctx.fillText(String(no), W - 60, H - 50); ctx.shadowBlur = 0; ctx.textAlign = 'left';
    } else {
      ctx.fillStyle = acc; ctx.textAlign = 'left'; ctx.font = '34px ' + SF; ctx.fillText(bilgi.mekan, 90, 108);
      if (T.cizgi) ctx.fillRect(90, 132, W - 180, 3);
      ctx.fillStyle = T.yazi; ctx.font = '28px ' + SANS; ctx.fillText(bilgi.baslik, 90, H - 62);
      ctx.textAlign = 'right'; ctx.fillText(String(no), W - 90, H - 62); ctx.textAlign = 'left';
    }
  }
  function sonSayfa(ctx, bilgi, acc0) {
    var T = TEMA[bilgi.tema] || TEMA.klasik, acc = T.sonB || T.acc || acc0;
    var gr = ctx.createLinearGradient(0, 0, W, H); gr.addColorStop(0, T.sonA); gr.addColorStop(1, acc);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); ctx.fillStyle = bilgi.tema === 'minimal' ? '#666' : (bilgi.tema === 'luks' ? '#e6c866' : '#fff'); ctx.textAlign = 'center';
    ctx.font = '100px ' + SERIF; ctx.fillText('Teşekkürler', W / 2, H / 2 - 40); ctx.fillRect(W / 2 - 80, H / 2, 160, 4);
    ctx.font = '44px ' + SERIF; ctx.fillText(bilgi.mekan, W / 2, H / 2 + 90);
    ctx.font = '32px ' + SANS; ctx.fillText([bilgi.telefon, bilgi.instagram].filter(Boolean).join('   '), W / 2, H / 2 + 150);
  }
  async function uret(sayfalar, bilgi, ilerle) {
    try { bilgi.marka = await yukle('img/evlilige-evet-logo.png'); } catch (em) { bilgi.marka = null; }
    try { await document.fonts.load('700 100px Caveat', bilgi.baslik + ' 0123456789ĞÜŞİÖÇğüşıöç'); } catch (ef) { /* yazı tipi yoksa yedek yazı */ }
    var acc = (getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#c83263').trim() || '#c83263';
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    sayfalar = sayfalar.filter(function (p, i) { if (i === 0) return true; var n = SABLON[p.t].alan.length; for (var k = 0; k < n; k++) if (p.f[k]) return true; return false; });
    var ctx = cv.getContext('2d'), cikti = [], toplam = sayfalar.length + 1, no = 0;
    for (var i = 0; i < sayfalar.length; i++) {
      if (sayfalar[i].t === 'orta' && (cikti.length % 2) === 0) {       // orta sayfa sol sayfaya denk gelsin diye boş sayfa eklenir
        await sayfaCiz(ctx, { t: 'bosS', f: [] }, cikti.length, toplam, bilgi, acc); cikti.push(await jpeg(cv));
      }
      ilerle(i + 1, toplam);
      if (sayfalar[i].t === 'orta') {
        var c2 = document.createElement('canvas'); c2.width = W * 2; c2.height = H; var x2 = c2.getContext('2d');
        x2.fillStyle = '#fff'; x2.fillRect(0, 0, W * 2, H);
        var fo = sayfalar[i].f[0];
        if (fo) { var im2 = await yukle(fo.url), s2 = kaynak(fo, W * 2, H); x2.drawImage(im2, s2.sx, s2.sy, s2.sw, s2.sh, 0, 0, W * 2, H); im2.src = ''; }
        for (var yarim = 0; yarim < 2; yarim++) {
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.drawImage(c2, yarim * W, 0, W, H, 0, 0, W, H);
          ctx.fillStyle = '#fff'; ctx.textAlign = yarim ? 'right' : 'left'; ctx.font = '28px ' + SANS; ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 8;
          ctx.fillText(String(cikti.length), yarim ? W - 60 : 60, H - 50); ctx.shadowBlur = 0; ctx.textAlign = 'left';
          cikti.push(await jpeg(ctx.canvas));
        }
        c2.width = 1;
      } else { await sayfaCiz(ctx, sayfalar[i], cikti.length, toplam, bilgi, acc); cikti.push(await jpeg(cv)); }
    }
    var arkaVar = sayfalar.length && sayfalar[sayfalar.length - 1].t === 'arka';
    if (!arkaVar) { ilerle(toplam, toplam); sonSayfa(ctx, bilgi, acc); cikti.push(await jpeg(cv)); }
    return pdfYap(cikti);
  }

  /* ---- Düzenleyici ---- */
  function ac(ctx) {
    var M = ctx.mekan, S = { ad: '', tarih: '', sayfalar: HAZIR.map(function (t) { return { t: t, f: [] }; }), sec: 0, slot: null, tema: 'klasik' };
    var sablonKucuk = function (id) {
      return '<span class="dg-mini' + (SABLON[id].cift ? ' cift' : '') + '">' + SABLON[id].alan.map(function (a) { return '<i style="left:' + (a[0] * 100) + '%;top:' + (a[1] * 100) + '%;width:' + (a[2] * 100) + '%;height:' + (a[3] * 100) + '%"></i>'; }).join('') + '</span>';
    };
    var h = '<div class="dg2 t-klasik"><p class="not" style="margin:0 0 12px">Dergi hazır: kapak, arka kapak ve aradaki sayfalarda toplam 30 fotoğraf yeri var. Dergi ortasındaki çift sayfa tek fotoğrafla iki sayfayı kaplar; dergiyi iki elinizle açınca bütün görünür. Tam sayfalar kenarsızdır. Boş bıraktığınız çerçeveler ve hiç fotoğraf konmayan sayfalar PDF dışında kalır. Sayfa şablonunu değiştirebilirsiniz, fotoğrafı çerçevenin içine bırakın ya da çerçeveye dokunup seçin. Fotoğrafı parmağınızla kaydırıp yakınlaştırarak istediğiniz kısmı gösterin. Sonunda PDF olarak indirin. Fotoğraflar yalnızca cihazınızda işlenir, hiçbir yere yüklenmez.</p>' +
      '<div class="ikili"><label class="alan"><span>Çift adı</span><input id="dgAd" maxlength="60" placeholder="Ayşe & Ali"></label><label class="alan"><span>Düğün tarihi</span><input id="dgTarih" type="date"></label></div>' +
      '<div class="dg2-temalar" role="radiogroup" aria-label="Dergi tasarımı">' + Object.keys(TEMA).map(function (k) { return '<button type="button" class="dg2-tema' + (k === 'klasik' ? ' ak' : '') + '" data-tema="' + k + '"><span class="dg2-tm t-' + k + '"><i></i><i></i></span><small>' + esc(TEMA[k].ad) + '</small></button>'; }).join('') + '</div>' +
      '<div class="dg2-seritler"><div class="dg2-sayfalar" id="dgSayfalar"></div></div>' +
      '<div class="dg2-tuval-kap"><div class="dg2-tuval" id="dgTuval"></div></div>' +
      '<div class="dg2-kontrol" id="dgKontrol"></div>' +
      '<p class="dg2-say not" id="dgSay"></p>' +
      '<div class="dg2-araclar"><button type="button" class="btn hafif" id="dgToplu">Toplu fotoğraf ekle</button><button type="button" class="btn hafif" id="dgSayfaEkle">Sayfa ekle</button><button type="button" class="btn tehlike" id="dgSayfaSil">Sayfayı sil</button></div>' +
      '<input type="file" id="dgDosya" accept="image/*" hidden><input type="file" id="dgToplam" accept="image/*" multiple hidden><div id="dgHata"></div>' +
      '<button class="btn ana tam" type="button" id="dgYap">PDF dergiyi indir</button></div>';
    var ic = ctx.pencere('Foto Dergi', h), $ = function (s) { return ic.querySelector(s); };
    var tuval = $('#dgTuval'), serit = $('#dgSayfalar'), kontrol = $('#dgKontrol'), hata = $('#dgHata'), hedef = null;

    function foto() { var n = 0; S.sayfalar.forEach(function (p) { var k = SABLON[p.t].alan.length; for (var i = 0; i < k; i++) if (p.f[i]) n++; }); return n; }
    function yeniSayfa() {      // arka kapağın önüne yeni sayfa ekler
      var son = S.sayfalar.length && S.sayfalar[S.sayfalar.length - 1].t === 'arka' ? S.sayfalar.length - 1 : S.sayfalar.length;
      S.sayfalar.splice(son, 0, { t: SIRA[(son - 1) % SIRA.length], f: [] }); return son;
    }
    function mesaj(m) { hata.innerHTML = m ? '<div class="hata-kutu">' + esc(m) + '</div>' : ''; }

    function seritCiz() {
      serit.innerHTML = S.sayfalar.map(function (p, i) {
        return '<button type="button" class="dg2-sk' + (i === S.sec ? ' ak' : '') + '" data-s="' + i + '">' + sablonKucuk(p.t) + '<small>' + (i === 0 ? 'Kapak' : S.sayfalar[i].t === 'arka' ? 'Arka' : S.sayfalar[i].t === 'orta' ? 'Orta' : i) + '</small></button>';
      }).join('');
      $('#dgSay').textContent = foto() + ' / ' + MAX_FOTO + ' fotoğraf · ' + S.sayfalar.length + ' sayfa';
    }
    function yerles() {                 // fotoğrafları çerçevenin içine, gerçek piksele göre oturt
      Array.prototype.forEach.call(tuval.querySelectorAll('.dg2-alan'), function (el) {
        var f = S.sayfalar[S.sec].f[+el.getAttribute('data-i')], im = el.querySelector('img'); if (!f || !im) return;
        var sw = el.clientWidth, sh = el.clientHeight; if (!sw || !sh) return;
        var s = kaynak(f, sw, sh); im.style.width = (f.w * s.k) + 'px'; im.style.height = (f.h * s.k) + 'px';
        im.style.left = (-s.sx * s.k) + 'px'; im.style.top = (-s.sy * s.k) + 'px';
      });
    }
    function tuvalCiz() {
      var p = S.sayfalar[S.sec], sb = SABLON[p.t], kapak = p.t === 'kapak', tamS = !!sb.tam;
      var kutu = sb.tam ? { x: 0, y: 0, w: 1, h: 1 } : IC;
      tuval.className = 'dg2-tuval t-' + S.tema + (tamS ? ' kapak' : '') + (sb.cift ? ' cift' : '');
      tuval.innerHTML = (tamS ? '' : '<div class="dg2-ust-yazi">' + esc(M.ad) + '</div><div class="dg2-alt-yazi"><span id="dgAdYazi"></span><span>' + S.sec + '</span></div>') +
        '<div class="dg2-icerik" style="left:' + (kutu.x * 100) + '%;top:' + (kutu.y * 100) + '%;width:' + (kutu.w * 100) + '%;height:' + (kutu.h * 100) + '%">' +
        sb.alan.map(function (a, i) {
          var f = p.f[i];
          return '<div class="dg2-alan' + (f ? ' dolu' : '') + (S.slot === i ? ' sec' : '') + '" data-i="' + i + '" style="left:' + (a[0] * 100) + '%;top:' + (a[1] * 100) + '%;width:' + (a[2] * 100) + '%;height:' + (a[3] * 100) + '%">' +
            (f ? '<img src="' + f.url + '" alt="" draggable="false">' : '<span class="dg2-bos">Fotoğraf ekle</span>') + '</div>';
        }).join('') + '</div>' +
        (kapak ? '<div class="dg2-kapak-yazi"><b id="dgKapakAd"></b><em>Düğün hikayemiz</em><span id="dgKapakTarih"></span></div>' : '');
      yaziGuncelle(); yerles(); kontrolCiz(); seritCiz();
    }
    function yaziGuncelle() {
      var ad = S.ad || 'Düğün hikayemiz', t = S.tarih ? O.tarihTR(S.tarih) : '';
      var a = $('#dgKapakAd'), b = $('#dgKapakTarih'), c = $('#dgAdYazi'); if (a) { a.textContent = S.ad || ''; a.style.display = S.ad ? '' : 'none'; } if (b) b.textContent = t; if (c) c.textContent = ad;
    }
    function kontrolCiz() {
      var p = S.sayfalar[S.sec], h2 = '';
      if (p.t !== 'kapak' && p.t !== 'arka' && p.t !== 'orta') {
        h2 += '<div class="dg2-sablonlar" role="radiogroup" aria-label="Sayfa şablonu">' + SIRA.map(function (id) {
          return '<button type="button" class="dg2-sb' + (p.t === id ? ' ak' : '') + '" data-sb="' + id + '">' + sablonKucuk(id) + '<small>' + esc(SABLON[id].ad) + '</small></button>';
        }).join('') + '</div>';
      }
      var f = S.slot !== null ? p.f[S.slot] : null;
      if (f) {
        h2 += '<div class="dg2-yakin"><label>Yakınlaştır<input type="range" id="dgZoom" min="1" max="3" step="0.02" value="' + f.zoom + '"></label>' +
          '<button type="button" class="btn hafif kucuk" id="dgDegis">Fotoğrafı değiştir</button><button type="button" class="btn tehlike kucuk" id="dgKaldir">Kaldır</button></div>' +
          '<p class="not" style="margin:6px 0 0">Fotoğrafı çerçevenin içinde parmağınızla kaydırarak kırpın.</p>';
      } else if (S.slot !== null) { h2 += '<button type="button" class="btn ana tam" id="dgEkle">Fotoğraf ekle</button><p class="not" style="margin:8px 0 0">Ya da fotoğrafı çerçevenin üzerine sürükleyin.</p>'; }
      else h2 += '<p class="not" style="margin:0">Bir çerçeveye dokunun.</p>';
      kontrol.innerHTML = h2;
    }
    function sec(i) { S.sec = i; S.slot = null; tuvalCiz(); }

    async function ekle(file, sayfa, slot) {
      if (!/^image\//.test(file.type)) { mesaj('Yalnızca fotoğraf eklenebilir.'); return; }
      if (!sayfa.f[slot] && foto() >= MAX_FOTO) { mesaj('En fazla ' + MAX_FOTO + ' fotoğraf eklenebilir.'); return; }
      try { mesaj(''); var x = await kucultFoto(file); if (sayfa.f[slot]) URL.revokeObjectURL(sayfa.f[slot].url); sayfa.f[slot] = x; } catch (er) { mesaj(er.message); }
    }

    /* olaylar */
    $('.dg2-temalar').addEventListener('click', function (e) {
      var b = e.target.closest('[data-tema]'); if (!b) return; S.tema = b.getAttribute('data-tema');
      Array.prototype.forEach.call(ic.querySelectorAll('.dg2-tema'), function (x) { x.classList.toggle('ak', x === b); });
      var kap = ic.querySelector('.dg2'); if (kap) kap.className = 'dg2 t-' + S.tema;
      tuvalCiz();
    });
    serit.addEventListener('click', function (e) { var b = e.target.closest('[data-s]'); if (b) sec(+b.getAttribute('data-s')); });
    kontrol.addEventListener('click', function (e) {
      var b = e.target.closest('[data-sb]'), p = S.sayfalar[S.sec];
      if (b) { p.t = b.getAttribute('data-sb'); S.slot = null; tuvalCiz(); return; }
      if (e.target.id === 'dgEkle') { hedef = { p: p, i: S.slot }; $('#dgDosya').click(); }
      if (e.target.id === 'dgDegis') { hedef = { p: p, i: S.slot }; $('#dgDosya').click(); }
      if (e.target.id === 'dgKaldir') { var f = p.f[S.slot]; if (f) URL.revokeObjectURL(f.url); p.f[S.slot] = null; tuvalCiz(); }
    });
    kontrol.addEventListener('input', function (e) { if (e.target.id === 'dgZoom') { var f = S.sayfalar[S.sec].f[S.slot]; if (f) { f.zoom = +e.target.value; yerles(); } } });
    $('#dgAd').addEventListener('input', function (e) { S.ad = e.target.value.trim(); yaziGuncelle(); });
    $('#dgTarih').addEventListener('change', function (e) { S.tarih = e.target.value; yaziGuncelle(); });
    $('#dgDosya').addEventListener('change', async function (e) {
      var f = e.target.files[0]; e.target.value = ''; if (f && hedef) { await ekle(f, hedef.p, hedef.i); S.slot = hedef.i; tuvalCiz(); }
    });
    $('#dgToplam').addEventListener('change', async function (e) {     // toplu: boş çerçevelere sırayla
      var fs = Array.prototype.slice.call(e.target.files); e.target.value = '';
      mesaj(''); var doldu = 0;
      for (var n = 0; n < fs.length; n++) {
        var yer = null;
        for (var pi = 0; pi < S.sayfalar.length && !yer; pi++) { var k = SABLON[S.sayfalar[pi].t].alan.length; for (var si = 0; si < k; si++) if (!S.sayfalar[pi].f[si]) { yer = [pi, si]; break; } }
        if (!yer) { if (S.sayfalar.length >= MAX_SAYFA) break; yer = [yeniSayfa(), 0]; }
        $('#dgSay').textContent = 'Fotoğraflar hazırlanıyor... ' + (n + 1) + ' / ' + fs.length;
        var once = foto(); await ekle(fs[n], S.sayfalar[yer[0]], yer[1]); if (foto() > once) doldu++; else break;
      }
      tuvalCiz();
    });
    $('#dgToplu').addEventListener('click', function () { $('#dgToplam').click(); });
    $('#dgSayfaEkle').addEventListener('click', function () {
      if (S.sayfalar.length >= MAX_SAYFA) { mesaj('En fazla ' + MAX_SAYFA + ' sayfa eklenir.'); return; }
      sec(yeniSayfa());
    });
    $('#dgSayfaSil').addEventListener('click', function () {
      if (S.sec === 0) { mesaj('Kapak silinemez. Fotoğrafını değiştirebilirsiniz.'); return; }
      S.sayfalar[S.sec].f.forEach(function (f) { if (f) URL.revokeObjectURL(f.url); }); S.sayfalar.splice(S.sec, 1); sec(Math.min(S.sec, S.sayfalar.length - 1));
    });
    /* çerçeve: dokun = seç / boşsa dosya seç; sürükle = kırp; dosya bırak = yerleştir */
    var surukle = null;
    tuval.addEventListener('pointerdown', function (e) {
      var el = e.target.closest('.dg2-alan'); if (!el) return;
      var i = +el.getAttribute('data-i'), p = S.sayfalar[S.sec], f = p.f[i];
      surukle = { el: el, i: i, x: e.clientX, y: e.clientY, tasindi: false, f: f, dokunma: e.pointerType !== 'mouse' };
      if (f) { try { el.setPointerCapture(e.pointerId); } catch (x) { /* önemsiz */ } }
    });
    tuval.addEventListener('pointermove', function (e) {
      if (!surukle || !surukle.f || S.slot !== surukle.i) return;
      var dx = e.clientX - surukle.x, dy = e.clientY - surukle.y;
      if (!surukle.tasindi && Math.abs(dx) + Math.abs(dy) < 5) return;
      surukle.tasindi = true; surukle.x = e.clientX; surukle.y = e.clientY;
      var f = surukle.f, el = surukle.el, sw = el.clientWidth, sh = el.clientHeight, s = kaynak(f, sw, sh);
      var fazlaX = f.w * s.k - sw, fazlaY = f.h * s.k - sh;
      if (fazlaX > 0.5) f.px = Math.min(1, Math.max(0, f.px - dx / fazlaX));
      if (fazlaY > 0.5) f.py = Math.min(1, Math.max(0, f.py - dy / fazlaY));
      yerles();
    });
    tuval.addEventListener('pointerup', function () {
      if (!surukle) return; var d = surukle; surukle = null; if (d.tasindi) return;
      var p = S.sayfalar[S.sec]; S.slot = d.i; tuvalCiz();
      if (!p.f[d.i] && !d.dokunma) { hedef = { p: p, i: d.i }; $('#dgDosya').click(); }
    });
    tuval.addEventListener('pointercancel', function () { surukle = null; });
    tuval.addEventListener('dragover', function (e) { if (e.target.closest('.dg2-alan')) { e.preventDefault(); e.target.closest('.dg2-alan').classList.add('uzerinde'); } });
    tuval.addEventListener('dragleave', function (e) { var a = e.target.closest('.dg2-alan'); if (a) a.classList.remove('uzerinde'); });
    tuval.addEventListener('drop', async function (e) {
      var a = e.target.closest('.dg2-alan'); if (!a) return; e.preventDefault(); a.classList.remove('uzerinde');
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (!f) return;
      var i = +a.getAttribute('data-i'); await ekle(f, S.sayfalar[S.sec], i); S.slot = i; tuvalCiz();
    });
    tuval.addEventListener('wheel', function (e) {
      var a = e.target.closest('.dg2-alan.dolu'); if (!a) return; var f = S.sayfalar[S.sec].f[+a.getAttribute('data-i')]; if (!f) return;
      e.preventDefault(); f.zoom = Math.min(3, Math.max(1, f.zoom - e.deltaY * 0.002)); yerles(); var z = $('#dgZoom'); if (z) z.value = f.zoom;
    }, { passive: false });
    window.addEventListener('resize', yerles);

    $('#dgYap').addEventListener('click', async function () {
      var d = $('#dgYap'); if (!foto()) { mesaj('Önce en az bir fotoğraf ekleyin.'); return; }
      if (!S.sayfalar[0].f[0]) { mesaj('Kapak için bir fotoğraf ekleyin.'); return; }
      d.disabled = true; mesaj('');
      try {
        var pdf = await uret(S.sayfalar, { tema: S.tema, ad: S.ad, baslik: S.ad || 'Düğün hikayemiz', tarih: S.tarih ? O.tarihTR(S.tarih) : '', mekan: M.ad, telefon: M.telefon || '', instagram: ctx.instagram || '' },
          function (n, t) { d.textContent = 'Dergi hazırlanıyor... sayfa ' + n + ' / ' + t; });
        var a = document.createElement('a'); a.href = URL.createObjectURL(pdf);
        a.download = 'foto-dergi' + (S.ad ? '-' + S.ad.replace(/[^\wÇĞİÖŞÜçğıöşü]+/g, '-') : '') + '.pdf';
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 60000);
        hata.innerHTML = '<div class="ok-kutu" role="status">Derginiz hazır, indirildi.</div>';
      } catch (er) { mesaj('Dergi hazırlanamadı: ' + (er.message || 'bilinmeyen hata')); }
      d.textContent = 'PDF dergiyi indir'; d.disabled = false;
    });
    tuvalCiz();
  }

  window.DERGI = { ac: ac, pdfYap: pdfYap };
})();
