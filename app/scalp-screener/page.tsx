'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ScalpResult {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  signal: string;
  momentum: number;
  candlePower: number;
  timeframe: string;
  volume: number;
  volatility: number;
  entry: 'SNIPER' | 'BREAKOUT' | 'WATCH' | null;
  reason: string;
  cppScore?: number;
  cppBias?: string;
  wyckoff?: string;
  rmv?: number;
  isHakaReady?: boolean;
  cooldownBars?: number;
  hakaClose?: number;
}

// All Indonesian stocks from IDX
const ALL_INDONESIAN_STOCKS = [
  'AADI', 'AALI', 'ABBA', 'ABDA', 'ABMM', 'ACES', 'ACRO', 'ACST', 'ADCP', 'ADES',
  'ADHI', 'ADMF', 'ADMG', 'ADMR', 'ADRO', 'AEGS', 'AGAR', 'AGII', 'AGRO', 'AGRS',
  'AHAP', 'AIMS', 'AISA', 'AKKU', 'AKPI', 'AKRA', 'AKSI', 'ALDO', 'ALII', 'ALKA',
  'ALMI', 'ALTO', 'AMAG', 'AMAN', 'AMAR', 'AMFG', 'AMIN', 'AMMN', 'AMMS', 'AMOR',
  'AMRT', 'ANDI', 'ANJT', 'ANTM', 'APEX', 'APIC', 'APII', 'APLI', 'APLN', 'ARCI',
  'AREA', 'ARGO', 'ARII', 'ARKA', 'ARKO', 'ARMY', 'ARNA', 'ARTA', 'ARTI', 'ARTO',
  'ASBI', 'ASDM', 'ASGR', 'ASHA', 'ASII', 'ASJT', 'ASLC', 'ASLI', 'ASMI', 'ASPI',
  'ASPR', 'ASRI', 'ASRM', 'ASSA', 'ATAP', 'ATIC', 'ATLA', 'AUTO', 'AVIA', 'AWAN',
  'AXIO', 'AYAM', 'AYLS', 'BABP', 'BABY', 'BACA', 'BAIK', 'BAJA', 'BALI', 'BANK',
  'BAPA', 'BAPI', 'BATA', 'BATR', 'BAUT', 'BAYU', 'BBCA', 'BBHI', 'BBKP', 'BBLD',
  'BBMD', 'BBNI', 'BBRI', 'BBRM', 'BBSI', 'BBSS', 'BBTN', 'BBYB', 'BCAP', 'BCIC',
  'BCIP', 'BDKR', 'BDMN', 'BEBS', 'BEEF', 'BEER', 'BEKS', 'BELI', 'BELL', 'BESS',
  'BEST', 'BFIN', 'BGTG', 'BHAT', 'BHIT', 'BIKA', 'BIKE', 'BIMA', 'BINA', 'BINO',
  'BIPI', 'BIPP', 'BIRD', 'BISI', 'BJBR', 'BJTM', 'BKDP', 'BKSL', 'BKSW', 'BLES',
  'BLOG', 'BLTA', 'BLTZ', 'BLUE', 'BMAS', 'BMBL', 'BMHS', 'BMRI', 'BMSR', 'BMTR',
  'BNBA', 'BNBR', 'BNGA', 'BNII', 'BNLI', 'BOAT', 'BOBA', 'BOGA', 'BOLA', 'BOLT',
  'BOSS', 'BPFI', 'BPII', 'BPTR', 'BRAM', 'BREN', 'BRIS', 'BRMS', 'BRNA', 'BRPT',
  'BRRC', 'BSBK', 'BSDE', 'BSIM', 'BSML', 'BSSR', 'BSWD', 'BTEK', 'BTEL', 'BTON',
  'BTPN', 'BTPS', 'BUAH', 'BUDI', 'BUKA', 'BUKK', 'BULL', 'BUMI', 'BUVA', 'BVIC',
  'BWPT', 'BYAN', 'CAKK', 'CAMP', 'CANI', 'CARE', 'CARS', 'CASA', 'CASH', 'CASS',
  'CBDK', 'CBMF', 'CBPE', 'CBRE', 'CBUT', 'CCSI', 'CDIA', 'CEKA', 'CENT', 'CFIN',
  'CGAS', 'CHEK', 'CHEM', 'CHIP', 'CINT', 'CITA', 'CITY', 'CLAY', 'CLEO', 'CLPI',
  'CMNP', 'CMNT', 'CMPP', 'CMRY', 'CNKO', 'CNMA', 'CNTB', 'CNTX', 'COAL', 'COCO',
  'COIN', 'COWL', 'CPIN', 'CPRI', 'CPRO', 'CRAB', 'CRSN', 'CSAP', 'CSIS', 'CSMI',
  'CSRA', 'CTBN', 'CTRA', 'CTTH', 'CUAN', 'CYBR', 'DAAZ', 'DADA', 'DART', 'DATA',
  'DAYA', 'DCII', 'DEAL', 'DEFI', 'DEPO', 'DEWA', 'DEWI', 'DFAM', 'DGIK', 'DGNS',
  'DGWG', 'DIGI', 'DILD', 'DIVA', 'DKFT', 'DKHH', 'DLTA', 'DMAS', 'DMMX', 'DMND',
  'DNAR', 'DNET', 'DOID', 'DOOH', 'DOSS', 'DPNS', 'DPUM', 'DRMA', 'DSFI', 'DSNG',
  'DSSA', 'DUCK', 'DUTI', 'DVLA', 'DWGL', 'DYAN', 'EAST', 'ECII', 'EDGE', 'EKAD',
  'ELIT', 'ELPI', 'ELSA', 'ELTY', 'EMAS', 'EMDE', 'EMTK', 'ENAK', 'ENRG', 'ENVY',
  'ENZO', 'EPAC', 'EPMT', 'ERAA', 'ERAL', 'ERTX', 'ESIP', 'ESSA', 'ESTA', 'ESTI',
  'ETWA', 'EURO', 'EXCL', 'FAPA', 'FAST', 'FASW', 'FILM', 'FIMP', 'FIRE', 'FISH',
  'FITT', 'FLMC', 'FMII', 'FOLK', 'FOOD', 'FORE', 'FORU', 'FPNI', 'FUJI', 'FUTR',
  'FWCT', 'GAMA', 'GDST', 'GDYR', 'GEMA', 'GEMS', 'GGRM', 'GGRP', 'GHON', 'GIAA',
  'GJTL', 'GLOB', 'GLVA', 'GMFI', 'GMTD', 'GOLD', 'GOLF', 'GOLL', 'GOOD', 'GOTO',
  'GOTOM', 'GPRA', 'GPSO', 'GRIA', 'GRPH', 'GRPM', 'GSMF', 'GTBO', 'GTRA', 'GTSI',
  'GULA', 'GUNA', 'GWSA', 'GZCO', 'HADE', 'HAIS', 'HAJJ', 'HALO', 'HATM', 'HBAT',
  'HDFA', 'HDIT', 'HEAL', 'HELI', 'HERO', 'HEXA', 'HGII', 'HILL', 'HITS', 'HKMU',
  'HMSP', 'HOKI', 'HOME', 'HOMI', 'HOPE', 'HOTL', 'HRME', 'HRTA', 'HRUM', 'HUMI',
  'HYGN', 'IATA', 'IBFN', 'IBOS', 'IBST', 'ICBP', 'ICON', 'IDEA', 'IDPR', 'IFII',
  'IFSH', 'IGAR', 'IIKP', 'IKAI', 'IKAN', 'IKBI', 'IKPM', 'IMAS', 'IMJS', 'IMPC',
  'INAF', 'INAI', 'INCF', 'INCI', 'INCO', 'INDF', 'INDO', 'INDR', 'INDS', 'INDX',
  'INDY', 'INET', 'INKP', 'INOV', 'INPC', 'INPP', 'INPS', 'INRU', 'INTA', 'INTD',
  'INTP', 'IOTF', 'IPAC', 'IPCC', 'IPCM', 'IPOL', 'IPPE', 'IPTV', 'IRRA', 'IRSX',
  'ISAP', 'ISAT', 'ISEA', 'ISSP', 'ITIC', 'ITMA', 'ITMG', 'JARR', 'JAST', 'JATI',
  'JAWA', 'JAYA', 'JECC', 'JGLE', 'JIHD', 'JKON', 'JMAS', 'JPFA', 'JRPT', 'JSKY',
  'JSMR', 'JSPT', 'JTPE', 'KAEF', 'KAQI', 'KARW', 'KAYU', 'KBAG', 'KBLI', 'KBLM',
  'KBLV', 'KBRI', 'KDSI', 'KDTN', 'KEEN', 'KEJU', 'KETR', 'KIAS', 'KICI', 'KIJA',
  'KING', 'KINO', 'KIOS', 'KJEN', 'KKES', 'KKGI', 'KLAS', 'KLBF', 'KLIN', 'KMDS',
  'KMTR', 'KOBX', 'KOCI', 'KOIN', 'KOKA', 'KONI', 'KOPI', 'KOTA', 'KPIG', 'KRAS',
  'KREN', 'KRYA', 'KSIX', 'KUAS', 'LABA', 'LABS', 'LAJU', 'LAND', 'LAPD', 'LCGP',
  'LCKM', 'LEAD', 'LFLO', 'LIFE', 'LINK', 'LION', 'LIVE', 'LMAS', 'LMAX', 'LMPI',
  'LMSH', 'LOPI', 'LPCK', 'LPGI', 'LPIN', 'LPKR', 'LPLI', 'LPPF', 'LPPS', 'LRNA',
  'LSIP', 'LTLS', 'LUCK', 'LUCY', 'MABA', 'MAGP', 'MAHA', 'MAIN', 'MANG', 'MAPA',
  'MAPB', 'MAPI', 'MARI', 'MARK', 'MASB', 'MAXI', 'MAYA', 'MBAP', 'MBMA', 'MBSS',
  'MBTO', 'MCAS', 'MCOL', 'MCOR', 'MDIA', 'MDIY', 'MDKA', 'MDKI', 'MDLA', 'MDLN',
  'MDRN', 'MEDC', 'MEDS', 'MEGA', 'MEJA', 'MENN', 'MERI', 'MERK', 'META', 'MFMI',
  'MGLV', 'MGNA', 'MGRO', 'MHKI', 'MICE', 'MIDI', 'MIKA', 'MINA', 'MINE', 'MIRA',
  'MITI', 'MKAP', 'MKNT', 'MKPI', 'MKTR', 'MLBI', 'MLIA', 'MLPL', 'MLPT', 'MMIX',
  'MMLP', 'MNCN', 'MOLI', 'MORA', 'MPIX', 'MPMX', 'MPOW', 'MPPA', 'MPRO', 'MPXL',
  'MRAT', 'MREI', 'MSIE', 'MSIN', 'MSJA', 'MSKY', 'MSTI', 'MTDL', 'MTEL', 'MTFN',
  'MTLA', 'MTMH', 'MTPS', 'MTRA', 'MTSM', 'MTWI', 'MUTU', 'MYOH', 'MYOR', 'MYTX',
  'NAIK', 'NANO', 'NASA', 'NASI', 'NATO', 'NAYZ', 'NCKL', 'NELY', 'NEST', 'NETV',
  'NFCX', 'NICE', 'NICK', 'NICL', 'NIKL', 'NINE', 'NIRO', 'NISP', 'NOBU', 'NPGF',
  'NRCA', 'NSSS', 'NTBK', 'NUSA', 'NZIA', 'OASA', 'OBAT', 'OBMD', 'OCAP', 'OILS',
  'OKAS', 'OLIV', 'OMED', 'OMRE', 'OPMS', 'PACK', 'PADA', 'PADI', 'PALM', 'PAMG',
  'PANI', 'PANR', 'PANS', 'PART', 'PBID', 'PBRX', 'PBSA', 'PCAR', 'PDES', 'PDPP',
  'PEGE', 'PEHA', 'PEVE', 'PGAS', 'PGEO', 'PGJO', 'PGLI', 'PGUN', 'PICO', 'PIPA',
  'PJAA', 'PJHB', 'PKPK', 'PLAN', 'PLAS', 'PLIN', 'PMJS', 'PMMP', 'PMUI', 'PNBN',
  'PNBS', 'PNGO', 'PNIN', 'PNLF', 'PNSE', 'POLA', 'POLI', 'POLL', 'POLU', 'POLY',
  'POOL', 'PORT', 'POSA', 'POWR', 'PPGL', 'PPRE', 'PPRI', 'PPRO', 'PRAY', 'PRDA',
  'PRIM', 'PSAB', 'PSAT', 'PSDN', 'PSGO', 'PSKT', 'PSSI', 'PTBA', 'PTDU', 'PTIS',
  'PTMP', 'PTMR', 'PTPP', 'PTPS', 'PTPW', 'PTRO', 'PTSN', 'PTSP', 'PUDP', 'PURA',
  'PURE', 'PURI', 'PWON', 'PYFA', 'PZZA', 'RAAM', 'RAFI', 'RAJA', 'RALS', 'RANC',
  'RATU', 'RBMS', 'RCCC', 'RDTX', 'REAL', 'RELF', 'RELI', 'RGAS', 'RICY', 'RIGS',
  'RIMO', 'RISE', 'RLCO', 'RMKE', 'RMKO', 'ROCK', 'RODA', 'RONY', 'ROTI', 'RSCH',
  'RSGK', 'RUIS', 'RUNS', 'SAFE', 'SAGE', 'SAME', 'SAMF', 'SAPX', 'SATU', 'SBAT',
  'SBMA', 'SCCO', 'SCMA', 'SCNP', 'SCPI', 'SDMU', 'SDPC', 'SDRA', 'SEMA', 'SFAN',
  'SGER', 'SGRO', 'SHID', 'SHIP', 'SICO', 'SIDO', 'SILO', 'SIMA', 'SIMP', 'SINI',
  'SIPD', 'SKBM', 'SKLT', 'SKRN', 'SKYB', 'SLIS', 'SMAR', 'SMBR', 'SMCB', 'SMDM',
  'SMDR', 'SMGA', 'SMGR', 'SMIL', 'SMKL', 'SMKM', 'SMLE', 'SMMA', 'SMMT', 'SMRA',
  'SMRU', 'SMSM', 'SNLK', 'SOCI', 'SOFA', 'SOHO', 'SOLA', 'SONA', 'SOSS', 'SOTS',
  'SOUL', 'SPMA', 'SPRE', 'SPTO', 'SQMI', 'SRAJ', 'SRIL', 'SRSN', 'SRTG', 'SSIA',
  'SSMS', 'SSTM', 'STAA', 'STAR', 'STRK', 'STTP', 'SUGI', 'SULI', 'SUNI', 'SUPA',
  'SUPR', 'SURE', 'SURI', 'SWAT', 'SWID', 'TALF', 'TAMA', 'TAMU', 'TAPG', 'TARA',
  'TAXI', 'TAYS', 'TBIG', 'TBLA', 'TBMS', 'TCID', 'TCPI', 'TDPM', 'TEBE', 'TECH',
  'TELE', 'TFAS', 'TFCO', 'TGKA', 'TGRA', 'TGUK', 'TIFA', 'TINS', 'TIRA', 'TIRT',
  'TKIM', 'TLDN', 'TLKM', 'TMAS', 'TMPO', 'TNCA', 'TOBA', 'TOOL', 'TOPS', 'TOSK',
  'TOTL', 'TOTO', 'TOWR', 'TOYS', 'TPIA', 'TPMA', 'TRAM', 'TRGU', 'TRIL', 'TRIM',
  'TRIN', 'TRIO', 'TRIS', 'TRJA', 'TRON', 'TRST', 'TRUE', 'TRUK', 'TRUS', 'TSPC',
  'TUGU', 'TYRE', 'UANG', 'UCID', 'UDNG', 'UFOE', 'ULTJ', 'UNIC', 'UNIQ', 'UNIT',
  'UNSP', 'UNTD', 'UNTR', 'UNVR', 'URBN', 'UVCR', 'VAST', 'VERN', 'VICI', 'VICO',
  'VINS', 'VISI', 'VIVA', 'VKTR', 'VOKS', 'VRNA', 'VTNY', 'WAPO', 'WEGE', 'WEHA',
  'WGSH', 'WICO', 'WIDI', 'WIFI', 'WIIM', 'WIKA', 'WINE', 'WINR', 'WINS', 'WIRG',
  'WMPP', 'WMUU', 'WOMF', 'WOOD', 'WOWS', 'WSBP', 'WSKT', 'WTON', 'YELO', 'YOII',
  'YPAS', 'YULE', 'YUPI', 'ZATA', 'ZBRA', 'ZINC', 'ZONE', 'ZYRX'
];

