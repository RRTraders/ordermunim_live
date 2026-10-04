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

import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Configure pdfjs worker locally
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Supported Marketplaces list (Horizontal scrollview)
export const MARKETPLACES = [
  {
    id: 'ajio',
    name: 'Ajio',
    shortName: 'Ajio',
    tagline: 'Reliance Retail Fashion & Lifestyle',
    badgeText: 'ajio',
    badgeStyle: 'bg-slate-950 text-amber-400 border border-slate-700 shadow-amber-500/10',
    iconLetter: 'A',
    description: 'Crop and organize Ajio standard & dropship courier manifests with automated barcode cropping.',
    ready: false
  },
  {
    id: 'amazon',
    name: 'Amazon',
    shortName: 'Amazon',
    tagline: 'Amazon Easy Ship & Seller Flex',
    badgeText: 'amazon',
    badgeStyle: 'bg-[#131921] text-[#FF9900] border border-amber-500/30 shadow-orange-500/10',
    iconLetter: 'a',
    description: 'Crop and organize Amazon Easy Ship 4x6 thermal shipping labels, FBA barcodes, and multi-package manifests.',
    ready: false
  },
  {
    id: 'flipcart',
    name: 'Flipcart',
    shortName: 'Flipcart',
    tagline: 'Flipkart Smart & Non-Smart Fulfillment',
    badgeText: 'flipkart',
    badgeStyle: 'bg-[#2874F0] text-[#FFE500] border border-blue-400 shadow-blue-500/20',
    iconLetter: 'F',
    description: 'Thermal 4x6 shipping label extraction, invoice separation, and SKU sorting for Flipcart orders.',
    ready: true
  },
  {
    id: 'meesho',
    name: 'Meesho',
    shortName: 'Meesho',
    tagline: 'Meesho Reseller & Supplier Hub',
    badgeText: 'meesho',
    badgeStyle: 'bg-gradient-to-tr from-fuchsia-900 to-pink-900 text-white shadow-pink-950/20',
    iconLetter: 'm',
    description: 'Crop, sort, and process your Meesho shipping labels automatically. Save time and reduce errors with powerful PDF tools.',
    ready: true
  },
  {
    id: 'myntra',
    name: 'Myntra',
    shortName: 'Myntra',
    tagline: 'Myntra Partner Portal (PPX)',
    badgeText: 'myntra',
    badgeStyle: 'bg-gradient-to-tr from-[#FF3F6C] via-[#FF527B] to-[#F16521] text-white shadow-rose-950/20',
    iconLetter: 'M',
    description: 'Multi-item packing slips & 4x6 thermal barcode cropper for Myntra PPX labels and logistics.',
    ready: false
  },
];

