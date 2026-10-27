/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { HandballMatch, ClubInfo, OfficialLetter, Category, ActionLogEntry } from '../types/scout';
import {
  calculateGoalkeeperStats,
  calculateFieldPlayerStats,
  calculateTeamTotals,
  getMatchOfficials,
  getOurSide,
  getOpponentSide,
  getOurTeamName,
  getOpponentTeamName,
  calculateScoreFromMatch,
  getScoreDeltas,
  getPeriodsCount,
  calculatePeriodScores,
  calculateUnder14Points,
  isUnder14Category,
} from './stats';
import { Locale } from '../i18n/types';
import { itTranslations } from '../i18n/it';
import { enTranslations } from '../i18n/en';

// Normalizzazione sicura del nome file (mantiene lettere e accenti puliti)
export function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_');
}

/**
 * Normalizza il testo rimuovendo caratteri non standard o accenti che corrompono il font standard di jsPDF
 */
export function cleanPdfText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
}

interface AutoTableDoc extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}

export function generateScoutReportPdf(
  match: HandballMatch,
  categoryName: string,
  locale: Locale = 'it',
  clubInfo?: ClubInfo,
  category?: Category | null
): void {
  const t = locale === 'en' ? enTranslations : itTranslations;

  // A4 Landscape: 297mm x 210mm
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Margini e dimensioni di pagina (A4 Landscape: 297mm x 210mm)
  const pageWidth = 297;
  const pageHeight = 210;
  const marginLeft = 14;
  const marginRight = 14;
  const marginTop = 34;
  const marginBottom = 12;
  const contentWidth = pageWidth - marginLeft - marginRight; // 269mm

  const navyColor = [0, 0, 139] as [number, number, number]; // #00008B
  const altRowColor = [248, 249, 252] as [number, number, number];

  const ourSide = getOurSide(match);
  const opponentSide = getOpponentSide(match);
  const ourTeamName = cleanPdfText(getOurTeamName(match, clubInfo));
  const opponentTeamName = cleanPdfText(getOpponentTeamName(match));
  const cleanCategoryName = cleanPdfText(categoryName);

  const calculatedScores = calculateScoreFromMatch(match);
  const displayScoreHome = calculatedScores.home;
  const displayScoreGuest = calculatedScores.guest;
  const goalsScored = ourSide === 'HOME' ? calculatedScores.home : calculatedScores.guest;
  const goalsConceded = ourSide === 'HOME' ? calculatedScores.guest : calculatedScores.home;

  const numPeriods = getPeriodsCount(categoryName, category);
  const periodScores = calculatePeriodScores(match, category, categoryName);
  const u14Breakdown = calculateUnder14Points(match, category, categoryName);

  // Raccogli atleti divisi per ruolo
  const statsList = Object.values(match.stats || {});
  const goalkeepers = statsList.filter((s) => s.role === 'PORTIERE');
  const fieldPlayers = statsList.filter((s) => s.role === 'GIOCATORE');

  // Ordina per numero di maglia
  goalkeepers.sort((a, b) => a.playerNumber - b.playerNumber);
  fieldPlayers.sort((a, b) => a.playerNumber - b.playerNumber);

  const teamTotals = calculateTeamTotals(match.stats || {});

  // Tabella Giocatori di Movimento
  const fieldRows = fieldPlayers.map((p) => {
    const calc = calculateFieldPlayerStats(p.field, p.sanctions);
    const sanctionsStr = [
      calcSanctions(p.sanctions.giallo, 'G'),
      calcSanctions(p.sanctions.dueMinuti, "2'"),
      calcSanctions(p.sanctions.rosso, 'R'),
      calcSanctions(p.sanctions.blu, 'B'),
    ].filter(Boolean).join(' ');

    return [
      `#${p.playerNumber}`,
      p.playerName,
      calc.golAzione,
      calc.tiriFuori,
      calc.rigoriGol,
      calc.rigoriPersi,
      calc.tiriTotali,
      calc.golTotali,
      `${calc.percentualeRealizzazione}%`,
      calc.assist,
      calc.pallePerseTotali,
      sanctionsStr || '-',
      calc.totaleAzioni,
    ];
  });

  // Riga totale squadra per i giocatori di movimento
  if (fieldRows.length > 0) {
    const teamSanctionsStr = [
      calcSanctions(teamTotals.sanzioniSquadra.giallo, 'G'),
      calcSanctions(teamTotals.sanzioniSquadra.dueMinuti, "2'"),
      calcSanctions(teamTotals.sanzioniSquadra.rosso, 'R'),
      calcSanctions(teamTotals.sanzioniSquadra.blu, 'B'),
    ].filter(Boolean).join(' ');

    fieldRows.push([
      'TOT',
      t.pdfReport.teamTotal,
      '-',
      '-',
      '-',
      '-',
      teamTotals.tiriTotaliSquadra,
      teamTotals.golTotaliSquadra,
      `${teamTotals.percentualeRealizzazioneSquadra}%`,
      teamTotals.assistTotali,
      teamTotals.pallePerseTotali,
      teamSanctionsStr || '-',
      '-',
    ]);
  }

  // Tabella Portieri
  const gkRows = goalkeepers.map((gk) => {
    const calc = calculateGoalkeeperStats(gk.goalkeeper, gk.sanctions);
    const sanctionsStr = [
      calcSanctions(gk.sanctions.giallo, 'G'),
      calcSanctions(gk.sanctions.dueMinuti, "2'"),
      calcSanctions(gk.sanctions.rosso, 'R'),
      calcSanctions(gk.sanctions.blu, 'B'),
    ].filter(Boolean).join(' ');

    return [
      `#${gk.playerNumber}`,
      gk.playerName,
      calc.parateInGioco,
      calc.golSubitiInGioco,
      calc.rigoriParati,
      calc.rigoriSubiti,
      calc.parateTotali,
      calc.golSubitiTotali,
      `${calc.percentualeParateTotale}%`,
      `${calc.percentualeRigoriParati}%`,
      sanctionsStr || '-',
      calc.totaleAzioni,
    ];
  });

  // Genera testata di pagina
  const drawPageHeader = () => {
    // Sfondo Navy Intestazione
    doc.setFillColor(0, 0, 139);
    doc.rect(0, 0, pageWidth, 28, 'F');

    // Fascia tricolore alta 3mm sotto l'intestazione
    const segW = pageWidth / 3;
    doc.setFillColor(0, 140, 69); // #008C45 Verde
    doc.rect(0, 28, segW, 3, 'F');
    doc.setFillColor(244, 245, 240); // #F4F5F0 Bianco
    doc.rect(segW, 28, segW, 3, 'F');
    doc.setFillColor(205, 33, 42); // #CD212A Rosso
    doc.rect(segW * 2, 28, segW, 3, 'F');

    let textStartX = 14;

    // Render del Logo Società (se presente)
    if (clubInfo?.logoUrl) {
      try {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(12, 3.5, 21, 21, 2, 2, 'F');
        const imgFormat = clubInfo.logoUrl.includes('jpeg') || clubInfo.logoUrl.includes('jpg') ? 'JPEG' : 'PNG';
        doc.addImage(clubInfo.logoUrl, imgFormat, 13, 4.5, 19, 19);
        textStartX = 37;
      } catch (err) {
        console.warn('Impossibile renderizzare il logo nel PDF:', err);
        textStartX = 14;
      }
    }

    // Testo Intestazione
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');

    const homeLabel = `${t.common.home}: ${cleanPdfText(match.homeTeam)}` + (ourSide === 'HOME' ? ` ${t.pdfReport.ourClubMarker}` : '');
    const guestLabel = `${t.common.guest}: ${cleanPdfText(match.guestTeam)}` + (ourSide === 'GUEST' ? ` ${t.pdfReport.ourClubMarker}` : '');

    if (clubInfo?.name) {
      doc.setFontSize(11.5);
      const fighStr = clubInfo.codeFIGH ? ` (FIGH: ${cleanPdfText(clubInfo.codeFIGH)})` : '';
      doc.text(`${cleanPdfText(clubInfo.name).toUpperCase()}${fighStr}`, textStartX, 9.5);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `${t.pdfReport.reportTitle} — ${homeLabel} vs ${guestLabel}`,
        textStartX,
        16.5
      );
      const venueStr = cleanPdfText(match.location || clubInfo.gymnasium || 'N/D');
      doc.text(
        `${t.pdfReport.categoryLabel}: ${cleanCategoryName}  |  ${t.pdfReport.dateLabel}: ${match.date}  |  ${t.pdfReport.venueLabel}: ${venueStr}`,
        textStartX,
        23
      );
    } else {
      doc.setFontSize(14);
      doc.text(t.pdfReport.reportTitle, textStartX, 11);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `${homeLabel} vs ${guestLabel}`,
        textStartX,
        17.5
      );
      doc.text(
        `${t.pdfReport.categoryLabel}: ${cleanCategoryName}  |  ${t.pdfReport.dateLabel}: ${match.date}  |  ${t.pdfReport.venueLabel}: ${cleanPdfText(match.location || 'N/D')}`,
        textStartX,
        23.5
      );
    }

    // Box Punteggio a destra (CASA - OSPITE)
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(pageWidth - 50, 5, 36, 18, 2, 2, 'F');
    doc.setTextColor(0, 0, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`${displayScoreHome} - ${displayScoreGuest}`, pageWidth - 32, 13.5, { align: 'center' });
    
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    if (u14Breakdown.isUnder14) {
      doc.text(`Punti U14: ${u14Breakdown.totalMatchPoints.home}-${u14Breakdown.totalMatchPoints.guest}`, pageWidth - 32, 19, { align: 'center' });
    } else {
      doc.text(`${numPeriods} Tempi di Gioco`, pageWidth - 32, 19, { align: 'center' });
    }
  };

  // Funzione di utilità per disegnare titoli di sezione eleganti
  const drawSectionHeader = (title: string, yPos: number) => {
    doc.setFillColor(0, 0, 139);
    doc.rect(marginLeft, yPos - 3.5, 3, 5, 'F');
    doc.setTextColor(0, 0, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(title, marginLeft + 5, yPos);
  };

  let currentY = marginTop + 2;

  // 0. TABELLA RIPARTIZIONE TEMPI DI GIOCO
  drawSectionHeader(t.pdfReport.periodBreakdownTitle || 'RIPARTIZIONE GOL PER TEMPO DI GIOCO', currentY);
  currentY += 3.5;

  const periodHead = [
    t.pdfReport.colTeam,
    '1° Tempo',
    '2° Tempo',
    ...(numPeriods === 3 ? ['3° Tempo'] : []),
    'Totale Gol',
  ];

  const periodRows = [
    [
      cleanPdfText(match.homeTeam),
      `${periodScores[1].home}`,
      `${periodScores[2].home}`,
      ...(numPeriods === 3 ? [`${periodScores[3].home}`] : []),
      `${displayScoreHome}`,
    ],
    [
      cleanPdfText(match.guestTeam),
      `${periodScores[1].guest}`,
      `${periodScores[2].guest}`,
      ...(numPeriods === 3 ? [`${periodScores[3].guest}`] : []),
      `${displayScoreGuest}`,
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [periodHead],
    body: periodRows,
    theme: 'grid',
    headStyles: {
      fillColor: navyColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [20, 20, 20],
      halign: 'center',
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: altRowColor,
    },
    columnStyles: {
      0: { cellWidth: 100, halign: 'left', fontStyle: 'bold' },
    },
    margin: { top: marginTop, bottom: marginBottom, left: marginLeft, right: marginRight },
    didDrawPage: () => {
      drawPageHeader();
    },
  });

  let nextY = (doc as AutoTableDoc).lastAutoTable ? (doc as AutoTableDoc).lastAutoTable!.finalY + 6 : currentY + 20;

  // SEZIONE SPECIALE REGOLAMENTO UNDER 14
  if (u14Breakdown.isUnder14) {
    if (nextY + 18 > pageHeight - marginBottom - 20) {
      doc.addPage();
      nextY = marginTop + 2;
    }

    doc.setFillColor(245, 247, 255);
    doc.roundedRect(marginLeft, nextY, contentWidth, 16, 2, 2, 'F');
    doc.setDrawColor(0, 0, 139);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginLeft, nextY, contentWidth, 16, 2, 2, 'S');

    doc.setTextColor(0, 0, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(t.pdfReport.under14PdfSectionTitle || 'CALCOLO PUNTI INCONTRO UNDER 14 (REGOLAMENTO FIGH)', marginLeft + 4, nextY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(40, 40, 40);

    const t1PStr = `1°T: ${u14Breakdown.periodPoints[1].home} - ${u14Breakdown.periodPoints[1].guest}`;
    const t2PStr = `2°T: ${u14Breakdown.periodPoints[2].home} - ${u14Breakdown.periodPoints[2].guest}`;
    const t3PStr = `3°T: ${u14Breakdown.periodPoints[3].home} - ${u14Breakdown.periodPoints[3].guest}`;
    const sumPStr = `Tot. Tempi: ${u14Breakdown.totalPeriodPoints.home} - ${u14Breakdown.totalPeriodPoints.guest}`;
    const extraStr = `Extra Gol: ${u14Breakdown.extraPoints.home} - ${u14Breakdown.extraPoints.guest}`;

    doc.text(`${t1PStr}  |  ${t2PStr}  |  ${t3PStr}  |  ${sumPStr}  |  ${extraStr}`, marginLeft + 4, nextY + 9.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 139);
    doc.text(
      `PUNTI INCONTRO FINALI U14:  ${cleanPdfText(match.homeTeam)} ${u14Breakdown.totalMatchPoints.home}  —  ${u14Breakdown.totalMatchPoints.guest} ${cleanPdfText(match.guestTeam)}`,
      marginLeft + 4,
      nextY + 14
    );

    nextY += 21;
  }

  currentY = nextY;

  // 1. TABELLA GIOCATORI DI MOVIMENTO
  if (currentY + 25 > pageHeight - marginBottom - 20) {
    doc.addPage();
    currentY = marginTop + 2;
  }

  drawSectionHeader(t.pdfReport.fieldPlayersTitle, currentY);
  currentY += 4;

  autoTable(doc, {
    startY: currentY,
    head: [[
      t.pdfReport.colNo,
      t.pdfReport.colAthlete,
      t.pdfReport.colFieldGoals,
      t.pdfReport.colMissedShots,
      t.pdfReport.col7mGoals,
      t.pdfReport.col7mMissed,
      t.pdfReport.colTotalShots,
      t.pdfReport.colTotalGoals,
      t.pdfReport.colScorePercent,
      t.pdfReport.colAssist,
      t.pdfReport.colLostBalls,
      t.pdfReport.colSanctions,
      t.pdfReport.colTotalActions,
    ]],
    body: fieldRows.length > 0 ? fieldRows : [['-', t.pdfReport.noFieldPlayers, '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: {
      fillColor: navyColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [20, 20, 20],
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: altRowColor,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 55, halign: 'left', fontStyle: 'bold' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 16, halign: 'center' },
      5: { cellWidth: 16, halign: 'center' },
      6: { cellWidth: 18, halign: 'center' },
      7: { cellWidth: 18, halign: 'center', fontStyle: 'bold', textColor: [0, 0, 139] },
      8: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      9: { cellWidth: 16, halign: 'center' },
      10: { cellWidth: 18, halign: 'center' },
      11: { cellWidth: 22, halign: 'center' },
      12: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
    },
    margin: { top: marginTop, bottom: marginBottom, left: marginLeft, right: marginRight },
    didDrawPage: () => {
      drawPageHeader();
    },
  });

  const finalFieldY = (doc as AutoTableDoc).lastAutoTable ? (doc as AutoTableDoc).lastAutoTable!.finalY + 7 : currentY + 40;

  if (finalFieldY + 30 > pageHeight - marginBottom) {
    doc.addPage();
    currentY = marginTop + 2;
  } else {
    currentY = finalFieldY;
  }

  // 2. TABELLA PORTIERI
  drawSectionHeader(t.pdfReport.goalkeepersTitle, currentY);
  currentY += 4;

  autoTable(doc, {
    startY: currentY,
    head: [[
      t.pdfReport.colNo,
      t.pdfReport.colGoalkeeper,
      t.pdfReport.colSavesPlay,
      t.pdfReport.colConcededPlay,
      t.pdfReport.col7mSaves,
      t.pdfReport.col7mConceded,
      t.pdfReport.colTotalSaves,
      t.pdfReport.colTotalConceded,
      t.pdfReport.colSavePercent,
      t.pdfReport.col7mSavePercent,
      t.pdfReport.colSanctions,
      t.pdfReport.colTotalActions,
    ]],
    body: gkRows.length > 0 ? gkRows : [['-', t.pdfReport.noGoalkeepers, '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: {
      fillColor: navyColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [20, 20, 20],
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: altRowColor,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 65, halign: 'left', fontStyle: 'bold' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 20, halign: 'center', fontStyle: 'bold', textColor: [0, 128, 0] },
      7: { cellWidth: 20, halign: 'center' },
      8: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      9: { cellWidth: 20, halign: 'center' },
      10: { cellWidth: 22, halign: 'center' },
      11: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
    },
    margin: { top: marginTop, bottom: marginBottom, left: marginLeft, right: marginRight },
    didParseCell: (data) => {
      if (data.section === 'body') {
        if ((data.column.index === 3 || data.column.index === 7) && Number(data.cell.raw) > 0) {
          data.cell.styles.textColor = [180, 0, 0];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    didDrawPage: () => {
      drawPageHeader();
    },
  });

  // 3. TABELLA UFFICIALI DI SQUADRA (Dirigenti Panchina A, B, C, D)
  const letters: OfficialLetter[] = ['A', 'B', 'C', 'D'];
  const officialsMap = getMatchOfficials(match, category);
  const officialRows = letters.map((letter) => {
    const off = officialsMap[letter];
    const s = off.sanctions;
    return [
      `Dirigente ${letter}`,
      off.name || '-',
      s.giallo > 0 ? (s.giallo > 1 ? `Gx${s.giallo}` : 'G') : '-',
      s.dueMinuti > 0 ? (s.dueMinuti > 1 ? `2'x${s.dueMinuti}` : "2'") : '-',
      s.rosso > 0 ? (s.rosso > 1 ? `Rx${s.rosso}` : 'R') : '-',
      s.blu > 0 ? (s.blu > 1 ? `Bx${s.blu}` : 'B') : '-',
    ];
  });

  const finalGkY = (doc as AutoTableDoc).lastAutoTable ? (doc as AutoTableDoc).lastAutoTable!.finalY + 7 : currentY + 30;
  if (finalGkY + 35 > pageHeight - marginBottom) {
    doc.addPage();
    currentY = marginTop + 2;
  } else {
    currentY = finalGkY;
  }

  drawSectionHeader(t.pdfReport.officialsSectionTitle, currentY);
  currentY += 4;

  autoTable(doc, {
    startY: currentY,
    head: [[
      t.pdfReport.colOfficialLetter,
      t.pdfReport.colOfficialName,
      t.pdfReport.colOfficialYellow,
      t.pdfReport.colOfficialTwoMin,
      t.pdfReport.colOfficialRed,
      t.pdfReport.colOfficialBlue,
    ]],
    body: officialRows,
    theme: 'grid',
    headStyles: {
      fillColor: navyColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [20, 20, 20],
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: altRowColor,
    },
    columnStyles: {
      0: { cellWidth: 32, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 105, halign: 'left', fontStyle: 'bold' },
      2: { cellWidth: 33, halign: 'center' },
      3: { cellWidth: 33, halign: 'center' },
      4: { cellWidth: 33, halign: 'center' },
      5: { cellWidth: 33, halign: 'center' },
    },
    margin: { top: marginTop, bottom: marginBottom, left: marginLeft, right: marginRight },
    didDrawPage: () => {
      drawPageHeader();
    },
  });

  // 4. CRONOLOGIA GOL (Goal Timeline)
  const finalOffY = (doc as AutoTableDoc).lastAutoTable ? (doc as AutoTableDoc).lastAutoTable!.finalY + 7 : currentY + 30;
  if (finalOffY + 40 > pageHeight - marginBottom) {
    doc.addPage();
    currentY = marginTop + 2;
  } else {
    currentY = finalOffY;
  }

  drawSectionHeader(t.pdfReport.goalTimelineTitle || 'CRONOLOGIA GOL', currentY);
  currentY += 4;

  // Elabora cronologia gol filtrando e compensando eventuali OPPONENT_GOAL_UNDO
  interface TimelineItem {
    prog: number;
    timeStr: string;
    periodStr: string;
    teamName: string;
    eventLabel: string;
    typeLabel: string;
    scoreStr: string;
    isOpponentGoal: boolean;
  }

  const timelineItems: TimelineItem[] = [];
  let runningHomeScore = 0;
  let runningGuestScore = 0;

  if (match.actionLog && match.actionLog.length > 0) {
    const effectiveLogs: ActionLogEntry[] = [];
    match.actionLog.forEach((entry) => {
      if (entry.actionType === 'OPPONENT_GOAL_UNDO') {
        for (let i = effectiveLogs.length - 1; i >= 0; i--) {
          const prev = effectiveLogs[i];
          if (
            prev.actionType === 'OPPONENT_GOAL' ||
            prev.actionType === 'GK_GOL_SUBITO' ||
            prev.actionType === 'GK_7M_SUBITO'
          ) {
            effectiveLogs.splice(i, 1);
            break;
          }
        }
      } else if (
        entry.actionType === 'FP_GOL' ||
        entry.actionType === 'FP_7M_GOL' ||
        entry.actionType === 'OPPONENT_GOAL' ||
        entry.actionType === 'GK_GOL_SUBITO' ||
        entry.actionType === 'GK_7M_SUBITO'
      ) {
        effectiveLogs.push(entry);
      }
    });

    let progressiveCount = 1;
    effectiveLogs.forEach((entry) => {
      const isOurs = entry.actionType === 'FP_GOL' || entry.actionType === 'FP_7M_GOL';
      const isOpp = entry.actionType === 'OPPONENT_GOAL' || entry.actionType === 'GK_GOL_SUBITO' || entry.actionType === 'GK_7M_SUBITO';
      const periodLabel = `${entry.period || 1}°T`;

      if (isOurs) {
        const deltas = getScoreDeltas(match, 'OURS');
        runningHomeScore += deltas.home;
        runningGuestScore += deltas.guest;

        const teamLabel = ourSide === 'HOME' ? `CASA (${ourTeamName})` : `OSPITE (${ourTeamName})`;
        const athleteStr = entry.playerName ? `#${entry.playerNumber || ''} ${entry.playerName}` : ourTeamName;
        const typeStr = entry.actionType === 'FP_7M_GOL' ? '7m Gol' : 'Gol Azione';

        timelineItems.push({
          prog: progressiveCount++,
          timeStr: new Date(entry.timestamp).toLocaleTimeString(locale === 'it' ? 'it-IT' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          periodStr: periodLabel,
          teamName: teamLabel,
          eventLabel: athleteStr,
          typeLabel: typeStr,
          scoreStr: `${runningHomeScore} - ${runningGuestScore}`,
          isOpponentGoal: false,
        });
      } else if (isOpp) {
        const deltas = getScoreDeltas(match, 'OPPONENT');
        runningHomeScore += deltas.home;
        runningGuestScore += deltas.guest;

        const teamLabel = opponentSide === 'HOME' ? `CASA (${opponentTeamName})` : `OSPITE (${opponentTeamName})`;
        const gkStr = entry.playerName ? `Portiere #${entry.playerNumber || ''} ${entry.playerName}` : opponentTeamName;

        timelineItems.push({
          prog: progressiveCount++,
          timeStr: new Date(entry.timestamp).toLocaleTimeString(locale === 'it' ? 'it-IT' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          periodStr: periodLabel,
          teamName: teamLabel,
          eventLabel: gkStr,
          typeLabel: t.pdfReport.goalConceded || 'GOL SUBITO',
          scoreStr: `${runningHomeScore} - ${runningGuestScore}`,
          isOpponentGoal: true,
        });
      }
    });
  }

  const timelineRows = timelineItems.map((item) => [
    `#${item.prog}`,
    item.timeStr,
    item.periodStr,
    item.teamName,
    item.eventLabel,
    item.typeLabel,
    item.scoreStr,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [[
      t.pdfReport.colProgressive || 'N°',
      t.pdfReport.colTime || 'Ora',
      t.pdfReport.colPeriod || 'Tempo',
      t.pdfReport.colTeam || 'Squadra',
      t.pdfReport.colEvent || 'Marcatore / Evento',
      t.pdfReport.colType || 'Tipo',
      t.pdfReport.colScoreAfter || 'Punteggio',
    ]],
    body: timelineRows.length > 0 ? timelineRows : [['-', '-', '-', '-', t.pdfReport.timelineNotAvailable || 'Cronologia non disponibile', '-', '-']],
    theme: 'grid',
    headStyles: {
      fillColor: navyColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [20, 20, 20],
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: altRowColor,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 65, halign: 'left', fontStyle: 'bold' },
      4: { cellWidth: 80, halign: 'left' },
      5: { cellWidth: 36, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: 36, halign: 'center', fontStyle: 'bold' },
    },
    margin: { top: marginTop, bottom: marginBottom, left: marginLeft, right: marginRight },
    didParseCell: (data) => {
      if (data.section === 'body' && timelineItems[data.row.index]?.isOpponentGoal) {
        data.cell.styles.fillColor = [255, 235, 235];
        data.cell.styles.textColor = [180, 0, 0];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    didDrawPage: () => {
      drawPageHeader();
    },
  });

  // 5. BOX "RIEPILOGO GOL" SOTTO LA CRONOLOGIA
  const finalTimelineY = (doc as AutoTableDoc).lastAutoTable ? (doc as AutoTableDoc).lastAutoTable!.finalY + 6 : currentY + 25;
  let summaryY = finalTimelineY;

  if (summaryY + 18 > pageHeight - marginBottom) {
    doc.addPage();
    summaryY = marginTop + 2;
  }

  const goalDiff = goalsScored - goalsConceded;
  const goalDiffStr = goalDiff > 0 ? `+${goalDiff}` : `${goalDiff}`;

  doc.setFillColor(245, 247, 250);
  doc.roundedRect(marginLeft, summaryY, contentWidth, 14, 2, 2, 'F');
  doc.setDrawColor(0, 0, 139);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginLeft, summaryY, contentWidth, 14, 2, 2, 'S');

  doc.setTextColor(0, 0, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(t.pdfReport.goalSummaryTitle || 'RIEPILOGO GOL', marginLeft + 4, summaryY + 5);

  const colWidthQ = contentWidth / 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);
  const sumTextOurs = `${t.pdfReport.goalsScored || 'Gol fatti'}: ${goalsScored}`;
  doc.text(sumTextOurs, marginLeft + 4, summaryY + 10.5);

  doc.setTextColor(180, 0, 0);
  doc.setFont('helvetica', 'bold');
  const sumTextOpp = `${t.pdfReport.goalsConceded || 'Gol subiti'}: ${goalsConceded}`;
  doc.text(sumTextOpp, marginLeft + colWidthQ, summaryY + 10.5);

  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'normal');
  const sumTextDiff = `${t.pdfReport.goalDifference || 'Differenza reti'}: ${goalDiffStr}`;
  doc.text(sumTextDiff, marginLeft + colWidthQ * 2, summaryY + 10.5);

  doc.setTextColor(0, 0, 139);
  doc.setFont('helvetica', 'bold');
  const sumTextFinal = `${t.pdfReport.finalResult || 'Risultato finale'}: ${displayScoreHome} - ${displayScoreGuest}`;
  doc.text(sumTextFinal, marginLeft + colWidthQ * 3, summaryY + 10.5);

  // 6. BOX SINTESI TECNICA PRESTAZIONE DI SQUADRA & NOTE
  let notesY = summaryY + 18;
  const safeNotesText = match.notes && match.notes.trim() ? cleanPdfText(match.notes.trim()) : '';
  const splitNotesLines = safeNotesText ? doc.splitTextToSize(`${t.pdfReport.matchNotesLabel}: ${safeNotesText}`, contentWidth - 8) : [];
  const notesBoxHeight = 10 + (splitNotesLines.length > 0 ? splitNotesLines.length * 3.5 : 0);

  if (notesY + notesBoxHeight > pageHeight - marginBottom) {
    doc.addPage();
    notesY = marginTop + 2;
  }

  doc.setFillColor(242, 244, 248);
  doc.roundedRect(marginLeft, notesY, contentWidth, notesBoxHeight, 1.5, 1.5, 'F');
  doc.setTextColor(0, 0, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const summaryText = `${t.pdfReport.summaryTitle}: ${t.pdfReport.totalGoals}: ${teamTotals.golTotaliSquadra} | ${t.pdfReport.goalsConceded || 'Gol subiti'}: ${goalsConceded} | ${t.pdfReport.totalShots}: ${teamTotals.tiriTotaliSquadra} (${teamTotals.percentualeRealizzazioneSquadra}%) | ${t.pdfReport.assist}: ${teamTotals.assistTotali} | ${t.pdfReport.turnovers}: ${teamTotals.pallePerseTotali} | ${t.pdfReport.gkSaves}: ${teamTotals.parateTotaliPortieri} (${teamTotals.percentualeParatePortieri}%)`;
  doc.text(summaryText, marginLeft + 4, notesY + 5);

  if (splitNotesLines.length > 0) {
    doc.setTextColor(70, 70, 70);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(splitNotesLines, marginLeft + 4, notesY + 9.5);
  }

  // AGGIUNGI PIÈ DI PAGINA CON NUMERO PAGINE SU OGNI PAGINA
  const totalPages = doc.getNumberOfPages();
  const dateStr = new Date().toLocaleDateString(locale === 'it' ? 'it-IT' : 'en-US');
  const timeStr = new Date().toLocaleTimeString(locale === 'it' ? 'it-IT' : 'en-US');

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    const clubFooter = clubInfo?.name ? `${cleanPdfText(clubInfo.name)} | ` : '';
    const footerText = `${clubFooter}${t.pdfReport.rightsFooter} | ${t.pdfReport.generatedOn}: ${dateStr} ${timeStr}`;
    doc.text(footerText, marginLeft, pageHeight - 6);
    doc.text(`${t.pdfReport.pageLabel} ${i} ${t.pdfReport.ofLabel} ${totalPages}`, pageWidth - marginRight, pageHeight - 6, { align: 'right' });
  }

  // Nome file normalizzato
  const safeHome = sanitizeFileName(match.homeTeam || 'Home');
  const safeGuest = sanitizeFileName(match.guestTeam || 'Away');
  const prefix = locale === 'it' ? 'Referto_Scout' : 'Scout_Report';
  const fileName = `${prefix}_${safeHome}_vs_${safeGuest}_${match.date}.pdf`;

  // Download del PDF
  doc.save(fileName);
}

function calcSanctions(count: number, label: string): string {
  if (!count || count <= 0) return '';
  return count > 1 ? `${label}x${count}` : label;
}
