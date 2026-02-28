'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

// =============================================================================
// TYPES
// =============================================================================
interface AnalysisResult {
  symbol: string; price: number; change: number; changePercent: number;
  wyckoffPhase: string; wyckoffDetail: string;
  vsaSignal: string; vsaDetail: string;
  vcpStatus: string; vcpDetail: string;
  cppScore: number; cppBias: string; cppRaw: number; evrScore: number;
  p4: P4Result; bvd: BVDResult;
  isHaka: boolean; hakaDetail: string;
  suggestion: 'BUY' | 'WAIT' | 'SELL' | 'WATCH';
  confidence: number; reasons: string[];
  stopLoss?: number; target?: number;
  ma20: number; ma50: number; ma200: number;
  ema8: number; ema21: number; ema50: number;
  volRatio: number; accRatio: number; rmv: number; momentum: number; adxValue: number;
}
interface P4Result {
  longPct: number; shortPct: number; confluenceLong: number; confluenceShort: number;
  verdict: 'BULL' | 'BEAR' | 'NEUTRAL'; longPerfect: boolean; shortPerfect: boolean;
  isUptrend: boolean; deltaBullish: boolean; rsiValue: number; rsiAbove50: boolean;
  stochK: number; stochD: number; stochAbove50: boolean;
  adxValue: number; adxStrong: boolean; volRatio: number; volRegime: 'HIGH' | 'MEDIUM' | 'LOW';
  macdBull: boolean; macdHistValue: number; ema8: number; ema21: number; ema50: number;
  volumeDeltaValue: number; deltaMomentum: boolean; longScore: number; shortScore: number;
}
interface BVDResult {
  detected: boolean; isBullBreak: boolean; bullPct: number; bearPct: number;
  isFake: boolean; isReal: boolean; level: number; barsSince: number;
}

// =============================================================================
// MATH HELPERS
// =============================================================================
function calcSMA(arr: number[], period: number, i: number): number {
  if (i < period - 1) return 0;
  let s = 0; for (let j = i - period + 1; j <= i; j++) s += arr[j] || 0; return s / period;
}
function calcEMA(arr: number[], period: number, i: number): number {
  if (!arr.length || i < 0) return 0;
  if (i < period - 1) return arr[i] || 0;
  const k = 2 / (period + 1);
  let ema = arr[Math.max(0, i - period)] || 0;
  for (let j = Math.max(1, i - period + 1); j <= i; j++) ema = (arr[j] || 0) * k + ema * (1 - k);
  return ema;
}
function calcATR(H: number[], L: number[], C: number[], period: number, i: number): number {
  if (i < 1) return (H[i] || 0) - (L[i] || 0);
  const start = Math.max(1, i - period + 1); let s = 0, cnt = 0;
  for (let j = start; j <= i; j++) {
    const pc = C[j - 1] ?? C[j];
    s += Math.max((H[j]||0)-(L[j]||0), Math.abs((H[j]||0)-pc), Math.abs((L[j]||0)-pc)); cnt++;
  }
  return cnt > 0 ? s / cnt : 0;
}
function calcRSI(C: number[], period: number, i: number): number {
  if (i < period) return 50;
  let gains = 0, losses = 0;
  for (let j = i - period + 1; j <= i; j++) { const d = (C[j]||0)-(C[j-1]||0); if (d > 0) gains += d; else losses -= d; }
  return 100 - (100 / (1 + gains / (losses || 0.0001)));
}
function calcStoch(H: number[], L: number[], C: number[], period: number, i: number): number {
  if (i < period - 1) return 50;
  const hh = Math.max(...H.slice(i - period + 1, i + 1));
  const ll = Math.min(...L.slice(i - period + 1, i + 1));
  return hh === ll ? 50 : ((C[i] - ll) / (hh - ll)) * 100;
}
function calcMACD(C: number[], i: number): { macdLine: number; signal: number; hist: number } {
  const ema12 = calcEMA(C, 12, i), ema26 = calcEMA(C, 26, i);
  const macdLine = ema12 - ema26;
  const sigArr: number[] = [];
  for (let k = Math.max(0, i - 30); k <= i; k++) sigArr.push(calcEMA(C, 12, k) - calcEMA(C, 26, k));
  const signal = sigArr.length >= 9 ? calcEMA(sigArr, 9, sigArr.length - 1) : macdLine;
  return { macdLine, signal, hist: macdLine - signal };
}
function calcADX(H: number[], L: number[], C: number[], period: number, i: number): number {
  if (i < period * 2) return 15;
  let dmP = 0, dmM = 0, tr = 0;
  for (let j = i - period + 1; j <= i; j++) {
    const u = (H[j]||0) - (H[j-1]||0), d = (L[j-1]||0) - (L[j]||0);
    if (u > d && u > 0) dmP += u; if (d > u && d > 0) dmM += d;
    const pc = C[j-1] || C[j];
    tr += Math.max((H[j]||0)-(L[j]||0), Math.abs((H[j]||0)-pc), Math.abs((L[j]||0)-pc));
  }
  if (!tr) return 15;
  const diP = (dmP/tr)*100, diM = (dmM/tr)*100;
  return Math.abs(diP-diM) / ((diP+diM)||0.0001) * 100;
}
function calcCPP(C: number[], O: number[], H: number[], L: number[], V: number[], i: number): number {
  if (i < 14) return 0;
  let vs = 0; for (let k = 0; k < 10; k++) vs += V[i-k]||0;
  const vm = vs/10||1; let cpp = 0;
  for (let j = 0; j < 5; j++) {
    const k = i - j, r = (H[k]||0)-(L[k]||0) || 0.0001;
    cpp += ((C[k]||0)-(O[k]||0))/r * ((V[k]||0)/vm) * ((5-j)/5);
  }
  return cpp;
}
function calcRMV(H: number[], L: number[], C: number[], i: number): number {
  if (i < 25) return 50;
  const vals = Array.from({length:20},(_,k)=>calcATR(H,L,C,5,i-19+k));
  const cur = vals[19], mn = Math.min(...vals), mx = Math.max(...vals);
  return mx===mn ? 50 : ((cur-mn)/(mx-mn))*100;
}

// =============================================================================
// PREDICTA V4
// =============================================================================
function calcPredictaV4(C: number[], O: number[], H: number[], L: number[], V: number[], i: number): P4Result {
  const def: P4Result = { longPct:50,shortPct:50,confluenceLong:0,confluenceShort:0,verdict:'NEUTRAL',longPerfect:false,shortPerfect:false,isUptrend:false,deltaBullish:false,rsiValue:50,rsiAbove50:false,stochK:50,stochD:50,stochAbove50:false,adxValue:15,adxStrong:false,volRatio:1,volRegime:'MEDIUM',macdBull:false,macdHistValue:0,ema8:C[i]||0,ema21:C[i]||0,ema50:C[i]||0,volumeDeltaValue:0,deltaMomentum:false,longScore:50,shortScore:50 };
  if (i < 50) return def;
  const ema8=calcEMA(C,8,i),ema21=calcEMA(C,21,i),ema50=calcEMA(C,50,i);
  const stATR=calcATR(H,L,C,10,i);
  const hl2=((H[i]||0)+(L[i]||0))/2;
  const isUptrend=(C[i]||0)>(hl2-3*stATR)&&(C[i]||0)>(hl2+3*stATR)*0.97;
  const cr=(H[i]||0)-(L[i]||0);
  const bvD=cr>0?(V[i]||0)*((C[i]||0)-(L[i]||0))/cr:(V[i]||0)*0.5;
  const svD=cr>0?(V[i]||0)*((H[i]||0)-(C[i]||0))/cr:(V[i]||0)*0.5;
  const volumeDeltaValue=bvD-svD;
  let ds1=0,ds2=0;
  for(let k=0;k<5&&i-k>=0;k++){const r=(H[i-k]||0)-(L[i-k]||0);ds1+=r>0?(V[i-k]||0)*((C[i-k]||0)-(L[i-k]||0))/r-(V[i-k]||0)*((H[i-k]||0)-(C[i-k]||0))/r:0;}
  for(let k=5;k<10&&i-k>=0;k++){const r=(H[i-k]||0)-(L[i-k]||0);ds2+=r>0?(V[i-k]||0)*((C[i-k]||0)-(L[i-k]||0))/r-(V[i-k]||0)*((H[i-k]||0)-(C[i-k]||0))/r:0;}
  const deltaMomentum=ds1>ds2,deltaBullish=volumeDeltaValue>0;
  const rsiValue=Math.round(calcRSI(C,14,i)),rsiAbove50=rsiValue>50,rsiBelow50=rsiValue<50;
  const stochK=Math.round(calcStoch(H,L,C,14,i)),stochD=Math.round(calcStoch(H,L,C,14,Math.max(0,i-2)));
  const {macdLine,signal,hist:macdHistValue}=calcMACD(C,i);
  const macdBull=macdLine>signal,macdBear=!macdBull;
  const adxValue=Math.round(calcADX(H,L,C,14,i)),adxStrong=adxValue>=25;
  const adxScore=adxValue>35?100:adxValue>30?85:adxValue>25?70:adxValue>20?50:30;
  let vs=0; for(let k=i-19;k<=i;k++) vs+=V[k]||0;
  const volRatio=(V[i]||0)/(vs/20||1);
  const volScore=volRatio>2?100:volRatio>1.5?80:volRatio>1?60:volRatio>0.8?45:25;
  const atr14=calcATR(H,L,C,14,i),atr100=calcATR(H,L,C,100,i);
  const ap=atr100>0?(atr14/atr100)*50:50;
  const volRegime:P4Result['volRegime']=ap>75?'HIGH':ap<25?'LOW':'MEDIUM';
  const vm=volRegime==='HIGH'?0.85:volRegime==='LOW'?1.15:1.0;
  const isDown=!isUptrend;
  const tL=isUptrend&&ema8>ema21&&ema21>ema50?100:isUptrend&&ema8>ema21?80:isUptrend?60:0;
  const tS=isDown&&ema8<ema21&&ema21<ema50?100:isDown&&ema8<ema21?80:isDown?60:0;
  const mL=macdBull&&macdHistValue>0?100:macdBull?70:macdHistValue>0?50:20;
  const mS=macdBear&&macdHistValue<0?100:macdBear?70:macdHistValue<0?50:20;
  const dL=deltaBullish&&deltaMomentum?100:deltaBullish?75:20;
  const dS=!deltaBullish&&!deltaMomentum?100:!deltaBullish?75:20;
  const rL=rsiValue<30?100:rsiValue<40?85:rsiValue<50?70:rsiValue<60?50:25;
  const rS=rsiValue>70?100:rsiValue>60?85:rsiValue>50?70:rsiValue>40?50:25;
  const sL=stochK>stochD&&stochK<20?100:stochK>stochD&&stochK<50?85:stochK>stochD?65:25;
  const sS=stochK<stochD&&stochK>80?100:stochK<stochD&&stochK>50?85:stochK<stochD?65:25;
  const lR=tL*.23+mL*.18+dL*.15+rL*.12+sL*.12+adxScore*.10+volScore*.10;
  const sR=tS*.23+mS*.18+dS*.15+rS*.12+sS*.12+adxScore*.10+volScore*.10;
  const longScore=Math.round(Math.min(100,Math.max(0,lR*vm)));
  const shortScore=Math.round(Math.min(100,Math.max(0,sR*vm)));
  const tot=longScore+shortScore;
  const longPct=tot>0?Math.round(longScore/tot*100):50,shortPct=100-longPct;
  const cL=(isUptrend?1:0)+(ema8>ema21?1:0)+(macdBull?1:0)+(stochK>stochD?1:0)+(volRatio>=0.8?1:0)+(adxStrong?1:0)+(rsiAbove50?1:0)+(deltaBullish?1:0);
  const cS=(isDown?1:0)+(ema8<ema21?1:0)+(macdBear?1:0)+(stochK<stochD?1:0)+(volRatio>=0.8?1:0)+(adxStrong?1:0)+(rsiBelow50?1:0)+(!deltaBullish?1:0);
  const dt=adxValue>30?55:60;
  const longPerfect=isUptrend&&longPct>=dt&&cL>=5&&volRatio>=0.8&&rsiAbove50&&deltaBullish;
  const shortPerfect=isDown&&shortPct>=dt&&cS>=5&&volRatio>=0.8&&rsiBelow50&&!deltaBullish;
  const verdict:P4Result['verdict']=longPct>=60?'BULL':shortPct>=60?'BEAR':'NEUTRAL';
  return {longPct,shortPct,confluenceLong:cL,confluenceShort:cS,verdict,longPerfect,shortPerfect,isUptrend,deltaBullish,rsiValue,rsiAbove50,stochK,stochD,stochAbove50:stochK>50,adxValue,adxStrong,volRatio,volRegime,macdBull,macdHistValue,ema8,ema21,ema50,volumeDeltaValue,deltaMomentum,longScore,shortScore};
}

