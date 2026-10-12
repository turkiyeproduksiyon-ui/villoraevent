/* Villora Event - site ayarları (tek yer). Anahtarı değiştirmek için sadece bu dosyayı düzenle. */
window.AYAR = {
  SUPABASE_URL: 'https://vhdadvwwurxppuwumakm.supabase.co',
  SUPABASE_KEY: 'sb_publishable_zxEtrYAjtA9acM06Q6rsEw_tz27iTjT',
  MEKAN_SLUG: 'villora-event',
  KONUM: { lat: '39.68602752685547', lng: '32.740657806396484' },   // harita bağlantısında koordinat yoksa bu kullanılır
  HERO: 'img/hero.jpg',   // ana banner (panelden yeni hero yüklenirse o geçerli olur)
  GALERI: ['img/galeri-1.jpg', 'img/galeri-2.jpg', 'img/galeri-3.jpg', 'img/galeri-4.jpg', 'img/galeri-5.jpg'],   // GEÇİCİ: panele mekan fotoğrafı yüklenince otomatik kalkar
  SOSYAL: { facebook: '', youtube: '', tiktok: '' },   // varsayılan bağlantılar (panelden girilen önceliklidir)
  ETIKET: 'Etkinlik Organizatörü · Exclusive Event Villa · Bridal Retreat',
  VARSAYILAN: {
    telefon: '0542 722 03 06',
    instagram: '@villoraevent',
    adres: 'Yavrucuk Mahallesi, Haymana Yolu Bulvarı, Küme Evleri No:81, Yavrucuk / Gölbaşı / Ankara 06830',
    hakkinda: '2025 yılında Gölbaşı\'nda kurulan Villora Event, düğün, nişan ve özel günlerinizi size özel bir villa atmosferinde yaşamanız için hazırlandı. Etkinlik organizatörü, exclusive event villa ve bridal retreat olarak hizmet veriyoruz.\n\nSalonundan bahçesine, menüsünden organizasyonuna kadar her ayrıntıyı sizinle birlikte planlıyor, hayalinizdeki günü kolay ve stressiz yaşamanız için yanınızda oluyoruz. Sizin mutluluğunuz, bizim en büyük önceliğimiz.'
  },   // panelde doldurulunca panel geçerli olur
  LOGO: 'img/logo-isaret.png'   // panelden logo yüklenmediyse bu kullanılır
};
