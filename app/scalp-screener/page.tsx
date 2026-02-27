'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ScalpResult {
  symbol: string;
  price: number;
  changePercent: number;
  timeframe: '5m' | '15m';
  runGainPct: number;
  runBars: number;
  calmBars: number;
  pullbackPct: number;
  sellVolRatio: number;
  accRatio: number;
  volRatio: number;
  cppScore: number;
  cppBias: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
  powerScore: number;
  rmv: number;
  aboveMA20: boolean;
  aboveMA50: boolean;
  vsaSignal: string;
  grade: 'A+' | 'A' | 'B';
  entryType: 'SNIPER' | 'WATCH';
  stopLoss: number;
  target: number;
  reason: string;
}

// ── Liquid stocks (need liquidity for 5m/15m) ────────────────────────────────
const LIQUID_STOCKS = [
  'BBCA','BBRI','BMRI','BBNI','BBTN','BJBR','BJTM','PNBN','BDMN','BNGA',
  'ASII','TLKM','UNVR','ICBP','INDF','HMSP','GGRM','KLBF','SIDO','MYOR',
  'ADRO','ANTM','PTBA','INCO','MDKA','AMMN','TINS','BRPT','MEDC','ESSA',
  'BSDE','SMRA','CTRA','PWON','LPKR','WIKA','PTPP','WSKT','TOTL','ADHI',
  'EXCL','ISAT','LINK','TOWR','TBIG','DCII','EMTK','MNCN','SCMA',
  'AMRT','LPPF','MAPI','ERAA','ACES','RALS','SOCI','GOOD','CPIN',
  'HEAL','MIKA','KAEF','DVLA','TSPC','PEHA',
  'ARTO','GOTO','BUKA','BREN','TPIA','AKRA','UNTR','SRTG','INKP','TKIM',
  'FIRE','LAJU','BULL','NCKL','CPRO','EDGE','FILM','BEER','BOGA','DNET',
  'UVCR','LAND','KOTA','MDLN','LPCK','PANI','PGAS','JSMR','SMGR','INTP',
];

