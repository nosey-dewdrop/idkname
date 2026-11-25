// *-*-*-*-*-*-*-*-*-*-*-* guide pages, written from the engine's own numbers *-*-*-*-*-*-*-*-*-*-*-*
// run: node seo/build.js          writes guide/, tr/guide/, sitemap.xml, robots.txt
//      node seo/build.js --check  writes nothing; fails if the files on disk are stale or a page breaks a rule
// every number on these pages is read from engine.js, so a rule change shows up here after one run.

const fs = require('fs');
const path = require('path');
const E = require('../engine.js');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://idkname.vercel.app';
const CHECK = process.argv.indexOf('--check') !== -1;
const LANGS = ['en', 'tr'];

// *-*-*-*-*-*-*-*-*-*-*-* numbers from the engine *-*-*-*-*-*-*-*-*-*-*-*
const src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
function num(name) {
  const m = new RegExp('const ' + name + ' = (\\d+);').exec(src);
  if (!m) { throw new Error('engine.js no longer has ' + name); }
  return Number(m[1]);
}
const LINES_PER_LEVEL = num('LINES_PER_LEVEL');
const TOGETHER_BONUS = num('TOGETHER_BONUS');
const LINE_SCORE = JSON.parse(/const LINE_SCORE = (\[[^\]]+\]);/.exec(src)[1]);
const STEP_MS = Number(/\(s\.level - 1\) \* (\d+)/.exec(src)[1]);
const FLOOR_MS = Number(/Math\.max\((\d+), START_MS/.exec(src)[1]);
const LEVEL_KEYS = ['easy', 'normal', 'hard'];
const KINDS = Object.keys(E.SHAPES);

function fallMs(d, level) { return Math.max(FLOOR_MS, E.START_MS[d] - (level - 1) * STEP_MS); }
function topLevel(d) {
  let l = 1;
  while (fallMs(d, l) > FLOOR_MS) { l++; }
  return l;
}
function turnsOf(kind) {
  const seen = [];
  const out = [];
  let c = E.SHAPES[kind];
  for (let i = 0; i < 4; i++) {
    const key = c.map(function (p) { return p[0] + ',' + p[1]; }).sort().join(' ');
    if (seen.indexOf(key) === -1) {
      seen.push(key);
      out.push(c);
    }
    if (kind === 'box' || kind === 'star') { break; }
    c = E.rotated(c);
  }
  return out;
}
function inBag(kind, d) { return E.BAGS[d].filter(function (k) { return k === kind; }).length; }

// *-*-*-*-*-*-*-*-*-*-*-* words *-*-*-*-*-*-*-*-*-*-*-*
const W = {
  en: {
    guide: 'guide', pieces: 'pieces', levels: 'levels', rules: 'rules', home: 'the game',
    blocks: 'blocks', size: 'size', turns: 'ways to turn', comes: 'comes in', share: 'share of the bag',
    wide: 'wide', tall: 'tall', noTurn: 'does not turn', by: 'by',
    of: function (n, m) { return n + ' of every ' + m + ' pieces'; },
    levelNames: ['easy', 'normal', 'hard'],
    tryHint: 'click the board, then use the arrow keys. space drops.',
    tryRows: 'rows', tryTogether: 'together',
    left: 'left', right: 'right', turn: 'turn', drop: 'drop',
    play: 'play with a friend',
    level: 'level', fall: 'one step down every', ms: 'ms', rowsToLevel: 'rows to reach it',
    allTurns: 'every way it lands', bagTitle: 'what is in the bag', speedTitle: 'how fast it falls',
    tail: 'idkname, a falling block game for two'
  },
  tr: {
    guide: 'rehber', pieces: 'parçalar', levels: 'zorluklar', rules: 'kurallar', home: 'oyun',
    blocks: 'blok', size: 'boy', turns: 'dönüş sayısı', comes: 'hangi zorlukta', share: 'torbadaki payı',
    wide: 'en', tall: 'boy', noTurn: 'dönmez', by: 'x',
    of: function (n, m) { return 'her ' + m + ' parçanın ' + n + ' tanesi'; },
    levelNames: ['kolay', 'normal', 'zor'],
    tryHint: 'tahtaya tıkla, sonra ok tuşlarını kullan. boşluk bırakır.',
    tryRows: 'sıra', tryTogether: 'birlikte',
    left: 'sol', right: 'sağ', turn: 'çevir', drop: 'bırak',
    play: 'arkadaşınla oyna',
    level: 'seviye', fall: 'bir adım aşağı', ms: 'ms', rowsToLevel: 'gereken sıra',
    allTurns: 'yere her inişi', bagTitle: 'torbada ne var', speedTitle: 'ne kadar hızlı düşer',
    tail: 'idkname, iki kişilik düşen blok oyunu'
  }
};

// one true thing about each piece, checked against its shape.
const PIECE_NOTE = {
  bar3: {
    en: ['the short bar', 'three blocks in a line. it only shows up on easy, where it fills a gap three wide lying down or a well three deep standing up.'],
    tr: ['kısa çubuk', 'yan yana üç blok. yalnız kolayda çıkar. yatınca üç blokluk boşluğu, dikilince üç blok derin kuyuyu doldurur.']
  },
  bar4: {
    en: ['the long bar', 'four blocks in a line, the tallest piece in the game. standing up it can close four rows with one drop, which is the biggest single score a piece can make.'],
    tr: ['uzun çubuk', 'yan yana dört blok, oyunun en uzun parçası. dikilince tek bırakışta dört sıra kapatabilir, bir parçanın tek seferde alabileceği en yüksek puan budur.']
  },
  nook: {
    en: ['the nook', 'a corner made of three blocks, the smallest piece that still turns four ways. it only shows up on easy and it is the piece that patches single holes.'],
    tr: ['köşe', 'üç bloktan bir köşe, dört yöne dönebilen en küçük parça. yalnız kolayda çıkar, tek blokluk delikleri yamayan parça budur.']
  },
  box: {
    en: ['the box', 'two by two. it never turns, so the only choice is where it lands. on flat ground it leaves no hole.'],
    tr: ['kutu', 'ikiye iki. hiç dönmez, tek karar nereye ineceğidir. düz zeminde delik bırakmaz.']
  },
  hookA: {
    en: ['the left hook', 'three blocks in a row with one more sitting on the left end. it is the mirror of hookB, and no amount of turning makes one into the other.'],
    tr: ['sol kanca', 'yan yana üç blok, sol ucunda bir blok daha. hookB parçasının aynadaki halidir, ne kadar çevirirsen çevir biri ötekine dönüşmez.']
  },
  hookB: {
    en: ['the right hook', 'three blocks in a row with one more sitting on the right end. it is the mirror of hookA, and no amount of turning makes one into the other.'],
    tr: ['sağ kanca', 'yan yana üç blok, sağ ucunda bir blok daha. hookA parçasının aynadaki halidir, ne kadar çevirirsen çevir biri ötekine dönüşmez.']
  },
  hat: {
    en: ['the hat', 'three blocks in a row with a bump on the middle one. bump down, it plugs a hole one block wide between two flat sides.'],
    tr: ['şapka', 'yan yana üç blok, ortadakinin üstünde bir çıkıntı. çıkıntı aşağı bakınca iki düz kenarın arasındaki tek blokluk deliği kapatır.']
  },
  stepA: {
    en: ['the right step', 'two rows of two, the top row pushed one block to the right. lying flat on flat ground it always leaves a hole under its raised end.'],
    tr: ['sağ basamak', 'ikişer blokluk iki sıra, üstteki bir blok sağa kaymış. düz zemine yatarsa kalkık ucunun altında hep bir delik bırakır.']
  },
  stepB: {
    en: ['the left step', 'two rows of two, the top row pushed one block to the left. lying flat on flat ground it always leaves a hole under its raised end.'],
    tr: ['sol basamak', 'ikişer blokluk iki sıra, üstteki bir blok sola kaymış. düz zemine yatarsa kalkık ucunun altında hep bir delik bırakır.']
  },
  star: {
    en: ['the star', 'five blocks in a plus. it only shows up on hard and it does not turn. only its bottom block touches the ground, so it needs a slot one block wide to sit clean.'],
    tr: ['yıldız', 'artı biçiminde beş blok. yalnız zorda çıkar ve dönmez. yere yalnız alt bloğu değer, temiz oturması için tek blokluk bir yuva gerekir.']
  },
  cup: {
    en: ['the cup', 'five blocks in a u, three wide. it only shows up on hard. the gap between its arms is one block wide, and something has to fill it later.'],
    tr: ['kupa', 'u biçiminde beş blok, üç blok eninde. yalnız zorda çıkar. kollarının arasındaki boşluk tek blokluktur ve sonradan biri onu doldurmak zorunda kalır.']
  }
};

// rule pages. every sentence is something the game does today.
const RULES = [
  {
    slug: 'together-rows', bag: 1,
    en: {
      t: 'rows built together score more', d: 'In idkname a row that holds blocks of both players earns a bonus on top of the row score. How the together bonus works.',
      h: 'rows you build together',
      p: ['two people stack on one board, each in their own colour. when a full row holds blocks of both colours, it is a together row.',
        'a together row adds <b>' + TOGETHER_BONUS + '</b> points on top of the normal row score, times the level you are on. a row made of one colour only scores the normal amount.',
        'the small board on this page counts them. the colours take turns there, so try to close a row with both in it.']
    },
    tr: {
      t: 'birlikte kurulan sıra daha çok puan verir', d: 'idkname oyununda iki oyuncunun bloklarını da taşıyan sıra, sıra puanının üstüne ek puan kazandırır. Birlikte puanı nasıl işler.',
      h: 'birlikte kurduğunuz sıralar',
      p: ['iki kişi tek tahtada, her biri kendi renginde dizer. dolan bir sırada iki rengin de bloğu varsa o sıra birlikte sırasıdır.',
        'birlikte sırası normal sıra puanının üstüne <b>' + TOGETHER_BONUS + '</b> puan ekler, bulunduğunuz seviyeyle çarpılır. tek renkten oluşan sıra yalnız normal puanı alır.',
        'bu sayfadaki küçük tahta onları sayıyor. orada renkler sırayla gelir, içinde iki renk de olan bir sıra kapatmayı dene.']
    }
  },
  {
    slug: 'scoring', bag: 1, table: 'score',
    en: {
      t: 'how scoring works', d: 'The full score table of idkname. Points for one, two, three and four rows, the together bonus, and the points for pushing a piece down.',
      h: 'how the score adds up',
      p: ['closing rows is where the points are. the more rows one piece closes, the more each row is worth, and everything is multiplied by the level.',
        'pushing a piece down one step gives <b>1</b> point. dropping it gives <b>2</b> points for every row it falls. these are not multiplied.',
        'the score belongs to both of you. there is one number for the pair, not one each.']
    },
    tr: {
      t: 'puan nasıl hesaplanır', d: 'idkname oyununun tam puan tablosu. Bir, iki, üç ve dört sıra için puanlar, birlikte puanı ve parçayı aşağı itmenin puanı.',
      h: 'puan nasıl toplanır',
      p: ['puan sıra kapatmaktan gelir. bir parça ne kadar çok sıra kapatırsa her sıra o kadar değerlenir, hepsi seviyeyle çarpılır.',
        'parçayı bir adım aşağı itmek <b>1</b> puan verir. bırakmak, düştüğü her sıra için <b>2</b> puan verir. bunlar çarpılmaz.',
        'puan ikinizindir. her oyuncuya ayrı değil, ikiliye tek sayı vardır.']
    }
  },
  {
    slug: 'speed', bag: 1, table: 'speed',
    en: {
      t: 'how fast the pieces fall at every level', d: 'Fall speed in idkname for every level on easy, normal and hard, in milliseconds per step, read from the game rules.',
      h: 'how the game speeds up',
      p: ['every <b>' + LINES_PER_LEVEL + '</b> rows the pair closes, the level goes up by one. each level makes a piece fall <b>' + STEP_MS + ' ms</b> sooner per step.',
        'it never gets faster than one step every <b>' + FLOOR_MS + ' ms</b>. the three difficulties start at different speeds and all end at that same floor.']
    },
    tr: {
      t: 'her seviyede parçalar ne kadar hızlı düşer', d: 'idkname oyununda kolay, normal ve zor için her seviyenin düşme hızı, adım başına milisaniye olarak, oyunun kurallarından okunmuş.',
      h: 'oyun nasıl hızlanır',
      p: ['ikili her <b>' + LINES_PER_LEVEL + '</b> sıra kapattığında seviye bir artar. her seviye parçanın bir adımını <b>' + STEP_MS + ' ms</b> öne çeker.',
        'hiçbir zaman <b>' + FLOOR_MS + ' ms</b> adımından hızlı olmaz. üç zorluk farklı hızda başlar, hepsi aynı tabana varır.']
    }
  },
  {
    slug: 'swap', bag: 1,
    en: {
      t: 'swap your next piece with your friend', d: 'In idkname you can trade your next piece with your partner by pressing c. When the swap works and how often you can use it.',
      h: 'trading next pieces',
      p: ['each of you sees your own next piece. press <b>c</b>, or the swap button on a phone, and your next piece and your friend\'s next piece change places.',
        'you can do it once for every piece you play. after your piece lands you get the swap back.',
        'it is how you hand your friend the long bar they are waiting for.']
    },
    tr: {
      t: 'sıradaki parçanı arkadaşınla takas et', d: 'idkname oyununda c tuşuyla sıradaki parçanı arkadaşınınkiyle değiştirebilirsin. Takas ne zaman çalışır, kaç kez kullanılır.',
      h: 'sıradaki parçaları takas etmek',
      p: ['her biriniz kendi sıradaki parçasını görür. <b>c</b> tuşuna ya da telefonda takas düğmesine basınca senin sıradaki parçanla arkadaşınınki yer değiştirir.',
        'oynadığın her parça için bir kez yapabilirsin. parçan yere inince takas hakkın geri gelir.',
        'arkadaşının beklediği uzun çubuğu ona böyle verirsin.']
    }
  },
  {
    slug: 'turning', bag: 1,
    en: {
      t: 'how pieces turn and what happens next to a wall', d: 'How rotation works in idkname. Which pieces turn, which do not, and where a piece moves when a wall or a block is in the way.',
      h: 'turning a piece',
      p: ['the up arrow turns your piece a quarter to the right. the box and the star do not turn.',
        'if the turned piece would sit inside a wall or a block, the game tries nearby spots in this order. one step left, one right, one up, two left, two right, one down. the first free spot wins.',
        'if none of them is free the piece stays as it was. your friend\'s falling piece counts as in the way too.']
    },
    tr: {
      t: 'parçalar nasıl döner, duvar dibinde ne olur', d: 'idkname oyununda döndürme nasıl çalışır. Hangi parçalar döner, hangileri dönmez, duvar ya da blok engel olunca parça nereye kayar.',
      h: 'parçayı çevirmek',
      p: ['yukarı ok parçanı sağa çeyrek tur çevirir. kutu ve yıldız dönmez.',
        'dönmüş parça duvarın ya da bir bloğun içine girecekse oyun yakındaki yerleri şu sırayla dener. bir adım sol, bir sağ, bir yukarı, iki sol, iki sağ, bir aşağı. ilk boş yer kazanır.',
        'hiçbiri boş değilse parça olduğu gibi kalır. arkadaşının düşen parçası da engel sayılır.']
    }
  },
  {
    slug: 'controls', bag: 1, table: 'keys',
    en: {
      t: 'keyboard and phone controls', d: 'Every key and touch button in idkname. Move, turn, push down, drop, swap, chat, voice and camera.',
      h: 'keys and buttons',
      p: ['on a phone the same moves are six buttons under the board. a held key or button repeats.']
    },
    tr: {
      t: 'klavye ve telefon kontrolleri', d: 'idkname oyunundaki her tuş ve dokunmatik düğme. Oynat, çevir, aşağı it, bırak, takas, sohbet, ses ve kamera.',
      h: 'tuşlar ve düğmeler',
      p: ['telefonda aynı hamleler tahtanın altındaki altı düğmedir. basılı tutulan tuş ya da düğme tekrar eder.']
    }
  },
  {
    slug: 'rooms', bag: 1,
    en: {
      t: 'play with a friend online with a room code or a QR', d: 'How to open a room in idkname and bring a friend in with a four letter code, a link or a QR code. No account and nothing to install.',
      h: 'opening a room',
      p: ['write your name and press play with a friend. you get a room with a code of four letters, a link and a QR code.',
        'your friend scans the QR with a phone, opens the link, or types the code on the first screen. there is no account and nothing to install.',
        'the two of you can be in different homes, on wifi or on mobile data. if your friend drops, the game waits and they come back to the same seat with the same link.']
    },
    tr: {
      t: 'oda kodu ya da QR ile arkadaşınla çevrimiçi oyna', d: 'idkname oyununda oda nasıl açılır, arkadaş dört harfli kod, bağlantı ya da QR ile nasıl girer. Hesap yok, kurulum yok.',
      h: 'oda açmak',
      p: ['adını yaz ve arkadaşınla oyna düğmesine bas. dört harfli kodu, bağlantısı ve QR kodu olan bir oda açılır.',
        'arkadaşın QR kodunu telefonla okutur, bağlantıyı açar ya da kodu ilk ekrana yazar. hesap yok, kurulacak bir şey yok.',
        'ikiniz ayrı evlerde, wifi ya da mobil veride olabilirsiniz. arkadaşın düşerse oyun bekler, aynı bağlantıyla aynı yerine geri gelir.']
    }
  },
  {
    slug: 'watching', bag: 1,
    en: {
      t: 'watch a game and cheer', d: 'A third person who opens a full idkname room watches the game live and cheers by tapping a face. Up to twelve people can watch.',
      h: 'watching a room',
      p: ['a room seats two. anyone else who opens the same link watches instead, and the players see how many are watching.',
        'a watcher cannot move pieces. they tap one of four faces and the cheer floats up on every screen in the room.',
        'up to <b>12</b> people can watch one room.']
    },
    tr: {
      t: 'oyunu izle ve tezahürat yap', d: 'Dolu bir idkname odasını açan üçüncü kişi oyunu canlı izler ve bir yüze dokunarak tezahürat yapar. On iki kişiye kadar izlenebilir.',
      h: 'bir odayı izlemek',
      p: ['odada iki kişilik yer var. aynı bağlantıyı açan başka herkes izleyici olur, oyuncular kaç kişinin izlediğini görür.',
        'izleyici parça oynatamaz. dört yüzden birine dokunur, tezahürat odadaki her ekranda yukarı süzülür.',
        'bir odayı en çok <b>12</b> kişi izleyebilir.']
    }
  },
  {
    slug: 'chat', bag: 1,
    en: {
      t: 'chat while you play', d: 'Text chat in idkname. Press enter, type, and your line shows as a bubble next to your falling piece on both boards.',
      h: 'writing to each other',
      p: ['press <b>enter</b>, write, press enter again. your line appears as a bubble next to your falling piece on both boards and stays for four seconds.',
        'on a computer the last four lines also stay beside the board. while you type, your piece does not move by mistake.',
        'a line can be up to 60 characters. chat is between the two players, watchers see the bubbles and cannot write.']
    },
    tr: {
      t: 'oynarken yazış', d: 'idkname oyununda yazılı sohbet. Enter tuşuna bas, yaz, cümlen iki tahtada da düşen parçanın yanında balon olarak çıkar.',
      h: 'birbirinize yazmak',
      p: ['<b>enter</b> tuşuna bas, yaz, yine enter. cümlen iki tahtada da düşen parçanın yanında balon olur ve dört saniye kalır.',
        'bilgisayarda son dört satır tahtanın yanında da durur. yazarken parçan yanlışlıkla oynamaz.',
        'bir satır en çok 60 karakter olabilir. sohbet iki oyuncu arasındadır, izleyiciler balonları görür ama yazamaz.']
    }
  },
  {
    slug: 'someone', bag: 1,
    en: {
      t: 'play with someone when you come alone', d: 'No friend online? In idkname one button puts you on a board with whoever comes next. Until then the bot keeps you company.',
      h: 'playing with someone you do not know',
      p: ['press play with someone on the first screen. if another player is waiting, you land on their board and take the second colour.',
        'if nobody is waiting, your game starts with the bot at once and your seat stays open. the next person who presses the button takes the bot\'s place in the middle of the game.',
        'if that person leaves, the bot sits back down and the seat opens again. chat works from the first second. a voice or a face only comes through once you have turned your own mic or camera on.']
    },
    tr: {
      t: 'yalnız geldiysen biriyle oyna', d: 'Çevrimiçi arkadaşın yok mu? idkname oyununda tek düğme seni sıradaki kişiyle aynı tahtaya koyar. O gelene kadar bot seninle oynar.',
      h: 'tanımadığın biriyle oynamak',
      p: ['ilk ekranda biriyle oyna düğmesine bas. bekleyen bir oyuncu varsa onun tahtasına düşer, ikinci rengi alırsın.',
        'bekleyen yoksa oyunun botla hemen başlar ve yerin açık kalır. düğmeye basan sıradaki kişi oyunun ortasında botun yerine oturur.',
        'o kişi çıkarsa bot geri oturur ve yer yeniden açılır. sohbet ilk saniyeden çalışır. ses ya da yüz, sen kendi mikrofonunu ya da kameranı açmadan gelmez.']
    }
  },
  {
    slug: 'voice', bag: 1,
    en: {
      t: 'talk with your friend while you play', d: 'Voice chat in idkname. One button or the m key turns your microphone on and your friend hears you inside the game, no other app needed.',
      h: 'talking',
      p: ['press the mic button next to the chat box, or <b>m</b>. the browser asks for the microphone once. your friend hears you without pressing anything.',
        'the button turns yellow while your mic is on, and your friend sees that you are on voice. press again to turn it off.',
        'the sound goes straight from one browser to the other. on a network that blocks that, the game says the voice could not connect and everything else keeps working. headphones keep the game sounds out of your mic.']
    },
    tr: {
      t: 'oynarken arkadaşınla konuş', d: 'idkname oyununda sesli konuşma. Tek düğme ya da m tuşu mikrofonunu açar, arkadaşın seni oyunun içinde duyar, başka uygulama gerekmez.',
      h: 'konuşmak',
      p: ['sohbet kutusunun yanındaki mikrofon düğmesine ya da <b>m</b> tuşuna bas. tarayıcı bir kez mikrofon izni sorar. arkadaşın hiçbir şeye basmadan seni duyar.',
        'mikrofonun açıkken düğme sarı olur, arkadaşın senin sesli konuştuğunu görür. kapatmak için yine bas.',
        'ses bir tarayıcıdan ötekine doğrudan gider. buna izin vermeyen ağda oyun sesin bağlanamadığını söyler, geri kalan her şey çalışmaya devam eder. kulaklık oyun seslerini mikrofonundan uzak tutar.']
    }
  },
  {
    slug: 'camera', bag: 1,
    en: {
      t: 'see your friend\'s face while you play', d: 'Camera in idkname. Turn it on with one button or the v key and your face shows in your player card on both screens.',
      h: 'seeing each other',
      p: ['press the cam button, or <b>v</b>. your face shows in your own card, next to your next piece, on your screen and on your friend\'s.',
        'each of you decides on your own. one camera can be on while the other stays off. press again and the face is gone from both screens.',
        'your own picture is mirrored, like a mirror. watchers do not see the cameras.']
    },
    tr: {
      t: 'oynarken arkadaşının yüzünü gör', d: 'idkname oyununda kamera. Tek düğme ya da v tuşuyla açılır, yüzün iki ekranda da kendi oyuncu kartında görünür.',
      h: 'birbirinizi görmek',
      p: ['kamera düğmesine ya da <b>v</b> tuşuna bas. yüzün kendi kartında, sıradaki parçanın yanında, hem senin hem arkadaşının ekranında görünür.',
        'herkes kendi kararını verir. biri kamerasını açarken öteki kapalı kalabilir. yine basınca yüz iki ekrandan da kalkar.',
        'kendi görüntün ayna gibi ters durur. izleyiciler kameraları görmez.']
    }
  },
  {
    slug: 'away', bag: 1,
    en: {
      t: 'what happens when your friend is away from the keyboard', d: 'In idkname a player who touches nothing for twenty seconds is away. The game pauses on both screens and goes on when they are back.',
      h: 'when someone stops playing',
      p: ['a player who touches no key and no part of the screen for <b>20</b> seconds counts as away. writing in the chat counts as being here.',
        'the game does not end. it stops on both screens, says who is away, and that player\'s piece closes its eyes. one touch and it goes on.',
        'if the one who is away is the guest, the host can go on with the computer. when the guest comes back they get their seat back.']
    },
    tr: {
      t: 'arkadaşın klavyeden uzaklaşınca ne olur', d: 'idkname oyununda yirmi saniye hiçbir şeye dokunmayan oyuncu uzakta sayılır. Oyun iki ekranda da durur, döndüğünde devam eder.',
      h: 'biri oynamayı bırakınca',
      p: ['<b>20</b> saniye hiçbir tuşa ve ekrana dokunmayan oyuncu uzakta sayılır. sohbete yazmak burada olmak sayılır.',
        'oyun bitmez. iki ekranda da durur, kimin uzakta olduğunu yazar ve o oyuncunun parçası gözlerini kapatır. tek dokunuşla devam eder.',
        'uzakta olan misafirse oda sahibi bilgisayarla devam edebilir. misafir dönünce yerini geri alır.']
    }
  },
  {
    slug: 'computer', bag: 1,
    en: {
      t: 'play with the computer', d: 'idkname has a computer partner, the bot. Three skill levels, three speeds, and it takes the empty seat when a friend leaves.',
      h: 'the bot, your computer partner',
      p: ['press play with the computer and the bot takes the second colour on your board. it waits until you have placed your first piece.',
        'the bot has three levels, easy, normal and sharp. the level sets how well it picks a spot. it also has three speeds, calm, normal and fast, which set how quickly it moves.',
        'the bot can also step in from the waiting room, or take the seat when your friend drops out. there is no chat, voice or camera with the bot.']
    },
    tr: {
      t: 'bilgisayarla oyna', d: 'idkname oyununda bot adında bir bilgisayar oyuncu var. Üç beceri seviyesi, üç hız, arkadaş çıkınca boş yeri alır.',
      h: 'bot, bilgisayar oyuncu',
      p: ['bilgisayarla oyna düğmesine basınca bot tahtandaki ikinci rengi alır. sen ilk parçanı koyana kadar bekler.',
        'bot\'un üç seviyesi var, kolay, normal ve usta. seviye yerini ne kadar iyi seçtiğini belirler. üç hızı da var, sakin, normal ve hızlı, bunlar ne kadar çabuk oynadığını belirler.',
        'bot bekleme odasından da girebilir, arkadaşın düşünce yerini de alabilir. bot ile sohbet, ses ve kamera yoktur.']
    }
  },
  {
    slug: 'scores', bag: 1,
    en: {
      t: 'the shared score table and live games', d: 'idkname keeps one score table for everyone. Games being played right now climb through it live, marked with a blinking block.',
      h: 'the score table',
      p: ['there is one table for everybody who plays. every finished game is one line with the two names and the score.',
        'while you play, your own game is a line in that table and climbs as you score. games other people are playing right now are there too, each with a small blinking block.',
        'a pair is listed together. the table does not split the difficulties.']
    },
    tr: {
      t: 'ortak skor tablosu ve canlı oyunlar', d: 'idkname herkes için tek skor tablosu tutar. O an oynanan oyunlar tabloda canlı tırmanır, yanıp sönen bir blokla işaretlidir.',
      h: 'skor tablosu',
      p: ['oynayan herkes için tek tablo var. biten her oyun iki ad ve puanla tek satırdır.',
        'oynarken kendi oyunun o tabloda bir satırdır ve puan aldıkça tırmanır. başkalarının o an oynadığı oyunlar da oradadır, her birinin başında yanıp sönen küçük bir blok vardır.',
        'ikili birlikte yazılır. tablo zorlukları ayırmaz.']
    }
  },
  {
    slug: 'phone', bag: 1,
    en: {
      t: 'play on a phone', d: 'idkname runs in the phone browser. Join a room by scanning the QR and play with six touch buttons under the board.',
      h: 'on a phone',
      p: ['the game runs in the phone browser, nothing to install. the easy way in is to scan the QR on your friend\'s screen.',
        'under the board there are six buttons. left, right, turn, down, swap and a wide drop. the chat box sits between the board and the buttons.',
        'one of you can be on a phone and the other on a computer, it is the same board.']
    },
    tr: {
      t: 'telefonda oyna', d: 'idkname telefon tarayıcısında çalışır. QR okutarak odaya gir, tahtanın altındaki altı dokunmatik düğmeyle oyna.',
      h: 'telefonda',
      p: ['oyun telefon tarayıcısında çalışır, kurulacak bir şey yok. en kolay giriş arkadaşının ekranındaki QR kodunu okutmaktır.',
        'tahtanın altında altı düğme var. sol, sağ, çevir, aşağı, takas ve geniş bir bırak. sohbet kutusu tahta ile düğmelerin arasındadır.',
        'biriniz telefonda öbürünüz bilgisayarda olabilir, tahta aynıdır.']
    }
  },
  {
    slug: 'colours', bag: 1,
    en: {
      t: 'three colour sets', d: 'idkname has three colour sets, candy, meadow and arcade. Each player picks their own and it changes the whole screen.',
      h: 'colours',
      p: ['there are three colour sets. candy is pink and mint on a dark sky, meadow is coral and teal on a light one, arcade is yellow and blue on deep navy.',
        'the three small squares at the top of every page switch between them, this page included. each player picks their own, your friend can see a different set on the same board.']
    },
    tr: {
      t: 'üç renk takımı', d: 'idkname oyununda üç renk takımı var, candy, meadow ve arcade. Her oyuncu kendininkini seçer, bütün ekran değişir.',
      h: 'renkler',
      p: ['üç renk takımı var. candy koyu gökte pembe ve nane, meadow açık zeminde mercan ve turkuaz, arcade koyu lacivertte sarı ve mavi.',
        'her sayfanın üstündeki üç küçük kare aralarında geçiş yapar, bu sayfa da dahil. her oyuncu kendininkini seçer, arkadaşın aynı tahtayı başka renklerle görebilir.']
    }
  }
];

const LEVEL_TEXT = [
  {
    en: { t: 'easy mode, three block pieces and a slow fall', d: 'Easy difficulty in idkname. Which pieces are in the bag, how fast they fall at every level, and why the small pieces make it forgiving.',
      p: ['easy adds two small pieces to the seven classic ones, the short bar and the nook. they fit almost anywhere, so a bad spot is easier to repair.'] },
    tr: { t: 'kolay, üç bloklu parçalar ve yavaş düşüş', d: 'idkname oyununda kolay zorluk. Torbada hangi parçalar var, her seviyede ne kadar hızlı düşerler, küçük parçalar oyunu neden bağışlayıcı yapar.',
      p: ['kolay, yedi klasik parçaya iki küçük parça ekler, kısa çubuk ve köşe. neredeyse her yere sığarlar, kötü bir yeri onarmak kolaylaşır.'] }
  },
  {
    en: { t: 'normal mode, the seven four block pieces', d: 'Normal difficulty in idkname. The seven classic four block pieces, one of each in every bag, and the fall speed at every level.',
      p: ['normal is the seven four block pieces and nothing else. each bag holds one of each, so you never wait more than twelve pieces for the long bar.'] },
    tr: { t: 'normal, dört bloklu yedi parça', d: 'idkname oyununda normal zorluk. Dört bloklu yedi klasik parça, her torbada birer tane, ve her seviyedeki düşme hızı.',
      p: ['normal, dört bloklu yedi parçadan ibarettir. her torbada her birinden bir tane vardır, uzun çubuğu on iki parçadan fazla beklemezsin.'] }
  },
  {
    en: { t: 'hard mode, five block pieces and a fast fall', d: 'Hard difficulty in idkname. The star and the cup join the bag, pieces start falling faster, and the speed at every level.',
      p: ['hard adds two five block pieces, the star and the cup. neither sits flat, so the two of you have to leave room for them on purpose.'] },
    tr: { t: 'zor, beş bloklu parçalar ve hızlı düşüş', d: 'idkname oyununda zor zorluk. Yıldız ve kupa torbaya girer, parçalar daha hızlı düşmeye başlar, her seviyedeki hız.',
      p: ['zor, beş bloklu iki parça ekler, yıldız ve kupa. ikisi de düz oturmaz, ikinizin onlara bilerek yer bırakması gerekir.'] }
  }
];

const COMMON_LEVEL = {
  en: 'the host picks the difficulty and can change it in the middle of a game. the fall speed changes at once, the pieces change from the next bag. the score is counted the same way on all three.',
  tr: 'zorluğu oda sahibi seçer ve oyun sürerken de değiştirebilir. düşme hızı hemen değişir, parçalar sıradaki torbadan itibaren değişir. puan üçünde de aynı sayılır.'
};

const HUB = {
  en: { t: 'how to play, every piece and every rule', d: 'The whole guide to idkname. Every piece, the three difficulties, scoring, rooms, chat, voice, camera and the computer partner.',
    h: 'how idkname works',
    p: ['two people, one board, one score. each of you has a colour and your pieces fall at the same time into the same stack.',
      'everything the game does is written down here, one page each. the numbers come from the rules the game runs on.'] },
  tr: { t: 'nasıl oynanır, her parça ve her kural', d: 'idkname rehberinin tamamı. Her parça, üç zorluk, puanlama, odalar, sohbet, ses, kamera ve bilgisayar oyuncu.',
    h: 'idkname nasıl çalışır',
    p: ['iki kişi, tek tahta, tek puan. her birinizin bir rengi var, parçalarınız aynı anda aynı yığına düşer.',
      'oyunun yaptığı her şey burada yazıyor, her biri ayrı sayfada. sayılar oyunun koştuğu kurallardan gelir.'] }
};

// *-*-*-*-*-*-*-*-*-*-*-* drawing a piece as svg, so it shows without script and follows the palette *-*-*-*-*-*-*-*-*-*-*-*
function shapeSvg(cells, u, owner, label) {
  const s = E.size(cells);
  const k = owner === 2 ? 'b' : 'a';
  const e = Math.max(2, Math.round(u / 8));
  let out = '<svg class="shape" width="' + s.w * u + '" height="' + s.h * u + '" viewBox="0 0 ' + s.w * u + ' ' + s.h * u + '" role="img" aria-label="' + label + '">';
  cells.forEach(function (c, i) {
    const x = c[0] * u;
    const y = c[1] * u;
    out += '<rect class="' + k + 'd" x="' + x + '" y="' + y + '" width="' + u + '" height="' + u + '"/>';
    out += '<rect class="' + k + 'l" x="' + x + '" y="' + y + '" width="' + (u - e) + '" height="' + (u - e) + '"/>';
    out += '<rect class="' + k + '" x="' + (x + e) + '" y="' + (y + e) + '" width="' + (u - 2 * e) + '" height="' + (u - 2 * e) + '"/>';
    if (i === 1 && u >= 20) {
      const g = Math.max(2, Math.round(u / 10));
      const cx = x + Math.round(u / 2);
      out += '<rect class="f" x="' + (cx - 2 * g) + '" y="' + (y + Math.round(u * 0.36)) + '" width="' + g + '" height="' + (g + 1) + '"/>';
      out += '<rect class="f" x="' + (cx + g) + '" y="' + (y + Math.round(u * 0.36)) + '" width="' + g + '" height="' + (g + 1) + '"/>';
      out += '<rect class="f" x="' + (cx - g) + '" y="' + (y + Math.round(u * 0.66)) + '" width="' + 2 * g + '" height="' + Math.max(1, Math.floor(g / 2)) + '"/>';
    }
  });
  return out + '</svg>';
}

// *-*-*-*-*-*-*-*-*-*-*-* pages *-*-*-*-*-*-*-*-*-*-*-*
function base(lang) { return lang === 'en' ? '/guide/' : '/tr/guide/'; }
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

function shelf(lang, here) {
  const w = W[lang];
  const b = base(lang);
  const cur = function (p) { return p === here ? ' aria-current="page"' : ''; };
  let h = '<nav class="g-shelf" aria-label="' + w.guide + '">';
  h += '<div><h2>' + w.pieces + '</h2><ul class="pieces">';
  KINDS.forEach(function (k, i) {
    const p = 'pieces/' + k.toLowerCase() + '/';
    h += '<li><a href="' + b + p + '"' + cur(p) + '>' + shapeSvg(E.SHAPES[k], 16, i % 2 ? 2 : 1, k) + '<span>' + k + '</span></a></li>';
  });
  h += '</ul></div><div><h2>' + w.levels + '</h2><ul class="links">';
  LEVEL_KEYS.forEach(function (k, d) {
    const p = 'levels/' + k + '/';
    h += '<li><a href="' + b + p + '"' + cur(p) + '>' + w.levelNames[d] + '</a></li>';
  });
  h += '</ul><h2>' + w.rules + '</h2><ul class="links">';
  RULES.forEach(function (r) {
    const p = 'rules/' + r.slug + '/';
    h += '<li><a href="' + b + p + '"' + cur(p) + '>' + r[lang].h + '</a></li>';
  });
  h += '<li><a href="' + b + '"' + cur('') + '>' + HUB[lang].h + '</a></li>';
  h += '</ul></div></nav>';
  return h;
}

function tryBox(lang, kinds, ms) {
  const w = W[lang];
  return '<aside class="g-try">' +
    '<canvas id="try" tabindex="0" data-bag="' + kinds.join(',') + '" data-ms="' + ms + '" aria-label="' + w.tryHint + '"></canvas>' +
    '<p class="trycount"><span><b id="try-rows">0</b> ' + w.tryRows + '</span><span><b id="try-together">0</b> ' + w.tryTogether + '</span></p>' +
    '<div class="trypad"><button data-try="L">' + w.left + '</button><button data-try="R">' + w.right + '</button><button data-try="rot">' + w.turn + '</button><button data-try="drop">' + w.drop + '</button></div>' +
    '<p class="hint">' + w.tryHint + '</p>' +
    '<a class="go" href="/">' + w.play + '</a>' +
    '</aside>';
}

function page(lang, rel, title, desc, body, kinds, ms, crumbs) {
  const w = W[lang];
  const url = SITE + base(lang) + rel;
  const other = lang === 'en' ? 'tr' : 'en';
  const full = title + ' | ' + w.tail;
  const ld = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: crumbs.map(function (c, i) { return { '@type': 'ListItem', position: i + 1, name: c[0], item: SITE + c[1] }; })
  };
  return '<!doctype html>\n<html lang="' + lang + '" data-palette="candy">\n<head>\n' +
    '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
    '<title>' + esc(full) + '</title>\n' +
    '<meta name="description" content="' + esc(desc) + '">\n' +
    '<link rel="canonical" href="' + url + '">\n' +
    '<link rel="alternate" hreflang="en" href="' + SITE + base('en') + rel + '">\n' +
    '<link rel="alternate" hreflang="tr" href="' + SITE + base('tr') + rel + '">\n' +
    '<link rel="alternate" hreflang="x-default" href="' + SITE + base('en') + rel + '">\n' +
    '<meta property="og:type" content="article">\n<meta property="og:site_name" content="idkname">\n' +
    '<meta property="og:title" content="' + esc(title) + '">\n<meta property="og:description" content="' + esc(desc) + '">\n' +
    '<meta property="og:url" content="' + url + '">\n<meta property="og:image" content="' + SITE + '/og.png">\n' +
    '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n' +
    '<meta name="twitter:card" content="summary_large_image">\n' +
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml">\n' +
    '<link rel="preload" href="/vendor/jersey-15-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>\n' +
    '<link rel="stylesheet" href="/style.css">\n<link rel="stylesheet" href="/guide.css">\n' +
    '<script type="application/ld+json">' + JSON.stringify(ld) + '</script>\n' +
    '</head>\n<body class="guide">\n\n<canvas id="sky" aria-hidden="true"></canvas>\n\n' +
    '<header class="bar">\n  <a class="logo" href="/" aria-label="idkname"><canvas id="logo-small"></canvas></a>\n  <div class="bar-tools">\n' +
    '    <div class="swatches" role="group" aria-label="palette">\n' +
    '      <button class="swatch" data-set-palette="candy" aria-label="candy"></button>\n' +
    '      <button class="swatch" data-set-palette="meadow" aria-label="meadow"></button>\n' +
    '      <button class="swatch" data-set-palette="arcade" aria-label="arcade"></button>\n    </div>\n' +
    '    <a class="tool" href="' + base(other) + rel + '" hreflang="' + other + '">' + other.toUpperCase() + '</a>\n  </div>\n</header>\n\n' +
    '<main>\n<article class="g-text">\n' + body + '\n</article>\n' + tryBox(lang, kinds, ms) + '\n' + shelf(lang, rel) + '\n</main>\n\n' +
    '<script src="/engine.js"></script>\n<script src="/guide.js"></script>\n</body>\n</html>\n';
}

