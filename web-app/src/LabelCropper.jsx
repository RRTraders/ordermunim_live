import React, { useState, useRef } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import { 
  FileText, 
  CheckCircle2, 
  Copy, 
  AlertTriangle, 
  UploadCloud, 
  ChevronUp, 
  ChevronDown, 
  Scissors, 
  FileCheck, 
  Clock, 
  FileCode, 
  FilePlus, 
  Package, 
  Truck, 
  Boxes, 
  Download, 
  Printer, 
  Eye, 
  Trash2, 
  Plus, 
  RefreshCw, 
  Store,
  Layers,
  Sparkles,
  Check
} from 'lucide-react';

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export default function LabelCropper({ showToast }) {
  // Collapsible cards state
  const [reportOpen, setReportOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(true);

  // Files state
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  // Processing Report Metrics
  const [metrics, setMetrics] = useState({
    totalLabels: 0,
    success: 0,
    duplicates: 0,
    ocrFailed: 0,
  });

  // Extracted data details
  const [parsedLabels, setParsedLabels] = useState([]);
  const [duplicateList, setDuplicateList] = useState([]);
  const [skuSummary, setSkuSummary] = useState({});
  const [courierSummary, setCourierSummary] = useState({});

  // Generated outputs
  const [downloadReady, setDownloadReady] = useState(null); // { type: 'single' | 'zip', url, filename, blob }
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showSkuModal, setShowSkuModal] = useState(false);

  // Settings State (matching screenshot precisely)
  const [labelAction, setLabelAction] = useState('crop'); // 'crop' | 'keep_invoice'
  const [printDateTime, setPrintDateTime] = useState(true);
  const [printPageNumber, setPrintPageNumber] = useState(true);
  const [addPackingSlip, setAddPackingSlip] = useState(true);

  // Sort By options (matching screenshot)
  const [sortSku, setSortSku] = useState(true);
  const [sortCourier, setSortCourier] = useState(false);
  const [sortQuantity, setSortQuantity] = useState(false);

  // Output File Type options (matching screenshot)
  const [outputType, setOutputType] = useState('single'); // 'single' | 'courier' | 'quantity' | 'store'

  const fileInputRef = useRef(null);

  // Handle uploaded files
  const handleFiles = (selectedFiles) => {
    const valid = Array.from(selectedFiles).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (valid.length === 0) {
      if (showToast) showToast('Please select valid PDF files', 'error');
      return;
    }
    setFiles(prev => [...prev, ...valid]);
    setDownloadReady(null);
  };

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setDownloadReady(null);
  };

  const clearAllFiles = () => {
    setFiles([]);
    setDownloadReady(null);
    setMetrics({ totalLabels: 0, success: 0, duplicates: 0, ocrFailed: 0 });
    setParsedLabels([]);
    setDuplicateList([]);
    setSkuSummary({});
    setCourierSummary({});
  };

  // Helper to extract text and details from a PDF page
  const extractLabelData = async (pdfDoc, pageNum) => {
    try {
      const page = await pdfDoc.getPage(pageNum);
      const content = await page.getTextContent();
      const rawText = content.items.map(it => it.str).join(' ');

      // 1. Detect Courier
      let courier = 'Unknown';
      const courierRegexes = [
        { name: 'Valmo', rx: /\bvalmo\b/i },
        { name: 'Shadowfax', rx: /\bshadowfax\b/i },
        { name: 'Delhivery', rx: /\bdelhivery\b/i },
        { name: 'XpressBees', rx: /\bxpressbees\b/i },
        { name: 'Ecom Express', rx: /\becom\s*express\b/i },
        { name: 'DTDC', rx: /\bdtdc\b/i },
        { name: 'Blue Dart', rx: /\bblue\s*dart\b/i }
      ];
      for (const c of courierRegexes) {
        if (c.rx.test(rawText)) {
          courier = c.name;
          break;
        }
      }

      // 2. Detect AWB / Tracking number
      let awb = '';
      const awbMatch = rawText.match(/(?:AWB|Waybill|Tracking(?:\s*No)?|Airway\s*Bill)[\s:#-]*([A-Z0-9]{8,18})/i) ||
                       rawText.match(/\b([0-9]{10,14})\b/);
      if (awbMatch) awb = awbMatch[1];

      // 3. Detect SKU / Product Info
      let sku = 'General-Item';
      const skuMatch = rawText.match(/(?:SKU|Product|Item|Style)[\s:#-]*([A-Za-z0-9_\-\.\/\s]{3,35})/i) ||
                      rawText.match(/SKU\s*Name[\s:#-]*([^\n\r,]+)/i);
      if (skuMatch && skuMatch[1].trim().length > 2) {
        sku = skuMatch[1].trim().replace(/\s+/g, ' ').slice(0, 35);
      }

      // 4. Detect Quantity
      let quantity = 1;
      const qtyMatch = rawText.match(/(?:Qty|Quantity)[\s:#-]*([0-9]+)/i);
      if (qtyMatch) {
        quantity = parseInt(qtyMatch[1], 10) || 1;
      }

      // 5. Detect Store Name (if any)
      let storeName = 'Default Store';
      const storeMatch = rawText.match(/(?:Sold\s*by|Supplier|Seller)[\s:#-]*([A-Za-z0-9\s]{3,30})/i);
      if (storeMatch) storeName = storeMatch[1].trim();

      return {
        success: true,
        awb: awb || `LBL-${pageNum}`,
        courier,
        sku,
        quantity,
        storeName,
        rawText
      };
    } catch (err) {
      console.warn('Text extraction error on page', pageNum, err);
      return {
        success: false,
        awb: `ERR-${pageNum}`,
        courier: 'Unknown',
        sku: 'Unparsed-Item',
        quantity: 1,
        storeName: 'Default Store',
        rawText: ''
      };
    }
  };

  // Main Crop & Sort Execution
  const processCropAndSort = async () => {
    if (files.length === 0) {
      if (showToast) showToast('Please upload at least one PDF file', 'warning');
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(10);

    try {
      const allParsed = [];
      const seenAwbs = new Map();
      const duplicateItems = [];
      let ocrFailedCount = 0;

      // STEP 1: Parse and analyze all labels
      let fileIdx = 0;
      for (const file of files) {
        const arrayBuf = await file.arrayBuffer();
        const pdfJsDoc = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
        const totalPgs = pdfJsDoc.numPages;

        for (let p = 1; p <= totalPgs; p++) {
          const extracted = await extractLabelData(pdfJsDoc, p);
          if (!extracted.success) ocrFailedCount++;

          const isDuplicate = extracted.awb && seenAwbs.has(extracted.awb);
          if (isDuplicate) {
            duplicateItems.push({ ...extracted, file: file.name, page: p });
          } else if (extracted.awb) {
            seenAwbs.set(extracted.awb, true);
          }

          allParsed.push({
            ...extracted,
            fileIndex: fileIdx,
            pageIndex: p - 1, // 0-based
            sourceFile: file,
            isDuplicate
          });
        }
        fileIdx++;
      }

      setProcessingProgress(40);

      // Summaries
      const skuMap = {};
      const courierMap = {};
      allParsed.forEach(item => {
        skuMap[item.sku] = (skuMap[item.sku] || 0) + item.quantity;
        courierMap[item.courier] = (courierMap[item.courier] || 0) + 1;
      });

      setMetrics({
        totalLabels: allParsed.length,
        success: allParsed.length - ocrFailedCount,
        duplicates: duplicateItems.length,
        ocrFailed: ocrFailedCount
      });
      setDuplicateList(duplicateItems);
      setSkuSummary(skuMap);
      setCourierSummary(courierMap);
      setParsedLabels(allParsed);

      // STEP 2: Sort labels based on user settings
      let sortedLabels = [...allParsed];

      if (sortSku) {
        sortedLabels.sort((a, b) => a.sku.localeCompare(b.sku));
      } else if (sortCourier) {
        sortedLabels.sort((a, b) => a.courier.localeCompare(b.courier));
      } else if (sortQuantity) {
        sortedLabels.sort((a, b) => a.quantity - b.quantity);
      }

      setProcessingProgress(60);

      // Helper function to build a cropped PDF from an array of label items
      const buildPdf = async (items, title = 'Meesho Shipping Labels') => {
        const outDoc = await PDFDocument.create();
        const helveticaFont = await outDoc.embedFont(StandardFonts.Helvetica);
        const helveticaBold = await outDoc.embedFont(StandardFonts.HelveticaBold);

        // Pre-load source PDFDocuments
        const srcDocsCache = [];
        for (const file of files) {
          const bytes = await file.arrayBuffer();
          srcDocsCache.push(await PDFDocument.load(bytes));
        }

        // Standard 4x6 inch thermal page dimensions in points (288 x 432 pt)
        const THERMAL_W = 288;
        const THERMAL_H = 432;
        const totalItems = items.length;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          // Load fresh copy of source document page to avoid mutating shared cache
          const bytes = await item.sourceFile.arrayBuffer();
          const singleDoc = await PDFDocument.load(bytes);
          const srcPage = singleDoc.getPage(item.pageIndex);
          const { width: origW, height: origH } = srcPage.getSize();

          const targetPage = outDoc.addPage([THERMAL_W, THERMAL_H]);

          if (labelAction === 'crop') {
            // CROP LABEL MODE (Meesho standard: top ~50% is shipping label)
            const cropH = origH * 0.50;
            const cropY = origH - cropH;
            srcPage.setCropBox(0, cropY, origW, cropH);
            srcPage.setMediaBox(0, cropY, origW, cropH);

            const [embeddedPage] = await outDoc.embedPdf(singleDoc, [item.pageIndex]);

            // Scale to fit 4x6 with comfortable margins
            const scale = Math.min((THERMAL_W * 0.96) / origW, (THERMAL_H * 0.93) / cropH);
            const drawW = origW * scale;
            const drawH = cropH * scale;

            const offX = (THERMAL_W - drawW) / 2;
            const offY = (THERMAL_H - drawH) / 2;

            targetPage.drawPage(embeddedPage, {
              x: offX,
              y: offY,
              width: drawW,
              height: drawH
            });
          } else {
            // KEEP INVOICE / FULL PAGE MODE
            const [embeddedPage] = await outDoc.embedPdf(singleDoc, [item.pageIndex]);
            const scale = Math.min((THERMAL_W * 0.95) / origW, (THERMAL_H * 0.95) / origH);
            const drawW = origW * scale;
            const drawH = origH * scale;

            targetPage.drawPage(embeddedPage, {
              x: (THERMAL_W - drawW) / 2,
              y: (THERMAL_H - drawH) / 2,
              width: drawW,
              height: drawH
            });
          }


          // Print Header / Footer options
          if (printDateTime) {
            const timeStr = new Date().toLocaleString('en-IN', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit', hour12: true
            });
            targetPage.drawText(`Printed: ${timeStr} | ${item.courier}`, {
              x: 8,
              y: THERMAL_H - 12,
              size: 6.5,
              font: helveticaFont,
              color: rgb(0.2, 0.2, 0.2)
            });
          }

          if (printPageNumber) {
            targetPage.drawText(`${i + 1} / ${totalItems}`, {
              x: THERMAL_W - 35,
              y: THERMAL_H - 12,
              size: 6.5,
              font: helveticaBold,
              color: rgb(0.1, 0.1, 0.1)
            });
          }
        }

        // Add Packing Slip Page In Last if enabled
        if (addPackingSlip) {
          const slipPage = outDoc.addPage([THERMAL_W, THERMAL_H]);
          slipPage.drawRectangle({
            x: 0, y: 0, width: THERMAL_W, height: THERMAL_H,
            color: rgb(0.98, 0.98, 0.99)
          });

          // Header
          slipPage.drawText('WAREHOUSE PACKING SLIP', {
            x: 12, y: THERMAL_H - 24, size: 11, font: helveticaBold, color: rgb(0.05, 0.1, 0.2)
          });
          slipPage.drawText(`Total Orders: ${totalItems} | Date: ${new Date().toLocaleDateString('en-IN')}`, {
            x: 12, y: THERMAL_H - 38, size: 7, font: helveticaFont, color: rgb(0.4, 0.4, 0.4)
          });

          slipPage.drawLine({
            start: { x: 12, y: THERMAL_H - 45 },
            end: { x: THERMAL_W - 12, y: THERMAL_H - 45 },
            thickness: 1, color: rgb(0.8, 0.8, 0.85)
          });

          // SKU Table
          slipPage.drawText('SKU / Product Description', {
            x: 12, y: THERMAL_H - 58, size: 8, font: helveticaBold, color: rgb(0.2, 0.2, 0.2)
          });
          slipPage.drawText('Qty', {
            x: THERMAL_W - 35, y: THERMAL_H - 58, size: 8, font: helveticaBold, color: rgb(0.2, 0.2, 0.2)
          });

          let rowY = THERMAL_H - 74;
          const sortedSkus = Object.entries(skuMap).sort((a, b) => b[1] - a[1]);

          for (const [skuName, qty] of sortedSkus) {
            if (rowY < 40) {
              slipPage.drawText('... (more items on next sheet)', { x: 12, y: 25, size: 7, font: helveticaFont, color: rgb(0.5, 0.5, 0.5) });
              break;
            }
            slipPage.drawText(skuName.slice(0, 36), {
              x: 12, y: rowY, size: 7.5, font: helveticaFont, color: rgb(0.1, 0.1, 0.1)
            });
            slipPage.drawText(String(qty), {
              x: THERMAL_W - 30, y: rowY, size: 8, font: helveticaBold, color: rgb(0.05, 0.4, 0.2)
            });
            rowY -= 14;
          }

          // Bottom Courier summary
          const courierStr = Object.entries(courierMap).map(([k, v]) => `${k}: ${v}`).join(' | ');
          slipPage.drawText(`Couriers: ${courierStr}`, {
            x: 12, y: 15, size: 6.5, font: helveticaFont, color: rgb(0.3, 0.3, 0.4)
          });
        }

        return await outDoc.save();
      };

      setProcessingProgress(80);

      // STEP 3: Handle Output File Type
      const dateTag = new Date().toISOString().slice(0, 10);

      if (outputType === 'single') {
        const finalPdfBytes = await buildPdf(sortedLabels, 'Meesho Shipping Labels');
        const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setDownloadReady({
          type: 'single',
          url,
          filename: `Meesho_Cropped_Labels_${dateTag}.pdf`,
          blob
        });
      } else if (outputType === 'courier') {
        // Group by courier
        const groups = {};
        sortedLabels.forEach(it => {
          if (!groups[it.courier]) groups[it.courier] = [];
          groups[it.courier].push(it);
        });

        const zip = new JSZip();
        for (const [cName, items] of Object.entries(groups)) {
          const cBytes = await buildPdf(items, `${cName} Shipping Labels`);
          zip.file(`Meesho_${cName}_${items.length}_Labels.pdf`, cBytes);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipUrl = URL.createObjectURL(zipBlob);
        setDownloadReady({
          type: 'zip',
          url: zipUrl,
          filename: `Meesho_Labels_By_Courier_${dateTag}.zip`,
          blob: zipBlob
        });
      } else if (outputType === 'quantity') {
        const singleQty = sortedLabels.filter(it => it.quantity === 1);
        const multiQty = sortedLabels.filter(it => it.quantity > 1);

        const zip = new JSZip();
        if (singleQty.length > 0) {
          const sBytes = await buildPdf(singleQty, 'Single Quantity Orders');
          zip.file(`Single_Item_Orders_${singleQty.length}.pdf`, sBytes);
        }
        if (multiQty.length > 0) {
          const mBytes = await buildPdf(multiQty, 'Multi Quantity Orders');
          zip.file(`Multi_Item_Orders_${multiQty.length}.pdf`, mBytes);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipUrl = URL.createObjectURL(zipBlob);
        setDownloadReady({
          type: 'zip',
          url: zipUrl,
          filename: `Meesho_Labels_By_Quantity_${dateTag}.zip`,
          blob: zipBlob
        });
      } else if (outputType === 'store') {
        const groups = {};
        sortedLabels.forEach(it => {
          const sName = it.storeName.replace(/[^a-zA-Z0-9_\-]/g, '_');
          if (!groups[sName]) groups[sName] = [];
          groups[sName].push(it);
        });

        const zip = new JSZip();
        for (const [sName, items] of Object.entries(groups)) {
          const sBytes = await buildPdf(items, `${sName} Labels`);
          zip.file(`Store_${sName}_${items.length}_Labels.pdf`, sBytes);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipUrl = URL.createObjectURL(zipBlob);
        setDownloadReady({
          type: 'zip',
          url: zipUrl,
          filename: `Meesho_Labels_By_Store_${dateTag}.zip`,
          blob: zipBlob
        });
      }

      setProcessingProgress(100);
      if (showToast) showToast(`Successfully processed ${allParsed.length} labels!`, 'success');
    } catch (err) {
      console.error(err);
      if (showToast) showToast(`Processing error: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDirectPrint = () => {
    if (!downloadReady?.url) return;
    const printWin = window.open(downloadReady.url);
    if (printWin) {
      printWin.onload = () => printWin.print();
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 p-4 md:p-8 font-sans -m-4 md:-m-6 rounded-3xl">
      {/* ================= HEADER SECTION ================= */}
      <div className="flex items-start justify-between pb-6 border-b border-slate-200 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Meesho Label Cropping and sorting tools
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-2xl">
            Crop, sort, and process your Meesho shipping labels automatically. Save time and reduce errors with powerful PDF tools.
          </p>
        </div>

        {/* Meesho Logo Badge matching image */}
        <div className="flex items-center gap-2">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-fuchsia-900 to-pink-900 flex flex-col items-center justify-center text-white shadow-md shadow-pink-950/20">
            <span className="font-extrabold text-base leading-none">m</span>
            <span className="text-[7.5px] font-semibold tracking-tighter opacity-90">meesho</span>
          </div>
        </div>
      </div>

      {/* ================= TOP PROCESSING REPORT CARD ================= */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm mb-6 overflow-hidden transition-all">
        <div 
          onClick={() => setReportOpen(!reportOpen)}
          className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 cursor-pointer hover:bg-slate-50/50 transition-colors"
        >
          <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
            {/* Bar chart red icon */}
            <svg className="w-4 h-4 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            Processing Report
          </div>
          <button type="button" className="text-slate-400 hover:text-slate-600 p-1">
            {reportOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {reportOpen && (
          <div className="p-4 md:p-5 grid grid-cols-2 md:grid-cols-4 gap-3.5">
            {/* Total Labels */}
            <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Total Labels</div>
                  <div className="text-lg font-bold text-blue-600 font-mono leading-tight">
                    {metrics.success} <span className="text-slate-400 text-xs font-normal">/ {metrics.totalLabels}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Success */}
            <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Success</div>
                  <div className="text-lg font-bold text-emerald-600 font-mono leading-tight">
                    {metrics.success}
                  </div>
                </div>
              </div>
              {parsedLabels.length > 0 && (
                <button 
                  type="button" 
                  onClick={() => setShowSkuModal(true)} 
                  title="View SKU Summary"
                  className="text-emerald-400 hover:text-emerald-700 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Duplicates */}
            <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <Copy className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Duplicates</div>
                  <div className="text-lg font-bold text-indigo-600 font-mono leading-tight">
                    {metrics.duplicates}
                  </div>
                </div>
              </div>
              {metrics.duplicates > 0 && (
                <button 
                  type="button" 
                  onClick={() => setShowDuplicateModal(true)}
                  title="View duplicate labels"
                  className="text-indigo-400 hover:text-indigo-700 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* OCR Failed */}
            <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">OCR Failed</div>
                  <div className="text-lg font-bold text-rose-600 font-mono leading-tight">
                    {metrics.ocrFailed}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= TWO COLUMN WORKSPACE ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ================= LEFT COLUMN: UPLOAD & ACTION ================= */}
        <div className="lg:col-span-8 space-y-5">
          {/* Upload Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-rose-200 bg-rose-50/20 hover:bg-rose-50/40 rounded-2xl p-7 text-center cursor-pointer transition-all flex flex-col items-center justify-center group"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/pdf"
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Upload PDF Files
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Drag & drop or click to select files
            </p>
          </div>

          {/* PDF Files Container Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                <FileText className="w-4 h-4 text-rose-500" />
                PDF Files {files.length > 0 && `(${files.length})`}
              </div>

              <div className="flex items-center gap-2">
                {files.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllFiles}
                    className="text-xs text-rose-500 hover:text-rose-700 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                  Select PDFs
                </button>
              </div>
            </div>

            {/* List / Empty view */}
            <div className="p-6">
              {files.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No PDF files selected.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {files.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex items-center gap-3 truncate max-w-[85%]">
                        <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-slate-800 truncate">{file.name}</span>
                        <span className="text-slate-400 shrink-0">({(file.size / 1024).toFixed(0)} KB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="text-slate-400 hover:text-rose-500 p-1 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Primary Action Button (Matching screenshot) */}
          <button
            type="button"
            disabled={files.length === 0 || isProcessing}
            onClick={processCropAndSort}
            className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Processing Labels ({processingProgress}%)...
              </>
            ) : (
              <>
                <Scissors className="w-4 h-4" />
                Start Crop & Sort Process
              </>
            )}
          </button>

          {/* Result / Download Area */}
          {downloadReady && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      Processing Complete!
                    </h4>
                    <p className="text-xs text-slate-500">
                      {metrics.success} labels ready • Sorted & Formatted for Thermal 4x6
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSkuModal(true)}
                    className="px-3 py-1.5 bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    View SKU Summary
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <a
                  href={downloadReady.url}
                  download={downloadReady.filename}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors text-center"
                >
                  <Download className="w-4 h-4" />
                  Download {downloadReady.type === 'zip' ? 'ZIP Archive' : 'Cropped PDF'}
                </a>

                {downloadReady.type === 'single' && (
                  <button
                    type="button"
                    onClick={handleDirectPrint}
                    className="px-5 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    Print Directly
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ================= RIGHT COLUMN: PROCESSING SETTINGS ================= */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
            {/* Header */}
            <div 
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 cursor-pointer hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Processing Settings
              </div>
              <button type="button" className="text-slate-400 hover:text-slate-600 p-1">
                {settingsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {settingsOpen && (
              <div className="p-5 space-y-5">
                
                {/* 1. Label Action */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-2">
                    Label Action
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setLabelAction('crop')}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        labelAction === 'crop'
                          ? 'border-emerald-500 bg-emerald-50/70 text-emerald-700 shadow-sm'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Scissors className="w-3.5 h-3.5 text-emerald-600" />
                      Crop Label
                    </button>

                    <button
                      type="button"
                      onClick={() => setLabelAction('keep_invoice')}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        labelAction === 'keep_invoice'
                          ? 'border-emerald-500 bg-emerald-50/70 text-emerald-700 shadow-sm'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      Keep Invoice
                    </button>
                  </div>
                </div>

                {/* 2. Print Options */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-2">
                    Print Options
                  </label>
                  <div className="space-y-2">
                    {/* Date/Time */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/30">
                      <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                        <Clock className="w-3.5 h-3.5 text-cyan-500" />
                        Print Date/Time
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={printDateTime}
                          onChange={(e) => setPrintDateTime(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>

                    {/* Page Number */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/30">
                      <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                        <FileCode className="w-3.5 h-3.5 text-purple-500" />
                        Print Page Number
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={printPageNumber}
                          onChange={(e) => setPrintPageNumber(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>

                    {/* Packing Slip */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/30">
                      <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                        <FilePlus className="w-3.5 h-3.5 text-blue-500" />
                        Add Packing Slip Page In Last
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={addPackingSlip}
                          onChange={(e) => setAddPackingSlip(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 3. Sort By */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-2">
                    Sort By
                  </label>
                  <div className="space-y-2">
                    {/* SKU Wise */}
                    <div className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      sortSku ? 'border-emerald-200/80 bg-emerald-50/30' : 'border-slate-200 bg-white'
                    }`}>
                      <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                        <Package className="w-3.5 h-3.5 text-emerald-600" />
                        SKU wise
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sortSku}
                          onChange={(e) => {
                            setSortSku(e.target.checked);
                            if (e.target.checked) { setSortCourier(false); setSortQuantity(false); }
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>

                    {/* Courier Wise */}
                    <div className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      sortCourier ? 'border-emerald-200/80 bg-emerald-50/30' : 'border-slate-200 bg-white'
                    }`}>
                      <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                        <Truck className="w-3.5 h-3.5 text-rose-500" />
                        Courier wise
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sortCourier}
                          onChange={(e) => {
                            setSortCourier(e.target.checked);
                            if (e.target.checked) { setSortSku(false); setSortQuantity(false); }
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>

                    {/* Quantity Wise */}
                    <div className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      sortQuantity ? 'border-emerald-200/80 bg-emerald-50/30' : 'border-slate-200 bg-white'
                    }`}>
                      <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                        <Boxes className="w-3.5 h-3.5 text-amber-600" />
                        Quantity wise
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sortQuantity}
                          onChange={(e) => {
                            setSortQuantity(e.target.checked);
                            if (e.target.checked) { setSortSku(false); setSortCourier(false); }
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 4. Output File Type (2x2 Grid) */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-2">
                    Output File Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOutputType('single')}
                      className={`p-2 rounded-xl border text-[11px] font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
                        outputType === 'single'
                          ? 'border-emerald-500 bg-emerald-50/70 text-emerald-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Single PDF
                    </button>

                    <button
                      type="button"
                      onClick={() => setOutputType('courier')}
                      className={`p-2 rounded-xl border text-[11px] font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
                        outputType === 'courier'
                          ? 'border-emerald-500 bg-emerald-50/70 text-emerald-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Truck className="w-3.5 h-3.5" />
                      By Courier
                    </button>

                    <button
                      type="button"
                      onClick={() => setOutputType('quantity')}
                      className={`p-2 rounded-xl border text-[11px] font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
                        outputType === 'quantity'
                          ? 'border-emerald-500 bg-emerald-50/70 text-emerald-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Boxes className="w-3.5 h-3.5" />
                      By Quantity
                    </button>

                    <button
                      type="button"
                      onClick={() => setOutputType('store')}
                      className={`p-2 rounded-xl border text-[11px] font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
                        outputType === 'store'
                          ? 'border-emerald-500 bg-emerald-50/70 text-emerald-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Store className="w-3.5 h-3.5" />
                      By Store
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

      </div>

      {/* ================= SKU SUMMARY MODAL ================= */}
      {showSkuModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" />
                SKU & Order Summary ({Object.keys(skuSummary).length} Unique Items)
              </h3>
              <button 
                type="button" 
                onClick={() => setShowSkuModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 space-y-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b text-slate-400 font-semibold">
                    <th className="pb-2">SKU Name</th>
                    <th className="pb-2 text-right">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {Object.entries(skuSummary).sort((a,b) => b[1] - a[1]).map(([sku, qty], i) => (
                    <tr key={i} className="hover:bg-slate-50/80">
                      <td className="py-2.5 text-slate-800 font-mono text-[11px] truncate max-w-[280px]">{sku}</td>
                      <td className="py-2.5 text-right font-bold text-emerald-600 font-mono">{qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSkuModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= DUPLICATE LABELS MODAL ================= */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Copy className="w-5 h-5 text-indigo-600" />
                Detected Duplicate Labels ({duplicateList.length})
              </h3>
              <button 
                type="button" 
                onClick={() => setShowDuplicateModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 space-y-2">
              <p className="text-xs text-slate-500 mb-2">
                The following labels appeared more than once across your uploaded files:
              </p>
              {duplicateList.map((item, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-indigo-900 font-mono">{item.awb}</span>
                    <span className="text-slate-500 block text-[11px]">{item.sku} • {item.courier}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Page {item.page}</span>
                </div>
              ))}
            </div>

            <div className="border-t pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