const ALL_INDONESIAN_STOCKS = [
  'AADI','AALI','ABBA','ABDA','ABMM','ACES','ACRO','ACST','ADCP','ADES',
  'ADHI','ADMF','ADMG','ADMR','ADRO','AEGS','AGAR','AGII','AGRO','AGRS',
  'AHAP','AIMS','AISA','AKKU','AKPI','AKRA','AKSI','ALDO','ALII','ALKA',
  'ALMI','ALTO','AMAG','AMAN','AMAR','AMFG','AMIN','AMMN','AMMS','AMOR',
  'AMRT','ANDI','ANJT','ANTM','APEX','APIC','APII','APLI','APLN','ARCI',
  'AREA','ARGO','ARII','ARKA','ARKO','ARMY','ARNA','ARTA','ARTI','ARTO',
  'ASBI','ASDM','ASGR','ASHA','ASII','ASJT','ASLC','ASLI','ASMI','ASPI',
  'ASPR','ASRI','ASRM','ASSA','ATAP','ATIC','ATLA','AUTO','AVIA','AWAN',
  'AXIO','AYAM','AYLS','BABP','BABY','BACA','BAIK','BAJA','BALI','BANK',
  'BBCA','BBHI','BBKP','BBLD','BBMD','BBNI','BBRI','BBRM','BBSI','BBSS',
  'BBTN','BBYB','BCAP','BCIC','BCIP','BDKR','BDMN','BEBS','BEEF','BEER',
  'BEKS','BELI','BELL','BESS','BEST','BFIN','BGTG','BHAT','BHIT','BIKA',
  'BIKE','BIMA','BINA','BINO','BIPI','BIPP','BIRD','BISI','BJBR','BJTM',
  'BKDP','BKSL','BKSW','BLES','BLOG','BLTA','BLTZ','BLUE','BMAS','BMBL',
  'BMHS','BMRI','BMSR','BMTR','BNBA','BNBR','BNGA','BNII','BNLI','BOAT',
  'BOBA','BOGA','BOLA','BOLT','BOSS','BPFI','BPII','BPTR','BRAM','BREN',
  'BRIS','BRMS','BRNA','BRPT','BRRC','BSBK','BSDE','BSIM','BSML','BSSR',
  'BSWD','BTEK','BTEL','BTON','BTPN','BTPS','BUAH','BUDI','BUKA','BUKK',
  'BULL','BUMI','BUVA','BVIC','BWPT','BYAN','CAKK','CAMP','CANI','CARE',
  'CARS','CASA','CASH','CASS','CBDK','CBMF','CBPE','CBRE','CBUT','CCSI',
  'CDIA','CEKA','CENT','CFIN','CGAS','CHEK','CHEM','CHIP','CINT','CITA',
  'CITY','CLAY','CLEO','CLPI','CMNP','CMNT','CMPP','CMRY','CNKO','CNMA',
  'CNTB','CNTX','COAL','COCO','COIN','COWL','CPIN','CPRI','CPRO','CRAB',
  'CRSN','CSAP','CSIS','CSMI','CSRA','CTBN','CTRA','CTTH','CUAN','CYBR',
  'DAAZ','DADA','DART','DATA','DAYA','DCII','DEAL','DEFI','DEPO','DEWA',
  'DEWI','DFAM','DGIK','DGNS','DGWG','DIGI','DILD','DIVA','DKFT','DKHH',
  'DLTA','DMAS','DMMX','DMND','DNAR','DNET','DOID','DOOH','DOSS','DPNS',
  'DPUM','DRMA','DSFI','DSNG','DSSA','DUCK','DUTI','DVLA','DWGL','DYAN',
  'EAST','ECII','EDGE','EKAD','ELIT','ELPI','ELSA','ELTY','EMAS','EMDE',
  'EMTK','ENAK','ENRG','ENVY','ENZO','EPAC','EPMT','ERAA','ERAL','ERTX',
  'ESIP','ESSA','ESTA','ESTI','ETWA','EURO','EXCL','FAPA','FAST','FASW',
  'FILM','FIMP','FIRE','FISH','FITT','FLMC','FMII','FOLK','FOOD','FORE',
  'FORU','FPNI','FUJI','FUTR','FWCT','GAMA','GDST','GDYR','GEMA','GEMS',
  'GGRM','GGRP','GHON','GIAA','GJTL','GLOB','GLVA','GMFI','GMTD','GOLD',
  'GOLF','GOLL','GOOD','GOTO','GPRA','GPSO','GRIA','GRPH','GRPM','GSMF',
  'GTBO','GTRA','GTSI','GULA','GUNA','GWSA','GZCO','HADE','HAIS','HAJJ',
  'HALO','HATM','HBAT','HDFA','HDIT','HEAL','HELI','HERO','HEXA','HGII',
  'HILL','HITS','HKMU','HMSP','HOKI','HOME','HOMI','HOPE','HOTL','HRME',
  'HRTA','HRUM','HUMI','HYGN','IATA','IBFN','IBOS','IBST','ICBP','ICON',
  'IDEA','IDPR','IFII','IFSH','IGAR','IIKP','IKAI','IKAN','IKBI','IKPM',
  'IMAS','IMJS','IMPC','INAF','INAI','INCF','INCI','INCO','INDF','INDO',
  'INDR','INDS','INDX','INDY','INET','INKP','INOV','INPC','INPP','INPS',
  'INRU','INTA','INTD','INTP','IOTF','IPAC','IPCC','IPCM','IPOL','IPPE',
  'IPTV','IRRA','IRSX','ISAP','ISAT','ISEA','ISSP','ITIC','ITMA','ITMG',
  'JARR','JAST','JATI','JAWA','JAYA','JECC','JGLE','JIHD','JKON','JMAS',
  'JPFA','JRPT','JSKY','JSMR','JSPT','JTPE','KAEF','KAQI','KARW','KAYU',
  'KBAG','KBLI','KBLM','KBLV','KBRI','KDSI','KDTN','KEEN','KEJU','KETR',
  'KIAS','KICI','KIJA','KING','KINO','KIOS','KJEN','KKES','KKGI','KLAS',
  'KLBF','KLIN','KMDS','KMTR','KOBX','KOCI','KOIN','KOKA','KONI','KOPI',
  'KOTA','KPIG','KRAS','KREN','KRYA','KSIX','KUAS','LABA','LABS','LAJU',
  'LAND','LAPD','LCGP','LCKM','LEAD','LFLO','LIFE','LINK','LION','LIVE',
  'LMAS','LMAX','LMPI','LMSH','LOPI','LPCK','LPGI','LPIN','LPKR','LPLI',
  'LPPF','LPPS','LRNA','LSIP','LTLS','LUCK','LUCY','MABA','MAGP','MAHA',
  'MAIN','MANG','MAPA','MAPB','MAPI','MARI','MARK','MASB','MAXI','MAYA',
  'MBAP','MBMA','MBSS','MBTO','MCAS','MCOL','MCOR','MDIA','MDIY','MDKA',
  'MDKI','MDLA','MDLN','MDRN','MEDC','MEDS','MEGA','MEJA','MENN','MERI',
  'MERK','META','MFMI','MGLV','MGNA','MGRO','MHKI','MICE','MIDI','MIKA',
  'MINA','MINE','MIRA','MITI','MKAP','MKNT','MKPI','MKTR','MLBI','MLIA',
  'MLPL','MLPT','MMIX','MMLP','MNCN','MOLI','MORA','MPIX','MPMX','MPOW',
  'MPPA','MPRO','MPXL','MRAT','MREI','MSIE','MSIN','MSJA','MSKY','MSTI',
  'MTDL','MTEL','MTFN','MTLA','MTMH','MTPS','MTRA','MTSM','MTWI','MUTU',
  'MYOH','MYOR','MYTX','NAIK','NANO','NASA','NASI','NATO','NAYZ','NCKL',
  'NELY','NEST','NETV','NFCX','NICE','NICK','NICL','NIKL','NINE','NIRO',
  'NISP','NOBU','NPGF','NRCA','NSSS','NTBK','NUSA','NZIA','OASA','OBAT',
  'OBMD','OCAP','OILS','OKAS','OLIV','OMED','OMRE','OPMS','PACK','PADA',
  'PADI','PALM','PAMG','PANI','PANR','PANS','PART','PBID','PBRX','PBSA',
  'PCAR','PDES','PDPP','PEGE','PEHA','PEVE','PGAS','PGEO','PGJO','PGLI',
  'PGUN','PICO','PIPA','PJAA','PJHB','PKPK','PLAN','PLAS','PLIN','PMJS',
  'PMMP','PMUI','PNBN','PNBS','PNGO','PNIN','PNLF','PNSE','POLA','POLI',
  'POLL','POLU','POLY','POOL','PORT','POSA','POWR','PPGL','PPRE','PPRI',
  'PPRO','PRAY','PRDA','PRIM','PSAB','PSAT','PSDN','PSGO','PSKT','PSSI',
  'PTBA','PTDU','PTIS','PTMP','PTMR','PTPP','PTPS','PTPW','PTRO','PTSN',
  'PTSP','PUDP','PURA','PURE','PURI','PWON','PYFA','PZZA','RAAM','RAFI',
  'RAJA','RALS','RANC','RATU','RBMS','RCCC','RDTX','REAL','RELF','RELI',
  'RGAS','RICY','RIGS','RIMO','RISE','RLCO','RMKE','RMKO','ROCK','RODA',
  'RONY','ROTI','RSCH','RSGK','RUIS','RUNS','SAFE','SAGE','SAME','SAMF',
  'SAPX','SATU','SBAT','SBMA','SCCO','SCMA','SCNP','SCPI','SDMU','SDPC',
  'SDRA','SEMA','SFAN','SGER','SGRO','SHID','SHIP','SICO','SIDO','SILO',
  'SIMA','SIMP','SINI','SIPD','SKBM','SKLT','SKRN','SKYB','SLIS','SMAR',
  'SMBR','SMCB','SMDM','SMDR','SMGA','SMGR','SMIL','SMKL','SMKM','SMLE',
  'SMMA','SMMT','SMRA','SMRU','SMSM','SNLK','SOCI','SOFA','SOHO','SOLA',
  'SONA','SOSS','SOTS','SOUL','SPMA','SPRE','SPTO','SQMI','SRAJ','SRIL',
  'SRSN','SRTG','SSIA','SSMS','SSTM','STAA','STAR','STRK','STTP','SUGI',
  'SULI','SUNI','SUPA','SUPR','SURE','SURI','SWAT','SWID','TALF','TAMA',
  'TAMU','TAPG','TARA','TAXI','TAYS','TBIG','TBLA','TBMS','TCID','TCPI',
  'TDPM','TEBE','TECH','TELE','TFAS','TFCO','TGKA','TGRA','TGUK','TIFA',
  'TINS','TIRA','TIRT','TKIM','TLDN','TLKM','TMAS','TMPO','TNCA','TOBA',
  'TOOL','TOPS','TOSK','TOTL','TOTO','TOWR','TOYS','TPIA','TPMA','TRAM',
  'TRGU','TRIL','TRIM','TRIN','TRIO','TRIS','TRJA','TRON','TRST','TRUE',
  'TRUK','TRUS','TSPC','TUGU','TYRE','UANG','UCID','UDNG','UFOE','ULTJ',
  'UNIC','UNIQ','UNIT','UNSP','UNTD','UNTR','UNVR','URBN','UVCR','VAST',
  'VERN','VICI','VICO','VINS','VISI','VIVA','VKTR','VOKS','VRNA','VTNY',
  'WAPO','WEGE','WEHA','WGSH','WICO','WIDI','WIFI','WIIM','WIKA','WINE',
  'WINR','WINS','WIRG','WMPP','WMUU','WOMF','WOOD','WOWS','WSBP','WSKT',
  'WTON','YELO','YOII','YPAS','YULE','YUPI','ZATA','ZBRA','ZINC','ZONE','ZYRX',
];

