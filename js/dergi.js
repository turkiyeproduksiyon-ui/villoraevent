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
  /* Evliliğe Evet logosu (beyaz, şeffaf), dosya değil gömülü: PDF üretiminde tuval bozulmasın */
  var MARKA_LOGO = 'data:image/png;base64,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';
  function trTarih(iso) { var p = String(iso || '').split('-'); return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : ''; }
  function adTemiz(s) { return String(s || '').trim().replace(/\s+/g, ' ').split(' ').map(function (k) { return k === '&' ? k : k.charAt(0).toLocaleUpperCase('tr') + k.slice(1).toLocaleLowerCase('tr'); }).join(' '); }
  function alanPx(sb, sayfa) {      // şablon alanı -> sayfa pikseli
    if (sb.tam) return sb.alan.map(function (a) { return [a[0] * W, a[1] * H, a[2] * W, a[3] * H]; });
    var X = IC.x * W, Y = IC.y * H, GW = IC.w * W, GH = IC.h * H;
    return sb.alan.map(function (a) { return [X + a[0] * GW, Y + a[1] * GH, a[2] * GW, a[3] * GH]; });
  }
  /* Sayfanın alt ortasında küçük, ince yazı: çift adı, Düğün hikayemiz, tarih (gg.aa.yyyy) */
  function altYazi(ctx, bilgi, T, y0) {
    ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = T.kYazi; ctx.shadowColor = 'rgba(0,0,0,.38)'; ctx.shadowBlur = 8;
    var y = y0;
    if (bilgi.ad) { sigdir(ctx, bilgi.ad, '400 46px ' + SERIF, W - 300); try { ctx.letterSpacing = '1.5px'; } catch (e0) { /* eski tarayıcı */ } ctx.fillText(bilgi.ad, W / 2, y); try { ctx.letterSpacing = '0px'; } catch (e1) { /* önemsiz */ } y += 44; }
    ctx.font = 'italic 400 30px ' + SERIF; ctx.fillText('Düğün hikayemiz', W / 2, y);
    if (bilgi.tarih) { try { ctx.letterSpacing = '3px'; } catch (e2) { /* önemsiz */ } ctx.font = '400 24px ' + SANS; ctx.fillText(bilgi.tarih, W / 2, y + 42); try { ctx.letterSpacing = '0px'; } catch (e3) { /* önemsiz */ } }
    ctx.restore();
  }
  /* Arka kapak altı: Evliliğe Evet logosu (img/evlilige-evet-logo.png varsa o, yoksa sade halka işareti) */
  function markaCiz(ctx, bilgi, T, cx, cy) {
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 8; ctx.fillStyle = T.kYazi; ctx.strokeStyle = T.kYazi; ctx.textAlign = 'center';
    if (bilgi.marka) {
      var w = 300, h = bilgi.marka.height * w / bilgi.marka.width; ctx.drawImage(bilgi.marka, cx - w / 2, cy - h / 2, w, h);
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
      var gk = ctx.createLinearGradient(0, H * 0.8, 0, H); gk.addColorStop(0, 'rgba(0,0,0,0)'); gk.addColorStop(1, 'rgba(0,0,0,.34)'); ctx.fillStyle = gk; ctx.fillRect(0, H * 0.8, W, H * 0.2);
      ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 14;
      ctx.fillStyle = T.kYazi; ctx.textAlign = 'left'; ctx.font = '36px ' + SF; ctx.fillText(bilgi.mekan, 90, 118);
      ctx.shadowBlur = 0;
      altYazi(ctx, bilgi, T, H - 170);
    } else if (arka) {
      var g2 = ctx.createLinearGradient(0, H * 0.72, 0, H); g2.addColorStop(0, T.kA); g2.addColorStop(1, T.kB);
      ctx.fillStyle = g2; ctx.fillRect(0, H * 0.72, W, H * 0.28);
      altYazi(ctx, bilgi, T, H - 330);
      ctx.shadowColor = 'rgba(0,0,0,.38)'; ctx.shadowBlur = 8;
      ctx.fillStyle = T.kYazi; ctx.textAlign = 'center'; ctx.font = '26px ' + SF; ctx.fillText(bilgi.mekan, W / 2, H - 170);
      ctx.font = '21px ' + SANS; ctx.fillText([bilgi.telefon, bilgi.instagram].filter(Boolean).join('   '), W / 2, H - 135);
      ctx.shadowBlur = 0; markaCiz(ctx, bilgi, T, W / 2, H - 70); ctx.textAlign = 'left';
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
    try { bilgi.marka = await yukle(MARKA_LOGO); } catch (em) { bilgi.marka = null; }
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
      var ad = adTemiz(S.ad) || 'Düğün hikayemiz', t = trTarih(S.tarih);
      var a = $('#dgKapakAd'), b = $('#dgKapakTarih'), c = $('#dgAdYazi'); if (a) { a.textContent = adTemiz(S.ad); a.style.display = S.ad ? '' : 'none'; } if (b) b.textContent = t; if (c) c.textContent = ad;
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
        var pdf = await uret(S.sayfalar, { tema: S.tema, ad: adTemiz(S.ad), baslik: adTemiz(S.ad) || 'Düğün hikayemiz', tarih: trTarih(S.tarih), mekan: M.ad, telefon: M.telefon || '', instagram: ctx.instagram || '' },
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
