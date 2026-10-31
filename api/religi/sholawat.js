import express from 'express';

const router = express.Router();

// Database Sholawat
const SHOLAWAT_DATABASE = {
    'nariyah': {
        name: 'Sholawat Nariyah',
        arab: 'اَللَّهُمَّ صَلِّ صَلَاةً كَامِلَةً وَسَلِّمْ سَلَامًا تَامًّا عَلَى سَيِّدِنَا مُحَمَّدٍ',
        latin: "Allahumma shalli shalatan kamilatan wa sallim salaman tammam 'ala sayyidina muhammad",
        arti: 'Ya Allah, limpahkanlah sholawat yang sempurna dan salam yang sempurna kepada junjungan kami Muhammad',
        keutamaan: 'Dibaca 100x setiap hari, dijaga dari fitnah dan musibah',
        sumber: 'Habib Umar bin Hafidz'
    },
    'badar': {
        name: 'Sholawat Badar',
        arab: 'صَلَّى اللهُ عَلَى النَّبِيِّ الْأُمِّيِّ الْهَاشِمِيِّ',
        latin: "Shallallahu 'alan nabiyyil ummiyyil hasyimiyy",
        arti: 'Semoga Allah melimpahkan sholawat kepada Nabi yang ummi, yang berasal dari Bani Hasyim',
        keutamaan: 'Dibaca setelah sholat, mendapat syafaat Nabi SAW',
        sumber: 'Ulama Nusantara'
    },
    'munjiyat': {
        name: 'Sholawat Munjiyat',
        arab: 'اَللَّهُمَّ صَلِّ عَلَى سَيِّدِنَا مُحَمَّدٍ وَآلِهِ صَلَاةً تُنْجِينَا بِهَا مِنْ جَمِيعِ الْأَهْوَالِ',
        latin: "Allahumma shalli 'ala sayyidina muhammad wa alihi shalatan tunjina biha min jami'il ahwal",
        arti: 'Ya Allah, limpahkanlah sholawat kepada junjungan kami Muhammad dan keluarganya, yang menyelamatkan kami dari segala ketakutan',
        keutamaan: 'Dibaca saat menghadapi kesulitan, diijabah oleh Allah',
        sumber: 'Habib Ali bin Muhammad Al-Habsyi'
    },
    'tibbilqulub': {
        name: 'Sholawat Tibbil Qulub',
        arab: 'اَللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى سَيِّدِنَا مُحَمَّدٍ وَعَلَى آلِهِ صَلَاةً تُطَهِّرُ الْقُلُوبَ',
        latin: "Allahumma shalli wa sallim wa barik 'ala sayyidina muhammad wa 'ala alihi shalatan tuthahhirul qulub",
        arti: 'Ya Allah, limpahkanlah sholawat, salam, dan berkah kepada junjungan kami Muhammad, sholawat yang membersihkan hati',
        keutamaan: 'Menyucikan hati dari penyakit hati (dengki, iri, sombong)',
        sumber: 'Habib Umar bin Hafidz'
    },
    'adzkiya': {
        name: 'Sholawat Adzkiya',
        arab: 'اَللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى سَيِّدِنَا مُحَمَّدٍ وَعَلَى آلِهِ صَلَوَاتٍ وَسَلَامًا',
        latin: "Allahumma shalli wa sallim wa barik 'ala sayyidina muhammad wa 'ala alihi shalawatan wa salaman",
        arti: 'Ya Allah, limpahkanlah sholawat, salam, dan berkah kepada junjungan kami Muhammad dan keluarganya dengan sholawat dan salam',
        keutamaan: 'Mempercepat terkabulnya doa',
        sumber: 'Habib Umar bin Hafidz'
    },
    'fatih': {
        name: 'Sholawat Fatih',
        arab: 'اَللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى سَيِّدِنَا مُحَمَّدٍ الْفَاتِحِ لِمَا أُغْلِقَ',
        latin: "Allahumma shalli wa sallim wa barik 'ala sayyidina muhammadil fatihi lima ughliq",
        arti: 'Ya Allah, limpahkanlah sholawat dan salam kepada junjungan kami Muhammad, yang membuka apa yang tertutup',
        keutamaan: 'Dibaca untuk membuka pintu rezeki dan kemudahan',
        sumber: 'Syekh Ahmad At-Tijani'
    }
};

// Endpoint GET Utama
router.get('/', async (req, res) => {
    try {
        const query = (req.query.name || req.query.q || 'nariyah').trim().toLowerCase();

        let sholawat = SHOLAWAT_DATABASE[query];
        let foundKey = query;

        if (!sholawat) {
            const match = Object.keys(SHOLAWAT_DATABASE).find(key => key.includes(query));
            if (match) {
                sholawat = SHOLAWAT_DATABASE[match];
                foundKey = match;
            }
        }

        if (!sholawat) {
            return res.status(404).json({
                status: false,
                creator: "Arulzxd",
                message: `Sholawat "${query}" tidak ditemukan.`
            });
        }

        return res.status(200).json({
            status: true,
            creator: "Arulzxd",
            key: foundKey,
            result: sholawat
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            status: false,
            creator: "Arulzxd",
            message: "Internal Server Error saat mengambil data sholawat",
            error: err.message
        });
    }
});

router.title = "Sholawat Nabi";
router.desc = "Mengambil data teks Arab, Latin, Arti, Keutamaan, dan Sumber Sholawat Nabi.";
router.paramsConfig = {
    name: {
        type: "select",
        options: Object.keys(SHOLAWAT_DATABASE),
        default: "nariyah"
    }
};

router.status = "ready";
router.type = "free";

export default router;
