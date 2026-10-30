/* Villora Event: sözleşme çıktısı. Panelde kayıttaki bilgiler, seçilen menü ve ödemeler sözleşme şablonundaki yerlere otomatik yazılır.
   Sözleşme metni, firma unvanı, adres ve telefon panelden (Site içeriği > Sözleşme) değiştirilir. */
(function () {
  'use strict';
  var O = window.ORTAK, esc = O.esc;
  var GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

  function tarihNokta(iso) { var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '.' + m[2] + '.' + m[1] : ''; }
  function gunAdi(iso) { var d = O.tarihNesne ? O.tarihNesne(iso) : null; return d ? GUNLER[d.getDay()] : ''; }
  function tl(n) { return O.para(Number(n) || 0); }
  function bos(v) { return v === null || v === undefined || String(v).trim() === ''; }
  function ad(k) { return (String(k.ad || '') + ' ' + String(k.soyad || '')).trim(); }

  function sartlar(sablon, mekan, tarih) {
    var d = { unvan: sablon.unvan || mekan.ad || '', adres: sablon.adres || mekan.adres || '', tel: sablon.telefon || mekan.telefon || '' };
    var h = '';
    String(sablon.icerik || '').split(/\r?\n/).forEach(function (satir) {
      var t = satir.trim(); if (!t) return;
      t = t.replace(/\{\{(\w+)\}\}/g, function (m, a) { return d[a] !== undefined ? d[a] : m; });
      if (/^##\s*/.test(t)) { h += '<h3>' + esc(t.replace(/^##\s*/, '')) + '</h3>'; return; }
      var bn = t.match(/^(Bilgi Notu:)(.*)$/);
      if (bn) { h += '<p><b>' + esc(bn[1]) + '</b>' + esc(bn[2]) + '</p>'; return; }
      var no = t.match(/^(\d{1,2}\))\s*(.*)$/);
      if (no) { h += '<p><b>' + esc(no[1]) + '</b> ' + esc(no[2]) + '</p>'; return; }
      h += '<p>' + esc(t) + '</p>';
    });
    return h;
  }

  /* ctx: { mekan, sablon, kayit (cift_kayit_ozet satırı), menu, kalemler (teklif_kalemleri), odemeler, salonAdi, logo } */
  function belge(ctx) {
    var M = ctx.mekan || {}, S = ctx.sablon || {}, k = ctx.kayit || {}, mn = ctx.menu || null;
    var unvan = S.unvan || M.ad || '', adres = S.adres || M.adres || '', tel = S.telefon || M.telefon || '';
    var ust = S.ust_baslik || ((M.ad || '') + ' | Düğün');
    var odemeler = ctx.odemeler || [];
    var odenen = odemeler.filter(function (o) { return o.odendi; });
    var kapora = odenen.filter(function (o) { return o.tur === 'kapora'; }).reduce(function (t, o) { return t + Number(o.tutar); }, 0);
    var digerTah = odenen.filter(function (o) { return o.tur !== 'kapora'; }).reduce(function (t, o) { return t + Number(o.tutar); }, 0);
    var bedel = Number(k.sozlesme_bedeli) || 0, ekstra = Number(k.ekstra_tutar) || 0;
    var genel = bedel + ekstra, kalan = genel - kapora - digerTah;

    var sol = '';
    if (mn) {
      sol += '<div class="konsept">Konsept: ' + esc(mn.ad) + '</div>';
      O.menuAyir(mn.icerik).forEach(function (b) {
        sol += '<div class="bol">' + (b.baslik ? '<b>' + esc(b.baslik) + ': </b>' : '') + esc(b.ogeler.join(', ')) + '</div>';
      });
    } else sol += '<div class="konsept">Konsept: -</div>';
    var kal = (ctx.kalemler || []).filter(function (r) { return r.kalem_ad; });
    if (kal.length) sol += '<div class="bol"><b>Ek seçenekler: </b>' + esc(kal.map(function (r) { return r.kalem_ad + (Number(r.adet) !== 1 ? ' (' + r.adet + ')' : ''); }).join(', ')) + '</div>';

    var hiz = O.satirlar(mn && mn.dahil_hizmetler).map(function (x) { return '<div class="hz"><i>&#10003;</i>' + esc(x) + '</div>'; }).join('');

    var notlar = [];
    if (!bos(k.sozlesme_notu)) notlar.push(k.sozlesme_notu);
    if (mn && !bos(mn.not_metni)) notlar.push(mn.not_metni);
    var notHtml = notlar.map(function (n) { return esc(n).replace(/\n/g, '<br>'); }).join('<br>');

    var tele = [k.telefon, k.telefon2, k.is_telefonu].filter(function (x) { return !bos(x); });
    var saat = (k.baslama_saati || k.bitis_saati) ? (esc(k.baslama_saati || '') + ' - ' + esc(k.bitis_saati || '')) : '';
    var gun = k.dugun_tarihi ? tarihNokta(k.dugun_tarihi) + ', ' + gunAdi(k.dugun_tarihi) : '';

    var css = '@page{size:A4;margin:12mm 12mm 18mm}' +
      '*{box-sizing:border-box}html,body{margin:0;padding:0}body{font:10.5pt/1.38 Arial,Helvetica,"Segoe UI",sans-serif;color:#111;background:#fff}' +
      '.sayfa{max-width:190mm;margin:0 auto;padding:6mm 0}' +
      '.ust{text-align:center;margin-bottom:6px}.ust img{height:30mm;max-width:60mm;object-fit:contain;display:block;margin:0 auto 4px}' +
      '.ust b{display:block;font-size:12pt}.ust span{font-size:9.5pt}' +
      '.kutu{border:1.2px solid #222;margin-top:8px}' +
      '.bant{background:#7a7a7a;color:#fff;text-align:center;font-weight:700;padding:5px;font-size:11pt}' +
      '.sira{display:flex;flex-wrap:wrap;gap:4px 18px;padding:7px 10px;border-top:1px solid #222}.sira:first-of-type{border-top:0}' +
      '.sira b{font-weight:700}' +
      '.iki{display:grid;grid-template-columns:1fr 1fr;border-top:1.2px solid #222}.iki>div{padding:8px 10px;min-height:22mm}.iki>div+div{border-left:1.2px solid #222}' +
      '.konsept{margin-bottom:4px}.bol{margin:2px 0}.hz{margin:3px 0}.hz i{font-style:normal;display:inline-block;width:15px;height:15px;border:1.3px solid #222;border-radius:50%;text-align:center;line-height:12px;font-size:9pt;margin-right:6px}' +
      '.para{width:100%;border-collapse:collapse}.para td{padding:2px 0}.para td:last-child{text-align:right;font-weight:700;white-space:nowrap}' +
      'h2{font-size:12pt;text-align:center;margin:12px 0 6px}h3{font-size:10.5pt;margin:10px 0 3px;break-after:avoid}p{margin:3px 0;text-align:justify}' +
      '.imza{display:flex;justify-content:space-around;margin-top:18px;break-inside:avoid;text-align:center}.imza div{min-width:60mm}.imza small{display:block;margin-top:34px;border-top:1px solid #444;padding-top:3px}' +
      '.alt{position:fixed;left:0;right:0;bottom:0;display:flex;justify-content:space-around;font-size:8.5pt;color:#333}' +
      '.bos-yer{color:#888}' +
      '@media screen{body{background:#eee}.sayfa{background:#fff;padding:10mm;margin:10px auto;box-shadow:0 1px 8px rgba(0,0,0,.2)}.alt{display:none}}';

    function satir(et, deger) { return '<div><b>' + et + '</b> ' + (bos(deger) ? '<span class="bos-yer">........................</span>' : esc(deger)) + '</div>'; }

    var h = '<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sözleşme - ' + esc(ad(k)) + '</title><style>' + css + '</style></head><body><div class="sayfa">' +
      '<div class="ust">' + (ctx.logo ? '<img src="' + esc(ctx.logo) + '" alt="">' : '') + '<b>' + esc(unvan) + '</b><span>' + esc(adres) + (tel ? ' TEL:' + esc(tel) : '') + '</span></div>' +
      '<div class="kutu"><div class="bant">' + esc(ust) + '</div>' +
      '<div class="sira"><div><b>Tarih :</b> ' + esc(gun) + '</div><div><b>Sözleşme Tarihi :</b> ' + esc(tarihNokta(k.sozlesme_tarihi)) + '</div><div><b>Kişi Sayısı :</b> ' + esc(k.kisi_sayisi || '') + '</div><div><b>Saat :</b> ' + saat + '</div>' +
      ((k.org_turu || k.seans || ctx.salonAdi) ? '<div><b>' + esc([k.org_turu, k.seans, ctx.salonAdi].filter(Boolean).join(' · ')) + '</b></div>' : '') + '</div>' +
      '<div class="sira"><b>Organizasyon Sahibi</b></div>' +
      '<div class="sira">' + satir('Çift Adı:', k.cift_adi) + satir('eMail:', k.eposta) + '</div>' +
      '<div class="sira">' + satir('Ad Soyad:', ad(k)) + satir('TC / Sicil No:', k.tc_no) + satir('Tel.:', tele.join(' - ')) + '</div>' +
      '<div class="sira">' + satir('Adres:', k.adres) + '</div>' +
      '<div class="iki"><div>' + sol + '</div><div><b>Hizmetler:</b>' + hiz + '</div></div>' +
      '<div class="iki"><div><b>Not:</b> ' + notHtml + '</div><div><b>Ödeme Bilgisi:</b><table class="para">' +
      '<tr><td>Sözleşme Bedeli</td><td>' + esc(tl(bedel)) + '</td></tr><tr><td>Ekstra</td><td>' + esc(tl(ekstra)) + '</td></tr>' +
      '<tr><td><b>Genel Toplam</b></td><td>' + esc(tl(genel)) + '</td></tr><tr><td>Kapora</td><td>' + esc(tl(kapora)) + '</td></tr>' +
      (digerTah > 0 ? '<tr><td>Diğer tahsilat</td><td>' + esc(tl(digerTah)) + '</td></tr>' : '') +
      '<tr><td><b>Kalan</b></td><td>' + esc(tl(kalan)) + '</td></tr></table></div></div></div>' +
      '<h2>SÖZLEŞME ŞARTLARI</h2>' + sartlar(S, M, k) +
      '<div class="imza"><div><small>Organizasyon Sahibi İmza<br><b>' + esc(ad(k)) + '</b></small></div><div><small>Organizasyon Yetkilisi<br><b>' + esc(unvan) + '</b></small></div></div>' +
      '</div><div class="alt"><span>Organizasyon Sahibi İmza ..............</span><span>Organizasyon Yetkilisi ..............</span></div></body></html>';
    return h;
  }

  /* Panelde tam ekran önizleme penceresi: Yazdır / PDF ve Kapat düğmeleri */
  function ac(ctx, hemenYazdir) {
    var perde = document.createElement('div');
    perde.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#444;display:flex;flex-direction:column';
    var bar = document.createElement('div');
    bar.style.cssText = 'display:flex;gap:10px;align-items:center;justify-content:space-between;padding:10px 14px;background:#222;color:#fff;font:600 15px Arial,sans-serif';
    bar.innerHTML = '<span>Sözleşme önizleme</span><span style="display:flex;gap:10px"><button type="button" id="szYaz" style="min-height:42px;padding:0 18px;border:0;border-radius:8px;background:#fff;color:#111;font:700 15px Arial">Yazdır / PDF</button>' +
      '<button type="button" id="szKapat" style="min-height:42px;padding:0 18px;border:1px solid #888;border-radius:8px;background:transparent;color:#fff;font:600 15px Arial">Kapat</button></span>';
    var fr = document.createElement('iframe');
    fr.title = 'Sözleşme'; fr.style.cssText = 'flex:1;border:0;background:#fff;width:100%';
    fr.srcdoc = belge(ctx);
    perde.appendChild(bar); perde.appendChild(fr); document.body.appendChild(perde);
    var onceki = document.body.style.overflow; document.body.style.overflow = 'hidden';
    function kapat() { perde.remove(); document.body.style.overflow = onceki; document.removeEventListener('keydown', tus); }
    function tus(e) { if (e.key === 'Escape') kapat(); }
    function yaz() { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) { window.print(); } }
    document.addEventListener('keydown', tus);
    bar.querySelector('#szKapat').addEventListener('click', kapat);
    bar.querySelector('#szYaz').addEventListener('click', yaz);
    if (hemenYazdir) fr.addEventListener('load', function () { setTimeout(yaz, 250); });
  }

  window.SOZLESME = { belge: belge, ac: ac };
})();
