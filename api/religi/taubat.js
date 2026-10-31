import express from 'express';

const router = express.Router();

const TAUBAT_DATA = {
  title: "PANDUAN TAUBAT NASUHA",
  description: "Taubat nasuha adalah taubat yang dilakukan dengan sungguh-sungguh kepada Allah SWT, disertai penyesalan atas dosa, meninggalkan dosa tersebut, dan bertekad untuk tidak mengulanginya.",
  cara_taubat: [
    {
      step: 1,
      title: "Berhenti dari dosa",
      desc: "Tinggalkan perbuatan dosa yang sedang dilakukan dan jangan sengaja meneruskannya."
    },
    {
      step: 2,
      title: "Menyesali perbuatan",
      desc: "Sesali dosa yang telah dilakukan dengan sungguh-sungguh."
    },
    {
      step: 3,
      title: "Memohon ampun kepada Allah",
      desc: "Perbanyak membaca istighfar dan memohon ampun kepada Allah SWT."
    },
    {
      step: 4,
      title: "Bertekad tidak mengulangi",
      desc: "Berusaha dengan sungguh-sungguh agar tidak kembali melakukan dosa tersebut."
    },
    {
      step: 5,
      title: "Jika menyangkut hak orang lain",
      desc: "Kembalikan hak orang tersebut atau selesaikan kewajiban kepada orang yang dirugikan dengan cara yang baik dan benar."
    }
  ],
  doa_taubat: {
    arab: "اللَّهُمَّ إِنِّي ظَلَمْتُ نَفْسِي ظُلْمًا كَثِيرًا، وَلَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ، فَاغْفِرْ لِي مَغْفِرَةً مِنْ عِنْدِكَ، وَارْحَمْنِي، إِنَّكَ أَنْتَ الْغَفُورُ الرَّحِيمُ",
    latin: "Allahumma inni zhalamtu nafsi zhulman katsiran, wa laa yaghfirudz-dzunuuba illaa anta, faghfir lii maghfiratan min 'indika, warhamnii, innaka antal-ghafuurur-rahiim.",
    arti: "Ya Allah, sesungguhnya aku telah menzalimi diriku dengan kezaliman yang banyak. Tidak ada yang dapat mengampuni dosa kecuali Engkau. Maka ampunilah aku dengan ampunan dari sisi-Mu dan rahmatilah aku. Sesungguhnya Engkau Maha Pengampun lagi Maha Penyayang."
  },
  istighfar: {
    arab: "أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ",
    latin: "Astaghfirullaaha wa atuubu ilaih.",
    arti: "Aku memohon ampun kepada Allah dan aku bertaubat kepada-Nya."
  },
  dalil: {
    sumber: "QS. Az-Zumar: 53",
    arti: "Janganlah kamu berputus asa dari rahmat Allah."
  },
  catatan_penting: [
    "Allah Maha Pengampun",
    "Jangan sengaja menunda taubat",
    "Tinggalkan dosa",
    "Perbanyak istighfar",
    "Perbanyak amal kebaikan",
    "Berusaha menjadi lebih baik"
  ]
};

router.get('/', async (req, res) => {
  try {
    return res.status(200).json({
      status: true,
      creator: "Arulzxd",
      result: TAUBAT_DATA
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      creator: "Arulzxd",
      message: "Internal Server Error saat mengambil data panduan taubat",
      error: err.message
    });
  }
});

router.title = "Panduan Taubat Nasuha";
router.desc = "Mengambil panduan taubat nasuha lengkap dengan cara, doa, latin, arti, dan istighfar.";
router.status = "ready";
router.type = "free";

export default router;
