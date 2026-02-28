'use client';

import { Suspense } from 'react';
import { useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface VCPCandidate {
  symbol: string; price: number; change: number; changePercent: number;
  volume: number; vpcScore: number; cppScore: number; cppBias: string;
  evrScore: number; wyckoffPhase: string; isVCP: boolean; isDryUp: boolean;
  isIceberg: boolean; isSniperEntry: boolean; isNoSupply: boolean;
  isSellingClimax: boolean; rmv: number; pattern: string; recommendation: string;
}
interface ScreenerResult {
  total: number; scannedStocks: number; filter: string;
  sniperCount: number; vcpCount: number; dryUpCount: number;
  candidates: { sniperEntry: VCPCandidate[]; vcp: VCPCandidate[]; dryUp: VCPCandidate[]; all: VCPCandidate[] };
  timestamp: string;
}
interface SwingResult {
  symbol: string; price: number; change: number; changePercent: number;
  gainFromBase: number; cooldownBars: number; sellVolRatio: number;
  accRatio: number; cppScore: number; cppBias: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
  powerScore: number; rmv: number; volRatio: number; momentum10: number;
  ma20: number; ma50: number; cooldownVSA: string;
  grade: 'PERFECT' | 'GOOD'; entryType: 'SNIPER' | 'BREAKOUT' | 'WATCH';
  reason: string; stopLoss: number; target: number;
  // Ryan Filbert / Stan Weinstein fields
  rfPhase: 2 | 1;
  rfPhaseLabel: string;
  rfScore: number;
  aboveMA150: boolean;
  aboveMA200: boolean;
  ma150AboveMA200: boolean;
  ma50Rising: boolean;
  ma200Rising: boolean;
  baseVolumeDryUp: boolean;
  breakoutVolumeConfirmed: boolean;
  baseLabel: string;
  relativeStrength: number;
}
interface ScalpResult {
  symbol: string; price: number; changePercent: number;
  timeframe: '5m' | '15m'; runGainPct: number; runBars: number;
  calmBars: number; pullbackPct: number; sellVolRatio: number;
  accRatio: number; volRatio: number; cppScore: number;
  cppBias: 'BULLISH' | 'NEUTRAL' | 'BEARISH'; powerScore: number;
  rmv: number; aboveMA20: boolean; aboveMA50: boolean; vsaSignal: string;
  grade: 'PERFECT' | 'GOOD'; entryType: 'SNIPER' | 'WATCH';
  stopLoss: number; target: number; reason: string;
}
interface SpringResult {
  symbol: string; price: number; change: number; changePercent: number;
  // BVD data
  bullPct: number; bearPct: number; springBarsAgo: number;
  pivotLevel: number; recoverPct: number;
  // Context
  aboveMA20: boolean; aboveMA50: boolean;
  volRatio: number; accRatio: number;
  cppScore: number; cppBias: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
  powerScore: number; rmv: number;
  // VSA around spring
  vsaSignal: string; // NO SUPPLY, DRY UP, HAMMER, etc
  springType: 'STRONG' | 'MODERATE' | 'WEAK'; // strength of the spring
  grade: 'PERFECT' | 'GOOD';
  stopLoss: number; target: number; reason: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// STOCK LISTS
// ─────────────────────────────────────────────────────────────────────────────
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
const ALL_IDX = [
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

// ─────────────────────────────────────────────────────────────────────────────
// MATH HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function calcSMA(arr: number[], period: number, i: number): number {
  if (i < period - 1) return 0;
  let s = 0; for (let j = i - period + 1; j <= i; j++) s += arr[j]; return s / period;
}
function calcATR(H: number[], L: number[], C: number[], period: number, i: number): number {
  if (i < period) return H[i] - L[i]; let s = 0;
  for (let j = i - period + 1; j <= i; j++) { const pc = C[j-1] ?? C[j]; s += Math.max(H[j]-L[j], Math.abs(H[j]-pc), Math.abs(L[j]-pc)); }
  return s / period;
}
function calcCPP(C: number[], O: number[], H: number[], L: number[], V: number[], i: number): number {
  if (i < 14) return 0; let vsum = 0; for (let k = 0; k < 10; k++) vsum += V[i-k]; const vma = vsum/10 || 1;
  let score = 0; const lb = 5;
  for (let j = 0; j < lb; j++) { const k = i-j; const rng = H[k]-L[k] || 0.0001; score += ((C[k]-O[k])/rng) * (V[k]/vma) * ((lb-j)/lb); }
  return score;
}
function calcRMV(H: number[], L: number[], C: number[], i: number): number {
  if (i < 25) return 50; const vals: number[] = [];
  for (let k = i-19; k <= i; k++) vals.push(calcATR(H, L, C, 5, k));
  const cur = vals[vals.length-1], mn = Math.min(...vals), mx = Math.max(...vals);
  if (mx === mn) return 50; return ((cur-mn)/(mx-mn))*100;
}

// ─────────────────────────────────────────────────────────────────────────────
// SWING LOGIC — Ryan Filbert / Stan Weinstein Method (REBUILT)
// ─────────────────────────────────────────────────────────────────────────────
// WAJIB FASE 2 (Stan Weinstein): Harga > MA50 > MA150 > MA200
// MA50 naik, MA150 > MA200 (bullish stack), MA200 flat/naik
// BASE: konsolidasi setelah BO, volume kering ≤60% avg, spread menyempit
// BREAKOUT (HAKA): hijau, vol ≥1.5×avg, close upper 60% range, body ≥35% range
// SL: di bawah base low atau MA terdekat
// TP: R:R minimum 1.5×, ideal 2×–3×
// ─────────────────────────────────────────────────────────────────────────────
function screenSwing(data: any[], _todayChg: number): Omit<SwingResult,'symbol'|'change'|'changePercent'> | null {
  const C: number[]=[], O: number[]=[], H: number[]=[], L: number[]=[], V: number[]=[];
  for (const d of data) {
    if (d.close !== null && d.volume > 0) {
      C.push(d.close); O.push(d.open); H.push(d.high); L.push(d.low); V.push(d.volume);
    }
  }
  const n = C.length; if (n < 60) return null;
  const i = n - 1;

  // ── MA (Ryan Filbert uses MA50, MA150, MA200) ─────────────────────────────
  const ma20  = calcSMA(C, 20, i);
  const ma50  = calcSMA(C, 50, i);
  const ma150 = n >= 150 ? calcSMA(C, 150, i) : 0;
  const ma200 = n >= 200 ? calcSMA(C, 200, i) : 0;
  const atr14 = calcATR(H, L, C, 14, i);
  const rmvVal = calcRMV(H, L, C, i);

  // MA slopes
  const ma50Prev   = calcSMA(C, 50,  Math.max(49, i - 5));
  const ma150Prev  = n >= 155 ? calcSMA(C, 150, Math.max(149, i - 5)) : 0;
  const ma200Prev  = n >= 210 ? calcSMA(C, 200, Math.max(199, i - 10)) : 0;
  const ma50Rising  = ma50 > ma50Prev * 1.0003;
  const ma200Rising = ma200 > 0 && ma200 >= ma200Prev;

  // Phase 2 booleans
  const aboveMA50  = C[i] > ma50;
  const aboveMA150 = ma150 > 0 ? C[i] > ma150 : aboveMA50;
  const aboveMA200 = ma200 > 0 ? C[i] > ma200 : aboveMA50;
  const ma150AboveMA200 = (ma150 > 0 && ma200 > 0) ? ma150 > ma200 : false;

  // GATE: must be Phase 2 (above MA50 + MA50 rising)
  if (!aboveMA50 || !ma50Rising) return null;
  if (ma200 > 0 && C[i] < ma200 * 0.93) return null;

  const rfPhase2Strong = aboveMA150 && aboveMA200 && ma150AboveMA200 && ma50Rising;
  const rfPhaseLabel = rfPhase2Strong ? 'UPTREND KUAT' : 'UPTREND';

  // ── Volume & Spread Baselines ─────────────────────────────────────────────
  let volSum = 0, spreadSum = 0;
  for (let k = i - 19; k <= i; k++) { volSum += V[k]; spreadSum += H[k] - L[k]; }
  const volAvg20    = volSum / 20;
  const spreadAvg20 = spreadSum / 20;

  let buyVol = 0, sellVol = 0;
  for (let k = i - 9; k <= i; k++) {
    if (C[k] > O[k]) buyVol += V[k]; else if (C[k] < O[k]) sellVol += V[k];
  }
  const accRatio = buyVol / (sellVol || 1);
  const volRatio  = V[i] / (volAvg20 || 1);
  const mom10     = n > 11 ? ((C[i] - C[i-10]) / C[i-10]) * 100 : 0;

  if (mom10 <= -10) return null;
  if (accRatio < 0.6) return null;

  // ── CPP & Power ───────────────────────────────────────────────────────────
  const cppRaw = calcCPP(C, O, H, L, V, i);
  const cppBias: 'BULLISH'|'NEUTRAL'|'BEARISH' = cppRaw > 0.3 ? 'BULLISH' : cppRaw < -0.3 ? 'BEARISH' : 'NEUTRAL';
  const cppScore   = parseFloat(cppRaw.toFixed(2));
  const powerScore = Math.max(0, Math.min(100, Math.round(50 + (cppRaw / 1.5) * 45)));
  if (cppBias === 'BEARISH' && accRatio < 1.0) return null;

  // ── STEP 1: Find Breakout Candle (HAKA) ───────────────────────────────────
  let boIdx = -1, boGain = 0;
  for (let lb = 1; lb <= 20; lb++) {
    const j = i - lb; if (j < 20) break;
    const spread_j = H[j] - L[j];
    const body_j   = C[j] - O[j];
    const closePos = spread_j > 0 ? (C[j] - L[j]) / spread_j : 0;
    const vr_j     = V[j] / (volAvg20 || 1);
    const isBO = body_j > 0 && vr_j >= 1.5 && closePos >= 0.60 && body_j >= spread_j * 0.35 && spread_j >= spreadAvg20 * 0.7;
    if (!isBO) continue;
    const g = ((C[i] - C[j]) / C[j]) * 100;
    if (g < -5 || g > 25) continue;
    if (g < 1 && lb > 2) continue;
    boIdx = j; boGain = g; break;
  }
  if (boIdx < 0) return null;
  const breakoutVolumeConfirmed = V[boIdx] / (volAvg20 || 1) >= 1.5;

  // ── STEP 2: Base/Cooldown Phase ───────────────────────────────────────────
  const cooldownBars = i - boIdx;
  if (cooldownBars < 1 || cooldownBars > 15) return null;
  let peakHigh = H[boIdx];
  for (let k = boIdx + 1; k <= i; k++) if (H[k] > peakHigh) peakHigh = H[k];
  const pullbackPct = ((peakHigh - C[i]) / peakHigh) * 100;
  if (pullbackPct > 12) return null;
  if (C[i] < C[boIdx] * 0.90) return null;

  let coolSellVol = 0, coolTotalVol = 0, coolSpreads = 0, coolVolArr: number[] = [];
  for (let k = boIdx + 1; k <= i; k++) {
    coolTotalVol += V[k]; coolVolArr.push(V[k]);
    if (C[k] < O[k]) coolSellVol += V[k];
    coolSpreads += H[k] - L[k];
  }
  const sellVolRatio   = coolTotalVol > 0 ? coolSellVol / coolTotalVol : 0;
  const coolAvgVol     = coolVolArr.length > 0 ? coolVolArr.reduce((a,b)=>a+b,0)/coolVolArr.length : volAvg20;
  const coolAvgSpread  = cooldownBars > 0 ? coolSpreads / cooldownBars : H[i] - L[i];
  const spreadContracted = coolAvgSpread < (H[boIdx] - L[boIdx]) * 0.75;

  // KEY: Volume Dry-Up (supply habis) — Ryan Filbert utamakan ini
  const baseVolumeDryUp = coolAvgVol <= volAvg20 * 0.65;
  if (sellVolRatio > 0.55) return null;

  // ── STEP 3: VSA Signal ────────────────────────────────────────────────────
  const sp    = H[i] - L[i];
  const body  = Math.abs(C[i] - O[i]);
  const isGreen = C[i] >= O[i];
  const lWick = Math.min(O[i], C[i]) - L[i];
  const uWick = H[i] - Math.max(O[i], C[i]);
  const isDryUp    = (!isGreen || body < sp * 0.3) && volRatio <= 0.70 && accRatio > 0.8;
  const isNoSupply = !isGreen && sp < atr14 && volRatio < 0.80 && accRatio > 0.9;
  const isIceberg  = volRatio > 1.1 && (sp / (spreadAvg20 || 1)) < 0.80 && accRatio > 1.1;
  const isHammer   = lWick > body * 1.2 && uWick < body * 0.7 && (lWick / (sp || 1)) > 0.4;
  const isNarrowBody = body < sp * 0.25 && Math.abs(C[i] - ma20) / C[i] < 0.02;
  let cooldownVSA = 'NEUTRAL';
  if (isDryUp) cooldownVSA = 'DRY UP';
  else if (isNoSupply) cooldownVSA = 'NO SUPPLY';
  else if (isIceberg) cooldownVSA = 'ICEBERG';
  else if (isHammer) cooldownVSA = 'HAMMER';
  else if (isNarrowBody) cooldownVSA = 'RESTING MA20';
  const hasVSASignal = cooldownVSA !== 'NEUTRAL';

  // ── STEP 4: Ryan Filbert 8-Point Checklist ────────────────────────────────
  // p1–p8 map to the Ryan Filbert checklist shown in analysis page
  const p1 = rfPhase2Strong;          // Full Phase 2 (MA50>MA150>MA200)
  const p2 = aboveMA150;              // Price > MA150
  const p3 = aboveMA200;              // Price > MA200
  const p4 = ma50Rising;              // MA50 naik ↑
  const p5 = ma150AboveMA200;         // MA150 > MA200
  const p6 = baseVolumeDryUp;         // Volume kering di base (WAJIB)
  const p7 = breakoutVolumeConfirmed; // BO candle vol confirmed ≥1.5×
  const p8 = hasVSASignal || spreadContracted || accRatio >= 1.2; // VSA/quality

  const rfScore = [p1,p2,p3,p4,p5,p6,p7,p8].filter(Boolean).length;
  // ── QUALITY GATE: sync with analysis page setupQuality ────────────────────
  // Only show setups that will show as GOOD or PERFECT in analysis (not FAIR)
  // Ryan Filbert MANDATORY: above MA150 & MA200
  if (!p2 || !p3) return null; // must be above MA150 & MA200
  if (rfScore < 5) return null; // minimum 5/8 criteria
  // Must have vol dry-up OR VSA signal — otherwise analysis shows FAIR/WAIT (confusing)
  if (!p6 && !hasVSASignal) return null;

  // Base label
  let touchCount = 0;
  for (let k = Math.max(0, i - 60); k < i; k++) {
    if (L[k] <= ma50 * 1.03 && C[k] >= ma50 * 0.97) touchCount++;
  }
  const baseLabel = touchCount <= 2 ? 'B1' : touchCount <= 5 ? 'B2' : 'B3+';

  // Relative Strength (approximated via 20-bar momentum)
  const mom20 = n > 21 ? ((C[i] - C[i-20]) / C[i-20]) * 100 : 0;
  const relativeStrength = Math.max(0, Math.min(100, Math.round(50 + mom20 * 2)));

  // ── STEP 5: Grade & Entry ─────────────────────────────────────────────────
  // PERFECT = all key criteria met (vol dry + VSA + full phase 2) → matches 'PERFECT' in analysis
  // GOOD    = most criteria met (vol dry OR strong VSA, all mandatory MA)  → matches 'GOOD' in analysis
  let grade: 'PERFECT' | 'GOOD';
  let entryType: 'SNIPER' | 'BREAKOUT' | 'WATCH';
  if      (rfScore >= 6 && p1 && p6 && hasVSASignal)  { grade = 'PERFECT'; entryType = 'SNIPER'; }
  else if (rfScore >= 6 && p6 && p1)                   { grade = 'PERFECT'; entryType = 'SNIPER'; }
  else if (rfScore >= 5 && p6 && hasVSASignal)         { grade = 'GOOD';    entryType = 'SNIPER'; }
  else if (rfScore >= 6 && hasVSASignal)               { grade = 'GOOD';    entryType = 'SNIPER'; }
  else if (rfScore >= 5 && p6)                         { grade = 'GOOD';    entryType = 'BREAKOUT'; }
  else                                                  { grade = 'GOOD';    entryType = 'BREAKOUT'; } // rfScore≥5 + hasVSASignal (already gated)

  // ── STEP 6: SL ────────────────────────────────────────────────────────────
  const supports: number[] = [];
  for (let k = boIdx; k <= i; k++) {
    if ((k === 0 || L[k] < L[k-1]) && (k === n-1 || L[k] < L[k+1]) && L[k] < C[i] * 0.99) supports.push(L[k]);
  }
  if (ma20 < C[i] * 0.99 && ma20 > C[i] * 0.82) supports.push(ma20);
  if (ma50 < C[i] * 0.99 && ma50 > C[i] * 0.80) supports.push(ma50);
  if (L[boIdx] < C[i] * 0.99) supports.push(L[boIdx]);
  supports.push(C[i] - atr14 * 1.5);
  const nearestSupport = Math.max(...supports.filter(s => s < C[i] * 0.99));
  const stopLoss = parseFloat((nearestSupport * 0.99).toFixed(0));
  const riskPct = (C[i] - stopLoss) / C[i];
  if (riskPct < 0.01 || riskPct > 0.15) return null;

  // ── STEP 7: TP ────────────────────────────────────────────────────────────
  const minRR   = grade === 'PERFECT' ? 2.5 : 2.0;
  const riskAmt = C[i] - stopLoss;
  const target  = parseFloat((C[i] + riskAmt * minRR).toFixed(0));
  const actualRR = riskAmt > 0 ? parseFloat(((target - C[i]) / riskAmt).toFixed(1)) : minRR;

  const slSource = nearestSupport === ma20 ? 'SL@MA20'
    : nearestSupport === ma50 ? 'SL@MA50'
    : nearestSupport === L[boIdx] ? 'SL@BO-Low' : 'SL@SwingLow';

  const pts: string[] = [
    `BO +${boGain.toFixed(1)}% (${cooldownBars}d ago)`,
    `Sell ${Math.round(sellVolRatio*100)}%`,
    `Pullback ${pullbackPct.toFixed(1)}%`,
  ];
  if (hasVSASignal) pts.push(cooldownVSA);
  if (baseVolumeDryUp) pts.push('Vol-Kering✓');
  if (spreadContracted) pts.push('Spread↓');
  pts.push(slSource); pts.push(`R:R ${actualRR}x`);
  if (rfPhase2Strong) pts.push('F2★'); else pts.push('F2');
  if (cppBias === 'BULLISH') pts.push(`CPP +${cppScore}`);

  return {
    price: C[i], gainFromBase: boGain, cooldownBars, sellVolRatio, accRatio,
    cppScore, cppBias, powerScore, rmv: rmvVal, volRatio, momentum10: mom10,
    ma20, ma50, cooldownVSA, grade, entryType,
    reason: pts.join(' · '), stopLoss, target,
    rfPhase: 2, rfPhaseLabel, rfScore,
    aboveMA150, aboveMA200, ma150AboveMA200, ma50Rising, ma200Rising,
    baseVolumeDryUp, breakoutVolumeConfirmed,
    baseLabel, relativeStrength,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SCALP LOGIC
// ─────────────────────────────────────────────────────────────────────────────
function screenScalp(data: any[], tf: '5m'|'15m'): Omit<ScalpResult,'symbol'|'changePercent'> | null {
  const C: number[]=[], O: number[]=[], H: number[]=[], L: number[]=[], V: number[]=[];
  for (const d of data) { if (d.close!==null && d.volume>0) { C.push(d.close);O.push(d.open);H.push(d.high);L.push(d.low);V.push(d.volume); } }
  const n=C.length; if (n<40) return null; const i=n-1;
  const ma20=calcSMA(C,20,i), atr14=calcATR(H,L,C,14,i), rmvVal=calcRMV(H,L,C,i);
  const cppRaw=calcCPP(C,O,H,L,V,i);
  const cppBias: 'BULLISH'|'NEUTRAL'|'BEARISH' = cppRaw>0.3?'BULLISH':cppRaw<-0.3?'BEARISH':'NEUTRAL';
  const cppScore=parseFloat(cppRaw.toFixed(2)), powerScore=Math.max(0,Math.min(100,Math.round(50+(cppRaw/1.5)*45)));
  let vs=0,ss=0; for (let k=Math.max(0,i-19);k<=i;k++){vs+=V[k];ss+=H[k]-L[k];} const cnt=Math.min(20,i+1);
  const va=vs/cnt,sa=ss/cnt;
  let bv=0,sv=0; for (let k=Math.max(0,i-9);k<=i;k++){if(C[k]>O[k])bv+=V[k];else if(C[k]<O[k])sv+=V[k];}
  const acc=bv/(sv||1), vr=V[i]/(va||1), abma20=C[i]>ma20;
  if (cppBias==='BEARISH'||acc<0.8||!abma20) return null;
  const mg=tf==='5m'?1.5:2.0;
  let ss2=-1,sp=-1,spv=-Infinity,rg=0;
  for (let lb=1;lb<=8;lb++){const r=i-lb;if(r<0)break;const g=((C[i]-C[r])/C[r])*100;if(g>=mg){ss2=r;rg=g;break;}}
  if (ss2<0){for(let lb=2;lb<=8;lb++){const r=i-lb;if(r<0)break;for(let pk=r+1;pk<i;pk++){if(H[pk]>spv){spv=H[pk];sp=pk;}}if(sp>=0){const g=((spv-C[r])/C[r])*100;if(g>=mg){ss2=r;rg=g;break;}}}}
  if (ss2<0) return null;
  const rb=sp>=0?sp-ss2:i-ss2, pp2=sp>=0?spv:H[i], pb2=((pp2-C[i])/pp2)*100;
  if (pb2>45) return null;
  const cb=sp>=0?i-sp:0; if (cb<2||cb>15) return null;
  const cst=sp>=0?sp:ss2+1; let csv=0,ctv=0;
  for (let k=cst;k<=i;k++){ctv+=V[k];if(C[k]<O[k])csv+=V[k];}
  const svr=ctv>0?csv/ctv:0; if (svr>=0.55) return null;
  const hp1=cppBias==='BULLISH',hp2=acc>=1.2,hp3=rmvVal<=50,hp4=abma20,hp5=vr>0.8;
  const pcc=[hp1,hp2,hp3,hp4,hp5].filter(Boolean).length; if (pcc<2) return null;
  const cur=H[i]-L[i],cbb=Math.abs(C[i]-O[i]),lw=Math.min(O[i],C[i])-L[i];
  const du2=cbb<cur*0.3&&vr<=0.70&&acc>0.8;
  const ns2=C[i]<O[i]&&cur<atr14&&vr<0.80&&acc>0.9;
  const ib2=vr>1.1&&(cur/(sa||1))<0.80&&acc>1.1;
  const hm2=lw>cbb&&(lw/(cur||1))>0.4;
  let vsa2='NEUTRAL';
  if(du2)vsa2='DRY UP';else if(ns2)vsa2='NO SUPPLY';else if(ib2)vsa2='ICEBERG';else if(hm2)vsa2='HAMMER';
  const hbv2=vsa2!=='NEUTRAL';
  let grade:'PERFECT'|'GOOD', et:'SNIPER'|'WATCH';
  if(pcc>=4&&hbv2){grade='PERFECT';et='SNIPER';}else if(pcc>=3&&hbv2){grade='GOOD';et='SNIPER';}else if(pcc>=3){grade='GOOD';et='SNIPER';}else if(pcc>=2&&hbv2){grade='GOOD';et='SNIPER';}else if(pcc>=2){grade='GOOD';et='WATCH';}else return null;
  const pts2=[`Spike +${rg.toFixed(1)}% (${rb}b)`,`Calm ${cb}b`,`Sell ${Math.round(svr*100)}%`,`Pb ${pb2.toFixed(1)}%`];
  if(hbv2)pts2.push(vsa2);if(cppBias==='BULLISH')pts2.push(`CPP +${cppScore}`);pts2.push(`Acc ${acc.toFixed(1)}x`);
  const tm2=grade==='PERFECT'?2.5:grade==='GOOD'?2.0:1.5;
  return {price:C[i],timeframe:tf,runGainPct:rg,runBars:rb,calmBars:cb,pullbackPct:pb2,sellVolRatio:svr,accRatio:acc,volRatio:vr,cppScore,cppBias,powerScore,rmv:rmvVal,aboveMA20:abma20,aboveMA50:C[i]>calcSMA(C,50,i),vsaSignal:vsa2,grade,entryType:et,reason:pts2.join(' · '),stopLoss:parseFloat((C[i]-atr14*1.0).toFixed(0)),target:parseFloat((C[i]+atr14*tm2).toFixed(0))};
}

// ─────────────────────────────────────────────────────────────────────────────
// SPRING / FAKE BREAKDOWN LOGIC
// 🌱 SP — Spring = price broke support pivot (fake breakdown) but buyers dominated
// ─────────────────────────────────────────────────────────────────────────────
function screenSpring(data: any[]): Omit<SpringResult, 'symbol' | 'change' | 'changePercent'> | null {
  const C: number[] = [], O: number[] = [], H: number[] = [], L: number[] = [], V: number[] = [];
  for (const d of data) {
    if (d.close !== null && d.volume > 0) { C.push(d.close); O.push(d.open); H.push(d.high); L.push(d.low); V.push(d.volume); }
  }
  const n = C.length; if (n < 40) return null;
  const i = n - 1;

  // ── Helpers ──
  const calcSMALocal = (arr: number[], p: number, idx: number) => {
    if (idx < p - 1) return 0;
    let s = 0; for (let j = idx - p + 1; j <= idx; j++) s += arr[j]; return s / p;
  };
  const calcATRLocal = (hi: number[], lo: number[], cl: number[], p: number, idx: number) => {
    if (idx < p) return hi[idx] - lo[idx]; let s = 0;
    for (let j = idx - p + 1; j <= idx; j++) { const pc = cl[j - 1] ?? cl[j]; s += Math.max(hi[j] - lo[j], Math.abs(hi[j] - pc), Math.abs(lo[j] - pc)); }
    return s / p;
  };

  const ma20 = calcSMALocal(C, 20, i);
  const ma50 = calcSMALocal(C, 50, i);
  const atr14 = calcATRLocal(H, L, C, 14, i);

  // ── CPP ──
  const cppRaw = calcCPP(C, O, H, L, V, i);
  const cppBias: 'BULLISH' | 'NEUTRAL' | 'BEARISH' = cppRaw > 0.4 ? 'BULLISH' : cppRaw < -0.4 ? 'BEARISH' : 'NEUTRAL';
  const cppScore = parseFloat(cppRaw.toFixed(2));
  const powerScore = Math.max(0, Math.min(100, Math.round(50 + (cppRaw / 1.5) * 45)));
  const rmvVal = calcRMV(H, L, C, i);

  // ── Volume averages ──
  let vs = 0; for (let k = i - 19; k <= i; k++) vs += V[k]; const va = vs / 20;
  let bv = 0, sv = 0; for (let k = i - 9; k <= i; k++) { if (C[k] > O[k]) bv += V[k]; else if (C[k] < O[k]) sv += V[k]; }
  const acc = bv / (sv || 1);
  const vr = V[i] / (va || 1);

  // ── BVD: Detect pivot lows, look for Spring ──
  // Uses identical logic to detectBreakoutVolumeDelta() in indicators.ts
  // so chart markers and screener results are always in sync.
  const pivotLeft = 5, pivotRight = 5, maxLevels = 10;
  interface PivotLo { value: number; index: number; firstBreakBar: number; }
  const pivotsLo: PivotLo[] = [];
  for (let j = pivotLeft; j < n - pivotRight; j++) {
    let isL = true;
    for (let k = j - pivotLeft; k <= j + pivotRight; k++) {
      if (k === j) continue;
      if (L[k] <= L[j]) { isL = false; break; }
    }
    if (isL) pivotsLo.push({ value: L[j], index: j, firstBreakBar: -1 });
  }
  const activeLo = pivotsLo.slice(-maxLevels);

  // Volume split helper (identical to indicators.ts splitVolume)
  const splitVol = (barIdx: number): { bPct: number; ePct: number } => {
    const bc = C[barIdx], bo = O[barIdx], bh = H[barIdx], bl = L[barIdx], bv = V[barIdx];
    const rng = bh - bl;
    const cPos = rng > 0 ? (bc - bl) / rng : 0.5;
    let bullV: number, bearV: number;
    if (bc > bo) { bullV = bv; bearV = 0; }
    else if (bc < bo) { bullV = 0; bearV = bv; }
    else { bullV = bv * cPos; bearV = bv * (1 - cPos); }
    const tv = bullV + bearV;
    const bP = tv > 0 ? (bullV / tv) * 100 : 50;
    return { bPct: bP, ePct: 100 - bP };
  };

  // PHASE 1: Scan ALL history (same as BVD in chart) to correctly consume pivots
  // so we know which ones are still "fresh" vs already broken.
  // Collect all spring events with their bar index.
  const springEvents: Array<{ barIdx: number; bullPct: number; bearPct: number; pivotLevel: number }> = [];

  for (let barIdx = pivotLeft + pivotRight; barIdx <= i; barIdx++) {
    for (const pivot of activeLo) {
      if (pivot.firstBreakBar >= 0) continue;
      if (pivot.index >= barIdx) continue;
      if (C[barIdx] >= pivot.value) continue; // not broken

      // Consume pivot on first close below it
      pivot.firstBreakBar = barIdx;

      const { bPct, ePct } = splitVol(barIdx);
      if (bPct >= 55) {
        // This is a spring — record it
        springEvents.push({ barIdx, bullPct: Math.round(bPct), bearPct: Math.round(ePct), pivotLevel: pivot.value });
      }
    }
  }

  // PHASE 2: From all detected springs, find the most recent one within 20 bars
  let springFound: { barsAgo: number; bullPct: number; bearPct: number; pivotLevel: number; recoverPct: number } | null = null;

  for (const evt of springEvents) {
    const barsAgo = i - evt.barIdx;
    if (barsAgo > 20) continue; // too old

    const recoverPct = ((C[i] - C[evt.barIdx]) / C[evt.barIdx]) * 100;
    if (recoverPct < -3) continue; // still falling

    // Keep most recent (highest barIdx = smallest barsAgo)
    if (!springFound || barsAgo < springFound.barsAgo) {
      springFound = {
        barsAgo,
        bullPct: evt.bullPct,
        bearPct: evt.bearPct,
        pivotLevel: evt.pivotLevel,
        recoverPct: parseFloat(recoverPct.toFixed(2)),
      };
    }
  }

  if (!springFound) return null;

  // ── Quality filters ──
  // Must have recovered from spring (price must be above pivot level now or near it)
  const abovePivot = C[i] >= springFound.pivotLevel * 0.97;
  // Must not be in freefall
  if (cppBias === 'BEARISH' && acc < 0.6) return null;
  // VSA context around spring
  const sp = H[i] - L[i];
  const body = Math.abs(C[i] - O[i]);
  const isGreen = C[i] >= O[i];
  const lWick = Math.min(O[i], C[i]) - L[i];
  const uWick = H[i] - Math.max(O[i], C[i]);
  const isDryUp = (body < sp * 0.3 || !isGreen) && vr <= 0.70 && acc > 0.8;
  const isNS = !isGreen && sp < atr14 && vr < 0.80 && acc > 0.9;
  const isIceberg = vr > 1.1 && sp < atr14 * 0.85 && acc > 1.1;
  const isHammer = lWick > body && (lWick / (sp || 1)) > 0.4;
  let vsaSignal = 'NEUTRAL';
  if (isDryUp) vsaSignal = 'DRY UP';
  else if (isNS) vsaSignal = 'NO SUPPLY';
  else if (isIceberg) vsaSignal = 'ICEBERG';
  else if (isHammer) vsaSignal = 'HAMMER';

  // ── Spring grade ──
  const strongSpring = springFound.bullPct >= 65 && (cppBias === 'BULLISH' || acc >= 1.2) && abovePivot;
  const moderateSpring = springFound.bullPct >= 55 && cppBias !== 'BEARISH';

  let springType: 'STRONG' | 'MODERATE' | 'WEAK';
  let grade: 'PERFECT' | 'GOOD';

  if (strongSpring && vsaSignal !== 'NEUTRAL' && springFound.barsAgo <= 5) {
    springType = 'STRONG'; grade = 'PERFECT';
  } else if (strongSpring) {
    springType = 'STRONG'; grade = 'GOOD';
  } else if (moderateSpring && vsaSignal !== 'NEUTRAL') {
    springType = 'MODERATE'; grade = 'GOOD';
  } else if (moderateSpring) {
    springType = 'MODERATE'; grade = 'GOOD';
  } else {
    springType = 'WEAK'; grade = 'GOOD';
  }

  // ── Reason string ──
  const pts: string[] = [
    `🌱 SP ${springFound.barsAgo === 0 ? 'Today' : springFound.barsAgo + 'd ago'}`,
    `Bull ${springFound.bullPct}% vs Bear ${springFound.bearPct}%`,
    `Pivot Rp ${Math.round(springFound.pivotLevel).toLocaleString('id-ID')}`,
    `Recovery +${springFound.recoverPct >= 0 ? springFound.recoverPct : 0}%`,
  ];
  if (vsaSignal !== 'NEUTRAL') pts.push(vsaSignal);
  if (abovePivot) pts.push('Back ↑ Pivot');
  pts.push(`Acc ${acc.toFixed(1)}x`);
  pts.push(`CPP ${cppScore > 0 ? '+' : ''}${cppScore}`);

  const slMult = grade === 'PERFECT' ? 1.0 : 1.2;
  const tpMult = grade === 'PERFECT' ? 3.0 : grade === 'GOOD' ? 2.5 : 2.0;

  return {
    price: C[i], bullPct: springFound.bullPct, bearPct: springFound.bearPct,
    springBarsAgo: springFound.barsAgo, pivotLevel: springFound.pivotLevel,
    recoverPct: springFound.recoverPct, aboveMA20: C[i] > ma20, aboveMA50: C[i] > ma50,
    volRatio: vr, accRatio: acc, cppScore, cppBias, powerScore, rmv: rmvVal,
    vsaSignal, springType, grade,
    stopLoss: parseFloat((springFound.pivotLevel - atr14 * slMult).toFixed(0)),
    target: parseFloat((C[i] + atr14 * tpMult).toFixed(0)),
    reason: pts.join(' · '),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// URL BUILDERS — pass full screener context to chart
// ─────────────────────────────────────────────────────────────────────────────
function buildSwingChartURL(r: SwingResult): string {
  const p = new URLSearchParams({
    symbol: r.symbol, interval: '1d', screenerType: 'swing',
    grade: r.grade, entryType: r.entryType,
    vsaSignal: r.cooldownVSA || 'NEUTRAL',
    reason: r.reason,
    sl: r.stopLoss.toString(), tp: r.target.toString(),
    cpp: r.cppScore.toString(), cppBias: r.cppBias,
    power: r.powerScore.toString(), gain: r.gainFromBase.toString(),
    svr: r.sellVolRatio.toString(), acc: r.accRatio.toString(),
    rmv: r.rmv.toString(), timeframe: '1d',
  });
  return `/?${p.toString()}`;
}

function buildVCPChartURL(c: VCPCandidate): string {
  const et = c.isSniperEntry ? 'SNIPER' : c.isVCP ? 'VCP' : c.isDryUp ? 'DRY_UP' : 'WATCH';
  const vsa = c.isSellingClimax ? 'SELLING CLIMAX' : c.isIceberg ? 'ICEBERG'
    : c.isNoSupply ? 'NO SUPPLY' : c.isDryUp ? 'DRY UP' : 'NEUTRAL';
  const grade = c.vpcScore >= 80 ? 'A+' : c.vpcScore >= 60 ? 'A' : 'B';
  const p = new URLSearchParams({
    symbol: c.symbol, interval: '1d', screenerType: 'vcp',
    grade, entryType: et, vsaSignal: vsa,
    reason: c.recommendation || c.pattern || '',
    sl: '0', tp: '0',
    cpp: c.cppScore.toString(), cppBias: c.cppBias,
    power: '50', gain: (c.changePercent || 0).toString(),
    svr: '0', acc: '1', rmv: c.rmv.toString(), timeframe: '1d',
  });
  return `/?${p.toString()}`;
}

function buildScalpChartURL(r: ScalpResult): string {
  const p = new URLSearchParams({
    symbol: r.symbol, interval: r.timeframe, screenerType: 'scalp',
    grade: r.grade, entryType: r.entryType,
    vsaSignal: r.vsaSignal || 'NEUTRAL',
    reason: r.reason,
    sl: r.stopLoss.toString(), tp: r.target.toString(),
    cpp: r.cppScore.toString(), cppBias: r.cppBias,
    power: r.powerScore.toString(), gain: r.runGainPct.toString(),
    svr: r.sellVolRatio.toString(), acc: r.accRatio.toString(),
    rmv: r.rmv.toString(), timeframe: r.timeframe,
  });
  return `/?${p.toString()}`;
}

function buildSpringChartURL(r: SpringResult): string {
  const p = new URLSearchParams({
    symbol: r.symbol, interval: '1d', screenerType: 'spring',
    grade: r.grade, entryType: 'SNIPER',
    vsaSignal: r.vsaSignal || 'SPRING',
    reason: r.reason,
    sl: r.stopLoss.toString(), tp: r.target.toString(),
    cpp: r.cppScore.toString(), cppBias: r.cppBias,
    power: r.powerScore.toString(), gain: r.recoverPct.toString(),
    svr: '0', acc: r.accRatio.toString(),
    rmv: r.rmv.toString(), timeframe: '1d',
    springBullPct: r.bullPct.toString(),
    springBarsAgo: r.springBarsAgo.toString(),
    pivotLevel: r.pivotLevel.toString(),
  });
  return `/?${p.toString()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// INNER CONTENT
// ─────────────────────────────────────────────────────────────────────────────
function ScreenerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initTab = (searchParams.get('tab') as 'swing'|'vcp'|'scalp'|'spring') || 'swing';
  const [activeTab, setActiveTab] = useState<'swing'|'vcp'|'scalp'|'spring'>(initTab);

  // VCP
  const [vcpResults, setVcpResults] = useState<ScreenerResult|null>(null);
  const [vcpLoading, setVcpLoading] = useState(false);
  const [vcpError, setVcpError]     = useState('');
  const [vcpSub, setVcpSub]         = useState<'sniper'|'vcp'|'dryup'|'all'>('sniper');
  const [vcpFilter, setVcpFilter]   = useState<'all'|'liquid'>('liquid');
  const [vcpLimit, setVcpLimit]     = useState(100);

  // Swing
  const [swRes, setSwRes]   = useState<SwingResult[]>([]);
  const [swLoad, setSwLoad] = useState(false);
  const [swProg, setSwProg] = useState(0);
  const [swScan, setSwScan] = useState(0);
  const [swMode, setSwMode] = useState<'LIQUID'|'ALL'>('LIQUID');
  const [swSort, setSwSort] = useState<'grade'|'gain'|'power'|'cpp'>('grade');
  const [swGrade,setSwGrade]= useState<'ALL'|'PERFECT'|'GOOD'>('ALL');
  const swAbort = useRef(false);

  // Scalp
  const [scRes, setScRes]   = useState<ScalpResult[]>([]);
  const [scLoad, setScLoad] = useState(false);
  const [scProg, setScProg] = useState(0);
  const [scScan, setScScan] = useState(0);
  const [scMode, setScMode] = useState<'LIQUID'|'ALL'>('LIQUID');
  const [scTf, setScTf]     = useState<'5m'|'15m'>('15m');
  const [scGrade,setScGrade]= useState<'ALL'|'PERFECT'|'GOOD'>('ALL');
  const scAbort = useRef(false);

  // Spring
  const [spRes, setSpRes]   = useState<SpringResult[]>([]);
  const [spLoad, setSpLoad] = useState(false);
  const [spProg, setSpProg] = useState(0);
  const [spScan, setSpScan] = useState(0);
  const [spMode, setSpMode] = useState<'LIQUID'|'ALL'>('LIQUID');
  const [spGrade,setSpGrade]= useState<'ALL'|'PERFECT'|'GOOD'>('ALL');
  const [spType, setSpType] = useState<'ALL'|'STRONG'|'MODERATE'>('ALL');
  const spAbort = useRef(false);

  const changeTab = (t: 'swing'|'vcp'|'scalp'|'spring') => {
    setActiveTab(t);
    try { const u = new URL(window.location.href); u.searchParams.set('tab',t); window.history.replaceState({},'',u); } catch(_){}
  };

  // ── VCP scan ───────────────────────────────────────────────────────────────
  const scanVCP = async () => {
    setVcpLoading(true); setVcpError('');
    try {
      const r = await fetch(`/api/stock/vcp-screener?filter=${vcpFilter}&limit=${vcpLimit}`);
      if (!r.ok) throw new Error('VCP screener failed'); setVcpResults(await r.json());
    } catch(e:any){setVcpError(e.message);} finally{setVcpLoading(false);}
  };

  // ── Swing scan ─────────────────────────────────────────────────────────────
  const sortSw = (arr: SwingResult[], by: string) => [...arr].sort((a,b)=>{
    if(by==='grade'){const g:any={'PERFECT':0,'GOOD':1};const d=g[a.grade]-g[b.grade];return d!==0?d:b.cppScore-a.cppScore;}
    if(by==='gain')return b.gainFromBase-a.gainFromBase;
    if(by==='power')return b.powerScore-a.powerScore;
    return b.cppScore-a.cppScore;
  });
  const startSwing = async () => {
    setSwLoad(true);setSwRes([]);setSwProg(0);setSwScan(0);swAbort.current=false;
    const list=swMode==='LIQUID'?LIQUID_STOCKS:ALL_IDX; const found:SwingResult[]=[];
    for (let idx=0;idx<list.length;idx++){
      if(swAbort.current)break; const ticker=list[idx];
      try{
        const sym=`${ticker}.JK`;
        const hr=await fetch(`/api/stock/historical?symbol=${sym}&interval=1d&range=1y`);
        if(!hr.ok){setSwProg(Math.round(((idx+1)/list.length)*100));continue;}
        const hd=await hr.json(); const candles=hd.candles??hd.data??[];
        if(candles.length<60){setSwProg(Math.round(((idx+1)/list.length)*100));continue;}
        setSwScan(s=>s+1);
        const qr=await fetch(`/api/stock/quote?symbol=${sym}`); const q=qr.ok?await qr.json():null;
        const tc=q?.regularMarketChangePercent??q?.changePercent??0;
        const a=screenSwing(candles,tc);
        if(a){const r:SwingResult={...a,symbol:ticker,price:q?.regularMarketPrice??q?.price??a.price,change:q?.regularMarketChange??q?.change??0,changePercent:tc};found.push(r);setSwRes(sortSw([...found],swSort));}
      }catch{}
      setSwProg(Math.round(((idx+1)/list.length)*100));
    }
    setSwLoad(false);
  };

  // ── Scalp scan ─────────────────────────────────────────────────────────────
  const startScalp = async () => {
    setScLoad(true);setScRes([]);setScProg(0);setScScan(0);scAbort.current=false;
    const list=scMode==='LIQUID'?LIQUID_STOCKS:ALL_IDX; const found:ScalpResult[]=[];
    for (let idx=0;idx<list.length;idx++){
      if(scAbort.current)break; const ticker=list[idx];
      try{
        const sym=`${ticker}.JK`; const range=scTf==='5m'?'5d':'10d';
        const hr=await fetch(`/api/stock/historical?symbol=${sym}&interval=${scTf}&range=${range}`);
        if(!hr.ok){setScProg(Math.round(((idx+1)/list.length)*100));continue;}
        const hd=await hr.json(); const candles=hd.candles??hd.data??[];
        if(candles.length<40){setScProg(Math.round(((idx+1)/list.length)*100));continue;}
        setScScan(s=>s+1);
        const qr=await fetch(`/api/stock/quote?symbol=${sym}`); const q=qr.ok?await qr.json():null;
        const a=screenScalp(candles,scTf);
        if(a){const r:ScalpResult={...a,symbol:ticker,changePercent:q?.regularMarketChangePercent??q?.changePercent??0,price:q?.regularMarketPrice??q?.price??a.price};found.push(r);setScRes([...found].sort((a,b)=>{const g:any={'A+':0,'A':1,'B':2};return g[a.grade]-g[b.grade];}));}
      }catch{}
      setScProg(Math.round(((idx+1)/list.length)*100));
    }
    setScLoad(false);
  };

  // ── Spring scan ────────────────────────────────────────────────────────────
  const startSpring = async () => {
    setSpLoad(true); setSpRes([]); setSpProg(0); setSpScan(0); spAbort.current = false;
    const list = spMode === 'LIQUID' ? LIQUID_STOCKS : ALL_IDX;
    const found: SpringResult[] = [];
    for (let idx = 0; idx < list.length; idx++) {
      if (spAbort.current) break;
      const ticker = list[idx];
      try {
        const sym = `${ticker}.JK`;
        const hr = await fetch(`/api/stock/historical?symbol=${sym}&interval=1d&range=6mo`);
        if (!hr.ok) { setSpProg(Math.round(((idx + 1) / list.length) * 100)); continue; }
        const hd = await hr.json();
        const candles = hd.candles ?? hd.data ?? [];
        if (candles.length < 40) { setSpProg(Math.round(((idx + 1) / list.length) * 100)); continue; }
        setSpScan(s => s + 1);
        const qr = await fetch(`/api/stock/quote?symbol=${sym}`);
        const q = qr.ok ? await qr.json() : null;
        const a = screenSpring(candles);
        if (a) {
          const r: SpringResult = {
            ...a,
            symbol: ticker,
            price: q?.regularMarketPrice ?? q?.price ?? a.price,
            change: q?.regularMarketChange ?? q?.change ?? 0,
            changePercent: q?.regularMarketChangePercent ?? q?.changePercent ?? 0,
          };
          found.push(r);
          // Sort: A+ first, then by bullPct desc
          setSpRes([...found].sort((a, b) => {
            const gm: Record<string, number> = { 'A+': 0, 'A': 1, 'B': 2 };
            const gd = gm[a.grade] - gm[b.grade];
            return gd !== 0 ? gd : b.bullPct - a.bullPct;
          }));
        }
      } catch { }
      setSpProg(Math.round(((idx + 1) / list.length) * 100));
    }
    setSpLoad(false);
  };

  // ── Shared UI ──────────────────────────────────────────────────────────────
  const gc = {
    'PERFECT':{bg:'bg-emerald-500/15',border:'border-emerald-500/50',text:'text-emerald-300',badge:'bg-emerald-600'},
    'GOOD':   {bg:'bg-cyan-500/10',   border:'border-cyan-500/40',   text:'text-cyan-300',   badge:'bg-cyan-600'},
  };
  const vc: Record<string,string> = {'DRY UP':'text-cyan-400','NO SUPPLY':'text-cyan-400','ICEBERG':'text-blue-400','HAMMER':'text-yellow-400','GAINER HOLD':'text-emerald-400','NEUTRAL':'text-gray-500'};

  // ── VCP tab ────────────────────────────────────────────────────────────────
  const renderVCP = () => {
    const list = vcpResults?.candidates[vcpSub==='sniper'?'sniperEntry':vcpSub==='vcp'?'vcp':vcpSub==='dryup'?'dryUp':'all']??[];
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
            {(['liquid','all'] as const).map(f=>(<button key={f} onClick={()=>setVcpFilter(f)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${vcpFilter===f?'bg-blue-600 text-white':'text-gray-400 hover:text-white'}`}>{f==='liquid'?'⚡ Liquid':'📊 All IDX'}</button>))}
          </div>
          <select value={vcpLimit} onChange={e=>setVcpLimit(Number(e.target.value))} className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-3 py-2 focus:outline-none">
            <option value={50}>Top 50</option><option value={100}>Top 100</option><option value={200}>Top 200</option>
          </select>
          <button onClick={vcpLoading?()=>setVcpLoading(false):scanVCP} className={`flex items-center gap-2 px-5 py-2 rounded-lg font-medium text-sm transition-colors ml-auto ${vcpLoading?'bg-red-600 hover:bg-red-500':'bg-orange-600 hover:bg-orange-500'} text-white`}>
            {vcpLoading?<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Stop</>:<>Scan VCP</>}
          </button>
        </div>
        {vcpLoading&&<div className="bg-gray-800/60 rounded-xl p-6 text-center"><div className="w-8 h-8 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin mx-auto mb-2"/><p className="text-gray-400 text-sm">Scanning {vcpFilter==='liquid'?'200+':'800+'} stocks…</p></div>}
        {vcpError&&<div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-3 text-sm">{vcpError}</div>}
        {vcpResults&&!vcpLoading&&(
          <>
            <div className="flex gap-1 bg-gray-800/50 rounded-xl p-1">
              {(['sniper','vcp','dryup','all'] as const).map(t=>{
                const labels:Record<string,string>={sniper:`🎯 Sniper (${vcpResults.sniperCount})`,vcp:`📉 VCP (${vcpResults.vcpCount})`,dryup:`🥷 Dry Up (${vcpResults.dryUpCount})`,all:`📊 All (${vcpResults.total})`};
                return <button key={t} onClick={()=>setVcpSub(t)} className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors ${vcpSub===t?'bg-orange-600 text-white':'text-gray-400 hover:text-white'}`}>{labels[t]}</button>;
              })}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {list.map((c,idx)=>(
                <div key={`${c.symbol}-${idx}`} className={`rounded-xl border p-3 space-y-2 ${c.isSniperEntry?'bg-yellow-500/10 border-yellow-500/40':c.isVCP?'bg-blue-500/10 border-blue-500/30':'bg-gray-800/50 border-gray-700/50'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-white font-bold">{c.symbol}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium text-white ${c.isSniperEntry?'bg-yellow-600':c.isVCP?'bg-blue-600':'bg-gray-600'}`}>{c.pattern}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-white font-medium text-sm">Rp {c.price?.toLocaleString('id-ID')}</span>
                        <span className={`text-xs ${c.changePercent>=0?'text-emerald-400':'text-red-400'}`}>{c.changePercent>=0?'+':''}{c.changePercent?.toFixed(2)}%</span>
                      </div>
                    </div>
                    <div className="text-right"><div className={`font-bold text-lg ${c.vpcScore>=80?'text-emerald-400':c.vpcScore>=65?'text-yellow-400':'text-gray-300'}`}>{c.vpcScore}</div><div className="text-gray-500 text-xs">Score</div></div>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-xs text-center">
                    <div className="bg-gray-900/60 rounded p-1.5"><div className="text-gray-500">RMV</div><div className={`font-bold ${c.rmv<=15?'text-blue-400':c.rmv<=30?'text-cyan-400':'text-gray-300'}`}>{Math.round(c.rmv)}</div></div>
                    <div className="bg-gray-900/60 rounded p-1.5"><div className="text-gray-500">CPP</div><div className={`font-bold ${c.cppBias==='BULLISH'?'text-emerald-400':c.cppBias==='BEARISH'?'text-red-400':'text-gray-300'}`}>{c.cppScore>0?'+':''}{c.cppScore?.toFixed(2)}</div></div>
                    <div className="bg-gray-900/60 rounded p-1.5"><div className="text-gray-500">Phase</div><div className="text-xs text-yellow-300 truncate">{c.wyckoffPhase?.slice(0,8)}</div></div>
                  </div>
                  <p className="text-xs text-gray-400 bg-gray-900/40 rounded p-2 leading-relaxed">{c.recommendation}</p>
                  <div className="flex gap-2">
                    <button onClick={()=>router.push(buildVCPChartURL(c))} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs py-1.5 rounded-lg font-medium transition-colors">Chart</button>
                    <button onClick={()=>router.push(`/analysis?symbol=${c.symbol}`)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs py-1.5 rounded-lg font-medium transition-colors">Analysis</button>
                  </div>
                </div>
              ))}
            </div>
            {list.length===0&&<div className="text-center py-10 text-gray-500">No candidates. Try a different filter.</div>}
          </>
        )}
        {!vcpResults&&!vcpLoading&&<div className="text-center py-12"><div className="text-5xl mb-4">📊</div><p className="text-white font-medium">VCP Screener Ready</p><p className="text-gray-400 text-sm mt-1">Click <span className="text-orange-400">Scan VCP</span> to find Volatility Contraction Pattern setups.</p></div>}
      </div>
    );
  };

  // ── Swing tab ──────────────────────────────────────────────────────────────
  const swFilt = swGrade==='ALL'?swRes:swRes.filter(r=>r.grade===swGrade);
  const renderSwing = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
          {(['LIQUID','ALL'] as const).map(m=>(<button key={m} onClick={()=>setSwMode(m)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${swMode===m?'bg-blue-600 text-white':'text-gray-400 hover:text-white'}`}>{m==='LIQUID'?`⚡ Liquid (${LIQUID_STOCKS.length})`:`📊 All (${ALL_IDX.length})`}</button>))}
        </div>
        <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
          {(['ALL','PERFECT','GOOD'] as const).map(g=>(<button key={g} onClick={()=>setSwGrade(g)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${swGrade===g?'bg-indigo-600 text-white':'text-gray-400 hover:text-white'}`}>{g==='PERFECT'?'⭐ Perfect':g==='GOOD'?'✓ Good':'All'}</button>))}
        </div>
        <select value={swSort} onChange={e=>{setSwSort(e.target.value as any);setSwRes(p=>sortSw(p,e.target.value));}} className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-3 py-2 focus:outline-none">
          <option value="grade">Sort: Grade</option><option value="gain">Sort: Gain</option><option value="power">Sort: Power</option><option value="cpp">Sort: CPP</option>
        </select>
        <button onClick={swLoad?()=>{swAbort.current=true;setSwLoad(false);}:startSwing} className={`flex items-center gap-2 px-5 py-2 rounded-lg font-medium text-sm transition-colors ml-auto ${swLoad?'bg-red-600 hover:bg-red-500':'bg-emerald-600 hover:bg-emerald-500'} text-white`}>
          {swLoad?<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Stop</>:<>Scan Swing</>}
        </button>
      </div>
      {swLoad&&<div className="bg-gray-800/60 rounded-xl p-4 space-y-2"><div className="flex justify-between text-sm"><span className="text-gray-300">Scanning… <span className="text-emerald-400">{swScan} checked</span></span><span>{swProg}%</span></div><div className="h-2 bg-gray-700 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all" style={{width:`${swProg}%`}}/></div>{swRes.length>0&&<div className="text-xs text-emerald-400">✓ {swRes.length} setups</div>}</div>}
      {!swLoad&&swRes.length===0&&swScan===0&&<div className="text-center py-12"><div className="text-5xl mb-4">📈</div><p className="text-white font-medium">Swing Screener Ready</p><p className="text-gray-400 text-sm mt-1">Click <span className="text-emerald-400">Scan Swing</span> to find stocks up ≥3% with healthy calmdown.</p></div>}
      {!swLoad&&swRes.length===0&&swScan>0&&<div className="text-center py-10 text-gray-500">No setups found. Try All IDX or check tomorrow.</div>}
      {swFilt.length>0&&(
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {swFilt.map(r=>{
            const cfg=gc[r.grade]; const rr=r.price>r.stopLoss?Math.abs(r.target-r.price)/Math.abs(r.price-r.stopLoss):null;
            return (
              <div key={r.symbol} className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4 space-y-3`}>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-bold text-lg">{r.symbol}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold text-white ${cfg.badge}`}>{r.grade}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${r.entryType==='SNIPER'?'bg-orange-500/15 border-orange-500/30 text-orange-300':r.entryType==='BREAKOUT'?'bg-blue-500/15 border-blue-500/30 text-blue-300':'bg-purple-500/15 border-purple-500/30 text-purple-300'}`}>{r.entryType==='SNIPER'?'🎯 Sniper':r.entryType==='BREAKOUT'?'⚡ Breakout':'👁️ Watch'}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5"><span className="text-white font-medium">Rp {r.price.toLocaleString('id-ID')}</span><span className={`text-xs ${r.changePercent>=0?'text-emerald-400':'text-red-400'}`}>{r.changePercent>=0?'+':''}{r.changePercent.toFixed(2)}%</span></div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-emerald-400 font-bold text-xl">+{r.gainFromBase.toFixed(1)}%</div>
                    <div className="text-gray-500 text-xs">from BO</div>
                  </div>
                </div>

                {/* Ryan Filbert Phase Banner */}
                <div className={`rounded-lg p-2.5 border ${r.rfScore>=6?'bg-emerald-500/10 border-emerald-500/30':'bg-yellow-500/10 border-yellow-500/20'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold ${r.rfScore>=6?'text-emerald-400':'text-yellow-400'}`}>Ryan Filbert</span>
                      <span className="text-gray-500 text-xs">|</span>
                      <span className={`text-xs font-semibold ${r.rfScore>=6?'text-emerald-300':'text-yellow-300'}`}>Fase {r.rfPhase} — {r.rfPhaseLabel}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500">Base</span>
                      <span className="text-xs font-bold text-cyan-400">{r.baseLabel}</span>
                      <span className="text-xs text-gray-500 ml-1">RF</span>
                      <span className={`text-xs font-bold ${r.rfScore>=6?'text-emerald-400':r.rfScore>=4?'text-yellow-400':'text-gray-400'}`}>{r.rfScore}/8</span>
                    </div>
                  </div>
                  {/* 8-point checklist */}
                  <div className="grid grid-cols-4 gap-1 text-xs">
                    <div className="flex items-center gap-0.5">
                      <span className={r.aboveMA150?'text-emerald-400':'text-red-400'}>{r.aboveMA150?'✓':'✗'}</span>
                      <span className="text-gray-400">MA150</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <span className={r.aboveMA200?'text-emerald-400':'text-red-400'}>{r.aboveMA200?'✓':'✗'}</span>
                      <span className="text-gray-400">MA200</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <span className={r.ma50Rising?'text-emerald-400':'text-red-400'}>{r.ma50Rising?'✓':'✗'}</span>
                      <span className="text-gray-400">MA50↑</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <span className={r.ma150AboveMA200?'text-emerald-400':'text-red-400'}>{r.ma150AboveMA200?'✓':'✗'}</span>
                      <span className="text-gray-400">MA150&gt;200</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <span className={r.ma200Rising?'text-emerald-400':'text-orange-400'}>{r.ma200Rising?'✓':'⊘'}</span>
                      <span className="text-gray-400">MA200↑</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <span className={r.baseVolumeDryUp?'text-emerald-400':'text-orange-400'}>{r.baseVolumeDryUp?'✓':'⊘'}</span>
                      <span className="text-gray-400">Vol Dry</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <span className={r.breakoutVolumeConfirmed?'text-emerald-400':'text-orange-400'}>{r.breakoutVolumeConfirmed?'✓':'⊘'}</span>
                      <span className="text-gray-400">Vol BO</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <span className={r.cooldownVSA!=='NEUTRAL'?'text-emerald-400':'text-orange-400'}>{r.cooldownVSA!=='NEUTRAL'?'✓':'⊘'}</span>
                      <span className="text-gray-400">VSA</span>
                    </div>
                  </div>

                  {/* Volume Dry-Up Meter */}
                  <div className="mt-2 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">📊 Volume Dry-Up</span>
                      <span className={`text-xs font-bold ${r.baseVolumeDryUp ? 'text-emerald-400' : r.vol5avgPct <= 90 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {r.baseVolumeDryUp ? '✅ Sudah Kering' : `${r.vol5avgPct}% → target <65%`}
                      </span>
                    </div>
                    <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
                      {/* Fill */}
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min((r.vol5avgPct / 150) * 100, 100)}%`,
                          backgroundColor: r.baseVolumeDryUp ? '#10b981' : r.vol5avgPct <= 90 ? '#f59e0b' : '#ef4444'
                        }}
                      />
                      {/* Target marker at 65/150 = 43.3% */}
                      <div className="absolute top-0 bottom-0 w-0.5 bg-white/50" style={{ left: '43.3%' }} />
                    </div>
                    {!r.baseVolumeDryUp && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Volume cooldown rata-rata <span className="text-yellow-300">{r.vol5avgPct}%</span> dari normalnya.
                        {' '}Saham "kering" saat turun ke <span className="text-emerald-300">&lt;65%</span> — artinya penjual sudah sepi dan saham siap breakout lagi.
                      </p>
                    )}
                    {r.baseVolumeDryUp && (
                      <p className="text-xs text-emerald-400/70 mt-0.5">Penjual sudah habis — siap breakout!</p>
                    )}
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                  <div className="bg-gray-900/60 rounded-lg p-2">
                    <div className="text-gray-500">Calm</div>
                    <div className="text-white font-bold">{r.cooldownBars===0?'Today':r.cooldownBars+'d'}</div>
                    <div className={`text-xs ${r.sellVolRatio<0.3?'text-emerald-400':'text-yellow-400'}`}>sell {Math.round(r.sellVolRatio*100)}%</div>
                  </div>
                  <div className="bg-gray-900/60 rounded-lg p-2">
                    <div className="text-gray-500">CPP</div>
                    <div className={`font-bold ${r.cppBias==='BULLISH'?'text-emerald-400':r.cppBias==='BEARISH'?'text-red-400':'text-gray-300'}`}>{r.cppScore>0?'+':''}{r.cppScore}</div>
                    <div className="text-gray-500 text-xs">{r.cppBias.slice(0,4)}</div>
                  </div>
                  <div className="bg-gray-900/60 rounded-lg p-2">
                    <div className="text-gray-500">Power</div>
                    <div className={`font-bold ${r.powerScore>=70?'text-emerald-400':'text-yellow-400'}`}>{r.powerScore}</div>
                    <div className="text-gray-500 text-xs">RS {r.relativeStrength}</div>
                  </div>
                </div>

                {/* VSA + Acc */}
                <div className="flex items-center justify-between text-xs px-0.5">
                  <div><span className="text-gray-500">VSA </span><span className={`font-semibold ${vc[r.cooldownVSA]||'text-gray-400'}`}>{r.cooldownVSA}</span></div>
                  <div><span className="text-gray-500">Acc </span><span className={`font-semibold ${r.accRatio>=1.5?'text-emerald-400':'text-yellow-400'}`}>{r.accRatio.toFixed(1)}x</span></div>
                  <div><span className="text-gray-500">RMV </span><span className={`font-semibold ${r.rmv<=20?'text-blue-400':r.rmv<=40?'text-cyan-400':'text-gray-300'}`}>{Math.round(r.rmv)}</span></div>
                  <div><span className="text-gray-500">Mtm </span><span className={`font-semibold ${r.momentum10>0?'text-emerald-400':'text-orange-400'}`}>{r.momentum10>0?'+':''}{r.momentum10.toFixed(1)}%</span></div>
                </div>

                {/* SL / RR / TP */}
                <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-1.5"><div className="text-red-400 font-medium">SL</div><div className="text-white">{r.stopLoss.toLocaleString('id-ID')}</div></div>
                  <div className="bg-gray-800/60 rounded-lg p-1.5 flex flex-col items-center justify-center">{rr?<><div className="text-gray-500">R:R</div><div className={`font-bold ${rr>=2?'text-emerald-400':'text-yellow-400'}`}>1:{rr.toFixed(1)}</div></>:<span className="text-gray-600">—</span>}</div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-1.5"><div className="text-emerald-400 font-medium">TP</div><div className="text-white">{r.target.toLocaleString('id-ID')}</div></div>
                </div>

                {/* Reason */}
                <div className="text-xs text-gray-400 bg-gray-900/50 rounded-lg px-2.5 py-2 leading-relaxed">{r.reason}</div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button onClick={()=>router.push(buildSwingChartURL(r))} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs py-2 rounded-lg font-medium transition-colors">📊 Chart</button>
                  <button onClick={()=>router.push(`/analysis?symbol=${r.symbol}`)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs py-2 rounded-lg font-medium transition-colors">🔬 Analysis</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── Scalp tab ──────────────────────────────────────────────────────────────
  const scFilt = scGrade==='ALL'?scRes:scRes.filter(r=>r.grade===scGrade);
  const renderScalp = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
          {(['5m','15m'] as const).map(tf=>(<button key={tf} onClick={()=>{setScTf(tf);setScRes([]);setScScan(0);}} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${scTf===tf?'bg-yellow-500 text-gray-900':'text-gray-400 hover:text-white'}`}>{tf}</button>))}
        </div>
        <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
          {(['LIQUID','ALL'] as const).map(m=>(<button key={m} onClick={()=>setScMode(m)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${scMode===m?'bg-blue-600 text-white':'text-gray-400 hover:text-white'}`}>{m==='LIQUID'?'⚡ Liquid':'📊 All'}</button>))}
        </div>
        <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
          {(['ALL','PERFECT','GOOD'] as const).map(g=>(<button key={g} onClick={()=>setScGrade(g)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${scGrade===g?'bg-indigo-600 text-white':'text-gray-400 hover:text-white'}`}>{g}</button>))}
        </div>
        <button onClick={scLoad?()=>{scAbort.current=true;setScLoad(false);}:startScalp} className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm transition-colors ml-auto ${scLoad?'bg-red-600 hover:bg-red-500 text-white':'bg-yellow-500 hover:bg-yellow-400 text-gray-900'}`}>
          {scLoad?<><div className="w-4 h-4 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin"/>Stop</>:<>⚡ Scan {scTf}</>}
        </button>
      </div>
      {scLoad&&<div className="bg-gray-800/60 rounded-xl p-4 space-y-2"><div className="flex justify-between text-sm"><span className="text-gray-300">Scanning <span className="text-yellow-400 font-bold">{scTf}</span> — {scScan}/{scMode==='LIQUID'?LIQUID_STOCKS.length:ALL_IDX.length}</span><span>{scProg}%</span></div><div className="h-2 bg-gray-700 rounded-full overflow-hidden"><div className="h-full bg-yellow-500 rounded-full transition-all" style={{width:`${scProg}%`}}/></div>{scRes.length>0&&<div className="text-xs text-emerald-400">⚡ {scRes.length} scalp setups</div>}</div>}
      {!scLoad&&scRes.length===0&&scScan===0&&<div className="text-center py-12"><div className="text-5xl mb-4">⚡</div><p className="text-white font-medium">Scalp Screener Ready</p><p className="text-gray-400 text-sm mt-1">Click <span className="text-yellow-400 font-bold">⚡ Scan {scTf}</span> to find HAKA spike + calmdown setups.</p></div>}
      {!scLoad&&scRes.length===0&&scScan>0&&<div className="text-center py-10 text-gray-500">No scalp setups. Try {scTf==='5m'?'15m':'5m'} or wait for active market.</div>}
      {scFilt.length>0&&(
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {scFilt.map((r,idx)=>{
            const cfg=gc[r.grade]; const rr=r.price>r.stopLoss?Math.abs(r.target-r.price)/Math.abs(r.price-r.stopLoss):null;
            const cm=r.calmBars*(r.timeframe==='5m'?5:15);
            return (
              <div key={`${r.symbol}-${idx}`} className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4 space-y-3`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-bold text-lg">{r.symbol}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold text-white ${cfg.badge}`}>{r.grade}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${r.entryType==='SNIPER'?'bg-orange-500/15 border-orange-500/30 text-orange-300':'bg-purple-500/15 border-purple-500/30 text-purple-300'}`}>{r.entryType==='SNIPER'?'🎯 Sniper':'👁️ Watch'}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 font-mono">{r.timeframe}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5"><span className="text-white font-medium">Rp {r.price.toLocaleString('id-ID')}</span><span className={`text-xs ${r.changePercent>=0?'text-emerald-400':'text-red-400'}`}>{r.changePercent>=0?'+':''}{r.changePercent.toFixed(2)}%</span></div>
                  </div>
                  <div className="text-right shrink-0"><div className="text-yellow-400 font-bold text-lg">+{r.runGainPct.toFixed(1)}%</div><div className="text-gray-500 text-xs">spike ({r.runBars}b)</div></div>
                </div>
                <div className="bg-gray-900/60 rounded-lg p-2.5 grid grid-cols-3 gap-1 text-center text-xs">
                  <div><div className="text-gray-500">Spike</div><div className="text-yellow-300 font-bold">+{r.runGainPct.toFixed(1)}%</div></div>
                  <div><div className="text-gray-500">Calm</div><div className="text-cyan-300 font-bold">{cm}min</div></div>
                  <div><div className="text-gray-500">Signal</div><div className={`font-bold ${r.cppBias==='BULLISH'?'text-emerald-400':'text-gray-300'}`}>{r.cppBias==='BULLISH'?'GO':'WAIT'}</div></div>
                </div>
                <div className="flex items-center justify-between text-xs px-0.5">
                  <div><span className="text-gray-500">VSA </span><span className={`font-semibold ${vc[r.vsaSignal]??'text-gray-400'}`}>{r.vsaSignal}</span></div>
                  <div><span className="text-gray-500">Acc </span><span className={`font-semibold ${r.accRatio>=1.5?'text-emerald-400':'text-yellow-400'}`}>{r.accRatio.toFixed(1)}x</span></div>
                  <div><span className="text-gray-500">RMV </span><span className={`font-semibold ${r.rmv<=30?'text-emerald-400':'text-gray-300'}`}>{Math.round(r.rmv)}</span></div>
                  <div><span className="text-gray-500">MA20 </span><span className={`font-semibold ${r.aboveMA20?'text-emerald-400':'text-red-400'}`}>{r.aboveMA20?'✓':'✗'}</span></div>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-1.5"><div className="text-red-400 font-medium">SL</div><div className="text-white">{r.stopLoss.toLocaleString('id-ID')}</div></div>
                  <div className="bg-gray-800/60 rounded-lg p-1.5 flex flex-col items-center justify-center">{rr?<><div className="text-gray-500">R:R</div><div className={`font-bold ${rr>=2?'text-emerald-400':'text-yellow-400'}`}>1:{rr.toFixed(1)}</div></>:<span className="text-gray-600">—</span>}</div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-1.5"><div className="text-emerald-400 font-medium">TP</div><div className="text-white">{r.target.toLocaleString('id-ID')}</div></div>
                </div>
                <div className="text-xs text-gray-400 bg-gray-900/50 rounded-lg px-2.5 py-2">{r.reason}</div>
                <div className="flex gap-2">
                  <button onClick={()=>router.push(buildScalpChartURL(r))} className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-gray-900 text-xs py-2 rounded-lg font-bold transition-colors">⚡ Chart {r.timeframe}</button>
                  <button onClick={()=>router.push(`/analysis?symbol=${r.symbol}`)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs py-2 rounded-lg font-medium transition-colors">🔬 Analysis</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── Spring tab ─────────────────────────────────────────────────────────────
  const spFilt = spRes.filter(r => {
    if (spGrade !== 'ALL' && r.grade !== spGrade) return false;
    if (spType === 'STRONG' && r.springType !== 'STRONG') return false;
    if (spType === 'MODERATE' && r.springType === 'WEAK') return false;
    return true;
  });
  const renderSpring = () => (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
          {(['LIQUID','ALL'] as const).map(m=>(
            <button key={m} onClick={()=>setSpMode(m)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${spMode===m?'bg-blue-600 text-white':'text-gray-400 hover:text-white'}`}>
              {m==='LIQUID'?`⚡ Liquid (${LIQUID_STOCKS.length})`:`📊 All (${ALL_IDX.length})`}
            </button>
          ))}
        </div>
        <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
          {(['ALL','STRONG','MODERATE'] as const).map(t=>(
            <button key={t} onClick={()=>setSpType(t)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${spType===t?'bg-green-600 text-white':'text-gray-400 hover:text-white'}`}>
              {t==='ALL'?'All':t==='STRONG'?'💪 Strong':'⚡ Moderate'}
            </button>
          ))}
        </div>
        <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
          {(['ALL','PERFECT','GOOD'] as const).map(g=>
            <button key={g} onClick={()=>setSpGrade(g)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${spGrade===g?'bg-indigo-600 text-white':'text-gray-400 hover:text-white'}`}>{g}</button>
          )}
        </div>
        <button
          onClick={spLoad ? ()=>{spAbort.current=true;setSpLoad(false);} : startSpring}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm transition-colors ml-auto ${spLoad?'bg-red-600 hover:bg-red-500 text-white':'bg-green-600 hover:bg-green-500 text-white'}`}
        >
          {spLoad
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Stop</>
            : <>🌱 Scan Spring</>}
        </button>
      </div>

      {/* Progress */}
      {spLoad && (
        <div className="bg-gray-800/60 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Scanning Spring setups… <span className="text-green-400">{spScan} checked</span></span>
            <span>{spProg}%</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{width:`${spProg}%`}}/>
          </div>
          {spRes.length > 0 && <div className="text-xs text-green-400">🌱 {spRes.length} Spring setups found</div>}
        </div>
      )}

      {/* Empty states */}
      {!spLoad && spRes.length === 0 && spScan === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🌱</div>
          <p className="text-white font-bold text-lg">Spring Screener</p>
          <p className="text-gray-400 text-sm mt-1 max-w-md mx-auto">
            Mencari <strong className="text-green-400">Wyckoff Spring</strong> — saham yang tembus support pivot tapi volume beli mendominasi.
            Setup paling bullish dalam teori Wyckoff: harga dipaksa turun untuk ambil likuiditas lalu langsung mantul.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3 max-w-sm mx-auto text-xs">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2.5">
              <div className="text-green-400 font-bold text-base">🌱 SP</div>
              <div className="text-gray-400 mt-0.5">Fake breakdown — buyers dominate</div>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2.5">
              <div className="text-blue-400 font-bold text-base">Bull%</div>
              <div className="text-gray-400 mt-0.5">Volume beli saat tembus support</div>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2.5">
              <div className="text-purple-400 font-bold text-base">Recovery</div>
              <div className="text-gray-400 mt-0.5">Harga kembali di atas pivot</div>
            </div>
          </div>
          <p className="text-gray-500 text-xs mt-4">Klik <span className="text-green-400 font-bold">🌱 Scan Spring</span> untuk mulai.</p>
        </div>
      )}
      {!spLoad && spRes.length === 0 && spScan > 0 && (
        <div className="text-center py-10 text-gray-500">
          <div className="text-4xl mb-2">🌱</div>
          <p>Tidak ada Spring setup ditemukan. Coba All IDX atau wait for market correction.</p>
          <p className="text-xs mt-1 text-gray-600">Spring hanya muncul saat ada tekanan jual yang diserap institusi di pivot support.</p>
        </div>
      )}

      {/* Results */}
      {spFilt.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-gray-500 px-1">
            <span className="text-green-400 font-medium">{spFilt.length}</span> Spring setups
            {spFilt.filter(r=>r.grade==='PERFECT').length > 0 && <span className="ml-2 text-emerald-400">⭐ {spFilt.filter(r=>r.grade==='PERFECT').length} PERFECT</span>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {spFilt.map(r => {
              const cfg = gc[r.grade];
              const rr = r.price > r.stopLoss ? Math.abs(r.target - r.price) / Math.abs(r.price - r.stopLoss) : null;
              const springColor = r.springType === 'STRONG' ? 'text-emerald-400' : r.springType === 'MODERATE' ? 'text-yellow-400' : 'text-gray-400';
              const springBg = r.springType === 'STRONG' ? 'bg-emerald-500/10 border-emerald-500/40' : r.springType === 'MODERATE' ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-gray-800/50 border-gray-700/50';
              return (
                <div key={r.symbol} className={`rounded-xl border ${springBg} p-4 space-y-3`}>
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-bold text-lg">{r.symbol}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold text-white ${cfg.badge}`}>{r.grade}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${r.springType === 'STRONG' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : r.springType === 'MODERATE' ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300' : 'bg-gray-700/50 border-gray-600/50 text-gray-400'}`}>
                          🌱 {r.springType}
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
                      <div className={`font-bold text-xl ${springColor}`}>{r.bullPct}%</div>
                      <div className="text-gray-500 text-xs">Bull Vol</div>
                    </div>
                  </div>

                  {/* BVD Spring info */}
                  <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-2.5">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-green-400 font-semibold">🌱 Wyckoff Spring</span>
                      <span className="text-gray-500">{r.springBarsAgo === 0 ? 'Today' : r.springBarsAgo + 'd ago'}</span>
                    </div>
                    {/* Bull/Bear bar */}
                    <div className="h-3 rounded-full overflow-hidden bg-red-900/50 flex">
                      <div className="h-full bg-green-500 rounded-l-full transition-all" style={{width:`${r.bullPct}%`}}/>
                      <div className="h-full bg-red-500 flex-1 rounded-r-full"/>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-green-400">Bull {r.bullPct}%</span>
                      <span className="text-gray-500">Pivot Rp {Math.round(r.pivotLevel).toLocaleString('id-ID')}</span>
                      <span className="text-red-400">Bear {r.bearPct}%</span>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                    <div className="bg-gray-900/60 rounded-lg p-2">
                      <div className="text-gray-500">Recovery</div>
                      <div className={`font-bold ${r.recoverPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {r.recoverPct >= 0 ? '+' : ''}{r.recoverPct}%
                      </div>
                    </div>
                    <div className="bg-gray-900/60 rounded-lg p-2">
                      <div className="text-gray-500">CPP</div>
                      <div className={`font-bold ${r.cppBias === 'BULLISH' ? 'text-emerald-400' : r.cppBias === 'BEARISH' ? 'text-red-400' : 'text-gray-300'}`}>
                        {r.cppScore > 0 ? '+' : ''}{r.cppScore}
                      </div>
                    </div>
                    <div className="bg-gray-900/60 rounded-lg p-2">
                      <div className="text-gray-500">Power</div>
                      <div className={`font-bold ${r.powerScore >= 70 ? 'text-emerald-400' : 'text-yellow-400'}`}>{r.powerScore}</div>
                    </div>
                  </div>

                  {/* VSA + MA */}
                  <div className="flex items-center justify-between text-xs px-0.5">
                    <div><span className="text-gray-500">VSA </span><span className={`font-semibold ${vc[r.vsaSignal] || 'text-gray-400'}`}>{r.vsaSignal}</span></div>
                    <div><span className="text-gray-500">Acc </span><span className={`font-semibold ${r.accRatio >= 1.5 ? 'text-emerald-400' : 'text-yellow-400'}`}>{r.accRatio.toFixed(1)}x</span></div>
                    <div><span className="text-gray-500">MA20 </span><span className={`font-semibold ${r.aboveMA20 ? 'text-emerald-400' : 'text-orange-400'}`}>{r.aboveMA20 ? '✓' : '✗'}</span></div>
                    <div><span className="text-gray-500">RMV </span><span className={`font-semibold ${r.rmv <= 30 ? 'text-blue-400' : 'text-gray-300'}`}>{Math.round(r.rmv)}</span></div>
                  </div>

                  {/* SL / TP */}
                  <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-1.5">
                      <div className="text-red-400 font-medium">SL</div>
                      <div className="text-white">{r.stopLoss.toLocaleString('id-ID')}</div>
                    </div>
                    <div className="bg-gray-800/60 rounded-lg p-1.5 flex flex-col items-center justify-center">
                      {rr ? <><div className="text-gray-500">R:R</div><div className={`font-bold ${rr >= 2 ? 'text-emerald-400' : 'text-yellow-400'}`}>1:{rr.toFixed(1)}</div></> : <span className="text-gray-600">—</span>}
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-1.5">
                      <div className="text-emerald-400 font-medium">TP</div>
                      <div className="text-white">{r.target.toLocaleString('id-ID')}</div>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="text-xs text-gray-400 bg-gray-900/50 rounded-lg px-2.5 py-2 leading-relaxed">{r.reason}</div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button onClick={()=>router.push(buildSpringChartURL(r))} className="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs py-2 rounded-lg font-bold transition-colors">🌱 Chart</button>
                    <button onClick={()=>router.push(`/analysis?symbol=${r.symbol}`)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs py-2 rounded-lg font-medium transition-colors">🔬 Analysis</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // LAYOUT
  // ─────────────────────────────────────────────────────────────────────────
  const tabs = [
    { key:'swing', label:'Swing', icon:<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>, color:'bg-emerald-600', desc:'Daily · 1–5 day hold' },
    { key:'vcp',   label:'VCP',   icon:<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>, color:'bg-orange-600', desc:'Daily · Wyckoff + VCP' },
    { key:'scalp', label:'Scalp', icon:<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>, color:'bg-yellow-500', desc:'5m/15m · Intraday' },
    { key:'spring',label:'Spring',icon:<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>, color:'bg-green-600', desc:'Daily · Fake Breakdown' },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-white">
      {/* Nav */}
      <nav className="backdrop-blur-xl bg-black/40 border-b border-white/10 px-3 py-2.5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-gray-400 hover:text-white transition flex items-center gap-1.5 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
              <span className="hidden sm:inline">Chart</span>
            </Link>
            <span className="text-gray-600">/</span>
            <span className="text-white font-semibold text-sm flex items-center gap-1.5">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707l-6.414 6.414A1 1 0 0014 13.828V19a1 1 0 01-.553.894l-4 2A1 1 0 018 21v-7.172a1 1 0 00-.293-.707L1.293 6.707A1 1 0 011 6V4z"/></svg>
              Screener
            </span>
          </div>
          <div className="flex gap-2 text-xs">
            <Link href="/analysis" className="text-gray-400 hover:text-white transition px-2 py-1 rounded-lg hover:bg-white/5">Analysis</Link>
            <Link href="/guide" className="text-blue-400 hover:text-blue-300 transition px-2 py-1 rounded-lg hover:bg-white/5">Guide</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-3 md:px-4 py-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Stock Screener</h1>
          <p className="text-gray-400 text-sm mt-0.5">Pilih strategi untuk scan saham IDX menggunakan Wyckoff + VSA + VCP</p>
        </div>

        {/* Tab selector cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {tabs.map(t=>
            <button key={t.key} onClick={()=>changeTab(t.key)} className={`rounded-xl border p-3 md:p-4 text-left transition-all group ${activeTab===t.key?`${t.color} border-transparent shadow-lg`:'bg-gray-800/50 border-gray-700/50 hover:bg-gray-800 hover:border-gray-600'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={activeTab===t.key?'text-white':'text-gray-400 group-hover:text-white'}>{t.icon}</span>
                <span className={`font-bold text-sm md:text-base ${activeTab===t.key?'text-white':'text-gray-300'}`}>{t.label}</span>
              </div>
              <div className={`text-xs ${activeTab===t.key?'text-white/80':'text-gray-500'}`}>{t.desc}</div>
            </button>
          )}
        </div>

        {/* Description */}
        <div className="bg-gray-800/30 border border-gray-700/30 rounded-xl p-3 text-xs text-gray-400">
          {activeTab==='swing'&&<span>📈 <strong className="text-white">Short Swing</strong>: Candle harian — saham sudah naik ≥3% sedang <em>calmdown</em> dengan tekanan jual rendah. Target <span className="text-emerald-400">1–5 hari lanjutan</span>. Cocok untuk position trading setelah pullback.</span>}
          {activeTab==='vcp'&&<span>📊 <strong className="text-white">VCP (Volatility Contraction Pattern)</strong>: Candle harian — pola Minervini VCP + fase Wyckoff + sinyal VSA. Mendeteksi <span className="text-orange-400">Sniper Entry, VCP Base, Dry Up, Iceberg</span>. Cocok untuk breakout swing.</span>}
          {activeTab==='scalp'&&<span>⚡ <strong className="text-white">Scalp</strong>: Intraday 5m/15m — mencari HAKA spike + calmdown dengan vol jual rendah. <span className="text-yellow-400">Entry intraday only</span>. Gunakan saat jam IDX 09:00–15:00 WIB.</span>}
          {activeTab==='spring'&&<span>🌱 <strong className="text-white">Spring / Fake Breakdown</strong>: Wyckoff Spring — harga tembus <em>support pivot</em> tapi pembeli mendominasi volume (Bull% ≥ 50%). Harga mantul kembali ke atas level support = <span className="text-green-400">tanda akumulasi institusional tersembunyi</span>. Salah satu setup terkuat dalam teori Wyckoff.</span>}
        </div>

        {/* Content */}
        {activeTab==='swing'&&renderSwing()}
        {activeTab==='vcp'&&renderVCP()}
        {activeTab==='scalp'&&renderScalp()}
        {activeTab==='spring'&&renderSpring()}
      </div>
    </div>
  );
}

export default function ScreenerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="w-10 h-10 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"/></div>}>
      <ScreenerContent />
    </Suspense>
  );
}
