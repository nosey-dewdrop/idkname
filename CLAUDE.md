# idkname

İki kişinin tek tahtada birlikte oynadığı düşen blok oyunu. Biri oda açar, öbürü QR okutup ya da 4 harfli kodu yazıp girer.

HEDEF (Damla, 22 Kas 2026): "iki kişi beraber oynuyor, QR okutur odaya dahil olur gibi". Ölçü: `test/e2e.js` iki tarayıcıyla oda açma, katılma, karşılıklı hamle, oyun sonu, tekrar, kopup geri gelme adımlarını geçiyor mu.

- Statik site, build yok. `engine.js` kurallar (saf), `app.js` ekranlar + çizim + bağlantı, `vendor/` peerjs ve qrcode.
- `bot.js` bilgisayar oyuncu (pix): ana ekrandan, bekleme odasından ya da arkadaş düşünce devreye girer. Ölçü: iki bot kaç sıra kapatıyor (`test/engine.test.js`).
- Görünüm kararları (23 Kas 2026, Damla "slop gibi durmasın, premium oyun gibi"): tek font Jersey 15, dört boyut, metin yalnız beyaz/gri, renk bloklarda; logo blok harfler, i'nin noktası yüzlü blok; ses ve efektler `app.js` içinde.
- Oda sahibi motoru koşturur, misafir yalnız hamle yollar; bağlantı PeerJS (WebRTC), sunucumuz yok.
- Çalıştır: `python3 -m http.server <boş port> --bind 0.0.0.0`, telefon için ağ adresinden aç.
- Test: `node test/engine.test.js`, `CHROME=<chromium> NODE_PATH=<playwright-core>/node_modules node test/e2e.js <url> <görüntü klasörü>`.
- Yayında değil. Ad Damla'nın: idkname (22 Kas 2026). "tetris" kelimesi ada girmez, başkasının markası.