export default function LabelCropper({ showToast }) {
  // Selected marketplace state (default Meesho as developed)
  const [selectedMarketplace, setSelectedMarketplace] = useState(() => {
    return localStorage.getItem('om_selected_marketplace') || 'meesho';
  });

  const handleSelectMarketplace = (id) => {
    setSelectedMarketplace(id);
    localStorage.setItem('om_selected_marketplace', id);
  };

  const activeMarketplace = MARKETPLACES.find(m => m.id === selectedMarketplace) || MARKETPLACES.find(m => m.id === 'meesho');

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
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Settings State (matching LabelMantra: always auto crop)
  const [labelAction, setLabelAction] = useState('crop'); // 'crop' | 'keep_invoice'
  const [cropNudge, setCropNudge] = useState(0); // in points (-20 to +20 fine tune)
  const [printDateTime, setPrintDateTime] = useState(false);
  const [printPageNumber, setPrintPageNumber] = useState(false);
  const [addPackingSlip, setAddPackingSlip] = useState(false);

  // Thanks Line Customization (Footer White Line, max 10 words, persisted in localStorage)
  const [printThanksLine, setPrintThanksLine] = useState(() => {
    try {
      const saved = localStorage.getItem('label_thanks_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [thanksLineText, setThanksLineText] = useState(() => {
    try {
      const saved = localStorage.getItem('label_thanks_line');
      if (saved) {
        const words = saved.trim().split(/\s+/).filter(Boolean);
        return words.slice(0, 10).join(' ');
      }
      return 'Thanks For Your Order';
    } catch {
      return 'Thanks For Your Order';
    }
  });
  const [isThanksSaved, setIsThanksSaved] = useState(false);

  const handleThanksLineChange = (e) => {
    const val = e.target.value;
    const words = val.trim().split(/\s+/).filter(Boolean);
    if (words.length <= 10 || val.length < thanksLineText.length) {
      setThanksLineText(val);
      setIsThanksSaved(false);
    } else {
      if (showToast) showToast('Thanks Line is limited to 10 words maximum', 'warning');
    }
  };

  const handleSaveThanksLine = () => {
    try {
      localStorage.setItem('label_thanks_line', thanksLineText.trim());
      localStorage.setItem('label_thanks_enabled', String(printThanksLine));
      setIsThanksSaved(true);
      if (showToast) showToast('Thanks Line saved successfully!', 'success');
      setTimeout(() => setIsThanksSaved(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  // Sort By options (matching user screenshot: Courier wise ON)
  const [sortSku, setSortSku] = useState(false);
  const [sortCourier, setSortCourier] = useState(true);
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
      // Join with newline to preserve multi-line structure for regex matching
      const rawText = content.items.map(it => it.str).join('\n');

      // Helper for quick regex match
      const n = (rx, src = rawText) => {
        const m = src.match(rx);
        return m ? (m[1] || m[0]).trim() : '';
      };

      // ================= FLIPCART PARSING & BOUNDS =================
      if (selectedMarketplace === 'flipcart') {
        // 1. Detect Flipkart Courier
        let courier = 'Ekart Logistics';
        if (/e-?kart/i.test(rawText)) courier = 'Ekart Logistics';
        else if (/delhivery/i.test(rawText)) courier = 'Delhivery';
        else if (/shadowfax/i.test(rawText)) courier = 'Shadowfax';
        else if (/xpressbees/i.test(rawText) || /xpress\s*bees/i.test(rawText)) courier = 'XpressBees';
        else if (/blue\s*dart/i.test(rawText) || /bluedart/i.test(rawText)) courier = 'Blue Dart';
        else if (/smartr/i.test(rawText)) courier = 'Smartr';
        else if (/dtdc/i.test(rawText)) courier = 'DTDC';
        else {
          const cMatch = rawText.match(/(?:Courier|Logistics|Carrier)[\s:#-]*([A-Za-z0-9\s\-]{3,25})/i);
          if (cMatch) courier = cMatch[1].trim();
        }

        // 2. Detect Flipkart Order ID (e.g. OD338754545230023100)
        let orderNumber = '';
        const odMatch = rawText.match(/\b(OD\d{16,22})\b/i);
        if (odMatch) orderNumber = odMatch[1];

        // 3. Detect AWB / Tracking number
        let awb = '';
        const awbMatch = rawText.match(/(?:AWB\s*No\.?|Tracking\s*No\.?)[\s:]*([A-Za-z0-9]+)/i) ||
                         rawText.match(/\b(FMPC\d{10,14})\b/i);
        if (awbMatch) awb = awbMatch[1];
        if (!awb) awb = orderNumber || `FLIP-${pageNum}`;

        // 4. Detect Store / Seller Name
        let storeName = 'Flipkart Seller';
        const storeMatch = rawText.match(/Sold\s*By\s*:?\s*([A-Za-z0-9\s,\.\-]+?)(?:,|\n|UG-|GSTIN)/i);
        if (storeMatch) storeName = storeMatch[1].trim().replace(/\s+/g, ' ');

        // 5. Detect SKU & Quantity from Flipkart SKU table
        let sku = 'Flipkart-Item';
        let quantity = 1;
        const skuTableMatch = rawText.match(/SKU\s*ID\s*\|?\s*Description.*?\n(?:\s*\d+\s*\|\s*)?([A-Za-z0-9_\-\.\/\(\)\s]{3,45}?)\s*\|/is);
        if (skuTableMatch && skuTableMatch[1].trim().length > 1) {
          sku = skuTableMatch[1].trim().replace(/\s+/g, ' ');
        } else {
          const fallbackMatch = rawText.match(/(?:1\s*\|\s*)?([A-Za-z0-9_\-\.\/\(\)\s]{4,45}?)\s*\|\s*([^\|\n\r]+?)\s+(\d+)\b/i);
          if (fallbackMatch && fallbackMatch[1].trim().length > 1) {
            sku = fallbackMatch[1].trim().replace(/\s+/g, ' ');
          }
        }
        const qtyMatch = rawText.match(/SKU\s*ID\s*\|?\s*Description.*?\n.*?\s+(\d+)\s*(?:\n|$|FMPC|Use\s+Transparent)/is);
        if (qtyMatch) quantity = parseInt(qtyMatch[1], 10) || 1;

        // 6. Dynamic Crop Bounds Calculation from text coordinates
        const viewport = page.getViewport({ scale: 1.0 });
        const pageW = viewport.width;
        const pageH = viewport.height;

        let cropBox = null;
        // CRITICAL: Filter only visible text items with actual content to exclude empty space chunks with huge artificial widths
        const visibleItems = content.items.filter(it => it.str && it.str.trim().length > 0 && it.transform);
        const topHalfItems = visibleItems.filter(it => it.transform[5] >= pageH * 0.40);
        let footerY = pageH * 0.490;
        const footerItems = topHalfItems.filter(it => /Not for resale|Printed at|Transparent Packaging/i.test(it.str));
        if (footerItems.length > 0) {
          footerY = Math.min(...footerItems.map(it => it.transform[5]));
        }

        // Find left anchor for the Flipkart shipping label
        const leftAnchors = topHalfItems.filter(it => 
          it.transform[5] >= footerY &&
          /^(?:STD|EXP|COD|Ordered through|Flipkart|AWB No|\(N\))/i.test(it.str)
        );
        const labelLeftX = leftAnchors.length > 0 
          ? Math.min(...leftAnchors.map(it => it.transform[4]))
          : 192;

        // Flipkart shipping label width is standard ~214-216 pt
        // Filter strictly items within the label column so invoice text on the right is never included
        const labelItems = topHalfItems.filter(it => 
          it.transform[5] >= footerY - 4 &&
          it.transform[5] <= pageH * 0.98 &&
          it.transform[4] >= labelLeftX - 5 &&
          it.transform[4] <= labelLeftX + 218
        );

        if (labelItems.length >= 4) {
          const minX = Math.min(...labelItems.map(it => it.transform[4]));
          const maxX = Math.max(...labelItems.map(it => it.transform[4] + (it.width || 0)));
          const maxY = Math.max(...labelItems.map(it => it.transform[5] + (it.height || 0)));
          const minY = footerY;

          // Tight crop bounds: wrap outer black borders tightly with minimal border margin (~2.5-3.5 pt)
          cropBox = {
            left: Math.max(0, minX - 2.5),
            right: Math.min(pageW, maxX + 3.5),
            bottom: Math.max(0, minY - 4.5),
            top: Math.min(pageH, maxY + 3.0),
          };
        } else {
          // Standard Flipkart A4 layout fallback with tight borders
          cropBox = {
            left: 189.5,
            right: 406.2,
            bottom: 464.0,
            top: 813.5,
          };
        }

        return {
          success: true,
          awb,
          courier,
          sku,
          size: '',
          color: '',
          quantity,
          orderNumber,
          storeName,
          cropBox,
          isTop: true,
          rawText
        };
      }

      // ================= MEESHO PARSING (ORIGINAL) =================
      // 1. Detect Courier Name
      let courier = n(/([A-Za-z0-9\-]+(?:\s+[A-Za-z0-9\-]+)?)\s+Pickup/i);
      courier = courier.replace(/^(?:app|via|by|return|cash|cod|prepaid|amount|rs)\s+/i, '').trim();
      if (courier.toLowerCase() === 'valmoplus') courier = 'Valmo';

      // Comprehensive fallback courier patterns
      if (!courier || courier.length < 2 || /^(?:the|on|app)$/i.test(courier)) {
        if (/\bvalmo\b/i.test(rawText) || /\bVL\d{8,}/i.test(rawText)) courier = 'Valmo';
        else if (/\bshadowfax\b/i.test(rawText) || /\bSF\d{8,}/i.test(rawText)) courier = 'Shadowfax';
        else if (/\bdelhivery\b/i.test(rawText)) courier = 'Delhivery';
        else if (/\bxpress\s*bees\b/i.test(rawText) || /\bxpressbees\b/i.test(rawText)) courier = 'XpressBees';
        else if (/\becom\s*express\b/i.test(rawText)) courier = 'Ecom Express';
        else if (/\bdtdc\b/i.test(rawText)) courier = 'DTDC';
        else if (/\bblue\s*dart\b/i.test(rawText)) courier = 'Blue Dart';
        else if (/\bsmartr\b/i.test(rawText)) courier = 'Smartr';
        else if (/\bamazon\b/i.test(rawText) || /\bats\b/i.test(rawText)) courier = 'Amazon Shipping';
        else if (/\bekart\b/i.test(rawText)) courier = 'Ekart';
        else courier = 'Unknown Courier';
      }

      // 2. Detect SKU / Size / Quantity / Color / Order Number
      let sku = 'General-Item';
      let size = '';
      let color = '';
      let quantity = 1;
      let orderNumber = '';

      let p = rawText.match(/SKU\s+Size\s+Qty\s+Color\s+(?:Net Units|Order No\.?)\s+(.*?)\s+(Free Size|\d+-\d+\s+[A-Za-z]+|\S+)\s+(\d+)\s+(?:\(One\)\s+)?([A-Za-z\s\-\&/]+?)\s+([a-zA-Z0-9_]{10,})/is);
      if (!p) {
        p = rawText.match(/SKU\s+Size\s+Qty\s+(.*?)\s+(Free Size|\d+-\d+\s+[A-Za-z]+|\S+)\s+(\d+)(?=\s|$)/i);
      }

      if (p) {
        sku = p[1].trim().replace(/\s+/g, ' ').slice(0, 45);
        size = p[2].trim();
        quantity = parseInt(p[3], 10) || 1;
        if (p[4]) color = p[4].trim();
        if (p[5]) orderNumber = p[5].trim();
      } else {
        const skuMatch = rawText.match(/(?:SKU|Product|Item|Style)[\s:#-]*([A-Za-z0-9_\-\.\/\s]{3,35})/i) ||
                         rawText.match(/SKU\s*Name[\s:#-]*([^\n\r,]+)/i);
        if (skuMatch && skuMatch[1].trim().length > 2) {
          sku = skuMatch[1].trim().replace(/\s+/g, ' ').slice(0, 35);
        }
        const qtyMatch = rawText.match(/(?:Qty|Quantity)[\s:#-]*([0-9]+)/i);
        if (qtyMatch) quantity = parseInt(qtyMatch[1], 10) || 1;
      }

      // 3. Detect AWB / Tracking number
      let awb = n(/\b(VL\d{8,16}|SF\d{8,16}|[A-Z]{0,3}\d{8,16}[A-Z]*)\b/);
      if (!awb) {
        const awbMatch = rawText.match(/(?:AWB|Waybill|Tracking(?:\s*No)?|Airway\s*Bill)[\s:#-]*([A-Z0-9]{8,18})/i) ||
                         rawText.match(/\b([0-9]{10,14})\b/);
        if (awbMatch) awb = awbMatch[1];
      }
      if (!awb) awb = `LBL-${pageNum}`;

      // 4. Detect Store / Supplier Name
      let storeName = 'Default Store';
      const storeMatch = rawText.match(/(?:Sold\s*by|Supplier|Seller)[\s:#-]*([A-Za-z0-9\s]{3,30})/i);
      if (storeMatch) storeName = storeMatch[1].trim();

      return {
        success: true,
        awb,
        courier,
        sku,
        size,
        color,
        quantity,
        orderNumber,
        storeName,
        isTop: true,
        rawText
      };
    } catch (err) {
      console.warn('Text extraction error on page', pageNum, err);
      return {
        success: false,
        awb: `ERR-${pageNum}`,
        courier: 'Unknown Courier',
        sku: 'Unparsed-Item',
        size: '',
        color: '',
        quantity: 1,
        orderNumber: '',
        storeName: 'Default Store',
        isTop: true,
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

      // STEP 2: Rearrange and sort labels based on user filter selections (Courier wise, SKU wise, Quantity wise)
      let sortedLabels = [...allParsed];

      sortedLabels.sort((a, b) => {
        // Priority 1: Courier wise grouping (matches user screenshot)
        if (sortCourier) {
          const cComp = (a.courier || '').localeCompare(b.courier || '');
          if (cComp !== 0) return cComp;
        }

        // Priority 2: SKU wise sorting
        if (sortSku) {
          const sComp = (a.sku || '').localeCompare(b.sku || '');
          if (sComp !== 0) return sComp;
        }

        // Priority 3: Quantity wise sorting
        if (sortQuantity) {
          const qComp = (a.quantity || 0) - (b.quantity || 0);
          if (qComp !== 0) return qComp;
        }

        // Default secondary grouping if only Courier wise is selected: group identical SKUs within courier
        if (sortCourier && !sortSku) {
          const sComp = (a.sku || '').localeCompare(b.sku || '');
          if (sComp !== 0) return sComp;
        }

        return (a.awb || '').localeCompare(b.awb || '');
      });

      setProcessingProgress(60);

      // Helper function to build a cropped PDF from an array of label items
      // 100% Matching LabelMantra.in's exact page crop architecture:
      // Uses direct copyPages + translateContent + setCropBox + setMediaBox
      // This physically clips off everything below the top 345.6pt (TAX INVOICE completely eliminated)
      const buildPdf = async (items, title = 'Meesho Shipping Labels') => {
        const outDoc = await PDFDocument.create();
        const helveticaFont = await outDoc.embedFont(StandardFonts.Helvetica);
        const helveticaBold = await outDoc.embedFont(StandardFonts.HelveticaBold);

        const pad = (n) => String(n).padStart(2, '0');
        const now = new Date();
        const dDay = pad(now.getDate());
        const dMonth = pad(now.getMonth() + 1);
        const dYear = now.getFullYear();
        let dHours = now.getHours();
        const dAmpm = dHours >= 12 ? 'pm' : 'am';
        dHours = dHours % 12 || 12;
        const dStrHours = pad(dHours);
        const dMinutes = pad(now.getMinutes());
        const dSeconds = pad(now.getSeconds());
        const batchDateTimeStr = `${dDay}/${dMonth}/${dYear} ${dStrHours}:${dMinutes}:${dSeconds} ${dAmpm}`;

        // Pre-load source PDFDocuments as an array matching files
        const srcDocs = [];
        for (let fi = 0; fi < files.length; fi++) {
          const bytes = await files[fi].arrayBuffer();
          srcDocs.push(await PDFDocument.load(bytes));
        }

        const totalItems = items.length;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const singleDoc = srcDocs[item.fileIndex];
          if (!singleDoc) continue;

          const srcPage = singleDoc.getPage(item.pageIndex);
          const pageSize = srcPage.getSize();

          if (labelAction === 'crop') {
            if (selectedMarketplace === 'flipcart') {
              // ================= FLIPCART TIGHT CROPPING (VERY LITTLE WHITE SPACE) =================
              // Page size wraps strictly around the label border with minimal 4pt quiet padding (matches Image 2)
              let cLeft = item.cropBox?.left ?? 189.5;
              let cRight = item.cropBox?.right ?? 406.2;
              let cTop = item.cropBox?.top ?? 813.5;
              let cBottom = item.cropBox?.bottom ?? 464.0;

              // Apply crop nudge fine-tuning
              cTop = Math.min(pageSize.height, cTop + cropNudge);
              cBottom = Math.max(0, cBottom - cropNudge);

              const srcW = Math.max(10, cRight - cLeft);
              const srcH = Math.max(10, cTop - cBottom);

              const embeddedPage = await outDoc.embedPage(srcPage, {
                left: cLeft,
                bottom: cBottom,
                right: cRight,
                top: cTop,
              });

              // Determine footer height dynamically based on Thanks Line and Date/Page number settings
              const hasThanks = Boolean(printThanksLine && thanksLineText.trim());
              const hasDateOrPage = Boolean(printDateTime || printPageNumber);
              const footerH = (hasThanks && hasDateOrPage) ? 30 : (hasThanks ? 22 : (hasDateOrPage ? 14 : 0));
              const padding = 4;
              const targetW = srcW + (padding * 2);
              const targetH = srcH + (padding * 2) + footerH;

              const targetPage = outDoc.addPage([targetW, targetH]);

              targetPage.drawPage(embeddedPage, {
                x: padding,
                y: padding + footerH,
                width: srcW,
                height: srcH,
              });

              // Bottom margin for Date & Page number: 4.5 pt from bottom edge
              const metaY = 4.5;

              // Optional Date/Time footer (bold font, solid black, with seconds, matching Image 1)
              if (printDateTime) {
                targetPage.drawText(batchDateTimeStr, {
                  x: padding + 2,
                  y: metaY,
                  size: 6.5,
                  font: helveticaBold,
                  color: rgb(0, 0, 0),
                });
              }

              // Optional Page Number (bold font, solid black)
              if (printPageNumber) {
                const pageStr = `${i + 1}`;
                const textW = helveticaBold.widthOfTextAtSize(pageStr, 7);
                targetPage.drawText(pageStr, {
                  x: targetW - textW - padding - 2,
                  y: metaY,
                  size: 7,
                  font: helveticaBold,
                  color: rgb(0, 0, 0),
                });
              }

              // Thanks Line (placed cleanly above date line without disturbing, font size 9.5pt)
              if (hasThanks) {
                const thankStr = thanksLineText.trim();
                const fontSize = hasDateOrPage ? 9.5 : 10;
                let drawFontSize = fontSize;
                let textW = helveticaBold.widthOfTextAtSize(thankStr, drawFontSize);
                if (textW > targetW - 12) {
                  drawFontSize = Math.max(6, Math.floor(fontSize * (targetW - 12) / textW));
                  textW = helveticaBold.widthOfTextAtSize(thankStr, drawFontSize);
                }
                const thanksY = hasDateOrPage ? 16.5 : (footerH - drawFontSize) / 2 + 1;
                targetPage.drawText(thankStr, {
                  x: (targetW - textW) / 2,
                  y: thanksY,
                  size: drawFontSize,
                  font: helveticaBold,
                  color: rgb(0, 0, 0),
                });
              }
            } else {
              // ================= MEESHO ORIGINAL CROPPING =================
              // Standard Meesho A4 shipping label is exactly 345.6 pt tall from top of page.
              // Form XObject strictly clips everything below origH - labelH (TAX INVOICE completely eliminated).
              const labelH = Math.min(pageSize.height, 345.6 + cropNudge);
              const hasThanks = Boolean(printThanksLine && thanksLineText.trim());
              const hasDateOrPage = Boolean(printDateTime || printPageNumber);
              const extraH = (hasThanks && hasDateOrPage) ? 32 : (hasThanks ? 24 : (hasDateOrPage ? 16 : 0));
              const targetH = labelH + extraH;

              const embeddedPage = await outDoc.embedPage(srcPage, {
                left: 0,
                bottom: pageSize.height - labelH,
                right: pageSize.width,
                top: pageSize.height,
              });

              const targetPage = outDoc.addPage([pageSize.width, targetH]);
              const pW = pageSize.width;

              // Draw pristine shipping label above the bottom white space
              targetPage.drawPage(embeddedPage, {
                x: 0,
                y: extraH,
                width: pageSize.width,
                height: labelH,
              });

              const metaY = 4.5;

              // Optional Date/Time footer (bold font, solid black, with seconds)
              if (printDateTime) {
                targetPage.drawText(batchDateTimeStr, {
                  x: 12,
                  y: metaY,
                  size: 7,
                  font: helveticaBold,
                  color: rgb(0, 0, 0),
                });
              }

              // Optional Page Number (bold font, solid black)
              if (printPageNumber) {
                const pageStr = `${i + 1}`;
                const textW = helveticaBold.widthOfTextAtSize(pageStr, 8);
                targetPage.drawText(pageStr, {
                  x: pW - textW - 14,
                  y: metaY,
                  size: 8,
                  font: helveticaBold,
                  color: rgb(0, 0, 0),
                });
              }

              // Centered Bold text from Thanks Line setting
              if (hasThanks) {
                const thankText = thanksLineText.trim();
                const fontSize = hasDateOrPage ? 10 : 11;
                let drawFontSize = fontSize;
                let textW = helveticaBold.widthOfTextAtSize(thankText, drawFontSize);
                if (textW > pW - 16) {
                  drawFontSize = Math.max(7, Math.floor(fontSize * (pW - 16) / textW));
                  textW = helveticaBold.widthOfTextAtSize(thankText, drawFontSize);
                }
                const thanksY = hasDateOrPage ? 17.5 : (extraH - drawFontSize) / 2 + 1;
                targetPage.drawText(thankText, {
                  x: (pW - textW) / 2,
                  y: thanksY,
                  size: drawFontSize,
                  font: helveticaBold,
                  color: rgb(0, 0, 0),
                });
              }
            }
          } else {
            // Keep full page / invoice mode
            const [copiedPage] = await outDoc.copyPages(singleDoc, [item.pageIndex]);
            const targetPage = outDoc.addPage(copiedPage);
            const { width: pW } = targetPage.getSize();
            if (printDateTime || printPageNumber) {
              targetPage.drawRectangle({
                x: 0,
                y: 0,
                width: pW,
                height: 25,
                color: rgb(1, 1, 1),
              });
            }
            if (printDateTime) {
              const timeStr = new Date().toLocaleString('en-IN', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
              });
              const textW = helveticaBold.widthOfTextAtSize(timeStr, 9);
              targetPage.drawText(timeStr, {
                x: (pW - textW) / 2,
                y: 8,
                size: 9,
                font: helveticaBold,
                color: rgb(0, 0, 0)
              });
            }
            if (printPageNumber) {
              const pageStr = `${i + 1}`;
              const textW = helveticaBold.widthOfTextAtSize(pageStr, 9);
              targetPage.drawText(pageStr, {
                x: pW - textW - 14,
                y: 8,
                size: 9,
                font: helveticaBold,
                color: rgb(0, 0, 0)
              });
            }
          }
        }

        // Add Packing Slip Page In Last if enabled
        if (addPackingSlip) {
          const slipW = 595.28;
          const slipH = 345.6;
          const slipPage = outDoc.addPage([slipW, slipH]);
          slipPage.drawRectangle({
            x: 0, y: 0, width: slipW, height: slipH,
            color: rgb(0.98, 0.98, 0.99)
          });

          // Header
          slipPage.drawText('WAREHOUSE PACKING SLIP', {
            x: 15, y: slipH - 24, size: 12, font: helveticaBold, color: rgb(0.05, 0.1, 0.2)
          });
          slipPage.drawText(`Total Orders: ${totalItems} | Date: ${new Date().toLocaleDateString('en-IN')}`, {
            x: 15, y: slipH - 38, size: 8, font: helveticaFont, color: rgb(0.4, 0.4, 0.4)
          });

          slipPage.drawLine({
            start: { x: 15, y: slipH - 45 },
            end: { x: slipW - 15, y: slipH - 45 },
            thickness: 1, color: rgb(0.8, 0.8, 0.85)
          });

          // SKU Table
          slipPage.drawText('SKU / Product Description', {
            x: 15, y: slipH - 58, size: 8.5, font: helveticaBold, color: rgb(0.2, 0.2, 0.2)
          });
          slipPage.drawText('Qty', {
            x: slipW - 40, y: slipH - 58, size: 8.5, font: helveticaBold, color: rgb(0.2, 0.2, 0.2)
          });

          let rowY = slipH - 74;
          const sortedSkus = Object.entries(skuMap).sort((a, b) => b[1] - a[1]);

          for (const [skuName, qty] of sortedSkus) {
            if (rowY < 30) {
              slipPage.drawText('... (more items on next sheet)', { x: 15, y: 15, size: 7.5, font: helveticaFont, color: rgb(0.5, 0.5, 0.5) });
              break;
            }
            slipPage.drawText(skuName.slice(0, 45), {
              x: 15, y: rowY, size: 8, font: helveticaFont, color: rgb(0.1, 0.1, 0.1)
            });
            slipPage.drawText(String(qty), {
              x: slipW - 35, y: rowY, size: 8.5, font: helveticaBold, color: rgb(0.05, 0.4, 0.2)
            });
            rowY -= 15;
          }
        }

        return await outDoc.save();
      };

      setProcessingProgress(80);

      // STEP 3: Handle Output File Type
      const dateTag = new Date().toISOString().slice(0, 10);
      const mpPrefix = selectedMarketplace === 'flipcart' ? 'Flipkart' : 'Meesho';

      if (outputType === 'single') {
        const finalPdfBytes = await buildPdf(sortedLabels, `${mpPrefix} Shipping Labels`);
        const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setDownloadReady({
          type: 'single',
          url,
          filename: `${mpPrefix}_Cropped_Labels_${dateTag}.pdf`,
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
          zip.file(`${mpPrefix}_${cName}_${items.length}_Labels.pdf`, cBytes);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipUrl = URL.createObjectURL(zipBlob);
        setDownloadReady({
          type: 'zip',
          url: zipUrl,
          filename: `${mpPrefix}_Labels_By_Courier_${dateTag}.zip`,
          blob: zipBlob
        });
      } else if (outputType === 'quantity') {
        const singleQty = sortedLabels.filter(it => it.quantity === 1);
        const multiQty = sortedLabels.filter(it => it.quantity > 1);

        const zip = new JSZip();
        if (singleQty.length > 0) {
          const sBytes = await buildPdf(singleQty, 'Single Quantity Orders');
          zip.file(`${mpPrefix}_Single_Item_Orders_${singleQty.length}.pdf`, sBytes);
        }
        if (multiQty.length > 0) {
          const mBytes = await buildPdf(multiQty, 'Multi Quantity Orders');
          zip.file(`${mpPrefix}_Multi_Item_Orders_${multiQty.length}.pdf`, mBytes);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipUrl = URL.createObjectURL(zipBlob);
        setDownloadReady({
          type: 'zip',
          url: zipUrl,
          filename: `${mpPrefix}_Labels_By_Quantity_${dateTag}.zip`,
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
          zip.file(`${mpPrefix}_Store_${sName}_${items.length}_Labels.pdf`, sBytes);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipUrl = URL.createObjectURL(zipBlob);
        setDownloadReady({
          type: 'zip',
          url: zipUrl,
          filename: `${mpPrefix}_Labels_By_Store_${dateTag}.zip`,
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
      {/* ================= MARKETPLACE HORIZONTAL SCROLLVIEW ================= */}
      <div className="mb-6 pb-3 border-b border-slate-200">
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Marketplace
            </span>
            <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
              (Choose platform to crop labels)
            </span>
          </div>
          {!activeMarketplace?.ready && (
            <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
              In Development
            </span>
          )}
        </div>

        {/* Horizontal Scroll Bar */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 scroll-smooth -mx-1 px-1">
          {MARKETPLACES.map((mp) => {
            const isSelected = selectedMarketplace === mp.id;
            return (
              <button
                key={mp.id}
                type="button"
                onClick={() => handleSelectMarketplace(mp.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl whitespace-nowrap text-xs md:text-sm font-bold transition-all duration-200 shrink-0 cursor-pointer shadow-sm ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/25 ring-2 ring-slate-900 ring-offset-2 ring-offset-slate-50 scale-[1.02]'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100/90 border border-slate-200'
                }`}
              >
                {/* Marketplace Mini Badge */}
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black leading-none ${mp.badgeStyle}`}>
                  {mp.iconLetter}
                </div>
                <span>{mp.name}</span>
                {mp.ready ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 ml-0.5" title="Active & Ready" />
                ) : (
                  <span className="text-[9px] font-medium bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md border border-slate-200 ml-0.5">
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {(selectedMarketplace === 'meesho' || selectedMarketplace === 'flipcart') ? (
        <>
          {/* ================= HEADER SECTION ================= */}
          <div className="flex items-start justify-between pb-6 border-b border-slate-200 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                {activeMarketplace?.name} Label Cropping and sorting tools
              </h1>
              <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-2xl">
                {activeMarketplace?.description}
              </p>
            </div>

            {/* Active Marketplace Logo Badge */}
            <div className="flex items-center gap-2">
              <div className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center ${activeMarketplace?.badgeStyle} shadow-md`}>
                <span className="font-extrabold text-base leading-none">{activeMarketplace?.iconLetter}</span>
                <span className="text-[7.5px] font-semibold tracking-tighter opacity-90">{activeMarketplace?.badgeText}</span>
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
            {/* Courier Breakdown Chips */}
            {Object.keys(courierSummary).length > 0 && (
              <div className="col-span-2 md:col-span-4 mt-1 pt-3.5 border-t border-slate-100 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mr-1">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  Rearranged by Courier:
                </span>
                {Object.entries(courierSummary).sort((a, b) => a[0].localeCompare(b[0])).map(([cName, count]) => (
                  <span
                    key={cName}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs font-semibold text-emerald-900 shadow-2xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    {cName}: <span className="font-mono text-indigo-700 font-bold">{count} labels</span>
                  </span>
                ))}
              </div>
            )}
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

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                {downloadReady.type === 'single' && (
                  <button
                    type="button"
                    onClick={() => setShowPreviewModal(true)}
                    className="px-4 py-3 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    Preview Label
                  </button>
                )}

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

                {/* 2. Thanks Line Footer Setting */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Thanks Line
                    </label>
                    <span className={`text-[10px] font-semibold ${
                      thanksLineText.trim().split(/\s+/).filter(Boolean).length >= 10 ? 'text-amber-600' : 'text-slate-400'
                    }`}>
                      {thanksLineText.trim().split(/\s+/).filter(Boolean).length}/10 words
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 w-full">
                    {/* Tick mark checkbox (if tick mark then only print) */}
                    <label 
                      className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-xl border cursor-pointer transition-all select-none ${
                        printThanksLine ? 'bg-emerald-50 border-emerald-300 text-emerald-600 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                      }`}
                      title="If checked (tick mark), prints this line on label footer"
                    >
                      <input
                        type="checkbox"
                        checked={printThanksLine}
                        onChange={(e) => {
                          setPrintThanksLine(e.target.checked);
                          localStorage.setItem('label_thanks_enabled', String(e.target.checked));
                          if (showToast) showToast(e.target.checked ? 'Thanks line enabled' : 'Thanks line disabled', 'info');
                        }}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                      />
                    </label>

                    {/* Edit box (up to 10 words max) */}
                    <input
                      type="text"
                      value={thanksLineText}
                      onChange={handleThanksLineChange}
                      placeholder="e.g. Thanks For Your Order"
                      className="flex-1 min-w-0 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                    />

                    {/* Beside Save button with tick mark */}
                    <button
                      type="button"
                      onClick={handleSaveThanksLine}
                      className={`shrink-0 px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all shadow-sm cursor-pointer whitespace-nowrap ${
                        isThanksSaved 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}
                      title="Save text and settings"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isThanksSaved ? 'Saved' : 'Save'}</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 pl-0.5">
                    Prints on clean white footer line at bottom of label until changed.
                  </p>
                </div>

                {/* 3. Print Options */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-2">
                    Print Options
                  </label>
                  <div className="space-y-2">
                    {/* Date/Time */}
                    <div className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      printDateTime ? 'border-emerald-200/80 bg-emerald-50/30' : 'border-slate-200 bg-white'
                    }`}>
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
                    <div className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      printPageNumber ? 'border-emerald-200/80 bg-emerald-50/30' : 'border-slate-200 bg-white'
                    }`}>
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
                    <div className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      addPackingSlip ? 'border-emerald-200/80 bg-emerald-50/30' : 'border-slate-200 bg-white'
                    }`}>
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

                {/* 3. Sort By (Matching LabelMantra UI) */}
                <div>
                  <label className="text-xs font-bold text-purple-700 block mb-2.5">
                    Sort By
                  </label>
                  <div className="space-y-2.5">
                    {/* SKU Wise */}
                    <div className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      sortSku ? 'border-emerald-400 bg-emerald-50/60 shadow-xs' : 'border-slate-200 bg-white'
                    }`}>
                      <div className="flex items-center gap-3 text-xs font-semibold text-slate-800">
                        <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 text-base">
                          🛍️
                        </div>
                        <span className={sortSku ? 'text-emerald-900 font-bold' : 'text-slate-700'}>
                          SKU wise
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sortSku}
                          onChange={(e) => setSortSku(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>

                    {/* Courier Wise */}
                    <div className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      sortCourier ? 'border-emerald-400 bg-emerald-50/60 shadow-xs ring-1 ring-emerald-400/30' : 'border-slate-200 bg-white'
                    }`}>
                      <div className="flex items-center gap-3 text-xs font-semibold text-slate-800">
                        <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 text-base">
                          🚚
                        </div>
                        <span className={sortCourier ? 'text-emerald-900 font-bold' : 'text-slate-700'}>
                          Courier wise
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sortCourier}
                          onChange={(e) => setSortCourier(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>

                    {/* Quantity Wise */}
                    <div className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      sortQuantity ? 'border-emerald-400 bg-emerald-50/60 shadow-xs' : 'border-slate-200 bg-white'
                    }`}>
                      <div className="flex items-center gap-3 text-xs font-semibold text-slate-800">
                        <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 text-base">
                          📦
                        </div>
                        <span className={sortQuantity ? 'text-emerald-900 font-bold' : 'text-slate-700'}>
                          Quantity wise
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sortQuantity}
                          onChange={(e) => setSortQuantity(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
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
        </>
      ) : (
        <>
          {/* ================= MARKETPLACE HEADER ================= */}
          <div className="flex items-start justify-between pb-6 border-b border-slate-200 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                {activeMarketplace?.name} Label Cropping and sorting tools
              </h1>
              <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-2xl">
                {activeMarketplace?.description}
              </p>
            </div>

            {/* Active Marketplace Logo Badge */}
            <div className="flex items-center gap-2">
              <div className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center ${activeMarketplace?.badgeStyle} shadow-md`}>
                <span className="font-extrabold text-base leading-none">{activeMarketplace?.iconLetter}</span>
                <span className="text-[7.5px] font-semibold tracking-tighter opacity-90">{activeMarketplace?.badgeText}</span>
              </div>
            </div>
          </div>

          {/* ================= UNDER DEVELOPMENT CARD ================= */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-10 shadow-sm text-center max-w-2xl mx-auto my-6">
            <div className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center mb-4 bg-slate-100 text-slate-800 shadow-inner">
              <Scissors className="w-8 h-8 text-slate-700" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>In Active Development</span>
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">
              {activeMarketplace?.name} Label Cropper
            </h2>

            <p className="text-xs md:text-sm text-slate-500 max-w-lg mx-auto mb-6 leading-relaxed">
              We are fine-tuning the 4x6 thermal cropping layout and barcode parsing algorithms for <strong className="text-slate-800">{activeMarketplace?.name}</strong>. This module will be released in an upcoming update!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-md mx-auto mb-8">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  4x6 Thermal Cropping
                </div>
                <div className="text-[11px] text-slate-500">
                  Precision auto-crop for {activeMarketplace?.name} shipping labels without quality loss.
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  SKU & Order Summary
                </div>
                <div className="text-[11px] text-slate-500">
                  Extract product details, quantities, and sort orders automatically.
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => handleSelectMarketplace('meesho')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-fuchsia-900 to-pink-900 hover:from-fuchsia-800 hover:to-pink-800 text-white font-bold text-xs shadow-lg shadow-pink-950/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>👉 Switch to Meesho Label Cropper</span>
              </button>
            </div>
          </div>
        </>
      )}

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

      {/* ================= PREVIEW MODAL ================= */}
      {showPreviewModal && downloadReady && downloadReady.url && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 shadow-2xl space-y-3 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Scissors className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Cropped Thermal Label Preview ({selectedMarketplace === 'flipcart' ? '4x6" Thermal Portrait' : '4x6" Landscape'})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={downloadReady.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 text-xs text-indigo-600 hover:bg-indigo-50 font-semibold rounded-lg border border-indigo-200 transition-colors"
                >
                  Open in New Tab ↗
                </a>
                <button 
                  type="button" 
                  onClick={() => setShowPreviewModal(false)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 rounded-xl overflow-hidden min-h-[440px] flex items-center justify-center border border-slate-200">
              <iframe
                src={`${downloadReady.url}#toolbar=0&navpanes=0`}
                title="Cropped PDF Preview"
                className="w-full h-full min-h-[440px] rounded-xl"
              />
            </div>

            <div className="border-t pt-3 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {activeMarketplace?.name} Pure Shipping Label • 100% Tax Invoice Eliminated ({selectedMarketplace === 'flipcart' ? '4x6" Thermal Format' : 'LabelMantra Format'})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDirectPrint}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <a
                  href={downloadReady.url}
                  download={downloadReady.filename}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