// =============================================================================
// BVD
// =============================================================================
function calcBVD(H: number[], L: number[], C: number[], O: number[], V: number[], i: number): BVDResult {
  const empty:BVDResult={detected:false,isBullBreak:false,bullPct:50,bearPct:50,isFake:false,isReal:false,level:0,barsSince:0};
  if (i < 20) return empty;
  let ph=-Infinity,pl=Infinity;
  const lb=Math.min(15,i-1);
  for(let k=i-lb;k<i;k++){if((H[k]||0)>ph)ph=H[k]||0;if((L[k]||0)<pl)pl=L[k]||0;}
  const bkH=(C[i]||0)>ph||(H[i]||0)>ph,bkL=(C[i]||0)<pl||(L[i]||0)<pl;
  if(!bkH&&!bkL)return empty;
  const cr=(H[i]||0)-(L[i]||0);
  const bv=cr>0?(V[i]||0)*((C[i]||0)-(L[i]||0))/cr:(V[i]||0)*0.5;
  const sv=cr>0?(V[i]||0)*((H[i]||0)-(C[i]||0))/cr:(V[i]||0)*0.5;
  const tot=bv+sv;
  const bullPct=Math.round(tot>0?(bv/tot)*100:50),bearPct=100-bullPct;
  const isBullBreak=bkH,isFake=isBullBreak?bearPct>55:bullPct>55;
  return{detected:true,isBullBreak,bullPct,bearPct,isFake,isReal:!isFake,level:isBullBreak?ph:pl,barsSince:0};
}

