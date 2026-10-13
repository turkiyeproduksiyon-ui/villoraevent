/* Shorts: sayfa sonunda başlayan dikey, kaydırmalı video akışı (YouTube bağlantılarıyla çalışır) */
(function () {
  'use strict';
  var IC = {
    kalp: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
    kaydet: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/></svg>',
    paylas: '<svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></svg>',
    yukari: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>',
    oynat: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    ses: '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M19 9a5 5 0 0 1 0 6M22 6a9 9 0 0 1 0 12"/></svg>'
  };
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); }
  function ytId(u) { var m = String(u || '').match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})/); return m ? m[1] : ''; }
  function depo(k) { try { return JSON.parse(localStorage.getItem(k) || '{}'); } catch (e) { return {}; } }
  function depoYaz(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* önemsiz */ } }

  var L = [], feed, players = {}, created = {}, visible = {}, ytHazir = false, ytYukleniyor = false, bekliyor = false, sesAcik = false, io = null, ad = '', izle = null;
  var begeni = depo('shorts_begeni'), kayit = depo('shorts_kayit');

  function ytApiYukle() {
    if (ytHazir || ytYukleniyor) return;
    ytYukleniyor = true;
    var t = document.createElement('script'); t.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(t);
    window.onYouTubeIframeAPIReady = function () { ytHazir = true; if (bekliyor) oynaticilariKur(); };
    setTimeout(function () { if (!ytHazir) { ytYukleniyor = false; try { t.remove(); } catch (e) { /* yok */ } ytApiYukle(); } }, 9000);
  }
  function hata(i, metin) {
    var it = feed.querySelector('.shorts-item[data-i="' + i + '"]'); if (!it || it.querySelector('.shorts-err')) return;
    var v = L[i] || {}, d = document.createElement('div'); d.className = 'shorts-err';
    d.innerHTML = '<div>' + esc(metin) + '</div>' + (v.url ? '<a href="' + esc(v.url) + '" target="_blank" rel="noopener">Videoyu aç</a>' : '');
    it.appendChild(d);
  }
  function oynatici(i) {
    if (i < 0 || i >= L.length || created[i] || !ytHazir || !window.YT || !YT.Player) return;
    var v = L[i]; if (!v.yt || !document.getElementById('ytp-' + i)) return;
    created[i] = true;
    new YT.Player('ytp-' + i, {
      videoId: v.yt,
      playerVars: { mute: 1, loop: 1, playlist: v.yt, controls: 0, playsinline: 1, modestbranding: 1, rel: 0, iv_load_policy: 3, fs: 0, disablekb: 1 },
      events: {
        onReady: function (e) { players[i] = e.target; try { sesAcik ? e.target.unMute() : e.target.mute(); e.target.playVideo(); } catch (x) { /* yok */ } },
        onError: function (e) {
          var c = e && e.data;
          hata(i, (c === 101 || c === 150) ? 'Bu video gömmeye kapalı. YouTube Studio\'da "Gömmeye izin ver" seçeneğini açın.' : (c === 100 ? 'Video bulunamadı ya da gizli.' : 'Bu video şu an oynatılamıyor.'));
        },
        onStateChange: function (e) {
          var w = document.getElementById('ytw-' + i);
          if (e.data === 1) { if (visible[i]) { if (w) w.classList.add('on'); } else { try { e.target.pauseVideo(); } catch (x) { /* yok */ } } }
          else if ((e.data === -1 || e.data === 5) && visible[i]) { try { e.target.playVideo(); } catch (x) { /* yok */ } }
        }
      }
    });
  }
  function oynaticilariKur() {
    bekliyor = false;
    if (io) io.disconnect();
    io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        var i = +en.target.getAttribute('data-i'), p = players[i], w = document.getElementById('ytw-' + i);
        if (en.isIntersecting) {
          visible[i] = true; oynatici(i); oynatici(i + 1); oynatici(i - 1);
          if (p && p.playVideo) { try { p.seekTo(0, true); p.playVideo(); } catch (x) { /* yok */ } }
        } else {
          visible[i] = false; if (w) w.classList.remove('on');
          if (p && p.pauseVideo) { try { p.pauseVideo(); } catch (x) { /* yok */ } }
        }
      });
    }, { threshold: 0.55 });
    feed.querySelectorAll('.shorts-item').forEach(function (it) { io.observe(it); });
    oynatici(0); oynatici(1);
  }

  function akisCiz() {
    feed.innerHTML = L.map(function (v, i) {
      var ic = v.yt
        ? '<div class="yt-wrap" id="ytw-' + i + '"><div class="yt-target" id="ytp-' + i + '"></div></div><div class="shorts-tap-layer"><div class="mute-hint">' + IC.ses + '</div></div>'
        : '<div class="shorts-ig"><p>Bu video Instagram\'da.</p><a class="shorts-ig-btn" href="' + esc(v.url) + '" target="_blank" rel="noopener">Instagram\'da izle</a></div>';
      return '<div class="shorts-item" data-i="' + i + '">' + ic +
        '<div class="shorts-actions">' +
        '<button type="button" class="shorts-action-btn b-kalp' + (begeni[v.id] ? ' liked' : '') + '" aria-label="Beğen">' + IC.kalp + '<span>Beğen</span></button>' +
        '<button type="button" class="shorts-action-btn b-kaydet' + (kayit[v.id] ? ' saved' : '') + '" aria-label="Kaydet">' + IC.kaydet + '<span>Kaydet</span></button>' +
        '<button type="button" class="shorts-action-btn b-paylas" aria-label="Paylaş">' + IC.paylas + '<span>Paylaş</span></button>' +
        '<button type="button" class="shorts-action-btn b-yukari" aria-label="Sayfanın başına dön">' + IC.yukari + '<span>Yukarı</span></button></div>' +
        '<div class="shorts-info"><span class="shorts-info-icon">' + IC.oynat + '</span><p>' + esc(v.baslik || ad + ' Shorts') + '</p></div></div>';
    }).join('');
    feed.addEventListener('click', function (e) {
      var it = e.target.closest('.shorts-item'); if (!it) return;
      var i = +it.getAttribute('data-i'), v = L[i];
      if (e.target.closest('.b-kalp')) { begeni[v.id] = !begeni[v.id]; depoYaz('shorts_begeni', begeni); e.target.closest('.b-kalp').classList.toggle('liked', !!begeni[v.id]); return; }
      if (e.target.closest('.b-kaydet')) { kayit[v.id] = !kayit[v.id]; depoYaz('shorts_kayit', kayit); e.target.closest('.b-kaydet').classList.toggle('saved', !!kayit[v.id]); return; }
      if (e.target.closest('.b-paylas')) {
        var url = v.yt ? 'https://youtu.be/' + v.yt : v.url;
        if (navigator.share) { navigator.share({ title: ad + ' Shorts', url: url }).catch(function () { /* iptal */ }); }
        else if (navigator.clipboard) { navigator.clipboard.writeText(url).then(function () { alert('Bağlantı kopyalandı'); }).catch(function () { /* yok */ }); }
        return;
      }
      if (e.target.closest('.b-yukari')) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      if (e.target.closest('.shorts-tap-layer')) {
        sesAcik = !sesAcik;
        Object.keys(players).forEach(function (k) { try { sesAcik ? players[k].unMute() : players[k].mute(); } catch (x) { /* yok */ } });
        var mh = it.querySelector('.mute-hint'); if (mh) { mh.classList.add('show'); clearTimeout(mh._t); mh._t = setTimeout(function () { mh.classList.remove('show'); }, 600); }
      }
    });
    bekliyor = true;
    if (ytHazir) oynaticilariKur(); else ytApiYukle();
  }

  window.VSHORTS = {
    /* liste: [{id, url, baslik}]  ·  kok: #shortsInline  ·  mekanAd: başlıkta görünür */
    kur: function (liste, kok, mekanAd) {
      ad = mekanAd || '';
      L = liste.map(function (v) { return { id: v.id, url: v.url, baslik: v.baslik, yt: ytId(v.url) }; }).filter(function (v) { return v.url; });
      if (!kok) return;
      if (!L.length) { kok.style.display = 'none'; return; }
      feed = kok.querySelector('#shortsFeed');
      var ilk = L.filter(function (v) { return v.yt; })[0], im = kok.querySelector('#shortsPeekImg');
      if (im && ilk) { im.onerror = function () { im.style.display = 'none'; }; im.src = 'https://i.ytimg.com/vi/' + ilk.yt + '/hqdefault.jpg'; }
      else if (im) { im.parentNode.style.display = 'none'; }
      var cizildi = false;
      izle = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting && !cizildi) { cizildi = true; akisCiz(); izle.disconnect(); } });
      }, { rootMargin: '1800px 0px' });
      izle.observe(kok);
    }
  };
})();
