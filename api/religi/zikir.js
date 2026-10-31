import express from 'express';

const router = express.Router();

// Database Zikir
const ZIKIR_DATABASE = {
  'pagi': {
    nama: 'Zikir Pagi',
    waktu: 'Setelah Sholat Subuh sampai terbit matahari',
    daftar: [
      {
        arab: 'اَللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ',
        latin: 'Allahumma bika ashbana wa bika amsaina wa bika nahya wa bika namutu wa ilaikan nusyur',
        arti: 'Ya Allah, dengan-Mu kami berpagi hari, dengan-Mu kami bersore hari, dengan-Mu kami hidup, dengan-Mu kami mati, dan kepada-Mu kami kembali.',
        jumlah: '1x'
      },
      {
        arab: 'اَللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا طَيِّبًا وَعَمَلًا مُتَقَبَّلًا',
        latin: "Allahumma inni as-aluka 'ilman nafi'an wa rizqan thayyiban wa 'amalan mutaqabbalan",
        arti: 'Ya Allah, aku memohon kepada-Mu ilmu yang bermanfaat, rezeki yang baik, dan amal yang diterima.',
        jumlah: '1x'
      },
      {
        arab: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ عَدَدَ خَلْقِهِ وَرِضَا نَفْسِهِ وَزِنَةَ عَرْشِهِ وَمِدَادَ كَلِمَاتِهِ',
        latin: "Subhanallahi wa bihamdihi 'adada khalqihi wa ridha nafsihi wa zinata 'arshihi wa midada kalimatih",
        arti: "Maha Suci Allah dan segala puji bagi-Nya, sebanyak makhluk-Nya, dan keridhaan diri-Nya, dan seberat 'Arsy-Nya, dan sebanyak tinta kalimat-kalimat-Nya.",
        jumlah: '3x'
      },
      {
        arab: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
        latin: "La ilaha illallahu wahdahu la syarika lah, lahul mulku wa lahul hamdu wa huwa 'ala kulli syai'in qadir",
        arti: 'Tidak ada Tuhan selain Allah Yang Maha Esa, tidak ada sekutu bagi-Nya. Milik-Nya kerajaan dan milik-Nya segala puji, dan Dia Maha Kuasa atas segala sesuatu.',
        jumlah: '10x'
      }
    ]
  },
  'petang': {
    nama: 'Zikir Petang',
    waktu: 'Setelah Sholat Ashar sampai Maghrib',
    daftar: [
      {
        arab: 'اَللَّهُمَّ بِكَ أَمْسَيْنَا وَبِكَ أَصْبَحْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ',
        latin: 'Allahumma bika amsaina wa bika ashbana wa bika nahya wa bika namutu wa ilaikan nusyur',
        arti: 'Ya Allah, dengan-Mu kami bersore hari, dengan-Mu kami berpagi hari, dengan-Mu kami hidup, dengan-Mu kami mati, dan kepada-Mu kami kembali.',
        jumlah: '1x'
      },
      {
        arab: 'اَللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَذِهِ اللَّيْلَةِ وَخَيْرَ مَا فِيهَا وَأَعُوذُ بِكَ مِنْ شَرِّهَا وَشَرِّ مَا فِيهَا',
        latin: "Allahumma inni as-aluka khaira hadzihil lailati wa khaira ma fiha wa a'udzu bika min syarriha wa syarri ma fiha",
        arti: 'Ya Allah, aku memohon kepada-Mu kebaikan malam ini dan kebaikan apa yang ada di dalamnya, dan aku berlindung kepada-Mu dari kejahatannya dan kejahatan apa yang ada di dalamnya.',
        jumlah: '1x'
      }
    ]
  },
  'sholat': {
    nama: 'Zikir Setelah Sholat',
    waktu: 'Setelah Sholat Fardhu',
    daftar: [
      {
        arab: 'أَسْتَغْفِرُ اللَّهَ (3x)',
        latin: 'Astaghfirullah (3x)',
        arti: 'Aku memohon ampun kepada Allah (3x)',
        jumlah: '3x'
      },
      {
        arab: 'اَللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ',
        latin: 'Allahumma antas salam wa minkas salam tabarakta ya dzal jalali wal ikram',
        arti: 'Ya Allah, Engkaulah keselamatan, dan dari-Mu lah keselamatan. Maha Suci Engkau, wahai Tuhan yang memiliki keagungan dan kemuliaan.',
        jumlah: '1x'
      },
      {
        arab: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
        latin: "La ilaha illallahu wahdahu la syarika lah, lahul mulku wa lahul hamdu wa huwa 'ala kulli syai'in qadir",
        arti: 'Tidak ada Tuhan selain Allah Yang Maha Esa, tidak ada sekutu bagi-Nya. Milik-Nya kerajaan dan milik-Nya segala puji, dan Dia Maha Kuasa atas segala sesuatu.',
        jumlah: '1x'
      },
      {
        arab: 'سُبْحَانَ اللَّهِ (33x)',
        latin: 'Subhanallah (33x)',
        arti: 'Maha Suci Allah (33x)',
        jumlah: '33x'
      },
      {
        arab: 'اَلْحَمْدُ لِلَّهِ (33x)',
        latin: 'Alhamdulillah (33x)',
        arti: 'Segala puji bagi Allah (33x)',
        jumlah: '33x'
      },
      {
        arab: 'اَللَّهُ أَكْبَرُ (33x)',
        latin: 'Allahu Akbar (33x)',
        arti: 'Allah Maha Besar (33x)',
        jumlah: '33x'
      },
      {
        arab: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
        latin: "La ilaha illallahu wahdahu la syarika lah, lahul mulku wa lahul hamdu wa huwa 'ala kulli syai'in qadir",
        arti: 'Tidak ada Tuhan selain Allah Yang Maha Esa, tidak ada sekutu bagi-Nya. Milik-Nya kerajaan dan milik-Nya segala puji, dan Dia Maha Kuasa atas segala sesuatu.',
        jumlah: '1x'
      }
    ]
  },
  'tidur': {
    nama: 'Zikir Sebelum Tidur',
    waktu: 'Sebelum tidur',
    daftar: [
      {
        arab: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
        latin: 'Bismikallahumma amutu wa ahya',
        arti: 'Dengan nama-Mu ya Allah, aku mati dan aku hidup.',
        jumlah: '1x'
      },
      {
        arab: 'اَللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ',
        latin: "Allahumma qini 'adzabaka yauma tab'atsu 'ibadak",
        arti: 'Ya Allah, peliharalah aku dari siksa-Mu pada hari Engkau membangkitkan hamba-hamba-Mu.',
        jumlah: '3x'
      },
      {
        arab: 'سُبْحَانَ اللَّهِ (33x)',
        latin: 'Subhanallah (33x)',
        arti: 'Maha Suci Allah (33x)',
        jumlah: '33x'
      },
      {
        arab: 'اَلْحَمْدُ لِلَّهِ (33x)',
        latin: 'Alhamdulillah (33x)',
        arti: 'Segala puji bagi Allah (33x)',
        jumlah: '33x'
      },
      {
        arab: 'اَللَّهُ أَكْبَرُ (34x)',
        latin: 'Allahu Akbar (34x)',
        arti: 'Allah Maha Besar (34x)',
        jumlah: '34x'
      }
    ]
  }
};

router.get('/', async (req, res) => {
  try {
    const query = (req.query.type || req.query.q || 'pagi').trim().toLowerCase();

    let zikir = ZIKIR_DATABASE[query];
    let foundKey = query;

    if (!zikir) {
      const match = Object.keys(ZIKIR_DATABASE).find(key => key.includes(query));
      if (match) {
        zikir = ZIKIR_DATABASE[match];
        foundKey = match;
      }
    }

    if (!zikir) {
      return res.status(404).json({
        status: false,
        creator: "Arulzxd",
        message: `Zikir "${query}" tidak ditemukan.`
      });
    }

    return res.status(200).json({
      status: true,
      creator: "Arulzxd",
      key: foundKey,
      result: zikir
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: "Arulzxd",
      message: "Internal Server Error saat mengambil data zikir",
      error: err.message
    });
  }
});

router.title = "Zikir Harian";
router.desc = "Mengambil kumpulan bacaan zikir harian (Pagi, Petang, Setelah Sholat, Sebelum Tidur).";
router.paramsConfig = {
  type: {
    type: "select",
    options: Object.keys(ZIKIR_DATABASE),
    default: "pagi"
  }
};

router.status = "ready";
router.type = "free";

export default router;
