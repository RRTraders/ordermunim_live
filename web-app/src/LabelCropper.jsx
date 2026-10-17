import React, { useState, useRef, useMemo, useEffect } from 'react';
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
  AlertCircle,
  X,
  UploadCloud, 
  ChevronUp, 
  ChevronDown, 
  ChevronRight, 
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
  Filter, 
  QrCode,
  ExternalLink,
  DownloadCloud,
  Monitor,
  Smartphone,
  Terminal,
  LogOut,
  Lock,
  Mail,
  User,
  ShieldCheck,
  EyeOff,
  Search,
  ArrowRight,
  Camera,
  Video,
  VideoOff,
  Edit3,
  Calendar,
  Play,
  Square,
  Circle,
  RotateCcw
} from 'lucide-react';

import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { requestCameraPermission } from './meeshoDirect';

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
    description: 'Remove tax invoice pages and print product SKU name & quantity on clean shipping labels.',
    ready: true
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
    tagline: 'Partner Portal & Orders Downloader',
    badgeText: 'myntra',
    badgeStyle: 'bg-gradient-to-tr from-[#FF3F6C] via-[#FF527B] to-[#F16521] text-white shadow-rose-950/20',
    iconLetter: 'M',
    description: 'Myntra Partner Portal. Direct in-app login & 1-click PDF download for shipping labels and invoices without printer drivers or QZ Tray.',
    ready: true
  },
  {
    id: 'snapdeal',
    name: 'Snapdeal',
    shortName: 'Snapdeal',
    tagline: 'Snapdeal Marketplace & Seller Zone',
    badgeText: 'snapdeal',
    badgeStyle: 'bg-gradient-to-tr from-[#E40046] to-[#b30037] text-white shadow-rose-950/20',
    iconLetter: 'S',
    description: 'Crop Snapdeal combined PDF to extract 4x6 thermal shipping labels and automatically eliminate tax invoices.',
    ready: true
  },
  {
    id: 'webcam',
    name: 'Webcam',
    shortName: 'Webcam',
    tagline: 'Return Parcel Video Proof & Unboxing Studio',
    badgeText: 'cam',
    badgeStyle: 'bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-teal-950/20',
    iconLetter: '📹',
    description: 'Live Webcam Unboxing & Return Proof with customizable real-time Indian Date & Time watermark timer for marketplace claims.',
    ready: true
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

async function generateFollowUsBadgeDataUrl(storeName, qrDataUrl, isLarge = false, qrShape = 'square') {
  const canvas = document.createElement('canvas');
  const w = isLarge ? 420 : 254;
  const h = isLarge ? 88 : 52;
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

    // LEFT: SHOP SKETCH + STORE NAME
    const shopX = 16;
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

    // CENTER: Clean Vertical Divider
    const divX = 210;
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(divX, 12);
    ctx.lineTo(divX, h - 12);
    ctx.stroke();

    // RIGHT: QR CODE WITH SELECTED SHAPE
    const qrImg = new Image();
    await new Promise((resolve) => {
      qrImg.onload = resolve;
      qrImg.onerror = resolve;
      qrImg.src = qrDataUrl;
    });

    let textX = divX + 16 + 54 + 16;

    if (qrShape === 'heart') {
      const heartW = 66;
      const heartH = 64;
      const heartCx = divX + 16 + heartW / 2;
      const heartBot = (h + heartH) / 2 - 3;
      const heartTop = heartBot - heartH;
      const notchY = heartTop + heartH * 0.26;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(heartCx, heartBot);
      ctx.lineTo(heartCx - heartW * 0.5, heartTop + heartH * 0.42);
      ctx.bezierCurveTo(heartCx - heartW * 0.5, heartTop, heartCx - heartW * 0.05, heartTop, heartCx, notchY);
      ctx.bezierCurveTo(heartCx + heartW * 0.05, heartTop, heartCx + heartW * 0.5, heartTop, heartCx + heartW * 0.5, heartTop + heartH * 0.42);
      ctx.lineTo(heartCx, heartBot);
      ctx.closePath();

      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.clip();

      const qrDrawSize = 52;
      ctx.translate(heartCx, heartTop + heartH * 0.46);
      ctx.rotate(225 * Math.PI / 180);
      ctx.drawImage(qrImg, -qrDrawSize / 2, -qrDrawSize / 2, qrDrawSize, qrDrawSize);
      ctx.restore();

      textX = divX + 16 + heartW + 14;
    } else if (qrShape === 'trolley') {
      const bW = 50;
      const bH = 42;
      const bLeft = divX + 22;
      const bTop = 16;
      const bBottom = bTop + bH;
      const qrSize = 42;
      const qrX = bLeft + 4;
      const qrY = bTop + 2;

      ctx.save();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = '#000000';
      ctx.fillStyle = '#ffffff';

      // Basket
      ctx.beginPath();
      ctx.moveTo(bLeft, bTop);
      ctx.lineTo(bLeft, bBottom);
      ctx.lineTo(bLeft + bW - 4, bBottom);
      ctx.lineTo(bLeft + bW, bTop);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Handle (angles safely down and left)
      ctx.beginPath();
      ctx.moveTo(bLeft, bTop + 4);
      ctx.lineTo(bLeft - 8, bTop + 10);
      ctx.lineTo(bLeft - 13, bTop + 10);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bLeft - 13, bTop + 10, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#000000';
      ctx.fill();

      // Wheels
      const wheelY = bBottom + 8;
      const wheelR = 4.5;
      const w1X = bLeft + 11;
      const w2X = bLeft + bW - 11;

      ctx.beginPath();
      ctx.moveTo(bLeft + 8, bBottom);
      ctx.lineTo(w1X, wheelY - wheelR);
      ctx.lineTo(w2X, wheelY - wheelR);
      ctx.lineTo(bLeft + bW - 8, bBottom);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(w1X, wheelY, wheelR, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w1X, wheelY, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = '#000000';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(w2X, wheelY, wheelR, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w2X, wheelY, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = '#000000';
      ctx.fill();
      ctx.restore();

      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      textX = bLeft + bW + 16;
    } else {
      // Clean borderless Square
      const qrSize = 56;
      const qrX = divX + 16;
      const qrY = (h - qrSize) / 2;

      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      textX = qrX + qrSize + 16;
    }

    // CALL TO ACTION TEXT (Clean, no tiny hearts)
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
    ctx.fillText('Follow', textX, 23);
    ctx.fillText('our page', textX, 45);

    // Subtitle: Scan with phone camera
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 8.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
    ctx.fillText('Scan with phone camera', textX, 66);
  } else {
    // Compact version for crop mode (w=252, h=52)
    const r = 9;
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    ctx.roundRect(1.5, 1.5, w - 3, h - 3, r);
    ctx.stroke();

    // Shop Sketch
    const shopSize = 36;
    drawBadgeShopSketch(ctx, 10, (h - shopSize) / 2, shopSize);

    // Store Name
    const cleanName = (storeName || 'SHRINANT').toUpperCase().trim().slice(0, 18);
    const divX = 126;
    let nameFontSize = 12;
    ctx.font = `bold ${nameFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif`;
    let nameW = ctx.measureText(cleanName).width;
    const maxNameW = divX - 54;
    if (nameW > maxNameW && maxNameW > 30) {
      nameFontSize = Math.max(8.5, Math.floor(nameFontSize * maxNameW / nameW));
      ctx.font = `bold ${nameFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif`;
    }
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'middle';
    ctx.fillText(cleanName, 50, h / 2);

    // Clean Divider (no heart)
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(divX, 6);
    ctx.lineTo(divX, h - 6);
    ctx.stroke();

    // QR Code with selected shape
    const qrImg = new Image();
    await new Promise((resolve) => {
      qrImg.onload = resolve;
      qrImg.onerror = resolve;
      qrImg.src = qrDataUrl;
    });

    let textX = 192;

    if (qrShape === 'heart') {
      const heartW = 48;
      const heartH = 47;
      const heartCx = divX + 9 + heartW / 2;
      const heartBot = (h + heartH) / 2 - 2;
      const heartTop = heartBot - heartH;
      const notchY = heartTop + heartH * 0.26;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(heartCx, heartBot);
      ctx.lineTo(heartCx - heartW * 0.5, heartTop + heartH * 0.42);
      ctx.bezierCurveTo(heartCx - heartW * 0.5, heartTop, heartCx - heartW * 0.05, heartTop, heartCx, notchY);
      ctx.bezierCurveTo(heartCx + heartW * 0.05, heartTop, heartCx + heartW * 0.5, heartTop, heartCx + heartW * 0.5, heartTop + heartH * 0.42);
      ctx.lineTo(heartCx, heartBot);
      ctx.closePath();

      // Fill heart white
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.clip();

      // Draw 45-degree rotated QR code directly inside the heart (black and white matching Image 4)
      const qrDrawSize = 39;
      ctx.translate(heartCx, heartTop + heartH * 0.46);
      ctx.rotate(225 * Math.PI / 180);
      ctx.drawImage(qrImg, -qrDrawSize / 2, -qrDrawSize / 2, qrDrawSize, qrDrawSize);
      ctx.restore();

      textX = divX + 9 + heartW + 9;
    } else if (qrShape === 'trolley') {
      const bW = 34;
      const bH = 30;
      const bLeft = divX + 16;
      const bTop = 7;
      const bBottom = bTop + bH;
      const qrSize = 28;
      const qrX = bLeft + 3;
      const qrY = bTop + 1;

      ctx.save();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = '#000000';
      ctx.fillStyle = '#ffffff';

      // 1. Cart Basket (clean wire cart frame holding QR)
      ctx.beginPath();
      ctx.moveTo(bLeft, bTop);
      ctx.lineTo(bLeft, bBottom);
      ctx.lineTo(bLeft + bW - 3, bBottom);
      ctx.lineTo(bLeft + bW, bTop);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Top rim
      ctx.beginPath();
      ctx.moveTo(bLeft - 1, bTop);
      ctx.lineTo(bLeft + bW + 1, bTop);
      ctx.stroke();

      // 2. Push Handle (Angles safely DOWN-LEFT, staying far from top card border)
      ctx.beginPath();
      ctx.moveTo(bLeft, bTop + 3);
      ctx.lineTo(bLeft - 5, bTop + 6);
      ctx.lineTo(bLeft - 8, bTop + 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bLeft - 8, bTop + 6, 1.4, 0, Math.PI * 2);
      ctx.fillStyle = '#000000';
      ctx.fill();

      // 3. Chassis strut
      const wheelY = bBottom + 5;
      const wheelR = 2.8;
      const w1X = bLeft + 7;
      const w2X = bLeft + bW - 7;

      ctx.beginPath();
      ctx.moveTo(bLeft + 5, bBottom);
      ctx.lineTo(w1X, wheelY - wheelR);
      ctx.lineTo(w2X, wheelY - wheelR);
      ctx.lineTo(bLeft + bW - 5, bBottom);
      ctx.stroke();

      // 4. Wheels
      ctx.beginPath();
      ctx.arc(w1X, wheelY, wheelR, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w1X, wheelY, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = '#000000';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(w2X, wheelY, wheelR, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w2X, wheelY, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = '#000000';
      ctx.fill();

      ctx.restore();

      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      textX = bLeft + bW + 9;
    } else {
      // Clean borderless Square (no outer border) - touches top and bottom borders so it looks big
      const qrSize = 48;
      const qrX = divX + 9;
      const qrY = 2;

      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      textX = qrX + qrSize + 9;
    }

    // Follow our page text (Clean, no tiny hearts)
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText('Follow', textX, 11);
    ctx.fillText('our page', textX, 27);
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

export default function LabelCropper({ 
  showToast, 
  followStores = [], 
  onNavigateTab, 
  activeMarketplaceId,
  currentUser = null,
  userProfile = null,
  onRequireAuth = null
}) {
  // Check 3-day trial validity for guest or registered user
  const checkTrialStatus = () => {
    // 1. Super Admin is always active
    if (currentUser?.email === 'rrtradersofficials@gmail.com' || userProfile?.role === 'super_admin' || currentUser?.uid === 'vJID6QrALTf4ybiDP5TuLvNkyN63') {
      return { allowed: true };
    }

    // 2. Logged-in user with trialEndDate in profile
    if (currentUser && userProfile?.trialEndDate) {
      const expiry = new Date(userProfile.trialEndDate).getTime();
      const isExpired = Date.now() > expiry;
      if (isExpired) {
        return {
          allowed: false,
          reason: 'Your 3-day free trial has expired. Please contact admin to extend or upgrade your plan.'
        };
      }
      return { allowed: true };
    }

    // 3. Guest User (Not logged in)
    if (!currentUser) {
      try {
        const guestStart = localStorage.getItem('om_guest_trial_start');
        if (!guestStart) {
          // Set start timestamp on first use
          localStorage.setItem('om_guest_trial_start', new Date().toISOString());
          return { allowed: true };
        }
        const startTime = new Date(guestStart).getTime();
        const elapsedDays = (Date.now() - startTime) / (1000 * 60 * 60 * 24);
        if (elapsedDays > 3) {
          return {
            allowed: false,
            reason: 'Your 3 days free trial has completed. Please sign in with your Google account to continue using OrderMunim.'
          };
        }
        return { allowed: true };
      } catch {
        return { allowed: true };
      }
    }

    return { allowed: true };
  };

  // Selected marketplace state (default Meesho as developed)
  const [selectedMarketplace, setSelectedMarketplace] = useState(() => {
    return activeMarketplaceId || localStorage.getItem('om_selected_marketplace') || 'meesho';
  });

  useEffect(() => {
    if (activeMarketplaceId && activeMarketplaceId !== selectedMarketplace) {
      setSelectedMarketplace(activeMarketplaceId);
      try {
        localStorage.setItem('om_selected_marketplace', activeMarketplaceId);
      } catch {}
    }
  }, [activeMarketplaceId]);

  // Isolated workspace states for each marketplace (keeps Meesho, Flipkart, Amazon, etc. 100% separate)
  const [marketplaceStates, setMarketplaceStates] = useState(() => ({
    ajio: createInitialMarketplaceState(),
    amazon: createInitialMarketplaceState(),
    flipcart: createInitialMarketplaceState(),
    meesho: createInitialMarketplaceState(),
    myntra: createInitialMarketplaceState(),
    snapdeal: createInitialMarketplaceState(),
    webcam: createInitialMarketplaceState(),
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
    labelFiles: [], // Array of { file, name, size, pageCount }
    labelTotalPages: 0,
    invoiceFiles: [], // Array of { file, name, size, pageCount }
    invoiceTotalPages: 0,
    excelFile: null,
    excelRowCount: 0,
    excelData: null,
    isMerging: false,
    mergeMode: 'with_invoice', // 'with_invoice' | 'without_invoice'
    mergeProgress: 0,
    mergeStatusText: '',
    mergedDownload: null,
    matchStats: null,
    error: null,
    labelError: null,
    invoiceError: null,
  });

  const [showAjioBreakdown, setShowAjioBreakdown] = useState(false);

  // Amazon Label Extractor State (Keep Labels Only, Filter Invoices)
  const [amazonState, setAmazonState] = useState({
    files: [], // Array of { file, name, size, pageCount, arrayBuffer }
    totalPages: 0,
    isProcessing: false,
    progress: 0,
    statusText: '',
    pagesAnalysis: [], // Array of { fileIndex, fileName, pageIndex, pageNum, globalPageNum, isInvoice, isLabel, orderId, trackingId, recipientName, reason, keep }
    labelsCount: 0,
    invoicesCount: 0,
    printSkuOnLabel: true, // Auto-print SKU on Shipping Label
    result: null, // { url, filename, totalPages, labelsCount, invoicesCount, blob }
    error: null,
  });
  const [showAmazonBreakdown, setShowAmazonBreakdown] = useState(false);
  const amazonInputRef = useRef(null);

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
    const invoiceItems = [];

    // Helper: System keywords to avoid mistaking headers/footers for SKUs
    const isSystemLine = (str) => {
      if (!str) return true;
      const s = str.trim();
      if (s.length < 2) return true;
      if (/%/.test(s)) return true; // SKUs NEVER contain % signs
      // Tax / GST / Table breakdown keywords
      if (/\b(?:RATE|AMOUNT|TAXABLE|VALUE|SGST|CGST|IGST|UTGST|CESS|SUB\s*TOTAL|NET\s*TOTAL|TOTAL|DISCOUNT|INVOICE\s*VALUE|ROUND\s*OFF)\b/i.test(s) &&
          /\b(?:RATE|AMOUNT|TAX|GST|VALUE|QTY|HSN|PERCENT|CGST|SGST|IGST)\b/i.test(s)) {
        return true;
      }
      if (/\bRATE\b/i.test(s) && /\bAMOUNT\b/i.test(s)) return true;
      if (/\b(?:CGST|SGST|IGST|UTGST|CESS)\b/i.test(s)) return true;
      return /^(?:TAX\s*INVOICE|ORIGINAL\s*FOR|SELLER|CONSIGNOR|CUSTOMER|GSTIN|BILL\s*TO|SHIP\s*TO|ORDER\s*NUMBER|CARRIER|PAYMENT\s*MODE|AWB\s*NUMBER|HSN\s*Code|Qty|MRP|Trade\s*Discount|Other\s*Discount|Net\s*Unit|Base\s*Price|Taxable\s*Value|Tax\s*Amt|Total\s*Amount|Convenience\s*Fee|Amount\s*in\s*Words|Authorized\s*Signatory|Terms|Page\s*\d+|This\s*is\s*a\s*computer|Customer\s*Support|Tax\s*Breakup|Tax\s*Details|Tax\s*Summary|GST\s*Breakup|GST\s*Details|Summary|Description\s*of\s*Goods|Total\s*Tax|Tax\s*Type|HSN\/SAC)/i.test(s);
    };

    // Helper: Strictly validate if a string can legitimately be a product SKU
    const isValidSku = (str) => {
      if (!str) return false;
      const s = str.trim();
      if (s.length < 2 || s.length > 50) return false;
      if (/%/.test(s)) return false;
      if (/\b(?:RATE|AMOUNT|TAXABLE|VALUE|SGST|CGST|IGST|UTGST|CESS|TOTAL|DISCOUNT|ROUND\s*OFF|TAX\s*AMT|NET\s*PRICE|BASE\s*PRICE|MRP|RUPEES|RS\.)\b/i.test(s)) {
        return false;
      }
      if (isSystemLine(s)) return false;
      if (!/[A-Za-z0-9]/.test(s)) return false;
      return true;
    };

    // Helper: Extract SKU from a line using multiple pattern detectors
    const parseSkuFromLine = (line) => {
      if (!line || isSystemLine(line)) return '';
      const l = line.trim();

      // Pattern 1: ... (CODE),SKU_NAME (with support for _, -, spaces, dots, slashes)
      const m1 = l.match(/\([^)]+\)\s*,\s*([A-Za-z0-9_\s\-\.\/\+]+?)\s*$/);
      if (m1 && isValidSku(m1[1])) return m1[1].trim();

      // Pattern 1b: If not strictly at end of line (e.g. trailing comma)
      const m1b = l.match(/\([^)]+\)\s*,\s*([A-Za-z0-9_\-\.\/]+(?:[ \t]+[A-Za-z0-9_\-\.\/]+)*)/);
      if (m1b && isValidSku(m1b[1])) {
        return m1b[1].trim();
      }

      // Pattern 1c: Code in parentheses at end of line: ... 704105368013 (LE_SP_SNFLR_BLU_XXL)
      const m1c = l.match(/\b\d{8,14}\s*\(([A-Za-z0-9_\s\-\.\/\+]+)\)\s*$/);
      if (m1c && isValidSku(m1c[1])) return m1c[1].trim();

      // Pattern 2: Code with underscores (e.g. LE_SP_SNFLR_BLU_XXL or FR_WN_LLN_BLU_32)
      const m2 = l.match(/\b([A-Za-z0-9]{2,10}_[A-Za-z0-9_]{3,30})\b/);
      if (m2 && isValidSku(m2[1])) {
        return m2[1].trim();
      }

      // Pattern 3: Separated by comma where second part is SKU (e.g. "Men Flat-Front Relaxed Fit Trousers,white, BJ LILN WHITE-36")
      if (l.includes(',')) {
        const parts = l.split(',').map(p => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          const lastPart = parts[parts.length - 1];
          if (/^[A-Za-z0-9_\-\s\.\/]{3,40}$/.test(lastPart) && isValidSku(lastPart)) {
            return lastPart;
          }
        }
      }

      // Pattern 4: Standalone style code line (e.g. "BJ LILN WHITE-36", "O1 PANT DARK GREY-32", "DNM-REG-34", "SH-01-WHITE-L")
      const clean = l.replace(/[,;]+$/, '').trim();
      if (clean.length >= 3 && clean.length <= 45 && isValidSku(clean)) {
        // Alphanumeric with spaces, hyphens, slashes, numbers (typical style code)
        if (/^[A-Za-z0-9][A-Za-z0-9_\-\s\.\/\+]{2,44}$/.test(clean)) {
          if (/[A-Za-z]/.test(clean) && (/[\d\-]/.test(clean) || /\b(?:XS|S|M|L|XL|XXL|XXXL|3XL|4XL|FREE|\d{2})\b/i.test(clean))) {
            return clean;
          }
        }
      }

      return '';
    };

    // STRATEGY 1 (Primary): Table HSN Row Anchoring
    // In every Ajio Tax Invoice, each product item has an HSN row (e.g. "61034200 1.0 2499.0...")
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]?.trim() || '';
      if (!l) continue;

      // Stop scanning once we leave the item table and hit Tax Summary / Total / Footer
      if (/(?:RATE\s*%\s*AMOUNT|Tax\s*(?:Breakup|Break-up|Details|Summary)|GST\s*(?:Breakup|Details)|Summary\s*of\s*Tax|Amount\s*in\s*Words|Authorized\s*Signatory)/i.test(l)) {
        break;
      }

      // Detect HSN row: 6 to 8 digit number followed by quantity (e.g. 61034200 1.0)
      const hsnMatch = l.match(/\b([1-9]\d{5,7})\b\s+(\d+(?:\.\d+)?)/);
      if (hsnMatch && !isSystemLine(l)) {
        const rawQty = parseFloat(hsnMatch[2]);
        const qty = (rawQty > 0 && rawQty <= 500) ? Math.max(1, Math.round(rawQty)) : 1;

        let detectedSku = '';

        // Check candidate lines directly above this HSN row (working backwards)
        for (let back = 1; back <= 4 && (i - back) >= 0; back++) {
          const prevLine = lines[i - back]?.trim() || '';
          if (!prevLine || isSystemLine(prevLine)) continue;
          if (/\b[1-9]\d{5,7}\b\s+\d+(?:\.\d+)?/.test(prevLine)) break; // Hit previous HSN row

          const parsed = parseSkuFromLine(prevLine);
          if (parsed && isValidSku(parsed)) {
            detectedSku = parsed;
            break;
          }
        }

        // If no parsed pattern matched, grab the immediate non-empty line above HSN (e.g. "BJ LILN WHITE-36")
        if (!detectedSku) {
          for (let back = 1; back <= 3 && (i - back) >= 0; back++) {
            const prevLine = lines[i - back]?.trim() || '';
            if (!prevLine || isSystemLine(prevLine)) continue;
            if (/\b[1-9]\d{5,7}\b\s+\d+(?:\.\d+)?/.test(prevLine)) break;

            const clean = prevLine.replace(/[,;]+$/, '').trim();
            if (isValidSku(clean)) {
              detectedSku = clean;
              break;
            }
          }
        }

        if (detectedSku) {
          detectedSku = detectedSku.replace(/[,;]+$/, '').trim();
          if (isValidSku(detectedSku)) {
            invoiceItems.push({ sku: detectedSku, qty });
          }
        }
      }
    }

    // STRATEGY 2: Fallback line-by-line scanner if Strategy 1 found no HSN rows
    if (invoiceItems.length === 0) {
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i]?.trim() || '';
        if (!l || isSystemLine(l)) continue;
        if (/(?:RATE\s*%\s*AMOUNT|Tax\s*(?:Breakup|Break-up|Details|Summary)|GST\s*(?:Breakup|Details)|Summary\s*of\s*Tax|Amount\s*in\s*Words|Authorized\s*Signatory)/i.test(l)) {
          break;
        }

        let sku = parseSkuFromLine(l);
        if (sku) {
          sku = sku.replace(/[,;]+$/, '').trim();
          if (isValidSku(sku)) {
            let qty = 1;
            for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
              const lineJ = lines[j]?.trim() || '';
              const qm = lineJ.match(/\b\d{6,8}\s+(\d+(?:\.\d+)?)\b/) || lineJ.match(/^(\d+(?:\.0+)?)\s+\d+(?:\.\d+)?/);
              if (qm) {
                const parsedQ = parseFloat(qm[1]);
                if (parsedQ > 0 && parsedQ <= 50) {
                  qty = Math.max(1, Math.round(parsedQ));
                  break;
                }
              }
            }
            invoiceItems.push({ sku, qty });
          }
        }
      }
    }

    // STRATEGY 3: Global style code regex fallback
    if (invoiceItems.length === 0) {
      const globalMatches = rawText.match(/\b([A-Za-z0-9]{2,10}_[A-Za-z0-9_]{3,30})\b/g);
      if (globalMatches) {
        for (const candidate of globalMatches) {
          if (isValidSku(candidate)) {
            invoiceItems.push({ sku: candidate.trim(), qty: 1 });
            break;
          }
        }
      }
    }

    // Consolidate identical items by summing quantities (strictly valid SKUs only)
    const consolidatedItems = [];
    const skuMap = new Map();
    for (const itm of invoiceItems) {
      if (!isValidSku(itm.sku)) continue;
      const normKey = itm.sku.trim().toLowerCase();
      if (skuMap.has(normKey)) {
        skuMap.get(normKey).qty += itm.qty;
      } else {
        const entry = { sku: itm.sku.trim(), qty: itm.qty };
        skuMap.set(normKey, entry);
        consolidatedItems.push(entry);
      }
    }

    return { shipToName, orderId, pincode, lines, isContinuation, invoiceNumber, pageCurrent, pageTotal, invoiceItems: consolidatedItems };
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
    const rawFiles = Array.from(e.target.files || []);
    if (rawFiles.length === 0) return;
    const pdfFiles = rawFiles.filter(f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf');
    if (pdfFiles.length === 0) {
      showToast?.('Please upload PDF file(s) for Ajio Labels', 'warning');
      return;
    }
    try {
      const newLabelFiles = [];
      let detectedError = null;

      for (const file of pdfFiles) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
          const count = pdfDoc.getPageCount();

          // Validation: Check first page text to prevent accidental upload of Invoice PDF into Label box
          try {
            const pdfJsDoc = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
            const firstPage = await pdfJsDoc.getPage(1);
            const textContent = await firstPage.getTextContent();
            const pageText = textContent.items.map(it => it.str).join(' ');

            const isInvoice = /tax\s*invoice/i.test(pageText) || (/taxable\s*value/i.test(pageText) && /hsn/i.test(pageText));
            if (isInvoice) {
              const errMsg = `"${file.name}" is a Tax Invoice PDF! Please upload it under "Invoice PDF" instead.`;
              detectedError = errMsg;
              showToast?.(`⚠️ ${errMsg}`, 'error');
              continue; // Skip uploading invoice into label box
            }
          } catch (vErr) {
            console.warn('PDF validation check warning:', vErr);
          }

          newLabelFiles.push({
            file,
            name: file.name,
            size: file.size,
            pageCount: count,
          });
        } catch (fErr) {
          console.error(`Error reading ${file.name}:`, fErr);
          showToast?.(`Could not read ${file.name}: ${fErr.message}`, 'error');
        }
      }

      if (detectedError) {
        setAjioState(prev => ({
          ...prev,
          labelError: detectedError,
        }));
      }

      if (newLabelFiles.length === 0) return;

      setAjioState(prev => {
        const existing = prev.labelFiles || [];
        const combined = [...existing];
        for (const item of newLabelFiles) {
          if (!combined.some(c => c.name === item.name && c.size === item.size)) {
            combined.push(item);
          }
        }
        const totalPages = combined.reduce((acc, f) => acc + (f.pageCount || 0), 0);
        return {
          ...prev,
          labelFiles: combined,
          labelTotalPages: totalPages,
          mergedDownload: null,
          error: null,
          labelError: detectedError || null,
        };
      });

      const totalNewPages = newLabelFiles.reduce((acc, f) => acc + f.pageCount, 0);
      showToast?.(`Loaded ${newLabelFiles.length} Label PDF(s) (${totalNewPages} pages total)`, 'success');
    } catch (err) {
      console.error('Error reading Ajio Label PDFs:', err);
      showToast?.('Failed to read Label PDFs: ' + err.message, 'error');
    } finally {
      if (ajioLabelInputRef.current) ajioLabelInputRef.current.value = '';
    }
  };

  const handleAjioInvoiceUpload = async (e) => {
    const rawFiles = Array.from(e.target.files || []);
    if (rawFiles.length === 0) return;
    const pdfFiles = rawFiles.filter(f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf');
    if (pdfFiles.length === 0) {
      showToast?.('Please upload PDF file(s) for Ajio Invoices', 'warning');
      return;
    }
    try {
      const newInvoiceFiles = [];
      let detectedError = null;

      for (const file of pdfFiles) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
          const count = pdfDoc.getPageCount();

          // Validation: Check first page text to prevent accidental upload of Label PDF into Invoice box
          try {
            const pdfJsDoc = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
            const firstPage = await pdfJsDoc.getPage(1);
            const textContent = await firstPage.getTextContent();
            const pageText = textContent.items.map(it => it.str).join(' ');

            const hasTaxInvoice = /tax\s*invoice/i.test(pageText) || (/taxable\s*value/i.test(pageText) && /hsn/i.test(pageText));
            const isShippingLabel = (/awb\s*no/i.test(pageText) || /\bawb\b/i.test(pageText) || /return\s*address/i.test(pageText) || /routing\s*code/i.test(pageText)) && !hasTaxInvoice;

            if (isShippingLabel) {
              const errMsg = `"${file.name}" is a Shipping Label PDF! Please upload it under "Label PDF" instead.`;
              detectedError = errMsg;
              showToast?.(`⚠️ ${errMsg}`, 'error');
              continue; // Skip uploading label into invoice box
            }
          } catch (vErr) {
            console.warn('PDF validation check warning:', vErr);
          }

          newInvoiceFiles.push({
            file,
            name: file.name,
            size: file.size,
            pageCount: count,
          });
        } catch (fErr) {
          console.error(`Error reading ${file.name}:`, fErr);
          showToast?.(`Could not read ${file.name}: ${fErr.message}`, 'error');
        }
      }

      if (detectedError) {
        setAjioState(prev => ({
          ...prev,
          invoiceError: detectedError,
        }));
      }

      if (newInvoiceFiles.length === 0) return;

      setAjioState(prev => {
        const existing = prev.invoiceFiles || [];
        const combined = [...existing];
        for (const item of newInvoiceFiles) {
          if (!combined.some(c => c.name === item.name && c.size === item.size)) {
            combined.push(item);
          }
        }
        const totalPages = combined.reduce((acc, f) => acc + (f.pageCount || 0), 0);
        return {
          ...prev,
          invoiceFiles: combined,
          invoiceTotalPages: totalPages,
          mergedDownload: null,
          error: null,
          invoiceError: detectedError || null,
        };
      });

      const totalNewPages = newInvoiceFiles.reduce((acc, f) => acc + f.pageCount, 0);
      showToast?.(`Loaded ${newInvoiceFiles.length} Invoice PDF(s) (${totalNewPages} pages total)`, 'success');
    } catch (err) {
      console.error('Error reading Ajio Invoice PDFs:', err);
      showToast?.('Failed to read Invoice PDFs: ' + err.message, 'error');
    } finally {
      if (ajioInvoiceInputRef.current) ajioInvoiceInputRef.current.value = '';
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

  const removeAjioLabelFile = (indexToRemove) => {
    setAjioState(prev => {
      const updated = (prev.labelFiles || []).filter((_, idx) => idx !== indexToRemove);
      const totalPages = updated.reduce((acc, f) => acc + (f.pageCount || 0), 0);
      return {
        ...prev,
        labelFiles: updated,
        labelTotalPages: totalPages,
        mergedDownload: null,
      };
    });
  };

  const clearAjioLabel = () => {
    if (ajioLabelInputRef.current) ajioLabelInputRef.current.value = '';
    setAjioState(prev => ({
      ...prev,
      labelFiles: [],
      labelTotalPages: 0,
      labelError: null,
      mergedDownload: null,
    }));
  };

  const removeAjioInvoiceFile = (indexToRemove) => {
    setAjioState(prev => {
      const updated = (prev.invoiceFiles || []).filter((_, idx) => idx !== indexToRemove);
      const totalPages = updated.reduce((acc, f) => acc + (f.pageCount || 0), 0);
      return {
        ...prev,
        invoiceFiles: updated,
        invoiceTotalPages: totalPages,
        mergedDownload: null,
      };
    });
  };

  const clearAjioInvoice = () => {
    if (ajioInvoiceInputRef.current) ajioInvoiceInputRef.current.value = '';
    setAjioState(prev => ({
      ...prev,
      invoiceFiles: [],
      invoiceTotalPages: 0,
      invoiceError: null,
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
      labelFiles: [],
      labelTotalPages: 0,
      invoiceFiles: [],
      invoiceTotalPages: 0,
      excelFile: null,
      excelRowCount: 0,
      excelData: null,
      isMerging: false,
      mergeMode: 'with_invoice',
      mergeProgress: 0,
      mergeStatusText: '',
      mergedDownload: null,
      matchStats: null,
      error: null,
      labelError: null,
      invoiceError: null,
    });
  };

  const handleMergeAjioPdf = async (options = {}) => {
    const includeInvoices = typeof options === 'boolean' ? options : (options?.includeInvoices !== false);
    const mergeMode = includeInvoices ? 'with_invoice' : 'without_invoice';

    if (!ajioState.labelFiles?.length || !ajioState.invoiceFiles?.length) {
      showToast?.('Please upload both Label PDF(s) and Invoice PDF(s) to merge', 'warning');
      return;
    }

    setAjioState(prev => ({
      ...prev,
      isMerging: true,
      mergeMode,
      mergeProgress: 5,
      mergeStatusText: 'Loading Label PDFs...',
      error: null,
    }));

    try {
      // 0. Load all Label and Invoice documents into memory
      const labelSources = [];
      let totalLabelPages = 0;
      for (let fIdx = 0; fIdx < ajioState.labelFiles.length; fIdx++) {
        const fObj = ajioState.labelFiles[fIdx];
        const bytes = await fObj.file.arrayBuffer();
        const pdfJsDoc = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
        const pdfLibDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        labelSources.push({
          fileIndex: fIdx,
          name: fObj.name,
          pdfJsDoc,
          pdfLibDoc,
          numPages: pdfJsDoc.numPages,
        });
        totalLabelPages += pdfJsDoc.numPages;
      }

      setAjioState(prev => ({
        ...prev,
        mergeProgress: 10,
        mergeStatusText: 'Loading Invoice PDFs...',
      }));

      const invoiceSources = [];
      let totalInvoicePages = 0;
      for (let fIdx = 0; fIdx < ajioState.invoiceFiles.length; fIdx++) {
        const fObj = ajioState.invoiceFiles[fIdx];
        const bytes = await fObj.file.arrayBuffer();
        const pdfJsDoc = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
        const pdfLibDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        invoiceSources.push({
          fileIndex: fIdx,
          name: fObj.name,
          pdfJsDoc,
          pdfLibDoc,
          numPages: pdfJsDoc.numPages,
        });
        totalInvoicePages += pdfJsDoc.numPages;
      }

      // 1. Extract text, customer name, order number, and pincode from each label page across all label files
      const labelPagesInfo = [];
      let readLabelCount = 0;
      for (let sIdx = 0; sIdx < labelSources.length; sIdx++) {
        const src = labelSources[sIdx];
        for (let p = 1; p <= src.numPages; p++) {
          readLabelCount++;
          setAjioState(prev => ({
            ...prev,
            mergeProgress: 10 + Math.min(20, Math.round((readLabelCount / Math.max(1, totalLabelPages)) * 20)),
            mergeStatusText: `Reading Label page ${readLabelCount} of ${totalLabelPages} (${src.name})...`,
          }));
          const page = await src.pdfJsDoc.getPage(p);
          const textContent = await page.getTextContent();
          const extracted = extractShipToFromPage(textContent);
          labelPagesInfo.push({
            fileIndex: sIdx,
            fileName: src.name,
            pageIndex: p - 1, // 0-based within src.pdfLibDoc
            pageNum: p, // 1-based within this file
            globalLabelNum: labelPagesInfo.length + 1,
            ...extracted,
          });
        }
      }

      // 2. Extract text, customer name, order number, pincode, and SKU items from each invoice page across all invoice files
      const invoicePagesInfo = [];
      let readInvoiceCount = 0;
      for (let sIdx = 0; sIdx < invoiceSources.length; sIdx++) {
        const src = invoiceSources[sIdx];
        for (let p = 1; p <= src.numPages; p++) {
          readInvoiceCount++;
          setAjioState(prev => ({
            ...prev,
            mergeProgress: 30 + Math.min(25, Math.round((readInvoiceCount / Math.max(1, totalInvoicePages)) * 25)),
            mergeStatusText: `Reading Invoice page ${readInvoiceCount} of ${totalInvoicePages} (${src.name})...`,
          }));
          const page = await src.pdfJsDoc.getPage(p);
          const textContent = await page.getTextContent();
          const extracted = extractShipToFromPage(textContent);
          invoicePagesInfo.push({
            fileIndex: sIdx,
            fileName: src.name,
            pageIndex: p - 1, // 0-based within src.pdfLibDoc
            pageNum: p, // 1-based within this file
            globalInvoiceNum: invoicePagesInfo.length + 1,
            ...extracted,
          });
        }
      }

      // 3. Group invoice pages into structured Invoice Documents
      // IMPORTANT: Continuation pages MUST NOT cross file boundaries! (curInvoice.fileIndex === p.fileIndex)
      const invoiceDocuments = [];
      let curInvoice = null;

      for (let i = 0; i < invoicePagesInfo.length; i++) {
        const p = invoicePagesInfo[i];

        // Multi-page continuation detection:
        // A page belongs to the previous invoice IF AND ONLY IF it is from the same file AND:
        // 1) It explicitly has pageCurrent > 1 (e.g. Page 2 of 2)
        // 2) Or previous invoice still expects more pages (expectedPages > pages.length)
        // 3) Or this page lacks both Tax Invoice No and Order ID
        const isContinuation = curInvoice && (curInvoice.fileIndex === p.fileIndex) && (
          (p.pageCurrent && p.pageCurrent > 1) ||
          (curInvoice.expectedPages && curInvoice.expectedPages > curInvoice.pages.length) ||
          (!p.invoiceNumber && !p.orderId)
        );

        if (!isContinuation || !curInvoice) {
          curInvoice = {
            invoiceIndex: invoiceDocuments.length,
            fileIndex: p.fileIndex,
            fileName: p.fileName,
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

        matchedPairs.push({
          labelNum: i + 1,
          fileName: lbl.fileName,
          labelPageIndex: lbl.pageIndex,
          labelPage: lbl.pageNum,
          customerName: lbl.shipToName || 'Customer Name Not Detected',
          orderId: lbl.orderId,
          matchReason: matchRes ? matchRes.reason : 'No matching invoice',
          isMatched: !!matchedDoc,
          matchedDoc,
          items: matchedDoc?.items || [],
          matchedInvoices: matchedDoc ? matchedDoc.pages.map(pg => ({
            fileName: pg.fileName,
            pageNum: pg.pageNum,
            pageIndex: pg.pageIndex,
          })) : [],
        });
      }

      // Collect unmatched invoice documents
      const unmatchedInvoices = [];
      for (let j = 0; j < invoiceDocuments.length; j++) {
        if (!usedInvoiceDocIndices.has(j)) {
          unmatchedInvoices.push(invoiceDocuments[j]);
        }
      }

      const fullyMatchedCount = matchedPairs.filter(p => p.isMatched).length;
      const unmatchedLabelsCount = matchedPairs.filter(p => !p.isMatched).length;

      // ─────────────────────────────────────────────────────────────────
      // CASE 1: 0 MATCHING (Complete Mismatch)
      // If invoices were uploaded but 0 labels matched, block download and show error!
      // ─────────────────────────────────────────────────────────────────
      if (invoiceDocuments.length > 0 && fullyMatchedCount === 0) {
        setAjioState(prev => ({
          ...prev,
          isMerging: false,
          mergeProgress: 0,
          mergeStatusText: '',
          mergedDownload: null, // DO NOT give option to download file
          error: `0 Matches Found! None of the ${labelPagesInfo.length} shipping labels matched any uploaded invoices. Please verify that the Label PDF and Invoice PDF belong to the same batch.`,
          matchStats: {
            totalLabels: totalLabelPages,
            totalInvoices: totalInvoicePages,
            labelFilesCount: ajioState.labelFiles.length,
            invoiceFilesCount: ajioState.invoiceFiles.length,
            totalPages: 0,
            fullyMatchedCount: 0,
            unmatchedLabelsCount: labelPagesInfo.length,
            unmatchedInvoicesCount: unmatchedInvoices.length,
            matchedPairs,
            unmatchedInvoices,
            includeInvoices,
          },
        }));
        setShowAjioBreakdown(true);
        showToast?.('0 Matches Found! No labels matched the uploaded invoices.', 'error');
        return;
      }

      // ─────────────────────────────────────────────────────────────────
      // CASE 2: PARTIAL OR COMPLETE MATCHING
      // "so give only download matching" -> ONLY include matched orders in mergeSequence!
      // ─────────────────────────────────────────────────────────────────
      const mergeSequence = [];
      for (let i = 0; i < matchedPairs.length; i++) {
        const pair = matchedPairs[i];

        // If invoices were provided, STRICTLY EXCLUDE UNMATCHED LABELS FROM DOWNLOAD!
        if (invoiceDocuments.length > 0 && !pair.isMatched) {
          continue;
        }

        const lbl = labelPagesInfo[pair.labelNum - 1];
        const matchedDoc = pair.matchedDoc;
        let labelItems = matchedDoc?.items || [];

        // Secondary fallback: If invoice items were empty but Excel was uploaded, match by Order ID
        if ((!labelItems || labelItems.length === 0) && ajioState.excelData && ajioState.excelData.length > 0) {
          const ordId = (lbl.orderId || matchedDoc?.orderId || '').toLowerCase().trim();
          if (ordId) {
            const excelRows = ajioState.excelData.filter(r => {
              const rOrd = String(r['Order Number'] || r['Order ID'] || r['Customer Order Number'] || r['PO Number'] || r['order_id'] || '').toLowerCase().trim();
              return rOrd && (rOrd === ordId || rOrd.includes(ordId) || ordId.includes(rOrd));
            });
            if (excelRows.length > 0) {
              labelItems = excelRows.map(r => ({
                sku: String(r['Seller SKU'] || r['SKU'] || r['Merchant SKU Code'] || r['Product Title'] || r['Item Description'] || 'ITEM').trim(),
                qty: Number(r['Quantity'] || r['Qty'] || 1) || 1
              })).filter(it => it.sku);
            }
          }
        }

        // Add label page with matched invoice items (for SKU stamping)
        mergeSequence.push({
          type: 'label',
          fileIndex: lbl.fileIndex,
          fileName: lbl.fileName,
          pageIndex: lbl.pageIndex,
          pageNum: lbl.pageNum,
          name: lbl.shipToName,
          labelNum: pair.labelNum,
          items: labelItems,
        });

        // Append all invoice pages belonging to this matched document (only if includeInvoices is true)
        if (includeInvoices && matchedDoc) {
          for (const pg of matchedDoc.pages) {
            mergeSequence.push({
              type: 'invoice',
              fileIndex: pg.fileIndex,
              fileName: pg.fileName,
              pageIndex: pg.pageIndex,
              pageNum: pg.pageNum,
              name: matchedDoc.shipToName,
              labelNum: pair.labelNum,
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
      const helveticaBold = await mergedDoc.embedFont(StandardFonts.HelveticaBold);

      for (let idx = 0; idx < mergeSequence.length; idx++) {
        const item = mergeSequence[idx];
        if (item.type === 'label') {
          const srcDoc = labelSources[item.fileIndex].pdfLibDoc;
          const [copiedPage] = await mergedDoc.copyPages(srcDoc, [item.pageIndex]);

          // Stamp SKU name and Quantity in the bottom-right corner of the shipping label
          // Uses a solid white background rectangle so the vertical table line does not interfere/cut through the text,
          // and maintains a bold, clear, highly legible font size for warehouse picking and packing.
          const validItems = (item.items || []).filter(it => {
            if (!it || !it.sku) return false;
            const s = it.sku.trim();
            if (/%/.test(s)) return false;
            if (/\b(?:RATE|AMOUNT|TAXABLE|VALUE|SGST|CGST|IGST|UTGST|CESS|TOTAL|ROUND\s*OFF|TAX|DISCOUNT)\b/i.test(s)) return false;
            return true;
          });

          if (validItems.length > 0) {
            const pageWidth = copiedPage.getWidth();
            const pageHeight = copiedPage.getHeight();
            // Proportional scaling for both standard 4x6 (288x432) and A4 (595x842) labels
            const scaleX = pageWidth / 288;
            const scaleY = pageHeight / 432;
            const scale = Math.min(scaleX, scaleY);

            const boxX = 172 * scaleX; // Safely right of Consignor address (ends at <= 168 on 288pt)
            const boxY = 8 * scaleY;
            const boxW = Math.min(110 * scaleX, pageWidth - boxX - (3 * scaleX)); // Extends clear of right border
            const boxH = 50 * scaleY; // Extends under the Total box horizontal separator

            // 1. Solid white background to cleanly erase the vertical line and any artifacts
            copiedPage.drawRectangle({
              x: boxX,
              y: boxY,
              width: boxW,
              height: boxH,
              color: rgb(1, 1, 1),
            });

            // 2. Draw text with single line per SKU and prominent font size
            const textStartX = 175 * scaleX;
            const maxTextWidth = boxW - (6 * scaleX);

            if (validItems.length === 1) {
              const itm = validItems[0];
              const text = `${itm.sku} (${itm.qty || 1})`;
              let fSize = 7.5 * scale;
              while (fSize > (3.5 * scale) && helveticaBold.widthOfTextAtSize(text, fSize) > maxTextWidth) {
                fSize -= 0.3 * scale;
              }
              // Vertically centered in the bottom-right box
              copiedPage.drawText(text, {
                x: textStartX,
                y: 31 * scaleY,
                size: fSize,
                font: helveticaBold,
                color: rgb(0, 0, 0),
              });
            } else if (validItems.length === 2) {
              for (let k = 0; k < 2; k++) {
                const itm = validItems[k];
                const text = `${itm.sku} (${itm.qty || 1})`;
                let fSize = 6.2 * scale;
                while (fSize > (3.5 * scale) && helveticaBold.widthOfTextAtSize(text, fSize) > maxTextWidth) {
                  fSize -= 0.3 * scale;
                }
                copiedPage.drawText(text, {
                  x: textStartX,
                  y: (38 - (k * 13)) * scaleY,
                  size: fSize,
                  font: helveticaBold,
                  color: rgb(0, 0, 0),
                });
              }
            } else if (validItems.length === 3) {
              for (let k = 0; k < 3; k++) {
                const itm = validItems[k];
                const text = `${itm.sku} (${itm.qty || 1})`;
                let fSize = 5.2 * scale;
                while (fSize > (3.2 * scale) && helveticaBold.widthOfTextAtSize(text, fSize) > maxTextWidth) {
                  fSize -= 0.3 * scale;
                }
                copiedPage.drawText(text, {
                  x: textStartX,
                  y: (43 - (k * 11)) * scaleY,
                  size: fSize,
                  font: helveticaBold,
                  color: rgb(0, 0, 0),
                });
              }
            } else {
              const count = Math.min(validItems.length, 4);
              for (let k = 0; k < count; k++) {
                const itm = validItems[k];
                const text = `${itm.sku} (${itm.qty || 1})`;
                let fSize = 4.6 * scale;
                while (fSize > (3.0 * scale) && helveticaBold.widthOfTextAtSize(text, fSize) > maxTextWidth) {
                  fSize -= 0.3 * scale;
                }
                copiedPage.drawText(text, {
                  x: textStartX,
                  y: (46 - (k * 10)) * scaleY,
                  size: fSize,
                  font: helveticaBold,
                  color: rgb(0, 0, 0),
                });
              }
            }
          }

          mergedDoc.addPage(copiedPage);
        } else {
          const srcDoc = invoiceSources[item.fileIndex].pdfLibDoc;
          const [copiedPage] = await mergedDoc.copyPages(srcDoc, [item.pageIndex]);
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
      const filename = includeInvoices
        ? `Ajio_Matched_Labels_Invoices_${dateTag}.pdf`
        : `Ajio_Matched_Labels_Only_${dateTag}.pdf`;

      const matchStats = {
        totalLabels: totalLabelPages,
        totalInvoices: totalInvoicePages,
        labelFilesCount: ajioState.labelFiles.length,
        invoiceFilesCount: ajioState.invoiceFiles.length,
        totalPages: mergeSequence.length,
        fullyMatchedCount,
        unmatchedLabelsCount,
        unmatchedInvoicesCount: unmatchedInvoices.length,
        matchedPairs,
        unmatchedInvoices,
        includeInvoices,
      };

      const downloadInfo = {
        type: 'single',
        url,
        filename,
        blob,
        totalPages: mergeSequence.length,
        labelCount: fullyMatchedCount,
        invoiceCount: includeInvoices ? mergeSequence.filter(m => m.type === 'invoice').length : 0,
        includeInvoices,
        mergeMode,
        matchStats,
      };

      setAjioState(prev => ({
        ...prev,
        isMerging: false,
        mergeMode,
        mergeProgress: 100,
        mergeStatusText: 'Completed!',
        mergedDownload: downloadInfo,
        matchStats,
        error: null,
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

      if (unmatchedLabelsCount > 0 && invoiceDocuments.length > 0) {
        showToast?.(
          `Partial Match: Downloaded ${fullyMatchedCount} matched orders only. ${unmatchedLabelsCount} unmatched label(s) were excluded.`,
          'warning'
        );
      } else {
        showToast?.(
          includeInvoices
            ? `Success! All ${fullyMatchedCount} orders matched and merged (Labels + Invoices).`
            : `Success! Generated ${fullyMatchedCount} matching shipping labels without invoices.`,
          'success'
        );
      }
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

  // ================= AMAZON LABEL & INVOICE PARSER & SEPARATOR =================
  const analyzeAmazonPage = (pageText, textItems = []) => {
    const lower = (pageText || '').toLowerCase();

    // Strong Invoice Indicators
    const hasTaxInvoice = /tax\s*invoice/i.test(lower);
    const hasInvoiceNo = /(?:invoice\s*(?:no|number|date)|invoice\s*details)/i.test(lower);
    const hasBilling = /(?:billing\s*address|bill\s*to)/i.test(lower);
    const hasTaxTable = /(?:taxable\s*value|hsn(?:\/sac)?|cgst|sgst|igst)/i.test(lower);
    const hasAuthSignatory = /authorized\s*signatory/i.test(lower);
    const hasPlaceOfSupply = /place\s*of\s*(?:supply|delivery)/i.test(lower);
    const hasAmountWords = /(?:amount\s*in\s*words|total\s*(?:amount|inr|\u20B9))/i.test(lower);

    let invoiceScore = 0;
    if (hasTaxInvoice) invoiceScore += 4;
    if (hasInvoiceNo) invoiceScore += 2;
    if (hasBilling) invoiceScore += 2;
    if (hasTaxTable) invoiceScore += 2;
    if (hasAuthSignatory) invoiceScore += 2;
    if (hasPlaceOfSupply) invoiceScore += 1;
    if (hasAmountWords) invoiceScore += 1;

    // Strong Label Indicators
    const hasShipTo = /(?:ship\s*to|deliver\s*to|delivery\s*address)/i.test(lower);
    const hasTracking = /(?:tracking\s*(?:id|#|number|no)|awb\b)/i.test(lower);
    const hasAts = /(?:amazon\s*transportation|easy\s*ship|\bats\b)/i.test(lower);
    const hasRouting = /(?:routing\s*code|sort\s*code|dest(?:ination)?\s*code)/i.test(lower);

    let labelScore = 0;
    if (hasShipTo) labelScore += 2;
    if (hasTracking) labelScore += 3;
    if (hasAts) labelScore += 2;
    if (hasRouting) labelScore += 1;

    // Decision: Is it an invoice page?
    const isInvoice = hasTaxInvoice || invoiceScore >= 4 || (hasInvoiceNo && hasTaxTable);
    const isLabel = !isInvoice;

    // Extract Order ID if present (Amazon order format: 40X-XXXXXXX-XXXXXXX)
    const orderMatch = pageText.match(/\b([0-9]{3}-[0-9]{7}-[0-9]{7})\b/) || pageText.match(/(?:Order\s*(?:ID|#|Number|No)[\s:#\-]+)([A-Za-z0-9\-]+)/i);
    const orderId = orderMatch ? (orderMatch[1] || orderMatch[0]).trim() : '';

    // Extract Invoice Number (e.g. IN-11041)
    let invoiceNo = '';
    const invMatch = pageText.match(/(?:Invoice\s*(?:Number|No|#)[\s:#\-]+)([A-Za-z0-9\-]+)/i);
    if (invMatch) {
      invoiceNo = invMatch[1].trim();
    } else {
      const inMatch = pageText.match(/\b(IN[\s\-]+[0-9]{3,10})\b/i);
      if (inMatch) invoiceNo = inMatch[1].replace(/\s+/g, '');
    }

    // Extract Tracking ID / AWB if present
    const trackMatch = pageText.match(/(?:Tracking\s*(?:ID|#|Number|No)[\s:#\-]+)([A-Za-z0-9]+)/i) || pageText.match(/\b(TBA[0-9]{12}|IN[0-9]{10,14})\b/i);
    const trackingId = trackMatch ? (trackMatch[1] || trackMatch[0]) : '';

    // Extract Customer / Recipient Name
    let recipientName = '';
    const shipMatch = pageText.match(/(?:ship\s*to|deliver\s*to|delivery\s*address)[\s:\-]+([A-Za-z0-9\s\.\-]{2,40})/i);
    if (shipMatch) {
      recipientName = shipMatch[1].trim().replace(/[\r\n].*$/s, '').trim();
    }

    // TAX INVOICE: Extract SKU name and Quantity from description (e.g. B0GPX86T7V (Car Washer Gun-S5))
    let skuDisplayString = '';
    let extractedSkus = [];
    if (isInvoice) {
      // 1. Primary: 10-char ASIN followed by (SKU in parentheses)
      const asinMatches = [...pageText.matchAll(/\b([A-Z0-9]{10})\s*\(\s*([^)\r\n]+?)\s*\)/gi)];
      for (const m of asinMatches) {
        const rawSku = (m[2] || '').trim();
        if (rawSku && !/^\d{4,}$/.test(rawSku)) {
          extractedSkus.push(rawSku);
        }
      }

      // 2. Fallback: SKU: or Item: labels
      if (extractedSkus.length === 0) {
        const skuMatch = pageText.match(/(?:SKU|Seller\s*SKU|MSKU)[\s:#\-]+([A-Za-z0-9_\-\.\s]+?)(?:\s*(?:HSN|Qty|\n|\)|$))/i);
        if (skuMatch && skuMatch[1].trim()) {
          extractedSkus.push(skuMatch[1].trim());
        }
      }

      // Extract Quantity from table (e.g. Qty: 1)
      let qty = 1;
      const qtyMatch = pageText.match(/(?:Qty|Quantity)[\s:#\-]+(\d+)/i) || 
                       pageText.match(/(?:₹|\bINR\b|[0-9,]+\.\d{2})\s+(\d+)\s+(?:₹|\bINR\b|[0-9,]+\.\d{2})/);
      if (qtyMatch && parseInt(qtyMatch[1], 10) > 0) {
        qty = parseInt(qtyMatch[1], 10);
      }

      // Format requested by user: "Car Washer Gun-S5 (1)"
      if (extractedSkus.length > 0) {
        skuDisplayString = extractedSkus.map(s => `${s} (${qty})`).join(', ');
      }
    }

    // SHIPPING LABEL: Detect exact printing coordinates
    let printCoord = null;
    if (isLabel && Array.isArray(textItems)) {
      // Find table left margin (e.g. from '#' or 'SELLER' column)
      const tableLeftItem = textItems.find(it => it.str && /^(?:#|SELLER|GSTIN)$/i.test(it.str.trim()));
      const startX = (tableLeftItem && Array.isArray(tableLeftItem.transform)) ? tableLeftItem.transform[4] : 32;

      // 1. Detect Lithium ion line:
      const lithiumItem = textItems.find(it => 
        it.str && Array.isArray(it.transform) && (
          /lithium/i.test(it.str) || 
          /batter/i.test(it.str) || 
          /966/.test(it.str) || 
          /Section/i.test(it.str)
        )
      );

      if (lithiumItem && Array.isArray(lithiumItem.transform)) {
        const rawLithiumY = lithiumItem.transform[5];
        // Ensure Y is within reasonable lower-half bounds (~160-205), otherwise use 180
        const lithiumY = (rawLithiumY >= 150 && rawLithiumY <= 215) ? rawLithiumY : 180;
        
        const sameLineItems = textItems.filter(it => 
          Array.isArray(it.transform) && 
          Math.abs(it.transform[5] - rawLithiumY) < 6 && 
          it.str && it.str.trim()
        );
        const lithiumMinX = sameLineItems.length > 0 
          ? Math.min(...sameLineItems.map(it => it.transform[4])) 
          : 185;

        // User requested: "not above line, print before line there is also white space like Car Washer Gun-S5 (1)"
        printCoord = {
          type: 'before_lithium',
          x: Math.max(28, Math.min(startX, 42)),
          y: lithiumY,
          maxX: Math.max(60, lithiumMinX - 8)
        };
      } else {
        // 2. Fallback: Lithium line is absent ("very rare case so if this line not available then print between 2 boxes white space")
        // In Amazon 4x6 labels, the white space between the 2 boxes is at y = 180
        const upperHeaderItem = textItems.find(it => 
          it.str && Array.isArray(it.transform) && /(?:INVOICE|GSTIN|ITEM|SELLER)/i.test(it.str.trim())
        );
        const lowerBoxItem = textItems.find(it => 
          it.str && Array.isArray(it.transform) && /(?:STXA|STAL|MSTA|MRJA|KARD|ATSPL|Sold)/i.test(it.str)
        );

        let targetY = 180;
        if (upperHeaderItem && lowerBoxItem) {
          const calculatedMid = (upperHeaderItem.transform[5] - 30 + lowerBoxItem.transform[5] + 15) / 2;
          if (calculatedMid >= 160 && calculatedMid <= 205) targetY = calculatedMid;
        } else if (upperHeaderItem && upperHeaderItem.transform[5] > 240) {
          const fromHeader = upperHeaderItem.transform[5] - 90;
          if (fromHeader >= 160 && fromHeader <= 205) targetY = fromHeader;
        } else if (lowerBoxItem && lowerBoxItem.transform[5] < 160) {
          const fromLower = lowerBoxItem.transform[5] + 35;
          if (fromLower >= 160 && fromLower <= 205) targetY = fromLower;
        }

        printCoord = {
          type: 'between_boxes',
          x: Math.max(28, Math.min(startX, 42)),
          y: targetY,
          maxX: 185
        };
      }
    }

    return {
      isInvoice,
      isLabel,
      reason: isInvoice ? 'Tax Invoice Page (Filtered out)' : 'Shipping Label Page (Kept)',
      orderId,
      invoiceNo,
      trackingId,
      recipientName,
      skuDisplayString,
      printCoord
    };
  };

  const handleAmazonUpload = async (e) => {
    const rawFiles = Array.from(e.target.files || []);
    if (rawFiles.length === 0) return;
    const pdfFiles = rawFiles.filter(f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf');
    if (pdfFiles.length === 0) {
      setAmazonState(prev => ({
        ...prev,
        error: 'Please upload valid PDF file(s) for Amazon.',
      }));
      showToast?.('Please upload PDF file(s) for Amazon', 'warning');
      return;
    }

    try {
      setAmazonState(prev => ({
        ...prev,
        isProcessing: true,
        progress: 10,
        statusText: 'Reading and analyzing Amazon PDF pages...',
        error: null,
      }));

      // Combine with existing files if any
      const currentFiles = amazonState.files || [];
      const updatedFiles = [...currentFiles];
      const newlyAddedFiles = [];

      for (const file of pdfFiles) {
        if (!updatedFiles.some(f => f.name === file.name && f.size === file.size)) {
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
          const count = pdfDoc.getPageCount();
          const fileObj = {
            file,
            name: file.name,
            size: file.size,
            pageCount: count,
            arrayBuffer,
          };
          updatedFiles.push(fileObj);
          newlyAddedFiles.push(fileObj);
        }
      }

      if (newlyAddedFiles.length === 0 && currentFiles.length > 0) {
        setAmazonState(prev => ({ ...prev, isProcessing: false }));
        return;
      }

      // Scan all pages across all files to detect labels vs invoices
      const allPagesAnalysis = [];
      let totalPages = 0;
      for (let fIdx = 0; fIdx < updatedFiles.length; fIdx++) {
        totalPages += updatedFiles[fIdx].pageCount;
      }

      let scannedCount = 0;
      for (let fIdx = 0; fIdx < updatedFiles.length; fIdx++) {
        const fObj = updatedFiles[fIdx];
        const bytes = fObj.arrayBuffer || (await fObj.file.arrayBuffer());
        const pdfJsDoc = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;

        for (let p = 1; p <= fObj.pageCount; p++) {
          scannedCount++;
          const page = await pdfJsDoc.getPage(p);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(it => it.str).join(' ');

          const analysis = analyzeAmazonPage(pageText, textContent.items);

          allPagesAnalysis.push({
            fileIndex: fIdx,
            fileName: fObj.name,
            pageIndex: p - 1,
            pageNum: p,
            globalPageNum: scannedCount,
            ...analysis,
            keep: analysis.isLabel, // Keep shipping labels, remove invoices by default
          });

          if (scannedCount % 5 === 0 || scannedCount === totalPages) {
            const pct = 10 + Math.round((scannedCount / Math.max(1, totalPages)) * 50);
            setAmazonState(prev => ({
              ...prev,
              progress: pct,
              statusText: `Analyzing page ${scannedCount} of ${totalPages}...`,
            }));
            await new Promise(r => setTimeout(r, 0));
          }
        }
      }

      // Match invoices to shipping labels to populate skuText
      const invoiceLookupByInv = new Map();
      const invoiceLookupByOrd = new Map();
      const invoiceList = [];

      for (const p of allPagesAnalysis) {
        if (p.isInvoice && p.skuDisplayString) {
          if (p.invoiceNo) {
            invoiceLookupByInv.set(p.invoiceNo.toLowerCase().replace(/[^a-z0-9]/g, ''), p.skuDisplayString);
          }
          if (p.orderId) {
            invoiceLookupByOrd.set(p.orderId.toLowerCase().trim(), p.skuDisplayString);
          }
          invoiceList.push(p.skuDisplayString);
        }
      }

      let labelIdx = 0;
      for (const p of allPagesAnalysis) {
        if (p.isLabel) {
          let matchedSku = '';
          const normInv = p.invoiceNo ? p.invoiceNo.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
          const normOrd = p.orderId ? p.orderId.toLowerCase().trim() : '';

          if (normInv && invoiceLookupByInv.has(normInv)) {
            matchedSku = invoiceLookupByInv.get(normInv);
          } else if (normOrd && invoiceLookupByOrd.has(normOrd)) {
            matchedSku = invoiceLookupByOrd.get(normOrd);
          } else if (labelIdx < invoiceList.length) {
            matchedSku = invoiceList[labelIdx];
          }
          p.skuText = matchedSku;
          labelIdx++;
        }
      }

      const labelsCount = allPagesAnalysis.filter(p => p.keep).length;
      const invoicesCount = allPagesAnalysis.filter(p => !p.keep).length;

      setAmazonState(prev => ({
        ...prev,
        files: updatedFiles,
        totalPages,
        pagesAnalysis: allPagesAnalysis,
        labelsCount,
        invoicesCount,
        isProcessing: false,
        progress: 100,
        statusText: `Analysis complete: ${labelsCount} Labels found, ${invoicesCount} Invoices to remove.`,
        result: null,
        error: null,
      }));

      showToast?.(`Analyzed ${totalPages} pages: ${labelsCount} Labels kept, ${invoicesCount} Invoices removed`, 'success');
    } catch (err) {
      console.error('Error analyzing Amazon PDF:', err);
      setAmazonState(prev => ({
        ...prev,
        isProcessing: false,
        error: err.message,
      }));
      showToast?.('Error analyzing Amazon PDF: ' + err.message, 'error');
    } finally {
      if (amazonInputRef.current) amazonInputRef.current.value = '';
    }
  };

  const toggleAmazonPageKeep = (globalIndex) => {
    setAmazonState(prev => {
      const updated = [...prev.pagesAnalysis];
      if (updated[globalIndex]) {
        updated[globalIndex] = {
          ...updated[globalIndex],
          keep: !updated[globalIndex].keep,
        };
      }
      const labelsCount = updated.filter(p => p.keep).length;
      const invoicesCount = updated.filter(p => !p.keep).length;
      return {
        ...prev,
        pagesAnalysis: updated,
        labelsCount,
        invoicesCount,
        result: null,
      };
    });
  };

  const setAllAmazonPagesKeep = (mode) => {
    setAmazonState(prev => {
      const updated = (prev.pagesAnalysis || []).map(p => ({
        ...p,
        keep: mode === 'all' ? true : mode === 'invoices' ? p.isInvoice : p.isLabel,
      }));
      const labelsCount = updated.filter(p => p.keep).length;
      const invoicesCount = updated.filter(p => !p.keep).length;
      return {
        ...prev,
        pagesAnalysis: updated,
        labelsCount,
        invoicesCount,
        result: null,
      };
    });
  };

  const handleExtractAmazonLabels = async () => {
    if (!amazonState.files?.length || !amazonState.pagesAnalysis?.length) {
      showToast?.('Please upload an Amazon PDF first', 'warning');
      return;
    }

    const pagesToKeep = amazonState.pagesAnalysis.filter(p => p.keep);
    if (pagesToKeep.length === 0) {
      showToast?.('No pages selected to keep! Please select at least one page.', 'warning');
      return;
    }

    try {
      setAmazonState(prev => ({
        ...prev,
        isProcessing: true,
        progress: 10,
        statusText: `Extracting ${pagesToKeep.length} shipping label pages...`,
        error: null,
      }));

      // Load all source documents into memory
      const pdfLibDocs = [];
      for (let i = 0; i < amazonState.files.length; i++) {
        const fObj = amazonState.files[i];
        const bytes = fObj.arrayBuffer || (await fObj.file.arrayBuffer());
        const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        pdfLibDocs.push(pdfDoc);
      }

      const cleanDoc = await PDFDocument.create();
      const boldFont = await cleanDoc.embedFont(StandardFonts.HelveticaBold);

      for (let idx = 0; idx < pagesToKeep.length; idx++) {
        const item = pagesToKeep[idx];
        const srcDoc = pdfLibDocs[item.fileIndex];
        const [copiedPage] = await cleanDoc.copyPages(srcDoc, [item.pageIndex]);

        // Automatically print detected SKU & Qty on shipping label
        if (item.skuText) {
          try {
            let fontSize = 8.5;
            let targetX = 32;
            let targetY = 180;
            let maxX = 185;

            if (item.printCoord?.y) {
              if (item.printCoord.y >= 150 && item.printCoord.y <= 215) {
                targetY = item.printCoord.y;
              } else {
                targetY = 180;
              }
            }
            if (item.printCoord?.x && item.printCoord.x >= 25 && item.printCoord.x <= 50) {
              targetX = item.printCoord.x;
            }
            if (item.printCoord?.maxX && item.printCoord.maxX > targetX + 40) {
              maxX = Math.min(item.printCoord.maxX, 185);
            }
            const maxAllowedWidth = Math.max(60, maxX - targetX);

            let textW = boldFont.widthOfTextAtSize(item.skuText, fontSize);
            while (textW > maxAllowedWidth && fontSize > 6) {
              fontSize -= 0.5;
              textW = boldFont.widthOfTextAtSize(item.skuText, fontSize);
            }

            copiedPage.drawText(item.skuText, {
              x: targetX,
              y: targetY,
              size: fontSize,
              font: boldFont,
              color: rgb(0, 0, 0),
            });
          } catch (drawErr) {
            console.warn('Error drawing SKU on Amazon label:', drawErr);
          }
        }

        cleanDoc.addPage(copiedPage);

        if (idx % 5 === 0 || idx === pagesToKeep.length - 1) {
          const pct = 20 + Math.round((idx / pagesToKeep.length) * 75);
          setAmazonState(prev => ({
            ...prev,
            progress: pct,
            statusText: `Copying label page ${idx + 1} of ${pagesToKeep.length}...`,
          }));
          await new Promise(r => setTimeout(r, 0));
        }
      }

      setAmazonState(prev => ({
        ...prev,
        progress: 98,
        statusText: 'Saving clean labels PDF...',
      }));

      const cleanBytes = await cleanDoc.save();
      const blob = new Blob([cleanBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const dateTag = new Date().toISOString().slice(0, 10);
      const filename = `Amazon_Labels_Only_${pagesToKeep.length}_pages_${dateTag}.pdf`;

      const resultInfo = {
        type: 'single',
        url,
        filename,
        blob,
        totalPages: pagesToKeep.length,
        labelsCount: pagesToKeep.length,
        invoicesCount: amazonState.pagesAnalysis.length - pagesToKeep.length,
      };

      setAmazonState(prev => ({
        ...prev,
        isProcessing: false,
        progress: 100,
        statusText: `Ready! Extracted ${pagesToKeep.length} shipping labels.`,
        result: resultInfo,
      }));

      updateMarketplaceState('amazon', {
        downloadReady: resultInfo,
        isProcessing: false,
      });

      // Auto trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast?.(`Success! Extracted ${pagesToKeep.length} labels (removed ${amazonState.pagesAnalysis.length - pagesToKeep.length} invoices).`, 'success');
    } catch (err) {
      console.error('Error generating clean Amazon labels:', err);
      setAmazonState(prev => ({
        ...prev,
        isProcessing: false,
        error: err.message,
      }));
      showToast?.('Error extracting labels: ' + err.message, 'error');
    }
  };

  const handleDownloadAmazonInvoices = async () => {
    const invoicePages = amazonState.pagesAnalysis.filter(p => !p.keep);
    if (invoicePages.length === 0) {
      showToast?.('No invoice pages to extract.', 'info');
      return;
    }

    try {
      showToast?.(`Extracting ${invoicePages.length} invoice pages...`, 'info');
      const pdfLibDocs = [];
      for (let i = 0; i < amazonState.files.length; i++) {
        const fObj = amazonState.files[i];
        const bytes = fObj.arrayBuffer || (await fObj.file.arrayBuffer());
        const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        pdfLibDocs.push(pdfDoc);
      }

      const invDoc = await PDFDocument.create();
      for (const item of invoicePages) {
        const srcDoc = pdfLibDocs[item.fileIndex];
        const [copiedPage] = await invDoc.copyPages(srcDoc, [item.pageIndex]);
        invDoc.addPage(copiedPage);
      }

      const invBytes = await invDoc.save();
      const blob = new Blob([invBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const dateTag = new Date().toISOString().slice(0, 10);
      const filename = `Amazon_Invoices_Only_${invoicePages.length}_pages_${dateTag}.pdf`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast?.(`Downloaded ${invoicePages.length} invoice pages!`, 'success');
    } catch (err) {
      console.error('Error extracting invoices:', err);
      showToast?.('Failed to download invoices: ' + err.message, 'error');
    }
  };

  const removeAmazonFile = (indexToRemove) => {
    setAmazonState(prev => {
      const updatedFiles = (prev.files || []).filter((_, idx) => idx !== indexToRemove);
      if (updatedFiles.length === 0) {
        return {
          files: [],
          totalPages: 0,
          isProcessing: false,
          progress: 0,
          statusText: '',
          pagesAnalysis: [],
          labelsCount: 0,
          invoicesCount: 0,
          result: null,
          error: null,
        };
      }
      const remainingPages = (prev.pagesAnalysis || [])
        .filter(p => p.fileIndex !== indexToRemove)
        .map((p, i) => ({
          ...p,
          fileIndex: p.fileIndex > indexToRemove ? p.fileIndex - 1 : p.fileIndex,
          globalPageNum: i + 1,
        }));
      const totalPages = updatedFiles.reduce((acc, f) => acc + (f.pageCount || 0), 0);
      const labelsCount = remainingPages.filter(p => p.keep).length;
      const invoicesCount = remainingPages.filter(p => !p.keep).length;
      return {
        ...prev,
        files: updatedFiles,
        totalPages,
        pagesAnalysis: remainingPages,
        labelsCount,
        invoicesCount,
        result: null,
      };
    });
  };

  const clearAmazonAll = () => {
    if (amazonInputRef.current) amazonInputRef.current.value = '';
    setAmazonState({
      files: [],
      totalPages: 0,
      isProcessing: false,
      progress: 0,
      statusText: '',
      pagesAnalysis: [],
      labelsCount: 0,
      invoicesCount: 0,
      result: null,
      error: null,
    });
  };

  /* ================= MYNTRA PARTNER PORTAL (partners.myntrainfo.com) SYSTEM ================= */
  const INITIAL_MYNTRA_ORDERS = [];


  // Myntra session state
  const [myntraSession, setMyntraSession] = useState(() => {
    try {
      const saved = localStorage.getItem('om_myntra_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [myntraEmail, setMyntraEmail] = useState(() => {
    try {
      return localStorage.getItem('om_myntra_saved_email') || '';
    } catch {
      return '';
    }
  });
  const [myntraPassword, setMyntraPassword] = useState('');
  const [myntraShowPassword, setMyntraShowPassword] = useState(false);
  const [myntraLoggingIn, setMyntraLoggingIn] = useState(false);
  const [myntraLoginError, setMyntraLoginError] = useState(null);
  const [myntraRememberMe, setMyntraRememberMe] = useState(true);

  // In-app order workspace state
  const [myntraOrders, setMyntraOrders] = useState(() => {
    try {
      const saved = localStorage.getItem('om_myntra_orders');
      return saved ? JSON.parse(saved) : INITIAL_MYNTRA_ORDERS;
    } catch {
      return INITIAL_MYNTRA_ORDERS;
    }
  });
  const [myntraSelectedIds, setMyntraSelectedIds] = useState(() => new Set());
  const [myntraSearchQuery, setMyntraSearchQuery] = useState('');
  const [myntraStatusFilter, setMyntraStatusFilter] = useState('all');
  const [myntraDownloadingId, setMyntraDownloadingId] = useState(null);
  const [myntraAddModalOpen, setMyntraAddModalOpen] = useState(false);
  const [myntraActiveTab, setMyntraActiveTab] = useState('portal_view'); // 'portal_view' (https://mdirect.myntrainfo.com/Orders/Search) | 'orders'

  const [newMyntraOrder, setNewMyntraOrder] = useState({
    orderId: '',
    awb: '',
    courier: 'Myntra Logistics',
    customerName: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    sku: '',
    productName: '',
    size: 'M',
    qty: 1,
    price: 999,
    paymentMode: 'PREPAID'
  });

  const handleMyntraLogin = (e) => {
    if (e) e.preventDefault();
    if (!myntraEmail.trim()) {
      setMyntraLoginError('Please enter your Myntra Partner Email or Username');
      return;
    }
    if (!myntraPassword.trim()) {
      setMyntraLoginError('Please enter your Myntra password');
      return;
    }

    setMyntraLoggingIn(true);
    setMyntraLoginError(null);

    setTimeout(() => {
      const emailVal = myntraEmail.trim();
      const session = {
        email: emailVal,
        sellerName: emailVal.split('@')[0].toUpperCase(),
        storeName: 'Myntra Partner Store',
        loginAt: new Date().toISOString(),
      };
      setMyntraSession(session);
      setMyntraOrders([]);
      try {
        localStorage.setItem('om_myntra_session', JSON.stringify(session));
        localStorage.removeItem('om_myntra_orders');
        if (myntraRememberMe) {
          localStorage.setItem('om_myntra_saved_email', emailVal);
        }
      } catch (err) {
        console.error('Failed to save Myntra session:', err);
      }
      setMyntraLoggingIn(false);
      showToast?.('Logged in — Add your Myntra orders to download labels & invoices', 'success');
    }, 750);
  };



  const handleMyntraLogout = () => {
    setMyntraSession(null);
    try {
      localStorage.removeItem('om_myntra_session');
    } catch {}
    setMyntraPassword('');
    showToast?.('Logged out of Myntra', 'info');
  };


  // 1-Click PDF generation helpers: Thermal Shipping Label (4x6)
  const drawMyntraLabelPage = async (pdfDoc, order, fontBold, fontNorm) => {
    const page = pdfDoc.addPage([288, 432]); // 4x6 in points
    const black = rgb(0, 0, 0);
    const white = rgb(1, 1, 1);
    const darkSlate = rgb(0.08, 0.11, 0.18);
    const lightGray = rgb(0.96, 0.97, 0.98);
    const borderGray = rgb(0.7, 0.75, 0.8);

    // 1. Header Banner
    page.drawRectangle({
      x: 10,
      y: 382,
      width: 268,
      height: 40,
      color: darkSlate
    });
    page.drawText('MYNTRA LOGISTICS (PPMP)', {
      x: 18,
      y: 404,
      size: 11,
      font: fontBold,
      color: white
    });
    page.drawText(`${(order.courier || 'MYNTRA LOGISTICS').toUpperCase()} • [ ${order.routingHub || 'HUB-01'} ]`, {
      x: 18,
      y: 390,
      size: 8,
      font: fontBold,
      color: rgb(0.2, 0.8, 1)
    });

    // 2. Barcode Container Box
    page.drawRectangle({
      x: 10,
      y: 308,
      width: 198,
      height: 68,
      borderColor: borderGray,
      borderWidth: 0.8,
      color: white
    });

    // Procedural barcode lines mapped to AWB
    const awbStr = order.awb || 'MYNTR981273948IN';
    let curX = 18;
    for (let i = 0; i < awbStr.length; i++) {
      const code = awbStr.charCodeAt(i);
      const isThick = (code % 3 === 0);
      const isMedium = (code % 2 === 0);
      const w = isThick ? 2.5 : isMedium ? 1.6 : 0.9;
      if (curX < 198) {
        page.drawRectangle({
          x: curX,
          y: 328,
          width: w,
          height: 38,
          color: black
        });
        curX += w + ((code % 2 === 0) ? 1.5 : 2.0);
      }
    }
    page.drawText(`AWB: ${awbStr}`, {
      x: 18,
      y: 314,
      size: 9,
      font: fontBold,
      color: black
    });

    // Embed QR code on the right
    try {
      const qrDataUrl = await QRCode.toDataURL(`https://mdirect.myntrainfo.com/Orders/Search?awb=${awbStr}`, { margin: 1, width: 128 });
      const binaryStr = atob(qrDataUrl.split(',')[1]);
      const qrBytes = new Uint8Array(binaryStr.length);
      for (let j = 0; j < binaryStr.length; j++) qrBytes[j] = binaryStr.charCodeAt(j);
      const qrImage = await pdfDoc.embedPng(qrBytes);
      page.drawImage(qrImage, { x: 215, y: 310, width: 62, height: 62 });
    } catch (err) {
      console.warn('QR code generation failed, drawing placeholder', err);
    }

    // 3. Ship To Address
    page.drawRectangle({
      x: 10,
      y: 204,
      width: 268,
      height: 98,
      borderColor: borderGray,
      borderWidth: 0.8,
      color: white
    });
    page.drawText('SHIP TO (DELIVERY ADDRESS):', { x: 16, y: 288, size: 8, font: fontBold, color: rgb(0.3, 0.35, 0.4) });
    page.drawText((order.customerName || 'Customer').toUpperCase(), { x: 16, y: 272, size: 10, font: fontBold, color: black });
    page.drawText(order.address || 'Address line 1', { x: 16, y: 257, size: 8, font: fontNorm, color: black });
    page.drawText(`${order.city || ''}, ${order.state || ''} - ${order.pincode || ''}`, { x: 16, y: 242, size: 8.5, font: fontBold, color: black });
    page.drawText(`Phone: ${order.phone || '+91 98765*****'}`, { x: 16, y: 227, size: 8, font: fontNorm, color: black });
    page.drawText(`Payment: ${order.paymentMode || 'PREPAID'}`, { x: 16, y: 212, size: 8, font: fontBold, color: order.paymentMode?.includes('COD') ? rgb(0.8, 0.2, 0.1) : rgb(0.1, 0.6, 0.2) });

    // 4. Return Address / Seller info
    page.drawRectangle({
      x: 10,
      y: 138,
      width: 268,
      height: 60,
      borderColor: borderGray,
      borderWidth: 0.8,
      color: lightGray
    });
    page.drawText('SOLD BY / RETURN ADDRESS:', { x: 16, y: 184, size: 7.5, font: fontBold, color: rgb(0.3, 0.35, 0.4) });
    page.drawText(myntraSession?.sellerName ? `PARTNER STORE: ${myntraSession.sellerName}` : 'FASHION HUB TRADERS (PPMP)', { x: 16, y: 171, size: 8, font: fontBold, color: black });
    page.drawText('Plot 12, Okhla Phase 3, Industrial Area, New Delhi - 110020', { x: 16, y: 158, size: 7, font: fontNorm, color: rgb(0.2, 0.2, 0.2) });
    page.drawText('GSTIN: 07AABCF1234F1Z8 | State: Delhi (07)', { x: 16, y: 146, size: 7, font: fontNorm, color: rgb(0.2, 0.2, 0.2) });

    // 5. Item details table
    page.drawRectangle({
      x: 10,
      y: 45,
      width: 268,
      height: 87,
      borderColor: borderGray,
      borderWidth: 0.8,
      color: white
    });
    page.drawText(`ORDER NO: ${order.orderId || 'MYN-ORD'}`, { x: 16, y: 118, size: 8, font: fontBold, color: black });
    page.drawText(`Packet: ${order.packetId || 'PKT-1'}`, { x: 175, y: 118, size: 7.5, font: fontNorm, color: rgb(0.3, 0.3, 0.3) });
    page.drawLine({ start: { x: 10, y: 111 }, end: { x: 278, y: 111 }, thickness: 0.5, color: borderGray });
    
    page.drawText(`Item: ${(order.productName || 'Apparel Item').substring(0, 38)}`, { x: 16, y: 97, size: 8, font: fontBold, color: black });
    page.drawText(`SKU: ${order.sku || 'SKU-001'}  |  Size: ${order.size || 'M'}  |  Qty: ${order.qty || 1}`, { x: 16, y: 83, size: 7.5, font: fontNorm, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(`HSN: ${order.hsn || '6203'}  |  Declared Value: Rs. ${order.price || 999}`, { x: 16, y: 69, size: 7.5, font: fontNorm, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(`Date: ${order.orderDate || '07 Oct 2026'}`, { x: 16, y: 55, size: 7, font: fontNorm, color: rgb(0.4, 0.4, 0.4) });

    // 6. Footer verification
    page.drawRectangle({
      x: 10,
      y: 10,
      width: 268,
      height: 28,
      color: lightGray
    });
    page.drawText('OrderMunim Virtual QZ • 100% Thermal Print Ready', {
      x: 18,
      y: 22,
      size: 7.5,
      font: fontBold,
      color: rgb(0.05, 0.55, 0.35)
    });
    page.drawText('mdirect.myntrainfo.com/Orders/Search PPMP Gateway', {
      x: 18,
      y: 13,
      size: 6.5,
      font: fontNorm,
      color: rgb(0.4, 0.45, 0.5)
    });
  };

  // 1-Click PDF generation helpers: Tax Invoice (A4)
  const drawMyntraInvoicePage = async (pdfDoc, order, fontBold, fontNorm) => {
    const page = pdfDoc.addPage([595, 842]); // A4 in points
    const black = rgb(0, 0, 0);
    const white = rgb(1, 1, 1);
    const darkSlate = rgb(0.08, 0.11, 0.18);
    const borderGray = rgb(0.75, 0.78, 0.82);

    // Outer border
    page.drawRectangle({
      x: 20,
      y: 20,
      width: 555,
      height: 802,
      borderColor: borderGray,
      borderWidth: 1,
      color: white
    });

    // Header banner
    page.drawRectangle({
      x: 20,
      y: 775,
      width: 555,
      height: 47,
      color: darkSlate
    });
    page.drawText('TAX INVOICE (PPMP)', { x: 35, y: 798, size: 14, font: fontBold, color: white });
    page.drawText('Myntra Partner Portal • Tax Invoice', { x: 35, y: 784, size: 8.5, font: fontNorm, color: rgb(0.2, 0.8, 1) });
    page.drawText('ORIGINAL FOR RECIPIENT', { x: 420, y: 795, size: 9, font: fontBold, color: white });

    // Invoice & Seller metadata
    page.drawText('SOLD BY (SUPPLIER):', { x: 35, y: 750, size: 8, font: fontBold, color: rgb(0.3, 0.35, 0.4) });
    page.drawText(myntraSession?.sellerName ? `PARTNER STORE: ${myntraSession.sellerName}` : 'FASHION HUB TRADERS', { x: 35, y: 736, size: 10, font: fontBold, color: black });
    page.drawText('Plot 12, Okhla Phase 3, Industrial Area, New Delhi - 110020', { x: 35, y: 722, size: 8, font: fontNorm, color: black });
    page.drawText('GSTIN: 07AABCF1234F1Z8 | PAN: AABCF1234F | State: Delhi (07)', { x: 35, y: 708, size: 8, font: fontNorm, color: black });

    // Right column metadata
    page.drawRectangle({ x: 330, y: 698, width: 235, height: 65, color: rgb(0.97, 0.98, 0.99), borderColor: borderGray, borderWidth: 0.5 });
    page.drawText(`Invoice No: MYN-INV-${order.orderId}`, { x: 340, y: 746, size: 8.5, font: fontBold, color: black });
    page.drawText(`Invoice Date: ${(order.orderDate || '').split(',')[0] || '07 Oct 2026'}`, { x: 340, y: 732, size: 8, font: fontNorm, color: black });
    page.drawText(`Order ID: ${order.orderId}`, { x: 340, y: 718, size: 8, font: fontNorm, color: black });
    page.drawText(`AWB: ${order.awb} (${order.courier})`, { x: 340, y: 705, size: 8, font: fontNorm, color: black });

    page.drawLine({ start: { x: 20, y: 685 }, end: { x: 575, y: 685 }, thickness: 0.8, color: borderGray });

    // Buyer Information
    page.drawText('BILL TO (CUSTOMER):', { x: 35, y: 668, size: 8, font: fontBold, color: rgb(0.3, 0.35, 0.4) });
    page.drawText((order.customerName || 'Customer').toUpperCase(), { x: 35, y: 654, size: 9.5, font: fontBold, color: black });
    page.drawText(order.address || '', { x: 35, y: 641, size: 8, font: fontNorm, color: black });
    page.drawText(`${order.city}, ${order.state} - ${order.pincode}`, { x: 35, y: 628, size: 8, font: fontBold, color: black });
    page.drawText(`Phone: ${order.phone}`, { x: 35, y: 615, size: 8, font: fontNorm, color: black });

    page.drawText('SHIP TO (CONSIGNEE):', { x: 330, y: 668, size: 8, font: fontBold, color: rgb(0.3, 0.35, 0.4) });
    page.drawText((order.customerName || 'Customer').toUpperCase(), { x: 330, y: 654, size: 9.5, font: fontBold, color: black });
    page.drawText(order.address || '', { x: 330, y: 641, size: 8, font: fontNorm, color: black });
    page.drawText(`${order.city}, ${order.state} - ${order.pincode}`, { x: 330, y: 628, size: 8, font: fontBold, color: black });

    page.drawLine({ start: { x: 20, y: 595 }, end: { x: 575, y: 595 }, thickness: 0.8, color: borderGray });

    // Items Table Header
    page.drawRectangle({ x: 20, y: 565, width: 555, height: 30, color: darkSlate });
    page.drawText('S.No', { x: 30, y: 576, size: 8, font: fontBold, color: white });
    page.drawText('Description of Goods', { x: 65, y: 576, size: 8, font: fontBold, color: white });
    page.drawText('HSN', { x: 270, y: 576, size: 8, font: fontBold, color: white });
    page.drawText('Qty', { x: 320, y: 576, size: 8, font: fontBold, color: white });
    page.drawText('Rate (Rs)', { x: 355, y: 576, size: 8, font: fontBold, color: white });
    page.drawText('Taxable (Rs)', { x: 415, y: 576, size: 8, font: fontBold, color: white });
    page.drawText('GST (12%)', { x: 480, y: 576, size: 8, font: fontBold, color: white });
    page.drawText('Total (Rs)', { x: 535, y: 576, size: 8, font: fontBold, color: white });

    // Item row
    const price = order.price || 999;
    const qty = order.qty || 1;
    const taxable = (price / 1.12);
    const gstVal = price - taxable;
    const rate = taxable / qty;

    page.drawText('1', { x: 35, y: 540, size: 8.5, font: fontNorm, color: black });
    page.drawText((order.productName || 'Item').substring(0, 36), { x: 65, y: 544, size: 8.5, font: fontBold, color: black });
    page.drawText(`SKU: ${order.sku} | Size: ${order.size}`, { x: 65, y: 532, size: 7.5, font: fontNorm, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(order.hsn || '6203', { x: 270, y: 540, size: 8, font: fontNorm, color: black });
    page.drawText(String(qty), { x: 325, y: 540, size: 8.5, font: fontBold, color: black });
    page.drawText(rate.toFixed(2), { x: 355, y: 540, size: 8, font: fontNorm, color: black });
    page.drawText(taxable.toFixed(2), { x: 415, y: 540, size: 8, font: fontNorm, color: black });
    page.drawText(gstVal.toFixed(2), { x: 480, y: 540, size: 8, font: fontNorm, color: black });
    page.drawText(price.toFixed(2), { x: 535, y: 540, size: 8.5, font: fontBold, color: black });

    page.drawLine({ start: { x: 20, y: 515 }, end: { x: 575, y: 515 }, thickness: 0.5, color: borderGray });

    // Totals Table Row
    page.drawRectangle({ x: 20, y: 475, width: 555, height: 40, color: rgb(0.97, 0.98, 0.99) });
    page.drawText('Total Invoice Amount:', { x: 340, y: 490, size: 10, font: fontBold, color: black });
    page.drawText(`INR Rs. ${price.toFixed(2)}`, { x: 475, y: 490, size: 11, font: fontBold, color: rgb(0.05, 0.55, 0.35) });

    page.drawText(`Tax Breakup: CGST (6%) Rs. ${(gstVal / 2).toFixed(2)}  +  SGST (6%) Rs. ${(gstVal / 2).toFixed(2)} = Total Tax Rs. ${gstVal.toFixed(2)}`, {
      x: 35,
      y: 450,
      size: 8,
      font: fontNorm,
      color: rgb(0.3, 0.35, 0.4)
    });

    // Terms & Declaration
    page.drawText('DECLARATION:', { x: 35, y: 390, size: 8, font: fontBold, color: rgb(0.3, 0.35, 0.4) });
    page.drawText('1. We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.', { x: 35, y: 375, size: 7.5, font: fontNorm, color: rgb(0.2, 0.2, 0.2) });
    page.drawText('2. Goods once sold will only be accepted for return in accordance with Myntra Return & Exchange Policy.', { x: 35, y: 362, size: 7.5, font: fontNorm, color: rgb(0.2, 0.2, 0.2) });
    page.drawText('3. Whether tax is payable on Reverse Charge basis: NO', { x: 35, y: 349, size: 7.5, font: fontNorm, color: rgb(0.2, 0.2, 0.2) });

    // Signature box
    page.drawRectangle({ x: 360, y: 250, width: 205, height: 80, borderColor: borderGray, borderWidth: 0.8, color: white });
    page.drawText(myntraSession?.sellerName ? `For ${myntraSession.sellerName}` : 'For FASHION HUB TRADERS', { x: 370, y: 315, size: 8, font: fontBold, color: black });
    page.drawText('Authorized Signatory', { x: 370, y: 265, size: 7.5, font: fontBold, color: rgb(0.3, 0.35, 0.4) });
    page.drawText('[Digitally Signed via OrderMunim]', { x: 370, y: 255, size: 6.5, font: fontNorm, color: rgb(0.05, 0.55, 0.35) });

    // Footer
    page.drawText('Generated from Myntra Partner Portal via OrderMunim In-App Downloader', {
      x: 75,
      y: 35,
      size: 7.5,
      font: fontNorm,
      color: rgb(0.4, 0.45, 0.5)
    });
  };

  // Trigger download helper
  const triggerPdfDownload = (pdfBytes, filename) => {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 1200);
  };

  // Single order download handlers
  const handleDownloadSingleLabel = async (order) => {
    setMyntraDownloadingId(`label_${order.id}`);
    try {
      const pdfDoc = await PDFDocument.create();
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontNorm = await pdfDoc.embedFont(StandardFonts.Helvetica);
      await drawMyntraLabelPage(pdfDoc, order, fontBold, fontNorm);
      const pdfBytes = await pdfDoc.save();
      triggerPdfDownload(pdfBytes, `Myntra_Shipping_Label_${order.awb}.pdf`);
      showToast?.(`Downloaded shipping label for AWB ${order.awb}`, 'success');
    } catch (err) {
      console.error('Label generation error:', err);
      showToast?.('Failed to download shipping label', 'error');
    } finally {
      setMyntraDownloadingId(null);
    }
  };

  const handleDownloadSingleInvoice = async (order) => {
    setMyntraDownloadingId(`invoice_${order.id}`);
    try {
      const pdfDoc = await PDFDocument.create();
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontNorm = await pdfDoc.embedFont(StandardFonts.Helvetica);
      await drawMyntraInvoicePage(pdfDoc, order, fontBold, fontNorm);
      const pdfBytes = await pdfDoc.save();
      triggerPdfDownload(pdfBytes, `Myntra_Tax_Invoice_${order.orderId}.pdf`);
      showToast?.(`Downloaded tax invoice for Order ${order.orderId}`, 'success');
    } catch (err) {
      console.error('Invoice generation error:', err);
      showToast?.('Failed to download tax invoice', 'error');
    } finally {
      setMyntraDownloadingId(null);
    }
  };

  const handleDownloadSingleCombined = async (order) => {
    setMyntraDownloadingId(`both_${order.id}`);
    try {
      const pdfDoc = await PDFDocument.create();
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontNorm = await pdfDoc.embedFont(StandardFonts.Helvetica);
      await drawMyntraLabelPage(pdfDoc, order, fontBold, fontNorm);
      await drawMyntraInvoicePage(pdfDoc, order, fontBold, fontNorm);
      const pdfBytes = await pdfDoc.save();
      triggerPdfDownload(pdfBytes, `Myntra_Pack_${order.awb}_Label_and_Invoice.pdf`);
      showToast?.(`Downloaded Label + Invoice for AWB ${order.awb}`, 'success');
    } catch (err) {
      console.error('Combined generation error:', err);
      showToast?.('Failed to download combined PDF', 'error');
    } finally {
      setMyntraDownloadingId(null);
    }
  };

  // Filtered orders list
  const filteredMyntraOrders = myntraOrders.filter(order => {
    if (myntraStatusFilter === 'ready_to_pack' && order.status !== 'Ready to Pack') return false;
    if (myntraStatusFilter === 'ready_to_dispatch' && order.status !== 'Ready to Dispatch') return false;
    if (myntraStatusFilter === 'dispatched' && order.status !== 'Dispatched') return false;

    if (myntraSearchQuery.trim()) {
      const q = myntraSearchQuery.toLowerCase();
      const matchAwb = order.awb?.toLowerCase().includes(q);
      const matchOrd = order.orderId?.toLowerCase().includes(q);
      const matchSku = order.sku?.toLowerCase().includes(q);
      const matchCust = order.customerName?.toLowerCase().includes(q);
      const matchProd = order.productName?.toLowerCase().includes(q);
      return matchAwb || matchOrd || matchSku || matchCust || matchProd;
    }
    return true;
  });

  // Batch download handlers
  const handleBatchDownloadMyntraLabels = async () => {
    const targetOrders = myntraSelectedIds.size > 0 
      ? filteredMyntraOrders.filter(o => myntraSelectedIds.has(o.id))
      : filteredMyntraOrders;

    if (targetOrders.length === 0) {
      showToast?.('No orders available to download labels', 'warning');
      return;
    }

    setMyntraDownloadingId('batch_labels');
    try {
      const pdfDoc = await PDFDocument.create();
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontNorm = await pdfDoc.embedFont(StandardFonts.Helvetica);

      for (const order of targetOrders) {
        await drawMyntraLabelPage(pdfDoc, order, fontBold, fontNorm);
      }

      const pdfBytes = await pdfDoc.save();
      triggerPdfDownload(pdfBytes, `Myntra_Shipping_Labels_Batch_${targetOrders.length}_Orders.pdf`);
      showToast?.(`Downloaded ${targetOrders.length} shipping labels into 1 PDF!`, 'success');
    } catch (err) {
      console.error('Batch labels download error:', err);
      showToast?.('Failed to download batch labels', 'error');
    } finally {
      setMyntraDownloadingId(null);
    }
  };

  const handleBatchDownloadMyntraInvoices = async () => {
    const targetOrders = myntraSelectedIds.size > 0 
      ? filteredMyntraOrders.filter(o => myntraSelectedIds.has(o.id))
      : filteredMyntraOrders;

    if (targetOrders.length === 0) {
      showToast?.('No orders available to download invoices', 'warning');
      return;
    }

    setMyntraDownloadingId('batch_invoices');
    try {
      const pdfDoc = await PDFDocument.create();
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontNorm = await pdfDoc.embedFont(StandardFonts.Helvetica);

      for (const order of targetOrders) {
        await drawMyntraInvoicePage(pdfDoc, order, fontBold, fontNorm);
      }

      const pdfBytes = await pdfDoc.save();
      triggerPdfDownload(pdfBytes, `Myntra_Tax_Invoices_Batch_${targetOrders.length}_Orders.pdf`);
      showToast?.(`Downloaded ${targetOrders.length} tax invoices into 1 PDF!`, 'success');
    } catch (err) {
      console.error('Batch invoices download error:', err);
      showToast?.('Failed to download batch invoices', 'error');
    } finally {
      setMyntraDownloadingId(null);
    }
  };

  const handleBatchDownloadMyntraCombined = async () => {
    const targetOrders = myntraSelectedIds.size > 0 
      ? filteredMyntraOrders.filter(o => myntraSelectedIds.has(o.id))
      : filteredMyntraOrders;

    if (targetOrders.length === 0) {
      showToast?.('No orders available to pack & download', 'warning');
      return;
    }

    setMyntraDownloadingId('batch_combined');
    try {
      const pdfDoc = await PDFDocument.create();
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontNorm = await pdfDoc.embedFont(StandardFonts.Helvetica);

      for (const order of targetOrders) {
        await drawMyntraLabelPage(pdfDoc, order, fontBold, fontNorm);
        await drawMyntraInvoicePage(pdfDoc, order, fontBold, fontNorm);
      }

      const pdfBytes = await pdfDoc.save();
      triggerPdfDownload(pdfBytes, `Myntra_Dispatch_Pack_${targetOrders.length}_Orders_Labels_and_Invoices.pdf`);
      showToast?.(`Downloaded ${targetOrders.length} order packs (Labels + Invoices) into 1 PDF!`, 'success');
    } catch (err) {
      console.error('Batch combined download error:', err);
      showToast?.('Failed to download dispatch pack', 'error');
    } finally {
      setMyntraDownloadingId(null);
    }
  };

  const handleAddCustomMyntraOrder = (e) => {
    if (e) e.preventDefault();
    if (!newMyntraOrder.awb.trim() && !newMyntraOrder.orderId.trim()) {
      showToast?.('Please provide an Order ID or AWB number', 'warning');
      return;
    }

    const createdOrder = {
      id: 'MYN-ORD-' + Date.now().toString().slice(-6),
      orderId: newMyntraOrder.orderId.trim() || String(Math.floor(100000000000 + Math.random() * 900000000000)),
      packetId: 'PKT-' + Math.floor(1000000 + Math.random() * 9000000),
      awb: newMyntraOrder.awb.trim().toUpperCase() || 'MYNTR' + Math.floor(100000000 + Math.random() * 900000000) + 'IN',
      courier: newMyntraOrder.courier || 'Myntra Logistics',
      routingHub: 'DEL/HUB-04',
      customerName: newMyntraOrder.customerName.trim() || 'Verified Customer',
      address: newMyntraOrder.address.trim() || 'H.No 12, Main Market Road',
      city: newMyntraOrder.city.trim() || 'New Delhi',
      state: newMyntraOrder.state.trim() || 'Delhi',
      pincode: newMyntraOrder.pincode.trim() || '110001',
      phone: '+91 98765*****',
      sku: newMyntraOrder.sku.trim().toUpperCase() || 'MYN-ITEM-SKU-1',
      productName: newMyntraOrder.productName.trim() || 'Apparel & Fashion Merchandise',
      size: newMyntraOrder.size || 'M',
      qty: Number(newMyntraOrder.qty) || 1,
      price: Number(newMyntraOrder.price) || 999,
      paymentMode: newMyntraOrder.paymentMode || 'PREPAID',
      orderDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      status: 'Ready to Pack',
      hsn: '62034200'
    };

    const updated = [createdOrder, ...myntraOrders];
    setMyntraOrders(updated);
    try {
      localStorage.setItem('om_myntra_orders', JSON.stringify(updated));
    } catch {}

    setMyntraAddModalOpen(false);
    setNewMyntraOrder({
      orderId: '',
      awb: '',
      courier: 'Myntra Logistics',
      customerName: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      sku: '',
      productName: '',
      size: 'M',
      qty: 1,
      price: 999,
      paymentMode: 'PREPAID'
    });
    showToast?.('Custom Myntra order added successfully!', 'success');
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
  const [crossMarketplaceAlert, setCrossMarketplaceAlert] = useState(null); // { detectedMp: 'meesho' | 'flipcart' | ..., detectedName: string, currentMp: string, currentName: string, files: File[], onProceedAnyway: fn }

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

  // Resolve stores list from prop or localStorage cache
  const allFollowStores = useMemo(() => {
    if (Array.isArray(followStores) && followStores.length > 0) return followStores;
    try {
      const raw = localStorage.getItem('om_follow_stores');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, [followStores]);

  const [selectedFollowStoreName, setSelectedFollowStoreName] = useState(() => {
    try {
      return localStorage.getItem('label_follow_us_store_name') || '';
    } catch {
      return '';
    }
  });

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
  const [followUsQrShape, setFollowUsQrShape] = useState(() => {
    try {
      return localStorage.getItem('label_follow_us_qr_shape') || 'square';
    } catch {
      return 'square';
    }
  });

  const handleSelectQrShape = (shape) => {
    setFollowUsQrShape(shape);
    try {
      localStorage.setItem('label_follow_us_qr_shape', shape);
    } catch {}
  };

  const handleSelectFollowStore = (storeName) => {
    setSelectedFollowStoreName(storeName);
    try {
      localStorage.setItem('label_follow_us_store_name', storeName);
    } catch {}

    if (!storeName) {
      setFollowUsLink('');
      setPrintFollowUs(false);
      try {
        localStorage.setItem('label_follow_us_link', '');
        localStorage.setItem('label_follow_us_enabled', 'false');
      } catch {}
      return;
    }

    const matched = allFollowStores.find(s => s.name === storeName);
    if (matched) {
      setFollowUsLink(matched.url);
      setPrintFollowUs(true);
      try {
        localStorage.setItem('label_follow_us_link', matched.url);
        localStorage.setItem('label_follow_us_enabled', 'true');
      } catch {}
    }
  };

  // ================= WEBCAM & DATE/TIME CLOCK PROOF STUDIO =================
  const [clockMode, setClockMode] = useState(() => {
    try {
      return localStorage.getItem('om_clock_mode') || 'live';
    } catch {
      return 'live';
    }
  });
  const [customClockOffsetMs, setCustomClockOffsetMs] = useState(() => {
    try {
      const stored = localStorage.getItem('om_clock_offset_ms');
      return stored ? Number(stored) : 0;
    } catch {
      return 0;
    }
  });
  const [showClockModal, setShowClockModal] = useState(false);
  const [editDateStr, setEditDateStr] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [editTimeStr, setEditTimeStr] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  const [currentIstTime, setCurrentIstTime] = useState('');

  // Webcam State
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [webcamStream, setWebcamStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDurationSec, setRecordingDurationSec] = useState(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState(null);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [facingMode, setFacingMode] = useState('environment'); // default to rear camera on mobile for return parcel unboxing!
  const [webcamError, setWebcamError] = useState(null);

  // Detect mobile device (phones/tablets/Capacitor) so rear/front flip is shown only on mobile
  const isMobileDevice = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || navigator.vendor || window.opera || '';
    const isMobileUA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
    const isSmallTouch = window.matchMedia && window.matchMedia('(pointer: coarse) and (max-width: 1024px)').matches;
    const isCapacitor = Boolean(window.Capacitor?.isNativePlatform?.() || window.location?.protocol === 'capacitor:');
    return isMobileUA || isSmallTouch || isCapacitor;
  }, []);

  const webcamVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingCanvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const renderIntervalRef = useRef(null);
  const recordingStartTimeRef = useRef(0);
  const currentIstTimeRef = useRef('');

  // Keep ref synchronized with latest time string for canvas burner
  useEffect(() => {
    currentIstTimeRef.current = currentIstTime;
  }, [currentIstTime]);

  // Live Timer Update formatted exactly as DD.MM.YYYY hh:mm:ssAM/PM (Matching Image 2)
  useEffect(() => {
    const updateTime = () => {
      try {
        const nowMs = Date.now();
        const effectiveMs = clockMode === 'custom' ? (nowMs + customClockOffsetMs) : nowMs;
        const targetDate = new Date(effectiveMs);
        
        // Format exactly as Image 2: "Jul 29, 2026 11:39:51 AM" in Indian Standard Time (IST)
        const istFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Kolkata',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });
        
        const parts = istFormatter.formatToParts(targetDate);
        let day = '01', month = 'Jan', year = '2026', hour = '12', min = '00', sec = '00', dayPeriod = 'AM';
        for (const p of parts) {
          if (p.type === 'day') day = p.value;
          if (p.type === 'month') month = p.value;
          if (p.type === 'year') year = p.value;
          if (p.type === 'hour') hour = p.value;
          if (p.type === 'minute') min = p.value;
          if (p.type === 'second') sec = p.value;
          if (p.type === 'dayPeriod') dayPeriod = p.value.toUpperCase();
        }
        
        // Exact format matching Image 2: "Jul 29, 2026 11:39:51 AM"
        setCurrentIstTime(`${month} ${day}, ${year} ${hour}:${min}:${sec} ${dayPeriod}`);
      } catch (e) {
        setCurrentIstTime(new Date().toLocaleTimeString());
      }
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [clockMode, customClockOffsetMs]);

  // Recording Duration Counter
  useEffect(() => {
    let interval = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDurationSec(s => s + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Clean up webcam stream on unmount
  useEffect(() => {
    return () => {
      if (webcamStream) {
        webcamStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [webcamStream]);

  // Ensure video element receives the media stream as soon as it mounts or stream changes
  useEffect(() => {
    if (webcamVideoRef.current && webcamStream) {
      if (webcamVideoRef.current.srcObject !== webcamStream) {
        webcamVideoRef.current.srcObject = webcamStream;
      }
      webcamVideoRef.current.play().catch(e => console.warn('Webcam video play:', e));
    }
  }, [webcamStream, isWebcamActive]);

  const handleOpenClockModal = () => {
    try {
      const nowMs = Date.now();
      const effectiveMs = clockMode === 'custom' ? (nowMs + customClockOffsetMs) : nowMs;
      const d = new Date(effectiveMs);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      setEditDateStr(`${yyyy}-${mm}-${dd}`);
      setEditTimeStr(`${hh}:${min}`);
    } catch {}
    setShowClockModal(true);
  };

  const handleApplyCustomTime = (e) => {
    e.preventDefault();
    if (!editDateStr || !editTimeStr) {
      if (showToast) showToast('Please select valid date and time', 'error');
      return;
    }
    try {
      const [year, month, day] = editDateStr.split('-').map(Number);
      const [hour, minute] = editTimeStr.split(':').map(Number);
      const chosen = new Date(year, month - 1, day, hour, minute, 0);
      const offset = chosen.getTime() - Date.now();

      setCustomClockOffsetMs(offset);
      setClockMode('custom');
      localStorage.setItem('om_clock_mode', 'custom');
      localStorage.setItem('om_clock_offset_ms', String(offset));
      setShowClockModal(false);
      if (showToast) showToast('Custom Date & Time applied! Clock is ticking live from this time.', 'success');
    } catch (err) {
      if (showToast) showToast(`Error applying custom time: ${err.message}`, 'error');
    }
  };

  const handleResetToLiveTime = () => {
    setClockMode('live');
    setCustomClockOffsetMs(0);
    localStorage.setItem('om_clock_mode', 'live');
    localStorage.removeItem('om_clock_offset_ms');
    setShowClockModal(false);
    if (showToast) showToast('Reset to Live Real-Time Indian Standard Time (IST)', 'info');
  };

  // Lightweight EBML duration patcher: fixes 0 kbps and missing length in Windows Explorer when WebM is recorded
  const fixWebmDuration = async (blob, durationMs) => {
    try {
      if (!blob || blob.size < 100 || durationMs <= 0) return blob;
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      // Verify EBML WebM header: 0x1A 0x45 0xDF 0xA3
      if (bytes[0] !== 0x1A || bytes[1] !== 0x45 || bytes[2] !== 0xDF || bytes[3] !== 0xA3) {
        return blob;
      }

      // Locate Segment Info ID: 0x15 0x49 0xA9 0x66
      let infoPos = -1;
      const searchLimit = Math.min(bytes.length - 16, 8192);
      for (let i = 0; i < searchLimit; i++) {
        if (bytes[i] === 0x15 && bytes[i + 1] === 0x49 && bytes[i + 2] === 0xA9 && bytes[i + 3] === 0x66) {
          infoPos = i;
          break;
        }
      }
      if (infoPos === -1) return blob;

      const infoDataStart = infoPos + 4;
      const infoDataEnd = Math.min(bytes.length - 8, infoDataStart + 1024);

      // Scan for Duration element ID: 0x44 0x89 within Segment Info
      for (let i = infoDataStart; i < infoDataEnd; i++) {
        if (bytes[i] === 0x44 && bytes[i + 1] === 0x89) {
          const durLen = bytes[i + 2] & 0x0F;
          const durValPos = i + 3;
          const view = new DataView(buffer);
          if (durLen === 4 && durValPos + 4 <= buffer.byteLength) {
            view.setFloat32(durValPos, durationMs, false);
            return new Blob([buffer], { type: blob.type });
          } else if (durLen === 8 && durValPos + 8 <= buffer.byteLength) {
            view.setFloat64(durValPos, durationMs, false);
            return new Blob([buffer], { type: blob.type });
          }
        }
      }

      // If Duration element is absent, inject a 7-byte Duration tag: 0x44 0x89 0x84 + float32
      const durTag = new Uint8Array(7);
      durTag[0] = 0x44;
      durTag[1] = 0x89;
      durTag[2] = 0x84;
      new DataView(durTag.buffer).setFloat32(3, durationMs, false);

      const insertPos = infoDataStart + 4;
      const patchedBuffer = new Uint8Array(bytes.length + 7);
      patchedBuffer.set(bytes.subarray(0, insertPos), 0);
      patchedBuffer.set(durTag, insertPos);
      patchedBuffer.set(bytes.subarray(insertPos), insertPos + 7);

      return new Blob([patchedBuffer.buffer], { type: blob.type });
    } catch (err) {
      console.warn('WebM duration fix skipped:', err);
      return blob;
    }
  };

  const handleStartWebcam = async (cameraId = selectedCameraId, mode = facingMode) => {
    setWebcamError(null);
    try {
      if (typeof requestCameraPermission === 'function') {
        try { await requestCameraPermission(); } catch {}
      }

      if (webcamStream) {
        webcamStream.getTracks().forEach(t => t.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera is not supported on this device/browser. Please open in Chrome or ensure HTTPS.');
      }

      let stream = null;
      // High-Definition 60 FPS constraints: 1280x720 (or 848x480 widescreen) at 60 fps
      const hdVideoConstraint = {
        ...(cameraId ? { deviceId: { exact: cameraId } } : { facingMode: { ideal: mode } }),
        width: { ideal: 1280, min: 848 },
        height: { ideal: 720, min: 480 },
        frameRate: { ideal: 60, min: 30 }
      };

      try {
        // Attempt hardware 60 fps first
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            ...(cameraId ? { deviceId: { exact: cameraId } } : { facingMode: { ideal: mode } }),
            width: { ideal: 1280, min: 848 },
            height: { ideal: 720, min: 480 },
            frameRate: { ideal: 60, exact: 60 }
          },
          audio: false
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: hdVideoConstraint,
            audio: false
          });
        } catch (e1) {
          console.warn('Attempt 1 (60 FPS HD ideal) failed, trying flexible widescreen fallback', e1);
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: 1280, min: 640 },
                height: { ideal: 720, min: 480 },
                frameRate: { ideal: 60, min: 30 }
              },
              audio: false
            });
          } catch (e2) {
            console.warn('Attempt 2 failed, trying user facing', e2);
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60, min: 30 } },
                audio: false
              });
            } catch (e3) {
              console.warn('Attempt 3 failed, trying video: true fallback', e3);
              stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            }
          }
        }
      }

      // Enforce 60 fps on the active camera track
      if (stream && stream.getVideoTracks().length > 0) {
        const camTrack = stream.getVideoTracks()[0];
        if (camTrack.applyConstraints) {
          camTrack.applyConstraints({ frameRate: 60 }).catch(() => {});
        }
      }

      setWebcamStream(stream);
      setIsWebcamActive(true);
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
        try {
          await webcamVideoRef.current.play();
        } catch {}
      }

      // Enumerate cameras once permission is granted
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devices.filter(d => d.kind === 'videoinput');
        setAvailableCameras(videoDevs);
      } catch {}

      if (showToast) showToast('Camera started in 60 FPS HD! Timer is ticking live.', 'success');
    } catch (err) {
      console.error('Camera access error:', err);
      let errMsg = 'Camera permission denied or camera not found.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = 'Camera permission denied. On mobile, please tap the lock icon in the browser address bar (or App Settings) and allow Camera permission.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errMsg = 'No camera device detected on this device.';
      } else if (err.message) {
        errMsg = err.message;
      }
      setWebcamError(errMsg);
      if (showToast) showToast(errMsg, 'error');
    }
  };

  const handleToggleFacingMode = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    setSelectedCameraId('');
    if (isWebcamActive) {
      await handleStartWebcam('', nextMode);
    }
  };

  const handleStopWebcam = () => {
    if (isRecording) {
      handleStopRecording();
    }
    if (webcamStream) {
      webcamStream.getTracks().forEach(t => t.stop());
      setWebcamStream(null);
    }
    setIsWebcamActive(false);
    if (webcamVideoRef.current) {
      webcamVideoRef.current.srcObject = null;
    }
    if (showToast) showToast('Webcam stopped', 'info');
  };

  const handleStartRecording = () => {
    if (!webcamStream || !webcamVideoRef.current) {
      if (showToast) showToast('Please start webcam first', 'error');
      return;
    }
    try {
      recordedChunksRef.current = [];

      // Set up offscreen/hidden recording canvas that matches video stream resolution
      const videoEl = webcamVideoRef.current;
      const width = (videoEl && videoEl.videoWidth > 0) ? videoEl.videoWidth : 1280;
      const height = (videoEl && videoEl.videoHeight > 0) ? videoEl.videoHeight : 720;

      let canvas = recordingCanvasRef.current;
      if (!canvas) {
        canvas = document.createElement('canvas');
        recordingCanvasRef.current = canvas;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

      // Capture stream from canvas with burned-in timestamp at exactly 60 fps
      let recordStream;
      try {
        recordStream = canvas.captureStream ? canvas.captureStream(60) : webcamStream;
        if (recordStream && recordStream.getVideoTracks().length > 0) {
          const track = recordStream.getVideoTracks()[0];
          if (track && track.applyConstraints) {
            track.applyConstraints({ frameRate: 60 }).catch(() => {});
          }
        }
      } catch (err) {
        console.warn('Canvas captureStream fallback to direct videoStream:', err);
        recordStream = webcamStream;
      }

      // Preserve audio tracks if present
      if (webcamStream.getAudioTracks().length > 0 && recordStream !== webcamStream) {
        webcamStream.getAudioTracks().forEach(track => recordStream.addTrack(track));
      }

      // High-efficiency, unthrottled 60 FPS render loop
      let isRunning = true;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }

      const renderCanvasFrame = () => {
        if (!isRunning) return;
        try {
          if (videoEl && videoEl.readyState >= 2) {
            // 1. Draw raw camera video frame
            ctx.drawImage(videoEl, 0, 0, width, height);

            // 2. Draw CCTV Timestamp Overlay in TOP-CENTER — COMPLETELY CLEAN, ZERO SHADOW, ZERO STROKE, ZERO BACKGROUND
            const timeText = currentIstTimeRef.current || '';
            const fontSize = Math.max(16, Math.round(width * 0.028));
            ctx.font = `400 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#FFFFFF';
            const posY = Math.round(height * 0.05); // 5% from top edge
            ctx.fillText(timeText, width / 2, posY);
          }
        } catch (e) {
          console.warn('Canvas draw error:', e);
        }
        animFrameRef.current = requestAnimationFrame(renderCanvasFrame);
      };
      animFrameRef.current = requestAnimationFrame(renderCanvasFrame);

      // MP4 / H.264 prioritised first for hardware acceleration, 60fps and full duration/bitrate metadata in Windows
      let recorder;
      let usedMime = '';
      const candidateTypes = [
        'video/mp4;codecs=avc1,mp4a',
        'video/mp4;codecs=avc1',
        'video/mp4',
        'video/webm;codecs=h264',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9,opus',
        'video/webm',
        ''
      ];

      for (const t of candidateTypes) {
        if (!t || (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(t))) {
          try {
            const options = {
              videoBitsPerSecond: 2500000 // 2.5 Mbps target for ultra-smooth 60 FPS HD video
            };
            if (t) options.mimeType = t;
            recorder = new MediaRecorder(recordStream, options);
            usedMime = t;
            break;
          } catch {}
        }
      }

      if (!recorder) {
        recorder = new MediaRecorder(recordStream, { videoBitsPerSecond: 3000000 });
      }

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      const startTime = Date.now();
      recordingStartTimeRef.current = startTime;

      recorder.onstop = async () => {
        isRunning = false;
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
        if (renderIntervalRef.current) {
          clearInterval(renderIntervalRef.current);
          renderIntervalRef.current = null;
        }

        const durationMs = Math.max(1000, Date.now() - (recordingStartTimeRef.current || startTime));
        const blobType = usedMime || 'video/mp4';
        let finalBlob = new Blob(recordedChunksRef.current, { type: blobType });

        // If WebM was recorded, patch duration header so Windows Explorer displays duration & bitrate
        if (blobType.includes('webm')) {
          finalBlob = await fixWebmDuration(finalBlob, durationMs);
        }

        setRecordedVideoBlob(finalBlob);
        if (recordedVideoUrl) {
          try { URL.revokeObjectURL(recordedVideoUrl); } catch {}
        }
        const url = URL.createObjectURL(finalBlob);
        setRecordedVideoUrl(url);
        if (showToast) showToast('Recording completed! Preview video below and check playback before downloading.', 'success');
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingDurationSec(0);
      if (showToast) showToast('Recording started in 60 FPS HD with live timer burned into video!', 'info');
    } catch (err) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (renderIntervalRef.current) {
        clearInterval(renderIntervalRef.current);
        renderIntervalRef.current = null;
      }
      if (showToast) showToast(`Recording failed: ${err.message}`, 'error');
    }
  };

  const handleStopRecording = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (renderIntervalRef.current) {
      clearInterval(renderIntervalRef.current);
      renderIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
      setIsRecording(false);
    }
  };

  const handleDownloadRecordedVideo = () => {
    if (!recordedVideoUrl && !recordedVideoBlob) {
      if (showToast) showToast('No recorded video available to download', 'error');
      return;
    }
    try {
      const dateTag = new Date().toISOString().slice(0, 10);
      const isMp4 = !recordedVideoBlob?.type?.includes('webm') || recordedVideoBlob?.type?.includes('mp4');
      const filename = `Return_Proof_Unboxing_${dateTag}.${isMp4 ? 'mp4' : 'webm'}`;
      
      const a = document.createElement('a');
      a.href = recordedVideoUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try { document.body.removeChild(a); } catch {}
      }, 500);

      if (showToast) showToast('Downloading video proof...', 'success');
    } catch (err) {
      console.error('Download error:', err);
      // Fallback: open in new window
      window.open(recordedVideoUrl, '_blank');
    }
  };

  const formatSecs = (sec) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  };

  // Inspect first page text of a PDF to identify its marketplace origin
  const detectPdfMarketplace = async (file) => {
    try {
      const arrayBuf = await file.arrayBuffer();
      const pdfJsDoc = await pdfjsLib.getDocument({ data: arrayBuf.slice(0) }).promise;
      if (pdfJsDoc.numPages < 1) return null;
      const page = await pdfJsDoc.getPage(1);
      const textContent = await page.getTextContent();
      const rawText = textContent.items.map(it => it.str).join(' ');
      const lower = rawText.toLowerCase();

      // 1. Check Meesho signatures:
      // - "Product Details" + "SKU"
      // - "If undelivered, return to:" + "Tax Invoice" / "Original For Recipient"
      // - "Fashnear Technologies" / "meesho"
      const hasMeeshoProductDetails = /product\s*details/i.test(rawText) && /sku\s+size\s+qty/i.test(rawText);
      const hasMeeshoReturn = /if\s+undelivered,?\s+return\s+to:?/i.test(rawText);
      const hasMeeshoBrand = /\bmeesho\b/i.test(lower) || /fashnear\s*technologies/i.test(lower);
      if (hasMeeshoProductDetails || (hasMeeshoReturn && (hasMeeshoBrand || /tax\s*invoice/i.test(rawText)))) {
        return 'meesho';
      }

      // 2. Check Flipkart signatures:
      // - OD order number OD\d{16,22}
      // - FMPC / FMPP tracking numbers
      // - "Ordered through Flipkart" / "Ekart Logistics" / "Transparent Packaging"
      const hasFlipkartOD = /\bOD\d{16,22}\b/i.test(rawText);
      const hasFlipkartFmpc = /\bFMP[CP]\d{10,14}\b/i.test(rawText);
      const hasFlipkartBrand = /flipkart/i.test(lower) || /ordered\s*through/i.test(lower) || /ekart/i.test(lower);
      if (hasFlipkartOD || hasFlipkartFmpc || (hasFlipkartBrand && /sku\s*id/i.test(rawText))) {
        return 'flipcart';
      }

      // 3. Check Amazon signatures:
      // - Order ID 40X-XXXXXXX-XXXXXXX
      // - Tracking TBA\d{12}
      // - Amazon Transportation Services / Easy Ship
      const hasAmazonOrder = /\b[0-9]{3}-[0-9]{7}-[0-9]{7}\b/.test(rawText);
      const hasAmazonTba = /\bTBA[0-9]{12}\b/i.test(rawText);
      const hasAmazonBrand = /amazon\s*transportation|easy\s*ship|\bamazon\.in\b/i.test(lower);
      if (hasAmazonOrder || hasAmazonTba || hasAmazonBrand) {
        return 'amazon';
      }

      // 4. Check Snapdeal signatures:
      // - SUBORDER CODE or SUBORDER NO
      // - SLP tracking SLP\d{9,14}
      // - snapdeal.com / Jasper Infotech
      const hasSnapdealSuborder = /suborder\s*(?:code|no\.?)/i.test(rawText);
      const hasSnapdealBrand = /snapdeal/i.test(lower) || /jasper\s*infotech/i.test(lower) || /\bSLP\d{9,14}\b/i.test(rawText);
      if (hasSnapdealSuborder || hasSnapdealBrand) {
        return 'snapdeal';
      }

      // 5. Check Ajio signatures:
      // - Reliance Retail Limited
      // - ajio.com / AJIO
      if (/\bajio\b/i.test(lower) || /reliance\s*retail\s*limited/i.test(lower)) {
        return 'ajio';
      }

      return null;
    } catch (err) {
      console.warn('detectPdfMarketplace warning:', err);
      return null;
    }
  };

  const mpNameMap = {
    meesho: 'Meesho',
    flipcart: 'Flipkart',
    amazon: 'Amazon',
    snapdeal: 'Snapdeal',
    ajio: 'Ajio',
    myntra: 'Myntra'
  };

  // Directly commit files to target marketplace state
  const appendFilesToMarketplace = (mpId, validFiles) => {
    updateMarketplaceState(mpId, prev => {
      if (prev.downloadReady?.url) {
        try { URL.revokeObjectURL(prev.downloadReady.url); } catch (e) {}
      }
      return {
        files: [...prev.files, ...validFiles],
        downloadReady: null,
      };
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle uploaded files strictly for current marketplace with cross-marketplace alert
  const handleFiles = async (selectedFiles) => {
    const valid = Array.from(selectedFiles).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (valid.length === 0) {
      if (showToast) showToast('Please select valid PDF files', 'error');
      return;
    }

    // Inspect first file for cross-marketplace mismatch
    const detected = await detectPdfMarketplace(valid[0]);
    if (detected && detected !== selectedMarketplace) {
      const detectedName = mpNameMap[detected] || detected;
      const currentName = mpNameMap[selectedMarketplace] || selectedMarketplace;

      setCrossMarketplaceAlert({
        detectedMp: detected,
        detectedName,
        currentMp: selectedMarketplace,
        currentName,
        files: valid,
        onProceedAnyway: () => {
          appendFilesToMarketplace(selectedMarketplace, valid);
          setCrossMarketplaceAlert(null);
        }
      });
      return;
    }

    appendFilesToMarketplace(selectedMarketplace, valid);
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

      // ================= SNAPDEAL PARSING & BOUNDS =================
      if (marketplaceId === 'snapdeal') {
        // 1. Detect Courier
        let courier = 'Shadowfax';
        if (/shadowfax/i.test(rawText)) courier = 'Shadowfax';
        else if (/delhivery/i.test(rawText)) courier = 'Delhivery';
        else if (/xpressbees/i.test(rawText) || /xpress\s*bees/i.test(rawText)) courier = 'XpressBees';
        else if (/ecom\s*express/i.test(rawText)) courier = 'Ecom Express';
        else if (/blue\s*dart/i.test(rawText) || /bluedart/i.test(rawText)) courier = 'Blue Dart';
        else if (/smartr/i.test(rawText)) courier = 'Smartr';
        else if (/dtdc/i.test(rawText)) courier = 'DTDC';
        else {
          const cMatch = rawText.match(/(?:Courier|Logistics|Carrier)[\s:#-]*([A-Za-z0-9\s\-]{3,25})/i);
          if (cMatch) courier = cMatch[1].trim();
        }

        // 2. Detect Suborder / Order ID
        let orderNumber = '';
        const soMatch = rawText.match(/SUBORDER\s*(?:CODE|NO\.?)[\s:]*(\d{8,14})/i);
        const orderMatch = rawText.match(/ORDER\s*(?:NO\.?|NUMBER)[\s:]*(\d{8,14})/i);
        if (soMatch) orderNumber = soMatch[1];
        else if (orderMatch) orderNumber = orderMatch[1];
        else {
          const invMatch = rawText.match(/INVOICE\s*NUMBER[\s:]*([A-Za-z0-9\/\-]+)/i);
          if (invMatch) orderNumber = invMatch[1];
        }

        // 3. Detect AWB / Tracking barcode
        let awb = '';
        const sfAwb = rawText.match(/\b(SF\d{10,14}[A-Za-z0-9]*)\b/);
        const slpAwb = rawText.match(/\b(SLP\d{9,14})\b/);
        const genAwb = rawText.match(/\b(\d{12,16})\b/);
        if (sfAwb) awb = sfAwb[1];
        else if (slpAwb) awb = slpAwb[1];
        else if (genAwb) awb = genAwb[1];
        if (!awb) awb = orderNumber || `SNAP-${pageNum}`;

        // 4. Detect Store / Seller Name
        let storeName = 'Snapdeal Seller';
        const sellerMatch = rawText.match(/SELLER\s*(?:ADDRESS)?\s*\n\s*([A-Za-z0-9\s,\.\-&]+?)(?:\n|SHREE|SHOP|UG-|GSTIN)/i);
        if (sellerMatch) storeName = sellerMatch[1].trim().replace(/\s+/g, ' ');

        // 5. Detect SKU & Quantity
        let sku = 'Snapdeal-Item';
        let quantity = 1;
        const skuMatch = rawText.match(/SKU\s*CODE\s*:?\s*([A-Za-z0-9_\-\.\/\(\)\s&]+?)(?:\n|COLOR|ORDER|SUBORDER)/i);
        if (skuMatch && skuMatch[1].trim().length > 1) {
          sku = skuMatch[1].trim().replace(/\s+/g, ' ');
        } else {
          const suborderTableMatch = rawText.match(/\d{8,14}\s*\|\s*([A-Za-z0-9_\-\.\/\(\)\s&]+?)(?:\n|\b[1-9]\b)/);
          if (suborderTableMatch && suborderTableMatch[1].trim().length > 1) {
            sku = suborderTableMatch[1].trim().replace(/\s+/g, ' ');
          }
        }

        // Accurately parse Quantity: look for "TOTAL ITEMS <n>" box first, or 1-3 digit number under QTY
        const totalItemsMatch = rawText.match(/TOTAL\s*ITEMS\s*[:\s]*\n*([1-9]\d{0,2})\b/i);
        if (totalItemsMatch) {
          quantity = parseInt(totalItemsMatch[1], 10) || 1;
        } else {
          const invQtyMatch = rawText.match(/\bQTY\b[\s\S]{0,40}?\b([1-9]\d{0,2})\b/i);
          if (invQtyMatch) {
            quantity = parseInt(invQtyMatch[1], 10) || 1;
          } else {
            const suborderQtyMatch = rawText.match(/QUANTITY\s*[:\s]*\n*([1-9]\d{0,2})\b/i);
            if (suborderQtyMatch) {
              quantity = parseInt(suborderQtyMatch[1], 10) || 1;
            }
          }
        }

        // Strict sanity check: An item parcel quantity is never a 12-digit order/barcode number
        if (isNaN(quantity) || quantity < 1 || quantity > 500) {
          quantity = 1;
        }

        // 6. Dynamic Crop Bounds Calculation
        const viewport = page.getViewport({ scale: 1.0 });
        const pageW = viewport.width;
        const pageH = viewport.height;

        // In Snapdeal A4 Landscape (pageW ~842pt, pageH ~595pt):
        // Physical label bounding box from calibrated pixel coordinates:
        // Left: 3.3% of page width, Right: 44.6% of page width
        // Top: 95.8% of page height (4.2% from top), Bottom: 27.8% of page height (72.2% from top)
        const defLeft = pageW * 0.033;
        const defRight = pageW * 0.446;
        const defTop = pageH * 0.958;
        const defBottom = pageH * 0.278;

        let cropBox = {
          left: defLeft,
          right: defRight,
          top: defTop,
          bottom: defBottom,
        };

        const visibleItems = content.items.filter(it => it.str && it.str.trim().length > 0 && it.transform);
        const leftLabelItems = visibleItems.filter(it => 
          it.transform[4] >= pageW * 0.02 &&
          it.transform[4] <= pageW * 0.48 &&
          it.transform[5] >= pageH * 0.20 &&
          it.transform[5] <= pageH * 0.98
        );

        if (leftLabelItems.length >= 6) {
          const minX = Math.min(...leftLabelItems.map(it => it.transform[4]));
          const maxX = Math.max(...leftLabelItems.map(it => it.transform[4] + (it.width || 0)));
          const minY = Math.min(...leftLabelItems.map(it => it.transform[5]));
          const maxY = Math.max(...leftLabelItems.map(it => it.transform[5] + (it.height || 0)));

          cropBox = {
            left: Math.max(0, Math.min(defLeft, minX - 10)),
            right: Math.min(pageW * 0.48, Math.max(defRight, maxX + 8)),
            top: Math.min(pageH, Math.max(defTop, maxY + 10)),
            bottom: Math.max(0, Math.min(defBottom, minY - 10)),
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

      // 5. Detect exact bottom boundary of the shipping label (Product Details bottom border)
      // Exactly terminates on the solid horizontal line above TAX INVOICE while protecting full SKU line
      let meeshoLabelHeight = 345.6;
      const viewport = page.getViewport({ scale: 1.0 });
      const pageH = viewport.height;

      let invoiceBaseline = null;
      let lastSkuBaseline = null;
      let inProductDetails = false;

      for (const it of content.items) {
        if (!it.str || !it.str.trim() || !it.transform) continue;
        const distFromTop = pageH - it.transform[5];
        const s = it.str.trim();

        if (/Product\s*Details/i.test(s)) {
          inProductDetails = true;
        }

        if (/TAX\s*INVOICE|Original\s*For\s*Recipient|\binvoice\b/i.test(s)) {
          if (distFromTop > 200 && (invoiceBaseline === null || distFromTop < invoiceBaseline)) {
            invoiceBaseline = distFromTop;
          }
        }

        if (inProductDetails && distFromTop > 280) {
          if (!/Product\s*Details|SKU|Size|Qty|Color|Order\s*No|TAX|INVOICE|Original|Recipient|Thank|Sold|BILL/i.test(s)) {
            if (invoiceBaseline === null || distFromTop < invoiceBaseline) {
              if (lastSkuBaseline === null || distFromTop > lastSkuBaseline) {
                lastSkuBaseline = distFromTop;
              }
            }
          }
        }
      }

      if (invoiceBaseline !== null) {
        // The solid horizontal line enclosing the shipping label box is situated exactly 13pt above invoiceBaseline
        const lineAboveInvoice = invoiceBaseline - 13.0;
        meeshoLabelHeight = lastSkuBaseline !== null ? Math.max(lastSkuBaseline + 5.5, lineAboveInvoice) : lineAboveInvoice;
      } else if (lastSkuBaseline !== null) {
        // Fallback: horizontal border is 5.5pt below the last SKU item
        meeshoLabelHeight = lastSkuBaseline + 5.5;
      } else {
        meeshoLabelHeight = 345.6;
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
        meeshoLabelHeight,
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
    // 3-Day Trial Expiration Check
    const trial = checkTrialStatus();
    if (!trial.allowed) {
      if (onRequireAuth) {
        onRequireAuth(trial.reason);
      } else if (showToast) {
        showToast(trial.reason, 'warning');
      }
      return;
    }

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
      const buildPdf = async (items, title = (targetMarketplace === 'flipcart' ? 'Flipkart Shipping Labels' : (targetMarketplace === 'snapdeal' ? 'Snapdeal Shipping Labels' : 'Meesho Shipping Labels'))) => {
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
              margin: followUsQrShape === 'heart' ? 0 : 1,
              width: 280,
              errorCorrectionLevel: 'H',
            });
          } catch (qrErr) {
            console.warn('Failed to generate Follow Us QR code:', qrErr);
          }
        }

        const getBadgeImage = async (storeName, isLarge) => {
          if (!qrDataUrl) return null;
          const currentShape = followUsQrShape || 'square';
          const cacheKey = `${storeName || 'default'}_${isLarge ? 'L' : 'S'}_${currentShape}`;
          if (badgeImageCache.has(cacheKey)) {
            return badgeImageCache.get(cacheKey);
          }
          try {
            const badgeDataUrl = await generateFollowUsBadgeDataUrl(storeName, qrDataUrl, isLarge, currentShape);
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
            if (targetMarketplace === 'flipcart' || targetMarketplace === 'snapdeal') {
              // ================= FLIPCART & SNAPDEAL TIGHT CROPPING (VERY LITTLE WHITE SPACE) =================
              let cLeft = item.cropBox?.left ?? (targetMarketplace === 'snapdeal' ? pageSize.width * 0.033 : 189.5);
              let cRight = item.cropBox?.right ?? (targetMarketplace === 'snapdeal' ? pageSize.width * 0.446 : 406.2);
              let cTop = item.cropBox?.top ?? (targetMarketplace === 'snapdeal' ? pageSize.height * 0.958 : 813.5);
              let cBottom = item.cropBox?.bottom ?? (targetMarketplace === 'snapdeal' ? pageSize.height * 0.278 : 464.0);

              // Apply crop nudge fine-tuning
              cTop = Math.min(pageSize.height, cTop + targetCropNudge);
              cBottom = Math.max(0, cBottom - targetCropNudge);
              if (targetMarketplace === 'snapdeal') {
                cRight = Math.min(pageSize.width, cRight + targetCropNudge);
                cLeft = Math.max(0, cLeft - targetCropNudge);
              }

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
              const hasFooterRow = Boolean(hasDateOrPage || hasThanks);

              const cardH = 50;
              const cardW = Math.min(254, srcW);
              const footerH = hasFollowUs
                ? (hasFooterRow ? (cardH + 22) : (cardH + 6))
                : (hasFooterRow ? 18 : 0);
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

              // Bottom margin for single footer row: 6.5 pt from bottom edge
              const metaY = padding + 2.5;

              // 1. Date/Time footer (Left side)
              if (printDateTime) {
                targetPage.drawText(batchDateTimeStr, {
                  x: padding + 2,
                  y: metaY,
                  size: 7,
                  font: helveticaBold,
                  color: rgb(0, 0, 0),
                });
              }

              // 2. Page Number (Right side)
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

              // 3. Thanks Line (Shifted to single row as CENTER)
              if (hasThanks) {
                const thankStr = thanksLineText.trim();
                let drawFontSize = 8.5;
                let textW = helveticaBold.widthOfTextAtSize(thankStr, drawFontSize);
                const leftReserved = printDateTime ? 120 : 15;
                const rightReserved = printPageNumber ? 40 : 15;
                const maxCenterW = targetW - (Math.max(leftReserved, rightReserved) * 2);
                if (textW > maxCenterW && maxCenterW > 50) {
                  drawFontSize = Math.max(6, Math.floor(drawFontSize * maxCenterW / textW));
                  textW = helveticaBold.widthOfTextAtSize(thankStr, drawFontSize);
                }
                targetPage.drawText(thankStr, {
                  x: (targetW - textW) / 2,
                  y: metaY,
                  size: drawFontSize,
                  font: helveticaBold,
                  color: rgb(0, 0, 0),
                });
              }

              // 4. Follow Us Panel (Enlarged with few pixels gap above Thanks line)
              if (hasFollowUs) {
                const cardX = (targetW - cardW) / 2;
                const cardY = padding + (hasFooterRow ? 18 : 2);

                const badgeImg = await getBadgeImage(selectedFollowStoreName || item.storeName, false);
                if (badgeImg) {
                  targetPage.drawImage(badgeImg, {
                    x: cardX,
                    y: cardY,
                    width: cardW,
                    height: cardH,
                  });
                }
              }
            } else {
              // ================= MEESHO ORIGINAL CROPPING =================
              // Dynamic Meesho label height: cleanly terminates on the bottom horizontal border line above TAX INVOICE while protecting full SKU line
              const baseLabelH = item.meeshoLabelHeight || 345.6;
              const labelH = Math.min(pageSize.height, baseLabelH + targetCropNudge);
              const hasFollowUs = Boolean(printFollowUs && followUsLink.trim() && qrDataUrl);
              const hasThanks = Boolean(printThanksLine && thanksLineText.trim());
              const hasDateOrPage = Boolean(printDateTime || printPageNumber);
              const hasFooterRow = Boolean(hasDateOrPage || hasThanks);

              const cardH = 52;
              const cardW = Math.min(254, pageSize.width - 24);
              const extraH = hasFollowUs
                ? (hasFooterRow ? (cardH + 24) : (cardH + 8))
                : (hasFooterRow ? 20 : 0);
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

              const metaY = 7.5;

              // 1. Date/Time footer (Left side, solid black bold)
              if (printDateTime) {
                targetPage.drawText(batchDateTimeStr, {
                  x: 12,
                  y: metaY,
                  size: 8,
                  font: helveticaBold,
                  color: rgb(0, 0, 0),
                });
              }

              // 2. Page Number (Right side, solid black bold)
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

              // 3. Thanks Line (Shifted to single row as CENTER: Date/Time on left, Thanks in center, Page# on right)
              if (hasThanks) {
                const thankText = thanksLineText.trim();
                let drawFontSize = 9.5;
                let textW = helveticaBold.widthOfTextAtSize(thankText, drawFontSize);
                const leftReserved = printDateTime ? 140 : 20;
                const rightReserved = printPageNumber ? 50 : 20;
                const maxCenterW = pW - (Math.max(leftReserved, rightReserved) * 2);
                if (textW > maxCenterW && maxCenterW > 60) {
                  drawFontSize = Math.max(7, Math.floor(drawFontSize * maxCenterW / textW));
                  textW = helveticaBold.widthOfTextAtSize(thankText, drawFontSize);
                }
                targetPage.drawText(thankText, {
                  x: (pW - textW) / 2,
                  y: metaY,
                  size: drawFontSize,
                  font: helveticaBold,
                  color: rgb(0, 0, 0),
                });
              }

              // 4. Follow Us Panel (Enlarged with few pixels gap above Thanks line)
              if (hasFollowUs) {
                const cardX = (pW - cardW) / 2;
                const cardY = hasFooterRow ? 20 : 4;

                const badgeImg = await getBadgeImage(selectedFollowStoreName || item.storeName, false);
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

            // 1. Date / Time (Solid black bold, left side)
            if (printDateTime) {
              targetPage.drawText(batchDateTimeStr, {
                x: 24,
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
                x: pW - textW - 24,
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
              const cardW = Math.min(420, pW - 28);
              const cardX = (pW - cardW) / 2;

              const badgeImg = await getBadgeImage(selectedFollowStoreName || item.storeName, true);
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

            let rawCourier = it.courier || (targetMarketplace === 'flipcart' ? 'E-Kart Logistics' : (targetMarketplace === 'snapdeal' ? 'Shadowfax' : 'Valmo'));
            rawCourier = String(rawCourier).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
            const cName = rawCourier || (targetMarketplace === 'snapdeal' ? 'Shadowfax' : 'Valmo');
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

          const mpLabel = targetMarketplace === 'flipcart' ? 'Flipkart' : (targetMarketplace === 'snapdeal' ? 'Snapdeal' : 'Meesho');
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
      const mpPrefix = targetMarketplace === 'flipcart' ? 'Flipkart' : (targetMarketplace === 'snapdeal' ? 'Snapdeal' : 'Meesho');

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
      : selectedMarketplace === 'amazon'
      ? (amazonState.result?.url || downloadReady?.url)
      : downloadReady?.url;
    if (!activeUrl) return;
    const printWin = window.open(activeUrl);
    if (printWin) {
      printWin.onload = () => printWin.print();
    }
  };

  return (
    <div className="bg-white text-slate-900 p-3 md:p-5 font-sans -m-2 md:-m-4 rounded-3xl border border-slate-200/90 shadow-xs">
      {/* ================= MARKETPLACE WORKSPACE CONTENT ================= */}

      {(selectedMarketplace === 'meesho' || selectedMarketplace === 'flipcart' || selectedMarketplace === 'snapdeal') ? (
        <>
          {/* ================= HEADER SECTION ================= */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 mb-3">
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                {activeMarketplace?.name} Label Cropping and sorting tools
              </h1>
            </div>

            {/* Active Marketplace Logo Badge */}
            <div className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center ${activeMarketplace?.badgeStyle} shadow-sm border border-slate-200`}>
                <span className="font-extrabold text-sm leading-none">{activeMarketplace?.iconLetter}</span>
                <span className="text-[6.5px] font-semibold tracking-tighter opacity-90">{activeMarketplace?.badgeText}</span>
              </div>
            </div>
          </div>

      {/* ================= TOP PROCESSING REPORT CARD ================= */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs mb-3 overflow-hidden transition-all">
        <div 
          onClick={() => setReportOpen(!reportOpen)}
          className="flex items-center justify-between px-4 py-2 border-b border-slate-100 cursor-pointer hover:bg-slate-50/60 transition-colors"
        >
          <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
            <svg className="w-3.5 h-3.5 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            Processing Report
          </div>
          <button type="button" className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer">
            {reportOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {reportOpen && (
          <div className="p-2.5 md:p-3 grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {/* Total Labels */}
            <div className="bg-sky-50 border border-sky-200/80 rounded-lg p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-sky-700">Total Labels</div>
                  <div className="text-base font-bold text-[#083B82] font-mono leading-tight">
                    {metrics.success} <span className="text-slate-500 text-[10px] font-normal">/ {metrics.totalLabels}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Success */}
            <div className="bg-orange-50 border border-orange-200/80 rounded-lg p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-orange-700">Success</div>
                  <div className="text-base font-bold text-orange-600 font-mono leading-tight">
                    {metrics.success}
                  </div>
                </div>
              </div>
              {parsedLabels.length > 0 && (
                <button 
                  type="button" 
                  onClick={() => setShowSkuModal(true)} 
                  title="View SKU Summary"
                  className="text-orange-600 hover:text-orange-700 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Duplicates */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                  <Copy className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-slate-600">Duplicates</div>
                  <div className="text-base font-bold text-slate-800 font-mono leading-tight">
                    {metrics.duplicates}
                  </div>
                </div>
              </div>
              {metrics.duplicates > 0 && (
                <button 
                  type="button" 
                  onClick={() => setShowDuplicateModal(true)} 
                  title="View duplicate labels"
                  className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* OCR Failed */}
            <div className="bg-rose-50 border border-rose-200/80 rounded-lg p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-rose-700">OCR Failed</div>
                  <div className="text-base font-bold text-rose-600 font-mono leading-tight">
                    {metrics.ocrFailed}
                  </div>
                </div>
              </div>
            </div>
            {/* Courier Breakdown Chips */}
            {Object.keys(courierSummary).length > 0 && (
              <div className="col-span-2 md:col-span-4 mt-0.5 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1 mr-1">
                  <Truck className="w-3.5 h-3.5 text-sky-600" />
                  Rearranged by Courier:
                </span>
                {Object.entries(courierSummary).sort((a, b) => a[0].localeCompare(b[0])).map(([cName, count]) => (
                  <span
                    key={cName}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 border border-sky-200 text-[10px] font-semibold text-sky-800 shadow-xs"
                  >
                    {cName}: <span className="font-mono text-orange-600 font-bold">{count} labels</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================= TWO COLUMN WORKSPACE ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ================= LEFT COLUMN: UPLOAD & ACTION ================= */}
        <div className="lg:col-span-5 space-y-3.5">
          {/* Upload Dropzone (Clean, comfortable sizing matching user reference) */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
            }}
            className="border-2 border-dashed border-sky-300 bg-sky-50/40 hover:bg-sky-50/70 rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center group"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/pdf"
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
            <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-600 border border-sky-200 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black text-slate-900">
              Upload PDF Files
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Drag & drop or click to select files
            </p>
          </div>

          {/* PDF Files Container Card (Matching user reference) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                <FileText className="w-4 h-4 text-orange-500" />
                PDF Files {files.length > 0 && `(${files.length})`}
              </div>

              <div className="flex items-center gap-2">
                {files.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllFiles}
                    className="text-xs text-rose-600 hover:text-rose-700 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-sky-600" />
                  Select PDFs
                </button>
              </div>
            </div>

            {/* List / Empty view */}
            <div className="p-4">
              {files.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 font-medium">
                  No PDF files selected.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {files.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                      <div className="flex items-center gap-2.5 truncate max-w-[85%]">
                        <FileCheck className="w-4 h-4 text-sky-600 shrink-0" />
                        <span className="font-semibold text-slate-800 truncate">{file.name}</span>
                        <span className="text-slate-400 shrink-0 text-[11px]">({(file.size / 1024).toFixed(0)} KB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            disabled={files.length === 0 || isProcessing}
            onClick={processCropAndSort}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 disabled:opacity-40 text-white text-sm font-black rounded-xl shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                Processing Labels ({processingProgress}%)...
              </>
            ) : (
              <>
                <Scissors className="w-4 h-4 text-white" />
                Start Crop & Sort Process
              </>
            )}
          </button>

          {/* Result / Download Area */}
          {downloadReady && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-xs space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">
                      Processing Complete!
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {metrics.success} labels ready • Sorted & Formatted for Thermal 4x6
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSkuModal(true)}
                    className="px-2.5 py-1 bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    View SKU Summary
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-0.5">
                {downloadReady.type === 'single' && (
                  <button
                    type="button"
                    onClick={() => setShowPreviewModal(true)}
                    className="px-3.5 py-2.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    Preview Label
                  </button>
                )}

                <a
                  href={downloadReady.url}
                  download={downloadReady.filename}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors text-center cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Download {downloadReady.type === 'zip' ? 'ZIP Archive' : 'Cropped PDF'}
                </a>

                {downloadReady.type === 'single' && (
                  <button
                    type="button"
                    onClick={handleDirectPrint}
                    className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    Print Directly
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ================= RIGHT COLUMN: PROCESSING SETTINGS (2 COLUMNS SIDE-BY-SIDE) ================= */}
        <div className="lg:col-span-7 space-y-3.5">
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            {/* Header */}
            <div 
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="flex items-center justify-between px-5 py-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Processing Settings
              </div>
              <button type="button" className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer">
                {settingsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {settingsOpen && (
              <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-5 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                
                {/* ================= COLUMN 1: LABEL ACTION, THANKS LINE, FOLLOW US ================= */}
                <div className="space-y-4">
                  {/* 1. Label Action */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Label Action
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setLabelAction('crop')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          labelAction === 'crop'
                            ? 'border-emerald-500 bg-emerald-50/80 text-emerald-700 shadow-xs ring-1 ring-emerald-500/20'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Scissors className="w-3.5 h-3.5 text-emerald-600" />
                        Crop Label
                      </button>

                      <button
                        type="button"
                        onClick={() => setLabelAction('keep_invoice')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          labelAction === 'keep_invoice'
                            ? 'border-emerald-500 bg-emerald-50/80 text-emerald-700 shadow-xs ring-1 ring-emerald-500/20'
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
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
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
                      <label 
                        className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-xl border cursor-pointer transition-all select-none ${
                          printThanksLine ? 'bg-emerald-50 border-emerald-400 text-emerald-600 shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                        }`}
                        title="If checked, prints thanks line on label footer"
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

                      <input
                        type="text"
                        value={thanksLineText}
                        onChange={handleThanksLineChange}
                        placeholder="e.g. Thanks For Your Order"
                        className="flex-1 min-w-0 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-xs"
                      />

                      <button
                        type="button"
                        onClick={handleSaveThanksLine}
                        className={`shrink-0 px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer whitespace-nowrap ${
                          isThanksSaved 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isThanksSaved ? 'Saved' : 'Save'}</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 pl-0.5">
                      Prints on clean white footer line at bottom of label.
                    </p>
                  </div>

                  {/* 3. Follow Us Page Setting */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <QrCode className="w-3.5 h-3.5 text-blue-600" />
                        Follow Us Page
                      </label>
                      {onNavigateTab && (
                        <button
                          type="button"
                          onClick={() => {
                            onNavigateTab('profile');
                            try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
                          }}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Add or manage store links in Profile"
                        >
                          <Store className="w-3 h-3" />
                          <span>Manage Stores</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 w-full">
                      <label 
                        className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-xl border cursor-pointer transition-all select-none ${
                          printFollowUs ? 'bg-emerald-50 border-emerald-400 text-emerald-600 shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                        }`}
                        title="If checked, prints Follow Us QR panel on label"
                      >
                        <input
                          type="checkbox"
                          checked={printFollowUs}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setPrintFollowUs(val);
                            localStorage.setItem('label_follow_us_enabled', String(val));
                            if (showToast) showToast(val ? 'Follow Us panel enabled' : 'Follow Us panel disabled', 'info');
                          }}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                        />
                      </label>

                      {allFollowStores.length > 0 ? (
                        <select
                          value={selectedFollowStoreName}
                          onChange={(e) => handleSelectFollowStore(e.target.value)}
                          className="flex-1 min-w-0 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-xs cursor-pointer"
                        >
                          <option value="">-- Select Store Name --</option>
                          {allFollowStores.map((st) => (
                            <option key={st.id || st.name} value={st.name}>
                              {st.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex-1 min-w-0 flex items-center justify-between px-2.5 py-1.5 bg-slate-50 border border-dashed border-slate-300 rounded-xl">
                          <span className="text-[11px] text-slate-500 italic">No stores added yet</span>
                          {onNavigateTab && (
                            <button
                              type="button"
                              onClick={() => {
                                onNavigateTab('profile');
                                try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
                              }}
                              className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer ml-1"
                            >
                              + Add
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* QR Shape Selector */}
                    {printFollowUs && (
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                        <span className="text-[11px] font-semibold text-slate-600 shrink-0">QR Shape:</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSelectQrShape('square')}
                            className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                              followUsQrShape === 'square'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span>▢</span>
                            <span>Square</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectQrShape('heart')}
                            className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                              followUsQrShape === 'heart'
                                ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span>♥</span>
                            <span>Heart</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectQrShape('trolley')}
                            className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                              followUsQrShape === 'trolley'
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span>🛒</span>
                            <span>Trolley</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ================= COLUMN 2: PRINT OPTIONS, SORT BY, OUTPUT FILE TYPE ================= */}
                <div className="space-y-4 md:pl-5 pt-3 md:pt-0">
                  {/* 4. Print Options */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Print Options
                    </label>
                    <div className="space-y-1.5">
                      {/* Date/Time */}
                      <div className={`flex items-center justify-between p-2 px-3 rounded-xl border transition-all ${
                        printDateTime ? 'border-emerald-200/80 bg-emerald-50/40' : 'border-slate-200 bg-white'
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
                      <div className={`flex items-center justify-between p-2 px-3 rounded-xl border transition-all ${
                        printPageNumber ? 'border-emerald-200/80 bg-emerald-50/40' : 'border-slate-200 bg-white'
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
                      <div className={`flex items-center justify-between p-2 px-3 rounded-xl border transition-all ${
                        addPackingSlip ? 'border-emerald-200/80 bg-emerald-50/40' : 'border-slate-200 bg-white'
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

                  {/* 5. Sort By */}
                  <div>
                    <label className="text-xs font-bold text-purple-700 block mb-1.5">
                      Sort By
                    </label>
                    <div className="space-y-1.5">
                      {/* SKU Wise */}
                      <div className={`flex items-center justify-between p-2 px-3 rounded-xl border transition-all ${
                        sortSku ? 'border-emerald-400 bg-emerald-50/60 shadow-xs' : 'border-slate-200 bg-white'
                      }`}>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                          <span className="text-sm">🛍️</span>
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
                          <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>

                      {/* Courier Wise */}
                      <div className={`flex items-center justify-between p-2 px-3 rounded-xl border transition-all ${
                        sortCourier ? 'border-emerald-400 bg-emerald-50/60 shadow-xs' : 'border-slate-200 bg-white'
                      }`}>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                          <span className="text-sm">🚚</span>
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
                          <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>

                      {/* Quantity Wise */}
                      <div className={`flex items-center justify-between p-2 px-3 rounded-xl border transition-all ${
                        sortQuantity ? 'border-emerald-400 bg-emerald-50/60 shadow-xs' : 'border-slate-200 bg-white'
                      }`}>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                          <span className="text-sm">📦</span>
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
                          <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>
                    </div>
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
          {/* Top Center Ajio Icon & Brand Header */}
          <div className="flex flex-col items-center justify-center text-center pt-1 pb-1">
            <div className="w-16 h-16 rounded-2xl bg-[#2C4152] text-white flex items-center justify-center shadow-md shadow-slate-900/15 border border-slate-700/40 mb-2.5">
              {/* Ajio Official Monogram */}
              <svg viewBox="0 0 192 192" className="w-10 h-10 stroke-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="12">
                <circle cx="96" cy="96" r="74" />
                <path d="M96 22 38 140M96 22l58 118M96 81l38 77M96 81l-38 77m18-33h40" />
              </svg>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-black tracking-widest uppercase shadow-xs">
              <span>AJIO</span>
              <span className="text-amber-400 font-bold">•</span>
              <span className="text-slate-300 font-semibold text-[11px] normal-case tracking-normal">Smart Label &amp; Invoice Suite</span>
            </div>
          </div>

          {/* Top Title & Action Bar (Single Row) */}
          <div className="p-3 px-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-500" />
              <span>Ajio Customer-Matched PDF Merger</span>
            </h3>
            {(ajioState.labelFiles?.length > 0 || ajioState.invoiceFiles?.length > 0 || ajioState.excelFile) && (
              <button
                type="button"
                onClick={clearAllAjio}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
          </div>

          {/* 0 MATCHES ERROR BANNER (BLOCKS DOWNLOAD) */}
          {ajioState.error && (
            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-500 text-rose-950 space-y-3 animate-in fade-in duration-200 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-rose-900">0 Matches Found — Download Blocked</h4>
                    <p className="text-xs text-rose-700 leading-relaxed mt-0.5">{ajioState.error}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAjioState(prev => ({ ...prev, error: null }))}
                  className="text-rose-500 hover:text-rose-800 p-1 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer shrink-0"
                  title="Dismiss Error"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Show breakdown list so client sees exactly which names didn't match */}
              {ajioState.matchStats?.matchedPairs?.length > 0 && (
                <div className="pt-2 border-t border-rose-200/80">
                  <div className="flex items-center justify-between text-xs font-bold text-rose-900 mb-2">
                    <span>Unmatched Shipping Labels ({ajioState.matchStats.matchedPairs.length} labels):</span>
                    <button
                      type="button"
                      onClick={() => setShowAjioBreakdown(!showAjioBreakdown)}
                      className="text-[11px] underline text-rose-700 hover:text-rose-900 cursor-pointer font-semibold"
                    >
                      {showAjioBreakdown ? 'Hide Names' : 'View All Names'}
                    </button>
                  </div>
                  {showAjioBreakdown && (
                    <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                      {ajioState.matchStats.matchedPairs.map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white border border-rose-200 text-xs text-slate-800">
                          <span className="font-bold">#{p.labelNum} {p.customerName}</span>
                          <span className="text-[10px] text-rose-700 font-semibold px-2 py-0.5 rounded bg-rose-50 border border-rose-200">
                            ✕ No matching invoice found in uploaded files
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Hidden file inputs */}
          <input
            ref={ajioLabelInputRef}
            type="file"
            multiple
            accept="application/pdf,.pdf"
            onChange={handleAjioLabelUpload}
            className="hidden"
          />
          <input
            ref={ajioInvoiceInputRef}
            type="file"
            multiple
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

          {/* The Upload Rows: 1 Row for Label, 1 Row for Invoice (Total 2 Row Style) */}
          <div className="space-y-3">
            {/* ROW 1: Label PDF */}
            <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => ajioLabelInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0"
                >
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>+ Add Label PDF(s)</span>
                </button>
              </div>

              {/* Middle & Right: Files List or Empty Message */}
              <div className="flex-1 min-w-0 flex items-center justify-between gap-3 flex-wrap">
                {ajioState.labelError ? (
                  <div className="flex items-center gap-2 text-rose-600 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{ajioState.labelError}</span>
                    <button
                      type="button"
                      onClick={() => setAjioState(prev => ({ ...prev, labelError: null }))}
                      className="text-rose-500 hover:text-rose-800 p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : ajioState.labelFiles && ajioState.labelFiles.length > 0 ? (
                  <>
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      {ajioState.labelFiles.map((fObj, idx) => (
                        <div
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-semibold text-slate-800 max-w-[160px] truncate" title={fObj.name}>
                            {fObj.name}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                            {fObj.pageCount} {fObj.pageCount === 1 ? 'Page' : 'Pages'}
                          </span>
                          <span className="text-slate-400 text-[10px] shrink-0">
                            ({formatFileSize(fObj.size)})
                          </span>
                          <button
                            type="button"
                            onClick={() => removeAjioLabelFile(idx)}
                            className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors shrink-0 cursor-pointer"
                            title="Remove this file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-500">
                        {ajioState.labelFiles.length} file{ajioState.labelFiles.length > 1 ? 's' : ''}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200">
                        Total: {ajioState.labelTotalPages} {ajioState.labelTotalPages === 1 ? 'Page' : 'Pages'}
                      </span>
                    </div>
                  </>
                ) : (
                  <span className="text-xs text-slate-400 italic">
                    No Label PDF selected yet (Select one or multiple PDFs)
                  </span>
                )}
              </div>
            </div>

            {/* ROW 2: Invoice PDF */}
            <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => ajioInvoiceInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0"
                >
                  <FileCheck className="w-4 h-4 text-sky-400" />
                  <span>+ Add Invoice PDF(s)</span>
                </button>
              </div>

              {/* Middle & Right: Files List or Empty Message */}
              <div className="flex-1 min-w-0 flex items-center justify-between gap-3 flex-wrap">
                {ajioState.invoiceError ? (
                  <div className="flex items-center gap-2 text-rose-600 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{ajioState.invoiceError}</span>
                    <button
                      type="button"
                      onClick={() => setAjioState(prev => ({ ...prev, invoiceError: null }))}
                      className="text-rose-500 hover:text-rose-800 p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : ajioState.invoiceFiles && ajioState.invoiceFiles.length > 0 ? (
                  <>
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      {ajioState.invoiceFiles.map((fObj, idx) => (
                        <div
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-xs shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          <span className="font-semibold text-slate-800 max-w-[160px] truncate" title={fObj.name}>
                            {fObj.name}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-bold shrink-0">
                            {fObj.pageCount} {fObj.pageCount === 1 ? 'Page' : 'Pages'}
                          </span>
                          <span className="text-slate-400 text-[10px] shrink-0">
                            ({formatFileSize(fObj.size)})
                          </span>
                          <button
                            type="button"
                            onClick={() => removeAjioInvoiceFile(idx)}
                            className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors shrink-0 cursor-pointer"
                            title="Remove this file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-500">
                        {ajioState.invoiceFiles.length} file{ajioState.invoiceFiles.length > 1 ? 's' : ''}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-sky-100 text-sky-800 font-bold text-xs border border-sky-200">
                        Total: {ajioState.invoiceTotalPages} {ajioState.invoiceTotalPages === 1 ? 'Page' : 'Pages'}
                      </span>
                    </div>
                  </>
                ) : (
                  <span className="text-xs text-slate-400 italic">
                    No Invoice PDF selected yet (Select one or multiple PDFs)
                  </span>
                )}
              </div>
            </div>
          </div>

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

          {/* Merge & Download Action Buttons (Cut into 2 Buttons) */}
          <div className="space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Button 1: Merge without invoice */}
              <button
                type="button"
                disabled={!ajioState.labelFiles?.length || !ajioState.invoiceFiles?.length || ajioState.isMerging}
                onClick={() => handleMergeAjioPdf({ includeInvoices: false })}
                className={`py-4 px-4 rounded-2xl font-bold text-sm shadow-md transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                  !ajioState.labelFiles?.length || !ajioState.invoiceFiles?.length
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : ajioState.isMerging && ajioState.mergeMode === 'without_invoice'
                    ? 'bg-amber-600 text-white cursor-wait'
                    : ajioState.isMerging
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-600/20 active:scale-[0.99]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-white" />
                  <span className="text-sm">
                    {ajioState.isMerging && ajioState.mergeMode === 'without_invoice'
                      ? (ajioState.mergeStatusText || 'Merging without Invoice...')
                      : 'Merge without invoice'}
                  </span>
                </div>
                <span className="text-[11px] opacity-90 font-normal">
                  Matches &amp; stamps SKUs on labels • Invoices omitted
                </span>
              </button>

              {/* Button 2: Merge with Invoice */}
              <button
                type="button"
                disabled={!ajioState.labelFiles?.length || !ajioState.invoiceFiles?.length || ajioState.isMerging}
                onClick={() => handleMergeAjioPdf({ includeInvoices: true })}
                className={`py-4 px-4 rounded-2xl font-bold text-sm shadow-md transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                  !ajioState.labelFiles?.length || !ajioState.invoiceFiles?.length
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : ajioState.isMerging && ajioState.mergeMode === 'with_invoice'
                    ? 'bg-indigo-600 text-white cursor-wait'
                    : ajioState.isMerging
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 hover:from-slate-900 hover:to-indigo-900 text-white shadow-slate-950/20 active:scale-[0.99]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span className="text-sm">
                    {ajioState.isMerging && ajioState.mergeMode === 'with_invoice'
                      ? (ajioState.mergeStatusText || 'Merging with Invoice...')
                      : 'Merge with Invoice'}
                  </span>
                </div>
                <span className="text-[11px] opacity-90 font-normal">
                  Matches &amp; stamps SKUs • Invoices attached after labels
                </span>
              </button>
            </div>

            {(!ajioState.labelFiles?.length || !ajioState.invoiceFiles?.length) && (
              <div className="p-2.5 rounded-xl bg-slate-100 text-center text-xs text-slate-500 font-medium">
                Please Upload Both Label PDF(s) &amp; Invoice PDF(s) to Enable Merging
              </div>
            )}
          </div>

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
                      {ajioState.mergedDownload?.includeInvoices === false ? ' (Labels Only • Invoices Omitted)' : ' (Labels + Invoices Interleaved)'}
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

              {/* Partial Match Notification Banner */}
              {ajioState.matchStats?.unmatchedLabelsCount > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-950 space-y-1 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Notice: {ajioState.matchStats.unmatchedLabelsCount} of {ajioState.matchStats.totalLabels} Label(s) had NO matching invoice!
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed pl-6">
                    As requested, unmatched labels have been <strong>excluded from the download</strong>. The PDF below contains <strong>strictly the {ajioState.matchStats.fullyMatchedCount} matching</strong> orders.
                  </p>
                </div>
              )}

              {/* Expandable Match Details List */}
              {showAjioBreakdown && ajioState.matchStats && (
                <div className="p-3 bg-white rounded-xl border border-emerald-200 max-h-60 overflow-y-auto space-y-2 text-xs">
                  <div className="font-bold text-slate-800 pb-1 border-b border-slate-100 text-[11px] flex items-center justify-between">
                    <span>Label &amp; Invoice Match Breakdown:</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Green = Included in PDF • Red = Excluded (No match)
                    </span>
                  </div>
                  {ajioState.matchStats.matchedPairs.map((pair, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-2 rounded-lg border text-[11px] ${
                        pair.isMatched
                          ? 'bg-slate-50 border-slate-100'
                          : 'bg-rose-50/70 border-rose-200'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <span className={`font-bold ${pair.isMatched ? 'text-slate-800' : 'text-rose-900'}`}>
                          #{pair.labelNum} {pair.customerName}
                        </span>
                        {pair.orderId && <span className="text-slate-400 text-[10px] ml-1.5 font-mono">({pair.orderId})</span>}
                        {pair.isMatched ? (
                          <span className="inline-block text-emerald-700 text-[10px] ml-1.5 font-medium bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            ✓ {pair.matchReason}
                          </span>
                        ) : (
                          <span className="inline-block text-rose-700 text-[10px] ml-1.5 font-semibold bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200">
                            ✕ Excluded (No matching invoice)
                          </span>
                        )}
                        {pair.items && pair.items.length > 0 && (
                          <span className="inline-block text-indigo-700 text-[10px] ml-1.5 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 font-mono">
                            SKU: {pair.items.map(it => `${it.sku}${it.qty > 1 ? ` (x${it.qty})` : ''}`).join(', ')}
                          </span>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[10px]" title={pair.fileName}>
                          {pair.fileName ? `${pair.fileName} P${pair.labelPage}` : `Label P${pair.labelPage}`}
                        </span>
                        <span>&rarr;</span>
                        {pair.matchedInvoices.length > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 font-mono text-[10px] font-semibold">
                            Invoice {pair.matchedInvoices.map(m => (m.fileName ? `${m.fileName} P${m.pageNum}` : `P${m.pageNum}`)).join(', ')} ({pair.matchedInvoices.length} {pair.matchedInvoices.length === 1 ? 'page' : 'pages'})
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-semibold">
                            Excluded from PDF
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {ajioState.matchStats.unmatchedInvoices?.length > 0 && (
                    <div className="pt-1 text-[10px] text-amber-700 italic">
                      + {ajioState.matchStats.unmatchedInvoices.length} invoice page(s) had no label match and were excluded from download.
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
      ) : selectedMarketplace === 'amazon' ? (
        /* ================= AMAZON LABEL EXTRACTOR (REMOVE INVOICES) ================= */
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-5 md:p-7 mb-6 space-y-6">
          {/* Top Instructions & Action Bar */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
                <div className="w-6 h-6 rounded-lg bg-[#131921] text-[#FF9900] flex items-center justify-center text-xs font-bold shadow-xs">
                  a
                </div>
                Amazon Invoice Remover &amp; SKU Printing
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                  Easy Ship &amp; Seller Flex
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload your Amazon PDF file(s). OrderMunim automatically removes the tax invoice pages and prints product SKU name &amp; quantity directly on your clean shipping labels ready for 4x6 / A4 printing.
              </p>
            </div>
            {(amazonState.files?.length > 0 || amazonState.error) && (
              <button
                type="button"
                onClick={clearAmazonAll}
                className="self-start md:self-auto text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All
              </button>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={amazonInputRef}
            type="file"
            multiple
            accept="application/pdf,.pdf"
            onChange={handleAmazonUpload}
            className="hidden"
          />

          {/* Upload Button with file status shown just beside button */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition-colors">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => amazonInputRef.current?.click()}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>+ Add Amazon PDF(s)</span>
                </button>
              </div>

              {/* Beside button: Red error box or Files summary / list */}
              <div className="flex-1 min-w-0 space-y-2">
                {amazonState.error && (
                  <div className="flex items-center justify-between gap-3 p-2.5 px-3.5 rounded-xl bg-rose-50 border-2 border-rose-500 text-rose-900 text-xs shadow-sm animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="font-bold text-[12px] leading-snug">{amazonState.error}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAmazonState(prev => ({ ...prev, error: null }))}
                      className="text-rose-500 hover:text-rose-800 p-1 rounded-lg hover:bg-rose-100 transition-colors shrink-0 cursor-pointer"
                      title="Dismiss Error"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {amazonState.files && amazonState.files.length > 0 ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 px-1">
                      <span>{amazonState.files.length} file(s) selected</span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold">
                        Total: {amazonState.totalPages} {amazonState.totalPages === 1 ? 'Page' : 'Pages'}
                      </span>
                    </div>
                    <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                      {amazonState.files.map((fObj, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-amber-50/70 border border-amber-200 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span className="font-semibold text-slate-800 truncate" title={fObj.name}>
                              {fObj.name}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold shrink-0">
                              {fObj.pageCount} {fObj.pageCount === 1 ? 'Page' : 'Pages'}
                            </span>
                            <span className="text-slate-400 text-[10px] shrink-0">
                              ({formatFileSize(fObj.size)})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAmazonFile(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors shrink-0 cursor-pointer"
                            title="Remove this file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : !amazonState.error && (
                  <span className="text-xs text-slate-400 italic pl-1 flex items-center h-full pt-1.5">
                    No Amazon PDF selected yet (Select your single or multiple Amazon PDFs)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Analysis & KPI Summary (When files are analyzed) */}
          {amazonState.pagesAnalysis && amazonState.pagesAnalysis.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                  <Layers className="w-4 h-4 text-amber-500" />
                  <span>Page Classification Summary</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAllAmazonPagesKeep('labels')}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                    title="Keep all detected shipping labels and remove invoices"
                  >
                    Keep Labels Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAmazonBreakdown(!showAmazonBreakdown)}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showAmazonBreakdown ? 'Hide Details' : 'View Page Breakdown'}</span>
                    {showAmazonBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* 3 KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Scanned Pages</div>
                    <div className="text-lg font-extrabold text-slate-800 font-mono">{amazonState.totalPages}</div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                    📄
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Labels to Keep</div>
                    <div className="text-lg font-extrabold text-emerald-800 font-mono">{amazonState.labelsCount} Pages</div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    🏷️
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Invoices Removed</div>
                    <div className="text-lg font-extrabold text-rose-800 font-mono">{amazonState.invoicesCount} Pages</div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                    🗑️
                  </div>
                </div>
              </div>

              {/* Expandable Page-by-Page Table with Keep/Remove Toggles */}
              {showAmazonBreakdown && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 max-h-72 overflow-y-auto space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-800 pb-1.5 border-b border-slate-100 text-[11px]">
                    <span>Page-by-Page Breakdown:</span>
                    <span className="text-[10px] text-slate-400 font-normal">Click toggle button to override any page</span>
                  </div>
                  {amazonState.pagesAnalysis.map((p, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between gap-2 p-2 rounded-lg border text-[11px] transition-colors ${
                        p.keep
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : 'bg-slate-50 border-slate-200 opacity-70'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-bold text-slate-700 shrink-0">
                          P{p.globalPageNum}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded font-bold text-[10px] shrink-0 ${
                            p.isLabel
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {p.isLabel ? '🏷️ Shipping Label' : '📄 Tax Invoice'}
                        </span>
                        <div className="truncate text-slate-700">
                          {p.recipientName && <span className="font-semibold mr-1.5">To: {p.recipientName}</span>}
                          {p.orderId && <span className="text-slate-500 font-mono text-[10px] mr-1.5">({p.orderId})</span>}
                          {p.trackingId && <span className="text-indigo-600 font-mono text-[10px]">Track: {p.trackingId}</span>}
                          {p.isLabel && p.skuText && (
                            <span className="inline-block text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ml-1.5">
                              🏷️ {p.skuText}
                            </span>
                          )}
                          {p.isInvoice && p.skuDisplayString && (
                            <span className="inline-block text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-medium font-mono ml-1.5">
                              Found: {p.skuDisplayString}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleAmazonPageKeep(idx)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-colors cursor-pointer ${
                          p.keep
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                        title={p.keep ? 'Click to exclude this page' : 'Click to include this page'}
                      >
                        {p.keep ? '✓ Kept' : '✕ Removed'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Progress Bar (if processing) */}
          {amazonState.isProcessing && (
            <div className="space-y-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
                  {amazonState.statusText || 'Extracting Amazon shipping labels...'}
                </span>
                <span className="font-mono text-amber-600">{amazonState.progress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-amber-500 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${amazonState.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Primary Action Button: Extract & Download Clean PDF */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              disabled={!amazonState.files?.length || amazonState.labelsCount === 0 || amazonState.isProcessing}
              onClick={handleExtractAmazonLabels}
              className={`flex-1 py-4 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
                !amazonState.files?.length || amazonState.labelsCount === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : amazonState.isProcessing
                  ? 'bg-amber-400 text-white cursor-wait'
                  : 'bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 hover:from-slate-900 hover:to-amber-900 text-white shadow-slate-950/20 active:scale-[0.99]'
              }`}
            >
              <FileCheck className="w-4 h-4 text-amber-400" />
              <span>
                {amazonState.isProcessing
                  ? (amazonState.statusText || 'Extracting Labels...')
                  : !amazonState.files?.length
                  ? 'Please Upload Amazon PDF First'
                  : `Extract & Download ${amazonState.labelsCount} Shipping Labels (Remove ${amazonState.invoicesCount} Invoices)`}
              </span>
            </button>

            {/* Optional Secondary Button: Download Invoices Only */}
            {amazonState.invoicesCount > 0 && (
              <button
                type="button"
                onClick={handleDownloadAmazonInvoices}
                className="px-4 py-3 sm:py-0 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                title="Download only the extracted tax invoice pages"
              >
                <Download className="w-3.5 h-3.5 text-rose-600" />
                <span>Invoices Only ({amazonState.invoicesCount})</span>
              </button>
            )}
          </div>

          {/* Result Ready Banner */}
          {amazonState.result && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-xs space-y-3 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-emerald-900">
                      Amazon Clean Labels Ready!
                    </h4>
                    <p className="text-[11px] text-emerald-700">
                      {amazonState.result.labelsCount} Shipping Labels Extracted • {amazonState.result.invoicesCount} Invoices Eliminated • 100% Ready to Print
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="flex-1 py-3 bg-white hover:bg-slate-50 text-slate-800 border border-emerald-300 text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-emerald-600" />
                  Preview / Print Labels
                </button>

                <a
                  href={amazonState.result.url}
                  download={amazonState.result.filename}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors text-center cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Download PDF Again
                </a>
              </div>
            </div>
          )}
        </div>
      ) : selectedMarketplace === 'myntra' ? (
        /* ================= MYNTRA M-DIRECT (STRICTLY CONTROLLED BY ADMIN) ================= */
        (!currentUser || (!userProfile?.hasMyntraAccess && userProfile?.role !== 'super_admin' && currentUser?.email !== 'rrtradersofficials@gmail.com' && currentUser?.uid !== 'vJID6QrALTf4ybiDP5TuLvNkyN63')) ? (
          <div className="max-w-xl mx-auto bg-white border border-slate-200/90 rounded-3xl p-8 text-center space-y-5 shadow-xs animate-in fade-in duration-150">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#FF3F6C] to-[#F16521] text-white flex items-center justify-center mx-auto text-2xl font-black shadow-md shadow-rose-500/20">
              M
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                Strict Admin-Controlled Feature
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 pt-1">
                Myntra M-Direct Portal (Partner PPMP)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
                Direct Myntra partner portal access with instant label generation without QZ Tray requires registered seller verification and direct activation by our admin team.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1.5 text-left">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Included with Myntra M-Direct:
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                <li>Direct in-app login to mdirect.myntrainfo.com</li>
                <li>Instant 1-click 4x6 thermal PDF label &amp; invoice download</li>
                <li>Zero printer driver or Java QZ Tray requirements</li>
                <li>Automatic packet ID &amp; SKU synchronization</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              {!currentUser ? (
                <button
                  type="button"
                  onClick={() => {
                    if (onRequireAuth) {
                      onRequireAuth('Sign in with your Google account to request Myntra access.');
                    }
                  }}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20 cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  <User className="w-4 h-4" />
                  <span>Sign In with Google</span>
                </button>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-semibold">
                  ⚠️ Please contact the OrderMunim admin team to activate Myntra portal access for your registered account.
                </div>
              )}
              <button
                type="button"
                onClick={() => setSelectedMarketplace('meesho')}
                className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Switch to Meesho Cropper
              </button>
            </div>
          </div>
        ) : (
        <div className="mb-6 space-y-6">
          {!myntraSession ? (
            /* ========================================================================= */
            /* 1. OFFICIAL MYNTRA M-DIRECT LOGIN SCREEN                                   */
            /* ========================================================================= */
            <div className="relative overflow-hidden rounded-3xl bg-[#090d16] border border-slate-800 shadow-2xl text-white">
              {/* Subtle background glow styling */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-rose-900/20 via-slate-950/70 to-[#070a12] pointer-events-none" />
              <div className="absolute -top-32 -left-32 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 max-w-xl mx-auto py-10 px-5 sm:px-8">
                {/* Official Brand Header */}
                <div className="flex flex-col items-center text-center space-y-3 mb-8">
                  {/* Myntra Stylized Emblem */}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#FF3F6C] via-[#FF527B] to-[#F16521] text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-rose-600/30 border border-white/20">
                    M
                  </div>

                  <div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
                      Myntra Orders Portal
                    </h2>
                    <p className="text-xs font-semibold text-rose-400 mt-0.5">
                      Seller Hub • Instant Shipping Labels &amp; Tax Invoices
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>No Printer Drivers or QZ Tray Needed</span>
                  </div>
                </div>

                {/* Login Form Container Card */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl backdrop-blur-md">
                  <form onSubmit={handleMyntraLogin} className="space-y-4">
                    {/* Error Notice */}
                    {myntraLoginError && (
                      <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{myntraLoginError}</span>
                      </div>
                    )}

                    {/* Email Input */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Email Address or Username
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          value={myntraEmail}
                          onChange={(e) => {
                            setMyntraEmail(e.target.value);
                            if (myntraLoginError) setMyntraLoginError(null);
                          }}
                          placeholder="partner@myntraseller.com"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all"
                        />
                      </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => setMyntraShowPassword(!myntraShowPassword)}
                          className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          {myntraShowPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {myntraShowPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type={myntraShowPassword ? 'text' : 'password'}
                          value={myntraPassword}
                          onChange={(e) => {
                            setMyntraPassword(e.target.value);
                            if (myntraLoginError) setMyntraLoginError(null);
                          }}
                          placeholder="••••••••••••"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all"
                        />
                      </div>
                    </div>

                    {/* Show Password row */}
                    <div className="flex items-center pt-1 text-xs text-slate-400">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={myntraShowPassword}
                          onChange={(e) => setMyntraShowPassword(e.target.checked)}
                          className="rounded border-slate-700 bg-slate-950 text-rose-600 focus:ring-rose-500"
                        />
                        <span>Show Password</span>
                      </label>
                    </div>

                    {/* Log In Button */}
                    <button
                      type="submit"
                      disabled={myntraLoggingIn}
                      className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#FF3F6C] via-[#FF527B] to-[#F16521] hover:opacity-95 shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] disabled:opacity-60"
                    >
                      {myntraLoggingIn ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Signing In...</span>
                        </>
                      ) : (
                        <>
                          <span>LOG IN TO MYNTRA</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Extension Download Card & Guide hidden */}
              </div>
            </div>

          ) : (
            /* 2. AUTHENTICATED MYNTRA WORKSPACE - ORDERS & PDF DOWNLOADER */
            <div className="space-y-4">
              {/* Simple top bar: seller info + actions */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF3F6C] to-[#F16521] text-white flex items-center justify-center text-sm font-black shadow-md">
                    M
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">Myntra Orders</div>
                    <div className="text-[11px] text-slate-500 font-mono">{myntraSession?.email || 'Logged In'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMyntraAddModalOpen(true)}
                    className="py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-rose-400" />
                    <span>+ Add Order</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleMyntraLogout}
                    className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer"
                    title="Sign Out of Myntra"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Orders & PDF Downloader Table — always visible after login */}
              <div className="space-y-4">
                {/* Metric Counters Banner */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-medium text-slate-500">Total Orders</span>
                        <div className="text-lg font-black text-slate-800 mt-0.5">{myntraOrders.length}</div>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                        <Package className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 shadow-xs flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-medium text-amber-800">Ready to Pack</span>
                        <div className="text-lg font-black text-amber-900 mt-0.5">
                          {myntraOrders.filter(o => o.status === 'Ready to Pack').length}
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                        <Boxes className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-cyan-50/70 border border-cyan-200 shadow-xs flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-medium text-cyan-800">Ready for Dispatch</span>
                        <div className="text-lg font-black text-cyan-900 mt-0.5">
                          {myntraOrders.filter(o => o.status === 'Ready to Dispatch').length}
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold">
                        <Truck className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 shadow-xs flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-medium text-emerald-800">Virtual QZ Engine</span>
                        <div className="text-xs font-bold text-emerald-900 mt-1">100% Thermal Ready</div>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <Printer className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Workspace Controls & Batch Action Toolbar */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                    {/* Search & Filter row */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                      {/* Status Pills */}
                      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
                        {[
                          { id: 'all', label: `All (${myntraOrders.length})` },
                          { id: 'ready_to_pack', label: `Ready to Pack (${myntraOrders.filter(o => o.status === 'Ready to Pack').length})` },
                          { id: 'ready_to_dispatch', label: `Ready for Dispatch (${myntraOrders.filter(o => o.status === 'Ready to Dispatch').length})` },
                          { id: 'dispatched', label: `Dispatched (${myntraOrders.filter(o => o.status === 'Dispatched').length})` }
                        ].map(tab => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setMyntraStatusFilter(tab.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                              myntraStatusFilter === tab.id
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      {/* Search box */}
                      <div className="relative min-w-[240px]">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                        <input
                          type="text"
                          value={myntraSearchQuery}
                          onChange={(e) => setMyntraSearchQuery(e.target.value)}
                          placeholder="Search AWB, Order ID, SKU..."
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                      </div>
                    </div>

                    {/* Primary Batch Action Buttons */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <span className="font-bold text-slate-800">
                          {myntraSelectedIds.size > 0 ? `${myntraSelectedIds.size} Selected` : `All ${filteredMyntraOrders.length} Orders`}:
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          Instant PDF downloads without printer drivers or QZ Tray.
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Batch Download Labels */}
                        <button
                          type="button"
                          onClick={handleBatchDownloadMyntraLabels}
                          disabled={myntraDownloadingId === 'batch_labels'}
                          className="py-2 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                        >
                          {myntraDownloadingId === 'batch_labels' ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Generating Labels...</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-3.5 h-3.5 text-rose-400" />
                              <span>Download All Labels (PDF)</span>
                            </>
                          )}
                        </button>

                        {/* Batch Download Invoices */}
                        <button
                          type="button"
                          onClick={handleBatchDownloadMyntraInvoices}
                          disabled={myntraDownloadingId === 'batch_invoices'}
                          className="py-2 px-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                        >
                          {myntraDownloadingId === 'batch_invoices' ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Generating Invoices...</span>
                            </>
                          ) : (
                            <>
                              <FileText className="w-3.5 h-3.5 text-slate-600" />
                              <span>Download All Invoices (PDF)</span>
                            </>
                          )}
                        </button>

                        {/* Pack & Download All Combined */}
                        <button
                          type="button"
                          onClick={handleBatchDownloadMyntraCombined}
                          disabled={myntraDownloadingId === 'batch_combined'}
                          className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-[#FF3F6C] to-[#F16521] hover:opacity-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {myntraDownloadingId === 'batch_combined' ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Building Dispatch Pack...</span>
                            </>
                          ) : (
                            <>
                              <Layers className="w-3.5 h-3.5" />
                              <span>Pack &amp; Download All</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Orders Table */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                            <th className="p-3 w-10 text-center">
                              <input
                                type="checkbox"
                                checked={myntraSelectedIds.size > 0 && myntraSelectedIds.size === filteredMyntraOrders.length}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setMyntraSelectedIds(new Set(filteredMyntraOrders.map(o => o.id)));
                                  } else {
                                    setMyntraSelectedIds(new Set());
                                  }
                                }}
                                className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                              />
                            </th>
                            <th className="p-3">Order &amp; Packet ID</th>
                            <th className="p-3">Item Particulars</th>
                            <th className="p-3">Logistics &amp; AWB</th>
                            <th className="p-3">Destination</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">1-Click PDF Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {filteredMyntraOrders.length === 0 ? (
                            <tr>
                              <td colSpan="7" className="p-8 text-center text-slate-400">
                                No orders found matching your criteria.
                              </td>
                            </tr>
                          ) : (
                            filteredMyntraOrders.map((order) => {
                              const isSelected = myntraSelectedIds.has(order.id);
                              const isLabelDownloading = myntraDownloadingId === `label_${order.id}`;
                              const isInvoiceDownloading = myntraDownloadingId === `invoice_${order.id}`;
                              const isBothDownloading = myntraDownloadingId === `both_${order.id}`;

                              return (
                                <tr
                                  key={order.id}
                                  className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-rose-50/30' : ''}`}
                                >
                                  <td className="p-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        const next = new Set(myntraSelectedIds);
                                        if (e.target.checked) next.add(order.id);
                                        else next.delete(order.id);
                                        setMyntraSelectedIds(next);
                                      }}
                                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                                    />
                                  </td>
                                  <td className="p-3">
                                    <div className="font-bold text-slate-800">{order.orderId}</div>
                                    <div className="text-[10px] text-slate-500">{order.packetId}</div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">{order.orderDate}</div>
                                  </td>
                                  <td className="p-3 max-w-[220px]">
                                    <div className="font-bold text-slate-800 truncate" title={order.productName}>
                                      {order.productName}
                                    </div>
                                    <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                                      {order.sku} • Sz {order.size} (Qty: {order.qty})
                                    </div>
                                    <div className="text-[11px] font-semibold text-emerald-700 mt-0.5">
                                      ₹{order.price} • {order.paymentMode}
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                      <span className="font-mono text-[11px]">{order.awb}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigator.clipboard?.writeText(order.awb);
                                          showToast?.(`Copied AWB ${order.awb}`, 'info');
                                        }}
                                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
                                        title="Copy AWB"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                    </div>
                                    <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                      <Truck className="w-3 h-3 text-slate-400" />
                                      <span>{order.courier}</span>
                                      <span className="text-[10px] px-1 py-0.2 bg-slate-100 text-slate-600 rounded">
                                        {order.routingHub}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <div className="font-bold text-slate-800">{order.customerName}</div>
                                    <div className="text-[11px] text-slate-500">{order.city}, {order.state}</div>
                                    <div className="text-[10px] text-slate-400">{order.pincode}</div>
                                  </td>
                                  <td className="p-3">
                                    <span
                                      className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                        order.status === 'Ready to Pack'
                                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                          : order.status === 'Ready to Dispatch'
                                          ? 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      }`}
                                    >
                                      {order.status}
                                    </span>
                                  </td>
                                  <td className="p-3 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      {/* Download Label Button */}
                                      <button
                                        type="button"
                                        onClick={() => handleDownloadSingleLabel(order)}
                                        disabled={isLabelDownloading}
                                        className="py-1.5 px-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] rounded-lg shadow-xs flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                        title="Download 4x6 Thermal Shipping Label (PDF)"
                                      >
                                        {isLabelDownloading ? (
                                          <RefreshCw className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <Download className="w-3 h-3 text-rose-400" />
                                        )}
                                        <span>Label</span>
                                      </button>

                                      {/* Download Invoice Button */}
                                      <button
                                        type="button"
                                        onClick={() => handleDownloadSingleInvoice(order)}
                                        disabled={isInvoiceDownloading}
                                        className="py-1.5 px-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-[11px] rounded-lg shadow-xs flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                        title="Download Official A4 Tax Invoice (PDF)"
                                      >
                                        {isInvoiceDownloading ? (
                                          <RefreshCw className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <FileText className="w-3 h-3 text-slate-500" />
                                        )}
                                        <span>Invoice</span>
                                      </button>

                                      {/* Download Both */}
                                      <button
                                        type="button"
                                        onClick={() => handleDownloadSingleCombined(order)}
                                        disabled={isBothDownloading}
                                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                        title="Download Both (Label + Invoice Combined)"
                                      >
                                        {isBothDownloading ? (
                                          <RefreshCw className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <Layers className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

              {/* Add Custom Order Modal */}
              {myntraAddModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#FF3F6C] to-[#F16521] text-white flex items-center justify-center text-xs font-black">
                          M
                        </div>
                        <h3 className="font-bold text-sm text-slate-800">
                          Process Custom M-Direct Order
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMyntraAddModalOpen(false)}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleAddCustomMyntraOrder} className="space-y-3.5 pt-4 text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Order ID</label>
                          <input
                            type="text"
                            value={newMyntraOrder.orderId}
                            onChange={(e) => setNewMyntraOrder({ ...newMyntraOrder, orderId: e.target.value })}
                            placeholder="e.g. 128472910399"
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">AWB Number</label>
                          <input
                            type="text"
                            value={newMyntraOrder.awb}
                            onChange={(e) => setNewMyntraOrder({ ...newMyntraOrder, awb: e.target.value })}
                            placeholder="e.g. MYNTR991823901"
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Product Title</label>
                          <input
                            type="text"
                            value={newMyntraOrder.productName}
                            onChange={(e) => setNewMyntraOrder({ ...newMyntraOrder, productName: e.target.value })}
                            placeholder="e.g. Roadster Denim Jeans"
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">SKU Code</label>
                          <input
                            type="text"
                            value={newMyntraOrder.sku}
                            onChange={(e) => setNewMyntraOrder({ ...newMyntraOrder, sku: e.target.value })}
                            placeholder="e.g. MYN-RDST-32"
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Size</label>
                          <input
                            type="text"
                            value={newMyntraOrder.size}
                            onChange={(e) => setNewMyntraOrder({ ...newMyntraOrder, size: e.target.value })}
                            placeholder="M / 32 / L"
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Qty</label>
                          <input
                            type="number"
                            value={newMyntraOrder.qty}
                            onChange={(e) => setNewMyntraOrder({ ...newMyntraOrder, qty: e.target.value })}
                            min="1"
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Price (₹)</label>
                          <input
                            type="number"
                            value={newMyntraOrder.price}
                            onChange={(e) => setNewMyntraOrder({ ...newMyntraOrder, price: e.target.value })}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Customer Name</label>
                          <input
                            type="text"
                            value={newMyntraOrder.customerName}
                            onChange={(e) => setNewMyntraOrder({ ...newMyntraOrder, customerName: e.target.value })}
                            placeholder="Customer Name"
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Courier Partner</label>
                          <select
                            value={newMyntraOrder.courier}
                            onChange={(e) => setNewMyntraOrder({ ...newMyntraOrder, courier: e.target.value })}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                          >
                            <option value="Myntra Logistics">Myntra Logistics</option>
                            <option value="Delhivery Surface">Delhivery Surface</option>
                            <option value="Shadowfax Express">Shadowfax Express</option>
                            <option value="Ekart Logistics">Ekart Logistics</option>
                            <option value="Bluedart Air">Bluedart Air</option>
                            <option value="Xpressbees Surface">Xpressbees Surface</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">City</label>
                          <input
                            type="text"
                            value={newMyntraOrder.city}
                            onChange={(e) => setNewMyntraOrder({ ...newMyntraOrder, city: e.target.value })}
                            placeholder="New Delhi"
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">State</label>
                          <input
                            type="text"
                            value={newMyntraOrder.state}
                            onChange={(e) => setNewMyntraOrder({ ...newMyntraOrder, state: e.target.value })}
                            placeholder="Delhi"
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">PIN Code</label>
                          <input
                            type="text"
                            value={newMyntraOrder.pincode}
                            onChange={(e) => setNewMyntraOrder({ ...newMyntraOrder, pincode: e.target.value })}
                            placeholder="110001"
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                          />
                        </div>
                      </div>

                      <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setMyntraAddModalOpen(false)}
                          className="py-2 px-4 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="py-2 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all shadow-sm cursor-pointer"
                        >
                          Add &amp; Save Order
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        )
      ) : selectedMarketplace === 'webcam' ? (
        /* ================= WEBCAM RETURN PROOF & UNBOXING STUDIO ================= */
        <div className="mb-6 space-y-6 animate-in fade-in duration-200">
          {/* Header Card with Shifted Clock Badge from Image 1 */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  Live Proof Camera
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <Camera className="w-6 h-6 text-emerald-400" />
                Webcam Return Proof &amp; Unboxing Studio
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
                Record parcel unboxing with live Indian Date &amp; Time proof. Accepted by Meesho, Flipkart, Amazon &amp; Myntra for return claims.
              </p>
            </div>

            {/* Shifted Clock Badge */}
            <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleOpenClockModal}
                className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-slate-950 border transition-all text-mono text-xs sm:text-sm font-bold tracking-wider shadow-inner cursor-pointer group ${
                  clockMode === 'custom'
                    ? 'border-amber-500/60 text-amber-300 hover:border-amber-400 shadow-amber-950/20'
                    : 'border-emerald-500/50 text-emerald-400 hover:border-emerald-400 shadow-emerald-950/20'
                }`}
                title="Click to edit / customize Date & Time for video proof"
              >
                <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-mono whitespace-nowrap">{currentIstTime || 'Loading IST...'}</span>
                <Edit3 className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity shrink-0 ml-0.5 text-cyan-400" />
              </button>

              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-slate-400">Timer Mode:</span>
                <span className={`font-bold ${clockMode === 'custom' ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {clockMode === 'custom' ? 'Custom Edited (Ticking Live)' : 'Live Real-Time IST'}
                </span>
                <button
                  type="button"
                  onClick={handleOpenClockModal}
                  className="text-cyan-400 hover:underline cursor-pointer font-bold"
                >
                  Edit Time
                </button>
              </div>
            </div>
          </div>

          {/* Main Webcam Recording Stage */}
          <div className="glass-card border border-white/10 rounded-3xl p-5 md:p-6 shadow-2xl space-y-5">
            {/* Camera Selection & Status Bar */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10 flex-wrap">
              <div className="flex items-center gap-2">
                {isWebcamActive ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300 text-xs font-bold">
                    Camera Live
                  </span>
                ) : null}

                {isRecording && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-300 text-xs font-black animate-pulse">
                    <Circle className="w-2.5 h-2.5 fill-rose-500 text-rose-500" />
                    REC [{formatSecs(recordingDurationSec)}]
                  </span>
                )}
              </div>

              {/* Camera Selector & Flip Front/Back Controls (Flip button only on mobile devices) */}
              <div className="flex items-center gap-2 ml-auto">
                {isMobileDevice && (
                  <button
                    type="button"
                    onClick={handleToggleFacingMode}
                    className="px-3.5 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/15 text-white rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-white/15 active:scale-95 shadow-sm"
                    title="Switch between Rear (Back) and Front Camera"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                    <span>{facingMode === 'environment' ? 'Rear Cam 📷' : 'Front Cam 🤳'}</span>
                  </button>
                )}

                {availableCameras.length > 1 && (
                  <select
                    value={selectedCameraId}
                    onChange={(e) => {
                      setSelectedCameraId(e.target.value);
                      if (isWebcamActive) {
                        handleStartWebcam(e.target.value);
                      }
                    }}
                    className="px-2.5 py-1 text-xs font-semibold bg-[#040914] border border-white/15 rounded-xl text-white focus:outline-none focus:border-sky-400 cursor-pointer"
                  >
                    {availableCameras.map((cam, idx) => (
                      <option key={cam.deviceId || idx} value={cam.deviceId}>
                        {cam.label || `Camera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Video Viewport Container */}
            <div className="relative aspect-video w-full max-w-3xl mx-auto rounded-2xl overflow-hidden bg-black/90 border border-white/15 shadow-2xl flex items-center justify-center">
              <video
                ref={webcamVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isWebcamActive ? 'block' : 'hidden'}`}
              />

              {isWebcamActive && (
                <>
                  {/* Superimposed Live Timestamp HUD Overlay — Clean Pure Normal Text, NO Shadow, NO Stroke, NO Background */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none select-none">
                    <span 
                      className="text-sm sm:text-base md:text-lg font-normal text-white tracking-normal select-none whitespace-nowrap"
                      style={{
                        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                        fontWeight: 400
                      }}
                    >
                      {currentIstTime}
                    </span>
                  </div>

                  {/* Top-Right Recording Indicator */}
                  {isRecording && (
                    <div className="absolute top-3 right-3 z-20 pointer-events-none">
                      <div className="bg-rose-600/90 text-white font-black text-xs px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 animate-pulse">
                        <Circle className="w-2.5 h-2.5 fill-white text-white" />
                        <span>RECORDING</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {!isWebcamActive && (
                /* Webcam Offline State */
                <div className="text-center p-4 sm:p-6 space-y-3.5 max-w-md w-full">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-white/5 border border-white/10 text-orange-400 flex items-center justify-center mx-auto shadow-inner">
                    <Camera className="w-7 h-7 sm:w-8 sm:h-8 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white">Camera Ready</h3>
                    <p className="text-xs text-sky-200/70 mt-1 leading-relaxed max-w-xs mx-auto">
                      Tap below to start camera with live IST Date &amp; Time proof directly on video screen.
                    </p>
                  </div>
                  {webcamError && (
                    <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-left space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-rose-200">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>Camera Access Notice:</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-300">{webcamError}</p>
                      <p className="text-[10px] text-orange-300/90 pt-1 border-t border-rose-500/20">
                        📱 <strong>On Mobile Phone / App:</strong> Open Phone <em>Settings &gt; Apps &gt; OrderMunim (or Chrome) &gt; Permissions &gt; Camera</em> &rarr; Set to <strong>&quot;Allow&quot;</strong>.
                      </p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleStartWebcam()}
                    className="w-full sm:w-auto py-3.5 px-8 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-black text-sm shadow-xl shadow-orange-500/30 flex items-center justify-center gap-2.5 mx-auto cursor-pointer transition-all active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-white text-white" />
                    <span>Start Camera &amp; Live Timer</span>
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons Toolbar (Only shown when Camera is Active) */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              {isWebcamActive && (
                <>
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      className="py-3 px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/25 flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <Circle className="w-4 h-4 fill-white text-white" />
                      <span>Start Recording &amp; Timer</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStopRecording}
                      className="py-3 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <Square className="w-4 h-4 fill-rose-500 text-rose-500" />
                      <span>Stop Recording ({formatSecs(recordingDurationSec)})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleStopWebcam}
                    className="py-3 px-5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/15 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <VideoOff className="w-4 h-4 text-slate-400" />
                    <span>Stop Webcam</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenClockModal}
                    className="py-3 px-5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/15 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Edit3 className="w-4 h-4 text-sky-400" />
                    <span>Edit Date &amp; Time</span>
                  </button>
                </>
              )}
            </div>

            {/* Recorded Video Preview & Download Section */}
            {recordedVideoUrl && (
              <div className="p-5 rounded-3xl glass-card border border-white/10 text-white shadow-xl space-y-4 mt-4 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0">
                      <Play className="w-5 h-5 fill-sky-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Video Recorded Successfully!</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                          Ready for Claim
                        </span>
                      </h4>
                      <p className="text-xs text-sky-200/70">
                        Play and check the unboxing video below, then click Download to save it to your device.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadRecordedVideo}
                    className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 cursor-pointer transition-all active:scale-95 shrink-0"
                  >
                    <Download className="w-4 h-4 text-white" />
                    <span>Download Proof Video</span>
                  </button>
                </div>

                {/* Video Preview Player with native playback controls */}
                <div className="relative aspect-video max-w-2xl mx-auto rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl">
                  <video
                    src={recordedVideoUrl}
                    controls
                    playsInline
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400 pt-1">
                  <span>💡 <strong>Tip:</strong> You can play, pause, and seek the video to verify the unboxing parcel condition and seal.</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (recordedVideoUrl) {
                        try { URL.revokeObjectURL(recordedVideoUrl); } catch {}
                      }
                      setRecordedVideoUrl(null);
                      setRecordedVideoBlob(null);
                    }}
                    className="text-rose-400 hover:text-rose-300 font-bold hover:underline cursor-pointer text-left sm:text-right"
                  >
                    Discard &amp; Record New
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* ================= UNDER DEVELOPMENT CARD ================= */}
          <div className="glass-card border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl text-center max-w-2xl mx-auto my-6 text-white">
            <div className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center mb-4 bg-white/5 border border-white/10 text-orange-400 shadow-inner">
              <Scissors className="w-8 h-8 text-orange-400" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              <span>In Active Development</span>
            </div>

            <h2 className="text-xl md:text-2xl font-black text-white mb-2">
              {activeMarketplace?.name} Label Cropper
            </h2>

            <p className="text-xs md:text-sm text-sky-200/70 max-w-lg mx-auto mb-6 leading-relaxed">
              We are fine-tuning the 4x6 thermal cropping layout for <strong className="text-white">{activeMarketplace?.name}</strong>. This module will be released in an upcoming update!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-md mx-auto mb-8">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-xs font-bold text-white flex items-center gap-1.5 mb-1">
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
      {showPreviewModal && (
        selectedMarketplace === 'ajio'
          ? ajioState.mergedDownload?.url
          : selectedMarketplace === 'amazon'
          ? amazonState.result?.url
          : (downloadReady && downloadReady.url)
      ) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 shadow-2xl space-y-3 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                {selectedMarketplace === 'ajio' ? (
                  <Layers className="w-5 h-5 text-indigo-600" />
                ) : selectedMarketplace === 'amazon' ? (
                  <Package className="w-5 h-5 text-amber-500" />
                ) : (
                  <Scissors className="w-5 h-5 text-emerald-600" />
                )}
                <h3 className="font-bold text-sm text-slate-900">
                  {selectedMarketplace === 'ajio'
                    ? `Ajio Merged Label & Invoice Preview (${ajioState.mergedDownload?.totalPages || 0} Pages)`
                    : selectedMarketplace === 'amazon'
                    ? `Amazon Invoice Remover & SKU Printing Preview (${amazonState.result?.totalPages || 0} Labels)`
                    : `Cropped Thermal Label Preview (${selectedMarketplace === 'flipcart' ? '4x6" Thermal Portrait' : (selectedMarketplace === 'snapdeal' ? 'Snapdeal Thermal' : '4x6" Landscape')})`}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={
                    selectedMarketplace === 'ajio'
                      ? ajioState.mergedDownload?.url
                      : selectedMarketplace === 'amazon'
                      ? amazonState.result?.url
                      : downloadReady?.url
                  }
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
                src={`${(
                  selectedMarketplace === 'ajio'
                    ? ajioState.mergedDownload?.url
                    : selectedMarketplace === 'amazon'
                    ? amazonState.result?.url
                    : downloadReady?.url
                )}#toolbar=0&navpanes=0`}
                title="PDF Preview"
                className="w-full h-full min-h-[440px] rounded-xl"
              />
            </div>

            <div className="border-t pt-3 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {selectedMarketplace === 'ajio'
                  ? `Ajio Interleaved Document • Alternating Label and Invoice Pages`
                  : selectedMarketplace === 'amazon'
                  ? `Amazon Pure Shipping Labels • ${amazonState.result?.invoicesCount || 0} Invoices Filtered Out`
                  : `${activeMarketplace?.name} Pure Shipping Label • 100% Tax Invoice Eliminated (${selectedMarketplace === 'flipcart' ? '4x6" Thermal Format' : (selectedMarketplace === 'snapdeal' ? 'Snapdeal Thermal Format' : 'LabelMantra Format')})`}
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
                  href={
                    selectedMarketplace === 'ajio'
                      ? ajioState.mergedDownload?.url
                      : selectedMarketplace === 'amazon'
                      ? amazonState.result?.url
                      : downloadReady?.url
                  }
                  download={
                    selectedMarketplace === 'ajio'
                      ? ajioState.mergedDownload?.filename
                      : selectedMarketplace === 'amazon'
                      ? amazonState.result?.filename
                      : downloadReady?.filename
                  }
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= EDIT DATE & TIME MODAL (FOR WEBCAM STUDIO) ================= */}
      {showClockModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Edit Date &amp; Time</h3>
                  <p className="text-[11px] text-slate-500">Webcam Proof &amp; Unboxing Timestamp</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowClockModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Display Status */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Currently Showing:</span>
              <div className="font-mono text-sm font-bold text-emerald-700 tracking-wider">
                {currentIstTime}
              </div>
              <div className="flex items-center justify-center gap-1.5 pt-1">
                <span className={`w-2 h-2 rounded-full ${clockMode === 'custom' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                <span className="text-[10px] text-slate-600 font-semibold">
                  Mode: <strong className={clockMode === 'custom' ? 'text-amber-700' : 'text-emerald-700'}>
                    {clockMode === 'custom' ? 'Custom / Edited (Ticking Live)' : 'Live Real-Time IST'}
                  </strong>
                </span>
              </div>
            </div>

            {/* Form to Set Custom Date & Time */}
            <form onSubmit={handleApplyCustomTime} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-sky-600" />
                  Select Date
                </label>
                <input
                  type="date"
                  value={editDateStr}
                  onChange={(e) => setEditDateStr(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-sky-600" />
                  Select Time
                </label>
                <input
                  type="time"
                  step="1"
                  value={editTimeStr}
                  onChange={(e) => setEditTimeStr(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <p className="text-[10px] text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                💡 <strong>Natural unboxing proof:</strong> The clock will continuously tick forward second-by-second from this edited time, making the video proof look 100% genuine!
              </p>

              <div className="flex items-center gap-2 pt-1">
                {clockMode === 'custom' && (
                  <button
                    type="button"
                    onClick={handleResetToLiveTime}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer border border-slate-200"
                  >
                    Reset to Live IST
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                >
                  Set Custom Time
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= CROSS-MARKETPLACE DETECTION ALERT MODAL ================= */}
      {crossMarketplaceAlert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200 text-slate-900">
            {/* Header Icon & Title */}
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold uppercase tracking-wider mb-1">
                  Wrong Marketplace File
                </div>
                <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                  {crossMarketplaceAlert.detectedName} Label Detected!
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCrossMarketplaceAlert(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Warning Description Box */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-2 text-xs text-slate-600">
              <p>
                You uploaded a <strong className="text-slate-900 font-bold">{crossMarketplaceAlert.detectedName}</strong> shipping label, but you are currently in the <strong className="text-slate-900 font-bold">{crossMarketplaceAlert.currentName}</strong> cropper tab.
              </p>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] font-medium text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Cropping with the wrong dimensions may cut through barcodes and text!</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const targetMp = crossMarketplaceAlert.detectedMp;
                  const filesToMove = crossMarketplaceAlert.files;
                  setCrossMarketplaceAlert(null);
                  handleSelectMarketplace(targetMp);
                  appendFilesToMarketplace(targetMp, filesToMove);
                  showToast?.(`Switched to ${crossMarketplaceAlert.detectedName} Cropper and loaded files!`, 'success');
                }}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Scissors className="w-4 h-4" />
                <span>Switch to {crossMarketplaceAlert.detectedName} &amp; Load</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (crossMarketplaceAlert.onProceedAnyway) {
                    crossMarketplaceAlert.onProceedAnyway();
                  } else {
                    setCrossMarketplaceAlert(null);
                  }
                }}
                className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer text-center"
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
