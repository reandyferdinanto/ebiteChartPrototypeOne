import { NextRequest, NextResponse } from 'next/server';
import YahooFinanceModule from 'yahoo-finance2';

// Create YahooFinance instance
const yahooFinance = new YahooFinanceModule();

// All Indonesian stocks from IDX
const ALL_INDONESIAN_STOCKS = [
  'AADI.JK', 'AALI.JK', 'ABBA.JK', 'ABDA.JK', 'ABMM.JK', 'ACES.JK', 'ACRO.JK', 'ACST.JK', 'ADCP.JK', 'ADES.JK',
  'ADHI.JK', 'ADMF.JK', 'ADMG.JK', 'ADMR.JK', 'ADRO.JK', 'AEGS.JK', 'AGAR.JK', 'AGII.JK', 'AGRO.JK', 'AGRS.JK',
  'AHAP.JK', 'AIMS.JK', 'AISA.JK', 'AKKU.JK', 'AKPI.JK', 'AKRA.JK', 'AKSI.JK', 'ALDO.JK', 'ALII.JK', 'ALKA.JK',
  'ALMI.JK', 'ALTO.JK', 'AMAG.JK', 'AMAN.JK', 'AMAR.JK', 'AMFG.JK', 'AMIN.JK', 'AMMN.JK', 'AMMS.JK', 'AMOR.JK',
  'AMRT.JK', 'ANDI.JK', 'ANJT.JK', 'ANTM.JK', 'APEX.JK', 'APIC.JK', 'APII.JK', 'APLI.JK', 'APLN.JK', 'ARCI.JK',
  'AREA.JK', 'ARGO.JK', 'ARII.JK', 'ARKA.JK', 'ARKO.JK', 'ARMY.JK', 'ARNA.JK', 'ARTA.JK', 'ARTI.JK', 'ARTO.JK',
  'ASBI.JK', 'ASDM.JK', 'ASGR.JK', 'ASHA.JK', 'ASII.JK', 'ASJT.JK', 'ASLC.JK', 'ASLI.JK', 'ASMI.JK', 'ASPI.JK',
  'ASPR.JK', 'ASRI.JK', 'ASRM.JK', 'ASSA.JK', 'ATAP.JK', 'ATIC.JK', 'ATLA.JK', 'AUTO.JK', 'AVIA.JK', 'AWAN.JK',
  'AXIO.JK', 'AYAM.JK', 'AYLS.JK', 'BABP.JK', 'BABY.JK', 'BACA.JK', 'BAIK.JK', 'BAJA.JK', 'BALI.JK', 'BANK.JK',
  'BAPA.JK', 'BAPI.JK', 'BATA.JK', 'BATR.JK', 'BAUT.JK', 'BAYU.JK', 'BBCA.JK', 'BBHI.JK', 'BBKP.JK', 'BBLD.JK',
  'BBMD.JK', 'BBNI.JK', 'BBRI.JK', 'BBRM.JK', 'BBSI.JK', 'BBSS.JK', 'BBTN.JK', 'BBYB.JK', 'BCAP.JK', 'BCIC.JK',
  'BCIP.JK', 'BDKR.JK', 'BDMN.JK', 'BEBS.JK', 'BEEF.JK', 'BEER.JK', 'BEKS.JK', 'BELI.JK', 'BELL.JK', 'BESS.JK',
  'BEST.JK', 'BFIN.JK', 'BGTG.JK', 'BHAT.JK', 'BHIT.JK', 'BIKA.JK', 'BIKE.JK', 'BIMA.JK', 'BINA.JK', 'BINO.JK',
  'BIPI.JK', 'BIPP.JK', 'BIRD.JK', 'BISI.JK', 'BJBR.JK', 'BJTM.JK', 'BKDP.JK', 'BKSL.JK', 'BKSW.JK', 'BLES.JK',
  'BLOG.JK', 'BLTA.JK', 'BLTZ.JK', 'BLUE.JK', 'BMAS.JK', 'BMBL.JK', 'BMHS.JK', 'BMRI.JK', 'BMSR.JK', 'BMTR.JK',
  'BNBA.JK', 'BNBR.JK', 'BNGA.JK', 'BNII.JK', 'BNLI.JK', 'BOAT.JK', 'BOBA.JK', 'BOGA.JK', 'BOLA.JK', 'BOLT.JK',
  'BOSS.JK', 'BPFI.JK', 'BPII.JK', 'BPTR.JK', 'BRAM.JK', 'BREN.JK', 'BRIS.JK', 'BRMS.JK', 'BRNA.JK', 'BRPT.JK',
  'BRRC.JK', 'BSBK.JK', 'BSDE.JK', 'BSIM.JK', 'BSML.JK', 'BSSR.JK', 'BSWD.JK', 'BTEK.JK', 'BTEL.JK', 'BTON.JK',
  'BTPN.JK', 'BTPS.JK', 'BUAH.JK', 'BUDI.JK', 'BUKA.JK', 'BUKK.JK', 'BULL.JK', 'BUMI.JK', 'BUVA.JK', 'BVIC.JK',
  'BWPT.JK', 'BYAN.JK', 'CAKK.JK', 'CAMP.JK', 'CANI.JK', 'CARE.JK', 'CARS.JK', 'CASA.JK', 'CASH.JK', 'CASS.JK',
  'CBDK.JK', 'CBMF.JK', 'CBPE.JK', 'CBRE.JK', 'CBUT.JK', 'CCSI.JK', 'CDIA.JK', 'CEKA.JK', 'CENT.JK', 'CFIN.JK',
  'CGAS.JK', 'CHEK.JK', 'CHEM.JK', 'CHIP.JK', 'CINT.JK', 'CITA.JK', 'CITY.JK', 'CLAY.JK', 'CLEO.JK', 'CLPI.JK',
  'CMNP.JK', 'CMNT.JK', 'CMPP.JK', 'CMRY.JK', 'CNKO.JK', 'CNMA.JK', 'CNTB.JK', 'CNTX.JK', 'COAL.JK', 'COCO.JK',
  'COIN.JK', 'COWL.JK', 'CPIN.JK', 'CPRI.JK', 'CPRO.JK', 'CRAB.JK', 'CRSN.JK', 'CSAP.JK', 'CSIS.JK', 'CSMI.JK',
  'CSRA.JK', 'CTBN.JK', 'CTRA.JK', 'CTTH.JK', 'CUAN.JK', 'CYBR.JK', 'DAAZ.JK', 'DADA.JK', 'DART.JK', 'DATA.JK',
  'DAYA.JK', 'DCII.JK', 'DEAL.JK', 'DEFI.JK', 'DEPO.JK', 'DEWA.JK', 'DEWI.JK', 'DFAM.JK', 'DGIK.JK', 'DGNS.JK',
  'DGWG.JK', 'DIGI.JK', 'DILD.JK', 'DIVA.JK', 'DKFT.JK', 'DKHH.JK', 'DLTA.JK', 'DMAS.JK', 'DMMX.JK', 'DMND.JK',
  'DNAR.JK', 'DNET.JK', 'DOID.JK', 'DOOH.JK', 'DOSS.JK', 'DPNS.JK', 'DPUM.JK', 'DRMA.JK', 'DSFI.JK', 'DSNG.JK',
  'DSSA.JK', 'DUCK.JK', 'DUTI.JK', 'DVLA.JK', 'DWGL.JK', 'DYAN.JK', 'EAST.JK', 'ECII.JK', 'EDGE.JK', 'EKAD.JK',
  'ELIT.JK', 'ELPI.JK', 'ELSA.JK', 'ELTY.JK', 'EMAS.JK', 'EMDE.JK', 'EMTK.JK', 'ENAK.JK', 'ENRG.JK', 'ENVY.JK',
  'ENZO.JK', 'EPAC.JK', 'EPMT.JK', 'ERAA.JK', 'ERAL.JK', 'ERTX.JK', 'ESIP.JK', 'ESSA.JK', 'ESTA.JK', 'ESTI.JK',
  'ETWA.JK', 'EURO.JK', 'EXCL.JK', 'FAPA.JK', 'FAST.JK', 'FASW.JK', 'FILM.JK', 'FIMP.JK', 'FIRE.JK', 'FISH.JK',
  'FITT.JK', 'FLMC.JK', 'FMII.JK', 'FOLK.JK', 'FOOD.JK', 'FORE.JK', 'FORU.JK', 'FPNI.JK', 'FUJI.JK', 'FUTR.JK',
  'FWCT.JK', 'GAMA.JK', 'GDST.JK', 'GDYR.JK', 'GEMA.JK', 'GEMS.JK', 'GGRM.JK', 'GGRP.JK', 'GHON.JK', 'GIAA.JK',
  'GJTL.JK', 'GLOB.JK', 'GLVA.JK', 'GMFI.JK', 'GMTD.JK', 'GOLD.JK', 'GOLF.JK', 'GOLL.JK', 'GOOD.JK', 'GOTO.JK',
  'GOTOM.JK', 'GPRA.JK', 'GPSO.JK', 'GRIA.JK', 'GRPH.JK', 'GRPM.JK', 'GSMF.JK', 'GTBO.JK', 'GTRA.JK', 'GTSI.JK',
  'GULA.JK', 'GUNA.JK', 'GWSA.JK', 'GZCO.JK', 'HADE.JK', 'HAIS.JK', 'HAJJ.JK', 'HALO.JK', 'HATM.JK', 'HBAT.JK',
  'HDFA.JK', 'HDIT.JK', 'HEAL.JK', 'HELI.JK', 'HERO.JK', 'HEXA.JK', 'HGII.JK', 'HILL.JK', 'HITS.JK', 'HKMU.JK',
  'HMSP.JK', 'HOKI.JK', 'HOME.JK', 'HOMI.JK', 'HOPE.JK', 'HOTL.JK', 'HRME.JK', 'HRTA.JK', 'HRUM.JK', 'HUMI.JK',
  'HYGN.JK', 'IATA.JK', 'IBFN.JK', 'IBOS.JK', 'IBST.JK', 'ICBP.JK', 'ICON.JK', 'IDEA.JK', 'IDPR.JK', 'IFII.JK',
  'IFSH.JK', 'IGAR.JK', 'IIKP.JK', 'IKAI.JK', 'IKAN.JK', 'IKBI.JK', 'IKPM.JK', 'IMAS.JK', 'IMJS.JK', 'IMPC.JK',
  'INAF.JK', 'INAI.JK', 'INCF.JK', 'INCI.JK', 'INCO.JK', 'INDF.JK', 'INDO.JK', 'INDR.JK', 'INDS.JK', 'INDX.JK',
  'INDY.JK', 'INET.JK', 'INKP.JK', 'INOV.JK', 'INPC.JK', 'INPP.JK', 'INPS.JK', 'INRU.JK', 'INTA.JK', 'INTD.JK',
  'INTP.JK', 'IOTF.JK', 'IPAC.JK', 'IPCC.JK', 'IPCM.JK', 'IPOL.JK', 'IPPE.JK', 'IPTV.JK', 'IRRA.JK', 'IRSX.JK',
  'ISAP.JK', 'ISAT.JK', 'ISEA.JK', 'ISSP.JK', 'ITIC.JK', 'ITMA.JK', 'ITMG.JK', 'JARR.JK', 'JAST.JK', 'JATI.JK',
  'JAWA.JK', 'JAYA.JK', 'JECC.JK', 'JGLE.JK', 'JIHD.JK', 'JKON.JK', 'JMAS.JK', 'JPFA.JK', 'JRPT.JK', 'JSKY.JK',
  'JSMR.JK', 'JSPT.JK', 'JTPE.JK', 'KAEF.JK', 'KAQI.JK', 'KARW.JK', 'KAYU.JK', 'KBAG.JK', 'KBLI.JK', 'KBLM.JK',
  'KBLV.JK', 'KBRI.JK', 'KDSI.JK', 'KDTN.JK', 'KEEN.JK', 'KEJU.JK', 'KETR.JK', 'KIAS.JK', 'KICI.JK', 'KIJA.JK',
  'KING.JK', 'KINO.JK', 'KIOS.JK', 'KJEN.JK', 'KKES.JK', 'KKGI.JK', 'KLAS.JK', 'KLBF.JK', 'KLIN.JK', 'KMDS.JK',
  'KMTR.JK', 'KOBX.JK', 'KOCI.JK', 'KOIN.JK', 'KOKA.JK', 'KONI.JK', 'KOPI.JK', 'KOTA.JK', 'KPIG.JK', 'KRAS.JK',
  'KREN.JK', 'KRYA.JK', 'KSIX.JK', 'KUAS.JK', 'LABA.JK', 'LABS.JK', 'LAJU.JK', 'LAND.JK', 'LAPD.JK', 'LCGP.JK',
  'LCKM.JK', 'LEAD.JK', 'LFLO.JK', 'LIFE.JK', 'LINK.JK', 'LION.JK', 'LIVE.JK', 'LMAS.JK', 'LMAX.JK', 'LMPI.JK',
  'LMSH.JK', 'LOPI.JK', 'LPCK.JK', 'LPGI.JK', 'LPIN.JK', 'LPKR.JK', 'LPLI.JK', 'LPPF.JK', 'LPPS.JK', 'LRNA.JK',
  'LSIP.JK', 'LTLS.JK', 'LUCK.JK', 'LUCY.JK', 'MABA.JK', 'MAGP.JK', 'MAHA.JK', 'MAIN.JK', 'MANG.JK', 'MAPA.JK',
  'MAPB.JK', 'MAPI.JK', 'MARI.JK', 'MARK.JK', 'MASB.JK', 'MAXI.JK', 'MAYA.JK', 'MBAP.JK', 'MBMA.JK', 'MBSS.JK',
  'MBTO.JK', 'MCAS.JK', 'MCOL.JK', 'MCOR.JK', 'MDIA.JK', 'MDIY.JK', 'MDKA.JK', 'MDKI.JK', 'MDLA.JK', 'MDLN.JK',
  'MDRN.JK', 'MEDC.JK', 'MEDS.JK', 'MEGA.JK', 'MEJA.JK', 'MENN.JK', 'MERI.JK', 'MERK.JK', 'META.JK', 'MFMI.JK',
  'MGLV.JK', 'MGNA.JK', 'MGRO.JK', 'MHKI.JK', 'MICE.JK', 'MIDI.JK', 'MIKA.JK', 'MINA.JK', 'MINE.JK', 'MIRA.JK',
  'MITI.JK', 'MKAP.JK', 'MKNT.JK', 'MKPI.JK', 'MKTR.JK', 'MLBI.JK', 'MLIA.JK', 'MLPL.JK', 'MLPT.JK', 'MMIX.JK',
  'MMLP.JK', 'MNCN.JK', 'MOLI.JK', 'MORA.JK', 'MPIX.JK', 'MPMX.JK', 'MPOW.JK', 'MPPA.JK', 'MPRO.JK', 'MPXL.JK',
  'MRAT.JK', 'MREI.JK', 'MSIE.JK', 'MSIN.JK', 'MSJA.JK', 'MSKY.JK', 'MSTI.JK', 'MTDL.JK', 'MTEL.JK', 'MTFN.JK',
  'MTLA.JK', 'MTMH.JK', 'MTPS.JK', 'MTRA.JK', 'MTSM.JK', 'MTWI.JK', 'MUTU.JK', 'MYOH.JK', 'MYOR.JK', 'MYTX.JK',
  'NAIK.JK', 'NANO.JK', 'NASA.JK', 'NASI.JK', 'NATO.JK', 'NAYZ.JK', 'NCKL.JK', 'NELY.JK', 'NEST.JK', 'NETV.JK',
  'NFCX.JK', 'NICE.JK', 'NICK.JK', 'NICL.JK', 'NIKL.JK', 'NINE.JK', 'NIRO.JK', 'NISP.JK', 'NOBU.JK', 'NPGF.JK',
  'NRCA.JK', 'NSSS.JK', 'NTBK.JK', 'NUSA.JK', 'NZIA.JK', 'OASA.JK', 'OBAT.JK', 'OBMD.JK', 'OCAP.JK', 'OILS.JK',
  'OKAS.JK', 'OLIV.JK', 'OMED.JK', 'OMRE.JK', 'OPMS.JK', 'PACK.JK', 'PADA.JK', 'PADI.JK', 'PALM.JK', 'PAMG.JK',
  'PANI.JK', 'PANR.JK', 'PANS.JK', 'PART.JK', 'PBID.JK', 'PBRX.JK', 'PBSA.JK', 'PCAR.JK', 'PDES.JK', 'PDPP.JK',
  'PEGE.JK', 'PEHA.JK', 'PEVE.JK', 'PGAS.JK', 'PGEO.JK', 'PGJO.JK', 'PGLI.JK', 'PGUN.JK', 'PICO.JK', 'PIPA.JK',
  'PJAA.JK', 'PJHB.JK', 'PKPK.JK', 'PLAN.JK', 'PLAS.JK', 'PLIN.JK', 'PMJS.JK', 'PMMP.JK', 'PMUI.JK', 'PNBN.JK',
  'PNBS.JK', 'PNGO.JK', 'PNIN.JK', 'PNLF.JK', 'PNSE.JK', 'POLA.JK', 'POLI.JK', 'POLL.JK', 'POLU.JK', 'POLY.JK',
  'POOL.JK', 'PORT.JK', 'POSA.JK', 'POWR.JK', 'PPGL.JK', 'PPRE.JK', 'PPRI.JK', 'PPRO.JK', 'PRAY.JK', 'PRDA.JK',
  'PRIM.JK', 'PSAB.JK', 'PSAT.JK', 'PSDN.JK', 'PSGO.JK', 'PSKT.JK', 'PSSI.JK', 'PTBA.JK', 'PTDU.JK', 'PTIS.JK',
  'PTMP.JK', 'PTMR.JK', 'PTPP.JK', 'PTPS.JK', 'PTPW.JK', 'PTRO.JK', 'PTSN.JK', 'PTSP.JK', 'PUDP.JK', 'PURA.JK',
  'PURE.JK', 'PURI.JK', 'PWON.JK', 'PYFA.JK', 'PZZA.JK', 'RAAM.JK', 'RAFI.JK', 'RAJA.JK', 'RALS.JK', 'RANC.JK',
  'RATU.JK', 'RBMS.JK', 'RCCC.JK', 'RDTX.JK', 'REAL.JK', 'RELF.JK', 'RELI.JK', 'RGAS.JK', 'RICY.JK', 'RIGS.JK',
  'RIMO.JK', 'RISE.JK', 'RLCO.JK', 'RMKE.JK', 'RMKO.JK', 'ROCK.JK', 'RODA.JK', 'RONY.JK', 'ROTI.JK', 'RSCH.JK',
  'RSGK.JK', 'RUIS.JK', 'RUNS.JK', 'SAFE.JK', 'SAGE.JK', 'SAME.JK', 'SAMF.JK', 'SAPX.JK', 'SATU.JK', 'SBAT.JK',
  'SBMA.JK', 'SCCO.JK', 'SCMA.JK', 'SCNP.JK', 'SCPI.JK', 'SDMU.JK', 'SDPC.JK', 'SDRA.JK', 'SEMA.JK', 'SFAN.JK',
  'SGER.JK', 'SGRO.JK', 'SHID.JK', 'SHIP.JK', 'SICO.JK', 'SIDO.JK', 'SILO.JK', 'SIMA.JK', 'SIMP.JK', 'SINI.JK',
  'SIPD.JK', 'SKBM.JK', 'SKLT.JK', 'SKRN.JK', 'SKYB.JK', 'SLIS.JK', 'SMAR.JK', 'SMBR.JK', 'SMCB.JK', 'SMDM.JK',
  'SMDR.JK', 'SMGA.JK', 'SMGR.JK', 'SMIL.JK', 'SMKL.JK', 'SMKM.JK', 'SMLE.JK', 'SMMA.JK', 'SMMT.JK', 'SMRA.JK',
  'SMRU.JK', 'SMSM.JK', 'SNLK.JK', 'SOCI.JK', 'SOFA.JK', 'SOHO.JK', 'SOLA.JK', 'SONA.JK', 'SOSS.JK', 'SOTS.JK',
  'SOUL.JK', 'SPMA.JK', 'SPRE.JK', 'SPTO.JK', 'SQMI.JK', 'SRAJ.JK', 'SRIL.JK', 'SRSN.JK', 'SRTG.JK', 'SSIA.JK',
  'SSMS.JK', 'SSTM.JK', 'STAA.JK', 'STAR.JK', 'STRK.JK', 'STTP.JK', 'SUGI.JK', 'SULI.JK', 'SUNI.JK', 'SUPA.JK',
  'SUPR.JK', 'SURE.JK', 'SURI.JK', 'SWAT.JK', 'SWID.JK', 'TALF.JK', 'TAMA.JK', 'TAMU.JK', 'TAPG.JK', 'TARA.JK',
  'TAXI.JK', 'TAYS.JK', 'TBIG.JK', 'TBLA.JK', 'TBMS.JK', 'TCID.JK', 'TCPI.JK', 'TDPM.JK', 'TEBE.JK', 'TECH.JK',
  'TELE.JK', 'TFAS.JK', 'TFCO.JK', 'TGKA.JK', 'TGRA.JK', 'TGUK.JK', 'TIFA.JK', 'TINS.JK', 'TIRA.JK', 'TIRT.JK',
  'TKIM.JK', 'TLDN.JK', 'TLKM.JK', 'TMAS.JK', 'TMPO.JK', 'TNCA.JK', 'TOBA.JK', 'TOOL.JK', 'TOPS.JK', 'TOSK.JK',
  'TOTL.JK', 'TOTO.JK', 'TOWR.JK', 'TOYS.JK', 'TPIA.JK', 'TPMA.JK', 'TRAM.JK', 'TRGU.JK', 'TRIL.JK', 'TRIM.JK',
  'TRIN.JK', 'TRIO.JK', 'TRIS.JK', 'TRJA.JK', 'TRON.JK', 'TRST.JK', 'TRUE.JK', 'TRUK.JK', 'TRUS.JK', 'TSPC.JK',
  'TUGU.JK', 'TYRE.JK', 'UANG.JK', 'UCID.JK', 'UDNG.JK', 'UFOE.JK', 'ULTJ.JK', 'UNIC.JK', 'UNIQ.JK', 'UNIT.JK',
  'UNSP.JK', 'UNTD.JK', 'UNTR.JK', 'UNVR.JK', 'URBN.JK', 'UVCR.JK', 'VAST.JK', 'VERN.JK', 'VICI.JK', 'VICO.JK',
  'VINS.JK', 'VISI.JK', 'VIVA.JK', 'VKTR.JK', 'VOKS.JK', 'VRNA.JK', 'VTNY.JK', 'WAPO.JK', 'WEGE.JK', 'WEHA.JK',
  'WGSH.JK', 'WICO.JK', 'WIDI.JK', 'WIFI.JK', 'WIIM.JK', 'WIKA.JK', 'WINE.JK', 'WINR.JK', 'WINS.JK', 'WIRG.JK',
  'WMPP.JK', 'WMUU.JK', 'WOMF.JK', 'WOOD.JK', 'WOWS.JK', 'WSBP.JK', 'WSKT.JK', 'WTON.JK', 'YELO.JK', 'YOII.JK',
  'YPAS.JK', 'YULE.JK', 'YUPI.JK', 'ZATA.JK', 'ZBRA.JK', 'ZINC.JK', 'ZONE.JK', 'ZYRX.JK'
];