// =============================================================================
// MAIN ANALYSIS ENGINE
// =============================================================================
function analyzeStock(data:any[],symbol:string,price:number,change:number,changePct:number):AnalysisResult{
  const C:number[]=[],O:number[]=[],H:number[]=[],L:number[]=[],V:number[]=[];
  for(const d of data){if(d.close!==null&&d.volume>0){C.push(+d.close||0);O.push(+d.open||0);H.push(+d.high||0);L.push(+d.low||0);V.push(+d.volume||0);}}
  const n=C.length;
  const emptyP4=calcPredictaV4(C,O,H,L,V,0);
  const emptyBVD:BVDResult={detected:false,isBullBreak:false,bullPct:50,bearPct:50,isFake:false,isReal:false,level:0,barsSince:0};
  if(n<50)return{symbol,price,change,changePercent:changePct,wyckoffPhase:'UNKNOWN',wyckoffDetail:'Insufficient data',vsaSignal:'UNKNOWN',vsaDetail:'',vcpStatus:'UNKNOWN',vcpDetail:'',cppScore:0,cppBias:'NEUTRAL',cppRaw:0,evrScore:0,p4:emptyP4,bvd:emptyBVD,isHaka:false,hakaDetail:'',suggestion:'WATCH',confidence:0,reasons:['Need 50+ candles'],ma20:0,ma50:0,ma200:0,ema8:0,ema21:0,ema50:0,volRatio:1,accRatio:1,rmv:50,momentum:0,adxValue:15};
  const i=n-1;
  const ma20=calcSMA(C,20,i),ma50=calcSMA(C,50,i),ma200=n>=200?calcSMA(C,200,i):0;
  const ema8=calcEMA(C,8,i),ema21=calcEMA(C,21,i),ema50=calcEMA(C,50,i);
  const atr14=calcATR(H,L,C,14,i),rmv=calcRMV(H,L,C,i),cppRaw=calcCPP(C,O,H,L,V,i);
  const adxValue=Math.round(calcADX(H,L,C,14,i));
  let vs2=0,ss=0;for(let k=i-19;k<=i;k++){vs2+=V[k]||0;ss+=(H[k]||0)-(L[k]||0);}
  const va=vs2/20||1,sa=ss/20||1;
  const cC=C[i],cO=O[i],cH=H[i],cL=L[i],cV=V[i];
  const sp=cH-cL,bd=Math.abs(cC-cO),isGreen=cC>=cO;
  const volRatio=cV/va,spR=sp/sa;
  const clP=sp>0?(cC-cL)/sp:0.5,uW=cH-Math.max(cO,cC),lW=Math.min(cO,cC)-cL;
  let bV=0,sV=0;for(let k=i-9;k<=i;k++){if(C[k]>O[k])bV+=V[k]||0;else if(C[k]<O[k])sV+=V[k]||0;}
  const accRatio=bV/(sV||1),momentum=i>=10?((C[i]-C[i-10])/(C[i-10]||1))*100:0;
  const cppBias=cppRaw>0.5?'BULLISH':cppRaw<-0.5?'BEARISH':'NEUTRAL';
  const cppScore=parseFloat(cppRaw.toFixed(2)),evrScore=parseFloat((spR-volRatio).toFixed(2));
  const p4=calcPredictaV4(C,O,H,L,V,i),bvd=calcBVD(H,L,C,O,V,i);
  // Wyckoff
  const inUp=cC>ma20&&cC>ma50&&ma20>ma50,inDown=cC<ma20&&cC<ma50&&ma20<ma50;
  const isSC=sp>atr14*2&&volRatio>2.5&&!isGreen&&clP>0.4;
  const isBC=sp>atr14*2&&volRatio>2.5&&isGreen&&clP<0.4;
  const isSp=cL<ma50&&isGreen&&lW>bd*1.5&&volRatio<0.8;
  const isUT=sp>atr14*1.5&&volRatio>1.5&&clP<0.3&&!isGreen;
  const isND=isGreen&&sp<atr14&&volRatio<0.8;
  const isNS=!isGreen&&sp<atr14&&volRatio<0.8;
  const isSV=sp>atr14*1.5&&volRatio>2.0&&clP>0.6&&!isGreen;
  const isSOS=isGreen&&volRatio>1.5&&spR>1.2&&accRatio>1.3;
  const isSOW=!isGreen&&volRatio>1.5&&spR>1.2&&accRatio<0.7;
  const isHmr=lW>bd*1.2&&uW<bd*0.6&&(sp>0?lW/sp:0)>0.5;
  const isDU=(!isGreen||bd<sp*0.3)&&volRatio<=0.6&&accRatio>0.8;
  const isIB=volRatio>1.2&&spR<0.75&&accRatio>1.2;
  let wy=inUp&&(ma200===0||cC>ma200)?'MARKUP':inDown?'MARKDOWN':!inUp&&!inDown&&cC>ma20*0.92?'ACCUMULATION':'DISTRIBUTION';
  let wd='';
  if(isSC){wy='SELLING CLIMAX';wd='SC: Panic sell absorbed by institutions. Reversal likely.';}
  else if(isBC){wy='BUYING CLIMAX';wd='BC: Euphoria buy on high vol + close near bottom. Distribution.';}
  else if(isSp){wy='SPRING';wd='Spring: Brief dip below support on low vol then recovery. Buy!';}
  else if(isUT){wy='UPTHRUST';wd='UT: False breakout on high vol rejected. Trap for bulls.';}
  else if(isSV){wy='STOPPING VOL';wd='SV: Smart money stopping the decline. Accumulation beginning.';}
  else if(wy==='MARKUP')wd='Price above MA20/50. Composite Man marking up prices.';
  else if(wy==='MARKDOWN')wd='Price below MA20/50. Smart money distributing.';
  else if(wy==='ACCUMULATION')wd='Price building base near support. Possible Spring/Test phase.';
  else wd='Price weakening. Possible supply zone.';
  // VSA
  let vs='NEUTRAL',vd='No clear VSA pattern.';
  if(isSC){vs='SELLING CLIMAX';vd='SC: Ultra-high vol red candle, mid-high close = institutions absorbing panic sells.';}
  else if(isSp){vs='SPRING';vd='SP: Price briefly below support then recovered on low vol = re-entry zone.';}
  else if(isSV){vs='STOPPING VOL';vd='SV: High vol on down candle but decent close = demand absorbing supply.';}
  else if(isSOS){vs='SIGN OF STRENGTH';vd='SOS: High vol + wide spread + strong close + buying dominance = institutional demand.';}
  else if(isNS){vs='NO SUPPLY';vd='NS: Low vol pullback = supply exhausted. Continuation likely.';}
  else if(isDU){vs='DRY UP';vd='DU: Low vol contraction = no sellers. Strong hands holding.';}
  else if(isIB){vs='ICEBERG';vd='IB: High vol + narrow spread = hidden institutional accumulation.';}
  else if(isHmr){vs='HAMMER';vd='HMR: Long lower wick = strong rejection of lower prices.';}
  else if(isUT){vs='UPTHRUST';vd='UT: Rejected above resistance on high vol = trap. Distributing.';}
  else if(isBC){vs='BUYING CLIMAX';vd='BC: Euphoria candle closing near lows = distribution at peak.';}
  else if(isSOW){vs='SIGN OF WEAKNESS';vd='SOW: Wide spread down + high vol + weak close = institutions dumping.';}
  else if(isND){vs='NO DEMAND';vd='ND: Narrow green bar on low vol = lack of conviction.';}
  // VCP
  const h30=Math.max(...H.slice(Math.max(0,i-29),i+1)),isNH=cC>h30*0.80;
  let s5=0,v5=0;for(let k=Math.max(0,i-4);k<=i;k++){s5+=(H[k]||0)-(L[k]||0);v5+=V[k]||0;}
  const isVCP=isNH&&(s5/5)<sa*0.75&&(v5/5)<va*0.85,isVCPP=isVCP&&rmv<=20;
  let cc=0,pd=0;
  for(let k=i-40;k<i-2;k++){if(k<0)continue;const lh=Math.max(...H.slice(Math.max(0,k-5),k+1)),ll=Math.min(...L.slice(k,Math.min(n,k+5)));const depth=lh>0?(lh-ll)/lh*100:0;if(pd>0&&depth<pd*0.7&&depth<15)cc++;pd=depth;}
  const vcpStatus=isVCPP?'VCP PIVOT':isVCP?'VCP BASE':cc>=2?'CONTRACTING':'NO VCP';
  const vcpDetail=isVCPP?`RMV=${Math.round(rmv)} (pivot ≤20). ${cc} contractions. Breakout imminent.`:isVCP?`Vol contracting (RMV=${Math.round(rmv)}). Near 30-day high.`:cc>=2?`${cc} pullback contractions detected.`:'No VCP pattern.';
  // HAKA
  let hIdx=-1,hVR=0;
  for(let k=Math.max(0,i-15);k<i-1;k++){const sk=(H[k]||0)-(L[k]||0),bk=Math.abs((C[k]||0)-(O[k]||0)),vk=(V[k]||0)/va,bp=sk>0?((C[k]||0)-(L[k]||0))/sk:0,m20=calcSMA(C,20,k);if((C[k]||0)>(O[k]||0)&&vk>1.8&&bk>sk*0.55&&bp>0.65&&(C[k]||0)>m20&&vk>hVR){hIdx=k;hVR=vk;}}
  const cbars=hIdx>=0?i-hIdx:0;let cs=0,ct=0;
  if(hIdx>=0)for(let k=hIdx+1;k<=i;k++){if((C[k]||0)<(O[k]||0))cs+=V[k]||0;ct+=V[k]||0;}
  const cdr=ct>0?cs/ct:0;
  const isHaka=hIdx>=0&&cbars>=2&&cbars<=8&&cC>ma20&&cdr<0.40&&cppBias!=='BEARISH';
  const hakaDetail=isHaka?`HAKA ${cbars} bars ago (${hVR.toFixed(1)}x vol). Sell vol only ${Math.round(cdr*100)}% in cooldown — ready to resume markup.`:'';
  const distMA20=ma20>0?((cC-ma20)/ma20)*100:0;
  const isOE=distMA20>15,isEOE=distMA20>30;
  const volExh=((V[i]||0)+(V[i-1]||0)+(V[i-2]||0))/3<va*0.7&&momentum>20;
  // Scoring
  let bull=0,bear=0;const reasons:string[]=[];
  const bullWy=['MARKUP','SPRING','SELLING CLIMAX','STOPPING VOL','ACCUMULATION','RE-ACCUMULATION'];
  const bearWy=['MARKDOWN','DISTRIBUTION','UPTHRUST','BUYING CLIMAX'];
  const bullVSA=['SELLING CLIMAX','SPRING','STOPPING VOL','SIGN OF STRENGTH','NO SUPPLY','DRY UP','ICEBERG','HAMMER'];
  const bearVSA=['UPTHRUST','BUYING CLIMAX','SIGN OF WEAKNESS','NO DEMAND'];
  if(bullWy.includes(wy)){bull+=wy==='SPRING'?3:2;reasons.push(`Wyckoff: ${wy} — ${wd}`);}
  if(bearWy.includes(wy)){bear+=wy==='UPTHRUST'?3:2;reasons.push(`Wyckoff: ${wy} — ${wd}`);}
  if(bullVSA.includes(vs)){bull+=['SIGN OF STRENGTH','SPRING'].includes(vs)?3:2;reasons.push(`VSA: ${vs} — ${vd}`);}
  if(bearVSA.includes(vs)){bear+=['UPTHRUST','SIGN OF WEAKNESS'].includes(vs)?3:2;reasons.push(`VSA: ${vs} — ${vd}`);}
  if(vcpStatus==='VCP PIVOT'){bull+=3;reasons.push(`VCP: PIVOT — ${vcpDetail}`);}
  else if(vcpStatus==='VCP BASE'){bull+=2;reasons.push(`VCP: BASE — ${vcpDetail}`);}
  else if(vcpStatus==='CONTRACTING'){bull+=1;reasons.push(`VCP: CONTRACTING — ${vcpDetail}`);}
  if(cppBias==='BULLISH'){bull+=cppScore>2?3:cppScore>1?2:1;reasons.push(`CPP: +${cppScore} — Next-candle BULLISH bias`);}
  if(cppBias==='BEARISH'){bear+=Math.abs(cppScore)>2?3:2;reasons.push(`CPP: ${cppScore} — Next-candle BEARISH bias`);}
  if(p4.longPerfect){bull+=4;reasons.push(`Predicta V4: ⚡ PERFECT LONG (${p4.longPct}%, ${p4.confluenceLong}/8, Delta ${p4.deltaBullish?'+buy':'-sell'}, RSI ${p4.rsiValue}, ADX ${p4.adxValue})`);}
  else if(p4.verdict==='BULL'&&p4.confluenceLong>=5){bull+=2;reasons.push(`Predicta V4: BULL ${p4.longPct}% (${p4.confluenceLong}/8)`);}
  else if(p4.verdict==='BULL'){bull+=1;reasons.push(`Predicta V4: Bullish lean ${p4.longPct}% (${p4.confluenceLong}/8)`);}
  if(p4.shortPerfect){bear+=4;reasons.push(`Predicta V4: ⚡ PERFECT SHORT (${p4.shortPct}%, ${p4.confluenceShort}/8)`);}
  else if(p4.verdict==='BEAR'&&p4.confluenceShort>=5){bear+=2;reasons.push(`Predicta V4: BEAR ${p4.shortPct}% (${p4.confluenceShort}/8)`);}
  if(bvd.detected){
    if(bvd.isBullBreak&&bvd.isReal){bull+=3;reasons.push(`BVD: Real Breakout — bull vol ${bvd.bullPct}% dominan (VALID)`);}
    if(bvd.isBullBreak&&bvd.isFake){bear+=3;reasons.push(`BVD: ⚠️ Fake Breakout — bear vol ${bvd.bearPct}% dominan. Kemungkinan jebakan!`);}
    if(!bvd.isBullBreak&&bvd.isFake){bull+=3;reasons.push(`BVD: Spring/Fake Breakdown — bull vol ${bvd.bullPct}% dominan. Smart money akumulasi!`);}
    if(!bvd.isBullBreak&&bvd.isReal){bear+=3;reasons.push(`BVD: Real Breakdown — bear vol ${bvd.bearPct}% dominan. Tekanan jual serius.`);}
  }
  if(cC>ma20&&cC>ma50){bull+=1;reasons.push(`MA: Price above MA20 & MA50 — uptrend intact`);}
  if(cC<ma20&&cC<ma50){bear+=1;reasons.push(`MA: Price below MA20 & MA50 — downtrend`);}
  if(isHaka){bull+=3;reasons.push(`HAKA Cooldown: ${hakaDetail}`);}
  if(accRatio>2){bull+=2;reasons.push(`Accumulation ${accRatio.toFixed(1)}x: Strong buy-vol — smart money loading`);}
  else if(accRatio>1.5){bull+=1;reasons.push(`Accumulation ${accRatio.toFixed(1)}x: Buy vol dominates`);}
  if(accRatio<0.6){bear+=1;reasons.push(`Distribution ${accRatio.toFixed(1)}x: Sell vol dominates`);}
  if(momentum>3&&cC>ma20){bull+=momentum>30?2:1;reasons.push(`Momentum: +${momentum.toFixed(1)}% over 10 days`);}
  if(momentum<-5){bear+=1;reasons.push(`Momentum: ${momentum.toFixed(1)}% negative`);}
  if(evrScore>0.3&&isGreen){bull+=1;reasons.push(`EVR: +${evrScore} — Effortless advance`);}
  if(evrScore<-0.5&&!isGreen){bear+=1;reasons.push(`EVR: ${evrScore} — Effort without result`);}
  if(isEOE){bear+=2;reasons.push(`⚠️ EXTREME OVEREXTENSION: +${distMA20.toFixed(0)}% above MA20. Very high pullback risk.`);}
  else if(isOE){bear+=1;reasons.push(`⚠️ Overextension: +${distMA20.toFixed(0)}% above MA20. Use trailing stop.`);}
  if(volExh&&momentum>20)reasons.push(`⚠️ Volume Exhaustion despite strong momentum.`);
  const wB=bullWy.includes(wy),vB=bullVSA.includes(vs),vcB=['VCP PIVOT','VCP BASE','CONTRACTING'].includes(vcpStatus),cB=cppBias==='BULLISH',p4B=p4.verdict==='BULL'||p4.longPerfect,bvdB=bvd.detected&&((bvd.isBullBreak&&bvd.isReal)||(!bvd.isBullBreak&&bvd.isFake));
  const cnt=[wB,vB,vcB,cB,p4B,bvdB].filter(Boolean).length,cb=cnt>=5?20:cnt===4?15:cnt>=3?8:0;
  if(cnt>=5)reasons.push(`🔥 FULL CONFLUENCE: ${cnt}/6 systems aligned`);
  else if(cnt>=3)reasons.push(`✅ HIGH CONFLUENCE: ${cnt}/6 systems aligned`);
  let suggestion:'BUY'|'WAIT'|'SELL'|'WATCH';let confidence:number;
  const net=bull-bear;
  if(bvd.detected&&bvd.isBullBreak&&bvd.isFake&&bear>=bull){suggestion='SELL';confidence=Math.min(90,50+bear*3);}
  else if(net>=7&&bear<=1){suggestion='BUY';confidence=Math.min(95,55+net*2+cb);}
  else if(net>=4&&bear<=2){suggestion='BUY';confidence=Math.min(88,48+net*2+cb);}
  else if(bear>=6&&bull<=2){suggestion='SELL';confidence=Math.min(95,55+(bear-bull)*3);}
  else if(net>=2){suggestion='WAIT';confidence=Math.min(75,40+net*3+cb);reasons.push('Wait for next candle volume confirmation before full entry');}
  else if(bear>bull){suggestion='SELL';confidence=Math.min(80,40+(bear-bull)*4);}
  else{suggestion='WATCH';confidence=35;reasons.push('Mixed signals — no clear directional edge. Monitor for breakout.');}
  if(suggestion==='BUY'&&isEOE)confidence=Math.max(42,confidence-22);
  else if(suggestion==='BUY'&&isOE)confidence=Math.max(50,confidence-10);
  const slM=isOE?1.2:vcpStatus==='VCP PIVOT'?1.0:1.5,tpM=vcpStatus==='VCP PIVOT'?4:isHaka?4:3;
  const stopLoss=suggestion==='BUY'?parseFloat((cC-atr14*slM).toFixed(0)):suggestion==='SELL'?parseFloat((cC+atr14*slM).toFixed(0)):undefined;
  const target=suggestion==='BUY'?parseFloat((cC+atr14*tpM).toFixed(0)):suggestion==='SELL'?parseFloat((cC-atr14*tpM).toFixed(0)):undefined;
  return{symbol,price,change,changePercent:changePct,wyckoffPhase:wy,wyckoffDetail:wd,vsaSignal:vs,vsaDetail:vd,vcpStatus,vcpDetail,cppScore,cppBias,cppRaw,evrScore,p4,bvd,isHaka,hakaDetail,suggestion,confidence,reasons,stopLoss,target,ma20,ma50,ma200,ema8,ema21,ema50,volRatio,accRatio,rmv,momentum,adxValue};
}

