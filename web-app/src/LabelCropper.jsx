import React, { useState, useRef } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
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
  Check, 
  QrCode 
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
    description: 'Merge Ajio shipping labels & invoices in alternating page order.',
    ready: true
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

// ================= ATTRACTIVE FOLLOW US BADGE GENERATOR =================
// Renders boutique shop sketch, heart-framed QR code & elegant rounded border
function drawBadgeHeart(ctx, cx, cy, size, fill = true) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  const topCurveHeight = size * 0.3;
  ctx.moveTo(0, topCurveHeight);
  ctx.bezierCurveTo(-size / 2, -size / 2, -size, topCurveHeight / 3, 0, size);
  ctx.bezierCurveTo(size, topCurveHeight / 3, size / 2, -size / 2, 0, topCurveHeight);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = '#000000';
    ctx.fill();
  } else {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

function drawBadgeShopSketch(ctx, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  const s = size / 100;
  ctx.scale(s, s);

  ctx.lineWidth = 4;
  ctx.strokeStyle = '#000000';
  ctx.fillStyle = '#ffffff';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Top roof pediment / slant
  ctx.beginPath();
  ctx.moveTo(12, 34); ctx.lineTo(16, 16); ctx.lineTo(84, 16); ctx.lineTo(88, 34); ctx.closePath();
  ctx.stroke();

  // Roof stripes
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(33, 16); ctx.lineTo(30, 34);
  ctx.moveTo(50, 16); ctx.lineTo(50, 34);
  ctx.moveTo(67, 16); ctx.lineTo(70, 34);
  ctx.stroke();

  // Canopy top bar
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(8, 34); ctx.lineTo(92, 34);
  ctx.stroke();

  // 4 Scallops on canopy
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(8, 34);
  ctx.bezierCurveTo(8, 48, 29, 48, 29, 34);
  ctx.bezierCurveTo(29, 48, 50, 48, 50, 34);
  ctx.bezierCurveTo(50, 48, 71, 48, 71, 34);
  ctx.bezierCurveTo(71, 48, 92, 48, 92, 34);
  ctx.stroke();

  // Building walls
  ctx.beginPath();
  ctx.moveTo(14, 42); ctx.lineTo(14, 88);
  ctx.moveTo(86, 42); ctx.lineTo(86, 88);
  ctx.stroke();

  // Base foundation
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(6, 88); ctx.lineTo(94, 88);
  ctx.stroke();

  // Boutique Display Window (Left)
  ctx.lineWidth = 3.5;
  ctx.strokeRect(22, 50, 26, 26);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(35, 50); ctx.lineTo(35, 76);
  ctx.moveTo(22, 63); ctx.lineTo(48, 63);
  ctx.stroke();

  // Flower planter box
  ctx.fillStyle = '#000000';
  ctx.fillRect(19, 76, 32, 6);

  // Boutique Door (Right)
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(56, 88); ctx.lineTo(56, 55);
  ctx.arcTo(56, 46, 65, 46, 6);
  ctx.arcTo(80, 46, 80, 55, 6);
  ctx.lineTo(80, 88);
  ctx.stroke();

  // Door window pane
  ctx.lineWidth = 2;
  ctx.strokeRect(62, 52, 12, 15);
  // Door handle
  ctx.beginPath();
  ctx.arc(61, 71, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

async function generateFollowUsBadgeDataUrl(storeName, qrDataUrl, isLarge = false) {
  const canvas = document.createElement('canvas');
  const w = isLarge ? 470 : 320;
  const h = isLarge ? 88 : 38;
  const scale = 4; // High-DPI 300+
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  if (isLarge) {
    // Outer Rounded Border
    const r = 14;
    const pad = 2;
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    ctx.roundRect(pad, pad, w - pad * 2, h - pad * 2, r);
    ctx.stroke();

    // Inner subtle luxury double-border
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.roundRect(pad + 3.5, pad + 3.5, w - (pad + 3.5) * 2, h - (pad + 3.5) * 2, r - 3);
    ctx.stroke();

    // Decorative corner hearts
    drawBadgeHeart(ctx, 16, 11, 5, true);
    drawBadgeHeart(ctx, w - 16, 11, 5, true);
    drawBadgeHeart(ctx, 16, h - 17, 5, true);
    drawBadgeHeart(ctx, w - 16, h - 17, 5, true);

    // LEFT: SHOP SKETCH + STORE NAME
    const shopX = 20;
    const shopY = 12;
    const shopSize = 64;
    drawBadgeShopSketch(ctx, shopX, shopY, shopSize);

    // Store Name (large, bold, prominent)
    const nameX = shopX + shopSize + 14;
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
    ctx.textBaseline = 'top';
    const cleanName = (storeName || 'SHRINANT').toUpperCase().trim().slice(0, 20);
    ctx.fillText(cleanName, nameX, 26);

    // Subtitle / Verified Store Tag
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 9.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
    ctx.fillText('OFFICIAL STORE PROFILE', nameX, 52);

    // CENTER: Vertical Divider
    const divX = 226;
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(divX, 12);
    ctx.lineTo(divX, h - 12);
    ctx.stroke();

    // Center Heart on Divider
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(divX - 8, h / 2 - 8, 16, 16);
    drawBadgeHeart(ctx, divX, h / 2 - 5, 7, true);

    // RIGHT: QR CODE WITH HEART SHAPE AROUND
    const qrImg = new Image();
    await new Promise((resolve) => {
      qrImg.onload = resolve;
      qrImg.onerror = resolve;
      qrImg.src = qrDataUrl;
    });

    const qrSize = 58;
    const qrX = divX + 22;
    const qrY = (h - qrSize) / 2;

    // Heart-shaped/rounded container around QR
    const qrPad = 4;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(qrX - qrPad, qrY - qrPad, qrSize + qrPad * 2, qrSize + qrPad * 2, 8);
    ctx.fill();
    ctx.stroke();

    // Draw QR code
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    // Cute decorative hearts around the QR container
    drawBadgeHeart(ctx, qrX - qrPad - 1, qrY - qrPad - 1, 5, true);
    drawBadgeHeart(ctx, qrX + qrSize + qrPad + 1, qrY - qrPad - 1, 5, true);
    drawBadgeHeart(ctx, qrX - qrPad - 1, qrY + qrSize + qrPad - 4, 5, true);
    drawBadgeHeart(ctx, qrX + qrSize + qrPad + 1, qrY + qrSize + qrPad - 4, 5, true);

    // CALL TO ACTION TEXT
    const textX = qrX + qrSize + qrPad + 16;
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
    ctx.fillText('Follow', textX, 21);

    ctx.fillText('our page', textX, 43);
    const tw = ctx.measureText('our page').width;
    drawBadgeHeart(ctx, textX + tw + 10, 39, 9, true);

    // Subtitle: Scan with camera
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 8.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
    ctx.fillText('Scan with phone camera', textX, 64);
  } else {
    // Compact version for crop mode (w=320, h=38)
    const r = 8;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    ctx.roundRect(1, 1, w - 2, h - 2, r);
    ctx.stroke();

    // Shop Sketch
    const shopSize = 28;
    drawBadgeShopSketch(ctx, 8, (h - shopSize) / 2, shopSize);

    // Store Name
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
    ctx.textBaseline = 'middle';
    const cleanName = (storeName || 'SHRINANT').toUpperCase().trim().slice(0, 18);
    ctx.fillText(cleanName, 42, h / 2);

    // Divider with heart
    const divX = 135;
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(divX, 6);
    ctx.lineTo(divX, h - 6);
    ctx.stroke();

    // QR Code
    const qrImg = new Image();
    await new Promise((resolve) => {
      qrImg.onload = resolve;
      qrImg.onerror = resolve;
      qrImg.src = qrDataUrl;
    });

    const qrSize = 30;
    const qrX = divX + 14;
    const qrY = (h - qrSize) / 2;
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    // Cute hearts around QR
    drawBadgeHeart(ctx, qrX - 2, qrY - 1, 3.5, true);
    drawBadgeHeart(ctx, qrX + qrSize + 2, qrY - 1, 3.5, true);
    drawBadgeHeart(ctx, qrX - 2, qrY + qrSize - 2, 3.5, true);
    drawBadgeHeart(ctx, qrX + qrSize + 2, qrY + qrSize - 2, 3.5, true);

    // Follow our page text
    const textX = qrX + qrSize + 10;
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText('Follow', textX, 7);
    ctx.fillText('our page', textX, 20);
    const tw = ctx.measureText('our page').width;
    drawBadgeHeart(ctx, textX + tw + 6, 17, 5, true);
  }

  return canvas.toDataURL('image/png');
}

// Initial state factory for each marketplace to guarantee complete separation
const createInitialMarketplaceState = () => ({
  files: [],
  isProcessing: false,
  processingProgress: 0,
  metrics: {
    totalLabels: 0,
    success: 0,
    duplicates: 0,
    ocrFailed: 0,
  },
  parsedLabels: [],
  duplicateList: [],
  skuSummary: {},
  courierSummary: {},
  downloadReady: null,
  labelAction: 'crop',
  cropNudge: 0,
  sortSku: false,
  sortCourier: true,
  sortQuantity: false,
  outputType: 'single',
  addPackingSlip: false,
});

export default function LabelCropper({ showToast }) {
  // Selected marketplace state (default Meesho as developed)
  const [selectedMarketplace, setSelectedMarketplace] = useState(() => {
    return localStorage.getItem('om_selected_marketplace') || 'meesho';
  });

  // Isolated workspace states for each marketplace (keeps Meesho, Flipkart, Amazon, etc. 100% separate)
  const [marketplaceStates, setMarketplaceStates] = useState(() => ({
    ajio: createInitialMarketplaceState(),
    amazon: createInitialMarketplaceState(),
    flipcart: createInitialMarketplaceState(),
    meesho: createInitialMarketplaceState(),
    myntra: createInitialMarketplaceState(),
  }));

  const updateMarketplaceState = (mpId, updater) => {
    setMarketplaceStates(prev => {
      const prevMpState = prev[mpId] || createInitialMarketplaceState();
      const updatedFields = typeof updater === 'function' ? updater(prevMpState) : updater;
      return {
        ...prev,
        [mpId]: {
          ...prevMpState,
          ...updatedFields,
        },
      };
    });
  };

  const fileInputRef = useRef(null);

  // Helper for formatting file size
  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Ajio Customer-Matched PDF Merger State
  const [ajioState, setAjioState] = useState({
    labelFile: null,
    labelPageCount: 0,
    invoiceFile: null,
    invoicePageCount: 0,
    excelFile: null,
    excelRowCount: 0,
    excelData: null,
    isMerging: false,
    mergeProgress: 0,
    mergeStatusText: '',
    mergedDownload: null,
    matchStats: null,
    error: null,
  });

  const [showAjioBreakdown, setShowAjioBreakdown] = useState(false);

  // Normalize customer name for accurate comparison
  const normalizeCustomerName = (str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/^(mr\.|mrs\.|ms\.|shri|smt\.|m\/s\.?)\s+/i, '')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Extract recipient / customer name, order number, and pincode from Ajio PDF page text
  const extractShipToFromPage = (content) => {
    const items = content?.items || [];
    if (items.length === 0) return { shipToName: '', orderId: '', pincode: '', lines: [], isContinuation: false, invoiceNumber: '', pageCurrent: 1, pageTotal: 1 };

    // Sort items top-to-bottom (Y descending), left-to-right (X ascending)
    const sorted = [...items].filter(it => it.str && it.str.trim()).sort((a, b) => {
      const yA = a.transform ? a.transform[5] : 0;
      const yB = b.transform ? b.transform[5] : 0;
      const yDiff = yB - yA;
      if (Math.abs(yDiff) > 3) return yDiff;
      const xA = a.transform ? a.transform[4] : 0;
      const xB = b.transform ? b.transform[4] : 0;
      return xA - xB;
    });

    const lines = [];
    let curLine = [];
    let curY = sorted[0]?.transform ? sorted[0].transform[5] : 0;

    for (const it of sorted) {
      const y = it.transform ? it.transform[5] : 0;
      if (Math.abs(y - curY) > 3) {
        if (curLine.length > 0) {
          lines.push(curLine.map(t => t.str).join(' ').trim());
        }
        curLine = [it];
        curY = y;
      } else {
        curLine.push(it);
      }
    }
    if (curLine.length > 0) {
      lines.push(curLine.map(t => t.str).join(' ').trim());
    }

    const rawText = lines.join('\n');

    // Detect "Page X of Y" (footer in Ajio invoices: "Page 1 of 2", "Page 2 of 2")
    let pageCurrent = 1;
    let pageTotal = 1;
    const pageMatch = rawText.match(/Page\s*(\d+)\s*of\s*(\d+)/i);
    if (pageMatch) {
      pageCurrent = parseInt(pageMatch[1], 10);
      pageTotal = parseInt(pageMatch[2], 10);
    } else {
      for (let i = 0; i < items.length - 1; i++) {
        const s = items[i].str.trim();
        const m = s.match(/Page\s*(\d+)\s*of/i);
        if (m) {
          pageCurrent = parseInt(m[1], 10);
          const nextNum = parseInt(items[i + 1].str.trim(), 10);
          if (!isNaN(nextNum)) pageTotal = nextNum;
          break;
        }
      }
    }

    // Detect Tax Invoice Number
    const invNoMatch = rawText.match(/TAX\s*INVOICE\s*NO[\s:]*([A-Za-z0-9]+)/i);
    const invoiceNumber = invNoMatch ? invNoMatch[1].trim() : '';

    // Clean name candidate: removes adjacent column noise like "SHIP FROM ADDRESS", "SELLER", etc.
    const cleanCandidate = (raw) => {
      if (!raw) return '';
      let c = raw.trim();
      // Crucial: remove adjacent column text like "SHIP FROM ADDRESS: ...", "SELLER/CONSIGNOR: ..."
      c = c.replace(/\b(?:ship\s*from|seller|consignor|gstin|mobile|state\s*code|place\s*of|order\s*number).*/i, '').trim();
      c = c.replace(/^(?:name|customer|buyer|consignee|m\/s|mr\.|mrs\.|ms\.)[\s:\.\-]+/i, '').trim();
      if (c.includes(',')) {
        c = c.split(',')[0].trim();
      }
      c = c.replace(/[0-9]{4,}/g, '').trim();
      if (/^(?:address|pincode|pin|gstin|phone|mobile|tel|city|state|street|near|opp|landmark|floor|flat)/i.test(c)) {
        return '';
      }
      return c;
    };

    let shipToName = '';

    // 1. Same line match: "BILL TO / SHIP TO: Joginder" or "Ship To: Joginder"
    for (const line of lines) {
      const m = line.match(/(?:bill\s*to\s*\/\s*ship\s*to|ship[\s\-]*to|shipping[\s\-]*address|delivery[\s\-]*to|deliver[\s\-]*to|consignee)[\s:\-]+([A-Za-z0-9\s\.\&\-]{1,50})/i);
      if (m) {
        const candidate = cleanCandidate(m[1]);
        if (candidate.length >= 1) {
          shipToName = candidate;
          break;
        }
      }
    }

    // 2. Next line match: Line has "Ship To:" and next line has customer name
    if (!shipToName) {
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (/^(?:bill\s*to\s*\/\s*ship\s*to|ship[\s\-]*to|shipping[\s\-]*address|delivery[\s\-]*to|deliver[\s\-]*to|consignee)[\s:\-]*$/i.test(line)) {
          const candidate = cleanCandidate(lines[i + 1]);
          if (candidate.length >= 1) {
            shipToName = candidate;
            break;
          }
        }
      }
    }

    // 3. Multi-line regex fallback
    if (!shipToName) {
      const rawM = rawText.match(/(?:bill\s*to\s*\/\s*ship\s*to|ship[\s\-]*to|shipping[\s\-]*address|delivery[\s\-]*to)[\s:\-]+(?:\n|\r\n)?\s*([A-Za-z0-9\s]{1,40})/i);
      if (rawM) {
        const candidate = cleanCandidate(rawM[1]);
        if (candidate.length >= 1) {
          shipToName = candidate;
        }
      }
    }

    // 4. Extract Order Number (FN..., EX..., or standard order pattern)
    // Ajio customer orders typically start with FN or EX followed by digits (e.g., FN9224801976, EX0039111266)
    let orderId = '';
    const fnMatch = rawText.match(/\b(FN\d{8,12}|EX\d{8,12})\b/i);
    if (fnMatch) {
      orderId = fnMatch[1].toUpperCase();
    } else {
      const ordMatch = rawText.match(/(?:ORDER\s*(?:NUMBER|NO|#)|Order#)[\s:#\-]+([A-Za-z0-9\-_]{6,25})/i);
      if (ordMatch && !/^(?:shipment|payment|collect|surface|carrier|total)$/i.test(ordMatch[1])) {
        orderId = ordMatch[1].trim().toUpperCase();
      }
    }

    // 5. Extract Pincode (6-digit Indian pincode)
    let pincode = '';
    const pinMatch = rawText.match(/\b([1-9][0-9]{5})\b/);
    if (pinMatch) {
      pincode = pinMatch[1];
    }

    // 6. Continuation detection: Page 2 of N, or page lacking both Tax Invoice No and Order ID
    const isContinuation = pageCurrent > 1 || (!invoiceNumber && !orderId);

    // 7. Extract Item SKUs & Quantities from invoice table
    // Matches patterns like: Men Relaxed Fit Flat-Front Trousers,grey,703666422025 (O1PANTDARKGREY32),O1 PANT DARK GREY-32
    // or standalone line: LILN PNT BLACK-32
    const invoiceItems = [];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      let sku = '';
      const m1 = l.match(/\([A-Za-z0-9]+\),([A-Za-z0-9\s\-]+)$/);
      if (m1) {
        sku = m1[1].trim();
      } else {
        const m2 = l.match(/^([A-Z0-9]{2,8}\s+(?:PANT|PNT|PT)[A-Z0-9\s\-]+)$/i);
        if (m2 && !l.includes('Total') && !l.includes('TAX') && !l.includes('HSN')) {
          sku = m2[1].trim();
        }
      }

      if (sku) {
        let qty = 1;
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          const qm = lines[j].match(/\b\d{6,8}\s+(\d+(?:\.\d+)?)\b/);
          if (qm) {
            qty = Math.round(parseFloat(qm[1]));
            break;
          }
        }
        invoiceItems.push({ sku, qty });
      }
    }

    return { shipToName, orderId, pincode, lines, isContinuation, invoiceNumber, pageCurrent, pageTotal, invoiceItems };
  };

  // Determine if a label page matches an invoice document (single or multi-page)
  // Priority 1: Exact Order ID match (as requested: "if you cant get invoice from name then take by matching order")
  // Priority 2: Customer Name match (Exact or Substring)
  // Priority 3: Short Name + Pincode match or Pincode + Address match
  const isAjioPageMatch = (labelPage, invoiceDoc) => {
    // 1. Order Number Match (Highest priority)
    if (labelPage.orderId && invoiceDoc.orderId && labelPage.orderId.length >= 6) {
      if (labelPage.orderId.toLowerCase() === invoiceDoc.orderId.toLowerCase()) {
        return { match: true, reason: `Order ID Match (#${labelPage.orderId})` };
      }
    }

    // 2. Customer Name Match (Exact or Substring)
    const normLbl = normalizeCustomerName(labelPage.shipToName);
    const normInv = normalizeCustomerName(invoiceDoc.shipToName);

    if (normLbl && normInv) {
      if (normLbl === normInv) {
        return { match: true, reason: `Customer Name Match ("${labelPage.shipToName}")` };
      }
      if (normLbl.length >= 3 && normInv.length >= 3) {
        if (normLbl.includes(normInv) || normInv.includes(normLbl)) {
          return { match: true, reason: `Customer Name Match ("${labelPage.shipToName}")` };
        }
      }
      // Short names (e.g. "S" or "S R") verified with Pincode
      if ((normLbl.length < 3 || normInv.length < 3) && labelPage.pincode && invoiceDoc.pincode && labelPage.pincode === invoiceDoc.pincode) {
        return { match: true, reason: `Short Name + Pincode Match ("${labelPage.shipToName}" + ${labelPage.pincode})` };
      }
    }

    // 3. Fallback: Delivery Pincode match
    if (labelPage.pincode && invoiceDoc.pincode && labelPage.pincode === invoiceDoc.pincode && labelPage.pincode.length === 6) {
      return { match: true, reason: `Delivery Pincode Match (${labelPage.pincode})` };
    }

    // 4. Fallback: Pincode + Address tokens match
    if (labelPage.pincode && invoiceDoc.pincode && labelPage.pincode === invoiceDoc.pincode && labelPage.pincode.length === 6) {
      const lblWords = (labelPage.lines || []).join(' ').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 4);
      const invWords = (invoiceDoc.lines || []).join(' ').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 4);
      const shared = lblWords.filter(w => invWords.includes(w) && !['road', 'street', 'near', 'floor', 'india', 'surat', 'shree', 'kuberji'].includes(w));
      if (shared.length >= 2) {
        return { match: true, reason: `Pincode & Address Match (${labelPage.pincode})` };
      }
    }

    return { match: false, reason: '' };
  };

  const ajioLabelInputRef = useRef(null);
  const ajioInvoiceInputRef = useRef(null);
  const ajioExcelInputRef = useRef(null);

  const handleAjioLabelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      showToast?.('Please upload a PDF file for Ajio Labels', 'warning');
      return;
    }
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const count = pdfDoc.getPageCount();
      setAjioState(prev => ({
        ...prev,
        labelFile: file,
        labelPageCount: count,
        mergedDownload: null,
        error: null,
      }));
      showToast?.(`Loaded Label PDF: ${file.name} (${count} pages)`, 'success');
    } catch (err) {
      console.error('Error reading Ajio Label PDF:', err);
      showToast?.('Failed to read Label PDF: ' + err.message, 'error');
    }
  };

  const handleAjioInvoiceUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      showToast?.('Please upload a PDF file for Ajio Invoices', 'warning');
      return;
    }
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const count = pdfDoc.getPageCount();
      setAjioState(prev => ({
        ...prev,
        invoiceFile: file,
        invoicePageCount: count,
        mergedDownload: null,
        error: null,
      }));
      showToast?.(`Loaded Invoice PDF: ${file.name} (${count} pages)`, 'success');
    } catch (err) {
      console.error('Error reading Ajio Invoice PDF:', err);
      showToast?.('Failed to read Invoice PDF: ' + err.message, 'error');
    }
  };

  const handleAjioExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      const count = rows.length;
      setAjioState(prev => ({
        ...prev,
        excelFile: file,
        excelRowCount: count,
        excelData: rows,
      }));
      showToast?.(`Loaded Ajio Excel: ${file.name} (${count} rows)`, 'success');
    } catch (err) {
      console.error('Error reading Ajio Excel:', err);
      showToast?.('Failed to read Excel file: ' + err.message, 'error');
    }
  };

  const clearAjioLabel = () => {
    if (ajioLabelInputRef.current) ajioLabelInputRef.current.value = '';
    setAjioState(prev => ({
      ...prev,
      labelFile: null,
      labelPageCount: 0,
      mergedDownload: null,
    }));
  };

  const clearAjioInvoice = () => {
    if (ajioInvoiceInputRef.current) ajioInvoiceInputRef.current.value = '';
    setAjioState(prev => ({
      ...prev,
      invoiceFile: null,
      invoicePageCount: 0,
      mergedDownload: null,
    }));
  };

  const clearAjioExcel = () => {
    if (ajioExcelInputRef.current) ajioExcelInputRef.current.value = '';
    setAjioState(prev => ({
      ...prev,
      excelFile: null,
      excelRowCount: 0,
      excelData: null,
    }));
  };

  const clearAllAjio = () => {
    if (ajioLabelInputRef.current) ajioLabelInputRef.current.value = '';
    if (ajioInvoiceInputRef.current) ajioInvoiceInputRef.current.value = '';
    if (ajioExcelInputRef.current) ajioExcelInputRef.current.value = '';
    setAjioState({
      labelFile: null,
      labelPageCount: 0,
      invoiceFile: null,
      invoicePageCount: 0,
      excelFile: null,
      excelRowCount: 0,
      excelData: null,
      isMerging: false,
      mergeProgress: 0,
      mergedDownload: null,
      error: null,
    });
  };

  const handleMergeAjioPdf = async () => {
    if (!ajioState.labelFile || !ajioState.invoiceFile) {
      showToast?.('Please upload both Label PDF and Invoice PDF to merge', 'warning');
      return;
    }

    setAjioState(prev => ({
      ...prev,
      isMerging: true,
      mergeProgress: 5,
      mergeStatusText: 'Reading Label PDF...',
      error: null,
    }));

    try {
      const labelBytes = await ajioState.labelFile.arrayBuffer();
      const invoiceBytes = await ajioState.invoiceFile.arrayBuffer();

      // Load with pdfjsLib to parse text content
      const labelPdfJs = await pdfjsLib.getDocument({ data: labelBytes.slice(0) }).promise;
      const invoicePdfJs = await pdfjsLib.getDocument({ data: invoiceBytes.slice(0) }).promise;

      const labelTotalPages = labelPdfJs.numPages;
      const invoiceTotalPages = invoicePdfJs.numPages;

      // 1. Extract text, customer name, order number, and pincode from each label page
      const labelPagesInfo = [];
      for (let p = 1; p <= labelTotalPages; p++) {
        setAjioState(prev => ({
          ...prev,
          mergeProgress: Math.min(25, Math.round((p / labelTotalPages) * 25)),
          mergeStatusText: `Reading Label page ${p} of ${labelTotalPages} (extracting customer & order details)...`,
        }));
        const page = await labelPdfJs.getPage(p);
        const textContent = await page.getTextContent();
        const extracted = extractShipToFromPage(textContent);
        labelPagesInfo.push({
          pageIndex: p - 1, // 0-based index for pdf-lib
          pageNum: p,
          ...extracted,
        });
      }

      // 2. Extract text, customer name, order number, and pincode from each invoice page
      const invoicePagesInfo = [];
      for (let p = 1; p <= invoiceTotalPages; p++) {
        setAjioState(prev => ({
          ...prev,
          mergeProgress: 25 + Math.min(30, Math.round((p / invoiceTotalPages) * 30)),
          mergeStatusText: `Reading Invoice page ${p} of ${invoiceTotalPages} (extracting customer & order details)...`,
        }));
        const page = await invoicePdfJs.getPage(p);
        const textContent = await page.getTextContent();
        const extracted = extractShipToFromPage(textContent);
        invoicePagesInfo.push({
          pageIndex: p - 1, // 0-based index for pdf-lib
          pageNum: p,
          ...extracted,
        });
      }

      // 3. Group invoice pages into structured Invoice Documents (handles multi-page invoices seamlessly)
      // Page 1 of an invoice has TAX INVOICE NO, Order #, and footer "Page 1 of N".
      // Subsequent pages (Page 2, 3...) have footer "Page 2 of N", repeated customer name, but omit TAX INVOICE NO.
      const invoiceDocuments = [];
      let curInvoice = null;

      for (let i = 0; i < invoicePagesInfo.length; i++) {
        const p = invoicePagesInfo[i];
        
        // Multi-page continuation detection:
        // A page belongs to the previous invoice if:
        // 1) It explicitly has pageCurrent > 1 (e.g. Page 2 of 2)
        // 2) Or previous invoice still expects more pages (expectedPages > pages.length)
        // 3) Or this page lacks both Tax Invoice No and Order ID
        const isContinuation = curInvoice && (
          (p.pageCurrent && p.pageCurrent > 1) ||
          (curInvoice.expectedPages && curInvoice.expectedPages > curInvoice.pages.length) ||
          (!p.invoiceNumber && !p.orderId)
        );

        if (!isContinuation || !curInvoice) {
          curInvoice = {
            invoiceIndex: invoiceDocuments.length,
            invoiceNumber: p.invoiceNumber,
            orderId: p.orderId,
            shipToName: p.shipToName,
            pincode: p.pincode,
            lines: p.lines || [],
            expectedPages: p.pageTotal || 1,
            pages: [p],
            items: p.invoiceItems || [],
          };
          invoiceDocuments.push(curInvoice);
        } else {
          curInvoice.pages.push(p);
          if (!curInvoice.orderId && p.orderId) curInvoice.orderId = p.orderId;
          if (!curInvoice.shipToName && p.shipToName) curInvoice.shipToName = p.shipToName;
          if (!curInvoice.pincode && p.pincode) curInvoice.pincode = p.pincode;
          if (p.lines && p.lines.length > 0) curInvoice.lines = [...(curInvoice.lines || []), ...p.lines];
          if (p.invoiceItems && p.invoiceItems.length > 0) {
            curInvoice.items = [...(curInvoice.items || []), ...p.invoiceItems];
          }
        }
      }

      setAjioState(prev => ({
        ...prev,
        mergeProgress: 60,
        mergeStatusText: `Matching ${labelPagesInfo.length} labels to ${invoiceDocuments.length} invoice documents...`,
      }));

      // 4. Build target page sequence:
      // For each 1-page label:
      //   Add label page (carrying matched item SKUs for bottom-right stamping)
      //   Append ALL pages belonging to matching invoice document ([P1, P2...]) right behind the label!
      const usedInvoiceDocIndices = new Set();
      const matchedPairs = [];
      const mergeSequence = [];

      for (let i = 0; i < labelPagesInfo.length; i++) {
        const lbl = labelPagesInfo[i];

        let matchedDoc = null;
        let matchRes = null;

        for (let j = 0; j < invoiceDocuments.length; j++) {
          if (!usedInvoiceDocIndices.has(j)) {
            const invDoc = invoiceDocuments[j];
            const res = isAjioPageMatch(lbl, invDoc);
            if (res.match) {
              matchedDoc = invDoc;
              matchRes = res;
              usedInvoiceDocIndices.add(j);
              break;
            }
          }
        }

        // Add label page with matched invoice items (for SKU stamping)
        mergeSequence.push({
          type: 'label',
          pageIndex: lbl.pageIndex,
          pageNum: lbl.pageNum,
          name: lbl.shipToName,
          labelNum: i + 1,
          items: matchedDoc?.items || [],
        });

        // Append all invoice pages belonging to this matched document
        if (matchedDoc) {
          for (const pg of matchedDoc.pages) {
            mergeSequence.push({
              type: 'invoice',
              pageIndex: pg.pageIndex,
              pageNum: pg.pageNum,
              name: matchedDoc.shipToName,
              labelNum: i + 1,
            });
          }
        }

        matchedPairs.push({
          labelNum: i + 1,
          labelPageIndex: lbl.pageIndex,
          labelPage: lbl.pageNum,
          customerName: lbl.shipToName || 'Customer Name Not Detected',
          orderId: lbl.orderId,
          matchReason: matchRes ? matchRes.reason : 'No matching invoice',
          items: matchedDoc?.items || [],
          matchedInvoices: matchedDoc ? matchedDoc.pages.map(pg => ({
            pageNum: pg.pageNum,
            pageIndex: pg.pageIndex,
          })) : [],
        });
      }

      // Any remaining unmatched invoice documents are appended at the end
      const unmatchedInvoices = [];
      for (let j = 0; j < invoiceDocuments.length; j++) {
        if (!usedInvoiceDocIndices.has(j)) {
          const invDoc = invoiceDocuments[j];
          for (const pg of invDoc.pages) {
            unmatchedInvoices.push(pg);
            mergeSequence.push({
              type: 'invoice',
              pageIndex: pg.pageIndex,
              pageNum: pg.pageNum,
              name: invDoc.shipToName,
              unmatched: true,
            });
          }
        }
      }

      setAjioState(prev => ({
        ...prev,
        mergeProgress: 75,
        mergeStatusText: `Building merged PDF (${mergeSequence.length} total pages)...`,
      }));

      // 5. Build merged PDF using pdf-lib
      const mergedDoc = await PDFDocument.create();
      const labelDoc = await PDFDocument.load(labelBytes, { ignoreEncryption: true });
      const invoiceDoc = await PDFDocument.load(invoiceBytes, { ignoreEncryption: true });
      const helveticaBold = await mergedDoc.embedFont(StandardFonts.HelveticaBold);

      for (let idx = 0; idx < mergeSequence.length; idx++) {
        const item = mergeSequence[idx];
        if (item.type === 'label') {
          const [copiedPage] = await mergedDoc.copyPages(labelDoc, [item.pageIndex]);

          // Stamp SKU name and Quantity in the bottom-right corner of the shipping label
          // Uses a solid white background rectangle so the vertical table line does not interfere/cut through the text,
          // and maintains a consistent clean font size (6.5pt) for both single and multi-item orders.
          if (item.items && item.items.length > 0) {
            const boxX = 172; // Safely right of Consignor address (ends at <= 168)
            const boxY = 12;
            const boxW = 106; // Extends to 278 (clear of page right border at 282)
            const boxH = 48; // Extends to 60 (under the Total box horizontal separator)

            // 1. Solid white background to cleanly erase the vertical line
            copiedPage.drawRectangle({
              x: boxX,
              y: boxY,
              width: boxW,
              height: boxH,
              color: rgb(1, 1, 1),
            });

            // 2. Draw text with consistent compact font size (6.5pt)
            const textStartX = 175;
            const maxTextWidth = 100;
            const baseFontSize = 6.5;

            if (item.items.length === 1) {
              const itm = item.items[0];
              let fSize = baseFontSize;
              while (fSize > 4.5 && helveticaBold.widthOfTextAtSize(itm.sku, fSize) > maxTextWidth) {
                fSize -= 0.5;
              }
              const skuW = helveticaBold.widthOfTextAtSize(itm.sku, fSize);
              const qtyStr = String(itm.qty || 1);
              const qtySize = baseFontSize + 1; // 7.5pt
              const qtyW = helveticaBold.widthOfTextAtSize(qtyStr, qtySize);

              // Line 1: SKU Name (e.g. O1 PANT DARK GREY-32)
              copiedPage.drawText(itm.sku, {
                x: textStartX,
                y: 33,
                size: fSize,
                font: helveticaBold,
                color: rgb(0, 0, 0),
              });

              // Line 2: Quantity centered under the SKU
              copiedPage.drawText(qtyStr, {
                x: textStartX + Math.max(0, (skuW - qtyW) / 2),
                y: 21,
                size: qtySize,
                font: helveticaBold,
                color: rgb(0, 0, 0),
              });
            } else if (item.items.length === 2) {
              for (let k = 0; k < 2; k++) {
                const itm = item.items[k];
                const text = `${itm.sku} (${itm.qty})`;
                let fSize = baseFontSize;
                while (fSize > 4.5 && helveticaBold.widthOfTextAtSize(text, fSize) > maxTextWidth) {
                  fSize -= 0.5;
                }
                copiedPage.drawText(text, {
                  x: textStartX,
                  y: 35 - (k * 12),
                  size: fSize,
                  font: helveticaBold,
                  color: rgb(0, 0, 0),
                });
              }
            } else if (item.items.length === 3) {
              for (let k = 0; k < 3; k++) {
                const itm = item.items[k];
                const text = `${itm.sku} (${itm.qty})`;
                let fSize = baseFontSize;
                while (fSize > 4.5 && helveticaBold.widthOfTextAtSize(text, fSize) > maxTextWidth) {
                  fSize -= 0.5;
                }
                copiedPage.drawText(text, {
                  x: textStartX,
                  y: 39 - (k * 11),
                  size: fSize,
                  font: helveticaBold,
                  color: rgb(0, 0, 0),
                });
              }
            } else {
              const count = Math.min(item.items.length, 4);
              for (let k = 0; k < count; k++) {
                const itm = item.items[k];
                const text = `${itm.sku} (${itm.qty})`;
                let fSize = 5.5;
                while (fSize > 4.0 && helveticaBold.widthOfTextAtSize(text, fSize) > maxTextWidth) {
                  fSize -= 0.5;
                }
                copiedPage.drawText(text, {
                  x: textStartX,
                  y: 44 - (k * 9.5),
                  size: fSize,
                  font: helveticaBold,
                  color: rgb(0, 0, 0),
                });
              }
            }
          }

          mergedDoc.addPage(copiedPage);
        } else {
          const [copiedPage] = await mergedDoc.copyPages(invoiceDoc, [item.pageIndex]);
          mergedDoc.addPage(copiedPage);
        }

        if (idx % 5 === 0 || idx === mergeSequence.length - 1) {
          const pct = 75 + Math.round((idx / mergeSequence.length) * 20);
          setAjioState(prev => ({ ...prev, mergeProgress: pct }));
          await new Promise(r => setTimeout(r, 0));
        }
      }

      setAjioState(prev => ({
        ...prev,
        mergeProgress: 98,
        mergeStatusText: 'Finalizing PDF download...',
      }));

      const mergedBytes = await mergedDoc.save();
      const blob = new Blob([mergedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const dateTag = new Date().toISOString().slice(0, 10);
      const filename = `Ajio_Matched_Labels_Invoices_${dateTag}.pdf`;

      const matchStats = {
        totalLabels: labelTotalPages,
        totalInvoices: invoiceTotalPages,
        totalPages: mergeSequence.length,
        fullyMatchedCount: matchedPairs.filter(p => p.matchedInvoices.length > 0).length,
        unmatchedLabelsCount: matchedPairs.filter(p => p.matchedInvoices.length === 0).length,
        unmatchedInvoicesCount: unmatchedInvoices.length,
        matchedPairs,
        unmatchedInvoices,
      };

      const downloadInfo = {
        type: 'single',
        url,
        filename,
        blob,
        totalPages: mergeSequence.length,
        labelCount: labelTotalPages,
        invoiceCount: invoiceTotalPages,
        matchStats,
      };

      setAjioState(prev => ({
        ...prev,
        isMerging: false,
        mergeProgress: 100,
        mergeStatusText: 'Completed!',
        mergedDownload: downloadInfo,
        matchStats,
      }));

      updateMarketplaceState('ajio', {
        downloadReady: downloadInfo,
        isProcessing: false,
      });

      // Auto trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast?.(`Success! Merged ${mergeSequence.length} pages matched by customer name.`, 'success');
    } catch (err) {
      console.error('Error during Ajio PDF merge:', err);
      setAjioState(prev => ({
        ...prev,
        isMerging: false,
        error: err.message,
        mergeStatusText: 'Error occurred',
      }));
      showToast?.('Failed to merge PDFs: ' + err.message, 'error');
    }
  };

  const handleSelectMarketplace = (id) => {
    setSelectedMarketplace(id);
    localStorage.setItem('om_selected_marketplace', id);
    // Clear file input so re-selecting files triggers onChange on the newly selected marketplace
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Close any open popups when switching marketplaces
    setShowDuplicateModal(false);
    setShowSkuModal(false);
    setShowPreviewModal(false);
  };

  const activeMarketplace = MARKETPLACES.find(m => m.id === selectedMarketplace) || MARKETPLACES.find(m => m.id === 'meesho');

  // Collapsible cards state
  const [reportOpen, setReportOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(true);

  // Current active marketplace state
  const currentMpState = marketplaceStates[selectedMarketplace] || createInitialMarketplaceState();
  const {
    files,
    isProcessing,
    processingProgress,
    metrics,
    parsedLabels,
    duplicateList,
    skuSummary,
    courierSummary,
    downloadReady,
    labelAction,
    cropNudge,
    sortSku,
    sortCourier,
    sortQuantity,
    outputType,
    addPackingSlip,
  } = currentMpState;

  // Setters bound to current active marketplace
  const setFiles = (updater) => {
    updateMarketplaceState(selectedMarketplace, prev => ({
      files: typeof updater === 'function' ? updater(prev.files) : updater,
    }));
  };

  const setDownloadReady = (val) => {
    updateMarketplaceState(selectedMarketplace, { downloadReady: val });
  };

  const setLabelAction = (val) => {
    updateMarketplaceState(selectedMarketplace, { labelAction: val });
  };

  const setCropNudge = (updater) => {
    updateMarketplaceState(selectedMarketplace, prev => ({
      cropNudge: typeof updater === 'function' ? updater(prev.cropNudge) : updater,
    }));
  };

  const setSortSku = (val) => {
    updateMarketplaceState(selectedMarketplace, { sortSku: val });
  };

  const setSortCourier = (val) => {
    updateMarketplaceState(selectedMarketplace, { sortCourier: val });
  };

  const setSortQuantity = (val) => {
    updateMarketplaceState(selectedMarketplace, { sortQuantity: val });
  };

  const setOutputType = (val) => {
    updateMarketplaceState(selectedMarketplace, { outputType: val });
  };

  const setAddPackingSlip = (val) => {
    updateMarketplaceState(selectedMarketplace, { addPackingSlip: val });
  };

  // Modals state
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showSkuModal, setShowSkuModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Settings State: Global Branding / Preferences (persisted in localStorage)
  const [printDateTime, setPrintDateTime] = useState(() => {
    try {
      const saved = localStorage.getItem('label_print_datetime');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [printPageNumber, setPrintPageNumber] = useState(() => {
    try {
      const saved = localStorage.getItem('label_print_pagenum');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

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

  // Follow Us Page Option (Matching User Request)
  const [printFollowUs, setPrintFollowUs] = useState(() => {
    try {
      return localStorage.getItem('label_follow_us_enabled') === 'true';
    } catch {
      return false;
    }
  });
  const [followUsLink, setFollowUsLink] = useState(() => {
    try {
      return localStorage.getItem('label_follow_us_link') || '';
    } catch {
      return '';
    }
  });
  const [isFollowUsSaved, setIsFollowUsSaved] = useState(false);

  const handleSaveFollowUs = () => {
    try {
      localStorage.setItem('label_follow_us_link', followUsLink.trim());
      localStorage.setItem('label_follow_us_enabled', String(printFollowUs));
      setIsFollowUsSaved(true);
      if (showToast) showToast('Follow Us link saved successfully!', 'success');
      setTimeout(() => setIsFollowUsSaved(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  // Handle uploaded files strictly for current marketplace
  const handleFiles = (selectedFiles) => {
    const valid = Array.from(selectedFiles).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (valid.length === 0) {
      if (showToast) showToast('Please select valid PDF files', 'error');
      return;
    }
    updateMarketplaceState(selectedMarketplace, prev => {
      if (prev.downloadReady?.url) {
        try { URL.revokeObjectURL(prev.downloadReady.url); } catch (e) {}
      }
      return {
        files: [...prev.files, ...valid],
        downloadReady: null,
      };
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (idx) => {
    updateMarketplaceState(selectedMarketplace, prev => {
      if (prev.downloadReady?.url) {
        try { URL.revokeObjectURL(prev.downloadReady.url); } catch (e) {}
      }
      return {
        files: prev.files.filter((_, i) => i !== idx),
        downloadReady: null,
      };
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearAllFiles = () => {
    updateMarketplaceState(selectedMarketplace, prev => {
      if (prev.downloadReady?.url) {
        try { URL.revokeObjectURL(prev.downloadReady.url); } catch (e) {}
      }
      return {
        files: [],
        downloadReady: null,
        metrics: { totalLabels: 0, success: 0, duplicates: 0, ocrFailed: 0 },
        parsedLabels: [],
        duplicateList: [],
        skuSummary: {},
        courierSummary: {},
      };
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Helper to extract text and details from a PDF page
  const extractLabelData = async (pdfDoc, pageNum, marketplaceId = selectedMarketplace) => {
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
      if (marketplaceId === 'flipcart') {
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

        // 5. Detect SKU, Size & Quantity from Flipkart SKU table
        let sku = 'Flipkart-Item';
        let size = '';
        let quantity = 1;

        const strs = content.items.map(it => it.str);
        const skuStartIdx = strs.findIndex(s => /SKU\s*ID/i.test(s));
        if (skuStartIdx !== -1) {
          const skuEndIdx = strs.findIndex((s, idx) => idx > skuStartIdx && (
            /Tax\s*Invoice/i.test(s) || 
            /Order\s*Id/i.test(s) ||
            /FMP[CP]\d/i.test(s) ||
            /Use\s*Transparent/i.test(s)
          ));
          const section = strs.slice(skuStartIdx, skuEndIdx !== -1 ? skuEndIdx : skuStartIdx + 30);
          for (let i = 0; i < section.length; i++) {
            const m = section[i].match(/^\s*(\d+)\s+([A-Za-z0-9_\-\.\/\(\)\s]+?)\s*\|/);
            if (m) {
              sku = m[2].trim().replace(/\s+/g, ' ');
              for (let j = i + 1; j < section.length; j++) {
                if (/^\s*\d+\s+[A-Za-z0-9_\-\.\/\(\)\s]+?\s*\|/.test(section[j])) break;
                const qm = section[j].trim().match(/^(\d+)$/);
                if (qm) {
                  quantity = parseInt(qm[1], 10) || 1;
                  break;
                }
              }
              break;
            }
          }
        } else {
          // Fallback if text stream varies
          const skuTableMatch = rawText.match(/SKU\s*ID\s*\|?\s*Description[\s\S]*?(?:1\s+)?([A-Za-z0-9_\-\.\/\(\)\s]{3,50}?)\s*\|/i);
          if (skuTableMatch && skuTableMatch[1].trim().length > 1) {
            sku = skuTableMatch[1].trim().replace(/\s+/g, ' ');
          }
          const qtyMatch = rawText.match(/SKU\s*ID\s*\|?\s*Description[\s\S]*?\b(\d+)\s*(?:\n|$|FMP[CP]|Use\s+Transparent)/i);
          if (qtyMatch) quantity = parseInt(qtyMatch[1], 10) || 1;
        }

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
      // 1. Detect Courier Name with priority on known logistics networks
      let baseCourier = '';
      if (/\bvalmo\b/i.test(rawText) || /\bVL\d{8,}/i.test(rawText) || /\bvalmoplus\b/i.test(rawText)) {
        baseCourier = 'Valmo';
      } else if (/\bshadowfax\b/i.test(rawText) || /\bSF\d{8,}/i.test(rawText)) {
        baseCourier = 'Shadowfax';
      } else if (/\bdelhivery\b/i.test(rawText)) {
        baseCourier = 'Delhivery';
      } else if (/\bxpress\s*bees\b/i.test(rawText) || /\bxpressbees\b/i.test(rawText)) {
        baseCourier = 'Xpress Bees';
      } else if (/\becom\s*express\b/i.test(rawText)) {
        baseCourier = 'Ecom Express';
      } else if (/\bdtdc\b/i.test(rawText)) {
        baseCourier = 'DTDC';
      } else if (/\bblue\s*dart\b/i.test(rawText) || /\bbluedart\b/i.test(rawText)) {
        baseCourier = 'Blue Dart';
      } else if (/\bsmartr\b/i.test(rawText)) {
        baseCourier = 'Smartr';
      } else if (/\bamazon\b/i.test(rawText) || /\bats\b/i.test(rawText)) {
        baseCourier = 'Amazon Shipping';
      } else if (/\bekart\b/i.test(rawText)) {
        baseCourier = 'Ekart';
      } else {
        // Fallback courier regex before "Pickup"
        const m = rawText.match(/([A-Za-z0-9\-]+(?:\s+[A-Za-z0-9\-]+)?)\s+Pickup/i);
        if (m) {
          baseCourier = (m[1] || m[0]).replace(/[\r\n]+/g, ' ').trim();
          baseCourier = baseCourier.replace(/^(?:exchange|return|forward|pickup|app|via|by|cash|cod|prepaid|amount|rs)\s+/i, '').trim();
        }
        if (!baseCourier || baseCourier.length < 2 || /^(?:the|on|app)$/i.test(baseCourier)) {
          baseCourier = 'Unknown Courier';
        }
      }

      // If this is an Exchange order, mark as Exchange [Courier] matching Image 1
      const isExchange = /\bexchange\b/i.test(rawText);
      let courier = isExchange ? `Exchange  ${baseCourier}` : baseCourier;
      courier = String(courier).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();

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
      let storeName = 'SHRINANT';
      const returnMatch = rawText.match(/If\s+undelivered,?\s+return\s+to:?[\s\r\n]+([^\r\n,]+)/i);
      if (returnMatch && returnMatch[1].trim().length > 1) {
        storeName = returnMatch[1].trim().slice(0, 30);
      } else {
        const storeMatch = rawText.match(/(?:Sold\s*by|Supplier|Seller)[\s:#-]*([A-Za-z0-9\s]{3,30})/i);
        if (storeMatch) storeName = storeMatch[1].trim().slice(0, 30);
      }

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
    const targetMarketplace = selectedMarketplace;
    const targetState = marketplaceStates[targetMarketplace] || createInitialMarketplaceState();
    const targetFiles = targetState.files;
    const targetLabelAction = targetState.labelAction;
    const targetCropNudge = targetState.cropNudge;
    const targetOutputType = targetState.outputType;
    const targetAddPackingSlip = targetState.addPackingSlip;
    const targetSortCourier = targetState.sortCourier;
    const targetSortSku = targetState.sortSku;
    const targetSortQuantity = targetState.sortQuantity;

    if (!targetFiles || targetFiles.length === 0) {
      if (showToast) showToast('Please upload at least one PDF file', 'warning');
      return;
    }

    updateMarketplaceState(targetMarketplace, {
      isProcessing: true,
      processingProgress: 10,
    });

    try {
      const allParsed = [];
      const seenAwbs = new Map();
      const duplicateItems = [];
      let ocrFailedCount = 0;

      // STEP 1: Parse and analyze all labels
      let fileIdx = 0;
      for (const file of targetFiles) {
        const arrayBuf = await file.arrayBuffer();
        const pdfJsDoc = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
        const totalPgs = pdfJsDoc.numPages;

        for (let p = 1; p <= totalPgs; p++) {
          const extracted = await extractLabelData(pdfJsDoc, p, targetMarketplace);
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

      updateMarketplaceState(targetMarketplace, { processingProgress: 40 });

      // Summaries
      const skuMap = {};
      const courierMap = {};
      allParsed.forEach(item => {
        skuMap[item.sku] = (skuMap[item.sku] || 0) + item.quantity;
        courierMap[item.courier] = (courierMap[item.courier] || 0) + 1;
      });

      updateMarketplaceState(targetMarketplace, {
        metrics: {
          totalLabels: allParsed.length,
          success: allParsed.length - ocrFailedCount,
          duplicates: duplicateItems.length,
          ocrFailed: ocrFailedCount
        },
        duplicateList: duplicateItems,
        skuSummary: skuMap,
        courierSummary: courierMap,
        parsedLabels: allParsed
      });

      // STEP 2: Rearrange and sort labels based on user filter selections (Courier wise, SKU wise, Quantity wise)
      let sortedLabels = [...allParsed];

      sortedLabels.sort((a, b) => {
        // Priority 1: Courier wise grouping (matches user screenshot)
        if (targetSortCourier) {
          const cComp = (a.courier || '').localeCompare(b.courier || '');
          if (cComp !== 0) return cComp;
        }

        // Priority 2: SKU wise sorting
        if (targetSortSku) {
          const sComp = (a.sku || '').localeCompare(b.sku || '');
          if (sComp !== 0) return sComp;
        }

        // Priority 3: Quantity wise sorting
        if (targetSortQuantity) {
          const qComp = (a.quantity || 0) - (b.quantity || 0);
          if (qComp !== 0) return qComp;
        }

        // Default secondary grouping if only Courier wise is selected: group identical SKUs within courier
        if (targetSortCourier && !targetSortSku) {
          const sComp = (a.sku || '').localeCompare(b.sku || '');
          if (sComp !== 0) return sComp;
        }

        return (a.awb || '').localeCompare(b.awb || '');
      });

      updateMarketplaceState(targetMarketplace, { processingProgress: 60 });

      // Helper function to build a cropped PDF from an array of label items
      // 100% Matching LabelMantra.in's exact page crop architecture:
      // Uses direct copyPages + translateContent + setCropBox + setMediaBox
      // This physically clips off everything below the top 345.6pt (TAX INVOICE completely eliminated)
      const buildPdf = async (items, title = (targetMarketplace === 'flipcart' ? 'Flipkart Shipping Labels' : 'Meesho Shipping Labels')) => {
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

        // Pre-load source PDFDocuments as an array matching targetFiles
        const srcDocs = [];
        for (let fi = 0; fi < targetFiles.length; fi++) {
          const bytes = await targetFiles[fi].arrayBuffer();
          srcDocs.push(await PDFDocument.load(bytes));
        }

        const totalItems = items.length;

        // Pre-embed QR code and badge image cache for Follow Us panel
        let qrDataUrl = null;
        const badgeImageCache = new Map();

        if (printFollowUs && followUsLink.trim()) {
          try {
            qrDataUrl = await QRCode.toDataURL(followUsLink.trim(), {
              margin: 1,
              width: 240,
              errorCorrectionLevel: 'M',
            });
          } catch (qrErr) {
            console.warn('Failed to generate Follow Us QR code:', qrErr);
          }
        }

        const getBadgeImage = async (storeName, isLarge) => {
          if (!qrDataUrl) return null;
          const cacheKey = `${storeName || 'default'}_${isLarge ? 'L' : 'S'}`;
          if (badgeImageCache.has(cacheKey)) {
            return badgeImageCache.get(cacheKey);
          }
          try {
            const badgeDataUrl = await generateFollowUsBadgeDataUrl(storeName, qrDataUrl, isLarge);
            const badgeBase64 = badgeDataUrl.replace(/^data:image\/png;base64,/, '');
            const badgeBytes = Uint8Array.from(atob(badgeBase64), c => c.charCodeAt(0));
            const embedded = await outDoc.embedPng(badgeBytes);
            badgeImageCache.set(cacheKey, embedded);
            return embedded;
          } catch (bErr) {
            console.warn('Failed to generate Follow Us badge image:', bErr);
            return null;
          }
        };

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const singleDoc = srcDocs[item.fileIndex];
          if (!singleDoc) continue;

          const srcPage = singleDoc.getPage(item.pageIndex);
          const pageSize = srcPage.getSize();

          if (targetLabelAction === 'crop') {
            if (targetMarketplace === 'flipcart') {
              // ================= FLIPCART TIGHT CROPPING (VERY LITTLE WHITE SPACE) =================
              let cLeft = item.cropBox?.left ?? 189.5;
              let cRight = item.cropBox?.right ?? 406.2;
              let cTop = item.cropBox?.top ?? 813.5;
              let cBottom = item.cropBox?.bottom ?? 464.0;

              // Apply crop nudge fine-tuning
              cTop = Math.min(pageSize.height, cTop + targetCropNudge);
              cBottom = Math.max(0, cBottom - targetCropNudge);

              const srcW = Math.max(10, cRight - cLeft);
              const srcH = Math.max(10, cTop - cBottom);

              const embeddedPage = await outDoc.embedPage(srcPage, {
                left: cLeft,
                bottom: cBottom,
                right: cRight,
                top: cTop,
              });

              // Determine footer height dynamically based on Follow Us, Thanks Line and Date/Page number settings
              const hasFollowUs = Boolean(printFollowUs && followUsLink.trim() && qrDataUrl);
              const hasThanks = Boolean(printThanksLine && thanksLineText.trim());
              const hasDateOrPage = Boolean(printDateTime || printPageNumber);
              const followUsH = hasFollowUs ? 44 : 0;
              const thanksH = hasThanks ? 20 : 0;
              const metaH = hasDateOrPage ? 18 : 0;
              const footerH = followUsH + thanksH + metaH + (hasFollowUs ? 6 : 0);
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

              // Bottom margin for Date & Page number: 7.5 pt from bottom edge
              const metaY = 7.5;

              // Date/Time footer
              if (printDateTime) {
                targetPage.drawText(batchDateTimeStr, {
                  x: padding + 2,
                  y: metaY,
                  size: 7,
                  font: helveticaBold,
                  color: rgb(0, 0, 0),
                });
              }

              // Page Number
              if (printPageNumber) {
                const pageStr = `${i + 1}`;
                const textW = helveticaBold.widthOfTextAtSize(pageStr, 7.5);
                targetPage.drawText(pageStr, {
                  x: targetW - textW - padding - 2,
                  y: metaY,
                  size: 7.5,
                  font: helveticaBold,
                  color: rgb(0, 0, 0),
                });
              }

              // 1. Follow Us Panel (Positioned BETWEEN Label and Thanks Line)
              if (hasFollowUs) {
                const cardW = Math.min(300, targetW - 16);
                const cardH = 36;
                const cardX = (targetW - cardW) / 2;
                const cardY = padding + footerH - cardH - 2;

                const badgeImg = await getBadgeImage(item.storeName, false);
                if (badgeImg) {
                  targetPage.drawImage(badgeImg, {
                    x: cardX,
                    y: cardY,
                    width: cardW,
                    height: cardH,
                  });
                }
              }

              // 2. Thanks Line (below Follow Us panel, above date)
              if (hasThanks) {
                const thankStr = thanksLineText.trim();
                const fontSize = hasDateOrPage ? 9.5 : 10.5;
                let drawFontSize = fontSize;
                let textW = helveticaBold.widthOfTextAtSize(thankStr, drawFontSize);
                if (textW > targetW - 12) {
                  drawFontSize = Math.max(6, Math.floor(fontSize * (targetW - 12) / textW));
                  textW = helveticaBold.widthOfTextAtSize(thankStr, drawFontSize);
                }
                const thanksY = hasDateOrPage ? 21 : (hasFollowUs ? (footerH - followUsH - 18) : 10);
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
              const labelH = Math.min(pageSize.height, 345.6 + targetCropNudge);
              const hasFollowUs = Boolean(printFollowUs && followUsLink.trim() && qrDataUrl);
              const hasThanks = Boolean(printThanksLine && thanksLineText.trim());
              const hasDateOrPage = Boolean(printDateTime || printPageNumber);
              const followUsH = hasFollowUs ? 46 : 0;
              const thanksH = hasThanks ? 20 : 0;
              const metaH = hasDateOrPage ? 18 : 0;
              const extraH = followUsH + thanksH + metaH + (hasFollowUs ? 6 : 0);
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

              const metaY = 8;

              // Date/Time footer (bold font, solid black, with seconds)
              if (printDateTime) {
                targetPage.drawText(batchDateTimeStr, {
                  x: 12,
                  y: metaY,
                  size: 8,
                  font: helveticaBold,
                  color: rgb(0, 0, 0),
                });
              }

              // Page Number (bold font, solid black)
              if (printPageNumber) {
                const pageStr = `${i + 1}`;
                const textW = helveticaBold.widthOfTextAtSize(pageStr, 8.5);
                targetPage.drawText(pageStr, {
                  x: pW - textW - 14,
                  y: metaY,
                  size: 8.5,
                  font: helveticaBold,
                  color: rgb(0, 0, 0),
                });
              }

              // 1. Follow Us Panel (Positioned BETWEEN Label and Thanks Line)
              if (hasFollowUs) {
                const cardW = Math.min(320, pW - 24);
                const cardH = 38;
                const cardX = (pW - cardW) / 2;
                const cardY = extraH - cardH - 4;

                const badgeImg = await getBadgeImage(item.storeName, false);
                if (badgeImg) {
                  targetPage.drawImage(badgeImg, {
                    x: cardX,
                    y: cardY,
                    width: cardW,
                    height: cardH,
                  });
                }
              }

              // 2. Thanks Line (Placed Below Follow Us Panel, Above Date)
              if (hasThanks) {
                const thankText = thanksLineText.trim();
                const fontSize = hasDateOrPage ? 10 : 11;
                let drawFontSize = fontSize;
                let textW = helveticaBold.widthOfTextAtSize(thankText, drawFontSize);
                if (textW > pW - 16) {
                  drawFontSize = Math.max(7, Math.floor(fontSize * (pW - 16) / textW));
                  textW = helveticaBold.widthOfTextAtSize(thankText, drawFontSize);
                }
                const thanksY = hasDateOrPage ? 22 : (hasFollowUs ? (extraH - followUsH - 20) : 10);
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

            const hasFollowUs = Boolean(printFollowUs && followUsLink.trim() && qrDataUrl);
            const hasThanks = Boolean(printThanksLine && thanksLineText.trim());
            const hasDateOrPage = Boolean(printDateTime || printPageNumber);

            const metaY = 10;
            const thanksY = hasDateOrPage ? 28 : 14;
            const cardH = 88;
            const cardY = hasThanks ? (thanksY + 24) : (hasDateOrPage ? 28 : 14);

            const footerClearH = hasFollowUs ? (cardY + cardH + 6) : (hasThanks ? (thanksY + 16) : (hasDateOrPage ? 24 : 0));
            if (footerClearH > 0) {
              targetPage.drawRectangle({
                x: 0,
                y: 0,
                width: pW,
                height: footerClearH,
                color: rgb(1, 1, 1),
              });
            }

            // 1. Date / Time (Solid black bold, centered)
            if (printDateTime) {
              const textW = helveticaBold.widthOfTextAtSize(batchDateTimeStr, 8.5);
              targetPage.drawText(batchDateTimeStr, {
                x: (pW - textW) / 2,
                y: metaY,
                size: 8.5,
                font: helveticaBold,
                color: rgb(0, 0, 0)
              });
            }

            // 2. Page Number (Solid black bold, right aligned)
            if (printPageNumber) {
              const pageStr = `${i + 1}`;
              const textW = helveticaBold.widthOfTextAtSize(pageStr, 8.5);
              targetPage.drawText(pageStr, {
                x: pW - textW - 20,
                y: metaY,
                size: 8.5,
                font: helveticaBold,
                color: rgb(0, 0, 0)
              });
            }

            // 3. Thanks Line (Placed Below Follow Us Panel, Above Date)
            if (hasThanks) {
              const thankText = thanksLineText.trim();
              const fontSize = 11;
              let drawFontSize = fontSize;
              let textW = helveticaBold.widthOfTextAtSize(thankText, drawFontSize);
              if (textW > pW - 24) {
                drawFontSize = Math.max(7, Math.floor(fontSize * (pW - 24) / textW));
                textW = helveticaBold.widthOfTextAtSize(thankText, drawFontSize);
              }
              targetPage.drawText(thankText, {
                x: (pW - textW) / 2,
                y: thanksY,
                size: drawFontSize,
                font: helveticaBold,
                color: rgb(0, 0, 0),
              });
            }

            // 4. Follow Us Panel (Large, attractive boutique design matching Image 2)
            if (hasFollowUs) {
              const cardW = Math.min(470, pW - 28);
              const cardX = (pW - cardW) / 2;

              const badgeImg = await getBadgeImage(item.storeName, true);
              if (badgeImg) {
                targetPage.drawImage(badgeImg, {
                  x: cardX,
                  y: cardY,
                  width: cardW,
                  height: cardH,
                });
              }
            }
          }
        }

        // ================= PACKING LIST (100% Matching Image 2) =================
        if (targetAddPackingSlip) {
          const pageW = 595.28;
          const pageH = 841.89;
          const marginX = 36;
          const tableW = pageW - marginX * 2; // 523.28 pt

          // Aggregate SKU summary & Courier summary from the items in this PDF
          const skuSummaryMap = {};
          const courierSummaryMap = {};
          let totalPackingQty = 0;
          let totalParcels = items.length;

          items.forEach(it => {
            const sName = it.sku || 'Unknown Item';
            const sColor = it.color || '';
            const sSize = it.size || '';
            const q = it.quantity || 1;
            totalPackingQty += q;

            // Group by SKU + Color + Size so each variant displays on its own row
            const skuKey = `${sName}__${sColor}__${sSize}`;
            if (!skuSummaryMap[skuKey]) {
              skuSummaryMap[skuKey] = { sku: sName, color: sColor, size: sSize, qty: 0 };
            }
            skuSummaryMap[skuKey].qty += q;

            let rawCourier = it.courier || (targetMarketplace === 'flipcart' ? 'E-Kart Logistics' : 'Valmo');
            rawCourier = String(rawCourier).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
            const cName = rawCourier || 'Valmo';
            if (!courierSummaryMap[cName]) {
              courierSummaryMap[cName] = { parcels: 0, qty: 0 };
            }
            courierSummaryMap[cName].parcels += 1;
            courierSummaryMap[cName].qty += q;
          });

          // Sort SKUs by SKU Name, then Size
          const sortedPackingSkus = Object.keys(skuSummaryMap).sort((a, b) => {
            const itemA = skuSummaryMap[a];
            const itemB = skuSummaryMap[b];
            if (itemA.sku !== itemB.sku) return itemA.sku.localeCompare(itemB.sku);
            return itemA.size.localeCompare(itemB.size);
          });
          const sortedPackingCouriers = Object.keys(courierSummaryMap).sort();

          let curSlipPage = outDoc.addPage([pageW, pageH]);
          let curY = pageH - 42;

          // Theme Palette
          const cDark = rgb(15 / 255, 23 / 255, 42 / 255);       // Slate 900
          const cHeaderBg = rgb(30 / 255, 41 / 255, 59 / 255);   // Slate 800
          const cWhite = rgb(1, 1, 1);
          const cGrayText = rgb(100 / 255, 116 / 255, 139 / 255); // Slate 500
          const cBorder = rgb(203 / 255, 213 / 255, 225 / 255);   // Slate 300
          const cBorderLight = rgb(226 / 255, 232 / 255, 240 / 255); // Slate 200
          const cRowAlt = rgb(248 / 255, 250 / 255, 252 / 255);   // Slate 50
          const cCardBg = rgb(241 / 255, 245 / 255, 249 / 255);   // Slate 100
          const cTotalBg = rgb(238 / 255, 242 / 255, 246 / 255);
          const cPrimary = rgb(37 / 255, 99 / 255, 235 / 255);    // Blue 600

          // 1. TOP HEADER SECTION
          curSlipPage.drawText('PACKING LIST & DISPATCH SUMMARY', {
            x: marginX,
            y: curY,
            size: 17,
            font: helveticaBold,
            color: cDark,
          });

          const mpLabel = targetMarketplace === 'flipcart' ? 'Flipkart' : 'Meesho';
          const subText = `Marketplace: ${mpLabel}  •  Generated: ${batchDateTimeStr}`;
          curSlipPage.drawText(subText, {
            x: marginX,
            y: curY - 14,
            size: 8.5,
            font: helveticaFont,
            color: cGrayText,
          });

          // Top Right Badge: Total Parcels Pill
          const pillW = 105;
          const pillH = 24;
          curSlipPage.drawRectangle({
            x: marginX + tableW - pillW,
            y: curY - 15,
            width: pillW,
            height: pillH,
            color: cCardBg,
            borderColor: cBorder,
            borderWidth: 1,
          });
          const pillText = `${totalParcels} PARCELS`;
          const pillTextW = helveticaBold.widthOfTextAtSize(pillText, 10);
          curSlipPage.drawText(pillText, {
            x: marginX + tableW - pillW + (pillW - pillTextW) / 2,
            y: curY - 8,
            size: 10,
            font: helveticaBold,
            color: cPrimary,
          });

          curY -= 32;

          // 2. QUICK KPI SUMMARY CARDS
          const cardGap = 8;
          const cardCount = 4;
          const cardW = (tableW - cardGap * (cardCount - 1)) / cardCount;
          const cardH = 36;

          const kpis = [
            { label: 'TOTAL PARCELS', val: String(totalParcels) },
            { label: 'TOTAL QUANTITY', val: String(totalPackingQty) },
            { label: 'SKU VARIANTS', val: String(sortedPackingSkus.length) },
            { label: 'COURIER PARTNERS', val: String(sortedPackingCouriers.length) },
          ];

          kpis.forEach((kpi, idx) => {
            const kX = marginX + idx * (cardW + cardGap);
            curSlipPage.drawRectangle({
              x: kX,
              y: curY - cardH,
              width: cardW,
              height: cardH,
              color: cRowAlt,
              borderColor: cBorderLight,
              borderWidth: 1,
            });
            // Label
            curSlipPage.drawText(kpi.label, {
              x: kX + 8,
              y: curY - 12,
              size: 6.5,
              font: helveticaBold,
              color: cGrayText,
            });
            // Value
            curSlipPage.drawText(kpi.val, {
              x: kX + 8,
              y: curY - 29,
              size: 14,
              font: helveticaBold,
              color: cDark,
            });
          });

          curY -= (cardH + 20);

          // Helper function to draw a modern bordered table
          const drawModernTable = ({
            title,
            badge,
            columns,
            rows,
            totalRow
          }) => {
            // Check if room for title + header + at least 2 rows
            if (curY < 120) {
              curSlipPage = outDoc.addPage([pageW, pageH]);
              curY = pageH - 45;
            }

            // Section Header Title
            curSlipPage.drawText(title, {
              x: marginX,
              y: curY,
              size: 12,
              font: helveticaBold,
              color: cDark,
            });

            if (badge) {
              curSlipPage.drawText(badge, {
                x: marginX + helveticaBold.widthOfTextAtSize(title, 12) + 8,
                y: curY,
                size: 9,
                font: helveticaFont,
                color: cGrayText,
              });
            }

            curY -= 14;

            const rowH = 20;
            const headerH = 22;

            const drawTableHeader = () => {
              // Table Header Background
              curSlipPage.drawRectangle({
                x: marginX,
                y: curY - headerH,
                width: tableW,
                height: headerH,
                color: cHeaderBg,
                borderColor: cHeaderBg,
                borderWidth: 1,
              });

              // Table Header Text
              let curColX = marginX;
              columns.forEach(col => {
                const textW = helveticaBold.widthOfTextAtSize(col.label, 9);
                let tX = curColX + 6;
                if (col.align === 'center') tX = curColX + (col.width - textW) / 2;
                if (col.align === 'right') tX = curColX + col.width - textW - 6;

                curSlipPage.drawText(col.label, {
                  x: tX,
                  y: curY - headerH + 7,
                  size: 9,
                  font: helveticaBold,
                  color: cWhite,
                });
                curColX += col.width;
              });

              curY -= headerH;
            };

            drawTableHeader();

            // Table Rows
            rows.forEach((rData, rIdx) => {
              if (curY - rowH < 50) {
                curSlipPage = outDoc.addPage([pageW, pageH]);
                curY = pageH - 45;
                drawTableHeader();
              }

              const isAlt = rIdx % 2 === 1;
              // Row Background
              curSlipPage.drawRectangle({
                x: marginX,
                y: curY - rowH,
                width: tableW,
                height: rowH,
                color: isAlt ? cRowAlt : cWhite,
                borderColor: cBorderLight,
                borderWidth: 0.5,
              });

              // Cell Data & Vertical dividers
              let cX = marginX;
              columns.forEach((col, cIdx) => {
                const valStr = String(rData[cIdx] || '');
                const textW = (col.bold ? helveticaBold : helveticaFont).widthOfTextAtSize(valStr, 9);
                let tX = cX + 6;
                if (col.align === 'center') tX = cX + (col.width - textW) / 2;
                if (col.align === 'right') tX = cX + col.width - textW - 6;

                curSlipPage.drawText(valStr.slice(0, 50), {
                  x: tX,
                  y: curY - rowH + 6,
                  size: 9,
                  font: col.bold ? helveticaBold : helveticaFont,
                  color: cDark,
                });

                // Vertical divider line
                if (cIdx < columns.length - 1) {
                  curSlipPage.drawLine({
                    start: { x: cX + col.width, y: curY },
                    end: { x: cX + col.width, y: curY - rowH },
                    thickness: 0.5,
                    color: cBorderLight,
                  });
                }
                cX += col.width;
              });

              curY -= rowH;
            });

            // Total Row
            if (totalRow) {
              if (curY - rowH < 45) {
                curSlipPage = outDoc.addPage([pageW, pageH]);
                curY = pageH - 45;
              }

              curSlipPage.drawRectangle({
                x: marginX,
                y: curY - rowH,
                width: tableW,
                height: rowH,
                color: cTotalBg,
                borderColor: cBorder,
                borderWidth: 1,
              });

              let cX = marginX;
              columns.forEach((col, cIdx) => {
                const valStr = String(totalRow[cIdx] || '');
                if (valStr) {
                  const textW = helveticaBold.widthOfTextAtSize(valStr, 9.5);
                  let tX = cX + 6;
                  if (col.align === 'center') tX = cX + (col.width - textW) / 2;
                  if (col.align === 'right') tX = cX + col.width - textW - 6;

                  curSlipPage.drawText(valStr, {
                    x: tX,
                    y: curY - rowH + 6,
                    size: 9.5,
                    font: helveticaBold,
                    color: cDark,
                  });
                }

                if (cIdx < columns.length - 1) {
                  curSlipPage.drawLine({
                    start: { x: cX + col.width, y: curY },
                    end: { x: cX + col.width, y: curY - rowH },
                    thickness: 0.5,
                    color: cBorder,
                  });
                }
                cX += col.width;
              });
              curY -= rowH;
            }

            curY -= 22; // Spacing after table
          };

          // 3. DRAW SKU SUMMARY TABLE
          const skuColumns = [
            { label: '#', width: 28, align: 'center', bold: true },
            { label: 'SKU Name', width: 260, align: 'left', bold: false },
            { label: 'Color', width: 95, align: 'center', bold: false },
            { label: 'Size', width: 70, align: 'center', bold: false },
            { label: 'Qty', width: 70.28, align: 'right', bold: true },
          ];

          const skuRows = sortedPackingSkus.map((key, idx) => {
            const it = skuSummaryMap[key];
            return [
              String(idx + 1),
              it.sku,
              it.color || '-',
              it.size || '-',
              String(it.qty),
            ];
          });

          const skuTotal = [
            '',
            'Total SKU Quantity',
            '',
            '',
            String(totalPackingQty),
          ];

          drawModernTable({
            title: '1. SKU & Variant Summary',
            badge: `(${skuRows.length} Distinct Variants)`,
            columns: skuColumns,
            rows: skuRows,
            totalRow: skuTotal,
          });

          // 4. DRAW COURIER SUMMARY TABLE
          const courierColumns = [
            { label: '#', width: 28, align: 'center', bold: true },
            { label: 'Courier Partner', width: 295, align: 'left', bold: false },
            { label: 'Parcel Count', width: 100, align: 'center', bold: true },
            { label: 'Total Qty', width: 100.28, align: 'right', bold: true },
          ];

          const courierRows = sortedPackingCouriers.map((cName, idx) => {
            const cData = courierSummaryMap[cName];
            return [
              String(idx + 1),
              cName,
              String(cData.parcels),
              String(cData.qty),
            ];
          });

          const courierTotal = [
            '',
            'Total Dispatch',
            String(totalParcels),
            String(totalPackingQty),
          ];

          drawModernTable({
            title: '2. Courier Logistics Summary',
            badge: `(${courierRows.length} Courier Networks)`,
            columns: courierColumns,
            rows: courierRows,
            totalRow: courierTotal,
          });

          // 5. FOOTER VERIFICATION NOTE
          if (curY > 50) {
            curSlipPage.drawRectangle({
              x: marginX,
              y: curY - 26,
              width: tableW,
              height: 26,
              color: cRowAlt,
              borderColor: cBorderLight,
              borderWidth: 0.5,
            });

            const footerNotice = 'HANDOVER VERIFICATION NOTE: Count and verify parcel barcode labels against the summary above before handing over to pickup executive.';
            const fnW = helveticaFont.widthOfTextAtSize(footerNotice, 7.5);
            curSlipPage.drawText(footerNotice, {
              x: marginX + (tableW - fnW) / 2,
              y: curY - 17,
              size: 7.5,
              font: helveticaFont,
              color: cGrayText,
            });
          }
        }

        return await outDoc.save();
      };

      updateMarketplaceState(targetMarketplace, { processingProgress: 80 });

      // STEP 3: Handle Output File Type
      const dateTag = new Date().toISOString().slice(0, 10);
      const mpPrefix = targetMarketplace === 'flipcart' ? 'Flipkart' : 'Meesho';

      let resultDownloadReady = null;

      if (targetOutputType === 'single') {
        const finalPdfBytes = await buildPdf(sortedLabels, `${mpPrefix} Shipping Labels`);
        const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        resultDownloadReady = {
          type: 'single',
          url,
          filename: `${mpPrefix}_Cropped_Labels_${dateTag}.pdf`,
          blob
        };
      } else if (targetOutputType === 'courier') {
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
        resultDownloadReady = {
          type: 'zip',
          url: zipUrl,
          filename: `${mpPrefix}_Labels_By_Courier_${dateTag}.zip`,
          blob: zipBlob
        };
      } else if (targetOutputType === 'quantity') {
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
        resultDownloadReady = {
          type: 'zip',
          url: zipUrl,
          filename: `${mpPrefix}_Labels_By_Quantity_${dateTag}.zip`,
          blob: zipBlob
        };
      } else if (targetOutputType === 'store') {
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
        resultDownloadReady = {
          type: 'zip',
          url: zipUrl,
          filename: `${mpPrefix}_Labels_By_Store_${dateTag}.zip`,
          blob: zipBlob
        };
      }

      updateMarketplaceState(targetMarketplace, {
        downloadReady: resultDownloadReady,
        processingProgress: 100,
        isProcessing: false,
      });

      const targetMpMeta = MARKETPLACES.find(m => m.id === targetMarketplace);
      if (showToast) showToast(`Successfully processed ${allParsed.length} labels for ${targetMpMeta?.name || mpPrefix}!`, 'success');
    } catch (err) {
      console.error(err);
      if (showToast) showToast(`Processing error: ${err.message}`, 'error');
      updateMarketplaceState(targetMarketplace, { isProcessing: false });
    } finally {
      updateMarketplaceState(targetMarketplace, { isProcessing: false });
    }
  };

  const handleDirectPrint = () => {
    const activeUrl = selectedMarketplace === 'ajio'
      ? (ajioState.mergedDownload?.url || downloadReady?.url)
      : downloadReady?.url;
    if (!activeUrl) return;
    const printWin = window.open(activeUrl);
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
              (Choose platform to process labels)
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
            const mpState = marketplaceStates[mp.id];
            const mpFilesCount = mp.id === 'ajio'
              ? ((ajioState.labelFile ? 1 : 0) + (ajioState.invoiceFile ? 1 : 0) + (ajioState.excelFile ? 1 : 0))
              : (mpState?.files?.length || 0);
            const mpIsProcessing = mp.id === 'ajio' ? ajioState.isMerging : mpState?.isProcessing;
            const mpHasDownload = mp.id === 'ajio' ? Boolean(ajioState.mergedDownload) : Boolean(mpState?.downloadReady);

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

                {mpFilesCount > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  }`}>
                    {mpFilesCount} {mpFilesCount === 1 ? 'file' : 'files'}
                  </span>
                )}

                {mpIsProcessing && (
                  <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                )}

                {mpHasDownload && !mpIsProcessing && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                )}

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
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                {activeMarketplace?.name} Label Cropping and sorting tools
              </h1>
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
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
            }}
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

                {/* 3. Follow Us Page Setting (Matching Image 2) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-blue-600" />
                      Follow Us Page
                    </label>
                  </div>

                  <div className="flex items-center gap-1.5 w-full">
                    {/* Tick mark checkbox (if tick mark then only print) */}
                    <label 
                      className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-xl border cursor-pointer transition-all select-none ${
                        printFollowUs ? 'bg-emerald-50 border-emerald-300 text-emerald-600 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                      }`}
                      title="If checked (tick mark), prints Follow Us QR panel on label"
                    >
                      <input
                        type="checkbox"
                        checked={printFollowUs}
                        onChange={(e) => {
                          setPrintFollowUs(e.target.checked);
                          localStorage.setItem('label_follow_us_enabled', String(e.target.checked));
                          if (showToast) showToast(e.target.checked ? 'Follow Us panel enabled' : 'Follow Us panel disabled', 'info');
                        }}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                      />
                    </label>

                    {/* Edit box for client to paste profile link */}
                    <input
                      type="text"
                      value={followUsLink}
                      onChange={(e) => {
                        setFollowUsLink(e.target.value);
                        setIsFollowUsSaved(false);
                      }}
                      placeholder="Paste your profile / store link here"
                      className="flex-1 min-w-0 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                    />

                    {/* Beside Save button with tick mark */}
                    <button
                      type="button"
                      onClick={handleSaveFollowUs}
                      className={`shrink-0 px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all shadow-sm cursor-pointer whitespace-nowrap ${
                        isFollowUsSaved 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}
                      title="Save profile link"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isFollowUsSaved ? 'Saved' : 'Save'}</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 pl-0.5">
                    Prints store name & QR code on label until changed.
                  </p>
                </div>

                {/* 4. Print Options */}
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
                          onChange={(e) => {
                            setPrintDateTime(e.target.checked);
                            try { localStorage.setItem('label_print_datetime', String(e.target.checked)); } catch {}
                          }}
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
                          onChange={(e) => {
                            setPrintPageNumber(e.target.checked);
                            try { localStorage.setItem('label_print_pagenum', String(e.target.checked)); } catch {}
                          }}
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
      ) : selectedMarketplace === 'ajio' ? (
        /* ================= AJIO INTERLEAVED PDF MERGER ================= */
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-5 md:p-7 mb-6 space-y-6">
          {/* Top Instructions & Action Bar */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-500" />
                Ajio Customer-Matched PDF Merger
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically reads the customer name after <strong className="text-slate-700">"Ship To :"</strong> on each 1-page label and attaches all matching invoice pages (1, 2, or more) next to that label.
              </p>
            </div>
            {(ajioState.labelFile || ajioState.invoiceFile || ajioState.excelFile) && (
              <button
                type="button"
                onClick={clearAllAjio}
                className="self-start md:self-auto text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All
              </button>
            )}
          </div>

          {/* Hidden file inputs */}
          <input
            ref={ajioLabelInputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleAjioLabelUpload}
            className="hidden"
          />
          <input
            ref={ajioInvoiceInputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleAjioInvoiceUpload}
            className="hidden"
          />
          <input
            ref={ajioExcelInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleAjioExcelUpload}
            className="hidden"
          />

          {/* The 3 Upload Buttons with file status shown just beside each button */}
          <div className="space-y-4">
            {/* 1. Label PDF Button */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition-colors">
              <button
                type="button"
                onClick={() => ajioLabelInputRef.current?.click()}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer transition-all active:scale-95"
              >
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Label PDF</span>
              </button>

              {/* Just beside the button */}
              <div className="flex-1 min-w-0">
                {ajioState.labelFile ? (
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-slate-800 truncate" title={ajioState.labelFile.name}>
                        {ajioState.labelFile.name}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold shrink-0">
                        {ajioState.labelPageCount} {ajioState.labelPageCount === 1 ? 'Page' : 'Pages'}
                      </span>
                      <span className="text-slate-400 text-[11px] shrink-0">
                        ({formatFileSize(ajioState.labelFile.size)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={clearAjioLabel}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors shrink-0 cursor-pointer"
                      title="Remove Label PDF"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic pl-1">
                    No Label PDF selected yet
                  </span>
                )}
              </div>
            </div>

            {/* 2. Invoice PDF Button */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition-colors">
              <button
                type="button"
                onClick={() => ajioInvoiceInputRef.current?.click()}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer transition-all active:scale-95"
              >
                <FileCheck className="w-4 h-4 text-sky-400" />
                <span>Invoice PDF</span>
              </button>

              {/* Just beside the button */}
              <div className="flex-1 min-w-0">
                {ajioState.invoiceFile ? (
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-sky-50 border border-sky-200 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                      <span className="font-semibold text-slate-800 truncate" title={ajioState.invoiceFile.name}>
                        {ajioState.invoiceFile.name}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[11px] font-bold shrink-0">
                        {ajioState.invoicePageCount} {ajioState.invoicePageCount === 1 ? 'Page' : 'Pages'}
                      </span>
                      <span className="text-slate-400 text-[11px] shrink-0">
                        ({formatFileSize(ajioState.invoiceFile.size)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={clearAjioInvoice}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors shrink-0 cursor-pointer"
                      title="Remove Invoice PDF"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic pl-1">
                    No Invoice PDF selected yet
                  </span>
                )}
              </div>
            </div>

            {/* 3. Ajio Excel Button */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition-colors">
              <button
                type="button"
                onClick={() => ajioExcelInputRef.current?.click()}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer transition-all active:scale-95"
              >
                <FileCode className="w-4 h-4 text-emerald-400" />
                <span>Ajio Excel</span>
              </button>

              {/* Just beside the button */}
              <div className="flex-1 min-w-0">
                {ajioState.excelFile ? (
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-purple-50 border border-purple-200 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                      <span className="font-semibold text-slate-800 truncate" title={ajioState.excelFile.name}>
                        {ajioState.excelFile.name}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[11px] font-bold shrink-0">
                        {ajioState.excelRowCount} Rows
                      </span>
                      <span className="text-slate-400 text-[11px] shrink-0">
                        ({formatFileSize(ajioState.excelFile.size)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={clearAjioExcel}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors shrink-0 cursor-pointer"
                      title="Remove Ajio Excel"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic pl-1">
                    No Ajio Excel selected yet (Optional)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Merge Logic & Status Preview */}
          {ajioState.labelFile && ajioState.invoiceFile && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  Smart "Ship To :" Customer Name Matching
                </span>
                <span className="font-mono text-indigo-600">
                  Label: {ajioState.labelPageCount} Pages • Invoice: {ajioState.invoicePageCount} Pages
                </span>
              </div>

              <div className="text-slate-600 bg-white p-3 rounded-lg border border-slate-200/80 text-[11px] leading-relaxed space-y-1">
                <p>
                  <strong>How it works:</strong> Each label is 1 page. OrderMunim reads the recipient name after <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-semibold font-mono">Ship To :</code> and matches all invoice pages belonging to that customer (1 page, 2 pages, or more), placing them directly after their shipping label.
                </p>
                <p className="text-slate-400 text-[10px]">
                  ✓ Even if invoices have multiple pages or different sort orders, every label receives its exact matching invoice(s).
                </p>
              </div>
            </div>
          )}

          {/* Excel Preview (if loaded) */}
          {ajioState.excelData && ajioState.excelData.length > 0 && (
            <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-purple-600" />
                  Ajio Excel Records ({ajioState.excelRowCount} total rows)
                </span>
                <span className="text-[10px] text-purple-600 font-medium">
                  Showing first {Math.min(4, ajioState.excelData.length)} rows
                </span>
              </div>
              <div className="overflow-x-auto text-[11px] bg-white rounded-lg border border-purple-100">
                <table className="w-full text-left">
                  <thead className="bg-purple-50/80 text-purple-900 font-bold border-b border-purple-100">
                    <tr>
                      {Object.keys(ajioState.excelData[0]).slice(0, 5).map((col, idx) => (
                        <th key={idx} className="p-2 whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-50 text-slate-700">
                    {ajioState.excelData.slice(0, 4).map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-purple-50/30">
                        {Object.keys(ajioState.excelData[0]).slice(0, 5).map((col, cIdx) => (
                          <td key={cIdx} className="p-2 whitespace-nowrap font-mono">{String(row[col] ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Progress Bar (if merging) */}
          {ajioState.isMerging && (
            <div className="space-y-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  {ajioState.mergeStatusText || 'Matching customer names and merging PDF...'}
                </span>
                <span className="font-mono text-indigo-600">{ajioState.mergeProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${ajioState.mergeProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Merge & Download Action Button */}
          <button
            type="button"
            disabled={!ajioState.labelFile || !ajioState.invoiceFile || ajioState.isMerging}
            onClick={handleMergeAjioPdf}
            className={`w-full py-4 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
              !ajioState.labelFile || !ajioState.invoiceFile
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : ajioState.isMerging
                ? 'bg-indigo-400 text-white cursor-wait'
                : 'bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 hover:from-slate-900 hover:to-indigo-900 text-white shadow-slate-950/20 active:scale-[0.99]'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-400" />
            <span>
              {ajioState.isMerging
                ? (ajioState.mergeStatusText || 'Matching & Merging Pages...')
                : (!ajioState.labelFile || !ajioState.invoiceFile)
                ? 'Please Upload Both Label PDF & Invoice PDF'
                : 'Match by Order# / Customer Name & Merge PDF'}
            </span>
          </button>

          {/* Download / Success Area (once merged) */}
          {ajioState.mergedDownload && (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-emerald-900">
                      Customer-Matched PDF Ready!
                    </h4>
                    <p className="text-[11px] text-emerald-700">
                      {ajioState.matchStats?.fullyMatchedCount || 0} of {ajioState.matchStats?.totalLabels || 0} Labels matched • {ajioState.mergedDownload.totalPages} Total Merged Pages
                    </p>
                  </div>
                </div>

                {ajioState.matchStats?.matchedPairs?.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAjioBreakdown(!showAjioBreakdown)}
                    className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-xs font-semibold hover:bg-emerald-100/50 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{showAjioBreakdown ? 'Hide Match Details' : 'View Matched Pairs'}</span>
                    {showAjioBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {/* Expandable Match Details List */}
              {showAjioBreakdown && ajioState.matchStats && (
                <div className="p-3 bg-white rounded-xl border border-emerald-200 max-h-60 overflow-y-auto space-y-2 text-xs">
                  <div className="font-bold text-slate-800 pb-1 border-b border-slate-100 text-[11px]">
                    Label & Invoice Match Breakdown:
                  </div>
                  {ajioState.matchStats.matchedPairs.map((pair, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px]">
                      <div className="min-w-0 pr-2">
                        <span className="font-bold text-slate-800">#{pair.labelNum} {pair.customerName}</span>
                        {pair.orderId && <span className="text-slate-400 text-[10px] ml-1.5 font-mono">({pair.orderId})</span>}
                        {pair.matchReason && (
                          <span className="inline-block text-emerald-700 text-[10px] ml-1.5 font-medium bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            {pair.matchReason}
                          </span>
                        )}
                        {pair.items && pair.items.length > 0 && (
                          <span className="inline-block text-indigo-700 text-[10px] ml-1.5 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 font-mono">
                            SKU: {pair.items.map(it => `${it.sku}${it.qty > 1 ? ` (x${it.qty})` : ''}`).join(', ')}
                          </span>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[10px]">
                          Label P{pair.labelPageIndex + 1}
                        </span>
                        <span>&rarr;</span>
                        {pair.matchedInvoices.length > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 font-mono text-[10px] font-semibold">
                            Invoice P{pair.matchedInvoices.map(m => m.pageNum).join(', ')} ({pair.matchedInvoices.length} {pair.matchedInvoices.length === 1 ? 'page' : 'pages'})
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px]">
                            No matching invoice
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {ajioState.matchStats.unmatchedInvoices?.length > 0 && (
                    <div className="pt-1 text-[10px] text-amber-700 italic">
                      + {ajioState.matchStats.unmatchedInvoices.length} invoice page(s) had no label match and were appended at the end.
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="flex-1 py-3 bg-white hover:bg-slate-50 text-slate-800 border border-emerald-300 text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-emerald-600" />
                  Preview / Print
                </button>

                <a
                  href={ajioState.mergedDownload.url}
                  download={ajioState.mergedDownload.filename}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors text-center cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Download PDF Again
                </a>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
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
      {showPreviewModal && (selectedMarketplace === 'ajio' ? ajioState.mergedDownload?.url : (downloadReady && downloadReady.url)) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 shadow-2xl space-y-3 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                {selectedMarketplace === 'ajio' ? (
                  <Layers className="w-5 h-5 text-indigo-600" />
                ) : (
                  <Scissors className="w-5 h-5 text-emerald-600" />
                )}
                <h3 className="font-bold text-sm text-slate-900">
                  {selectedMarketplace === 'ajio'
                    ? `Ajio Merged Label & Invoice Preview (${ajioState.mergedDownload?.totalPages || 0} Pages)`
                    : `Cropped Thermal Label Preview (${selectedMarketplace === 'flipcart' ? '4x6" Thermal Portrait' : '4x6" Landscape'})`}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={selectedMarketplace === 'ajio' ? ajioState.mergedDownload?.url : downloadReady?.url}
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
                src={`${(selectedMarketplace === 'ajio' ? ajioState.mergedDownload?.url : downloadReady?.url)}#toolbar=0&navpanes=0`}
                title="PDF Preview"
                className="w-full h-full min-h-[440px] rounded-xl"
              />
            </div>

            <div className="border-t pt-3 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {selectedMarketplace === 'ajio'
                  ? `Ajio Interleaved Document • Alternating Label and Invoice Pages`
                  : `${activeMarketplace?.name} Pure Shipping Label • 100% Tax Invoice Eliminated (${selectedMarketplace === 'flipcart' ? '4x6" Thermal Format' : 'LabelMantra Format'})`}
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
                  href={selectedMarketplace === 'ajio' ? ajioState.mergedDownload?.url : downloadReady?.url}
                  download={selectedMarketplace === 'ajio' ? ajioState.mergedDownload?.filename : downloadReady?.filename}
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