// Most liquid stocks for faster scanning (high volume, tight spreads)
const LIQUID_STOCKS = [
  // Banks (Very Liquid)
  'BBCA', 'BBRI', 'BMRI', 'BBNI', 'BRIS', 'BTPS', 'BDMN', 'BNGA', 'NISP', 'MEGA',

  // Blue Chips (Very Liquid)
  'TLKM', 'ASII', 'UNVR', 'ICBP', 'INDF', 'HMSP', 'GGRM', 'KLBF', 'ANTM', 'INCO',

  // Infrastructure & Energy (Liquid)
  'JSMR', 'ADRO', 'PTBA', 'PGAS', 'ITMG', 'SMGR', 'WIKA', 'WSKT', 'PTPP', 'ADHI',

  // Mining & Resources (Liquid)
  'MDKA', 'INDY', 'TINS', 'MEDC', 'ELSA', 'ESSA', 'BRMS', 'DOID', 'GEMS', 'PSAB',

  // Tech & Telecom (Liquid)
  'GOTO', 'EMTK', 'BUKA', 'WIFI', 'EXCL', 'ISAT', 'FREN', 'LINK', 'TBIG', 'MTEL',

  // Consumer (Liquid)
  'MYOR', 'CAMP', 'MLBI', 'ULTJ', 'ROTI', 'ADES', 'CLEO', 'GOOD', 'SIDO', 'KAEF',

  // Property (Liquid)
  'BSDE', 'SMRA', 'CTRA', 'PWON', 'LPKR', 'APLN', 'DUTI', 'ASRI', 'PLIN', 'BAPA',

  // Finance (Liquid)
  'BBTN', 'BJBR', 'BJTM', 'BCAP', 'PNBN', 'ADMF', 'AMMN', 'BFIN', 'DEFI', 'HADE',

  // Misc Large Caps (Liquid)
  'ARTO', 'PANI', 'BREN', 'TPIA', 'AKRA', 'UNTR', 'SRTG', 'TOWR', 'INKP', 'TKIM',

  // Mid Caps (Active)
  'FIRE', 'ELIT', 'UVCR', 'LAND', 'KOTA', 'MAPI', 'LPPF', 'ERAA', 'HEAL', 'MIKA',

  // Growth Stocks (Active)
  'AMRT', 'DNET', 'DCII', 'BOGA', 'CPRO', 'EDGE', 'FILM', 'BEER', 'BULL', 'NCKL',
];

