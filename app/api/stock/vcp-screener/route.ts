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
  isVCP: boolean;
  isDryUp: boolean;
  isIceberg: boolean;
  isSniperEntry: boolean;
  pattern: string;
  recommendation: string;
}

// Analyze single stock for VCP/Sniper pattern
async function analyzeStockVCP(symbol: string): Promise<VCPCandidate | null> {
  try {
    const result = await yahooFinance.historical(symbol, {
      period1: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      period2: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      interval: '1d',
    });

    if (!result || result.length < 50) {
      console.log(`${symbol}: Not enough data (${result?.length || 0} bars)`);
      return null;
    }

    const data = result.slice(-50);
    const closes = data.map(d => d.close || 0);
    const highs = data.map(d => d.high || 0);
    const lows = data.map(d => d.low || 0);
    const volumes = data.map(d => d.volume || 0);
    const opens = data.map(d => d.open || 0);

    const N = data.length;
    const current = data[N - 1];

    // Get latest quote
    let quoteData: any;
    try {
      quoteData = await yahooFinance.quote(symbol);
    } catch (e) {
      console.log(`${symbol}: Could not fetch quote`);
      return null;
    }

    // Calculate 20-period average
    let volSum = 0;
    let spreadSum = 0;
    for (let i = N - 20; i < N; i++) {
      volSum += volumes[i];
      spreadSum += highs[i] - lows[i];
    }
    const volAvg = volSum / 20;
    const spreadAvg = spreadSum / 20;

    // Current candle metrics
    const spread = current.high - current.low;
    const body = Math.abs(current.close - current.open);
    const volRatio = current.volume / (volAvg || 1);
    const spreadRatio = spread / (spreadAvg || 1);
    const isGreen = current.close >= current.open;

    // Calculate MA for trend confirmation
    let ma20 = 0;
    let ma50 = 0;
    for (let i = N - 20; i < N; i++) {
      ma20 += closes[i];
    }
    ma20 /= 20;

    if (N >= 50) {
      for (let i = N - 50; i < N; i++) {
        ma50 += closes[i];
      }
      ma50 /= 50;
    } else {
      ma50 = ma20; // Fallback if not enough data
    }

    const aboveMA20 = current.close > ma20;
    const aboveMA50 = current.close > ma50;
    const maUptrend = ma20 > ma50;

    // VCP DETECTION - More lenient for screening (match chart logic)
    const last30High = Math.max(...highs.slice(-30));
    const last52WeekHigh = Math.max(...highs.slice(-250)); // ~1 year
    const isNearRecentHigh = current.close > (last30High * 0.85); // Within 15% of 30-day high

    // Calculate volatility contraction
    let spread5Sum = 0;
    let vol5Sum = 0;
    let spread20Sum = 0;
    let vol20Sum = 0;

    for (let i = N - 5; i < N; i++) {
      spread5Sum += highs[i] - lows[i];
      vol5Sum += volumes[i];
    }
    for (let i = N - 20; i < N; i++) {
      spread20Sum += highs[i] - lows[i];
      vol20Sum += volumes[i];
    }

    const spread5Avg = spread5Sum / 5;
    const spread20Avg = spread20Sum / 20;
    const vol5Avg = vol5Sum / 5;
    const vol20Avg = vol20Sum / 20;

    // Basic VCP = Near highs + contraction (LENIENT for screening)
    const isVolatilityContraction = spread5Avg < (spread20Avg * 0.75); // < 75%
    const isVolumeContraction = vol5Avg < (vol20Avg * 0.80); // < 80%

    const isVCP = isNearRecentHigh &&
                  isVolatilityContraction &&
                  isVolumeContraction;

    // Buying/selling pressure
    let buyVol = 0;
    let sellVol = 0;
    for (let i = N - 10; i < N; i++) {
      if (closes[i] > opens[i]) buyVol += volumes[i];
      else if (closes[i] < opens[i]) sellVol += volumes[i];
    }
    const accRatio = buyVol / (sellVol || 1);

    // DRY UP DETECTION - More lenient for screening
    const isDryUp = (volRatio < 0.65) && // < 65% volume (lenient)
                    (body < spread * 0.5) && // Small body (lenient)
                    (accRatio > 0.85); // Buying > selling (lenient)

    // ICEBERG DETECTION - More lenient for screening
    const isIceberg = (volRatio > 1.2) && // > 1.2x volume (lenient)
                      (spreadRatio < 0.75) && // Tight spread
                      (accRatio > 1.1); // Some buying pressure (lenient)

    // SNIPER ENTRY - VERY STRICT (only perfect setups)
    const isNearAllTimeHigh = current.close > (last52WeekHigh * 0.90); // 90% of 52-week
    const hasSupport = (current.low <= ma20 * 1.02) && (current.close > ma20 * 0.98);

    let priceRangeSum = 0;
    for (let i = N - 5; i < N; i++) {
      priceRangeSum += Math.abs(highs[i] - lows[i]) / closes[i];
    }
    const avgPriceRange = priceRangeSum / 5;
    const isTightPrice = avgPriceRange < 0.03; // < 3% daily range

    const isSignificantVCContraction = spread5Avg < (spread20Avg * 0.65); // < 65% (tight)
    const isStrictVolumeContraction = vol5Avg < (vol20Avg * 0.75); // < 75%

    // SNIPER = Perfect VCP + Perfect DRY UP + Perfect trend
    const isSniperEntry = isNearAllTimeHigh && // 90% of 52-week high
                          aboveMA20 &&
                          aboveMA50 &&
                          maUptrend &&
                          isSignificantVCContraction &&
                          isStrictVolumeContraction &&
                          isTightPrice &&
                          (volRatio < 0.50) && // Very low volume
                          (accRatio > 1.2) && // Strong buying
                          hasSupport;

    // DEBUG: Log criteria for monitoring
    if (Math.random() < 0.05) { // Log ~5% of stocks
      console.log(`${symbol}: Sniper=${isSniperEntry} VCP=${isVCP} DryUp=${isDryUp} Ice=${isIceberg} Vol=${volRatio.toFixed(2)} Acc=${accRatio.toFixed(2)} MA20=${aboveMA20} MA50=${aboveMA50}`);
    }

    // VCP Score calculation - Reflect actual pattern quality
    let vpcScore = 50; // Base score

    // Premium patterns (highest scores)
    if (isSniperEntry) {
      vpcScore = 95; // SNIPER ENTRY = highest quality
    } else if (isVCP && isDryUp) {
      vpcScore = 92; // VCP + DRY UP (very close to sniper)
    } else if (isVCP && isIceberg) {
      vpcScore = 88; // VCP + ICEBERG
    } else if (isVCP) {
      vpcScore = 82; // VCP BASE alone
    } else if (isDryUp && accRatio > 1.5) {
      vpcScore = 78; // Strong DRY UP
    } else if (isDryUp) {
      vpcScore = 72; // Regular DRY UP
    } else if (isIceberg && accRatio > 1.5) {
      vpcScore = 75; // Strong ICEBERG
    } else if (isIceberg) {
      vpcScore = 68; // Regular ICEBERG
    } else if (aboveMA20 && aboveMA50 && maUptrend && isGreen) {
      vpcScore = 60; // Good uptrend but no specific pattern
    }

    // Bonus adjustments
    if (accRatio > 1.5) vpcScore += 3;
    if (isTightPrice) vpcScore += 2;
    if (volRatio < 0.5) vpcScore += 2;

    // Ensure score is within bounds
    vpcScore = Math.max(50, Math.min(100, vpcScore));

    let pattern = '⬜ Netral';
    let recommendation = 'Wait';

    // Pattern classification matching chart logic
    if (isSniperEntry) {
      pattern = '🎯 SNIPER ENTRY';
      recommendation = '⚡ STRONG BUY - Perfect setup!';
    } else if (isVCP && isDryUp) {
      pattern = '🎯 VCP DRY-UP (Near Sniper)';
      recommendation = '🚀 BUY - High probability!';
    } else if (isVCP && isIceberg) {
      pattern = '🧊 VCP ICEBERG';
      recommendation = '🚀 BUY - Strong accumulation!';
    } else if (isVCP) {
      pattern = '📉 VCP BASE';
      recommendation = '⏳ WATCH - Wait for dry up or breakout';
    } else if (isDryUp) {
      pattern = '🥷 DRY UP';
      recommendation = '📍 ENTRY - Support test';
    } else if (isIceberg) {
      pattern = '🧊 ICEBERG';
      recommendation = '👀 WATCH - Hidden accumulation';
    } else if (vpcScore > 55) {
      pattern = '📈 BUILDING SETUP';
      recommendation = '⏳ MONITOR - Developing pattern';
    }

    return {
      symbol: symbol.replace('.JK', ''),
      price: quoteData.regularMarketPrice || 0,
      change: quoteData.regularMarketChange || 0,
      changePercent: quoteData.regularMarketChangePercent || 0,
      volume: quoteData.regularMarketVolume || 0,
      vpcScore,
      isVCP,
      isDryUp,
      isIceberg,
      isSniperEntry,
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

    // Group by pattern
    const grouped = {
      sniperEntry: candidates.filter(c => c.pattern.includes('Sniper')).slice(0, Math.ceil(limit / 3)),
      vcp: candidates.filter(c => c.pattern.includes('VCP') && !c.pattern.includes('Sniper')).slice(0, Math.ceil(limit / 3)),
      dryUp: candidates.filter(c => c.pattern.includes('DRY UP')).slice(0, Math.ceil(limit / 3))
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

