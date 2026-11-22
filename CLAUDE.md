# idkname

İki kişinin tek tahtada birlikte oynadığı düşen blok oyunu. Biri oda açar, öbürü QR okutup ya da 4 harfli kodu yazıp girer.

HEDEF (Damla, 22 Kas 2026): "iki kişi beraber oynuyor, QR okutur odaya dahil olur gibi". Ölçü: `test/e2e.js` iki tarayıcıyla oda açma, katılma, karşılıklı hamle, oyun sonu, tekrar, kopup geri gelme adımlarını geçiyor mu.

- Statik site, build yok. `engine.js` kurallar (saf), `app.js` ekranlar + çizim + bağlantı, `vendor/` peerjs ve qrcode.
- `bot.js` bilgisayar oyuncu (pix): ana ekrandan, bekleme odasından ya da arkadaş düşünce devreye girer. Ölçü: iki bot kaç sıra kapatıyor (`test/engine.test.js`).
- Görünüm kararları (23 Kas 2026, Damla "slop gibi durmasın, premium oyun gibi"): tek font Jersey 15, dört boyut, metin yalnız beyaz/gri, renk bloklarda; logo blok harfler, i'nin noktası yüzlü blok; ses ve efektler `app.js` içinde.
- Birlikte oynama kuralları (23 Kas 2026): iki rengin de bulunduğu sıra ek puan verir; `c` ile sıradaki parçalar takas edilir (parça başına bir kez); dolu odaya aynı bağlantıyla giren seyirci olur, oynayamaz, tepki atar.
- Ortak skor tablosu (23 Kas 2026): `api/scores.js`, Vercel Blob deposu `idkname-scores` (private, fra1), her oyun adı kaydı taşıyan tek küçük dosya. Oyun ekranında solda hep görünür, 20 sn'de bir yenilenir, süren oyun canlı satır olarak sıra atlar. Kaydı oda sahibi yollar; otomatik test tarayıcıları yazmaz. Skorlar istemciden geldiği için hileye açık. Token `.env.local`'da, repoya ve yayına girmez.
- Damla'nın istediği, yapılmadı: aynı anda oynayan başka ikilileri görmek. Canlı oda listesi için ortak bir servis ve yayın gerekir; seyirci bağlantısı hazır yapı taşı.
- Oda sahibi motoru koşturur, misafir yalnız hamle yollar; bağlantı PeerJS (WebRTC), sunucumuz yok.
- Çalıştır: `python3 -m http.server <boş port> --bind 0.0.0.0`, telefon için ağ adresinden aç.
- Test: `node test/engine.test.js`, `CHROME=<chromium> NODE_PATH=<playwright-core>/node_modules node test/e2e.js <url> <görüntü klasörü>`.
- Telefon kontrolü: `test/phone.js` canlı QR'ı piksellerinden çözer, iPhone profiliyle Safari motorunda (playwright webkit) odaya girip dokunmatik oynar. Gerçek cihaz ve mobil veri ağı bununla ölçülmez.
- YAYINDA (23 Kas 2026, Damla "deploy et"): https://idkname.vercel.app , `vercel deploy --prod --yes`. Repo github.com/nosey-dewdrop/idkname (private). `.rabadon/` repoya ve yayına girmez.
- Ad Damla'nın: idkname (22 Kas 2026). "tetris" kelimesi ada girmez, başkasının markası.
