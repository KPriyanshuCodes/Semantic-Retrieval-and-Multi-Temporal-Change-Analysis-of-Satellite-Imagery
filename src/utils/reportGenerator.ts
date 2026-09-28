import { jsPDF } from 'jspdf';
import { AnalysisResult } from '../types';

export function generateAnalysisPdf(analysis: AnalysisResult): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  // Colors
  const slate900 = [15, 23, 42] as const;
  const slate600 = [71, 85, 105] as const;
  const slate100 = [241, 245, 249] as const;
  const cyan700 = [14, 116, 144] as const;
  const red600 = [220, 38, 38] as const;

  // 1. Header Banner
  doc.setFillColor(...slate900);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('EARTH OBSERVATION CHANGE ANALYSIS REPORT', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Generated: ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC  |  Report ID: ${analysis.id}`,
    margin,
    20
  );

  y = 36;

  // 2. Section: Analysis Summary & Location
  doc.setTextColor(...slate900);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('1. Geographic & Observation Overview', margin, y);
  y += 6;

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(...slate100);
  doc.rect(margin, y, contentWidth, 34, 'FD');

  doc.setFontSize(9);
  const col1 = margin + 4;
  const col2 = margin + 95;

  doc.setFont('helvetica', 'bold');
  doc.text('Target Location:', col1, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(analysis.locationName || 'Selected Area of Interest', col1 + 30, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Analysis Period:', col1, y + 13);
  doc.setFont('helvetica', 'normal');
  doc.text(`${analysis.beforeScene.date} -> ${analysis.afterScene.date}`, col1 + 30, y + 13);

  doc.setFont('helvetica', 'bold');
  doc.text('Area of Interest (AOI):', col1, y + 20);
  doc.setFont('helvetica', 'normal');
  doc.text(`${analysis.metrics.totalAreaKm2.toLocaleString()} km²`, col1 + 38, y + 20);

  doc.setFont('helvetica', 'bold');
  doc.text('Analysis Theme:', col1, y + 27);
  doc.setFont('helvetica', 'normal');
  doc.text(`${analysis.analysisType.toUpperCase()} Change Detection`, col1 + 30, y + 27);

  // Column 2
  doc.setFont('helvetica', 'bold');
  doc.text('Satellite Sensor:', col2, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(analysis.afterScene.satellite || 'Sentinel-2', col2 + 30, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Data Collection:', col2, y + 13);
  doc.setFont('helvetica', 'normal');
  doc.text(analysis.afterScene.collection || 'sentinel-2-l2a', col2 + 30, y + 13);

  doc.setFont('helvetica', 'bold');
  doc.text('Data Source:', col2, y + 20);
  doc.setFont('helvetica', 'normal');
  doc.text('Copernicus Data Space Ecosystem', col2 + 25, y + 20);

  doc.setFont('helvetica', 'bold');
  doc.text('Data Status:', col2, y + 27);
  doc.setFont('helvetica', 'bold');
  if (analysis.metrics.isDemo) {
    doc.setTextColor(...red600);
    doc.text('DEMO DATASET (Not Live Catalog)', col2 + 25, y + 27);
  } else {
    doc.setTextColor(...cyan700);
    doc.text('LIVE SATELLITE OBSERVATIONS', col2 + 25, y + 27);
  }

  y += 42;

  // 3. Section: Quantitative Change Statistics
  doc.setTextColor(...slate900);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('2. Quantitative Change Statistics', margin, y);
  y += 6;

  // Statistics Table Header
  const tableX = margin;
  const colWidths = [50, 40, 44, 44];
  doc.setFillColor(...slate900);
  doc.rect(tableX, y, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');

  let curX = tableX + 3;
  doc.text('Metric Parameter', curX, y + 4.8);
  curX += colWidths[0];
  doc.text('Surface Area', curX, y + 4.8);
  curX += colWidths[1];
  doc.text('Percentage of AOI', curX, y + 4.8);
  curX += colWidths[2];
  doc.text('Spatial Classification', curX, y + 4.8);
  y += 7;

  // Table Rows
  const rows = [
    {
      label: 'Total Area Analyzed',
      area: `${analysis.metrics.totalAreaKm2.toLocaleString()} km²`,
      pct: '100.0%',
      desc: 'WGS84 Geodesic Footprint',
      bg: [255, 255, 255],
    },
    {
      label: 'Detected Changed Surface',
      area: `${analysis.metrics.changedAreaKm2.toLocaleString()} km²`,
      pct: `${analysis.metrics.changePercentage}%`,
      desc: 'Statistically Significant Shift',
      bg: [254, 242, 242],
    },
    {
      label: 'Unchanged / Stable Surface',
      area: `${analysis.metrics.stableAreaKm2.toLocaleString()} km²`,
      pct: `${(100 - analysis.metrics.changePercentage).toFixed(1)}%`,
      desc: 'Spectral Continuity',
      bg: [255, 255, 255],
    },
    {
      label:
        analysis.analysisType === 'urban'
          ? 'Built-up Expansion (Growth)'
          : analysis.analysisType === 'vegetation'
          ? 'Vegetation Regrowth (Gain)'
          : 'Positive Index Shift',
      area: `${analysis.metrics.increasedAreaKm2.toLocaleString()} km²`,
      pct: `${((analysis.metrics.increasedAreaKm2 / analysis.metrics.totalAreaKm2) * 100).toFixed(1)}%`,
      desc: 'Expansion / Positive Spectral Shift',
      bg: [248, 250, 252],
    },
    {
      label:
        analysis.analysisType === 'urban'
          ? 'Other Surface Fluctuation'
          : analysis.analysisType === 'vegetation'
          ? 'Vegetation Loss / Canopy Decrease'
          : 'Negative Index Shift',
      area: `${analysis.metrics.decreasedAreaKm2.toLocaleString()} km²`,
      pct: `${((analysis.metrics.decreasedAreaKm2 / analysis.metrics.totalAreaKm2) * 100).toFixed(1)}%`,
      desc: 'Clearing / Negative Spectral Shift',
      bg: [255, 255, 255],
    },
  ];

  doc.setFontSize(8);
  for (const r of rows) {
    doc.setFillColor(r.bg[0], r.bg[1], r.bg[2]);
    doc.rect(tableX, y, contentWidth, 7, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(tableX, y + 7, tableX + contentWidth, y + 7);

    doc.setTextColor(...slate900);
    doc.setFont('helvetica', 'bold');
    let xPos = tableX + 3;
    doc.text(r.label, xPos, y + 4.8);

    doc.setFont('helvetica', 'normal');
    xPos += colWidths[0];
    doc.text(r.area, xPos, y + 4.8);

    xPos += colWidths[1];
    doc.text(r.pct, xPos, y + 4.8);

    xPos += colWidths[2];
    doc.text(r.desc, xPos, y + 4.8);

    y += 7;
  }

  y += 6;

  // 4. Section: Satellite Metadata & Quality
  doc.setTextColor(...slate900);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('3. Observation Catalog Metadata & Quality Assessment', margin, y);
  y += 6;

  doc.setFillColor(...slate100);
  doc.rect(margin, y, contentWidth, 38, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(...slate900);

  // Baseline Scene
  doc.setFont('helvetica', 'bold');
  doc.text('Baseline Observation (T1):', margin + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${analysis.beforeScene.date}`, margin + 50, y + 6);
  doc.text(`Cloud Cover: ${analysis.beforeScene.cloudCover}%`, margin + 85, y + 6);
  doc.text(`Platform: ${analysis.beforeScene.satellite}`, margin + 125, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Product ID:', margin + 4, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(analysis.beforeScene.id || 'N/A', margin + 25, y + 12);
  doc.setFontSize(8.5);

  // After Scene
  doc.setFont('helvetica', 'bold');
  doc.text('Comparison Observation (T2):', margin + 4, y + 19);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${analysis.afterScene.date}`, margin + 50, y + 19);
  doc.text(`Cloud Cover: ${analysis.afterScene.cloudCover}%`, margin + 85, y + 19);
  doc.text(`Platform: ${analysis.afterScene.satellite}`, margin + 125, y + 19);

  doc.setFont('helvetica', 'bold');
  doc.text('Product ID:', margin + 4, y + 25);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(analysis.afterScene.id || 'N/A', margin + 25, y + 25);
  doc.setFontSize(8.5);

  // Quality metrics
  doc.setFont('helvetica', 'bold');
  doc.text(
    `Spatial Scene Overlap: ${analysis.metrics.overlapPercentage}%  |  Quality Score: ${analysis.metrics.confidenceScore}/100`,
    margin + 4,
    y + 33
  );

  y += 44;

  // 5. Section: Analysis Explanation & Pipeline
  doc.setTextColor(...slate900);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('4. Processing Methodology & Spectral Formulation', margin, y);
  y += 6;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Processing Pipeline:', margin, y);
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slate600);
  doc.text(
    'Sentinel-2 L2A STAC Retrieval -> Surface Reflectance Calibration (BOA) -> Geographic WGS84 Co-Registration -> Spectral Index Differencing -> Grid Statistical Derivation',
    margin,
    y
  );
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...slate900);
  doc.text('Detection Algorithm:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(analysis.metrics.method, margin + 35, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.text('Spectral Difference Formula:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(analysis.metrics.indexUsed, margin + 48, y);
  y += 8;

  // 6. Section: Scientific Limitations & Cadastral Notice
  doc.setTextColor(...slate900);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('5. Scientific Limitations & Data Disclaimer', margin, y);
  y += 5;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slate600);

  const limitations = [
    '• Resolution Constraint: Sentinel-2 Level-2A imagery operates at 10m to 20m spatial resolution. Small-scale features (<10m) cannot be individually resolved.',
    '• Atmospheric & Cloud Screening: Cloud-covered or shaded pixels are excluded from valid spectral calculations to prevent false positive classifications.',
    '• Phenological & Seasonal Influences: Solar zenith variations and agricultural phenology cycles can induce spectral shifts between different months.',
    '• Decision Support Only: Change metrics represent algorithmic approximations for planning and research; not intended for legal property dispute arbitration.',
  ];

  for (const line of limitations) {
    doc.text(line, margin, y);
    y += 4;
  }

  y += 4;

  // 7. Footer Attribution
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, margin + contentWidth, y);
  y += 4;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slate600);
  doc.text(
    'Satellite Data: Copernicus Data Space Ecosystem (Sentinel-2 L2A)  |  Base Cartography: OpenStreetMap & Esri  |  GeoSemantic Engine v1.0.0',
    margin,
    y
  );

  // Save PDF
  const filename = `Change_Analysis_${(analysis.locationName || 'Region').replace(/[^a-zA-Z0-9]/g, '_')}_${analysis.id}.pdf`;
  doc.save(filename);
}

export function generateAnalysisCsv(analysis: AnalysisResult): void {
  const headers = [
    'Analysis_ID',
    'Created_At',
    'Location_Name',
    'Analysis_Type',
    'Before_Date',
    'Before_Satellite',
    'Before_Cloud_Cover_Pct',
    'Before_Scene_ID',
    'After_Date',
    'After_Satellite',
    'After_Cloud_Cover_Pct',
    'After_Scene_ID',
    'Total_Area_Km2',
    'Changed_Area_Km2',
    'Change_Percentage',
    'Increased_Area_Km2',
    'Decreased_Area_Km2',
    'Stable_Area_Km2',
    'Overlap_Percentage',
    'Confidence_Score',
    'Detection_Method',
    'Index_Used',
    'Data_Source',
    'Is_Demo_Data',
  ];

  const values = [
    analysis.id,
    analysis.createdAt,
    `"${(analysis.locationName || '').replace(/"/g, '""')}"`,
    analysis.analysisType,
    analysis.beforeScene.date,
    analysis.beforeScene.satellite,
    analysis.beforeScene.cloudCover,
    `"${analysis.beforeScene.id}"`,
    analysis.afterScene.date,
    analysis.afterScene.satellite,
    analysis.afterScene.cloudCover,
    `"${analysis.afterScene.id}"`,
    analysis.metrics.totalAreaKm2,
    analysis.metrics.changedAreaKm2,
    analysis.metrics.changePercentage,
    analysis.metrics.increasedAreaKm2,
    analysis.metrics.decreasedAreaKm2,
    analysis.metrics.stableAreaKm2,
    analysis.metrics.overlapPercentage,
    analysis.metrics.confidenceScore,
    `"${analysis.metrics.method.replace(/"/g, '""')}"`,
    `"${analysis.metrics.indexUsed.replace(/"/g, '""')}"`,
    `"${analysis.metrics.dataSource.replace(/"/g, '""')}"`,
    analysis.metrics.isDemo ? 'true' : 'false',
  ];

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), values.join(',')].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute(
    'download',
    `Change_Analysis_${(analysis.locationName || 'Region').replace(/[^a-zA-Z0-9]/g, '_')}_${analysis.id}.csv`
  );
  document.body.appendChild(link);
  link.click();
  link.remove();
}