interface VCPCandidate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  vpcScore: number;
  cppScore: number;
  cppBias: string;
  evrScore: number;
  wyckoffPhase: string;
  isVCP: boolean;
  isDryUp: boolean;
  isIceberg: boolean;
  isSniperEntry: boolean;
  isNoSupply: boolean;
  isSellingClimax: boolean;
  rmv: number;
  pattern: string;
  recommendation: string;
}

// ── Shared helper functions (mirrors lib/indicators.ts logic exactly) ──────

function calcSMA(arr: number[], period: number, idx: number): number {
  if (idx < period - 1) return 0;
  let s = 0;
  for (let i = idx - period + 1; i <= idx; i++) s += arr[i];
  return s / period;
}

function calcATR(highs: number[], lows: number[], closes: number[], period: number, idx: number): number {
  if (idx < period) return 0;
  let s = 0;
  for (let i = idx - period + 1; i <= idx; i++) {
    const h = highs[i], l = lows[i], pc = closes[i - 1] ?? closes[i];
    s += Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
  }
  return s / period;
}

// Power Directional Index — same formula as calculateCandlePower in indicators.ts
function calcCPP(closes: number[], opens: number[], highs: number[], lows: number[], volumes: number[], idx: number, lookback = 5): number {
  if (idx < lookback + 10) return 0;
  let volSum = 0;
  for (let i = 0; i < 10; i++) volSum += volumes[idx - i];
  const volSMA10 = volSum / 10 || 1;
  let cpp = 0;
  for (let j = 0; j < lookback; j++) {
    const i = idx - j;
    const range = highs[i] - lows[i];
    const safeRange = range === 0 ? 0.0001 : range;
    const cbd = (closes[i] - opens[i]) / safeRange;
    const vam = volumes[i] / volSMA10;
    const dp = cbd * vam;
    const weight = (lookback - j) / lookback;
    cpp += dp * weight;
  }
  return cpp;
}