function paras(list) { return list.map(function (p) { return '<p>' + p + '</p>'; }).join('\n'); }

function speedTable(lang, only) {
  const w = W[lang];
  const ds = only === undefined ? [0, 1, 2] : [only];
  const top = Math.max.apply(null, ds.map(topLevel));
  let h = '<div class="scroll"><table class="sheet"><thead><tr><th>' + w.level + '</th>';
  ds.forEach(function (d) { h += '<th>' + (only === undefined ? w.levelNames[d] : w.fall) + '</th>'; });
  h += '<th>' + w.rowsToLevel + '</th></tr></thead><tbody>';
  for (let l = 1; l <= top; l++) {
    h += '<tr><td>' + l + '</td>';
    ds.forEach(function (d) { h += '<td>' + fallMs(d, l) + ' ' + w.ms + '</td>'; });
    h += '<td>' + (l - 1) * LINES_PER_LEVEL + '</td></tr>';
  }
  return h + '</tbody></table></div>';
}

function scoreTable(lang) {
  const en = lang === 'en';
  let h = '<div class="scroll"><table class="sheet"><thead><tr><th>' + (en ? 'rows closed by one piece' : 'bir parçanın kapattığı sıra') + '</th><th>' + (en ? 'points at level 1' : '1. seviyede puan') + '</th><th>' + (en ? 'at level 5' : '5. seviyede') + '</th></tr></thead><tbody>';
  for (let n = 1; n <= 4; n++) {
    h += '<tr><td>' + n + '</td><td>' + LINE_SCORE[n] + '</td><td>' + LINE_SCORE[n] * 5 + '</td></tr>';
  }
  h += '<tr><td>' + (en ? 'each together row, extra' : 'her birlikte sırası, ek') + '</td><td>' + TOGETHER_BONUS + '</td><td>' + TOGETHER_BONUS * 5 + '</td></tr>';
  return h + '</tbody></table></div>';
}

