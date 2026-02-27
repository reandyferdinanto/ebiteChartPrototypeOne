'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────
interface CalmdownResult {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  gainFromBase: number;
  cooldownBars: number;
  sellVolRatio: number;
  accRatio: number;
  cppScore: number;
  cppBias: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
  powerScore: number;
  rmv: number;
  volRatio: number;
  momentum10: number;
  ma20: number;
  ma50: number;
  cooldownVSA: string;
  grade: 'A+' | 'A' | 'B';
  entryType: 'SNIPER' | 'BREAKOUT' | 'WATCH';
  reason: string;
  stopLoss: number;
  target: number;
}

// ── Liquid stocks ─────────────────────────────────────────────────────────────
const LIQUID_STOCKS = [
  'BBCA','BBRI','BMRI','BBNI','BBTN','BJBR','BJTM','PNBN','BDMN','BNGA',
  'ASII','TLKM','UNVR','ICBP','INDF','HMSP','GGRM','KLBF','SIDO','MYOR',
  'ADRO','ANTM','PTBA','INCO','MDKA','AMMN','TINS','BRPT','MEDC','ESSA',
  'BSDE','SMRA','CTRA','PWON','LPKR','WIKA','PTPP','WSKT','TOTL','ADHI',
  'EXCL','ISAT','LINK','TOWR','TBIG','DCII','EMTK','MNCN','SCMA',
  'AMRT','LPPF','MAPI','ERAA','ACES','RALS','SOCI','GOOD','CPIN',
  'HEAL','MIKA','KLBF','KAEF','DVLA','TSPC','PEHA',
  'ARTO','GOTO','BUKA','BREN','TPIA','AKRA','UNTR','SRTG','INKP','TKIM',
  'FIRE','LAJU','BULL','NCKL','CPRO','EDGE','FILM','BEER','BOGA','DNET',
  'UVCR','LAND','KOTA','MDLN','LPCK','PANI','PGAS','JSMR','SMGR','INTP',
];