export default function ScalpScreener() {
  const [results, setResults] = useState<ScalpResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [timeframe, setTimeframe] = useState<'5m' | '15m'>('15m');
  const [sortBy, setSortBy] = useState<'momentum' | 'power' | 'volatility'>('momentum');
  const [filterEntry, setFilterEntry] = useState<'ALL' | 'SNIPER' | 'BREAKOUT'>('ALL');
  const [stockSelection, setStockSelection] = useState<'LIQUID' | 'ALL'>('LIQUID');

  const SCALP_STOCKS = stockSelection === 'LIQUID' ? LIQUID_STOCKS : ALL_INDONESIAN_STOCKS;

  const scanStocks = async () => {
    setLoading(true);
    setResults([]);
    setProgress(0);

    const newResults: ScalpResult[] = [];
    let scannedCount = 0;
    let errorCount = 0;

    for (let idx = 0; idx < SCALP_STOCKS.length; idx++) {
      const ticker = SCALP_STOCKS[idx];

      try {
        const symbol = `${ticker}.JK`;

        // Fetch historical data for scalping timeframe
        const histRes = await fetch(
          `/api/stock/historical?symbol=${symbol}&interval=${timeframe}`
        );

        if (!histRes.ok) {
          console.log(`? Failed to fetch ${ticker}: ${histRes.status}`);
          errorCount++;
          setProgress(Math.round(((idx + 1) / SCALP_STOCKS.length) * 100));
          continue;
        }

        const histData = await histRes.json();
        if (!histData.data || histData.data.length < 50) {
          console.log(`?? ${ticker}: Insufficient data (${histData.data?.length || 0} candles)`);
          setProgress(Math.round(((idx + 1) / SCALP_STOCKS.length) * 100));
          continue;
        }

        scannedCount++;

        // Fetch quote for current price
        const quoteRes = await fetch(`/api/stock/quote?symbol=${symbol}`);
        if (!quoteRes.ok) {
          console.log(`? Failed to fetch quote for ${ticker}`);
          setProgress(Math.round(((idx + 1) / SCALP_STOCKS.length) * 100));
          continue;
        }

        const quoteData = await quoteRes.json();

        // Analyze scalping opportunity
        const analysis = analyzeScalpingOpportunity(histData.data);

        if (analysis.entry) {
          console.log(`✅ ${ticker}: ${analysis.signal} (Power: ${analysis.candlePower}, Mom: ${analysis.momentum}%)`);
          newResults.push({
            symbol: ticker,
            price: quoteData.price,
            change: quoteData.change,
            changePercent: quoteData.changePercent,
            signal: analysis.signal,
            momentum: analysis.momentum,
            candlePower: analysis.candlePower,
            timeframe: timeframe,
            volume: analysis.volume,
            volatility: analysis.volatility,
            entry: analysis.entry,
            reason: analysis.reason,
            cppScore: analysis.cppScore,
            cppBias: analysis.cppBias,
            wyckoff: analysis.wyckoff,
            rmv: analysis.rmv,
            isHakaReady: analysis.isHakaReady,
            cooldownBars: analysis.cooldownBars,
            hakaClose: analysis.hakaClose,
          });

          // Sort and update in real-time
          const sorted = [...newResults].sort((a, b) => {
            if (sortBy === 'momentum') return b.momentum - a.momentum;
            if (sortBy === 'power') return b.candlePower - a.candlePower;
            return b.volatility - a.volatility;
          });
          setResults(sorted);
        }

      } catch (err) {
        console.error(`? Error scanning ${ticker}:`, err);
        errorCount++;
      }

      setProgress(Math.round(((idx + 1) / SCALP_STOCKS.length) * 100));
    }

    console.log(`?? Scan complete: ${scannedCount} stocks scanned, ${newResults.length} opportunities found, ${errorCount} errors`);
    setLoading(false);
  };

  // ── Helper functions mirroring lib/indicators.ts logic ──────────────────
  const calcSMA = (arr: number[], period: number, i: number): number => {
    if (i < period - 1) return 0;
    let s = 0;
    for (let j = i - period + 1; j <= i; j++) s += arr[j];
    return s / period;
  };

  const calcATR = (H: number[], L: number[], C: number[], period: number, i: number): number => {
    if (i < period) return 0;
    let s = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const pc = C[j - 1] ?? C[j];
      s += Math.max(H[j] - L[j], Math.abs(H[j] - pc), Math.abs(L[j] - pc));
    }
    return s / period;
  };

  // CPP — Candle Power Prediction (Power Directional Index from research)
  const calcCPP = (C: number[], O: number[], H: number[], L: number[], V: number[], i: number, lookback = 5): number => {
    if (i < lookback + 10) return 0;
    let volSum = 0;
    for (let k = 0; k < 10; k++) volSum += V[i - k];
    const vSMA10 = volSum / 10 || 1;
    let cpp = 0;
    for (let j = 0; j < lookback; j++) {
      const k = i - j;
      const range = H[k] - L[k];
      const safeRange = range === 0 ? 0.0001 : range;
      const cbd = (C[k] - O[k]) / safeRange;          // Candle Body Dominance
      const vam = V[k] / vSMA10;                        // Volume Anomaly Multiplier
      const dp  = cbd * vam;                             // Daily Power
      const wt  = (lookback - j) / lookback;            // Exponential weight
      cpp += dp * wt;
    }
    return cpp;
  };

  // RMV — Relative Measured Volatility (VCP pivot gauge, from research)
  const calcRMV = (H: number[], L: number[], C: number[], i: number): number => {
    if (i < 25) return 50;
    const atr5vals: number[] = [];
    for (let k = i - 19; k <= i; k++) atr5vals.push(calcATR(H, L, C, 5, k));
    const cur = atr5vals[atr5vals.length - 1];
    const mn  = Math.min(...atr5vals);
    const mx  = Math.max(...atr5vals);
    if (mx === mn) return 50;
    return ((cur - mn) / (mx - mn)) * 100;
  };

  const analyzeScalpingOpportunity = (data: any[]): any => {
    const N = data.length;
    if (N < 50) return { entry: null };

    // Build clean OHLCV arrays
    const closes: number[] = [], opens: number[] = [],
          highs:  number[] = [], lows:  number[] = [],
          volumes: number[] = [];
    for (const d of data) {
      if (d.close !== null && d.volume > 0) {
        closes.push(d.close); opens.push(d.open);
        highs.push(d.high);   lows.push(d.low);
        volumes.push(d.volume);
      }
    }
    const n = closes.length;
    if (n < 50) return { entry: null };

    const i = n - 1; // last bar

    // ── Indicators ─────────────────────────────────────────────────────
    const ma20   = calcSMA(closes, 20, i);
    const ma50   = calcSMA(closes, 50, i);
    const atr14  = calcATR(highs, lows, closes, 14, i);
    const rmv    = calcRMV(highs, lows, closes, i);

    // 20-bar averages
    let volSum = 0, spSum = 0;
    for (let k = i - 19; k <= i; k++) {
      volSum += volumes[k];
      spSum  += highs[k] - lows[k];
    }
    const volAvg20  = volSum / 20;
    const spAvg20   = spSum / 20;

    const curClose = closes[i], curOpen = opens[i];
    const curHigh  = highs[i],  curLow  = lows[i];
    const curVol   = volumes[i];
    const spread   = curHigh - curLow;
    const body     = Math.abs(curClose - curOpen);
    const isGreen  = curClose >= curOpen;
    const volRatio = curVol / (volAvg20 || 1);
    const spRatio  = spread / (spAvg20 || 1);
    const closePos = spread > 0 ? (curClose - curLow) / spread : 0.5;
    const upperWick= curHigh - Math.max(curOpen, curClose);
    const lowerWick= Math.min(curOpen, curClose) - curLow;

    // Buying/selling pressure (last 10 bars)
    let buyVol = 0, sellVol = 0;
    for (let k = i - 9; k <= i; k++) {
      if (closes[k] > opens[k]) buyVol  += volumes[k];
      else if (closes[k] < opens[k]) sellVol += volumes[k];
    }
    const accRatio = buyVol / (sellVol || 1);

    // ── CPP/PDI — Power Directional Index ──────────────────────────────
    const cppRaw  = calcCPP(closes, opens, highs, lows, volumes, i, 5);
    const cppBias = cppRaw > 0.5 ? 'BULLISH' : cppRaw < -0.5 ? 'BEARISH' : 'NEUTRAL';
    const powerScore = Math.max(0, Math.min(100, Math.round(50 + (cppRaw / 1.5) * 45)));

    // ── VSA Signals (mirrors detectVSA in lib/indicators.ts) ───────────
    const isDryUp    = (!isGreen || body < spread * 0.3) && volRatio <= 0.60 && accRatio > 0.8;
    const isIceberg  = volRatio > 1.2 && spRatio < 0.75;
    const isNoDemand = isGreen && spread < atr14 && volRatio < 0.8;
    const isNoSupply =
      curLow < (i > 0 ? lows[i - 1] : curLow) &&
      spread < atr14 && volRatio < 0.8;
    const isSellingClimax = spread > atr14 * 2 && volRatio > 2.5 && !isGreen && closePos > 0.4;
    const isUpthrust = spread > atr14 * 1.5 && volRatio > 1.5 && closePos < 0.3;
    const isHammer   = lowerWick > body * 1.2 && upperWick < body * 0.6 && (lowerWick / (spread || 1)) > 0.5;

    // VCP detection
    const last30High  = Math.max(...highs.slice(Math.max(0, i - 29), i + 1));
    const isNearHigh  = curClose > last30High * 0.80;
    let sp5 = 0, vl5 = 0;
    for (let k = Math.max(0, i - 4); k <= i; k++) { sp5 += highs[k] - lows[k]; vl5 += volumes[k]; }
    const isVCP = isNearHigh && (sp5 / 5) < spAvg20 * 0.75 && (vl5 / 5) < volAvg20 * 0.85;
    const isVCPPivot = isVCP && rmv <= 20;

    // Wyckoff phase
    const inUptrend   = curClose > ma20 && curClose > ma50 && ma20 > ma50;
    const inDowntrend = curClose < ma20 && curClose < ma50 && ma20 < ma50;
    const wyckoff = inUptrend ? 'MARKUP' : inDowntrend ? 'MARKDOWN'
                  : curClose > ma20 * 0.95 ? 'ACCUMULATION' : 'DISTRIBUTION';

    // ── HAKA COOLDOWN DETECTION ─────────────────────────────────────────
    // Identify: prior aggressive markup candle (HAKA) → then cooldown bars
    // with LOW sell volume → next candle likely to resume markup
    //
    // Conditions:
    //   1. Within last 15 bars: at least one HAKA candle (vol > 2x, green, body > 60% range, close > MA20)
    //   2. After that HAKA: 2-5 cooldown bars with avg vol < 80% of HAKA vol, accRatio > 0.8
    //   3. Current price still above MA20 (trend intact)
    //   4. CPP score is not bearish (no heavy selling)
    //   5. Momentum has not reversed below -2% (still positive or mild pullback)

    let hakaIndex = -1;
    let hakaVol = 0;
    for (let k = Math.max(0, i - 15); k < i - 1; k++) {
      const sp_k = highs[k] - lows[k];
      const body_k = Math.abs(closes[k] - opens[k]);
      const vr_k = volumes[k] / (volAvg20 || 1);
      const bp_k = sp_k > 0 ? (closes[k] - lows[k]) / sp_k : 0;
      const ma20_k = calcSMA(closes, 20, k);
      const isHAKA = closes[k] > opens[k] && vr_k > 1.8 && body_k > sp_k * 0.55 && bp_k > 0.65 && closes[k] > ma20_k;
      if (isHAKA && vr_k > hakaVol) { hakaIndex = k; hakaVol = vr_k; }
    }

    const cooldownBars = hakaIndex >= 0 ? i - hakaIndex : 0;
    const isHakaCooldown =
      hakaIndex >= 0 &&
      cooldownBars >= 2 &&
      cooldownBars <= 8 &&
      curClose > ma20 &&      // Still above MA20 (uptrend intact)
      cppBias !== 'BEARISH';  // CPP not showing sell pressure

    // Verify cooldown bars have low sell volume
    let cooldownSellVol = 0, cooldownTotalVol = 0;
    if (isHakaCooldown) {
      for (let k = hakaIndex + 1; k <= i; k++) {
        if (closes[k] < opens[k]) cooldownSellVol += volumes[k];
        cooldownTotalVol += volumes[k];
      }
    }
    // Sell pressure in cooldown < 40% = healthy consolidation
    const cooldownSellRatio = cooldownTotalVol > 0 ? cooldownSellVol / cooldownTotalVol : 0;
    const isHealthyCooldown = isHakaCooldown && cooldownSellRatio < 0.40;

    // Price hasn't pulled back more than 5% from HAKA close
    const hakaClose = hakaIndex >= 0 ? closes[hakaIndex] : curClose;
    const pullbackPct = hakaIndex >= 0 ? (hakaClose - curClose) / hakaClose * 100 : 0;
    const isShallowPullback = pullbackPct < 5;

    const isHakaReady = isHealthyCooldown && isShallowPullback && accRatio > 0.9;

    // ── Scalp Signal Priority (bearish signals → skip, bullish → show) ──
    // REJECT bearish immediately
    const isBearish = isUpthrust || isNoDemand ||
      (!isGreen && volRatio > 2.5 && body > spread * 0.6) || // Scalp dump
      (volRatio > 2 && upperWick / (spread || 1) > 0.5);     // Shooting star
    if (isBearish) return { entry: null };

    // HAKA Cooldown = highest priority (aggressive markup → healthy pause → ready to go again)
    // Sniper = VCP pivot + dry up + above MA + CPP bullish
    const isSniper = isHakaReady ||
      ((isVCPPivot || (isVCP && isDryUp)) && curClose > ma20 && accRatio > 1.0 && cppBias !== 'BEARISH');
    // Breakout = strong green candle on high volume above MA
    const isBreakout = isGreen && volRatio > 2.0 && closePos > 0.75 && curClose > ma20 && cppBias === 'BULLISH';
    // Watch = dry up, iceberg, no supply, selling climax
    const isWatch = (isDryUp || isIceberg || isNoSupply || isSellingClimax || isHammer) && !isBearish;

    // Only surface if CPP is not strongly bearish OR signal is very strong
    if (!isSniper && !isBreakout && !isWatch) return { entry: null };
    if (cppBias === 'BEARISH' && !isSniper && !isSellingClimax) return { entry: null };

    // Entry type
    let entry: 'SNIPER' | 'BREAKOUT' | 'WATCH' | null =
      isSniper ? 'SNIPER' : isBreakout ? 'BREAKOUT' : isWatch ? 'WATCH' : null;
    if (!entry) return { entry: null };

    // Signal label
    let signal: string;
    if (isHakaReady)          signal = `🔥 HAKA COOLDOWN (${cooldownBars}b, sell:${Math.round(cooldownSellRatio * 100)}%)`;
    else if (isSniper)        signal = isVCPPivot ? '🎯 SCALP SNIPER (VCP Pivot)' : '🎯 SCALP SNIPER';
    else if (isBreakout)      signal = '⚡ SCALP BREAKOUT';
    else if (isSellingClimax) signal = '🟢 Selling Climax (SC)';
    else if (isNoSupply)      signal = '🟢 No Supply (NS)';
    else if (isHammer)        signal = '🔨 Hammer Support';
    else if (isDryUp)         signal = '🥷 Micro Dry Up';
    else if (isIceberg)       signal = '🧊 Micro Iceberg';
    else                      signal = '📊 Watch';

    // Momentum over last 10 candles
    const momentum = ((closes[i] - closes[i - 10]) / closes[i - 10]) * 100;

    // Volatility (ATR %)
    const volatility = atr14 / curClose * 100;

    const reason = `${signal} | CPP:${cppRaw > 0 ? '+' : ''}${cppRaw.toFixed(2)} ${cppBias} | Vol:${volRatio.toFixed(1)}x | Acc:${accRatio.toFixed(1)}x | ${wyckoff} | RMV:${Math.round(rmv)}`;

    return {
      entry,
      signal,
      momentum: parseFloat(momentum.toFixed(2)),
      candlePower: powerScore,
      volume: parseFloat(volRatio.toFixed(2)),
      volatility: parseFloat(volatility.toFixed(2)),
      cppScore: parseFloat(cppRaw.toFixed(2)),
      cppBias,
      wyckoff,
      rmv: Math.round(rmv),
      isHakaReady,
      cooldownBars,
      hakaClose,
      reason,
    };
  };

  const filteredResults = results.filter(r => {
    if (filterEntry === 'ALL') return true;
    return r.entry === filterEntry;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-white">
      {/* Header */}
      <nav className="backdrop-blur-xl bg-black/30 border-b border-white/10 px-4 py-3 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                Scalp Screener
              </h1>
              <p className="text-xs text-gray-400">
                Intraday Sniper Entries
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/vcp-screener"
              className="backdrop-blur-md bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 px-3 py-1.5 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 shadow-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>VCP</span>
            </Link>
            <Link
              href="/"
              className="backdrop-blur-md bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 shadow-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Chart</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-3 md:p-6">
        {/* Controls */}
        <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl p-4 mb-6 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Stock Selection */}
            <div>
              <label className="flex text-sm font-semibold mb-2 items-center gap-2">
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>Stocks</span>
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setStockSelection('LIQUID')}
                  disabled={loading}
                  className={`flex-1 px-4 py-2 rounded font-semibold transition ${
                    stockSelection === 'LIQUID'
                      ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                      : 'backdrop-blur-md bg-black/30 text-gray-300 hover:bg-gray-600'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Liquid ({LIQUID_STOCKS.length})
                </button>
                <button
                  onClick={() => setStockSelection('ALL')}
                  disabled={loading}
                  className={`flex-1 px-4 py-2 rounded font-semibold transition ${
                    stockSelection === 'ALL'
                      ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                      : 'backdrop-blur-md bg-black/30 text-gray-300 hover:bg-gray-600'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  All ({ALL_INDONESIAN_STOCKS.length})
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {stockSelection === 'LIQUID' ? 'Fast scan - High volume stocks' : 'Complete scan - All IDX stocks'}
              </p>
            </div>

            {/* Timeframe Selection */}
            <div>
              <label className="flex text-sm font-semibold mb-2 items-center gap-2">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Timeframe</span>
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTimeframe('5m')}
                  disabled={loading}
                  className={`flex-1 px-4 py-2 rounded font-semibold transition ${
                    timeframe === '5m'
                      ? 'bg-green-600 text-white ring-2 ring-green-400'
                      : 'backdrop-blur-md bg-black/30 text-gray-300 hover:bg-gray-600'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  5 Min
                </button>
                <button
                  onClick={() => setTimeframe('15m')}
                  disabled={loading}
                  className={`flex-1 px-4 py-2 rounded font-semibold transition ${
                    timeframe === '15m'
                      ? 'bg-green-600 text-white ring-2 ring-green-400'
                      : 'backdrop-blur-md bg-black/30 text-gray-300 hover:bg-gray-600'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  15 Min
                </button>
              </div>
            </div>

            {/* Sort By */}
            <div>
              <label className="flex text-sm font-semibold mb-2 items-center gap-2">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
                <span>Sort By</span>
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                disabled={loading}
                className="w-full px-4 py-2 backdrop-blur-md bg-black/30 border border-gray-600 rounded text-white"
              >
                <option value="momentum">Momentum</option>
                <option value="power">Candle Power</option>
                <option value="volatility">Volatility</option>
              </select>
            </div>

            {/* Filter Entry Type */}
            <div>
              <label className="flex text-sm font-semibold mb-2 items-center gap-2">
                <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span>Filter</span>
              </label>
              <select
                value={filterEntry}
                onChange={(e) => setFilterEntry(e.target.value as any)}
                disabled={loading}
                className="w-full px-4 py-2 backdrop-blur-md bg-black/30 border border-gray-600 rounded text-white"
              >
                <option value="ALL">All Signals</option>
                <option value="SNIPER">Sniper Only</option>
                <option value="BREAKOUT">Breakout Only</option>
              </select>
            </div>
          </div>

          {/* Scan Button */}
          <button
            onClick={scanStocks}
            disabled={loading}
            className={`w-full mt-4 px-6 py-3 rounded-xl font-bold text-lg transition flex items-center justify-center gap-2 shadow-lg ${
              loading
                ? 'backdrop-blur-md bg-gray-500/20 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white shadow-green-500/30'
            }`}
          >
            {loading ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Scanning {stockSelection === 'LIQUID' ? 'Liquid' : 'All'} Stocks... {progress}%</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Scan {SCALP_STOCKS.length} {stockSelection === 'LIQUID' ? 'Liquid' : ''} Stocks</span>
              </>
            )}
          </button>

          {loading && (
            <div className="mt-3">
              <div className="w-full backdrop-blur-md bg-black/30 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl p-4 mb-6 shadow-2xl">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Signal Guide — Wyckoff + VSA + CPP
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="backdrop-blur-md bg-orange-500/10 border border-orange-500/30 p-3 rounded-xl">
              <div className="font-bold text-orange-300 mb-1">🔥 HAKA COOLDOWN</div>
              <div className="text-gray-300 text-xs">
                Prior aggressive markup candle (Vol &gt;1.8x, green, body &gt;55%) then 2-8 cooldown bars with sell volume &lt;40%. Still above MA20. Ready to resume markup!
              </div>
            </div>
            <div className="backdrop-blur-md bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl">
              <div className="font-bold text-yellow-400 mb-1">🎯 SCALP SNIPER</div>
              <div className="text-gray-300 text-xs">
                VCP Pivot (RMV≤20) + Dry Up + above MA20 + CPP bullish. Wyckoff No Supply near support. Highest probability intraday entry.
              </div>
            </div>
            <div className="backdrop-blur-md bg-green-500/10 border border-green-500/20 p-3 rounded-xl">
              <div className="font-bold text-green-400 mb-1">⚡ SCALP BREAKOUT</div>
              <div className="text-gray-300 text-xs">
                High volume breakout (Vol &gt;2x) + green body &gt;75% + above MA20 + CPP Bullish. Wyckoff Sign of Strength. Momentum entry.
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="bg-white/5 rounded p-2"><span className="text-green-400 font-bold">CPP +</span> = Next candle bullish bias</div>
            <div className="bg-white/5 rounded p-2"><span className="text-red-400 font-bold">CPP -</span> = Next candle bearish bias</div>
            <div className="bg-white/5 rounded p-2"><span className="text-blue-400 font-bold">MARKUP</span> = Wyckoff uptrend phase</div>
            <div className="bg-white/5 rounded p-2"><span className="text-blue-400 font-bold">ACCUM</span> = Wyckoff base building</div>
          </div>
        </div>

        {/* Results */}
        {filteredResults.length > 0 && (
          <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {filteredResults.length} Scalp Opportunities ({timeframe})
              </h2>
              <span className="text-xs text-gray-400">Sorted by {sortBy}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="text-left py-3 px-3 text-gray-400">Ticker</th>
                    <th className="text-right py-3 px-3 text-gray-400">Price</th>
                    <th className="text-right py-3 px-3 text-gray-400">Change</th>
                    <th className="text-center py-3 px-3 text-gray-400">Entry</th>
                    <th className="text-center py-3 px-3 text-gray-400">Power</th>
                    <th className="text-center py-3 px-3 text-gray-400 hidden sm:table-cell">CPP</th>
                    <th className="text-center py-3 px-3 text-gray-400 hidden md:table-cell">Wyckoff</th>
                    <th className="text-right py-3 px-3 text-gray-400 hidden md:table-cell">Mom%</th>
                    <th className="text-left py-3 px-3 text-gray-400 hidden lg:table-cell">Signal</th>
                    <th className="text-center py-3 px-3 text-gray-400">Chart</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((r, idx) => (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition">
                      <td className="py-3 px-3 font-bold text-white">
                        <div className="flex items-center gap-2">
                          {r.isHakaReady && (
                            <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30 animate-pulse">
                              🔥 HAKA
                            </span>
                          )}
                          {r.symbol}
                        </div>
                        <div className="text-xs text-gray-400 sm:hidden">{r.signal}</div>
                      </td>
                      <td className="py-3 px-3 text-right text-white">
                        Rp {r.price.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className={r.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {r.changePercent >= 0 ? '+' : ''}{r.changePercent.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          r.entry === 'SNIPER'   ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                          r.entry === 'BREAKOUT' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                                                   'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        }`}>
                          {r.entry}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded font-bold text-xs ${
                          r.candlePower >= 85 ? 'bg-green-900/50 text-green-300' :
                          r.candlePower >= 70 ? 'bg-blue-900/50 text-blue-300' :
                          r.candlePower >= 55 ? 'bg-yellow-900/50 text-yellow-300' :
                                                'bg-gray-800 text-gray-400'
                        }`}>
                          {r.candlePower}
                        </span>
                      </td>
                      {/* CPP bias */}
                      <td className="py-3 px-3 text-center hidden sm:table-cell">
                        <span className={`text-xs font-bold ${
                          r.cppBias === 'BULLISH' ? 'text-green-400' :
                          r.cppBias === 'BEARISH' ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {r.cppBias === 'BULLISH' ? '📈' : r.cppBias === 'BEARISH' ? '📉' : '➡️'}
                          {r.cppScore !== undefined ? ` ${r.cppScore > 0 ? '+' : ''}${r.cppScore.toFixed(2)}` : ''}
                        </span>
                      </td>
                      {/* Wyckoff */}
                      <td className="py-3 px-3 text-center hidden md:table-cell">
                        <span className={`text-xs ${
                          r.wyckoff === 'MARKUP'       ? 'text-green-400' :
                          r.wyckoff === 'ACCUMULATION' ? 'text-blue-400' :
                          r.wyckoff === 'MARKDOWN'     ? 'text-red-400' : 'text-yellow-400'
                        }`}>
                          {r.wyckoff}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right hidden md:table-cell">
                        <span className={r.momentum >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {r.momentum >= 0 ? '+' : ''}{r.momentum.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-300 hidden lg:table-cell text-xs max-w-xs truncate">
                        {r.signal}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Link
                          href={`/?symbol=${r.symbol}&interval=${r.timeframe}&scalpSignal=${r.entry || ''}&scalpLabel=${encodeURIComponent(r.signal.replace(/%/g, 'pct'))}`}
                          className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs transition"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && results.length === 0 && (
          <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl p-12 text-center shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center border border-green-500/30">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Ready to Scan</h3>
            <p className="text-gray-400 mb-1">Select timeframe and click Scan to find scalping opportunities</p>
            <p className="text-sm text-gray-500">Using VSA + VCP momentum detection algorithm</p>
          </div>
        )}
      </div>
    </div>
  );
}
