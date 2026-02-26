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
          console.log(`❌ Failed to fetch ${ticker}: ${histRes.status}`);
          errorCount++;
          setProgress(Math.round(((idx + 1) / SCALP_STOCKS.length) * 100));
          continue;
        }

        const histData = await histRes.json();
        if (!histData.data || histData.data.length < 50) {
          console.log(`⚠️ ${ticker}: Insufficient data (${histData.data?.length || 0} candles)`);
          setProgress(Math.round(((idx + 1) / SCALP_STOCKS.length) * 100));
          continue;
        }

        scannedCount++;

        // Fetch quote for current price
        const quoteRes = await fetch(`/api/stock/quote?symbol=${symbol}`);
        if (!quoteRes.ok) {
          console.log(`❌ Failed to fetch quote for ${ticker}`);
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
        console.error(`❌ Error scanning ${ticker}:`, err);
        errorCount++;
      }

      setProgress(Math.round(((idx + 1) / SCALP_STOCKS.length) * 100));
    }

    console.log(`📊 Scan complete: ${scannedCount} stocks scanned, ${newResults.length} opportunities found, ${errorCount} errors`);
    setLoading(false);
  };

  const analyzeScalpingOpportunity = (data: any[]): any => {
    const N = data.length;
    if (N < 50) return { entry: null };

    // Calculate indicators for scalping
    const closes = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const volumes = data.map(d => d.volume || 0);

    // Recent 20 candles for analysis
    const recentVolumes = volumes.slice(-20);
    const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / 20;

    // Current candle
    const current = data[N - 1];
    const volRatio = current.volume / (avgVolume || 1);

    // Calculate momentum (rate of change)
    const momentum = ((closes[N - 1] - closes[N - 10]) / closes[N - 10]) * 100;

    // Calculate MA20 for trend
    let sum20 = 0;
    for (let i = N - 20; i < N; i++) {
      sum20 += closes[i];
    }
    const ma20 = sum20 / 20;

    // Calculate volatility (ATR-like)
    let atrSum = 0;
    for (let i = N - 14; i < N; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      atrSum += tr;
    }
    const atr = atrSum / 14;
    const volatility = (atr / closes[N - 1]) * 100;

    // Candle Power Score (Wyckoff-based)
    const spread = current.high - current.low;
    const body = Math.abs(current.close - current.open);
    const isGreen = current.close >= current.open;
    const closePos = spread > 0 ? (current.close - current.low) / spread : 0.5;
    const lowerWick = Math.min(current.open, current.close) - current.low;

    // Calculate buying/selling pressure
    let buyVol = 0;
    let sellVol = 0;
    for (let k = N - 10; k < N; k++) {
      if (data[k].close > data[k].open) buyVol += data[k].volume || 0;
      else if (data[k].close < data[k].open) sellVol += data[k].volume || 0;
    }
    const accRatio = buyVol / (sellVol || 1);

    let candlePower = 50;

    // High volume + green + close near high = Strength
    if (volRatio > 1.5 && isGreen && closePos > 0.7) {
      candlePower = 85 + (volRatio * 5);
    }
    // Low volume + hammer at MA = Accumulation (SNIPER!)
    else if (volRatio < 0.7 && lowerWick > body * 0.5 && current.close >= ma20 && current.low < ma20) {
      candlePower = 92;
    }
    // Volume spike + narrow spread = Absorption
    else if (volRatio > 2 && spread < (atr * 0.8)) {
      candlePower = 88;
    }
    // Normal conditions
    else if (isGreen && volRatio > 1) {
      candlePower = 65 + (closePos * 20);
    } else if (!isGreen && volRatio < 0.8) {
      candlePower = 35 - (closePos * 10);
    }

    candlePower = Math.max(0, Math.min(100, Math.round(candlePower)));

    // Calculate momentum characteristics for scalping
    // Recent momentum acceleration (last 3 vs previous 3 candles)
    let recentMom = 0;
    let prevMom = 0;
    if (N >= 10) {
      recentMom = ((closes[N - 1] - closes[N - 4]) / closes[N - 4]) * 100;
      prevMom = ((closes[N - 4] - closes[N - 7]) / closes[N - 7]) * 100;
    }
    const momentumAccelerating = recentMom > prevMom && recentMom > 0.5;

    // Volume increasing (comparing recent 3 vs previous 3)
    let recentVolAvg = 0;
    let prevVolAvg = 0;
    for (let i = N - 3; i < N; i++) recentVolAvg += volumes[i];
    for (let i = N - 6; i < N - 3; i++) prevVolAvg += volumes[i];
    recentVolAvg /= 3;
    prevVolAvg /= 3;
    const volumeIncreasing = recentVolAvg > prevVolAvg * 1.2;

    // Price above MA (uptrend)
    const aboveMA = current.close > ma20;

    // Determine entry signal - FOCUS ON MOMENTUM
    let entry: 'SNIPER' | 'BREAKOUT' | 'WATCH' | null = null;
    let signal = '';
    let reason = '';

    // SCALP SNIPER: Early momentum catch (BEST for scalping)
    // Stock starting to move with volume confirmation
    const earlyMomentum = momentum > 0.5 && momentum < 3; // Just starting to move (0.5% to 3%)
    const volumeConfirm = volRatio > 1.2 && volRatio < 3; // Above average but not extreme yet
    const priceStrength = candlePower >= 70; // Decent strength
    const buyingPressure = accRatio > 1.0; // More buying than selling

    if (earlyMomentum && 
        volumeConfirm && 
        aboveMA && 
        (momentumAccelerating || volumeIncreasing) &&
        buyingPressure &&
        priceStrength) {
      entry = 'SNIPER';
      signal = '⚡ SCALP SNIPER';
      reason = `Early momentum detected (Mom: ${momentum.toFixed(1)}%, Vol: ${volRatio.toFixed(1)}x) - Catch before explosion!`;
    }
    // SCALP BREAKOUT: Strong momentum already moving
    // Stock breaking out with strong volume
    else if (momentum > 2 && 
             volRatio > 2.5 && 
             isGreen && 
             candlePower > 75 && 
             aboveMA &&
             closePos > 0.6) {
      entry = 'BREAKOUT';
      signal = '🚀 SCALP BREAKOUT';
      reason = `Strong breakout in progress (Mom: ${momentum.toFixed(1)}%, Vol: ${volRatio.toFixed(1)}x) - Jump in now!`;
    }
    // MOMENTUM BUILDING: Watch for entry
    // Stock showing signs but needs confirmation
    else if (momentum > 0.3 && 
             momentum < 2.5 &&
             volRatio > 1.0 && 
             aboveMA &&
             candlePower > 65 &&
             (momentumAccelerating || volumeIncreasing)) {
      entry = 'WATCH';
      signal = '👀 MOMENTUM BUILDING';
      reason = `Momentum building (Mom: ${momentum.toFixed(1)}%, Vol: ${volRatio.toFixed(1)}x) - Watch for acceleration`;
    }
    // VOLUME SPIKE: Sudden interest
    // Volume surge with positive price action
    else if (volRatio > 3 && 
             momentum > 0 && 
             isGreen && 
             aboveMA) {
      entry = 'BREAKOUT';
      signal = '📢 VOLUME SPIKE';
      reason = `Huge volume spike (${volRatio.toFixed(1)}x) - Major interest detected!`;
    }

    return {
      entry,
      signal,
      momentum: parseFloat(momentum.toFixed(2)),
      candlePower,
      volume: parseFloat(volRatio.toFixed(2)),
      volatility: parseFloat(volatility.toFixed(2)),
      reason,
    };
  };

  const filteredResults = results.filter(r => {
    if (filterEntry === 'ALL') return true;
    return r.entry === filterEntry;
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <nav className="bg-gray-800 border-b border-gray-700 px-3 md:px-6 py-3 md:py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl md:text-2xl font-bold">
              ⚡ Scalp Screener
            </Link>
            <span className="text-xs md:text-sm text-gray-400">
              Intraday Sniper Entries
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/vcp-screener"
              className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-sm transition"
            >
              🎯 VCP
            </Link>
            <Link
              href="/"
              className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm transition"
            >
              📊 Chart
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-3 md:p-6">
        {/* Controls */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Stock Selection */}
            <div>
              <label className="block text-sm font-semibold mb-2">📊 Stocks</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setStockSelection('LIQUID')}
                  disabled={loading}
                  className={`flex-1 px-4 py-2 rounded font-semibold transition ${
                    stockSelection === 'LIQUID'
                      ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
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
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
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
              <label className="block text-sm font-semibold mb-2">⏱️ Timeframe</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTimeframe('5m')}
                  disabled={loading}
                  className={`flex-1 px-4 py-2 rounded font-semibold transition ${
                    timeframe === '5m'
                      ? 'bg-green-600 text-white ring-2 ring-green-400'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
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
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  15 Min
                </button>
              </div>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-semibold mb-2">📊 Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                disabled={loading}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              >
                <option value="momentum">Momentum</option>
                <option value="power">Candle Power</option>
                <option value="volatility">Volatility</option>
              </select>
            </div>

            {/* Filter Entry Type */}
            <div>
              <label className="block text-sm font-semibold mb-2">🎯 Filter</label>
              <select
                value={filterEntry}
                onChange={(e) => setFilterEntry(e.target.value as any)}
                disabled={loading}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
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
            className={`w-full mt-4 px-6 py-3 rounded font-bold text-lg transition ${
              loading
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white shadow-lg'
            }`}
          >
            {loading
              ? `🔄 Scanning ${stockSelection === 'LIQUID' ? 'Liquid' : 'All'} Stocks... ${progress}%`
              : `🚀 Scan ${SCALP_STOCKS.length} ${stockSelection === 'LIQUID' ? 'Liquid' : ''} Stocks`}
          </button>

          {loading && (
            <div className="mt-3">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h3 className="font-bold mb-3">📚 Signal Guide - MOMENTUM FOCUSED:</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-gray-700 p-3 rounded">
              <div className="font-bold text-yellow-400 mb-1">⚡ SCALP SNIPER</div>
              <div className="text-gray-300 text-xs">
                Early momentum 0.5-3% + Volume 1.2-3x. Catch BEFORE explosion! Best entry.
              </div>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <div className="font-bold text-green-400 mb-1">🚀 SCALP BREAKOUT</div>
              <div className="text-gray-300 text-xs">
                Strong momentum 2%+ with volume 2.5x+. Already moving - quick scalp!
              </div>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <div className="font-bold text-purple-400 mb-1">📢 VOLUME SPIKE</div>
              <div className="text-gray-300 text-xs">
                Massive volume 3x+ with positive price. Major interest - investigate!
              </div>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <div className="font-bold text-blue-400 mb-1">👀 MOMENTUM BUILDING</div>
              <div className="text-gray-300 text-xs">
                Momentum 0.3-2.5% accelerating. Watch for entry signal soon.
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        {loading && results.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin text-4xl mb-4">🔄</div>
            <div className="text-xl">Scanning {SCALP_STOCKS.length} {stockSelection === 'LIQUID' ? 'liquid ' : ''}stocks...</div>
            <div className="text-sm text-gray-400 mt-2">Analyzing {timeframe} charts for sniper entries</div>
            <div className="text-lg text-green-400 mt-3 font-bold">{progress}%</div>
          </div>
        )}

        {!loading && results.length === 0 && (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <div className="text-xl mb-2">No scalping opportunities found</div>
            <div className="text-gray-400">
              Try changing timeframe or click scan again. Market may be consolidating.
            </div>
          </div>
        )}

        {filteredResults.length > 0 && (
          <div>
            <div className="mb-4 text-sm text-gray-400">
              Found <span className="text-white font-bold">{filteredResults.length}</span> scalping opportunities on {timeframe} timeframe
              {loading && <span className="ml-2 text-yellow-400">(Still scanning...)</span>}
            </div>

            <div className="grid gap-4">
              {filteredResults.map((result) => (
                <div
                  key={result.symbol}
                  className={`bg-gray-800 rounded-lg p-4 border-l-4 hover:bg-gray-750 transition ${
                    result.entry === 'SNIPER'
                      ? 'border-yellow-400'
                      : result.entry === 'BREAKOUT'
                      ? 'border-green-400'
                      : 'border-blue-400'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Stock Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl font-bold">{result.symbol}</span>
                        <span className="text-xl text-gray-300">
                          Rp {result.price.toLocaleString()}
                        </span>
                        <span
                          className={`text-sm font-semibold ${
                            result.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {result.changePercent >= 0 ? '↑' : '↓'} {Math.abs(result.changePercent).toFixed(2)}%
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-2">
                        <span
                          className={`px-3 py-1 rounded font-bold text-sm ${
                            result.entry === 'SNIPER'
                              ? 'bg-yellow-600 text-black'
                              : result.entry === 'BREAKOUT'
                              ? 'bg-green-600 text-white'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {result.signal}
                        </span>
                        <span className="px-3 py-1 bg-gray-700 rounded text-sm">
                          Power: <span className="font-bold text-green-400">{result.candlePower}</span>
                        </span>
                        <span className="px-3 py-1 bg-gray-700 rounded text-sm">
                          Momentum: <span className={`font-bold ${result.momentum > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {result.momentum > 0 ? '+' : ''}{result.momentum}%
                          </span>
                        </span>
                        <span className="px-3 py-1 bg-gray-700 rounded text-sm">
                          Vol: <span className="font-bold">{result.volume}x</span>
                        </span>
                      </div>

                      <div className="text-sm text-gray-400">
                        💡 {result.reason}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div>
                      <Link
                        href={`/?symbol=${result.symbol}&interval=${timeframe}`}
                        className="block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded font-bold text-center transition whitespace-nowrap"
                      >
                        📊 View Chart
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
