/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { HandballMatch } from '../types/scout';
import {
  calculateGoalkeeperStats,
  calculateFieldPlayerStats,
  calculateTeamTotals,
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

export function generateScoutReportPdf(
  match: HandballMatch,
  categoryName: string,
  locale: Locale = 'it'
): void {
  const t = locale === 'en' ? enTranslations : itTranslations;

  // A4 Landscape: 297mm x 210mm
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const navyColor = [0, 0, 139] as [number, number, number]; // #00008B

  // Raccogli atleti divisi per ruolo
  const statsList = Object.values(match.stats);
  const goalkeepers = statsList.filter((s) => s.role === 'PORTIERE');
  const fieldPlayers = statsList.filter((s) => s.role === 'GIOCATORE');

  // Ordina per numero di maglia
  goalkeepers.sort((a, b) => a.playerNumber - b.playerNumber);
  fieldPlayers.sort((a, b) => a.playerNumber - b.playerNumber);

  const teamTotals = calculateTeamTotals(match.stats);

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

  // Genera prima pagina con testata
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

    // Testo Intestazione
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(t.pdfReport.reportTitle, 14, 12);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `${t.pdfReport.matchLabel}: ${match.homeTeam} vs ${match.guestTeam}  |  ${t.pdfReport.scoreLabel}: ${match.scoreHome} - ${match.scoreGuest}`,
      14,
      19
    );
    doc.text(
      `${t.pdfReport.categoryLabel}: ${categoryName}  |  ${t.pdfReport.dateLabel}: ${match.date}  |  ${t.pdfReport.venueLabel}: ${match.location || 'N/D'}`,
      14,
      25
    );

    // Box Punteggio a destra
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(pageWidth - 45, 6, 32, 17, 2, 2, 'F');
    doc.setTextColor(0, 0, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`${match.scoreHome} - ${match.scoreGuest}`, pageWidth - 29, 17, { align: 'center' });
  };

  // Costruisci le tabelle con autoTable
  let currentY = 36;

  // 1. Tabella Giocatori
  doc.setTextColor(0, 0, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(t.pdfReport.fieldPlayersTitle, 14, currentY);
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
      fontSize: 8,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [20, 20, 20],
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 42, halign: 'left', fontStyle: 'bold' },
      7: { cellWidth: 16, halign: 'center', fontStyle: 'bold', textColor: [0, 0, 139] },
      8: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      12: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: () => {
      drawPageHeader();
    },
  });

  // Nuova posizione Y
  const finalFieldY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : currentY + 40;

  if (finalFieldY > pageHeight - 50) {
    doc.addPage();
    currentY = 36;
  } else {
    currentY = finalFieldY;
  }

  // 2. Tabella Portieri
  doc.setTextColor(0, 0, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(t.pdfReport.goalkeepersTitle, 14, currentY);
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
      fillColor: [0, 0, 139],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [20, 20, 20],
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 42, halign: 'left', fontStyle: 'bold' },
      6: { cellWidth: 20, halign: 'center', fontStyle: 'bold', textColor: [0, 128, 0] },
      8: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      11: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: () => {
      drawPageHeader();
    },
  });

  // Box Sintesi Tecnica Squadra e Note Incontro
  const finalGkY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 5 : currentY + 30;
  if (finalGkY <= pageHeight - 26) {
    doc.setFillColor(242, 242, 242);
    doc.roundedRect(14, finalGkY, pageWidth - 28, 13, 1.5, 1.5, 'F');
    doc.setTextColor(0, 0, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const summaryText = `${t.pdfReport.summaryTitle}: ${t.pdfReport.totalGoals}: ${teamTotals.golTotaliSquadra} | ${t.pdfReport.totalShots}: ${teamTotals.tiriTotaliSquadra} (${teamTotals.percentualeRealizzazioneSquadra}%) | ${t.pdfReport.assist}: ${teamTotals.assistTotali} | ${t.pdfReport.turnovers}: ${teamTotals.pallePerseTotali} | ${t.pdfReport.gkSaves}: ${teamTotals.parateTotaliPortieri} (${teamTotals.percentualeParatePortieri}%)`;
    doc.text(summaryText, 18, finalGkY + 5);

    if (match.notes && match.notes.trim()) {
      doc.setTextColor(70, 70, 70);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`${t.pdfReport.matchNotesLabel}: ${match.notes.trim().slice(0, 140)}`, 18, finalGkY + 9.5);
    }
  }

  // Aggiungi piè di pagina con numero pagine
  const totalPages = doc.getNumberOfPages();
  const dateStr = new Date().toLocaleDateString(locale === 'it' ? 'it-IT' : 'en-US');
  const timeStr = new Date().toLocaleTimeString(locale === 'it' ? 'it-IT' : 'en-US');

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    const footerText = `${t.pdfReport.rightsFooter} | ${t.pdfReport.generatedOn}: ${dateStr} ${timeStr}`;
    doc.text(footerText, 14, pageHeight - 7);
    doc.text(`${t.pdfReport.pageLabel} ${i} ${t.pdfReport.ofLabel} ${totalPages}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
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