// EVR Score — Effort vs Result (mirrors detectVSA in indicators.ts)
function calcEVR(highs: number[], lows: number[], closes: number[], opens: number[], volumes: number[], idx: number, period = 14): number {
  if (idx < period + 1) return 0;
  const atr = calcATR(highs, lows, closes, period, idx);
  if (!atr) return 0;
  const volSMA = calcSMA(volumes, 20, idx);
  const spread = highs[idx] - lows[idx];
  const effort = volumes[idx] / (volSMA || 1);
  const result2 = spread / atr;
  return Math.round((result2 - effort) * 100) / 100;
}

// Wyckoff phase classifier — same thresholds as detectVSA in indicators.ts
function classifyWyckoff(closes: number[], ma20: number, ma50: number): string {
  const cur = closes[closes.length - 1];
  const inUptrend  = cur > ma20 && cur > ma50 && ma20 > ma50;
  const inDowntrend= cur < ma20 && cur < ma50 && ma20 < ma50;
  if (inUptrend)   return 'MARKUP';
  if (inDowntrend) return 'MARKDOWN';
  if (cur > ma20 * 0.95) return 'ACCUMULATION';
  return 'DISTRIBUTION';
}

// RMV — Relative Measured Volatility (from research: VCP detection)
function calcRMV(highs: number[], lows: number[], closes: number[], idx: number): number {
  if (idx < 25) return 50;
  // ATR5 array for last 20 bars
  const atr5vals: number[] = [];
  for (let i = idx - 19; i <= idx; i++) {
    atr5vals.push(calcATR(highs, lows, closes, 5, i));
  }
  const curAtr5 = atr5vals[atr5vals.length - 1];
  const minA = Math.min(...atr5vals);
  const maxA = Math.max(...atr5vals);
  if (maxA === minA) return 50;
  return ((curAtr5 - minA) / (maxA - minA)) * 100;
}