// =============================================================================
// SMALL ICONS
// =============================================================================
const Spinner=()=><svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>;
const IcoWarn=()=><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>;
const IcoTarget=()=><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth={2}/><circle cx="12" cy="12" r="6" strokeWidth={2}/><circle cx="12" cy="12" r="2" strokeWidth={2}/></svg>;
const IcoShield=()=><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>;
const IcoChart=()=><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/></svg>;

function Bar({value,color}:{value:number;color:string}){
  return <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mt-0.5"><div className={`h-full rounded-full ${color}`} style={{width:`${Math.min(100,Math.max(0,value))}%`}}/></div>;
}

// =============================================================================
// PREDICTA V4 TABLE COMPONENT
// =============================================================================
function PredictaTable({p4}:{p4:P4Result}){
  const rows=[
    {label:'Trend',   bull:p4.isUptrend&&p4.ema8>p4.ema21,    bear:!p4.isUptrend,          val:p4.isUptrend?`Supertrend ↑ (EMA ${p4.ema8>p4.ema21?'bull':'mix'})`:'Supertrend ↓'},
    {label:'MACD',    bull:p4.macdBull,                         bear:!p4.macdBull,           val:`${p4.macdBull?'Bullish':'Bearish'} (${p4.macdHistValue>0?'+':''}${p4.macdHistValue.toFixed(2)})`},
    {label:'Delta ✨',bull:p4.deltaBullish&&p4.deltaMomentum,  bear:!p4.deltaBullish,        val:p4.deltaBullish?(p4.deltaMomentum?'Strong Buy ⚡':'Buy ↑'):'Sell ↓'},
    {label:'RSI',     bull:p4.rsiAbove50,                       bear:!p4.rsiAbove50,         val:`${p4.rsiValue} ${p4.rsiAbove50?'↑':'↓'}`},
    {label:'Stoch',   bull:p4.stochK>p4.stochD,                bear:p4.stochK<p4.stochD,    val:`K${p4.stochK} D${p4.stochD} ${p4.stochK>p4.stochD?'↑':'↓'}`},
    {label:'ADX',     bull:p4.adxStrong,                        bear:false,                  val:`${p4.adxValue} (${p4.adxStrong?'kuat':'lemah'})`},
    {label:'Volume',  bull:p4.volRatio>=1.2,                    bear:p4.volRatio<0.6,        val:`${p4.volRatio.toFixed(1)}x avg`},
    {label:'EMA 8/21',bull:p4.ema8>p4.ema21,                   bear:p4.ema8<p4.ema21,       val:p4.ema8>p4.ema21?'EMA8 > EMA21 ↑':'EMA8 < EMA21 ↓'},
  ];
  const st=p4.longPerfect?'⚡ PERFECT LONG':p4.shortPerfect?'⚡ PERFECT SHORT':p4.verdict==='BULL'?'📈 BULL':p4.verdict==='BEAR'?'📉 BEAR':'⬜ NEUTRAL';
  const sc=p4.longPerfect?'text-emerald-400':p4.shortPerfect?'text-red-400':p4.verdict==='BULL'?'text-emerald-300':p4.verdict==='BEAR'?'text-red-300':'text-gray-400';
  const reg=p4.volRegime==='HIGH'?'ATR: ⚡HIGH':p4.volRegime==='LOW'?'ATR: 💤LOW':'ATR: 📊NORM';
  return(
    <div className="bg-gray-900/60 border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800/60 border-b border-gray-700/40">
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-400"/><span className="text-xs font-bold text-white tracking-wide">PREDICTA V4</span><span className="text-xs text-gray-500">({reg})</span></div>
        <span className={`text-xs font-bold ${sc}`}>{st}</span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-gray-700/30 text-center text-xs">
        <div className="bg-gray-900 py-2 px-3">
          <div className="text-emerald-400 font-bold text-base">{p4.longPct}%</div>
          <div className="text-gray-500 text-xs">LONG ({p4.confluenceLong}/8)</div>
          <Bar value={p4.longPct} color={p4.longPerfect?'bg-emerald-400':'bg-emerald-700'}/>
        </div>
        <div className="bg-gray-900 py-2 px-3">
          <div className="text-red-400 font-bold text-base">{p4.shortPct}%</div>
          <div className="text-gray-500 text-xs">SHORT ({p4.confluenceShort}/8)</div>
          <Bar value={p4.shortPct} color={p4.shortPerfect?'bg-red-400':'bg-red-700'}/>
        </div>
      </div>
      <div className="divide-y divide-gray-800/60">
        {rows.map(r=>(
          <div key={r.label} className="flex items-center justify-between px-3 py-1.5">
            <span className={`text-xs font-medium ${r.label==='Delta ✨'?'text-orange-300':'text-gray-400'}`}>{r.label}</span>
            <span className={`text-xs font-semibold ${r.bull?'text-emerald-400':r.bear?'text-red-400':'text-gray-400'}`}>{r.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// BVD SECTION COMPONENT
// =============================================================================
function BVDSection({bvd}:{bvd:BVDResult}){
  if(!bvd.detected)return null;
  const fkB=bvd.isBullBreak&&bvd.isFake,rlB=bvd.isBullBreak&&bvd.isReal,sp=!bvd.isBullBreak&&bvd.isFake;
  const cfg=fkB?{icon:'🚨',label:'FAKE BREAKOUT — Upthrust',bdr:'border-red-500/50',bg:'bg-red-900/20',tc:'text-red-300'}
    :rlB?{icon:'🚀',label:'REAL BREAKOUT — Valid',bdr:'border-emerald-500/50',bg:'bg-emerald-900/20',tc:'text-emerald-300'}
    :sp?{icon:'🌱',label:'SPRING — Fake Breakdown',bdr:'border-green-500/50',bg:'bg-green-900/20',tc:'text-green-300'}
    :{icon:'📉',label:'REAL BREAKDOWN — Valid',bdr:'border-red-500/50',bg:'bg-red-900/20',tc:'text-red-300'};
  return(
    <div className={`border rounded-xl p-3 ${cfg.bdr} ${cfg.bg}`}>
      <div className="flex items-center gap-2 mb-2"><span className="text-lg">{cfg.icon}</span><span className={`text-xs font-bold ${cfg.tc}`}>{cfg.label}</span></div>
      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
        <div><div className="text-gray-500">Bull Vol</div><div className="text-emerald-400 font-bold">{bvd.bullPct}%</div><Bar value={bvd.bullPct} color="bg-emerald-500"/></div>
        <div><div className="text-gray-500">Bear Vol</div><div className="text-red-400 font-bold">{bvd.bearPct}%</div><Bar value={bvd.bearPct} color="bg-red-500"/></div>
      </div>
      <p className={`text-xs leading-relaxed ${cfg.tc}`}>
        {fkB&&`Harga naik menembus resistance tapi volume JUAL (${bvd.bearPct}%) lebih besar dari beli (${bvd.bullPct}%). Jebakan klasik bandar — mereka jual di harga tinggi ke retail yang tergiur breakout.`}
        {rlB&&`Harga tembus resistance dan volume BELI (${bvd.bullPct}%) dominan. Breakout valid — institusi mendorong harga naik dengan serius.`}
        {sp&&`Harga sempat turun di bawah support tapi volume BELI (${bvd.bullPct}%) dominan. Spring Wyckoff — smart money akumulasi di bawah support untuk markup.`}
        {!fkB&&!rlB&&!sp&&`Harga jebol support dengan volume JUAL (${bvd.bearPct}%) dominan. Breakdown valid — tekanan jual serius.`}
      </p>
    </div>
  );
}

// =============================================================================
// RESULT CARD
// =============================================================================
function ResultCard({r}:{r:AnalysisResult}){
  const cfgMap={BUY:{bg:'bg-emerald-500/8',bdr:'border-emerald-500/35',tx:'text-emerald-400',bdg:'bg-emerald-500',lbl:'🟢 BUY'},WAIT:{bg:'bg-yellow-500/8',bdr:'border-yellow-500/35',tx:'text-yellow-400',bdg:'bg-yellow-500',lbl:'🟡 WAIT'},SELL:{bg:'bg-red-500/8',bdr:'border-red-500/35',tx:'text-red-400',bdg:'bg-red-500',lbl:'🔴 SELL'},WATCH:{bg:'bg-gray-500/8',bdr:'border-gray-600/35',tx:'text-gray-400',bdg:'bg-gray-600',lbl:'⚪ WATCH'}};
  const cfg=cfgMap[r.suggestion];
  const sigR=r.reasons.filter(x=>!x.startsWith('⚠️')&&!x.startsWith('Wait')&&!x.startsWith('Mixed')&&!x.startsWith('Monitor'));
  const wrnR=r.reasons.filter(x=>x.startsWith('⚠️'));
  const actN=r.reasons.find(x=>x.startsWith('Wait')||x.startsWith('Mixed')||x.startsWith('Monitor'));
  const rr=r.stopLoss&&r.target?Math.abs(r.target-r.price)/Math.abs(r.price-r.stopLoss):null;
  const cc=r.confidence>=75?'bg-emerald-500':r.confidence>=55?'bg-yellow-500':r.confidence>=40?'bg-orange-500':'bg-red-500';
  const wyC:Record<string,string>={MARKUP:'text-emerald-400',SPRING:'text-emerald-400',ACCUMULATION:'text-cyan-400','RE-ACCUMULATION':'text-cyan-400','SELLING CLIMAX':'text-emerald-300','STOPPING VOL':'text-emerald-400',MARKDOWN:'text-red-400',DISTRIBUTION:'text-red-400',UPTHRUST:'text-red-400','BUYING CLIMAX':'text-red-400',UNKNOWN:'text-gray-400'};
  const vsC:Record<string,string>={'SIGN OF STRENGTH':'text-emerald-400',SPRING:'text-emerald-400','SELLING CLIMAX':'text-emerald-300','STOPPING VOL':'text-emerald-400','NO SUPPLY':'text-cyan-400','DRY UP':'text-cyan-400',ICEBERG:'text-cyan-400',HAMMER:'text-yellow-400',UPTHRUST:'text-red-400','BUYING CLIMAX':'text-red-400','SIGN OF WEAKNESS':'text-red-400','NO DEMAND':'text-orange-400',NEUTRAL:'text-gray-400',UNKNOWN:'text-gray-400'};
  const vcC:Record<string,string>={'VCP PIVOT':'text-emerald-400','VCP BASE':'text-cyan-400',CONTRACTING:'text-yellow-400','NO VCP':'text-gray-500',UNKNOWN:'text-gray-500'};

  // Build Kesimpulan
  const buildK=()=>{
    const{p4,bvd,suggestion,confidence,cppScore,cppBias,wyckoffPhase,vsaSignal,vcpStatus,isHaka,hakaDetail,stopLoss,target,price,ma20,ma50}=r;
    const fkB=bvd.detected&&bvd.isBullBreak&&bvd.isFake;
    const rlB=bvd.detected&&bvd.isBullBreak&&bvd.isReal;
    const sp=bvd.detected&&!bvd.isBullBreak&&bvd.isFake;
    const rlBr=bvd.detected&&!bvd.isBullBreak&&bvd.isReal;
    const rr=stopLoss&&target?Math.abs(target-price)/Math.abs(price-stopLoss):null;

    // Technical one-liner
    const tech=[
      `Wyckoff: ${wyckoffPhase}`,
      `VSA: ${vsaSignal}`,
      `VCP: ${vcpStatus}`,
      `CPP: ${cppScore>0?'+':''}${cppScore} (${cppBias})`,
      `P4: ${p4.longPerfect?'⚡PERFECT LONG':p4.shortPerfect?'⚡PERFECT SHORT':p4.verdict} ${p4.longPct}%L/${p4.shortPct}%S (${p4.confluenceLong}/8)`,
      bvd.detected?`BVD: ${fkB?'FAKE BREAK':rlB?'REAL BREAK':sp?'SPRING':'BREAKDOWN'}`:null,
    ].filter(Boolean).join(' · ');

    // ── BAGIAN 1: Kalimat pembuka (ringkasan kondisi) ──
    let opening='';
    if(fkB) opening=`🚨 JEBAKAN BANDAR TERDETEKSI! Harga naik menembus resistance, TAPI volume jual (${bvd.bearPct}%) lebih besar dari volume beli (${bvd.bullPct}%). Ini adalah pola Upthrust Wyckoff — bandar menjual saham mereka ke trader retail yang tergiur breakout.`;
    else if(sp) opening=`🌱 SPRING / FAKE BREAKDOWN TERDETEKSI! Harga sempat turun di bawah support, tapi volume pembeli (${bvd.bullPct}%) mendominasi. Ini tanda smart money sedang akumulasi dengan cara mengocok pemegang lemah.`;
    else if(rlB) opening=`🚀 BREAKOUT VALID TERKONFIRMASI! Harga menembus resistance dengan volume beli (${bvd.bullPct}%) yang dominan. Institusi benar-benar mendorong harga naik, bukan sekadar test.`;
    else if(rlBr) opening=`📉 BREAKDOWN VALID! Harga jebol support dengan volume jual (${bvd.bearPct}%) yang mendominasi. Tekanan distribusi institusional sedang aktif.`;
    else if(p4.longPerfect) opening=`⚡ KONDISI ENTRY IDEAL — PERFECT LONG! Semua 8 indikator Predicta V4 selaras ke arah naik, dengan konfirmasi Volume Delta (leading indicator terkuat).`;
    else if(p4.shortPerfect) opening=`⚡ KONDISI BEARISH SEMPURNA — PERFECT SHORT! Semua indikator Predicta V4 menunjuk ke bawah dengan Volume Delta negatif sebagai konfirmasi.`;
    else if(suggestion==='BUY'&&confidence>=70) opening=`📈 SINYAL BELI KUAT (confidence ${confidence}%). Beberapa sistem analisis selaras ke arah bullish.`;
    else if(suggestion==='BUY') opening=`🟢 SETUP BULLISH TERBENTUK (confidence ${confidence}%). Ada sinyal positif meski belum sempurna.`;
    else if(suggestion==='WAIT') opening=`⏳ SETUP MULAI TERBENTUK — TUNGGU KONFIRMASI. Kondisi mulai menunjukkan tanda bullish, tapi belum semua syarat terpenuhi.`;
    else if(suggestion==='SELL') opening=`🔴 SINYAL WASPADA / JUAL (confidence ${confidence}%). Struktur pasar menunjukkan tekanan jual dominan.`;
    else opening=`⬜ SINYAL CAMPUR. Tidak ada arah dominan yang jelas saat ini.`;

    // ── BAGIAN 2: Penjelasan teknikal per sistem ──
    const techLines:string[]=[];

    // Wyckoff
    const wyMap:Record<string,string>={
      MARKUP:'Harga sedang dalam fase MARKUP — Composite Man (kekuatan besar di pasar) sedang mendorong harga naik setelah akumulasi selesai. Ini fase terbaik untuk hold atau buy on pullback.',
      SPRING:'SPRING adalah tanda akumulasi tahap akhir — harga ditekan sebentar di bawah support untuk mengocok pemegang lemah, lalu dipulihkan. Setup sangat bullish sebelum markup.',
      ACCUMULATION:'Harga sedang diakumulasi — kekuatan besar diam-diam membeli di zona bawah. Belum markup, tapi fondasi sedang dibangun.',
      'SELLING CLIMAX':'SELLING CLIMAX: Kepanikan jual masif diserap oleh institusi. Volume ultra-tinggi dengan penutupan di tengah/atas = smart money membeli dari publik yang panik. Sering jadi titik balik bawah.',
      'STOPPING VOL':'STOPPING VOLUME: Kekuatan besar masuk menghentikan penurunan. Volume tinggi tapi harga tidak turun lebih jauh = demand absorbs supply.',
      MARKDOWN:'Harga dalam fase MARKDOWN — distribusi sudah selesai, harga sedang diturunkan. Hindari beli, tunggu fase akumulasi berikutnya.',
      DISTRIBUTION:'Fase DISTRIBUSI — kekuatan besar sedang melepas kepemilikan ke publik di harga tinggi. Bahaya jika masuk di sini.',
      UPTHRUST:'UPTHRUST: Harga dipaksa naik menembus resistance agar publik beli, lalu dijual balik. Jebakan klasik — volume tinggi tapi harga tidak bertahan di atas resistance.',
      'BUYING CLIMAX':'BUYING CLIMAX: Euforia beli di puncak dengan volume ekstrem, tapi harga ditutup rendah. Institusi menjual ke tangan publik yang panik beli.',
      UNKNOWN:'Wyckoff phase belum terdefinisi jelas — data tidak cukup atau pasar sedang transisi.',
    };
    techLines.push(`📊 Wyckoff (${wyckoffPhase}): ${wyMap[wyckoffPhase]||wyckoffPhase}`);

    // VSA
    const vsaMap:Record<string,string>={
      'SIGN OF STRENGTH':'SOS — Volume tinggi, spread lebar, tutup di atas, buying dominan. Institusi aktif membeli. Konfirmasi demand kuat.',
      SPRING:'Spring VSA — harga turun sebentar lalu recovery dengan buying dominan. Smart money akumulasi.',
      'SELLING CLIMAX':'SC — Panik jual masif dengan volume ekstrem, tapi harga ditutup tidak terlalu rendah. Institusi menyerap semua supply.',
      'STOPPING VOL':'SV — Volume besar menghentikan penurunan. Demand mulai mengalahkan supply.',
      'NO SUPPLY':'NS — Koreksi kecil dengan volume sangat rendah. Penjual habis. Harga kemungkinan besar lanjut naik.',
      'DRY UP':'DU — Volume sangat rendah, candle kecil. Tidak ada penjual aktif. Strong hands diam-diam memegang saham.',
      ICEBERG:'IB — Volume besar tapi harga tidak bergerak banyak. Ada pembeli tersembunyi yang menyerap supply.',
      HAMMER:'HMR — Ekor panjang di bawah = buyer kuat masuk di zona bawah, menolak harga yang lebih rendah.',
      UPTHRUST:'UT — Harga naik melampaui resistance dengan volume tinggi lalu turun kembali. Distribusi tersembunyi.',
      'BUYING CLIMAX':'BC — Euforia beli di puncak, tutup rendah. Tanda distribusi sedang berjalan.',
      'SIGN OF WEAKNESS':'SOW — Spread lebar turun, volume tinggi, tutup lemah. Institusi aktif menjual.',
      'NO DEMAND':'ND — Candle hijau kecil dengan volume rendah. Tidak ada minat beli. Reli lemah, rentan balik turun.',
      NEUTRAL:'Tidak ada pola VSA dominan terdeteksi pada candle terkini.',
    };
    techLines.push(`🔬 VSA (${vsaSignal}): ${vsaMap[vsaSignal]||vsaSignal}`);

    // VCP
    if(vcpStatus!=='NO VCP'&&vcpStatus!=='UNKNOWN'){
      const vcpMap:Record<string,string>={
        'VCP PIVOT':`VCP PIVOT (RMV=${Math.round(r.rmv)}) — Volatilitas sudah sangat menyempit, mendekati titik ledakan. Ini zona entry terbaik dalam VCP: risiko kecil, potensi besar.`,
        'VCP BASE':`VCP BASE (RMV=${Math.round(r.rmv)}) — Harga dan volume sedang kontraksi secara progresif. Pola sehat untuk swing trade. Tunggu volume breakout konfirmasi.`,
        CONTRACTING:`Pola kontraksi terdeteksi (${r.vcpDetail}). Harga makin menyempit — supply berkurang bertahap.`,
      };
      techLines.push(`📐 VCP (${vcpStatus}): ${vcpMap[vcpStatus]||r.vcpDetail}`);
    }

    // CPP
    const cppAbs=Math.abs(cppScore);
    const cppLevel=cppAbs>2?'sangat kuat':cppAbs>1?'moderat':cppAbs>0.5?'lemah':'hampir netral';
    const cppDirText=cppBias==='BULLISH'?'cenderung NAIK':cppBias==='BEARISH'?'cenderung TURUN':'NETRAL (konsolidasi)';
    techLines.push(`🕯️ CPP ${cppScore>0?'+':''}${cppScore} (${cppBias}): Prediksi arah candle berikutnya ${cppDirText}. Kekuatan sinyal: ${cppLevel}.`);

    // Predicta V4
    const p4Lines=[];
    if(p4.longPerfect) p4Lines.push(`⚡ PERFECT LONG — ${p4.confluenceLong}/8 indikator selaras bullish termasuk Volume Delta positif, RSI>${p4.rsiValue}, ADX ${p4.adxValue} (${p4.adxStrong?'kuat':'lemah'}).`);
    else if(p4.shortPerfect) p4Lines.push(`⚡ PERFECT SHORT — ${p4.confluenceShort}/8 indikator selaras bearish.`);
    else p4Lines.push(`${p4.verdict==='BULL'?'Bullish lean':p4.verdict==='BEAR'?'Bearish lean':'Netral'} — ${p4.confluenceLong}/8 bull vs ${p4.confluenceShort}/8 bear. Probabilitas naik ${p4.longPct}% vs turun ${p4.shortPct}%.`);
    p4Lines.push(`Trend: ${p4.isUptrend?'Supertrend NAIK ↑':'Supertrend TURUN ↓'} | MACD: ${p4.macdBull?'Bullish':'Bearish'} (${p4.macdHistValue>0?'+':''}${p4.macdHistValue.toFixed(2)}) | Delta: ${p4.deltaBullish?'Beli↑':'Jual↓'} | RSI: ${p4.rsiValue} ${p4.rsiAbove50?'↑':'↓'} | ADX: ${p4.adxValue}`);
    techLines.push(`🤖 Predicta V4: ${p4Lines.join(' — ')}`);

    // HAKA
    if(isHaka) techLines.push(`🔥 HAKA Cooldown: ${hakaDetail}`);

    // BVD
    if(bvd.detected){
      if(fkB) techLines.push(`🚨 BVD Fake Breakout: Harga tembus resistance tapi bear vol ${bvd.bearPct}% > bull vol ${bvd.bullPct}%. Classic Upthrust trap.`);
      else if(rlB) techLines.push(`🚀 BVD Real Breakout: Bull vol ${bvd.bullPct}% dominan saat tembus resistance. Breakout valid, institusi aktif.`);
      else if(sp) techLines.push(`🌱 BVD Spring: Harga tembus support bawah tapi bull vol ${bvd.bullPct}% dominan. Smart money akumulasi.`);
      else techLines.push(`📉 BVD Breakdown: Bear vol ${bvd.bearPct}% dominan saat jebol support. Tekanan jual serius.`);
    }

    // MA context
    const maCtx=[];
    if(ma20>0) maCtx.push(`MA20: ${price>ma20?'di atas ✓':'di bawah ✗'}`);
    if(ma50>0) maCtx.push(`MA50: ${price>ma50?'di atas ✓':'di bawah ✗'}`);
    if(maCtx.length) techLines.push(`📏 Posisi MA: ${maCtx.join(' | ')}. ${price>ma20&&price>ma50?'Struktur uptrend terjaga.':price<ma20&&price<ma50?'Di bawah kedua MA — downtrend, hati-hati beli.':'Transisi — volatil.'}`);

    // ── BAGIAN 3: Saran aksi dengan penjelasan "position size konservatif" ──
    let actionAdvice='';
    if(fkB){
      actionAdvice=`❌ JANGAN BELI. Jika sudah punya posisi, pertimbangkan KURANGI atau TUTUP di area ini. Tunggu harga turun ke support valid sebelum re-entry.`;
    } else if(sp||rlB||(suggestion==='BUY'&&confidence>=75)||(p4.longPerfect)){
      const ps=rr&&rr>=2?'penuh (full position)':'konservatif (50–60% dari modal rencana)';
      actionAdvice=`✅ ENTRY dengan position size ${ps}. ${stopLoss?`Stop Loss: Rp ${stopLoss.toLocaleString('id-ID')} (di bawah support/swing low terdekat).`:''} ${target?`Target: Rp ${target.toLocaleString('id-ID')}.`:''} ${rr?`R:R = 1:${rr.toFixed(1)} ${rr>=2?'— Favorable, layak ambil risiko penuh.':'— Cukup, tapi gunakan position size lebih kecil sampai ada konfirmasi.'}`:''} Gunakan trailing stop jika harga naik >3%.`;
    } else if(suggestion==='BUY'&&confidence<75){
      actionAdvice=`⚠️ ENTRY KONSERVATIF. Masuk dengan 30–50% dari modal rencana. Artinya: kalau biasanya beli 10 lot, sekarang cukup 3–5 lot dulu. Tujuannya: mengurangi kerugian jika sinyal ternyata false. Tambah posisi (averaging up) HANYA jika harga naik dengan volume tinggi sebagai konfirmasi. ${stopLoss?`SL: Rp ${stopLoss.toLocaleString('id-ID')}.`:''} Jangan FOMO — tunggu volume mengkonfirmasi.`;
    } else if(suggestion==='WAIT'){
      actionAdvice=`🕐 TUNGGU. Jangan entry dulu. Pantau 1–2 candle ke depan. Entry lebih baik ketika: (1) volume naik signifikan, (2) harga tutup di atas MA20, atau (3) candle hijau besar dengan body >60% dari spread. Lebih baik masuk terlambat tapi benar, daripada lebih awal tapi salah.`;
    } else if(suggestion==='SELL'||rlBr){
      actionAdvice=`🚫 HINDARI BELI. Jika sudah hold, pasang stop loss ketat. Tunggu sinyal pembalikan (Selling Climax atau Spring) sebelum re-entry.`;
    } else {
      actionAdvice=`👀 OBSERVASI. Belum ada setup yang jelas. Pantau breakout volume sebagai tanda arah selanjutnya.`;
    }

    // ── BAGIAN 4: Penjelasan "position size konservatif" jika relevan ──
    let psExplanation='';
    if(suggestion==='BUY'&&confidence<75&&!fkB){
      psExplanation=`💡 Apa itu "position size konservatif"? Artinya jangan langsung taruh modal penuh. Contoh: kalau biasanya kamu beli saham senilai Rp 5 juta, dengan posisi konservatif cukup masuk Rp 1,5–2,5 juta dulu. Jika harga naik dan dikonfirmasi oleh volume, baru tambah sisa posisi. Strategi ini melindungi modal dari sinyal yang ternyata false, sekaligus tetap ikut jika setup berjalan sesuai rencana.`;
    }

    return{tech,opening,techLines,actionAdvice,psExplanation};
  };
  const{tech,opening,techLines,actionAdvice,psExplanation}=buildK();

  return(
    <div className={`rounded-xl border ${cfg.bdr} ${cfg.bg} space-y-4 p-4`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl font-bold text-white">{r.symbol}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold text-white ${cfg.bdg}`}>{r.suggestion}</span>
            <Link href={`/?symbol=${r.symbol}`} className="flex items-center gap-1 text-xs bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/40 text-blue-300 px-2.5 py-0.5 rounded-full transition-colors"><IcoChart/>View Chart</Link>
          </div>
          <p className={`text-xs mt-0.5 ${cfg.tx}`}>{r.suggestion==='BUY'?'Sinyal beli — setup bullish terkoneksi':r.suggestion==='WAIT'?'Setup bullish — tunggu konfirmasi':r.suggestion==='SELL'?'Sinyal jual — struktur bearish dominan':'Sinyal campur — tidak ada edge yang jelas'}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold text-white">Rp {r.price.toLocaleString('id-ID')}</div>
          <div className={`text-xs font-medium ${r.change>=0?'text-emerald-400':'text-red-400'}`}>{r.change>=0?'+':''}{r.change.toLocaleString('id-ID')} ({r.changePercent>=0?'+':''}{r.changePercent.toFixed(2)}%)</div>
        </div>
      </div>
      {/* Confidence */}
      <div>
        <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">Signal Confidence</span><span className={`font-bold ${cfg.tx}`}>{r.confidence}%</span></div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden"><div className={`h-full ${cc} rounded-full`} style={{width:`${r.confidence}%`}}/></div>
      </div>
      {/* SL/TP */}
      {(r.stopLoss||r.target)&&(
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2">
            <div className="flex items-center justify-center gap-1 text-red-400 text-xs mb-0.5"><IcoShield/>SL</div>
            <div className="text-white font-bold text-sm">Rp {r.stopLoss?.toLocaleString('id-ID')}</div>
          </div>
          <div className="bg-gray-700/40 rounded-lg p-2 flex flex-col items-center justify-center">
            {rr&&<><div className="text-gray-400 text-xs">R:R</div><div className={`font-bold text-sm ${rr>=2?'text-emerald-400':rr>=1.5?'text-yellow-400':'text-orange-400'}`}>1:{rr.toFixed(1)}</div></>}
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2">
            <div className="flex items-center justify-center gap-1 text-emerald-400 text-xs mb-0.5"><IcoTarget/>TP</div>
            <div className="text-white font-bold text-sm">Rp {r.target?.toLocaleString('id-ID')}</div>
          </div>
        </div>
      )}
      {/* 4-pillar grid */}
      <div className="grid grid-cols-2 gap-2">
        {[
          {label:'Wyckoff',val:r.wyckoffPhase,detail:r.wyckoffDetail,color:wyC[r.wyckoffPhase]||'text-gray-300'},
          {label:'VSA',val:r.vsaSignal,detail:r.vsaDetail,color:vsC[r.vsaSignal]||'text-gray-300'},
          {label:'VCP',val:r.vcpStatus,detail:r.vcpDetail,color:vcC[r.vcpStatus]||'text-gray-300'},
          {label:'CPP / PDI',val:`${r.cppBias} ${r.cppScore>0?'+':''}${r.cppScore}`,detail:`EVR ${r.evrScore>0?'+':''}${r.evrScore} · RMV ${Math.round(r.rmv)}`,color:r.cppBias==='BULLISH'?'text-emerald-400':r.cppBias==='BEARISH'?'text-red-400':'text-gray-400'},
        ].map(p=>(
          <div key={p.label} className="bg-gray-800/60 rounded-lg p-2.5">
            <div className="text-gray-500 text-xs mb-0.5">{p.label}</div>
            <div className={`font-semibold text-xs ${p.color}`}>{p.val}</div>
            <div className="text-gray-500 text-xs mt-0.5 line-clamp-2 leading-tight">{p.detail.split('.')[0]}</div>
          </div>
        ))}
      </div>
      {/* Predicta V4 */}
      <PredictaTable p4={r.p4}/>
      {/* BVD */}
      <BVDSection bvd={r.bvd}/>
      {/* Metrics strip */}
      <div className="grid grid-cols-4 gap-1.5 text-center">
        {[
          {l:'Vol',v:`${r.volRatio.toFixed(1)}x`,c:r.volRatio>1.5?'text-emerald-400':r.volRatio<0.6?'text-red-400':'text-gray-300'},
          {l:'Acc',v:`${r.accRatio.toFixed(1)}x`,c:r.accRatio>1.5?'text-emerald-400':r.accRatio<0.7?'text-red-400':'text-gray-300'},
          {l:'Mom',v:`${r.momentum>0?'+':''}${r.momentum.toFixed(0)}%`,c:r.momentum>10?'text-emerald-400':r.momentum<-5?'text-red-400':'text-gray-300'},
          {l:'RMV',v:`${Math.round(r.rmv)}`,c:r.rmv<=20?'text-emerald-400':r.rmv<=40?'text-yellow-400':'text-gray-400'},
        ].map(m=>(
          <div key={m.l} className="bg-gray-800/40 rounded-lg p-1.5">
            <div className="text-gray-500 text-xs">{m.l}</div>
            <div className={`font-bold text-xs ${m.c}`}>{m.v}</div>
          </div>
        ))}
      </div>
      {/* MA levels */}
      <div className="bg-gray-800/40 rounded-lg p-2.5">
        <div className="text-gray-500 text-xs mb-1.5">Moving Averages</div>
        <div className="grid grid-cols-3 gap-1 text-center text-xs">
          {[{l:'MA20',v:r.ma20},{l:'MA50',v:r.ma50},{l:'MA200',v:r.ma200}].map(m=>{
            const d=m.v>0?((r.price-m.v)/m.v*100):null;
            return(
              <div key={m.l} className="bg-gray-700/50 rounded p-1.5">
                <div className="text-gray-500">{m.l}</div>
                <div className="text-gray-200 font-medium text-xs">{m.v>0?`${Math.round(m.v).toLocaleString('id-ID')}`:'N/A'}</div>
                {d!==null&&<div className={`text-xs ${d>=0?'text-emerald-400':'text-red-400'}`}>{d>=0?'+':''}{d.toFixed(1)}%</div>}
              </div>
            );
          })}
        </div>
      </div>
      {/* Signal reasons */}
      {sigR.length>0&&(
        <div>
          <div className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide">Sinyal Teknikal</div>
          <div className="space-y-1.5">
            {sigR.map((reason,idx)=>{
              const isC=reason.includes('🔥')||reason.includes('✅')||reason.includes('CONFLUENCE');
              const iB=reason.includes('+')||reason.includes('Bull')||reason.includes('bull')||reason.includes('BULLISH')||reason.includes('above')||reason.includes('Spring')||reason.includes('HAKA');
              return(
                <div key={idx} className={`flex items-start gap-2 text-xs p-2 rounded-lg ${isC?'bg-emerald-500/15 border border-emerald-500/30':'bg-gray-800/40'}`}>
                  <span className={`mt-0.5 shrink-0 ${isC?'text-emerald-400':iB?'text-emerald-400':'text-gray-500'}`}>{isC?'🔥':iB?'↑':'·'}</span>
                  <span className="text-gray-300 leading-relaxed">{reason}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Warnings */}
      {wrnR.length>0&&(
        <div>
          <div className="text-xs text-orange-400 mb-1.5 font-medium uppercase tracking-wide flex items-center gap-1"><IcoWarn/>Risk Factors</div>
          <div className="space-y-1.5">
            {wrnR.map((w,idx)=>(
              <div key={idx} className="flex items-start gap-2 text-xs p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <span className="text-orange-400 mt-0.5 shrink-0">⚠</span>
                <span className="text-orange-200 leading-relaxed">{w.replace('⚠️ ','')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* HAKA */}
      {r.isHaka&&(
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2.5">
          <div className="text-orange-300 text-xs font-bold mb-1">🔥 HAKA Cooldown Terdeteksi</div>
          <div className="text-orange-200 text-xs leading-relaxed">{r.hakaDetail}</div>
        </div>
      )}
      {/* Action note */}
      {actN&&<div className={`text-xs p-2.5 rounded-lg border ${r.suggestion==='BUY'?'bg-emerald-500/10 border-emerald-500/25 text-emerald-300':r.suggestion==='WAIT'?'bg-yellow-500/10 border-yellow-500/25 text-yellow-300':'bg-gray-700/50 border-gray-600/30 text-gray-300'}`}>💡 {actN}</div>}
      {/* ═══ KESIMPULAN ═══ */}
      <div className={`rounded-xl p-4 border ${cfg.bdr} bg-gray-900/70 space-y-3`}>
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`w-2 h-2 rounded-full ${r.suggestion==='BUY'?'bg-emerald-400':r.suggestion==='SELL'?'bg-red-400':r.suggestion==='WAIT'?'bg-yellow-400':'bg-gray-400'}`}/>
          <span className="text-xs font-bold text-white uppercase tracking-wide">Kesimpulan Analisis</span>
          <span className={`text-xs font-semibold ${cfg.tx}`}>{cfg.lbl} · {r.confidence}%</span>
        </div>
        <div className="text-xs text-gray-400 font-mono leading-relaxed bg-gray-800/60 rounded-lg px-3 py-2">{tech}</div>
        {/* Opening statement */}
        <div className="text-sm font-semibold text-gray-100 leading-relaxed">{opening}</div>
        {/* Per-system technical breakdown */}
        {techLines.length>0&&(
          <div className="space-y-1.5">
            {techLines.map((line,i)=>(
              <div key={i} className="text-xs text-gray-300 leading-relaxed bg-gray-800/50 rounded-lg px-3 py-2 border-l-2 border-blue-500/40">{line}</div>
            ))}
          </div>
        )}
        {/* Action advice */}
        {actionAdvice&&(
          <div className={`text-xs leading-relaxed rounded-lg px-3 py-2.5 border ${r.suggestion==='BUY'?'bg-emerald-500/10 border-emerald-500/30 text-emerald-200':r.suggestion==='SELL'?'bg-red-500/10 border-red-500/30 text-red-200':r.suggestion==='WAIT'?'bg-yellow-500/10 border-yellow-500/30 text-yellow-200':'bg-gray-700/50 border-gray-600/30 text-gray-300'}`}>{actionAdvice}</div>
        )}
        {/* Position size explanation */}
        {psExplanation&&(
          <div className="text-xs text-blue-300 leading-relaxed bg-blue-500/10 border border-blue-500/25 rounded-lg px-3 py-2.5">{psExplanation}</div>
        )}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className={`rounded-lg px-2.5 py-2 ${r.p4.longPerfect?'bg-emerald-500/15 border border-emerald-500/30':r.p4.shortPerfect?'bg-red-500/15 border border-red-500/30':'bg-gray-800/40'}`}>
            <div className="text-gray-500 mb-0.5">Predicta V4</div>
            <div className={`font-bold ${r.p4.longPct>=60?'text-emerald-400':r.p4.shortPct>=60?'text-red-400':'text-gray-400'}`}>{r.p4.longPerfect?'⚡ PERFECT LONG':r.p4.shortPerfect?'⚡ PERFECT SHORT':r.p4.verdict}</div>
            <div className="text-gray-500 mt-0.5">{r.p4.longPct}% naik · {r.p4.shortPct}% turun</div>
          </div>
          <div className={`rounded-lg px-2.5 py-2 ${r.bvd.detected?(r.bvd.isFake&&r.bvd.isBullBreak?'bg-red-500/10 border border-red-500/20':r.bvd.isReal&&r.bvd.isBullBreak?'bg-emerald-500/10 border border-emerald-500/20':!r.bvd.isBullBreak&&r.bvd.isFake?'bg-green-500/10 border border-green-500/20':'bg-red-500/10 border border-red-500/20'):'bg-gray-800/40'}`}>
            <div className="text-gray-500 mb-0.5">BVD</div>
            <div className={`font-bold ${r.bvd.detected?(r.bvd.isBullBreak&&r.bvd.isFake?'text-red-400':r.bvd.isBullBreak&&r.bvd.isReal?'text-emerald-400':!r.bvd.isBullBreak&&r.bvd.isFake?'text-green-400':'text-red-400'):'text-gray-500'}`}>
              {r.bvd.detected?(r.bvd.isBullBreak&&r.bvd.isFake?'🚨 Fake Breakout':r.bvd.isBullBreak&&r.bvd.isReal?'🚀 Real Breakout':!r.bvd.isBullBreak&&r.bvd.isFake?'🌱 Spring':'📉 Real Breakdown'):'Tidak ada breakout'}
            </div>
            {r.bvd.detected&&<div className="text-gray-500 mt-0.5">Bull {r.bvd.bullPct}% · Bear {r.bvd.bearPct}%</div>}
          </div>
        </div>
      </div>
      {/* View Chart CTA */}
      <Link href={`/?symbol=${r.symbol}`} className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/40 text-blue-300 hover:text-blue-200 transition-colors font-medium text-sm">
        <IcoChart/> View {r.symbol} Chart
        <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
      </Link>
    </div>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================
function AnalysisContent(){
  const searchParams=useSearchParams();
  const[ticker,setTicker]=useState('');
  const[loading,setLoading]=useState(false);
  const[result,setResult]=useState<AnalysisResult|null>(null);
  const[error,setError]=useState('');
  const[history,setHistory]=useState<AnalysisResult[]>([]);
  const didRun=useRef(false);

  useEffect(()=>{
    if(didRun.current)return;
    const sym=searchParams.get('symbol');
    if(sym){didRun.current=true;const c=sym.trim().toUpperCase().replace(/\.JK$/i,'');setTicker(c);run(c);}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[searchParams]);

  const run=async(sym?:string)=>{
    const raw=(sym||ticker).trim().toUpperCase();
    if(!raw)return;
    const symbol=raw.endsWith('.JK')?raw:`${raw}.JK`;
    setLoading(true);setError('');setResult(null);
    try{
      const[qr,hr]=await Promise.all([fetch(`/api/stock/quote?symbol=${symbol}`),fetch(`/api/stock/historical?symbol=${symbol}&interval=1d&range=2y`)]);
      if(!qr.ok)throw new Error(`Quote API ${qr.status}`);
      if(!hr.ok)throw new Error(`Historical API ${hr.status}`);
      const qd=await qr.json(),hd=await hr.json();
      const price=qd.regularMarketPrice??qd.price??0,change=qd.regularMarketChange??qd.change??0,changePct=qd.regularMarketChangePercent??qd.changePercent??0;
      const candles=hd.candles??hd.data??[];
      if(!candles.length)throw new Error('No historical data');
      const analysis=analyzeStock(candles,raw,price,change,changePct);
      setResult(analysis);
      setHistory(p=>[analysis,...p.filter(h=>h.symbol!==analysis.symbol)].slice(0,5));
    }catch(e:any){setError(e.message||'Analysis failed');}
    finally{setLoading(false);}
  };

  return(
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-white text-sm flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>Chart
            </Link>
            <span className="text-gray-600">/</span>
            <span className="text-white font-semibold text-sm">Analysis</span>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/screener" className="text-gray-400 hover:text-white">Screener</Link>
            <Link href="/guide" className="text-blue-400 hover:text-blue-300 font-medium">Guide</Link>
          </div>
        </div>
      </nav>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Stock Analysis</h1>
          <p className="text-gray-400 text-sm mt-1">Wyckoff · VSA · VCP · CPP · Predicta V4 · Breakout Volume Delta</p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input type="text" value={ticker} onChange={e=>setTicker(e.target.value.toUpperCase())} onKeyDown={e=>e.key==='Enter'&&run()} placeholder="Ketik ticker, misal: BBCA, FIRE, LAJU" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 pr-9 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"/>
            {ticker&&<button onClick={()=>setTicker('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>}
          </div>
          <button onClick={()=>run()} disabled={loading||!ticker} className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-5 py-3 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors">
            {loading?<Spinner/>:<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>}
            {loading?'Analyzing…':'Analyze'}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['BBCA','BBRI','BMRI','ASII','TLKM','ANTM','MDKA','AMMN','FIRE','LAJU'].map(s=>(
            <button key={s} onClick={()=>{setTicker(s);run(s);}} className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-2.5 py-1 rounded-lg transition-colors">{s}</button>
          ))}
        </div>
        {error&&<div className="bg-red-500/15 border border-red-500/30 rounded-xl p-3 flex items-start gap-2"><IcoWarn/><div><div className="text-red-400 font-medium text-sm">Analysis Failed</div><div className="text-red-300 text-xs mt-0.5">{error}</div></div></div>}
        {loading&&<div className="flex flex-col items-center gap-4 py-12"><div className="w-12 h-12 rounded-full border-2 border-blue-400/30 border-t-blue-400 animate-spin"/><div className="text-center"><div className="text-white font-medium">Menganalisis {ticker}…</div><div className="text-gray-500 text-sm mt-1">Wyckoff · VSA · VCP · Predicta V4 · BVD</div></div></div>}
        {result&&!loading&&<ResultCard r={result}/>}
        {history.length>1&&(
          <div>
            <div className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Analisis Sebelumnya</div>
            <div className="flex flex-wrap gap-2">
              {history.slice(1).map(h=>(
                <button key={h.symbol} onClick={()=>{setTicker(h.symbol);run(h.symbol);}} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${h.suggestion==='BUY'?'bg-emerald-500/10 border-emerald-500/30 text-emerald-400':h.suggestion==='SELL'?'bg-red-500/10 border-red-500/30 text-red-400':h.suggestion==='WAIT'?'bg-yellow-500/10 border-yellow-500/30 text-yellow-400':'bg-gray-700/50 border-gray-600/30 text-gray-400'}`}>{h.symbol} · {h.suggestion}</button>
              ))}
            </div>
          </div>
        )}
        {/* Legend */}
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4 space-y-3">
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Panduan Singkat Sinyal</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {[
              {s:'SC',c:'text-emerald-400',l:'Selling Climax',d:'Kepanikan jual diserap institusi. Potensi reversal kuat.'},
              {s:'SP',c:'text-emerald-400',l:'Spring',d:'Dip palsu di bawah support. Smart money akumulasi.'},
              {s:'SOS',c:'text-emerald-400',l:'Sign of Strength',d:'Vol tinggi + spread lebar + close atas = demand institusi.'},
              {s:'NS',c:'text-cyan-400',l:'No Supply',d:'Vol rendah di koreksi. Penjual habis. Lanjut naik.'},
              {s:'DU',c:'text-cyan-400',l:'Dry Up',d:'Vol menyusut. Tidak ada penjual. Strong hands pegang.'},
              {s:'IB',c:'text-cyan-400',l:'Iceberg',d:'Vol besar + range sempit = akumulasi tersembunyi.'},
              {s:'UT',c:'text-red-400',l:'Upthrust',d:'Breakout palsu vol tinggi. Jebakan bull. Distribusi.'},
              {s:'SOW',c:'text-red-400',l:'Sign of Weakness',d:'Spread lebar turun + vol tinggi + close bawah = distribusi.'},
              {s:'P4 ⚡',c:'text-yellow-400',l:'Predicta V4 Perfect',d:'8 indikator selaras + delta konfirmasi = kondisi ideal entry.'},
              {s:'BVD',c:'text-blue-400',l:'Breakout Vol Delta',d:'Analisis komposisi vol beli/jual saat breakout: valid atau jebakan.'},
            ].map(item=>(
              <div key={item.s} className="flex gap-2 items-start">
                <span className={`font-bold shrink-0 ${item.c}`}>{item.s}</span>
                <div><span className="text-gray-300 font-medium">{item.l}</span><span className="text-gray-500"> — {item.d}</span></div>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-gray-700/50 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
            <div><span className="text-purple-400 font-bold">VCP</span><span className="text-gray-500"> — Volatility Contraction Pattern. Harga & volume menyempit sebelum breakout.</span></div>
            <div><span className="text-blue-400 font-bold">CPP</span><span className="text-gray-500"> — Candle Power Prediction. Bias arah candle berikutnya (5-bar momentum).</span></div>
            <div><span className="text-yellow-400 font-bold">EVR</span><span className="text-gray-500"> — Effort vs Result. Mengukur efisiensi volume (Hukum Wyckoff ke-3).</span></div>
            <div><span className="text-green-400 font-bold">RMV</span><span className="text-gray-500"> — Relative Measured Volatility. ≤20 = zona pivot, siap breakout.</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalysisPage(){
  return(
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="flex flex-col items-center gap-3"><div className="w-10 h-10 rounded-full border-2 border-blue-400/30 border-t-blue-400 animate-spin"/><p className="text-gray-400 text-sm">Loading analysis…</p></div></div>}>
      <AnalysisContent/>
    </Suspense>
  );
}

