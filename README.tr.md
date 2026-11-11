# Dosya Atölyesi

## 2.0 yenilikleri

Metin kurtarma ve görünmez Unicode incelemesi, kimliğe göre tablo karşılaştırma, başlıkları koruyarak tablo bölme, SHA-256 ile aynı dosyaları bulma ve toplu görsel dönüştürme eklendi. Her araçta nasıl kullanılır açıklaması ve sayfa üzerindeki kontrolleri işaretleyen üç adımlı rehber var.

Sağ üstten açık/koyu görünüm ve dil seçilir. **Toplam 19 dil seçeneği vardır: 10 dünya dili ve Türkçe dahil 9 Türk dili.** Yalnızca gerçek arayüz çevirisi bulunan diller sunulur; sadece İngilizce gösteren eski `EN` seçenekleri kaldırılmıştır. `◐` kısmi çeviri anlamına gelir; eksik metinler İngilizce gösterilir. Azerbaycanca, Kazakça, Özbekçe, Kırgızca ve Türkmence rehberleri çevrilmiştir. Tüm lehçeleri kapsadığı iddia edilmez. Ayrıntılar [languages.md](languages.md) ve güncel tam kullanım [README.md](README.md) içindedir.

Dosya adları ve içerikleri dil değişiminden etkilenmez. Dil ve görünüm seçimleri yalnızca açık oturum için tutulur. Toplu görsel çıktısı 150 MB, tablo bölme çıktısı 500 parça ile sınırlıdır.

Günlük dosya işleri için ücretsiz, açık kaynak ve tarayıcıda çalışan bir araç kutusu. Kurulum, hesap, API anahtarı veya ücretli servis gerekmez.

## Kullanım

Klasörü açıp **index.html** dosyasına çift tıklayın. Güncel Chrome, Edge, Firefox veya Safari kullanın. İnternet bağlantısı gerekmez. GitHub Pages dahil herhangi bir statik web sunucusunda da çalışır; uygulama dosyalarını kök dizinde tutun.

Ana ekrandaki **Örnek dosyalarla dene** düğmesi kişisel veri içermeyen örnekler oluşturur.

## Araçlar

- **Dosya incele:** 20'den fazla dosya imzası, uzantı uyuşmazlıkları, metin ve ilk bayt önizlemesi. İsteğe bağlı SHA-256 özeti ve doğru uzantıyla kopya indirme.
- **CSV düzenle:** Otomatik ayraç tahmini, UTF-8 / UTF-16 / Windows-1254 / Windows-1252, çok satırlı ve tırnaklı hücreler, kenar boşlukları, boş ve yinelenen satırlar. UTF-8 BOM ile dışa aktarma; varsayılan olarak formül başlangıçlarını metne çevirme.
- **Görsel dönüştür:** JPEG / PNG / WebP çıktısı, oranı koruyarak küçültme, döndürme, yatay çevirme, kalite ve hedef KB. Şeffaf görseller için JPEG arka plan rengi. Çıktı boyutu ve önizleme.
- **Metin temizle:** Boşluk ve satır temizleme, tekrarları kaldırma, Türkçe sıralama, LF satır sonları, JSON doğrulama / girintileme / küçültme. JSON sayıları, anahtar sırası ve tekrarlı anahtarlar korunur. Kaynak ve sonuç karşılaştırması, kopyalama ve indirme.
- **Toplu adlandır:** Önek, bul/değiştir, harf biçimi, sıra numarası, Türkçe karakter sadeleştirme. Ad çakışmalarını çözme ve ZIP indirme. Kaynak dosyalara yazılmaz.

## Gizlilik

- Seçilen dosyalar yalnızca sekmenin belleğinde işlenir. Sayfayı yenilemek veya çalışma alanını temizlemek onları uygulamadan kaldırır. İndirilmiş kopyaları silmez.
- Ağ isteği, analiz servisi, reklam, uzaktan font, CDN, yapay zekâ servisi, çerez veya kalıcı tarayıcı kaydı yoktur. Dosyalar herhangi bir sunucuya gönderilmez.
- Kaynak kod ve örnekler kişisel bilgi içermez. Uygulamada açtığınız dosyalar kaynak pakete eklenmez.
- Görseller piksel verisinden yeniden oluşturulur; kaynak EXIF/GPS alanları kopyalanmaz. Görselin üzerinde yazan veya çizilen kişisel bilgiler temizlenmez.
- Toplu adlandırma yalnızca adları değiştirir; dosyaların içindeki kişisel bilgileri kaldırmaz. ZIP girdilerine yerel klasör yolları eklenmez, tarihler sabittir.
- Bir web sunucusunda barındırıldığında sunucunun olağan ziyaret günlükleri kendi politikasına tabidir. Uygulama dosya içeriği göndermez.

## Sınırlar

- Çalışma alanı: 100 dosya, dosya başına 50 MB, toplam 150 MB.
- CSV / metin: 5 MB. CSV: 50.000 satır, 500 sütun; önizleme ilk 100 satırı gösterir.
- Görseller: 32 megapiksel, kenar başına 16.384 piksel. SVG işlenmez. HEIC ve TIFF dönüştürülmez. GIF ve diğer hareketli görsellerden yalnızca tek kare alınır. AVIF çözme desteği tarayıcıya bağlıdır.
- Görsellerde hedef dosya boyutu kalite aramasıyla denenir; her zaman sağlanamaz. PNG kayıpsız olduğundan kalite kaydırıcısı devre dışıdır. Sonuç ölçülerek gösterilir.
- ZIP, sıkıştırma yapmadan paketler; amacı yeniden adlandırılmış dosyaları tek indirmede sunmaktır. Şifreleme veya arşiv açma yapmaz.
- Dosya imzası doğrulaması antivirüs değildir; dosyanın tamamını doğrulamaz. Bozuk PDF, Office veya ZIP onarımı ve parola çözme sunulmaz.
- Formül koruması eksi/artı ile başlayan sayıları da metne çevirebilir. Gerekirse dışa aktarmadan önce kapatılabilir.
- SHA-256 ve pano erişimi bazı tarayıcılarda HTTPS veya localhost gerektirir. Metin kopyalama için yerel dosya kipinde yedek yöntem kullanılır.

## Geliştirme

Harici çalışma zamanı bağımlılığı ve derleme adımı yoktur. HTML dosyasını, referans verdiği JS/CSS dosyaları ve simgeyle aynı klasörde tutun. `advanced.js`, dil dosyaları, `enhancements.js` ve `guides.js` yeni araçları ve rehberleri sağlar.

Node.js 20 veya üstü ile testler:

```sh
npm test
```

Tek dosyalık çevrimdışı sürüm üretmek için:

```sh
npm run portable
```

Bu komut `standalone.html` üretir. JavaScript ve CSS içine gömülür; içerik güvenlik politikası SHA-256 özetleriyle güncellenir. Üretim tarihi, bilgisayar adı veya yerel dosya yolu eklenmez.

## Lisans

MIT. Kullanabilir, değiştirebilir ve dağıtabilirsiniz. Lisans metnini koruyun.
