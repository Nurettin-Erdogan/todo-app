# Görev Listesi

Görev ekleme, önceliklendirme, tarih belirleme, arama, filtreleme ve sıralama özellikleri sunan kurulabilir bir PWA görev yöneticisidir. Herhangi bir framework veya harici paket gerektirmez.

## Özellikler

- Görev ekleme, düzenleme, tamamlama ve silme
- Silinen görevleri 5 saniye içinde geri alma
- Düşük, orta ve yüksek öncelik seçenekleri
- Son tarih, bugün, yarın ve gecikme göstergeleri
- Tümü, aktif ve tamamlanan görev filtreleri
- Anlık görev araması
- Masaüstünde sürükle-bırak, mobilde yukarı/aşağı düğmeleriyle sıralama
- Toplam, devam eden ve tamamlanan görev istatistikleri
- Tamamlanma ilerleme çubuğu
- Tarayıcıdaki `localStorage` ile kalıcı veri saklama
- Birden fazla sekme arasında otomatik veri eşitleme
- PWA kurulumu ve çevrimdışı açılış desteği
- Yeni sürüm hazır olduğunda güvenli güncelleme bildirimi
- Klavye ve ekran okuyucu desteği

## Bu Bilgisayarda Çalıştırma

En kolay yöntem:

1. `uygulamayi-baslat.bat` dosyasına çift tıklayın.
2. Komut penceresini açık bırakın.
3. Uygulama `http://localhost:5500` adresinde açılır.
4. Kapatmak için komut penceresinde `Ctrl + C` tuşlarına basın.

Alternatif olarak VS Code içinde:

1. Live Server eklentisini kurun.
2. `index.html` dosyasına sağ tıklayın.
3. **Open with Live Server** seçeneğini seçin.

> `index.html` dosyasını doğrudan açmak temel özellikleri çalıştırır; PWA ve çevrimdışı kullanım için yerel sunucu gerekir.

## Nasıl Kullanılır?

1. Üstteki forma görev metnini yazın.
2. İsterseniz son tarih ve öncelik seçin.
3. **Görev Ekle** düğmesine basın.
4. Soldaki kutuyla görevi tamamlandı olarak işaretleyin.
5. **Düzenle** düğmesiyle metni, tarihi veya önceliği değiştirin.
6. Masaüstünde görevleri sürükleyin; telefonda ok düğmelerini kullanın.
7. Arama alanı ve filtrelerle istediğiniz görevleri bulun.
8. Silme işleminden sonra çıkan **Geri Al** düğmesiyle görevi kurtarın.

## Telefona veya Bilgisayara Kurma

1. Projeyi GitHub Pages gibi HTTPS kullanan bir serviste yayınlayın.
2. Yayınlanan bağlantıyı telefonda açın.
3. Android Chrome'da **Uygulamayı yükle**, iPhone Safari'de **Ana Ekrana Ekle** seçeneğini kullanın.
4. Kurulumdan sonra Görev Listesi bağımsız bir uygulama penceresinde açılır.

## Dosya Yapısı

```text
todo-app/
|-- index.html              Sayfa yapısı
|-- style.css               Tasarım ve responsive kurallar
|-- script.js               Görevler ve kullanıcı etkileşimleri
|-- server.js               Paketsiz yerel geliştirme sunucusu
|-- uygulamayi-baslat.bat   Windows hızlı başlatıcısı
|-- manifest.webmanifest    PWA bilgileri
|-- service-worker.js       Çevrimdışı önbellek yönetimi
|-- icon-192.svg/png        Küçük uygulama ikonları
|-- icon-512.svg/png        Büyük uygulama ikonları
`-- README.md               Proje dokümantasyonu
```

## Veri Saklama

Görevler sunucuya gönderilmez. Veriler kullanılan tarayıcının `localStorage` alanında projeye özel bir anahtarla saklanır. Eski `tasks` verileri ilk açılışta otomatik taşınır. Tarayıcı verileri temizlenirse görevler de silinir.

## Geliştirme Notu

Bu proje saf HTML, CSS ve JavaScript kullanır. Service worker eski dosyaları gösterirse uygulamada beliren **Şimdi Yenile** düğmesini kullanın. Gerekirse tarayıcı geliştirici araçlarından service worker kaydını kaldırıp sayfayı yenileyin.
