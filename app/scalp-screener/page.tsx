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
          console.log(`? ${ticker}: ${analysis.signal} (Power: ${analysis.candlePower}, Mom: ${analysis.momentum}%)`);
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
        console.error(`? Error scanning ${ticker}:`, err);
        errorCount++;
      }

      setProgress(Math.round(((idx + 1) / SCALP_STOCKS.length) * 100));
    }

    console.log(`?? Scan complete: ${scannedCount} stocks scanned, ${newResults.length} opportunities found, ${errorCount} errors`);
    setLoading(false);
  };

  const analyzeScalpingOpportunity = (data: any[]): any => {
    const N = data.length;
    if (N < 40) return { entry: null };

    // Extract OHLCV data
    const closes: number[] = [];
    const opens: number[] = [];
    const highs: number[] = [];
    const lows: number[] = [];
    const volumes: number[] = [];

    for (let i = 0; i < data.length; i++) {
      if (data[i].close !== null && data[i].volume > 0) {
        closes.push(data[i].close);
        opens.push(data[i].open);
        highs.push(data[i].high);
        lows.push(data[i].low);
        volumes.push(data[i].volume);
      }
    }

    const n = closes.length;
    if (n < 40) return { entry: null };

    // Look for best signal in last 5 candles (matching AppScript logic)
    let bestSignal = "";
    let barsAgo = 0;
    let finalVolRatio = 0;
    let finalAccRatio = 0;

    for (let c = n - 5; c < n; c++) {
      // Calculate MA20 for this candle
      const sma20Slice = closes.slice(c - 19, c + 1);
      const sma20 = sma20Slice.reduce((a, b) => a + b, 0) / 20;

      // Calculate 20-period volume and spread average
      let volAvg20 = 0;
      let spreadSum20 = 0;
      for (let i = c - 20; i < c; i++) {
        volAvg20 += volumes[i];
        spreadSum20 += (highs[i] - lows[i]);
      }
      volAvg20 /= 20;
      const spreadAvg20 = spreadSum20 / 20;

      const currentVol = volumes[c];
      const volRatio = currentVol / (volAvg20 || 1);

      const priceHigh = highs[c];
      const priceLow = lows[c];
      const priceClose = closes[c];
      const priceOpen = opens[c];

      const candleSpread = priceHigh - priceLow;
      const bodySpread = Math.abs(priceClose - priceOpen);
      const isGreen = priceClose > priceOpen;
      const bodyPosition = candleSpread === 0 ? 0 : (priceClose - priceLow) / candleSpread;

      // Calculate accumulation ratio (last 10 candles)
      let buyVol = 0;
      let sellVol = 0;
      for (let i = c - 9; i <= c; i++) {
        if (closes[i] > opens[i]) buyVol += volumes[i];
        else if (closes[i] < opens[i]) sellVol += volumes[i];
      }
      const accRatio = buyVol / (sellVol === 0 ? 1 : sellVol);
      const spreadRatio = candleSpread / (spreadAvg20 || 1);

      // VCP detection (matching AppScript)
      const highest30 = Math.max(...highs.slice(c - 29, c + 1));
      const isNearHigh = priceClose > (highest30 * 0.85);

      let spreadSum5 = 0;
      let volSum5 = 0;
      for (let i = c - 5; i < c; i++) {
        spreadSum5 += (highs[i] - lows[i]);
        volSum5 += volumes[i];
      }
      const isVCP = isNearHigh && (spreadSum5 / 5 < spreadAvg20 * 0.65) && (volSum5 / 5 < volAvg20 * 0.75);

      // Pattern detection (EXACTLY matching AppScript SCREENER_SCALP_5M)
      const isMicroDryUp = (!isGreen || bodySpread < candleSpread * 0.2) && (volRatio < 0.35) && (accRatio > 1.2);
      const isScalpBreakout = isGreen && (volRatio > 2.5) && (bodyPosition > 0.8) && priceClose > sma20;
      const isMicroIceberg = (volRatio > 1.5) && (spreadRatio < 0.5);
      const isScalpDump = (!isGreen && volRatio > 2.5 && (bodySpread > candleSpread * 0.6));

      const upperWick = priceHigh - Math.max(priceOpen, priceClose);
      const isShootingStar = (volRatio > 2 && (upperWick / (candleSpread || 1) > 0.5));

      // Signal priority (matching AppScript order)
      let signal = "";
      if (isScalpDump) signal = "?? SCALP DUMP";
      else if (isShootingStar) signal = "?? PUCUK";
      else if (isVCP && isMicroDryUp) signal = "?? SCALP SNIPER";
      else if (isScalpBreakout) signal = "? SCALP BREAKOUT";
      else if (isMicroIceberg) signal = "?? MICRO ICEBERG";
      else if (isMicroDryUp) signal = "?? MICRO DRY UP";

      if (signal !== "") {
        bestSignal = signal;
        barsAgo = (n - 1) - c;
        finalVolRatio = volRatio;
        finalAccRatio = accRatio;
      }
    }

    if (bestSignal === "") return { entry: null };

    // Determine entry type based on signal
    let entry: 'SNIPER' | 'BREAKOUT' | 'WATCH' | null = null;
    if (bestSignal.includes('SNIPER')) entry = 'SNIPER';
    else if (bestSignal.includes('BREAKOUT')) entry = 'BREAKOUT';
    else if (bestSignal.includes('DUMP') || bestSignal.includes('PUCUK')) entry = null; // Bearish - skip
    else entry = 'WATCH'; // ICEBERG, DRY UP

    const current = data[n - 1];

    // Calculate momentum (last 10 candles)
    const momentum = ((closes[n - 1] - closes[n - 10]) / closes[n - 10]) * 100;

    // Calculate volatility (ATR)
    let atrSum = 0;
    for (let i = n - 14; i < n; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      atrSum += tr;
    }
    const atr = atrSum / 14;
    const volatility = (atr / closes[n - 1]) * 100;

    // Calculate candle power based on AppScript logic
    const spread = current.high - current.low;
    const body = Math.abs(current.close - current.open);
    const isGreenCurrent = current.close >= current.open;
    const closePos = spread > 0 ? (current.close - current.low) / spread : 0.5;

    let candlePower = 50;
    if (finalVolRatio > 1.5 && isGreenCurrent && closePos > 0.7) {
      candlePower = 85 + (finalVolRatio * 3);
    } else if (finalVolRatio < 0.4 && finalAccRatio > 1.2) {
      candlePower = 92; // Dry up with accumulation
    } else if (finalVolRatio > 2.5 && spread < atr * 0.6) {
      candlePower = 88; // Iceberg
    } else if (isGreenCurrent && finalVolRatio > 1.2) {
      candlePower = 70 + (closePos * 15);
    } else if (!isGreenCurrent && finalVolRatio < 0.6) {
      candlePower = 30;
    }

    candlePower = Math.max(0, Math.min(100, Math.round(candlePower)));
    candlePower = Math.max(0, Math.min(100, Math.round(candlePower)));

    const timeText = barsAgo === 0 ? "(Now!)" : `(${barsAgo} bars ago)`;
    const reason = `${bestSignal} ${timeText} - Vol: ${finalVolRatio.toFixed(1)}x, Acc: ${finalAccRatio.toFixed(1)}x`;

    return {
      entry,
      signal: bestSignal,
      momentum: parseFloat(momentum.toFixed(2)),
      candlePower,
      volume: parseFloat(finalVolRatio.toFixed(2)),
      volatility: parseFloat(volatility.toFixed(2)),
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
      <nav className="bg-gray-800 border-b border-gray-700 px-3 md:px-6 py-3 md:py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl md:text-2xl font-bold">
              ? Scalp Screener
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
              ?? VCP
            </Link>
            <Link
              href="/"
              className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm transition"
            >
              ?? Chart
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
              <label className="block text-sm font-semibold mb-2">?? Stocks</label>
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
              <label className="block text-sm font-semibold mb-2">?? Timeframe</label>
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
              <label className="block text-sm font-semibold mb-2">?? Sort By</label>
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
              <label className="block text-sm font-semibold mb-2">?? Filter</label>
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
            className={`w-full mt-4 px-6 py-3 rounded font-bold text-lg transition ${
              loading
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white shadow-lg'
            }`}
          >
            {loading
              ? `?? Scanning ${stockSelection === 'LIQUID' ? 'Liquid' : 'All'} Stocks... ${progress}%`
              : `?? Scan ${SCALP_STOCKS.length} ${stockSelection === 'LIQUID' ? 'Liquid' : ''} Stocks`}
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
            Signal Guide - Scalp Logic
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="backdrop-blur-md bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl">
              <div className="font-bold text-yellow-400 mb-1 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                SCALP SNIPER
              </div>
              <div className="text-gray-300 text-xs">
                VCP + Micro Dry Up. Volume &lt; 35%, Acc &gt; 1.2x. Perfect base building - sniper entry!
              </div>
            </div>
            <div className="backdrop-blur-md bg-black/30 p-3 rounded">
              <div className="font-bold text-green-400 mb-1">? SCALP BREAKOUT</div>
              <div className="text-gray-300 text-xs">
                Green candle, Vol &gt; 2.5x, close &gt; 80% range, above MA20. Strong breakout - fast trade!
              </div>
            </div>
            <div className="backdrop-blur-md bg-black/30 p-3 rounded">
              <div className="font-bold text-blue-400 mb-1">?? MICRO ICEBERG</div>
              <div className="text-gray-300 text-xs">
                Vol &gt; 1.5x, narrow spread &lt; 50% avg. Hidden accumulation - watch closely!
              </div>
            </div>
            <div className="backdrop-blur-md bg-black/30 p-3 rounded">
              <div className="font-bold text-cyan-400 mb-1">?? MICRO DRY UP</div>
              <div className="text-gray-300 text-xs">
                Low vol &lt; 35%, small body, Acc &gt; 1.2x. Professional accumulation - good setup!
              </div>
            </div>
            <div className="backdrop-blur-md bg-black/30 p-3 rounded">
              <div className="font-bold text-red-400 mb-1">?? SCALP DUMP</div>
              <div className="text-gray-300 text-xs">
                Red candle, Vol &gt; 2.5x, big body. Heavy selling - avoid or short!
              </div>
            </div>
            <div className="backdrop-blur-md bg-black/30 p-3 rounded">
              <div className="font-bold text-orange-400 mb-1">?? PUCUK (Shooting Star)</div>
              <div className="text-gray-300 text-xs">
                Vol &gt; 2x, long upper wick. Distribution at top - bearish reversal!
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        {loading && results.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin text-4xl mb-4">??</div>
            <div className="text-xl">Scanning {SCALP_STOCKS.length} {stockSelection === 'LIQUID' ? 'liquid ' : ''}stocks...</div>
            <div className="text-sm text-gray-400 mt-2">Analyzing {timeframe} charts for sniper entries</div>
            <div className="text-lg text-green-400 mt-3 font-bold">{progress}%</div>
          </div>
        )}

        {!loading && results.length === 0 && (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">??</div>
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
                          {result.changePercent >= 0 ? '?' : '?'} {Math.abs(result.changePercent).toFixed(2)}%
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
                        <span className="px-3 py-1 backdrop-blur-md bg-black/30 rounded text-sm">
                          Power: <span className="font-bold text-green-400">{result.candlePower}</span>
                        </span>
                        <span className="px-3 py-1 backdrop-blur-md bg-black/30 rounded text-sm">
                          Momentum: <span className={`font-bold ${result.momentum > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {result.momentum > 0 ? '+' : ''}{result.momentum}%
                          </span>
                        </span>
                        <span className="px-3 py-1 backdrop-blur-md bg-black/30 rounded text-sm">
                          Vol: <span className="font-bold">{result.volume}x</span>
                        </span>
                      </div>

                      <div className="text-sm text-gray-400">
                        ?? {result.reason}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div>
                      <Link
                        href={`/?symbol=${result.symbol}&interval=${timeframe}`}
                        className="block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded font-bold text-center transition whitespace-nowrap"
                      >
                        ?? View Chart
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