// ── All IDX stocks ─────────────────────────────────────────────────────────────
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
  'BAPA','BAPI','BATA','BATR','BAUT','BAYU','BBCA','BBHI','BBKP','BBLD',
  'BBMD','BBNI','BBRI','BBRM','BBSI','BBSS','BBTN','BBYB','BCAP','BCIC',
  'BCIP','BDKR','BDMN','BEBS','BEEF','BEER','BEKS','BELI','BELL','BESS',
  'BEST','BFIN','BGTG','BHAT','BHIT','BIKA','BIKE','BIMA','BINA','BINO',
  'BIPI','BIPP','BIRD','BISI','BJBR','BJTM','BKDP','BKSL','BKSW','BLES',
  'BLOG','BLTA','BLTZ','BLUE','BMAS','BMBL','BMHS','BMRI','BMSR','BMTR',
  'BNBA','BNBR','BNGA','BNII','BNLI','BOAT','BOBA','BOGA','BOLA','BOLT',
  'BOSS','BPFI','BPII','BPTR','BRAM','BREN','BRIS','BRMS','BRNA','BRPT',
  'BRRC','BSBK','BSDE','BSIM','BSML','BSSR','BSWD','BTEK','BTEL','BTON',
  'BTPN','BTPS','BUAH','BUDI','BUKA','BUKK','BULL','BUMI','BUVA','BVIC',
  'BWPT','BYAN','CAKK','CAMP','CANI','CARE','CARS','CASA','CASH','CASS',
  'CBDK','CBMF','CBPE','CBRE','CBUT','CCSI','CDIA','CEKA','CENT','CFIN',
  'CGAS','CHEK','CHEM','CHIP','CINT','CITA','CITY','CLAY','CLEO','CLPI',
  'CMNP','CMNT','CMPP','CMRY','CNKO','CNMA','CNTB','CNTX','COAL','COCO',
  'COIN','COWL','CPIN','CPRI','CPRO','CRAB','CRSN','CSAP','CSIS','CSMI',
  'CSRA','CTBN','CTRA','CTTH','CUAN','CYBR','DAAZ','DADA','DART','DATA',
  'DAYA','DCII','DEAL','DEFI','DEPO','DEWA','DEWI','DFAM','DGIK','DGNS',
  'DGWG','DIGI','DILD','DIVA','DKFT','DKHH','DLTA','DMAS','DMMX','DMND',
  'DNAR','DNET','DOID','DOOH','DOSS','DPNS','DPUM','DRMA','DSFI','DSNG',
  'DSSA','DUCK','DUTI','DVLA','DWGL','DYAN','EAST','ECII','EDGE','EKAD',
  'ELIT','ELPI','ELSA','ELTY','EMAS','EMDE','EMTK','ENAK','ENRG','ENVY',
  'ENZO','EPAC','EPMT','ERAA','ERAL','ERTX','ESIP','ESSA','ESTA','ESTI',
  'ETWA','EURO','EXCL','FAPA','FAST','FASW','FILM','FIMP','FIRE','FISH',
  'FITT','FLMC','FMII','FOLK','FOOD','FORE','FORU','FPNI','FUJI','FUTR',
  'FWCT','GAMA','GDST','GDYR','GEMA','GEMS','GGRM','GGRP','GHON','GIAA',
  'GJTL','GLOB','GLVA','GMFI','GMTD','GOLD','GOLF','GOLL','GOOD','GOTO',
  'GPRA','GPSO','GRIA','GRPH','GRPM','GSMF','GTBO','GTRA','GTSI',
  'GULA','GUNA','GWSA','GZCO','HADE','HAIS','HAJJ','HALO','HATM','HBAT',
  'HDFA','HDIT','HEAL','HELI','HERO','HEXA','HGII','HILL','HITS','HKMU',
  'HMSP','HOKI','HOME','HOMI','HOPE','HOTL','HRME','HRTA','HRUM','HUMI',
  'HYGN','IATA','IBFN','IBOS','IBST','ICBP','ICON','IDEA','IDPR','IFII',
  'IFSH','IGAR','IIKP','IKAI','IKAN','IKBI','IKPM','IMAS','IMJS','IMPC',
  'INAF','INAI','INCF','INCI','INCO','INDF','INDO','INDR','INDS','INDX',
  'INDY','INET','INKP','INOV','INPC','INPP','INPS','INRU','INTA','INTD',
  'INTP','IOTF','IPAC','IPCC','IPCM','IPOL','IPPE','IPTV','IRRA','IRSX',
  'ISAP','ISAT','ISEA','ISSP','ITIC','ITMA','ITMG','JARR','JAST','JATI',
  'JAWA','JAYA','JECC','JGLE','JIHD','JKON','JMAS','JPFA','JRPT','JSKY',
  'JSMR','JSPT','JTPE','KAEF','KAQI','KARW','KAYU','KBAG','KBLI','KBLM',
  'KBLV','KBRI','KDSI','KDTN','KEEN','KEJU','KETR','KIAS','KICI','KIJA',
  'KING','KINO','KIOS','KJEN','KKES','KKGI','KLAS','KLBF','KLIN','KMDS',
  'KMTR','KOBX','KOCI','KOIN','KOKA','KONI','KOPI','KOTA','KPIG','KRAS',
  'KREN','KRYA','KSIX','KUAS','LABA','LABS','LAJU','LAND','LAPD','LCGP',
  'LCKM','LEAD','LFLO','LIFE','LINK','LION','LIVE','LMAS','LMAX','LMPI',
  'LMSH','LOPI','LPCK','LPGI','LPIN','LPKR','LPLI','LPPF','LPPS','LRNA',
  'LSIP','LTLS','LUCK','LUCY','MABA','MAGP','MAHA','MAIN','MANG','MAPA',
  'MAPB','MAPI','MARI','MARK','MASB','MAXI','MAYA','MBAP','MBMA','MBSS',
  'MBTO','MCAS','MCOL','MCOR','MDIA','MDIY','MDKA','MDKI','MDLA','MDLN',
  'MDRN','MEDC','MEDS','MEGA','MEJA','MENN','MERI','MERK','META','MFMI',
  'MGLV','MGNA','MGRO','MHKI','MICE','MIDI','MIKA','MINA','MINE','MIRA',
  'MITI','MKAP','MKNT','MKPI','MKTR','MLBI','MLIA','MLPL','MLPT','MMIX',
  'MMLP','MNCN','MOLI','MORA','MPIX','MPMX','MPOW','MPPA','MPRO','MPXL',
  'MRAT','MREI','MSIE','MSIN','MSJA','MSKY','MSTI','MTDL','MTEL','MTFN',
  'MTLA','MTMH','MTPS','MTRA','MTSM','MTWI','MUTU','MYOH','MYOR','MYTX',
  'NAIK','NANO','NASA','NASI','NATO','NAYZ','NCKL','NELY','NEST','NETV',
  'NFCX','NICE','NICK','NICL','NIKL','NINE','NIRO','NISP','NOBU','NPGF',
  'NRCA','NSSS','NTBK','NUSA','NZIA','OASA','OBAT','OBMD','OCAP','OILS',
  'OKAS','OLIV','OMED','OMRE','OPMS','PACK','PADA','PADI','PALM','PAMG',
  'PANI','PANR','PANS','PART','PBID','PBRX','PBSA','PCAR','PDES','PDPP',
  'PEGE','PEHA','PEVE','PGAS','PGEO','PGJO','PGLI','PGUN','PICO','PIPA',
  'PJAA','PJHB','PKPK','PLAN','PLAS','PLIN','PMJS','PMMP','PMUI','PNBN',
  'PNBS','PNGO','PNIN','PNLF','PNSE','POLA','POLI','POLL','POLU','POLY',
  'POOL','PORT','POSA','POWR','PPGL','PPRE','PPRI','PPRO','PRAY','PRDA',
  'PRIM','PSAB','PSAT','PSDN','PSGO','PSKT','PSSI','PTBA','PTDU','PTIS',
  'PTMP','PTMR','PTPP','PTPS','PTPW','PTRO','PTSN','PTSP','PUDP','PURA',
  'PURE','PURI','PWON','PYFA','PZZA','RAAM','RAFI','RAJA','RALS','RANC',
  'RATU','RBMS','RCCC','RDTX','REAL','RELF','RELI','RGAS','RICY','RIGS',
  'RIMO','RISE','RLCO','RMKE','RMKO','ROCK','RODA','RONY','ROTI','RSCH',
  'RSGK','RUIS','RUNS','SAFE','SAGE','SAME','SAMF','SAPX','SATU','SBAT',
  'SBMA','SCCO','SCMA','SCNP','SCPI','SDMU','SDPC','SDRA','SEMA','SFAN',
  'SGER','SGRO','SHID','SHIP','SICO','SIDO','SILO','SIMA','SIMP','SINI',
  'SIPD','SKBM','SKLT','SKRN','SKYB','SLIS','SMAR','SMBR','SMCB','SMDM',
  'SMDR','SMGA','SMGR','SMIL','SMKL','SMKM','SMLE','SMMA','SMMT','SMRA',
  'SMRU','SMSM','SNLK','SOCI','SOFA','SOHO','SOLA','SONA','SOSS','SOTS',
  'SOUL','SPMA','SPRE','SPTO','SQMI','SRAJ','SRIL','SRSN','SRTG','SSIA',
  'SSMS','SSTM','STAA','STAR','STRK','STTP','SUGI','SULI','SUNI','SUPA',
  'SUPR','SURE','SURI','SWAT','SWID','TALF','TAMA','TAMU','TAPG','TARA',
  'TAXI','TAYS','TBIG','TBLA','TBMS','TCID','TCPI','TDPM','TEBE','TECH',
  'TELE','TFAS','TFCO','TGKA','TGRA','TGUK','TIFA','TINS','TIRA','TIRT',
  'TKIM','TLDN','TLKM','TMAS','TMPO','TNCA','TOBA','TOOL','TOPS','TOSK',
  'TOTL','TOTO','TOWR','TOYS','TPIA','TPMA','TRAM','TRGU','TRIL','TRIM',
  'TRIN','TRIO','TRIS','TRJA','TRON','TRST','TRUE','TRUK','TRUS','TSPC',
  'TUGU','TYRE','UANG','UCID','UDNG','UFOE','ULTJ','UNIC','UNIQ','UNIT',
  'UNSP','UNTD','UNTR','UNVR','URBN','UVCR','VAST','VERN','VICI','VICO',
  'VINS','VISI','VIVA','VKTR','VOKS','VRNA','VTNY','WAPO','WEGE','WEHA',
  'WGSH','WICO','WIDI','WIFI','WIIM','WIKA','WINE','WINR','WINS','WIRG',
  'WMPP','WMUU','WOMF','WOOD','WOWS','WSBP','WSKT','WTON','YELO','YOII',
  'YPAS','YULE','YUPI','ZATA','ZBRA','ZINC','ZONE','ZYRX',
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
  const lb = 5;
  for (let j = 0; j < lb; j++) {
    const k = i - j;
    const rng = H[k] - L[k] || 0.0001;
    const cbd = (C[k] - O[k]) / rng;
    const vam = V[k] / vma;
    score += cbd * vam * ((lb - j) / lb);
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

// ── Core screener: finds stocks with momentum & calmdown for scalp re-entry ──
// MODES:
//  "CALMDOWN" — already ran ≥3% from last 1-8 bars, now consolidating (original)
//  "TOPGAINER" — strong positive move today (≥3% change), still has power to continue
//
// RELAXED GATES vs previous version:
//  - Min gain lowered from 5% to 3% (catches more setups)
//  - Lookback extended from 5 to 8 bars
//  - momentum10 > -3% (allow slight consolidation, not just pure positive)
//  - accRatio >= 0.8 (was 1.0)
//  - powerCount >= 1 (was 2)
//  - sellVolRatio < 0.55 (was 0.45)
//  - pullbackFromPeak < 7% (was 4%)
function screenStock(
  data: any[],
  todayChangePct: number
): Omit<CalmdownResult, 'symbol' | 'change' | 'changePercent'> | null {
  const C: number[] = [], O: number[] = [], H: number[] = [], L: number[] = [], V: number[] = [];
  for (const d of data) {
    if (d.close !== null && d.volume > 0) {
      C.push(d.close); O.push(d.open); H.push(d.high); L.push(d.low); V.push(d.volume);
    }
  }
  const n = C.length;
  if (n < 60) return null;

  const i = n - 1;

  const ma20val = calcSMA(C, 20, i);
  const ma50val = calcSMA(C, 50, i);
  const atr14   = calcATR(H, L, C, 14, i);
  const rmvVal  = calcRMV(H, L, C, i);
  const cppRaw  = calcCPP(C, O, H, L, V, i);
  const cppBias: 'BULLISH' | 'NEUTRAL' | 'BEARISH' =
    cppRaw > 0.4 ? 'BULLISH' : cppRaw < -0.4 ? 'BEARISH' : 'NEUTRAL';
  const cppScore   = parseFloat(cppRaw.toFixed(2));
  const powerScore = Math.max(0, Math.min(100, Math.round(50 + (cppRaw / 1.5) * 45)));

  // 20-bar averages
  let volSum = 0, spSum = 0;
  for (let k = i - 19; k <= i; k++) { volSum += V[k]; spSum += H[k] - L[k]; }
  const volAvg20 = volSum / 20;
  const spAvg20  = spSum  / 20;

  // 10-bar buy/sell pressure
  let buyVol = 0, sellVolTen = 0;
  for (let k = i - 9; k <= i; k++) {
    if (C[k] > O[k]) buyVol += V[k];
    else if (C[k] < O[k]) sellVolTen += V[k];
  }
  const accRatio   = buyVol / (sellVolTen || 1);
  const volRatioI  = V[i] / (volAvg20 || 1);
  const momentum10 = ((C[i] - C[i - 10]) / C[i - 10]) * 100;

  // ── GATE 0: Hard filters (absolute disqualifiers) ─────────────────────────
  if (momentum10 <= -5)        return null;  // Downtrend — skip
  if (cppBias === 'BEARISH')   return null;  // Selling pressure — skip
  if (accRatio < 0.8)          return null;  // Distribution — skip
  if (C[i] < ma20val * 0.97)   return null;  // Below MA20 by >3% — skip

  // ── GATE 1: Find a run of ≥3% from recent bars (last 1-8 bars) ───────────
  // Also accept top-gainer mode: today's change ≥3% counts as the run
  let baseIdx      = -1;
  let gainFromBase = 0;

  // First check today's actual change (top gainer scenario)
  if (todayChangePct >= 3) {
    // Use yesterday's close as the base
    baseIdx      = i - 1;
    gainFromBase = todayChangePct;
  }

  // Then look for a run that happened in last 1-8 bars
  if (baseIdx < 0) {
    for (let lookback = 1; lookback <= 8; lookback++) {
      const refIdx = i - lookback;
      if (refIdx < 0) continue;
      const gain = ((C[i] - C[refIdx]) / C[refIdx]) * 100;
      if (gain >= 3) {
        baseIdx      = refIdx;
        gainFromBase = gain;
        break;
      }
    }
  }

  // Hard fail: not up ≥3% from any recent bar
  if (baseIdx < 0 || gainFromBase < 3) return null;

  // Find HIGH point since baseIdx (peak of the run)
  let runPeak = C[baseIdx];
  for (let k = baseIdx + 1; k <= i; k++) {
    if (H[k] > runPeak) runPeak = H[k];
  }
  // Must not have pulled back more than 7% from the run peak
  const pullbackFromPeak = ((runPeak - C[i]) / runPeak) * 100;
  if (pullbackFromPeak > 7) return null;

  const cooldownBars = i - baseIdx;
  if (cooldownBars > 10) return null;

  // ── GATE 2: Calmdown quality ─────────────────────────────────────────────
  let cdSellVol = 0, cdTotalVol = 0, cdSpreadSum = 0;
  const cdStart = baseIdx + 1 <= i ? baseIdx + 1 : i;
  for (let k = cdStart; k <= i; k++) {
    cdTotalVol  += V[k];
    cdSpreadSum += H[k] - L[k];
    if (C[k] < O[k]) cdSellVol += V[k];
  }
  const sellVolRatio  = cdTotalVol > 0 ? cdSellVol / cdTotalVol : 0;
  const avgCdSpread   = cooldownBars > 0 ? cdSpreadSum / Math.max(1, cooldownBars) : H[i] - L[i];
  const baseBarSpread = H[baseIdx] - L[baseIdx];
  const isVolContracting = avgCdSpread < baseBarSpread * 0.9 || avgCdSpread < spAvg20 * 0.85;

  // Sell vol during calmdown must be < 55%
  if (cooldownBars > 0 && sellVolRatio >= 0.55) return null;
  // Price must hold ≥93% of the base close
  if (C[i] < C[baseIdx] * 0.93) return null;

  // ── GATE 3: Power confirmation (need at least 1 signal) ──────────────────
  const hasPower1 = cppBias === 'BULLISH';
  const hasPower2 = accRatio >= 1.2;
  const hasPower3 = rmvVal <= 55;
  const hasPower4 = momentum10 >= 3;  // Extra: positive momentum bonus
  const hasPower5 = todayChangePct >= 3; // Top gainer today
  const powerCount = [hasPower1, hasPower2, hasPower3, hasPower4, hasPower5].filter(Boolean).length;
  if (powerCount < 2) return null;

  // ── VSA pattern on current candle ─────────────────────────────────────────
  const curSpread = H[i] - L[i];
  const curBody   = Math.abs(C[i] - O[i]);
  const isGreen   = C[i] >= O[i];
  const lWick     = Math.min(O[i], C[i]) - L[i];
  const uWick     = H[i] - Math.max(O[i], C[i]);

  const isDryUp   = (!isGreen || curBody < curSpread * 0.3) && volRatioI <= 0.70 && accRatio > 0.8;
  const isNSup    = !isGreen && curSpread < atr14 && volRatioI < 0.80 && accRatio > 0.9;
  const isIceberg = volRatioI > 1.1 && (curSpread / (spAvg20 || 1)) < 0.80 && accRatio > 1.1;
  const isHammer  = lWick > curBody && uWick < curBody * 0.7 && (lWick / (curSpread || 1)) > 0.4;
  const isTopGainerCooldown = todayChangePct >= 3 && isGreen && sellVolRatio < 0.3;

  let cooldownVSA = 'NEUTRAL';
  if (isTopGainerCooldown && isDryUp) cooldownVSA = 'DRY UP';
  else if (isDryUp)       cooldownVSA = 'DRY UP';
  else if (isNSup)        cooldownVSA = 'NO SUPPLY';
  else if (isIceberg)     cooldownVSA = 'ICEBERG';
  else if (isHammer)      cooldownVSA = 'HAMMER';
  else if (isTopGainerCooldown) cooldownVSA = 'GAINER HOLD';

  const hasBullVSA = cooldownVSA !== 'NEUTRAL';
  const isVCPLike  = isVolContracting && rmvVal <= 50 && sellVolRatio < 0.40;

  // ── GRADING ───────────────────────────────────────────────────────────────
  // A+ SNIPER: VSA confirmed + high power + VCP-like compression
  // A  SNIPER: VSA confirmed + adequate power
  // B  WATCH:  No VSA yet, but structure + momentum + CPP bullish
  let grade: 'A+' | 'A' | 'B';
  let entryType: 'SNIPER' | 'BREAKOUT' | 'WATCH';

  if (powerCount >= 4 && hasBullVSA && isVCPLike) {
    grade = 'A+'; entryType = 'SNIPER';
  } else if (powerCount >= 3 && hasBullVSA) {
    grade = 'A';  entryType = 'SNIPER';
  } else if (powerCount >= 3 && isVCPLike) {
    grade = 'A';  entryType = 'SNIPER';
  } else if (powerCount >= 2 && hasBullVSA) {
    grade = 'A';  entryType = 'SNIPER';
  } else if (powerCount >= 2 && isVCPLike) {
    grade = 'B';  entryType = 'WATCH';
  } else if (powerCount >= 2 && cppBias === 'BULLISH' && accRatio >= 1.1) {
    grade = 'B';  entryType = 'WATCH';
  } else if (powerCount >= 2 && hasPower5) {
    // Top gainer today with 2+ power signals — worth watching
    grade = 'B';  entryType = 'WATCH';
  } else {
    return null;
  }

  // ── Reason string ──────────────────────────────────────────────────────────
  const parts: string[] = [
    `+${gainFromBase.toFixed(1)}% (${cooldownBars === 0 ? 'today' : cooldownBars + 'd ago'})`,
    `Peak pullback ${pullbackFromPeak.toFixed(1)}%`,
    `Sell vol ${Math.round(sellVolRatio * 100)}%`,
  ];
  if (hasBullVSA)            parts.push(cooldownVSA);
  if (isVCPLike)             parts.push(`VCP RMV=${Math.round(rmvVal)}`);
  if (cppBias === 'BULLISH') parts.push(`CPP +${cppScore}`);
  if (accRatio >= 1.2)       parts.push(`Acc ${accRatio.toFixed(1)}x`);
  parts.push(`Mtm +${momentum10.toFixed(1)}%`);

  const slMult = isVCPLike ? 1.0 : 1.3;
  const tpMult = grade === 'A+' ? 3.5 : grade === 'A' ? 3.0 : 2.5;

  return {
    price: C[i],
    gainFromBase,
    cooldownBars,
    sellVolRatio,
    accRatio,
    cppScore,
    cppBias,
    powerScore,
    rmv: rmvVal,
    volRatio: volRatioI,
    momentum10,
    ma20: ma20val,
    ma50: ma50val,
    cooldownVSA,
    grade,
    entryType,
    reason: parts.join(' · '),
    stopLoss: parseFloat((C[i] - atr14 * slMult).toFixed(0)),
    target:   parseFloat((C[i] + atr14 * tpMult).toFixed(0)),
  };
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SwingScreener() {
  const router = useRouter();
  const [results, setResults]         = useState<CalmdownResult[]>([]);
  const [loading, setLoading]         = useState(false);
  const [progress, setProgress]       = useState(0);
  const [scannedCount, setScannedCount] = useState(0);
  const [stockMode, setStockMode]     = useState<'LIQUID' | 'ALL'>('LIQUID');
  const [sortBy, setSortBy]           = useState<'grade' | 'gain' | 'power' | 'cpp'>('grade');
  const [filterGrade, setFilterGrade] = useState<'ALL' | 'A+' | 'A' | 'B'>('ALL');
  const abortRef = useRef(false);

  const stockList = stockMode === 'LIQUID' ? LIQUID_STOCKS : ALL_INDONESIAN_STOCKS;

  const doSort = (arr: CalmdownResult[], by: string): CalmdownResult[] =>
    [...arr].sort((a, b) => {
      if (by === 'grade') {
        const g = { 'A+': 0, 'A': 1, 'B': 2 };
        const d = g[a.grade] - g[b.grade];
        return d !== 0 ? d : b.cppScore - a.cppScore;
      }
      if (by === 'gain')  return b.gainFromBase - a.gainFromBase;
      if (by === 'power') return b.powerScore - a.powerScore;
      return b.cppScore - a.cppScore;
    });

  const startScan = async () => {
    setLoading(true);
    setResults([]);
    setProgress(0);
    setScannedCount(0);
    abortRef.current = false;
    const found: CalmdownResult[] = [];
    let scanned = 0;

    for (let idx = 0; idx < stockList.length; idx++) {
      if (abortRef.current) break;
      const ticker = stockList[idx];
      try {
        const symbol = `${ticker}.JK`;
        const histRes = await fetch(`/api/stock/historical?symbol=${symbol}&interval=1d&range=1y`);
        if (!histRes.ok) { setProgress(Math.round(((idx + 1) / stockList.length) * 100)); continue; }
        const histData = await histRes.json();
        const candles  = histData.candles ?? histData.data ?? [];
        if (candles.length < 60) { setProgress(Math.round(((idx + 1) / stockList.length) * 100)); continue; }
        scanned++;
        setScannedCount(scanned);

        // Fetch quote first to get today's actual changePercent
        const qRes = await fetch(`/api/stock/quote?symbol=${symbol}`);
        const q    = qRes.ok ? await qRes.json() : null;
        const todayChangePct = q?.regularMarketChangePercent ?? q?.changePercent ?? 0;

        const analysis = screenStock(candles, todayChangePct);
        if (analysis) {
          const result: CalmdownResult = {
            ...analysis,
            symbol: ticker,
            price:         q?.regularMarketPrice ?? q?.price ?? analysis.price,
            change:        q?.regularMarketChange ?? q?.change ?? 0,
            changePercent: todayChangePct,
          };
          found.push(result);
          setResults(doSort([...found], sortBy));
        }
      } catch { /* skip */ }
      setProgress(Math.round(((idx + 1) / stockList.length) * 100));
    }
    setLoading(false);
  };

  const stopScan = () => { abortRef.current = true; setLoading(false); };

  const handleSort = (by: typeof sortBy) => {
    setSortBy(by);
    setResults(prev => doSort(prev, by));
  };

  const filtered = filterGrade === 'ALL' ? results : results.filter(r => r.grade === filterGrade);

  const gradeCfg = {
    'A+': { bg: 'bg-emerald-500/15', border: 'border-emerald-500/50', text: 'text-emerald-300', badge: 'bg-emerald-600' },
    'A':  { bg: 'bg-cyan-500/10',    border: 'border-cyan-500/40',    text: 'text-cyan-300',    badge: 'bg-cyan-600' },
    'B':  { bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30',  text: 'text-yellow-300',  badge: 'bg-yellow-600' },
  };
  const vsaColor: Record<string, string> = {
    'DRY UP':'text-cyan-400', 'NO SUPPLY':'text-cyan-400',
    'ICEBERG':'text-blue-400', 'HAMMER':'text-yellow-400',
    'GAINER HOLD':'text-emerald-400', 'NEUTRAL':'text-gray-500',
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Chart
            </Link>
            <span className="text-gray-600">/</span>
            <span className="text-white font-semibold text-sm">Short Swing Screener</span>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/analysis" className="text-gray-400 hover:text-white">Analysis</Link>
            <Link href="/vcp-screener" className="text-gray-400 hover:text-white">VCP</Link>
            <Link href="/scalp-screener" className="text-gray-400 hover:text-white">Scalp 5m</Link>
            <Link href="/guide" className="text-blue-400 hover:text-blue-300 font-semibold">Guide</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>📈</span> Short Swing Screener
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            <span className="text-blue-400 font-medium">Daily candles</span> — stocks up ≥3% cooling down with low sell pressure &amp; power for <span className="text-emerald-400 font-medium">1–5 day continuation swing</span>. Also catches top gainers in momentum.
          </p>
        </div>

        {/* Strategy explainer */}
        <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl p-4">
          <div className="text-blue-300 font-medium text-sm mb-3">📖 Filter Logic (3 Gates)</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-300">
            <div className="flex gap-2">
              <span className="text-emerald-400 font-bold text-base shrink-0">①</span>
              <div>
                <div className="text-white font-medium mb-0.5">Already Up ≥5% (Last 1–5 bars)</div>
                Current close must be ≥5% above a close within the last 5 trading days.
                The run has already happened — we&apos;re not trying to catch it, we&apos;re riding the continuation.
              </div>
            </div>
            <div className="flex gap-2">
              <span className="text-yellow-400 font-bold text-base shrink-0">②</span>
              <div>
                <div className="text-white font-medium mb-0.5">Healthy Calmdown (Not Distribution)</div>
                Sell vol &lt;45% during calmdown. Price holds &gt;96% of the run peak.
                Must be above MA20. Today&apos;s close ≥ yesterday (not falling). Momentum10 must be <span className="text-emerald-400">positive</span>.
              </div>
            </div>
            <div className="flex gap-2">
              <span className="text-cyan-400 font-bold text-base shrink-0">③</span>
              <div>
                <div className="text-white font-medium mb-0.5">Power + Signal</div>
                <span className="text-orange-300">🎯 SNIPER</span> = VSA confirmation (Dry Up / No Supply / Iceberg / Hammer) + strong power.
                <span className="text-purple-300 ml-1">👁️ WATCH</span> = VCP structure forming but no VSA signal yet — wait for entry confirmation.
                <span className="text-red-400 ml-1">No BREAKOUT</span> = never shown without vol + MA break.
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Mode */}
          <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
            {(['LIQUID','ALL'] as const).map(m => (
              <button key={m} onClick={() => setStockMode(m)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${stockMode === m ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                {m === 'LIQUID' ? `⚡ Liquid (${LIQUID_STOCKS.length})` : `📊 All IDX (${ALL_INDONESIAN_STOCKS.length})`}
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
            className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500">
            <option value="grade">Sort: Grade</option>
            <option value="gain">Sort: Gain %</option>
            <option value="power">Sort: Power Score</option>
            <option value="cpp">Sort: CPP Score</option>
          </select>

          {/* Scan / Stop */}
          <button onClick={loading ? stopScan : startScan}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-medium text-sm transition-colors ml-auto ${loading ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white`}>
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Stop
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                Start Scan
              </>
            )}
          </button>
        </div>

        {/* Progress */}
        {loading && (
          <div className="bg-gray-800/60 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">
                Scanning <span className="text-white">{stockList.length}</span> stocks…
                <span className="text-emerald-400 ml-2">{scannedCount} checked</span>
              </span>
              <span className="text-gray-400">{progress}%</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            {results.length > 0 && (
              <div className="text-xs text-emerald-400">✓ {results.length} setups found so far</div>
            )}
          </div>
        )}

        {/* Results summary */}
        {!loading && results.length > 0 && (
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm text-gray-400">
              <span className="text-white font-bold">{filtered.length}</span> stocks already up ≥5% with power to continue
              {filterGrade !== 'ALL' && <span className="text-gray-500"> (Grade {filterGrade})</span>}
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

        {/* Empty state */}
        {!loading && results.length === 0 && scannedCount > 0 && (
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-10 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <div className="text-white font-medium text-lg">No setups found today</div>
            <div className="text-gray-400 text-sm mt-1.5">{scannedCount} stocks analyzed. No stock is up ≥5% from last 5 bars with valid calmdown. Try again tomorrow or switch to All IDX.</div>
          </div>
        )}

        {/* Initial empty state */}
        {!loading && results.length === 0 && scannedCount === 0 && (
          <div className="bg-gray-800/30 border border-gray-700/40 rounded-xl p-10 text-center">
            <div className="text-5xl mb-4">🚀</div>
            <div className="text-white font-medium text-lg">Ready to scan</div>
            <div className="text-gray-400 text-sm mt-1.5 max-w-md mx-auto">
              Click <span className="text-emerald-400">Start Scan</span> to find stocks already up <span className="text-emerald-400">≥5%</span> from last price, now cooling down with low sell volume — ready for the next leg up.
            </div>
          </div>
        )}

        {/* Results grid */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(r => {
              const cfg = gradeCfg[r.grade];
              const rrRatio = r.stopLoss && r.target && r.price > r.stopLoss
                ? Math.abs(r.target - r.price) / Math.abs(r.price - r.stopLoss)
                : null;

              return (
                <div key={r.symbol} className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4 space-y-3 hover:shadow-lg transition-all`}>
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-bold text-lg">{r.symbol}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold text-white ${cfg.badge}`}>{r.grade}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                          r.entryType === 'SNIPER'
                            ? 'bg-orange-500/15 border-orange-500/30 text-orange-300'
                            : 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                        }`}>
                          {r.entryType === 'SNIPER' ? '🎯 Sniper' : '👁️ Watch'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-white font-medium">Rp {r.price.toLocaleString('id-ID')}</span>
                        <span className={`text-xs ${r.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {r.changePercent >= 0 ? '+' : ''}{r.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-emerald-400 font-bold text-xl">+{r.gainFromBase.toFixed(1)}%</div>
                      <div className="text-gray-500 text-xs">already up</div>
                    </div>
                  </div>

                  {/* Core metrics */}
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div className="bg-gray-900/60 rounded-lg p-2">
                      <div className="text-gray-500 text-xs">Calm Since</div>
                      <div className="text-white font-bold">{r.cooldownBars === 0 ? 'Today' : r.cooldownBars + 'd'}</div>
                      <div className={`text-xs ${r.sellVolRatio < 0.3 ? 'text-emerald-400' : r.sellVolRatio < 0.4 ? 'text-yellow-400' : 'text-orange-400'}`}>
                        sell {Math.round(r.sellVolRatio * 100)}%
                      </div>
                    </div>
                    <div className="bg-gray-900/60 rounded-lg p-2">
                      <div className="text-gray-500 text-xs">CPP</div>
                      <div className={`font-bold ${r.cppBias === 'BULLISH' ? 'text-emerald-400' : r.cppBias === 'BEARISH' ? 'text-red-400' : 'text-gray-300'}`}>
                        {r.cppScore > 0 ? '+' : ''}{r.cppScore}
                      </div>
                      <div className="text-gray-500 text-xs">{r.cppBias.slice(0,4)}</div>
                    </div>
                    <div className="bg-gray-900/60 rounded-lg p-2">
                      <div className="text-gray-500 text-xs">Power</div>
                      <div className={`font-bold ${r.powerScore >= 70 ? 'text-emerald-400' : r.powerScore >= 55 ? 'text-yellow-400' : 'text-gray-300'}`}>
                        {r.powerScore}
                      </div>
                      <div className="text-gray-500 text-xs">RMV {Math.round(r.rmv)}</div>
                    </div>
                  </div>

                  {/* VSA + Acc + Mom */}
                  <div className="flex items-center justify-between text-xs px-0.5">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">VSA</span>
                      <span className={`font-semibold ${vsaColor[r.cooldownVSA] || 'text-gray-400'}`}>{r.cooldownVSA}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">Acc</span>
                      <span className={`font-semibold ${r.accRatio >= 1.5 ? 'text-emerald-400' : r.accRatio >= 1.0 ? 'text-yellow-400' : 'text-red-400'}`}>{r.accRatio.toFixed(1)}x</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">Mom</span>
                      <span className={`font-semibold ${r.momentum10 > 0 ? 'text-emerald-400' : 'text-orange-400'}`}>{r.momentum10 > 0 ? '+' : ''}{r.momentum10.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">Vol</span>
                      <span className={`font-semibold ${r.volRatio > 1.2 ? 'text-emerald-400' : r.volRatio < 0.6 ? 'text-cyan-400' : 'text-gray-300'}`}>{r.volRatio.toFixed(1)}x</span>
                    </div>
                  </div>

                  {/* SL / TP */}
                  <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-1.5">
                      <div className="text-red-400 font-medium">Stop Loss</div>
                      <div className="text-white">{r.stopLoss.toLocaleString('id-ID')}</div>
                    </div>
                    <div className="bg-gray-800/60 rounded-lg p-1.5 flex flex-col items-center justify-center">
                      {rrRatio ? (
                        <>
                          <div className="text-gray-500">R:R</div>
                          <div className={`font-bold ${rrRatio >= 2.5 ? 'text-emerald-400' : rrRatio >= 1.5 ? 'text-yellow-400' : 'text-orange-400'}`}>1:{rrRatio.toFixed(1)}</div>
                        </>
                      ) : <span className="text-gray-600">—</span>}
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-1.5">
                      <div className="text-emerald-400 font-medium">Target</div>
                      <div className="text-white">{r.target.toLocaleString('id-ID')}</div>
                    </div>
                  </div>

                  {/* Reason tag */}
                  <div className="text-xs text-gray-400 bg-gray-900/50 rounded-lg px-2.5 py-2 leading-relaxed">
                    {r.reason}
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2">
                    <button onClick={() => router.push(`/?symbol=${r.symbol}&timeframe=1d`)}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/>
                      </svg>
                      View Daily Chart
                    </button>
                    <button onClick={() => router.push(`/analysis?symbol=${r.symbol}`)}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                      </svg>
                      Deep Analysis
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4 text-xs space-y-3">
          <div className="text-gray-500 font-medium uppercase tracking-wide">Grade Criteria</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="text-emerald-400 font-bold mb-1">A+ — Sniper</div>
              <div className="text-gray-400">All 3 power signals + bullish VSA + VCP-like compression (RMV≤35, sell vol&lt;35%). Highest confidence.</div>
            </div>
            <div>
              <div className="text-cyan-400 font-bold mb-1">A — Sniper</div>
              <div className="text-gray-400">2 power signals + bullish VSA or VCP compression. Strong continuation probability.</div>
            </div>
            <div>
              <div className="text-yellow-400 font-bold mb-1">B — Breakout Watch</div>
              <div className="text-gray-400">2 power signals + CPP bullish. Wait for next-candle volume spike to confirm entry.</div>
            </div>
          </div>
          <div className="pt-2 border-t border-gray-700/50 grid grid-cols-2 sm:grid-cols-4 gap-2 text-gray-400">
            <div><span className="text-cyan-400 font-medium">DRY UP</span> — low vol pullback, no sellers left</div>
            <div><span className="text-cyan-400 font-medium">NO SUPPLY</span> — supply exhausted on red bar</div>
            <div><span className="text-blue-400 font-medium">ICEBERG</span> — hidden accumulation in calmdown</div>
            <div><span className="text-yellow-400 font-medium">HAMMER</span> — rejection of lows, demand at support</div>
          </div>
        </div>
      </div>
    </div>
  );
}