// ── Math helpers ──────────────────────────────────────────────────────────────
function calcSMA(arr: number[], period: number, i: number): number {
  if (i < period - 1) return 0;
  let s = 0;
  for (let j = i - period + 1; j <= i; j++) s += arr[j];
  return s / period;
}

function calcATR(H: number[], L: number[], C: number[], period: number, i: number): number {
  if (i < period) return H[i] - L[i];
  let s = 0;
  for (let j = i - period + 1; j <= i; j++) {
    const pc = C[j - 1] ?? C[j];
    s += Math.max(H[j] - L[j], Math.abs(H[j] - pc), Math.abs(L[j] - pc));
  }
  return s / period;
}

function calcCPP(C: number[], O: number[], H: number[], L: number[], V: number[], i: number): number {
  if (i < 14) return 0;
  let vsum = 0;
  for (let k = 0; k < 10; k++) vsum += V[i - k];
  const vma = vsum / 10 || 1;
  let score = 0;
  for (let j = 0; j < 5; j++) {
    const k = i - j;
    const rng = H[k] - L[k] || 0.0001;
    const cbd = (C[k] - O[k]) / rng;
    score += cbd * (V[k] / vma) * ((5 - j) / 5);
  }
  return score;
}

function calcRMV(H: number[], L: number[], C: number[], i: number): number {
  if (i < 25) return 50;
  const vals: number[] = [];
  for (let k = i - 19; k <= i; k++) vals.push(calcATR(H, L, C, 5, k));
  const cur = vals[vals.length - 1];
  const mn = Math.min(...vals), mx = Math.max(...vals);
  if (mx === mn) return 50;
  return ((cur - mn) / (mx - mn)) * 100;
}