function keysTable(lang) {
  const en = lang === 'en';
  const rows = [
    [['left', 'right'], en ? 'move. a and d work too' : 'oynat. a ve d de olur'],
    [['up'], en ? 'turn. w and x work too' : 'çevir. w ve x de olur'],
    [['down'], en ? 'one step down, 1 point. s works too' : 'bir adım aşağı, 1 puan. s de olur'],
    [['space'], en ? 'drop to the bottom, 2 points a row' : 'en alta bırak, sıra başına 2 puan'],
    [['c'], en ? 'swap next pieces with your friend' : 'sıradaki parçaları arkadaşınla takas et'],
    [['enter'], en ? 'write in the chat' : 'sohbete yaz'],
    [['m'], en ? 'microphone on and off' : 'mikrofonu aç ve kapat'],
    [['v'], en ? 'camera on and off' : 'kamerayı aç ve kapat']
  ];
  return '<dl class="keys">' + rows.map(function (r) {
    return '<dt>' + r[0].map(function (k) { return '<kbd>' + k + '</kbd>'; }).join('') + '</dt><dd>' + r[1] + '</dd>';
  }).join('') + '</dl>';
}

const out = {};
const urls = [];

LANGS.forEach(function (lang) {
  const w = W[lang];
  const b = base(lang);
  const hubCrumb = [w.guide, b];

  // hub
  const hub = HUB[lang];
  out[b + 'index.html'] = page(lang, '', hub.t, hub.d,
    '<h1>' + hub.h + '</h1>\n' + paras(hub.p) + '\n<h2>' + W[lang].speedTitle + '</h2>\n' + speedTable(lang),
    E.BAGS[1], E.START_MS[1], [hubCrumb]);
  urls.push([lang, '']);

  // pieces
  KINDS.forEach(function (kind) {
    const note = PIECE_NOTE[kind][lang];
    const cells = E.SHAPES[kind];
    const s = E.size(cells);
    const turns = turnsOf(kind);
    const levels = [0, 1, 2].filter(function (d) { return inBag(kind, d) > 0; });
    const rel = 'pieces/' + kind.toLowerCase() + '/';
    const title = lang === 'en'
      ? kind + ', ' + note[0] + ', a ' + cells.length + ' block piece'
      : kind + ', ' + note[0] + ', ' + cells.length + ' bloklu parça';
    const desc = (lang === 'en'
      ? 'The ' + kind + ' piece in idkname. ' + cells.length + ' blocks, ' + s.w + ' wide and ' + s.h + ' tall, ' + (turns.length === 1 ? 'does not turn' : turns.length + ' ways to turn') + '. Comes in ' + levels.map(function (d) { return w.levelNames[d]; }).join(', ') + '. Try it on the page.'
      : 'idkname oyununda ' + kind + ' parçası. ' + cells.length + ' blok, eni ' + s.w + ' boyu ' + s.h + ', ' + (turns.length === 1 ? 'dönmez' : turns.length + ' yöne döner') + '. ' + levels.map(function (d) { return w.levelNames[d]; }).join(', ') + ' zorluğunda çıkar. Sayfada dene.');
    let body = '<h1>' + kind + ', ' + note[0] + '</h1>\n<div class="g-two"><div><p>' + note[1] + '</p>\n';
    body += '<dl class="facts">';
    body += '<dt>' + w.blocks + '</dt><dd>' + cells.length + '</dd>';
    body += '<dt>' + w.size + '</dt><dd>' + s.w + ' ' + w.by + ' ' + s.h + '</dd>';
    body += '<dt>' + w.turns + '</dt><dd>' + (turns.length === 1 ? w.noTurn : turns.length) + '</dd>';
    body += '<dt>' + w.comes + '</dt><dd>' + levels.map(function (d) { return '<a href="' + b + 'levels/' + LEVEL_KEYS[d] + '/">' + w.levelNames[d] + '</a>'; }).join(', ') + '</dd>';
    levels.forEach(function (d) {
      body += '<dt>' + w.share + ', ' + w.levelNames[d] + '</dt><dd>' + w.of(inBag(kind, d), E.BAGS[d].length) + '</dd>';
    });
    body += '</dl></div>\n<div><h2>' + w.allTurns + '</h2>\n<ul class="turns">' + turns.map(function (c, i) { return '<li>' + shapeSvg(c, 24, 1, kind + ' ' + (i + 1)) + '</li>'; }).join('') + '</ul></div></div>';
    out[b + rel + 'index.html'] = page(lang, rel, title, desc, body, [kind], E.START_MS[1], [hubCrumb, [w.pieces, b], [kind, b + rel]]);
    urls.push([lang, rel]);
  });

  // levels
  LEVEL_KEYS.forEach(function (key, d) {
    const tx = LEVEL_TEXT[d][lang];
    const rel = 'levels/' + key + '/';
    const uniq = E.BAGS[d].filter(function (k, i, a) { return a.indexOf(k) === i; });
    let body = '<h1>' + w.levelNames[d] + '</h1>\n' + paras(tx.p) + '\n<p>' + COMMON_LEVEL[lang] + '</p>\n';
    body += '<h2>' + w.bagTitle + '</h2>\n<ul class="pieces">' + uniq.map(function (k, i) {
      return '<li><a href="' + b + 'pieces/' + k.toLowerCase() + '/">' + shapeSvg(E.SHAPES[k], 16, i % 2 ? 2 : 1, k) + '<span>' + k + (inBag(k, d) > 1 ? ' x' + inBag(k, d) : '') + '</span></a></li>';
    }).join('') + '</ul>\n';
    body += '<h2>' + w.speedTitle + '</h2>\n' + speedTable(lang, d);
    out[b + rel + 'index.html'] = page(lang, rel, tx.t, tx.d, body, E.BAGS[d], E.START_MS[d], [hubCrumb, [w.levels, b], [w.levelNames[d], b + rel]]);
    urls.push([lang, rel]);
  });

  // rules
  RULES.forEach(function (r) {
    const tx = r[lang];
    const rel = 'rules/' + r.slug + '/';
    let body = '<h1>' + tx.h + '</h1>\n';
    if (r.table === 'keys') { body += keysTable(lang) + '\n'; }
    body += paras(tx.p);
    if (r.table === 'score') { body += '\n' + scoreTable(lang); }
    if (r.table === 'speed') { body += '\n' + speedTable(lang); }
    out[b + rel + 'index.html'] = page(lang, rel, tx.t, tx.d, body, E.BAGS[r.bag], E.START_MS[r.bag], [hubCrumb, [w.rules, b], [tx.h, b + rel]]);
    urls.push([lang, rel]);
  });
});