// Analyze single stock for VCP/Sniper pattern
async function analyzeStockVCP(symbol: string): Promise<VCPCandidate | null> {
  try {
    const result = await yahooFinance.historical(symbol, {
      period1: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      period2: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      interval: '1d',
    });

    if (!result || result.length < 60) {
      return null;
    }

    // Use last 100 bars (enough for all indicators)
    const raw = result.slice(-100);
    const closes  = raw.map(d => d.close  || 0);
    const highs   = raw.map(d => d.high   || 0);
    const lows    = raw.map(d => d.low    || 0);
    const opens   = raw.map(d => d.open   || 0);
    const volumes = raw.map(d => d.volume || 0);
    const N = closes.length;
    const idx = N - 1; // last candle index

    // Get latest quote
    let quoteData: any;
    try {
      quoteData = await yahooFinance.quote(symbol);
    } catch {
      return null;
    }

    // ── Moving Averages ──────────────────────────────────────────────────
    const ma20 = calcSMA(closes, 20, idx);
    const ma50 = calcSMA(closes, 50, idx);
    const aboveMA20 = closes[idx] > ma20;
    const aboveMA50 = closes[idx] > ma50;
    const maUptrend = ma20 > ma50;

    // ── ATR (14) ─────────────────────────────────────────────────────────
    const atr14 = calcATR(highs, lows, closes, 14, idx);

    // ── 20-period averages ───────────────────────────────────────────────
    let volSum = 0, spreadSum = 0;
    for (let i = idx - 19; i <= idx; i++) {
      volSum   += volumes[i];
      spreadSum += highs[i] - lows[i];
    }
    const volAvg20    = volSum / 20;
    const spreadAvg20 = spreadSum / 20;

    // Current candle
    const curClose  = closes[idx];
    const curOpen   = opens[idx];
    const curHigh   = highs[idx];
    const curLow    = lows[idx];
    const curVol    = volumes[idx];
    const spread    = curHigh - curLow;
    const body      = Math.abs(curClose - curOpen);
    const isGreen   = curClose >= curOpen;
    const volRatio  = curVol / (volAvg20 || 1);
    const spreadRatio = spread / (spreadAvg20 || 1);
    const closePos  = spread > 0 ? (curClose - curLow) / spread : 0.5;
    const upperWick = curHigh - Math.max(curOpen, curClose);
    const lowerWick = Math.min(curOpen, curClose) - curLow;

    // ── Buying / Selling Pressure (last 10 bars) ─────────────────────────
    let buyVol = 0, sellVol = 0;
    for (let k = idx - 9; k <= idx; k++) {
      if (closes[k] > opens[k]) buyVol  += volumes[k];
      else if (closes[k] < opens[k]) sellVol += volumes[k];
    }
    const accRatio = buyVol / (sellVol || 1);

    // ── VSA pattern flags (mirrors detectVSA in lib/indicators.ts) ───────
    const isDistribution = !isGreen && volRatio > 1.5 && accRatio < 0.5;
    const isDryUp  = (!isGreen || body < spread * 0.3) && volRatio <= 0.60 && accRatio > 0.8;
    const isIceberg = volRatio > 1.2 && spreadRatio < 0.75;

    // VSA named signals (mirrors detectVSA)
    const isNoSupply =
      curLow < (idx > 0 ? lows[idx - 1] : curLow) &&
      spread < atr14 &&
      volRatio < (idx > 1 ? volumes[idx - 1] / volAvg20 : 1) &&
      volRatio < (idx > 2 ? volumes[idx - 2] / volAvg20 : 1);

    const isSellingClimax =
      spread > atr14 * 2 &&
      volRatio > 2.5 &&
      !isGreen &&
      closePos > 0.4;

    const isUpthrust =
      spread > atr14 * 1.5 &&
      volRatio > 1.5 &&
      closePos < 0.3;

    const isNoDemand =
      isGreen &&
      spread < atr14 &&
      curHigh > (idx > 0 ? highs[idx - 1] : curHigh) &&
      volRatio < (idx > 1 ? volumes[idx - 1] / volAvg20 : 1);

    // ── VCP detection (mirrors detectVSA VCP block) ───────────────────────
    const last30High    = Math.max(...highs.slice(idx - 29, idx + 1));
    const isNearHigh    = curClose > last30High * 0.80;
    let sp5 = 0, vl5 = 0;
    for (let j = Math.max(0, idx - 4); j <= idx; j++) {
      sp5 += highs[j] - lows[j];
      vl5 += volumes[j];
    }
    const isLowSpread5  = (sp5 / 5) < spreadAvg20 * 0.75;
    const isLowVol5     = (vl5 / 5) < volAvg20 * 0.85;
    const isVCP         = isNearHigh && isLowSpread5 && isLowVol5;

    // ── RMV — Relative Measured Volatility (VCP pivot gauge) ─────────────
    const rmv = calcRMV(highs, lows, closes, idx);
    const isVCPPivot = isVCP && rmv <= 15;

    // ── Sniper Entry = VCP Pivot + DryUp + Trend aligned ─────────────────
    const isSniperEntry = isVCPPivot && isDryUp && aboveMA20 && aboveMA50 && maUptrend && accRatio > 1.0;

    // ── CPP / PDI — Candle Power Prediction (mirrors calculateCandlePower) ─
    const cppRaw   = calcCPP(closes, opens, highs, lows, volumes, idx, 5);
    const cppScore = Math.round(cppRaw * 100) / 100;
    const cppBias  = cppRaw > 0.5 ? 'BULLISH' : cppRaw < -0.5 ? 'BEARISH' : 'NEUTRAL';

    // Map CPP to 0-100 power score (same as chart)
    let powerScore = Math.round(50 + (cppRaw / 1.5) * 45);
    powerScore = Math.max(0, Math.min(100, powerScore));

    // ── EVR — Effort vs Result ────────────────────────────────────────────
    const evrScore = calcEVR(highs, lows, closes, opens, volumes, idx, 14);

    // ── Wyckoff phase ─────────────────────────────────────────────────────
    const wyckoffPhase = classifyWyckoff(closes.slice(idx - 4, idx + 1), ma20, ma50);

    // ── Pattern & Score ───────────────────────────────────────────────────
    // Score is a weighted blend: CPP power (40%) + VSA pattern bonus (40%) + RMV tightness (20%)
    let vpcScore = powerScore * 0.40;

    // VSA pattern bonus
    if (isSniperEntry)                        vpcScore += 40;
    else if (isVCP && isDryUp)                vpcScore += 36;
    else if (isVCP && isIceberg)              vpcScore += 33;
    else if (isSellingClimax)                 vpcScore += 32; // SC = accumulation opportunity
    else if (isNoSupply && aboveMA20)         vpcScore += 30;
    else if (isVCP)                           vpcScore += 28;
    else if (isDryUp && accRatio > 1.5)       vpcScore += 25;
    else if (isDryUp)                         vpcScore += 20;
    else if (isIceberg && accRatio > 1.5)     vpcScore += 22;
    else if (isIceberg)                       vpcScore += 18;
    else if (aboveMA20 && maUptrend && isGreen) vpcScore += 10;

    // RMV bonus (tighter = better setup)
    const rmvBonus = rmv <= 15 ? 20 : rmv <= 30 ? 12 : rmv <= 50 ? 6 : 0;
    vpcScore += rmvBonus;

    // Penalty for bearish signals
    if (isDistribution)   vpcScore -= 15;
    if (isUpthrust)       vpcScore -= 12;
    if (isNoDemand)       vpcScore -= 8;
    if (!aboveMA20)       vpcScore -= 5;

    vpcScore = Math.max(0, Math.min(100, Math.round(vpcScore)));

    // Pattern label — mirrors chart VSA markers text exactly
    let pattern = '⬜ Netral';
    let recommendation = 'Wait';

    if (isSniperEntry) {
      pattern = '🎯 SNIPER ENTRY';
      recommendation = '⚡ KUAT BELI – Perfect VCP Pivot!';
    } else if (isVCP && isDryUp) {
      pattern = '🎯 VCP DRY-UP';
      recommendation = '🚀 BELI – High probability!';
    } else if (isSellingClimax && aboveMA20) {
      pattern = '🟢 Selling Climax';
      recommendation = '🚀 BELI – SC + above MA20, akumulasi!';
    } else if (isNoSupply && aboveMA20) {
      pattern = '🟢 No Supply';
      recommendation = '🛒 BELI – Penjual habis, siap naik';
    } else if (isVCP && isIceberg) {
      pattern = '🧊 VCP ICEBERG';
      recommendation = '🚀 BELI – Strong accumulation!';
    } else if (isVCPPivot) {
      pattern = '📍 VCP PIVOT (RMV' + Math.round(rmv) + ')';
      recommendation = '⏳ WATCH – Tunggu dry up/breakout';
    } else if (isVCP) {
      pattern = '📉 VCP BASE';
      recommendation = '⏳ WATCH – Base forming';
    } else if (isDryUp && accRatio > 1.5) {
      pattern = '🥷 DRY UP Kuat';
      recommendation = '📍 ENTRY – Support test + buying';
    } else if (isDryUp) {
      pattern = '🥷 DRY UP';
      recommendation = '📍 ENTRY – Support test';
    } else if (isIceberg) {
      pattern = '🧊 ICEBERG';
      recommendation = '👀 WATCH – Hidden accumulation';
    } else if (isDistribution) {
      pattern = '🩸 DISTRIBUSI';
      recommendation = '❌ HINDARI – Distribusi institusi';
    } else if (isUpthrust) {
      pattern = '⚡ UPTHRUST';
      recommendation = '❌ HINDARI – Jebakan breakout';
    } else if (vpcScore > 55) {
      pattern = '📈 DEVELOPING';
      recommendation = '⏳ MONITOR – Setup berkembang';
    }

    return {
      symbol: symbol.replace('.JK', ''),
      price: quoteData.regularMarketPrice || 0,
      change: quoteData.regularMarketChange || 0,
      changePercent: quoteData.regularMarketChangePercent || 0,
      volume: quoteData.regularMarketVolume || 0,
      vpcScore,
      cppScore,
      cppBias,
      evrScore,
      wyckoffPhase,
      isVCP,
      isDryUp,
      isIceberg,
      isSniperEntry,
      isNoSupply,
      isSellingClimax,
      rmv: Math.round(rmv),
      pattern,
      recommendation
    };
  } catch (error) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');
    const minScore = parseInt(searchParams.get('minScore') || '50'); // Lowered to 50 for maximum inclusivity
    const filter = searchParams.get('filter') || 'liquid'; // 'all' or 'liquid'

    // Define liquid stocks - high volume, frequently traded
    const LIQUID_STOCKS = [
      // LQ45 (Most Liquid)
      'AAPL.JK', 'ADRO.JK', 'ASII.JK', 'ASRI.JK', 'BNII.JK',
      'BBCA.JK', 'BBNI.JK', 'BBRI.JK', 'BBTN.JK', 'BFIN.JK',
      'BMRI.JK', 'BNGA.JK', 'BNLI.JK', 'BRPT.JK', 'BSDE.JK',
      'BTPS.JK', 'CPIN.JK', 'CTRA.JK', 'ELSA.JK', 'EXCL.JK',
      'GGRM.JK', 'GOTO.JK', 'GOTOM.JK', 'HMSP.JK', 'ICBP.JK',
      'INDF.JK', 'INTP.JK', 'ITMG.JK', 'JSMR.JK', 'KLBF.JK',
      'LPKR.JK', 'MNCN.JK', 'PGAS.JK', 'PJAA.JK', 'PKPK.JK',
      'PTBA.JK', 'PTPP.JK', 'PTRO.JK', 'SMGR.JK', 'SMRA.JK',
      'SSMS.JK', 'TCID.JK', 'TINS.JK', 'TLKM.JK', 'TOWR.JK',
      'TRAM.JK', 'UNTR.JK', 'UNVR.JK', 'WSKT.JK', 'WTON.JK',
      // Additional High Liquidity Stocks
      'AGRO.JK', 'ASTRA.JK', 'AXIO.JK', 'BAJA.JK', 'BDMN.JK',
      'BMTR.JK', 'BRIS.JK', 'BTPN.JK', 'CARA.JK', 'CFIN.JK',
      'DOID.JK', 'DSSA.JK', 'ECII.JK', 'EMTK.JK', 'ERAA.JK',
      'EURO.JK', 'FINS.JK', 'GJTL.JK', 'GIAA.JK', 'GLOB.JK',
      'HARD.JK', 'HEAL.JK', 'HERO.JK', 'HOKI.JK', 'INAI.JK',
      'INKS.JK', 'JAPA.JK', 'JPFA.JK', 'KAEF.JK', 'KBLI.JK',
      'KIAS.JK', 'KIMM.JK', 'KMTR.JK', 'MBSS.JK', 'MDKA.JK',
      'MEDC.JK', 'MERK.JK', 'META.JK', 'MIDI.JK', 'MIRA.JK',
      'MKPI.JK', 'MLPL.JK', 'MMIX.JK', 'MOIA.JK', 'NCKL.JK',
      'NISP.JK', 'OKAS.JK', 'OXIM.JK', 'PBID.JK', 'PBRX.JK',
      'PECO.JK', 'PESA.JK', 'PJIF.JK', 'PLIN.JK', 'POLA.JK',
      'POUX.JK', 'PPRE.JK', 'PREM.JK', 'PSAB.JK', 'PSAT.JK',
      'RALS.JK', 'RBMS.JK', 'RICY.JK', 'RISE.JK', 'RITI.JK',
      'RODA.JK', 'RSTI.JK', 'RUIS.JK', 'SCMA.JK', 'SCPI.JK',
      'SDA.JK', 'SDIN.JK', 'SDMU.JK', 'SGER.JK', 'SGRO.JK',
      'SIAR.JK', 'SIDO.JK', 'SILO.JK', 'SIMA.JK', 'SIMP.JK',
      'SKLT.JK', 'SKRN.JK', 'SLIA.JK', 'SMCB.JK', 'SMDR.JK',
      'SMFL.JK', 'SMKL.JK', 'SMOU.JK', 'SMRU.JK', 'SNLK.JK',
      'SOHO.JK', 'SONA.JK', 'SORE.JK', 'SPMA.JK', 'SRIW.JK',
      'SRTG.JK', 'SSTM.JK', 'STAR.JK', 'STRO.JK', 'SUGI.JK',
      'SUPR.JK', 'SYNA.JK', 'TALA.JK', 'TBIG.JK', 'TBMS.JK',
      'TELE.JK', 'TGKA.JK', 'TIRA.JK', 'TIRT.JK', 'TOAT.JK',
      'TOKO.JK', 'TOMI.JK', 'TOPS.JK', 'TPSO.JK', 'TRIA.JK',
      'TRIO.JK', 'TRIP.JK', 'TRMB.JK', 'TRST.JK', 'TRUE.JK',
      'TRUL.JK', 'TRUS.JK', 'TUYA.JK', 'UANG.JK', 'ULUL.JK',
      'UNIT.JK', 'UNSP.JK', 'UTRX.JK', 'VKTR.JK', 'VONS.JK',
      'VRNA.JK', 'WAPO.JK', 'WEGE.JK', 'WEHA.JK', 'WICO.JK',
      'WIKA.JK', 'WINS.JK', 'WISA.JK', 'WTON.JK', 'YELO.JK',
      'YULE.JK', 'YUPI.JK', 'ZBRA.JK', 'ZETA.JK', 'ZREL.JK'
    ];

    // Select stocks to scan
    const stocksToScan = filter === 'liquid' ? LIQUID_STOCKS : ALL_INDONESIAN_STOCKS;

    // Analyze all stocks in parallel (batches of 10)
    const candidates: VCPCandidate[] = [];
    const batchSize = 10;

    for (let i = 0; i < stocksToScan.length; i += batchSize) {
      const batch = stocksToScan.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(s => analyzeStockVCP(s)));

      const validResults = results.filter((r): r is VCPCandidate => r !== null && r.vpcScore >= minScore);
      candidates.push(...validResults);
    }

    // Sort by VCP score
    candidates.sort((a, b) => b.vpcScore - a.vpcScore);

    // Group by pattern — consistent with chart indicator labels
    const grouped = {
      sniperEntry: candidates.filter(c =>
        c.isSniperEntry || (c.isVCP && c.isDryUp)
      ).slice(0, Math.ceil(limit / 3)),
      vcp: candidates.filter(c =>
        c.isVCP && !c.isSniperEntry && !c.isDryUp
      ).slice(0, Math.ceil(limit / 3)),
      dryUp: candidates.filter(c =>
        (c.isDryUp || c.isNoSupply || c.isSellingClimax) && !c.isSniperEntry
      ).slice(0, Math.ceil(limit / 3))
    };

    return NextResponse.json({
      filter: filter,
      scannedStocks: stocksToScan.length,
      total: candidates.length,
      sniperCount: grouped.sniperEntry.length,
      vcpCount: grouped.vcp.length,
      dryUpCount: grouped.dryUp.length,
      candidates: {
        sniperEntry: grouped.sniperEntry,
        vcp: grouped.vcp,
        dryUp: grouped.dryUp,
        all: candidates.slice(0, limit)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to scan stocks', details: error.message },
      { status: 500 }
    );
  }
}

