import express from 'express';

const router = express.Router();

const ISTIKHARAH_DATA = {
  title: "PANDUAN SHOLAT ISTIKHARAH",
  pengertian: "Sholat Istikharah adalah sholat sunnah 2 rakaat untuk meminta petunjuk Allah dalam menentukan pilihan terbaik.",
  waktu: "Bisa dilakukan kapan saja, kecuali waktu terlarang sholat. Paling utama di sepertiga malam.",
  tata_cara: [
    {
      step: 1,
      title: "Niat Sholat Istikharah (2 rakaat)",
      niat_latin: "Ushalli sunnatal istikharati rak'ataini lillahi ta'ala"
    },
    {
      step: 2,
      title: "Bacaan Surah",
      detail: "Rakaat 1: Baca Al-Fatihah + Al-Kafirun. Rakaat 2: Baca Al-Fatihah + Al-Ikhlas."
    },
    {
      step: 3,
      title: "Membaca Doa Istikharah",
      detail: "Membaca doa Istikharah secara khusyuk setelah salam."
    }
  ],
  doa_istikharah: {
    bagian_1: {
      arab: "اَللَّهُمَّ إِنِّي أَسْتَخِيرُكَ بِعِلْمِكَ، وَأَسْتَقْدِرُكَ بِقُدْرَتِكَ، وَأَسْأَلُكَ مِنْ فَضْلِكَ الْعَظِيمِ، فَإِنَّكَ تَقْدِرُ وَلَا أَقْدِرُ، وَتَعْلَمُ وَلَا أَعْلَمُ، وَأَنْتَ عَلَّامُ الْغُيُوبِ",
      latin: "Allahumma inni astakhiruka bi'ilmika, wa astaqdiruka bi qudratika, wa as-aluka min fadlikal 'azhim, fa innaka taqdiru wa la aqdiru, wa ta'lamu wa la a'lamu, wa anta 'allamul ghuyub.",
      arti: "Ya Allah, aku memohon petunjuk kepada-Mu dengan ilmu-Mu, dan aku memohon kemampuan dari-Mu dengan kekuatan-Mu, dan aku memohon karunia-Mu yang agung. Sesungguhnya Engkau Maha Kuasa, sedang aku tidak kuasa, Engkau Maha Mengetahui sedang aku tidak mengetahui, dan Engkau Maha Mengetahui hal-hal yang gaib."
    },
    bagian_2_jika_baik: {
      arab: "اَللَّهُمَّ إِنْ كُنْتَ تَعْلَمُ أَنَّ هَذَا الْأَمْرَ خَيْرٌ لِي فِي دِينِي وَمَعَاشِي وَعَاقِبَةِ أَمْرِي، فَاقْدُرْهُ لِي وَيَسِّرْهُ لِي ثُمَّ بَارِكْ لِي فِيهِ",
      latin: "Allahumma in kunta ta'lamu anna hadzal amra khairun li fi dini wa ma'asyi wa 'aqibati amri, faqdurhu li wa yassirhu li tsumma barik li fih.",
      arti: "Ya Allah, jika Engkau mengetahui bahwa urusan ini baik bagiku dalam agamaku, kehidupanku, dan akhir urusanku, maka takdirkanlah ia untukku, mudahkanlah ia untukku, kemudian berkahilah ia untukku."
    },
    bagian_3_jika_buruk: {
      arab: "وَإِنْ كُنْتَ تَعْلَمُ أَنَّ هَذَا الْأَمْرَ شَرٌّ لِي فِي دِينِي وَمَعَاشِي وَعَاقِبَةِ أَمْرِي، فَاصْرِفْهُ عَنِّي وَاصْرِفْنِي عَنْهُ، وَاقْدُرْ لِيَ الْخَيْرَ حَيْثُ كَانَ ثُمَّ أَرْضِنِي بِهِ",
      latin: "Wa in kunta ta'lamu anna hadzal amra syarrun li fi dini wa ma'asyi wa 'aqibati amri, fashrifhu 'anni wash-rifni 'anhu, waqdur liyal khaira haitsu kana tsumma ardini bih.",
      arti: "Dan jika Engkau mengetahui bahwa urusan ini buruk bagiku dalam agamaku, kehidupanku, dan akhir urusanku, maka jauhkanlah ia dariku, dan jauhkanlah aku darinya, dan takdirkanlah untukku kebaikan di mana pun ia berada, kemudian ridhailah aku dengannya."
    }
  },
  keutamaan: [
    "Mendapat petunjuk terbaik dari Allah",
    "Terhindar dari penyesalan",
    "Menyerahkan urusan kepada Allah",
    "Meningkatkan ketakwaan"
  ],
  sumber: "HR. Bukhari"
};

router.get('/', async (req, res) => {
  try {
    return res.status(200).json({
      status: true,
      creator: "Arulzxd",
      result: ISTIKHARAH_DATA
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: "Arulzxd",
      message: "Internal Server Error saat mengambil data panduan sholat istikharah",
      error: err.message
    });
  }
});

router.title = "Sholat Istikharah";
router.desc = "Mengambil panduan Sholat Istikharah lengkap dengan tata cara, doa, latin, arti, dan keutamaan.";
router.status = "ready";
router.type = "free";

export default router;