// ── Intraday Scalp Screener Core ──────────────────────────────────────────────
// Analyzes 5m or 15m candles to find:
//   PHASE 1: HAKA Spike — price up >=minGain% in <=8 bars, volume >=1.3× avg
//   PHASE 2: Calmdown — 2-15 bars after spike, pullback <=45%, sell vol <55%
//   PHASE 3: Power — CPP bullish, above MA20, acc > dist, RMV contracting
function screenIntraday(
  data: any[],
  tf: '5m' | '15m'
): Omit<ScalpResult, 'symbol' | 'price' | 'changePercent' | 'timeframe'> | null {
  const C: number[] = [], O: number[] = [], H: number[] = [], L: number[] = [], V: number[] = [];
  for (const d of data) {
    if (d.close !== null && d.volume > 0) {
      C.push(d.close); O.push(d.open); H.push(d.high); L.push(d.low); V.push(d.volume);
    }
  }
  const n = C.length;
  const minBars = tf === '5m' ? 100 : 40;
  if (n < minBars) return null;

  const i = n - 1;
  const minSpikeGain = tf === '5m' ? 1.5 : 2.0;
  const lookWindow = Math.min(30, n - 1);

  let volSum30 = 0, spSum30 = 0;
  for (let k = i - lookWindow + 1; k <= i; k++) {
    volSum30 += V[k];
    spSum30  += H[k] - L[k];
  }
  const volAvg30 = volSum30 / lookWindow;
  const spAvg30  = spSum30  / lookWindow;

  const atr14   = calcATR(H, L, C, 14, i);
  const rmvVal  = calcRMV(H, L, C, i);
  const cppRaw  = calcCPP(C, O, H, L, V, i);
  const cppBias: 'BULLISH' | 'NEUTRAL' | 'BEARISH' =
    cppRaw > 0.3 ? 'BULLISH' : cppRaw < -0.3 ? 'BEARISH' : 'NEUTRAL';
  const cppScore   = parseFloat(cppRaw.toFixed(2));
  const powerScore = Math.max(0, Math.min(100, Math.round(50 + (cppRaw / 1.5) * 45)));
  const ma20val    = calcSMA(C, 20, i);
  const ma50val    = calcSMA(C, 50, i);

  let buyVol = 0, sellVolTen = 0;
  for (let k = Math.max(0, i - 9); k <= i; k++) {
    if (C[k] > O[k]) buyVol += V[k];
    else if (C[k] < O[k]) sellVolTen += V[k];
  }
  const accRatio  = buyVol / (sellVolTen || 1);
  const volRatioI = V[i] / (volAvg30 || 1);

  // Gate 0: basic filters
  if (cppBias === 'BEARISH') return null;
  if (C[i] < ma20val * 0.995) return null;
  if (accRatio < 0.8) return null;

  // Gate 1: find HAKA spike in last 25 bars
  let spikeFoundAt = -1;
  let spikeGain    = 0;
  let spikeBars    = 0;

  for (let peakIdx = i - 2; peakIdx >= Math.max(0, i - 25); peakIdx--) {
    const isLocalHigh = (peakIdx + 2 <= i)
      ? H[peakIdx] >= H[peakIdx + 1] && H[peakIdx] >= H[peakIdx + 2]
      : true;
    if (!isLocalHigh) continue;

    for (let baseIdx = peakIdx - 1; baseIdx >= Math.max(0, peakIdx - 8); baseIdx--) {
      const gain = ((H[peakIdx] - L[baseIdx]) / (L[baseIdx] || 1)) * 100;
      if (gain >= minSpikeGain) {
        let spikeVol = 0;
        const barCount = peakIdx - baseIdx + 1;
        for (let k = baseIdx; k <= peakIdx; k++) spikeVol += V[k];
        if ((spikeVol / barCount) >= volAvg30 * 1.3) {
          spikeFoundAt = peakIdx;
          spikeGain    = gain;
          spikeBars    = barCount;
          break;
        }
      }
    }
    if (spikeFoundAt >= 0) break;
  }

  if (spikeFoundAt < 0) return null;

  // Gate 2: calmdown state
  const calmBars = i - spikeFoundAt;
  if (calmBars < 2 || calmBars > 15) return null;

  const spikeHighPrice = H[spikeFoundAt];
  const spikeBasePrice = C[Math.max(0, spikeFoundAt - spikeBars)];
  const spikePriceMove = spikeHighPrice - spikeBasePrice;
  const retracement    = spikeHighPrice - C[i];
  const pullbackPct    = spikePriceMove > 0 ? (retracement / spikePriceMove) * 100 : 100;
  if (pullbackPct > 45) return null;

  let cdSellVol = 0, cdTotalVol = 0, cdSpreadSum = 0;
  for (let k = spikeFoundAt + 1; k <= i; k++) {
    cdTotalVol  += V[k];
    cdSpreadSum += H[k] - L[k];
    if (C[k] < O[k]) cdSellVol += V[k];
  }
  const sellVolRatio = cdTotalVol > 0 ? cdSellVol / cdTotalVol : 0;
  const avgCdSpread  = calmBars > 0 ? cdSpreadSum / calmBars : H[i] - L[i];
  if (sellVolRatio >= 0.55) return null;

  const isSpreadContracting = avgCdSpread < spAvg30 * 0.9;

  // Gate 3: power signals
  const hasPower1 = cppBias === 'BULLISH';
  const hasPower2 = accRatio >= 1.2;
  const hasPower3 = rmvVal <= 55;
  const hasPower4 = sellVolRatio < 0.35;
  const hasPower5 = C[i] > ma20val && C[i] > ma50val;
  const powerCount = [hasPower1, hasPower2, hasPower3, hasPower4, hasPower5].filter(Boolean).length;
  if (powerCount < 2) return null;

  // VSA pattern on current bar
  const curSpread = H[i] - L[i];
  const curBody   = Math.abs(C[i] - O[i]);
  const isGreen   = C[i] >= O[i];
  const lWick     = Math.min(O[i], C[i]) - L[i];
  const uWick     = H[i] - Math.max(O[i], C[i]);

  const isPinbar  = uWick > curBody * 2 && lWick < curBody * 0.5 && !isGreen;
  if (isPinbar && (uWick / (curSpread || 1)) > 0.6) return null;

  const isDryUp   = (!isGreen || curBody < curSpread * 0.3) && volRatioI <= 0.70;
  const isNSup    = !isGreen && curSpread < atr14 && volRatioI < 0.80;
  const isIceberg = volRatioI > 1.1 && (curSpread / (spAvg30 || 1)) < 0.80 && accRatio > 1.1;
  const isHammer  = lWick > curBody && uWick < curBody * 0.8 && (lWick / (curSpread || 1)) > 0.4;

  let vsaSignal = 'NEUTRAL';
  if (isDryUp)        vsaSignal = 'DRY UP';
  else if (isNSup)    vsaSignal = 'NO SUPPLY';
  else if (isIceberg) vsaSignal = 'ICEBERG';
  else if (isHammer)  vsaSignal = 'HAMMER';

  const hasBullVSA    = ['DRY UP','NO SUPPLY','ICEBERG','HAMMER'].includes(vsaSignal);
  const isVCPIntraday = isSpreadContracting && rmvVal <= 50 && sellVolRatio < 0.40;

  // Grading
  let grade: 'A+' | 'A' | 'B';
  let entryType: 'SNIPER' | 'WATCH';

  if (powerCount >= 4 && hasBullVSA && isVCPIntraday) {
    grade = 'A+'; entryType = 'SNIPER';
  } else if (powerCount >= 3 && hasBullVSA) {
    grade = 'A';  entryType = 'SNIPER';
  } else if (powerCount >= 3 && isVCPIntraday) {
    grade = 'A';  entryType = 'SNIPER';
  } else if (powerCount >= 2 && hasBullVSA) {
    grade = 'A';  entryType = 'SNIPER';
  } else if (powerCount >= 2 && isVCPIntraday) {
    grade = 'B';  entryType = 'WATCH';
  } else if (powerCount >= 2 && cppBias === 'BULLISH') {
    grade = 'B';  entryType = 'WATCH';
  } else {
    return null;
  }

  const calmMins = calmBars * (tf === '5m' ? 5 : 15);
  const parts: string[] = [
    `Spike +${spikeGain.toFixed(1)}% in ${spikeBars} bars`,
    `Calm ${calmMins}min (${calmBars} bars)`,
    `Pullback ${pullbackPct.toFixed(0)}% of spike`,
    `Sell vol ${Math.round(sellVolRatio * 100)}%`,
  ];
  if (hasBullVSA)            parts.push(vsaSignal);
  if (isVCPIntraday)         parts.push(`VCP RMV=${Math.round(rmvVal)}`);
  if (cppBias === 'BULLISH') parts.push(`CPP +${cppScore}`);
  if (accRatio >= 1.2)       parts.push(`Acc ${accRatio.toFixed(1)}x`);

  const calmLow  = Math.min(...C.slice(spikeFoundAt + 1, i + 1));
  const tpMult   = grade === 'A+' ? 2.5 : grade === 'A' ? 2.0 : 1.5;

  return {
    runGainPct:  spikeGain,
    runBars:     spikeBars,
    calmBars,
    pullbackPct,
    sellVolRatio,
    accRatio,
    volRatio:    volRatioI,
    cppScore,
    cppBias,
    powerScore,
    rmv:         rmvVal,
    aboveMA20:   C[i] > ma20val,
    aboveMA50:   C[i] > ma50val,
    vsaSignal,
    grade,
    entryType,
    stopLoss: parseFloat((calmLow - atr14 * 0.5).toFixed(0)),
    target:   parseFloat((C[i] + atr14 * tpMult).toFixed(0)),
    reason:   parts.join(' · '),
  };
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ScalpScreener() {
  const router = useRouter();
  const [results, setResults]           = useState<ScalpResult[]>([]);
  const [loading, setLoading]           = useState(false);
  const [progress, setProgress]         = useState(0);
  const [scannedCount, setScannedCount] = useState(0);
  const [tfMode, setTfMode]             = useState<'5m' | '15m'>('15m');
  const [stockMode, setStockMode]       = useState<'LIQUID' | 'ALL'>('LIQUID');
  const [sortBy, setSortBy]             = useState<'grade' | 'power' | 'spike' | 'calm'>('grade');
  const [filterGrade, setFilterGrade]   = useState<'ALL' | 'A+' | 'A' | 'B'>('ALL');
  const abortRef = useRef(false);

  const stockList = stockMode === 'LIQUID' ? LIQUID_STOCKS : ALL_INDONESIAN_STOCKS;
  const tfRange   = tfMode === '5m' ? '20d' : '60d';

  const doSort = (arr: ScalpResult[], by: string): ScalpResult[] =>
    [...arr].sort((a, b) => {
      if (by === 'grade') {
        const g: Record<string, number> = { 'A+': 0, 'A': 1, 'B': 2 };
        const d = g[a.grade] - g[b.grade];
        return d !== 0 ? d : b.cppScore - a.cppScore;
      }
      if (by === 'power') return b.powerScore - a.powerScore;
      if (by === 'spike') return b.runGainPct - a.runGainPct;
      return a.calmBars - b.calmBars; // calm: fewer = more urgent
    });

  const startScan = async () => {
    setLoading(true);
    setResults([]);
    setProgress(0);
    setScannedCount(0);
    abortRef.current = false;
    const found: ScalpResult[] = [];
    let scanned = 0;
    // Deduplicate stock list to avoid duplicate React keys
    const uniqueStocks = [...new Set(stockList)];

    for (let idx = 0; idx < uniqueStocks.length; idx++) {
      if (abortRef.current) break;
      const ticker = uniqueStocks[idx];
      try {
        const symbol  = `${ticker}.JK`;
        const histRes = await fetch(`/api/stock/historical?symbol=${symbol}&interval=${tfMode}&range=${tfRange}`);
        if (!histRes.ok) { setProgress(Math.round(((idx + 1) / uniqueStocks.length) * 100)); continue; }
        const histData = await histRes.json();
        const candles  = histData.candles ?? histData.data ?? [];
        const minReq   = tfMode === '5m' ? 100 : 40;
        if (candles.length < minReq) { setProgress(Math.round(((idx + 1) / uniqueStocks.length) * 100)); continue; }

        scanned++;
        setScannedCount(scanned);

        const analysis = screenIntraday(candles, tfMode);
        if (analysis) {
          // Skip if symbol already in results (dedup guard)
          if (found.some(f => f.symbol === ticker)) {
            setProgress(Math.round(((idx + 1) / uniqueStocks.length) * 100));
            continue;
          }
          const qRes = await fetch(`/api/stock/quote?symbol=${symbol}`);
          const q    = qRes.ok ? await qRes.json() : null;
          const result: ScalpResult = {
            ...analysis,
            symbol:        ticker,
            price:         q?.regularMarketPrice ?? q?.price ?? candles[candles.length - 1]?.close ?? 0,
            changePercent: q?.regularMarketChangePercent ?? q?.changePercent ?? 0,
            timeframe:     tfMode,
          };
          found.push(result);
          setResults(doSort([...found], sortBy));
        }
      } catch { /* skip */ }
      setProgress(Math.round(((idx + 1) / uniqueStocks.length) * 100));
    }
    setLoading(false);
  };

  const stopScan  = () => { abortRef.current = true; setLoading(false); };
  const handleSort = (by: typeof sortBy) => { setSortBy(by); setResults(prev => doSort(prev, by)); };
  const filtered  = filterGrade === 'ALL' ? results : results.filter(r => r.grade === filterGrade);

  const gradeCfg = {
    'A+': { bg: 'bg-emerald-500/15', border: 'border-emerald-500/50', text: 'text-emerald-300', badge: 'bg-emerald-600' },
    'A':  { bg: 'bg-cyan-500/10',    border: 'border-cyan-500/40',    text: 'text-cyan-300',    badge: 'bg-cyan-600' },
    'B':  { bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30',  text: 'text-yellow-300',  badge: 'bg-yellow-600' },
  };
  const vsaColor: Record<string, string> = {
    'DRY UP':    'text-cyan-400',
    'NO SUPPLY': 'text-cyan-400',
    'ICEBERG':   'text-blue-400',
    'HAMMER':    'text-yellow-400',
    'NEUTRAL':   'text-gray-500',
  };
  const barsPerDay = tfMode === '5m' ? 78 : 26;
  const tfLabel    = tfMode === '5m' ? '5 menit' : '15 menit';
  const minGainLbl = tfMode === '5m' ? '1.5' : '2';

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
              </svg>
              Chart
            </Link>
            <span className="text-gray-600">/</span>
            <span className="text-white font-semibold text-sm">⚡ Scalp Screener</span>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/analysis"       className="text-gray-400 hover:text-white">Analysis</Link>
            <Link href="/vcp-screener"   className="text-gray-400 hover:text-white">VCP</Link>
            <Link href="/swing-screener" className="text-gray-400 hover:text-white">Swing</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>⚡</span> Intraday Scalp Screener
            <span className="text-sm font-normal bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full border border-yellow-500/30">
              {tfLabel} candles
            </span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Mencari saham yang baru saja <span className="text-yellow-400 font-medium">markup agresif (HAKA spike)</span> di
            timeframe {tfLabel}, sekarang <span className="text-cyan-400">cooldown sehat</span> — siap untuk leg naik berikutnya.
            Target hold: <span className="text-white font-medium">30 menit – 2 jam</span>.
          </p>
        </div>

        {/* Strategy explainer */}
        <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-xl p-4">
          <div className="text-indigo-300 font-medium text-sm mb-3">
            📖 Screener Logic — {barsPerDay} candle/hari di {tfLabel} timeframe
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-300">
            <div className="flex gap-2">
              <span className="text-yellow-400 font-bold text-lg shrink-0">①</span>
              <div>
                <div className="text-white font-medium mb-0.5">HAKA Spike Terdeteksi</div>
                Harga naik ≥{minGainLbl}% dalam ≤8 candle {tfLabel} disertai volume ≥1.3× rata-rata.
                Ini markup agresif institusi — bukan noise biasa.
              </div>
            </div>
            <div className="flex gap-2">
              <span className="text-cyan-400 font-bold text-lg shrink-0">②</span>
              <div>
                <div className="text-white font-medium mb-0.5">Calmdown Sehat (Napas)</div>
                2–15 candle setelah spike peak. Pullback ≤45% dari spike move.
                Sell vol &lt;55%, spread menyempit — saham konsolidasi, bukan distribusi.
              </div>
            </div>
            <div className="flex gap-2">
              <span className="text-emerald-400 font-bold text-lg shrink-0">③</span>
              <div>
                <div className="text-white font-medium mb-0.5">Power Masih Kuat</div>
                CPP bullish + di atas MA20 + akumulasi dominan + RMV mengecil.
                VSA signal (Dry Up / No Supply / Iceberg) = sniper entry.
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Timeframe */}
          <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
            {(['5m','15m'] as const).map(tf => (
              <button key={tf} onClick={() => { setTfMode(tf); setResults([]); setScannedCount(0); }}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${tfMode === tf ? 'bg-yellow-500 text-gray-900' : 'text-gray-400 hover:text-white'}`}>
                {tf === '5m' ? '⚡' : '🕒'} {tf}
              </button>
            ))}
          </div>

          {/* Stock mode */}
          <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
            {(['LIQUID','ALL'] as const).map(m => (
              <button key={m} onClick={() => setStockMode(m)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${stockMode === m ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                {m === 'LIQUID' ? `⚡ Liquid (${LIQUID_STOCKS.length})` : `📊 All (${ALL_INDONESIAN_STOCKS.length})`}
              </button>
            ))}
          </div>

          {/* Grade filter */}
          <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
            {(['ALL','A+','A','B'] as const).map(g => (
              <button key={g} onClick={() => setFilterGrade(g)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filterGrade === g ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                {g}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select value={sortBy} onChange={e => handleSort(e.target.value as typeof sortBy)}
            className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-3 py-2 focus:outline-none">
            <option value="grade">Sort: Grade</option>
            <option value="power">Sort: Power Score</option>
            <option value="spike">Sort: Spike Size</option>
            <option value="calm">Sort: Most Recent</option>
          </select>

          {/* Scan / Stop */}
          <button onClick={loading ? stopScan : startScan}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm transition-colors ml-auto ${loading ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-yellow-500 hover:bg-yellow-400 text-gray-900'}`}>
            {loading ? (
              <><svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>Stop</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>Scan {tfMode}</>
            )}
          </button>
        </div>

        {/* Progress */}
        {loading && (
          <div className="bg-gray-800/60 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">
                Scanning <span className="text-yellow-400 font-bold">{tfMode}</span> — {scannedCount}/{stockList.length} stocks
              </span>
              <span className="text-gray-400">{progress}%</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}/>
            </div>
            {results.length > 0 && <div className="text-xs text-emerald-400">⚡ {results.length} scalp setups found</div>}
          </div>
        )}

        {/* Results count */}
        {!loading && results.length > 0 && (
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm text-gray-400">
              <span className="text-white font-bold">{filtered.length}</span> intraday scalp setups ({tfMode})
            </div>
            <div className="flex gap-2 text-xs">
              {(['A+','A','B'] as const).map(g => {
                const cnt = results.filter(r => r.grade === g).length;
                if (!cnt) return null;
                const c = gradeCfg[g];
                return <span key={g} className={`px-2 py-1 rounded-lg border ${c.border} ${c.bg} ${c.text} font-medium`}>{g}: {cnt}</span>;
              })}
            </div>
          </div>
        )}

        {/* Empty after scan */}
        {!loading && results.length === 0 && scannedCount > 0 && (
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-10 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <div className="text-white font-medium text-lg">Tidak ada scalp setup saat ini</div>
            <div className="text-gray-400 text-sm mt-1.5 max-w-md mx-auto">
              {scannedCount} saham dianalisis candle {tfMode}. Tidak ada HAKA spike + calmdown valid.
              Coba timeframe <span className="text-yellow-400">{tfMode === '5m' ? '15m' : '5m'}</span> atau tunggu market lebih aktif.
            </div>
          </div>
        )}

        {/* Initial state */}
        {!loading && results.length === 0 && scannedCount === 0 && (
          <div className="bg-gray-800/30 border border-gray-700/40 rounded-xl p-10 text-center">
            <div className="text-5xl mb-4">⚡</div>
            <div className="text-white font-medium text-xl">Scalp Screener Siap</div>
            <div className="text-gray-400 text-sm mt-2 max-w-lg mx-auto">
              Klik <span className="text-yellow-400 font-bold">Scan {tfMode}</span> untuk menemukan saham dengan
              <span className="text-yellow-400"> HAKA spike</span> di candle {tfLabel} yang sedang
              <span className="text-cyan-400"> cooldown</span> dengan volume jual rendah.
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs text-gray-500">
              <span className="bg-gray-800 px-3 py-1.5 rounded-full">📊 {barsPerDay} candle {tfMode}/hari IDX</span>
              <span className="bg-gray-800 px-3 py-1.5 rounded-full">🎯 Spike ≥{minGainLbl}% dalam ≤8 candle</span>
              <span className="bg-gray-800 px-3 py-1.5 rounded-full">⏱️ Calmdown 2–15 candle setelah spike</span>
              <span className="bg-gray-800 px-3 py-1.5 rounded-full">🔋 Min 2 dari 5 power signals</span>
            </div>
          </div>
        )}

        {/* Results */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((r, idx) => {
              const cfg     = gradeCfg[r.grade];
              const rrRatio = r.price > r.stopLoss
                ? Math.abs(r.target - r.price) / Math.abs(r.price - r.stopLoss)
                : null;
              const calmMins = r.calmBars * (r.timeframe === '5m' ? 5 : 15);

              return (
                <div key={`${r.symbol}-${idx}`} className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4 space-y-3 hover:shadow-lg transition-all`}>
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-bold text-lg">{r.symbol}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold text-white ${cfg.badge}`}>{r.grade}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${r.entryType === 'SNIPER' ? 'bg-orange-500/15 border-orange-500/30 text-orange-300' : 'bg-purple-500/15 border-purple-500/30 text-purple-300'}`}>
                          {r.entryType === 'SNIPER' ? '🎯 Sniper' : '👁️ Watch'}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 font-mono">{r.timeframe}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-white font-medium">Rp {r.price.toLocaleString('id-ID')}</span>
                        <span className={`text-xs ${r.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {r.changePercent >= 0 ? '+' : ''}{r.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-yellow-400 font-bold text-lg">+{r.runGainPct.toFixed(1)}%</div>
                      <div className="text-gray-500 text-xs">spike ({r.runBars} bars)</div>
                    </div>
                  </div>

                  {/* Spike → Calm → Next visual */}
                  <div className="bg-gray-900/60 rounded-lg p-2.5 grid grid-cols-3 gap-1 text-center text-xs">
                    <div>
                      <div className="text-gray-500 mb-0.5">📈 Spike</div>
                      <div className="text-yellow-300 font-bold">+{r.runGainPct.toFixed(1)}%</div>
                      <div className="text-gray-600">{r.runBars} bars</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-0.5">🌙 Calm</div>
                      <div className="text-cyan-300 font-bold">{calmMins}min</div>
                      <div className="text-gray-600">{r.calmBars} bars</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-0.5">🎯 Signal</div>
                      <div className={`font-bold ${r.cppBias === 'BULLISH' ? 'text-emerald-400' : 'text-gray-300'}`}>
                        {r.cppBias === 'BULLISH' ? '🚀 GO' : '⏳ WAIT'}
                      </div>
                      <div className="text-gray-600">CPP {r.cppScore > 0 ? '+' : ''}{r.cppScore}</div>
                    </div>
                  </div>

                  {/* Metrics row */}
                  <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                    <div className="bg-gray-900/60 rounded-lg p-2">
                      <div className="text-gray-500">Pullback</div>
                      <div className={`font-bold ${r.pullbackPct < 25 ? 'text-emerald-400' : r.pullbackPct < 38 ? 'text-yellow-400' : 'text-orange-400'}`}>
                        {r.pullbackPct.toFixed(0)}%
                      </div>
                    </div>
                    <div className="bg-gray-900/60 rounded-lg p-2">
                      <div className="text-gray-500">Sell Vol</div>
                      <div className={`font-bold ${r.sellVolRatio < 0.25 ? 'text-emerald-400' : r.sellVolRatio < 0.40 ? 'text-yellow-400' : 'text-orange-400'}`}>
                        {Math.round(r.sellVolRatio * 100)}%
                      </div>
                    </div>
                    <div className="bg-gray-900/60 rounded-lg p-2">
                      <div className="text-gray-500">Power</div>
                      <div className={`font-bold ${r.powerScore >= 70 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                        {r.powerScore}
                      </div>
                    </div>
                  </div>

                  {/* VSA + MA + Acc */}
                  <div className="flex items-center justify-between text-xs px-0.5">
                    <div>
                      <span className="text-gray-500">VSA </span>
                      <span className={`font-semibold ${vsaColor[r.vsaSignal] ?? 'text-gray-400'}`}>{r.vsaSignal}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">MA </span>
                      <span className={`font-semibold ${r.aboveMA20 ? 'text-emerald-400' : 'text-red-400'}`}>{r.aboveMA20 ? '✓' : '✗'}20 </span>
                      <span className={`font-semibold ${r.aboveMA50 ? 'text-emerald-400' : 'text-red-400'}`}>{r.aboveMA50 ? '✓' : '✗'}50</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Acc </span>
                      <span className={`font-semibold ${r.accRatio >= 1.5 ? 'text-emerald-400' : r.accRatio >= 1.0 ? 'text-yellow-400' : 'text-red-400'}`}>{r.accRatio.toFixed(1)}x</span>
                    </div>
                    <div>
                      <span className="text-gray-500">RMV </span>
                      <span className={`font-semibold ${r.rmv <= 30 ? 'text-emerald-400' : r.rmv <= 50 ? 'text-yellow-400' : 'text-gray-300'}`}>{Math.round(r.rmv)}</span>
                    </div>
                  </div>

                  {/* SL / R:R / TP */}
                  <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-1.5">
                      <div className="text-red-400 font-medium">Stop Loss</div>
                      <div className="text-white">{r.stopLoss.toLocaleString('id-ID')}</div>
                    </div>
                    <div className="bg-gray-800/60 rounded-lg p-1.5 flex flex-col items-center justify-center">
                      {rrRatio ? (
                        <><div className="text-gray-500">R:R</div>
                        <div className={`font-bold ${rrRatio >= 2 ? 'text-emerald-400' : rrRatio >= 1.5 ? 'text-yellow-400' : 'text-orange-400'}`}>1:{rrRatio.toFixed(1)}</div></>
                      ) : <span className="text-gray-600">—</span>}
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-1.5">
                      <div className="text-emerald-400 font-medium">Target</div>
                      <div className="text-white">{r.target.toLocaleString('id-ID')}</div>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="text-xs text-gray-400 bg-gray-900/50 rounded-lg px-2.5 py-2 leading-relaxed">{r.reason}</div>

                  {/* Buttons */}
                  <div className="flex gap-2">
                    <button onClick={() => router.push(`/?symbol=${r.symbol}&timeframe=${r.timeframe}`)}
                      className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-gray-900 text-xs py-2 rounded-lg font-bold transition-colors flex items-center justify-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/>
                      </svg>
                      Chart {r.timeframe}
                    </button>
                    <button onClick={() => router.push(`/analysis?symbol=${r.symbol}`)}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                      </svg>
                      Analisis
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4 text-xs space-y-3">
          <div className="text-gray-500 font-medium uppercase tracking-wide">Panduan Grade & Signal</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-gray-300">
            <div>
              <div className="text-emerald-400 font-bold mb-1">A+ — Sniper Entry</div>
              <div className="text-gray-400">4-5 power signals + VSA + VCP intraday. Entry langsung, SL di bawah calmdown low.</div>
            </div>
            <div>
              <div className="text-cyan-400 font-bold mb-1">A — Sniper / High Prob</div>
              <div className="text-gray-400">3+ power + VSA atau spread kontraksi. Entry saat candle konfirmasi hijau + volume.</div>
            </div>
            <div>
              <div className="text-yellow-400 font-bold mb-1">B — Watch / Siap Entry</div>
              <div className="text-gray-400">2 power + CPP bullish. Tunggu 1 candle konfirmasi sebelum masuk.</div>
            </div>
          </div>
          <div className="pt-2 border-t border-gray-700/50 grid grid-cols-2 sm:grid-cols-4 gap-2 text-gray-400">
            <div><span className="text-cyan-400 font-medium">DRY UP</span> — volume mengering, seller habis</div>
            <div><span className="text-cyan-400 font-medium">NO SUPPLY</span> — candle merah vol rendah</div>
            <div><span className="text-blue-400 font-medium">ICEBERG</span> — akumulasi tersembunyi</div>
            <div><span className="text-yellow-400 font-medium">HAMMER</span> — ekor panjang, demand kuat</div>
          </div>
          <div className="pt-2 border-t border-gray-700/50 text-gray-500">
            <span className="text-white font-medium">⚠️</span> Screener ini menggunakan data historis {tfMode} dari Yahoo Finance.
            IDX market open 09:00–15:00 WIB. Konfirmasi dengan volume real-time sebelum entry.
            Untuk swing 1–5 hari gunakan <Link href="/swing-screener" className="text-blue-400 underline">Swing Screener</Link>.
          </div>
        </div>

      </div>
    </div>
  );
}

