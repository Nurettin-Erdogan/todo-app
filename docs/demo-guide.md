# 3 dakikalık demo

Görev Listesi’ni kurulabilir, çevrimdışı ve yalnızca cihazda kalan bir planlayıcı olarak gösterir.

## Hazırlık

- [Canlı demo](https://gorev-listesi-pwa.vercel.app/) açık olsun.
- Veri sunucuya gitmez; tarayıcı `localStorage` alanındadır.

## 0:00–0:20 — Boş plan

Boş durumu gösterin. **Örnek planı yükle** ile üç görev ekleyin. Örnek kayıtlar da yalnızca bu tarayıcıda kalır.

## 0:20–0:45 — Düzen

1. Bir görevi tamamlayın, birini silin, **Geri Al** ile tombstone süresinde kurtarın.
2. Aktif / tamamlanan filtre ve aramayı kullanın.
3. Son tarih ve önceliği değiştirin.

## 0:45–1:00 — PWA

Kurulumu ve çevrimdışı açılışı gösterin. Yeni sürüm hazırsa güncelleme kullanıcı onayına bağlıdır; açık oturumu sessizce yenilemez.

## Kapanış

Küçük bir görev uygulamasında asıl iş, senkron çakışması, silme geri alma ve çevrimdışı kabuktur. Sunucu yoktur; bütünlük tarayıcıda çözülür.

## Olası sorular

**Veri neden yerelde?**  
Hesap ve arka uç maliyeti olmadan günlük kullanım. Bedeli: cihaz veya tarayıcı verisi silinirse görevler de silinir. Bu sınır açık yazılır.

**Sekmeler çakışırsa?**  
Kayıt kimliği ve tombstone ile birleştirilir. Son yazan körlemesine ezmez.

**Güncelleme neden onaylı?**  
Service worker’ın hemen devralması, düzenleme sırasında kayıp riski taşır.