// *-*-*-*-*-*-*-*-*-*-*-* sitemap and robots *-*-*-*-*-*-*-*-*-*-*-*
let sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';
sm += '  <url><loc>' + SITE + '/</loc></url>\n';
urls.forEach(function (u) {
  sm += '  <url><loc>' + SITE + base(u[0]) + u[1] + '</loc>' +
    '<xhtml:link rel="alternate" hreflang="en" href="' + SITE + base('en') + u[1] + '"/>' +
    '<xhtml:link rel="alternate" hreflang="tr" href="' + SITE + base('tr') + u[1] + '"/></url>\n';
});
sm += '</urlset>\n';
out['/sitemap.xml'] = sm;
out['/robots.txt'] = 'User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ' + SITE + '/sitemap.xml\n';

// *-*-*-*-*-*-*-*-*-*-*-* rules every page must keep *-*-*-*-*-*-*-*-*-*-*-*
const problems = [];
const titles = {};
const descs = {};
Object.keys(out).forEach(function (f) {
  if (!/\.html$/.test(f)) { return; }
  const h = out[f];
  const title = /<title>([^<]*)<\/title>/.exec(h)[1];
  const desc = /<meta name="description" content="([^"]*)"/.exec(h)[1];
  if (titles[title]) { problems.push('same title: ' + f + ' and ' + titles[title]); }
  if (descs[desc]) { problems.push('same description: ' + f + ' and ' + descs[desc]); }
  titles[title] = f;
  descs[desc] = f;
  if (desc.length < 70 || desc.length > 170) { problems.push('description length ' + desc.length + ': ' + f); }
  if (title.length > 95) { problems.push('title length ' + title.length + ': ' + f); }
  // what the reader sees: no colon, long dash, middle dot or bullet.
  const seen = h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<head>[\s\S]*?<\/head>/, title + ' ' + desc).replace(/<[^>]+>/g, ' ');
  const bad = /[:—–·•]/.exec(seen);
  if (bad) { problems.push('banned mark "' + bad[0] + '" in ' + f + ' near: ' + seen.slice(Math.max(0, bad.index - 30), bad.index + 10).replace(/\s+/g, ' ')); }
  // every internal link lands on a page that exists.
  const re = /href="(\/[^"#]*)"/g;
  let m;
  while ((m = re.exec(h))) {
    const t = m[1];
    if (/\.(css|js|svg|png|woff2)$/.test(t)) {
      if (!out[t] && !fs.existsSync(path.join(ROOT, t))) { problems.push('missing file ' + t + ' linked from ' + f); }
    } else if (t !== '/' && !out[t + 'index.html']) {
      problems.push('dead link ' + t + ' in ' + f);
    }
  }
});
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

// *-*-*-*-*-*-*-*-*-*-*-* write, or compare with what is on disk *-*-*-*-*-*-*-*-*-*-*-*
let stale = 0;
Object.keys(out).forEach(function (f) {
  const file = path.join(ROOT, f);
  if (CHECK) {
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== out[f]) {
      stale++;
      console.error('stale: ' + f);
    }
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, out[f]);
});
if (stale) { process.exit(1); }
console.log((CHECK ? 'checked ' : 'wrote ') + urls.length + ' guide pages (' + urls.length / 2 + ' per language), sitemap with ' + (urls.length + 1) + ' addresses');
