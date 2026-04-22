# To-Do List Uygulaması

Basit, kullanıcı dostu bir To-Do (görev listesi) uygulaması.

## Programın Özellikleri

- Kullanıcının yeni görev eklemesine olanak sağlar.
- Eklenen görevleri liste halinde görüntüler.
- Görevlerin tamamlandı olarak işaretlenmesini sağlar.
- İstenilen görevlerin silinmesine imkân tanır.
- Enter tuşu desteği ile hızlı görev ekleme sunar.
- Basit, anlaşılır ve kullanıcı dostu bir arayüze sahiptir.
- Tamamlanan görevleri görsel olarak farklı şekilde gösterir.
- Tarayıcı üzerinde localStorage kullanılarak görevler kalıcı hale getirilir.

## Teknik Özellikler

- HTML ile sayfa yapısı oluşturuldu.
- CSS ile kullanıcı arayüzü tasarlandı.
- JavaScript ile görev ekleme, silme ve tamamlama işlemleri geliştirildi.
- DOM manipülasyonu kullanılarak dinamik görev listesi oluşturuldu.
- Kullanıcı etkileşimleri buton ve klavye olayları ile yönetildi.
- localStorage kullanılarak görevler tarayıcıda saklanır.

## Çalıştırma

1. Bu klasörü bir web sunucusunda ya da doğrudan tarayıcıda açın.
2. `index.html` dosyasını açın.

## Geliştirme Notları

- Görevler `localStorage` ile saklanır; tarayıcıyı kapatıp açsanız bile korunur.
- İleri: Görevlerin sıralanması, etiket/durum ekleme ve filtreleme eklenebilir.

## Yeni Eklenen Özellikler

- Görev düzenleme: Eklenmiş görevleri düzenleyebilirsiniz ("Düzenle" butonu veya çift tık).
- Filtreleme: Tümü / Aktif / Tamamlanan filtreleri ile listeyi filtreleyebilirsiniz.
- Geri Al (Undo): Bir görevi sildiğinizde kısa bir süre geri alabilirsiniz ("Geri Al" butonu çıkar).
- Responsive: Mobil ekranlarda arayüz tek sütuna dönüşür, tuşlar dokunmatik için uygun boyuta gelir.

## Nasıl Kullanılır

1. Projeyi açmak için `index.html` dosyasını tarayıcıda açın veya bir yerel sunucu başlatın.
2. Yeni görev yazın ve `Enter` veya `Ekle` butonuna basın.
3. Bir görevi düzenlemek için `Düzenle` butonuna basın veya görev metnine çift tıklayın.
4. Görevi silince kısa süre içinde çıkan `Geri Al` butonu ile işlemi geri alabilirsiniz.

### Yeni özellikler

- Göreve son tarih ekleme: Görev eklerken tarih seçebilirsiniz.
- Göreve öncelik atama: Düşük / Orta / Yüksek seçenekleri mevcuttur.
- Sürükle-bırak ile görev sıralama: Görevleri istediğiniz sıraya sürükleyin.
- Dışa aktar / İçe aktar: Görevleri JSON olarak dışa aktarabilir veya içe aktarabilirsiniz.

Bu özellikler tarayıcıdaki `localStorage` içinde saklanır.

## Notlar
- Filtreler üst kısımdaki düğmelerle değiştirilebilir.
- `localStorage` verisini temizlemek isterseniz tarayıcı geliştirici araçlarından silinebilir.
