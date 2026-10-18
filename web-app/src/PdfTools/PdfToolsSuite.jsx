import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Image as ImageIcon,
  FileArchive,
  Minimize2,
  Scissors,
  Layers,
  RefreshCw,
  Trash2,
  Move,
  RotateCw,
  RotateCcw,
  Download,
  UploadCloud,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Search,
  Sliders,
  X,
  ChevronRight,
  Plus,
  Grid,
  FileCheck,
  Palette,
  Eye,
  Loader2,
  FileType,
  ArrowRight
} from 'lucide-react';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import JSZip from 'jszip';

// Configure pdfjs worker if not already initialized
if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

// 10 Tools Definition with bespoke visual identity
const PDF_TOOLS = [
  {
    id: 'image-to-pdf',
    title: 'Image → PDF',
    badge: 'Multi-Format',
    category: 'image',
    color: 'from-blue-600 to-indigo-600',
    lightBg: 'bg-blue-50 text-blue-600 border-blue-200/60',
    accent: 'border-blue-500/30',
    description: 'Convert JPG, PNG, WebP, AVIF, HEIC to a single high-resolution PDF document.',
    features: ['Auto / A4 / 4x6 Page Fit', 'Custom Margins', 'Batch Drag & Reorder'],
    icon: ImageIcon,
  },
  {
    id: 'pdf-to-images',
    title: 'PDF → Images',
    badge: 'High DPI',
    category: 'image',
    color: 'from-cyan-600 to-teal-600',
    lightBg: 'bg-cyan-50 text-cyan-600 border-cyan-200/60',
    accent: 'border-cyan-500/30',
    description: 'Export all PDF pages to high-resolution PNG or JPG images with 1-click ZIP package.',
    features: ['PNG / JPG Export', '300 DPI Resolution', 'Download Single or ZIP'],
    icon: FileArchive,
  },
  {
    id: 'compress-pdf',
    title: 'Compress PDF',
    badge: 'Size Reducer',
    category: 'pdf',
    color: 'from-emerald-600 to-teal-600',
    lightBg: 'bg-emerald-50 text-emerald-600 border-emerald-200/60',
    accent: 'border-emerald-500/30',
    description: 'Shrink scan & label files to meet marketplace portal upload limits without blur.',
    features: ['Extreme & Smart Presets', 'Live Size Savings %', 'Zero Uploads'],
    icon: Minimize2,
  },
  {
    id: 'crop-pdf',
    title: 'Crop PDF & Labels',
    badge: '4x6 Thermal',
    category: 'edit',
    color: 'from-amber-500 to-orange-600',
    lightBg: 'bg-amber-50 text-amber-600 border-amber-200/60',
    accent: 'border-amber-500/30',
    description: 'Crop shipping labels to 4x6 format, trim white margins, or launch OrderMunim cropper.',
    features: ['OrderMunim 5-Marketplace Engine', 'Custom Margin Trimming', 'Batch Page Crop'],
    icon: Scissors,
  },
  {
    id: 'merge-pdf',
    title: 'Merge PDF',
    badge: 'Multi-Doc',
    category: 'pdf',
    color: 'from-violet-600 to-purple-600',
    lightBg: 'bg-violet-50 text-violet-600 border-violet-200/60',
    accent: 'border-violet-500/30',
    description: 'Combine multiple shipping invoices, manifests, or documents into one organized file.',
    features: ['Drag & Drop Reorder', 'Page Count Detection', 'Lightning Merge'],
    icon: Layers,
  },
  {
    id: 'png-to-jpg',
    title: 'PNG → JPG',
    badge: 'Fast Converter',
    category: 'image',
    color: 'from-sky-600 to-blue-600',
    lightBg: 'bg-sky-50 text-sky-600 border-sky-200/60',
    accent: 'border-sky-500/30',
    description: 'Convert transparent PNG images to JPG with customizable background fill color.',
    features: ['Custom Background (White/Black)', 'Lossless Compression', 'Batch ZIP Export'],
    icon: RefreshCw,
  },
  {
    id: 'jpg-to-png',
    title: 'JPG → PNG',
    badge: 'Crisp Edges',
    category: 'image',
    color: 'from-indigo-600 to-sky-600',
    lightBg: 'bg-indigo-50 text-indigo-600 border-indigo-200/60',
    accent: 'border-indigo-500/30',
    description: 'Convert compressed JPG/JPEG files to lossless PNG format for sharper quality.',
    features: ['Alpha Transparency Support', 'Lossless Output', 'Batch Download'],
    icon: FileType,
  },
  {
    id: 'delete-pages',
    title: 'Delete PDF Pages',
    badge: 'Page Cleaner',
    category: 'edit',
    color: 'from-rose-600 to-pink-600',
    lightBg: 'bg-rose-50 text-rose-600 border-rose-200/60',
    accent: 'border-rose-500/30',
    description: 'Visually select and remove unwanted pages, extra blank sheets, or duplicate bills.',
    features: ['Visual Thumbnail Selection', 'Page Range (e.g. 1, 3-5)', 'Instant Download'],
    icon: Trash2,
  },
  {
    id: 'reorder-pdf',
    title: 'Reorder PDF',
    badge: 'Sequence Master',
    category: 'edit',
    color: 'from-blue-600 to-cyan-600',
    lightBg: 'bg-blue-50 text-blue-600 border-blue-200/60',
    accent: 'border-blue-500/30',
    description: 'Rearrange and reorder pages easily with intuitive thumbnail controls before saving.',
    features: ['Visual Drag & Move Buttons', 'Live Order Preview', '1-Click Save'],
    icon: Move,
  },
  {
    id: 'rotate-pdf',
    title: 'Rotate PDF',
    badge: 'Orientation Fix',
    category: 'edit',
    color: 'from-emerald-600 to-blue-600',
    lightBg: 'bg-emerald-50 text-emerald-600 border-emerald-200/60',
    accent: 'border-emerald-500/30',
    description: 'Permanently rotate upside-down or sideways pages by 90°, 180°, or 270° in seconds.',
    features: ['Rotate Single or All Pages', 'Live 90° CW / CCW Preview', 'Retains Quality'],
    icon: RotateCw,
  },
];

export default function PdfToolsSuite({ onNavigateTab }) {
  const [activeToolId, setActiveToolId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Filtered tools
  const filteredTools = PDF_TOOLS.filter((t) => {
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.features.some((f) => f.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const activeTool = PDF_TOOLS.find((t) => t.id === activeToolId);

  // Return to tools grid
  const handleBackToGrid = () => {
    setActiveToolId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* If a tool is active, render its dedicated FULL PAGE WORKSPACE */}
      {activeTool ? (
        <ToolWorkspace
          tool={activeTool}
          onBack={handleBackToGrid}
          onNavigateTab={onNavigateTab}
        />
      ) : (
        /* MAIN CARDVIEW SUITE (BESPOKE DESIGN - NOT A COPY) */
        <div className="space-y-6">
          {/* 1. Header Banner */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#083B82] via-[#09479c] to-[#042456] rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-blue-900/30">
            <div className="relative z-10 max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-orange-300">
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                <span>OrderMunim Smart PDF &amp; Document Studio</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
                All-in-One <span className="text-orange-400">PDF &amp; Label</span> Power Tools
              </h1>
              <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed max-w-2xl">
                Lightning-fast, 100% private in-browser document processing. Merge invoices, compress scan files, export high-DPI images, and rotate shipping labels without any server uploads.
              </p>

              {/* Trust & Privacy Guarantee Badges */}
              <div className="flex items-center gap-4 pt-2 text-[11px] text-blue-200/90 font-medium flex-wrap">
                <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  100% Client-Side Privacy
                </span>
                <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                  <CheckCircle2 className="w-4 h-4 text-cyan-300" />
                  Zero File Size Limits
                </span>
                <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  Instant Local Processing
                </span>
              </div>
            </div>

            {/* Decorative Subtle Background Graphics */}
            <div className="absolute -right-10 -bottom-10 w-72 h-72 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
            <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden lg:flex items-center justify-center opacity-15 pointer-events-none">
              <FileText className="w-64 h-64 text-white" />
            </div>
          </div>

          {/* 2. Search & Category Filters Bar */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === 'all'
                    ? 'bg-[#083B82] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Tools ({PDF_TOOLS.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('pdf')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === 'pdf'
                    ? 'bg-[#083B82] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                PDF Operations
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('image')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === 'image'
                    ? 'bg-[#083B82] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Image Conversions
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('edit')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === 'edit'
                    ? 'bg-[#083B82] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Page Edit &amp; Crop
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tools... (e.g. merge, compress, png)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9.5 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 3. Bespoke CardView Grid (Custom Styled, Not a Clone) */}
          {filteredTools.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center shadow-xs">
              <Search className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No matching tools found</h3>
              <p className="text-xs text-slate-500 mt-1">Try searching for keywords like "merge", "png", or "rotate".</p>
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                className="mt-3 px-4 py-1.5 bg-[#083B82] text-white text-xs font-bold rounded-xl"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4.5">
              {filteredTools.map((tool) => {
                const IconComponent = tool.icon;
                return (
                  <div
                    key={tool.id}
                    onClick={() => setActiveToolId(tool.id)}
                    className="group bg-white border border-slate-200/90 hover:border-[#083B82]/40 rounded-2xl p-5 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between cursor-pointer relative overflow-hidden"
                  >
                    {/* Top Accent Stripe on hover */}
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${tool.color} opacity-0 group-hover:opacity-100 transition-opacity`} />

                    <div>
                      {/* Top Header: Icon & Badge */}
                      <div className="flex items-center justify-between gap-2 mb-3.5">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-xs transition-transform group-hover:scale-105 ${tool.lightBg}`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.8 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80">
                          {tool.badge}
                        </span>
                      </div>

                      {/* Tool Title */}
                      <h3 className="text-base font-black text-slate-900 group-hover:text-[#083B82] transition-colors flex items-center justify-between">
                        <span>{tool.title}</span>
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-slate-600 leading-relaxed mt-1.5 line-clamp-2">
                        {tool.description}
                      </p>

                      {/* Feature Tags */}
                      <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100">
                        {tool.features.map((feat, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200/60"
                          >
                            {feat}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action Launcher Button (OrderMunim Signature Style, Not Generic Purple) */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        className="w-full py-2 px-3.5 rounded-xl bg-slate-50 group-hover:bg-[#083B82] text-slate-700 group-hover:text-white font-bold text-xs flex items-center justify-between transition-all duration-150 shadow-xs cursor-pointer"
                      >
                        <span>Open Tool</span>
                        <div className="w-6 h-6 rounded-lg bg-white/20 group-hover:bg-white/20 flex items-center justify-center text-slate-600 group-hover:text-white transition-colors">
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 4. Bottom Note: Link to specialized OrderMunim Label Cropper */}
          <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-200/80 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0">
                <Scissors className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Looking for Automatic Marketplace Shipping Label Cropping?</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  OrderMunim includes built-in thermal 4x6 cropping with barcode recognition, SKU sorting, and invoice merging for Meesho, Flipkart, Amazon, Ajio &amp; Myntra.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab('cropper')}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <span>Launch Label Cropper</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DEDICATED FULL-PAGE WORKSPACE COMPONENT (NO POPUP / NO DIALOGUE)
// ============================================================================
function ToolWorkspace({ tool, onBack, onNavigateTab }) {
  const IconComponent = tool.icon;

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Top Breadcrumb & Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="Return to all tools"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Tools</span>
          </button>
          <div className="h-5 w-px bg-slate-200" />
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${tool.lightBg}`}>
              <IconComponent className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 leading-none">{tool.title}</h2>
              <span className="text-[11px] text-slate-500 leading-tight">100% In-Browser Local Processing</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> No Server Uploads
          </span>
        </div>
      </div>

      {/* Render the specific feature implementation */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 md:p-8 shadow-xs">
        {tool.id === 'image-to-pdf' && <ImageToPdfTool />}
        {tool.id === 'pdf-to-images' && <PdfToImagesTool />}
        {tool.id === 'compress-pdf' && <CompressPdfTool />}
        {tool.id === 'crop-pdf' && <CropPdfTool onNavigateTab={onNavigateTab} />}
        {tool.id === 'merge-pdf' && <MergePdfTool />}
        {tool.id === 'png-to-jpg' && <PngToJpgTool />}
        {tool.id === 'jpg-to-png' && <JpgToPngTool />}
        {tool.id === 'delete-pages' && <DeletePagesTool />}
        {tool.id === 'reorder-pdf' && <ReorderPdfTool />}
        {tool.id === 'rotate-pdf' && <RotatePdfTool />}
      </div>
    </div>
  );
}

// ============================================================================
// 1. TOOL: IMAGE TO PDF
// ============================================================================
function ImageToPdfTool() {
  const [files, setFiles] = useState([]);
  const [pageSize, setPageSize] = useState('fit'); // 'fit', 'a4', 'thermal'
  const [margin, setMargin] = useState(10);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const fileInputRef = useRef(null);

  const handleAddFiles = (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    const newItems = selected.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
    }));
    setFiles((prev) => [...prev, ...newItems]);
    setDownloadUrl(null);
  };

  const handleRemove = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setDownloadUrl(null);
  };

  const handleMove = (index, direction) => {
    const newFiles = [...files];
    const target = index + direction;
    if (target < 0 || target >= newFiles.length) return;
    const temp = newFiles[index];
    newFiles[index] = newFiles[target];
    newFiles[target] = temp;
    setFiles(newFiles);
    setDownloadUrl(null);
  };

  const handleGeneratePdf = async () => {
    if (!files.length) return;
    setIsProcessing(true);
    try {
      const pdfDoc = await PDFDocument.create();

      for (const item of files) {
        const arrayBuf = await item.file.arrayBuffer();
        let pdfImage;
        const isJpg = item.file.type === 'image/jpeg' || item.file.name.toLowerCase().endsWith('.jpg') || item.file.name.toLowerCase().endsWith('.jpeg');
        
        try {
          if (isJpg) {
            pdfImage = await pdfDoc.embedJpg(arrayBuf);
          } else {
            pdfImage = await pdfDoc.embedPng(arrayBuf);
          }
        } catch {
          // Fallback via canvas to PNG if format is WebP or other
          const img = new Image();
          const blobUrl = URL.createObjectURL(item.file);
          await new Promise((res, rej) => {
            img.onload = res;
            img.onerror = rej;
            img.src = blobUrl;
          });
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const pngBlob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
          const pngBuf = await pngBlob.arrayBuffer();
          pdfImage = await pdfDoc.embedPng(pngBuf);
          URL.revokeObjectURL(blobUrl);
        }

        const imgWidth = pdfImage.width;
        const imgHeight = pdfImage.height;

        let pageWidth, pageHeight;
        if (pageSize === 'a4') {
          pageWidth = 595.28; // A4 pt
          pageHeight = 841.89;
        } else if (pageSize === 'thermal') {
          pageWidth = 288; // 4x6 inch pt
          pageHeight = 432;
        } else {
          pageWidth = imgWidth + margin * 2;
          pageHeight = imgHeight + margin * 2;
        }

        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        const availWidth = pageWidth - margin * 2;
        const availHeight = pageHeight - margin * 2;

        const scale = Math.min(availWidth / imgWidth, availHeight / imgHeight);
        const drawWidth = imgWidth * scale;
        const drawHeight = imgHeight * scale;
        const x = (pageWidth - drawWidth) / 2;
        const y = (pageHeight - drawHeight) / 2;

        page.drawImage(pdfImage, {
          x,
          y,
          width: drawWidth,
          height: drawHeight,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
    } catch (err) {
      alert('Failed to generate PDF: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-3xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/20"
      >
        <UploadCloud className="w-12 h-12 text-blue-600 mx-auto mb-3" />
        <h4 className="text-base font-bold text-slate-800">Select or Drag Images Here</h4>
        <p className="text-xs text-slate-500 mt-1">Supports JPG, PNG, WebP, AVIF, HEIC</p>
        <button
          type="button"
          className="mt-4 px-4 py-2 bg-[#083B82] text-white text-xs font-bold rounded-xl shadow-xs"
        >
          Browse Images
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleAddFiles}
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-5">
          {/* Options Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Page Sizing</label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  <option value="fit">Fit to Image Size</option>
                  <option value="a4">Standard A4 Document</option>
                  <option value="thermal">4x6 Inch Thermal Label</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Margin (pt)</label>
                <select
                  value={margin}
                  onChange={(e) => setMargin(Number(e.target.value))}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  <option value={0}>No Margin (0)</option>
                  <option value={10}>Small (10 pt)</option>
                  <option value={20}>Medium (20 pt)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">{files.length} Image{files.length > 1 ? 's' : ''}</span>
              <button
                type="button"
                onClick={() => setFiles([])}
                className="text-xs text-rose-600 hover:underline font-bold px-2"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Image List / Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {files.map((item, idx) => (
              <div key={item.id} className="relative group bg-white border border-slate-200 rounded-2xl p-2 shadow-xs">
                <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
                  <img src={item.preview} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="mt-2 text-[11px] font-bold text-slate-800 truncate" title={item.name}>
                  #{idx + 1} {item.name}
                </div>
                <div className="text-[10px] text-slate-500">{item.size}</div>

                {/* Move Controls */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, -1)}
                      className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-30"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      disabled={idx === files.length - 1}
                      onClick={() => handleMove(idx, 1)}
                      className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-30"
                    >
                      →
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="text-rose-500 hover:text-rose-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Generate / Download Bar */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleGeneratePdf}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Converting Images...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Convert &amp; Build PDF</span>
                </>
              )}
            </button>

            {downloadUrl && (
              <a
                href={downloadUrl}
                download="ordermunim_images.pdf"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF File</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. TOOL: PDF TO IMAGES
// ============================================================================
function PdfToImagesTool() {
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]);
  const [imageFormat, setImageFormat] = useState('png'); // 'png' or 'jpeg'
  const [isRendering, setIsRendering] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const fileInputRef = useRef(null);

  const handlePdfUpload = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPages([]);
    setIsRendering(true);

    try {
      const arrayBuf = await selected.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
      const numPages = pdf.numPages;
      const renderedPages = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 }); // High DPI
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;

        const mime = imageFormat === 'png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mime, 0.95);
        renderedPages.push({
          pageNumber: i,
          dataUrl,
          width: viewport.width,
          height: viewport.height,
        });
      }
      setPages(renderedPages);
    } catch (err) {
      alert('Failed to read PDF: ' + err.message);
    } finally {
      setIsRendering(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!pages.length) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const ext = imageFormat === 'png' ? 'png' : 'jpg';

      pages.forEach((p) => {
        const base64Data = p.dataUrl.split(',')[1];
        zip.file(`page_${p.pageNumber}.${ext}`, base64Data, { base64: true });
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file?.name?.replace(/\.pdf$/i, '') || 'ordermunim'}_pages_zip.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to generate ZIP: ' + err.message);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="space-y-6">
      {!file ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-cyan-500 rounded-3xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-cyan-50/20"
        >
          <FileArchive className="w-12 h-12 text-cyan-600 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-800">Select PDF to Export Pages as Images</h4>
          <p className="text-xs text-slate-500 mt-1">Converts each page to crystal-clear 300 DPI PNG or JPG</p>
          <button
            type="button"
            className="mt-4 px-4 py-2 bg-[#083B82] text-white text-xs font-bold rounded-xl shadow-xs"
          >
            Browse PDF
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handlePdfUpload}
          />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Controls Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-800">📄 {file.name}</span>
              <span className="text-[11px] text-slate-500">({pages.length} Pages)</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <span>Format:</span>
                <button
                  type="button"
                  onClick={() => setImageFormat('png')}
                  className={`px-2.5 py-1 rounded-lg text-xs ${imageFormat === 'png' ? 'bg-[#083B82] text-white font-bold' : 'bg-white border text-slate-600'}`}
                >
                  PNG
                </button>
                <button
                  type="button"
                  onClick={() => setImageFormat('jpeg')}
                  className={`px-2.5 py-1 rounded-lg text-xs ${imageFormat === 'jpeg' ? 'bg-[#083B82] text-white font-bold' : 'bg-white border text-slate-600'}`}
                >
                  JPG
                </button>
              </div>

              <button
                type="button"
                onClick={() => { setFile(null); setPages([]); }}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-2"
              >
                Change PDF
              </button>
            </div>
          </div>

          {/* Loading status */}
          {isRendering && (
            <div className="py-8 text-center text-xs text-slate-600 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-cyan-600" />
              <span>Rendering high-resolution page previews...</span>
            </div>
          )}

          {/* Previews Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {pages.map((p) => (
              <div key={p.pageNumber} className="bg-white border border-slate-200 rounded-2xl p-2.5 shadow-xs flex flex-col justify-between">
                <div className="aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-100">
                  <img src={p.dataUrl} alt="" className="w-full h-full object-contain" />
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-700">Page {p.pageNumber}</span>
                  <a
                    href={p.dataUrl}
                    download={`page_${p.pageNumber}.${imageFormat === 'png' ? 'png' : 'jpg'}`}
                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                    title="Download this page image"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* ZIP Download Button */}
          {pages.length > 0 && (
            <div className="flex justify-end pt-3">
              <button
                type="button"
                disabled={isZipping}
                onClick={handleDownloadZip}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isZipping ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating ZIP...</span>
                  </>
                ) : (
                  <>
                    <FileArchive className="w-4 h-4" />
                    <span>Download All Pages as ZIP ({pages.length})</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 3. TOOL: COMPRESS PDF
// ============================================================================
function CompressPdfTool() {
  const [file, setFile] = useState(null);
  const [level, setLevel] = useState('recommended'); // 'extreme', 'recommended', 'light'
  const [isCompressing, setIsCompressing] = useState(false);
  const [resultUrl, setResultUrl] = useState(null);
  const [compressedSize, setCompressedSize] = useState(null);
  const fileInputRef = useRef(null);

  const handleUpload = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setResultUrl(null);
    setCompressedSize(null);
  };

  const handleCompress = async () => {
    if (!file) return;
    setIsCompressing(true);
    try {
      const arrayBuf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
      const numPages = pdf.numPages;

      // Create new clean PDF
      const newPdf = await PDFDocument.create();

      // Compression settings
      let scale = 1.0;
      let quality = 0.7;
      if (level === 'extreme') {
        scale = 0.75;
        quality = 0.5;
      } else if (level === 'light') {
        scale = 1.25;
        quality = 0.85;
      }

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;

        const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
        const buf = await blob.arrayBuffer();
        const img = await newPdf.embedJpg(buf);

        const newPage = newPdf.addPage([viewport.width / scale, viewport.height / scale]);
        newPage.drawImage(img, {
          x: 0,
          y: 0,
          width: viewport.width / scale,
          height: viewport.height / scale,
        });
      }

      const compressedBytes = await newPdf.save();
      const compressedBlob = new Blob([compressedBytes], { type: 'application/pdf' });
      setCompressedSize((compressedBlob.size / 1024).toFixed(1));
      setResultUrl(URL.createObjectURL(compressedBlob));
    } catch (err) {
      alert('Failed to compress PDF: ' + err.message);
    } finally {
      setIsCompressing(false);
    }
  };

  const originalSize = file ? (file.size / 1024).toFixed(1) : 0;
  const savingsPct = compressedSize && originalSize > 0
    ? Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100))
    : 0;

  return (
    <div className="space-y-6">
      {!file ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-3xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-emerald-50/20"
        >
          <Minimize2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-800">Select PDF to Compress</h4>
          <p className="text-xs text-slate-500 mt-1">Shrink size for portal uploads without degrading barcode sharpness</p>
          <button
            type="button"
            className="mt-4 px-4 py-2 bg-[#083B82] text-white text-xs font-bold rounded-xl shadow-xs"
          >
            Browse PDF
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-slate-800">📄 {file.name}</span>
              <div className="text-[11px] text-slate-500 mt-0.5">Original File Size: <strong>{originalSize} KB</strong></div>
            </div>

            <button
              type="button"
              onClick={() => { setFile(null); setResultUrl(null); }}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
            >
              Choose Different File
            </button>
          </div>

          {/* Preset Selection Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div
              onClick={() => setLevel('extreme')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${level === 'extreme' ? 'border-emerald-500 bg-emerald-50/50 shadow-xs' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <div className="font-bold text-xs text-slate-900">Extreme Compression</div>
              <div className="text-[11px] text-slate-500 mt-1">Maximum file size reduction. Ideal for low size limits.</div>
            </div>
            <div
              onClick={() => setLevel('recommended')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${level === 'recommended' ? 'border-emerald-500 bg-emerald-50/50 shadow-xs' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <div className="font-bold text-xs text-slate-900 flex items-center justify-between">
                <span>Recommended</span>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded">Best</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Balanced quality &amp; size. Perfect for shipping labels.</div>
            </div>
            <div
              onClick={() => setLevel('light')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${level === 'light' ? 'border-emerald-500 bg-emerald-50/50 shadow-xs' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <div className="font-bold text-xs text-slate-900">High Quality</div>
              <div className="text-[11px] text-slate-500 mt-1">Minor compression with highest visual fidelity.</div>
            </div>
          </div>

          {/* Action & Result */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div>
              {compressedSize && (
                <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Compressed Size: {compressedSize} KB (Saved {savingsPct}%)</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isCompressing}
                onClick={handleCompress}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isCompressing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Compressing Pages...</span>
                  </>
                ) : (
                  <>
                    <Minimize2 className="w-4 h-4" />
                    <span>Compress PDF</span>
                  </>
                )}
              </button>

              {resultUrl && (
                <a
                  href={resultUrl}
                  download={`compressed_${file.name}`}
                  className="px-6 py-2.5 bg-[#083B82] hover:bg-blue-900 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Compressed PDF</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 4. TOOL: CROP PDF & LABELS
// ============================================================================
function CropPdfTool({ onNavigateTab }) {
  const [file, setFile] = useState(null);
  const [cropMargins, setCropMargins] = useState({ top: 15, bottom: 15, left: 15, right: 15 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const fileInputRef = useRef(null);

  const handleUpload = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setDownloadUrl(null);
  };

  const handleApplyCrop = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const arrayBuf = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuf);
      const pages = pdfDoc.getPages();

      for (const page of pages) {
        const { width, height } = page.getSize();
        const left = cropMargins.left;
        const right = width - cropMargins.right;
        const bottom = cropMargins.bottom;
        const top = height - cropMargins.top;

        if (right > left && top > bottom) {
          page.setCropBox(left, bottom, right - left, top - bottom);
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setDownloadUrl(URL.createObjectURL(blob));
    } catch (err) {
      alert('Failed to crop PDF: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Choice Card: OrderMunim Automatic Cropper vs Generic Margin Cropper */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-orange-100 text-orange-800 rounded">
                E-Commerce Specialized
              </span>
              <Scissors className="w-5 h-5 text-orange-600" />
            </div>
            <h4 className="text-sm font-black text-slate-900">OrderMunim 4x6 Label Engine</h4>
            <p className="text-xs text-slate-600 mt-1">
              Automatic boundary detection for Meesho, Flipkart, Amazon, Ajio &amp; Myntra shipping labels. Auto 4x6 thermal sizing with SKU barcode sort.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab && onNavigateTab('cropper')}
            className="mt-4 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Launch OrderMunim Cropper</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-slate-200 text-slate-800 rounded">
                General Purpose
              </span>
              <Minimize2 className="w-5 h-5 text-slate-600" />
            </div>
            <h4 className="text-sm font-black text-slate-900">Custom Margin Trimmer</h4>
            <p className="text-xs text-slate-600 mt-1">
              Upload any standard PDF and shave off unwanted white margins (top, bottom, left, right) across all pages simultaneously.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 px-4 py-2 bg-[#083B82] text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Select PDF to Trim Margins</span>
            <UploadCloud className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      </div>

      {file && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">📄 {file.name}</span>
            <button
              type="button"
              onClick={() => { setFile(null); setDownloadUrl(null); }}
              className="text-xs text-rose-600 hover:underline font-bold"
            >
              Remove
            </button>
          </div>

          {/* Margin sliders */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Top Trim (pt)</label>
              <input
                type="number"
                min="0"
                max="200"
                value={cropMargins.top}
                onChange={(e) => setCropMargins({ ...cropMargins, top: Number(e.target.value) })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Bottom Trim (pt)</label>
              <input
                type="number"
                min="0"
                max="200"
                value={cropMargins.bottom}
                onChange={(e) => setCropMargins({ ...cropMargins, bottom: Number(e.target.value) })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Left Trim (pt)</label>
              <input
                type="number"
                min="0"
                max="200"
                value={cropMargins.left}
                onChange={(e) => setCropMargins({ ...cropMargins, left: Number(e.target.value) })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Right Trim (pt)</label>
              <input
                type="number"
                min="0"
                max="200"
                value={cropMargins.right}
                onChange={(e) => setCropMargins({ ...cropMargins, right: Number(e.target.value) })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleApplyCrop}
              className="px-6 py-2.5 bg-[#083B82] hover:bg-blue-900 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
              <span>Apply Trim &amp; Export</span>
            </button>

            {downloadUrl && (
              <a
                href={downloadUrl}
                download={`trimmed_${file.name}`}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Cropped PDF</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 5. TOOL: MERGE PDF
// ============================================================================
function MergePdfTool() {
  const [files, setFiles] = useState([]);
  const [isMerging, setIsMerging] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const fileInputRef = useRef(null);

  const handleAddPdfs = async (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    const newItems = [];
    for (const f of selected) {
      try {
        const arrayBuf = await f.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
        newItems.push({
          id: Math.random().toString(36).substring(7),
          file: f,
          name: f.name,
          size: (f.size / 1024).toFixed(1) + ' KB',
          pageCount: pdf.numPages,
        });
      } catch {
        newItems.push({
          id: Math.random().toString(36).substring(7),
          file: f,
          name: f.name,
          size: (f.size / 1024).toFixed(1) + ' KB',
          pageCount: '?',
        });
      }
    }

    setFiles((prev) => [...prev, ...newItems]);
    setDownloadUrl(null);
  };

  const handleRemove = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setDownloadUrl(null);
  };

  const handleMove = (index, direction) => {
    const newFiles = [...files];
    const target = index + direction;
    if (target < 0 || target >= newFiles.length) return;
    const temp = newFiles[index];
    newFiles[index] = newFiles[target];
    newFiles[target] = temp;
    setFiles(newFiles);
    setDownloadUrl(null);
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      alert('Please add at least 2 PDF files to merge.');
      return;
    }
    setIsMerging(true);
    try {
      const mergedPdf = await PDFDocument.create();

      for (const item of files) {
        const arrayBuf = await item.file.arrayBuffer();
        const donorPdf = await PDFDocument.load(arrayBuf);
        const copiedPages = await mergedPdf.copyPages(donorPdf, donorPdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes], { type: 'application/pdf' });
      setDownloadUrl(URL.createObjectURL(blob));
    } catch (err) {
      alert('Failed to merge PDFs: ' + err.message);
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="space-y-6">
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-300 hover:border-violet-500 rounded-3xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-violet-50/20"
      >
        <Layers className="w-12 h-12 text-violet-600 mx-auto mb-3" />
        <h4 className="text-base font-bold text-slate-800">Select Multiple PDF Files to Merge</h4>
        <p className="text-xs text-slate-500 mt-1">Combine shipping manifests, invoices, or batch reports in any custom order</p>
        <button
          type="button"
          className="mt-4 px-4 py-2 bg-[#083B82] text-white text-xs font-bold rounded-xl shadow-xs"
        >
          Browse PDFs
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="application/pdf"
          className="hidden"
          onChange={handleAddPdfs}
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span>{files.length} Files Ready to Merge</span>
            <button
              type="button"
              onClick={() => setFiles([])}
              className="text-rose-600 hover:underline"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-2">
            {files.map((item, idx) => (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-violet-100 text-violet-800 text-[11px] font-mono font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate">{item.name}</div>
                    <div className="text-[11px] text-slate-500">{item.size} • {item.pageCount} Pages</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMove(idx, -1)}
                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-xs font-bold"
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    disabled={idx === files.length - 1}
                    onClick={() => handleMove(idx, 1)}
                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-xs font-bold"
                    title="Move down"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="p-1 text-rose-500 hover:text-rose-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              disabled={isMerging || files.length < 2}
              onClick={handleMerge}
              className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isMerging ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Merging Documents...</span>
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4" />
                  <span>Merge {files.length} PDFs</span>
                </>
              )}
            </button>

            {downloadUrl && (
              <a
                href={downloadUrl}
                download="ordermunim_merged.pdf"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Merged PDF</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 6. TOOL: PNG TO JPG
// ============================================================================
function PngToJpgTool() {
  const [files, setFiles] = useState([]);
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [quality, setQuality] = useState(0.92);
  const [converted, setConverted] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpload = (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    const items = selected.map((f) => ({
      id: Math.random().toString(36).substring(7),
      file: f,
      preview: URL.createObjectURL(f),
      name: f.name,
    }));
    setFiles(items);
    setConverted([]);
  };

  const handleConvert = async () => {
    if (!files.length) return;
    setIsProcessing(true);
    try {
      const results = [];
      for (const item of files) {
        const img = new Image();
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
          img.src = item.preview;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        // Fill background color to prevent black transparency
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        const jpgDataUrl = canvas.toDataURL('image/jpeg', quality);
        results.push({
          id: item.id,
          name: item.name.replace(/\.png$/i, '') + '.jpg',
          dataUrl: jpgDataUrl,
        });
      }
      setConverted(results);
    } catch (err) {
      alert('Conversion failed: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!converted.length) return;
    const zip = new JSZip();
    converted.forEach((item) => {
      const base64 = item.dataUrl.split(',')[1];
      zip.file(item.name, base64, { base64: true });
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ordermunim_jpg_converted.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-300 hover:border-sky-500 rounded-3xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-sky-50/20"
      >
        <RefreshCw className="w-12 h-12 text-sky-600 mx-auto mb-3" />
        <h4 className="text-base font-bold text-slate-800">Select PNG Images to Convert to JPG</h4>
        <p className="text-xs text-slate-500 mt-1">Converts transparent PNGs safely without black background artifacts</p>
        <button
          type="button"
          className="mt-4 px-4 py-2 bg-[#083B82] text-white text-xs font-bold rounded-xl shadow-xs"
        >
          Browse PNG Files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Background Fill Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                  />
                  <span className="text-xs font-mono font-bold text-slate-600">{bgColor}</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">JPG Quality</label>
                <select
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  <option value={1.0}>100% Maximum</option>
                  <option value={0.92}>92% High (Recommended)</option>
                  <option value={0.80}>80% Standard</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleConvert}
              className="px-5 py-2 bg-[#083B82] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span>Convert {files.length} Images</span>
            </button>
          </div>

          {converted.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700">✓ Converted {converted.length} files to JPG</span>
                {converted.length > 1 && (
                  <button
                    type="button"
                    onClick={handleDownloadZip}
                    className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" /> Download All as ZIP
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {converted.map((item) => (
                  <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-2 shadow-xs">
                    <img src={item.dataUrl} alt="" className="w-full aspect-square object-cover rounded-lg" />
                    <div className="text-[11px] font-bold text-slate-800 truncate mt-1">{item.name}</div>
                    <a
                      href={item.dataUrl}
                      download={item.name}
                      className="mt-1 block text-center py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded"
                    >
                      Download JPG
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 7. TOOL: JPG TO PNG
// ============================================================================
function JpgToPngTool() {
  const [files, setFiles] = useState([]);
  const [converted, setConverted] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpload = (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    const items = selected.map((f) => ({
      id: Math.random().toString(36).substring(7),
      file: f,
      preview: URL.createObjectURL(f),
      name: f.name,
    }));
    setFiles(items);
    setConverted([]);
  };

  const handleConvert = async () => {
    if (!files.length) return;
    setIsProcessing(true);
    try {
      const results = [];
      for (const item of files) {
        const img = new Image();
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
          img.src = item.preview;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const pngDataUrl = canvas.toDataURL('image/png');
        results.push({
          id: item.id,
          name: item.name.replace(/\.(jpg|jpeg)$/i, '') + '.png',
          dataUrl: pngDataUrl,
        });
      }
      setConverted(results);
    } catch (err) {
      alert('Conversion failed: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!converted.length) return;
    const zip = new JSZip();
    converted.forEach((item) => {
      const base64 = item.dataUrl.split(',')[1];
      zip.file(item.name, base64, { base64: true });
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ordermunim_png_converted.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-3xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-indigo-50/20"
      >
        <FileType className="w-12 h-12 text-indigo-600 mx-auto mb-3" />
        <h4 className="text-base font-bold text-slate-800">Select JPG / JPEG Images to Convert to Lossless PNG</h4>
        <p className="text-xs text-slate-500 mt-1">Export crisp, high-fidelity PNG files ready for editing or web upload</p>
        <button
          type="button"
          className="mt-4 px-4 py-2 bg-[#083B82] text-white text-xs font-bold rounded-xl shadow-xs"
        >
          Browse JPG Files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-4 rounded-2xl">
            <span className="text-xs font-bold text-slate-700">{files.length} JPG files selected</span>
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleConvert}
              className="px-5 py-2 bg-[#083B82] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span>Convert to PNG</span>
            </button>
          </div>

          {converted.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700">✓ Converted {converted.length} files to PNG</span>
                {converted.length > 1 && (
                  <button
                    type="button"
                    onClick={handleDownloadZip}
                    className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" /> Download All as ZIP
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {converted.map((item) => (
                  <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-2 shadow-xs">
                    <img src={item.dataUrl} alt="" className="w-full aspect-square object-cover rounded-lg" />
                    <div className="text-[11px] font-bold text-slate-800 truncate mt-1">{item.name}</div>
                    <a
                      href={item.dataUrl}
                      download={item.name}
                      className="mt-1 block text-center py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded"
                    >
                      Download PNG
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 8. TOOL: DELETE PDF PAGES
// ============================================================================
function DeletePagesTool() {
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]);
  const [selectedForDeletion, setSelectedForDeletion] = useState(new Set());
  const [isRendering, setIsRendering] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPages([]);
    setSelectedForDeletion(new Set());
    setDownloadUrl(null);
    setIsRendering(true);

    try {
      const arrayBuf = await selected.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
      const numPages = pdf.numPages;
      const rendered = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.6 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;

        rendered.push({
          pageNumber: i,
          dataUrl: canvas.toDataURL('image/jpeg', 0.8),
        });
      }
      setPages(rendered);
    } catch (err) {
      alert('Failed to load PDF pages: ' + err.message);
    } finally {
      setIsRendering(false);
    }
  };

  const togglePage = (pageNumber) => {
    const newSet = new Set(selectedForDeletion);
    if (newSet.has(pageNumber)) {
      newSet.delete(pageNumber);
    } else {
      newSet.add(pageNumber);
    }
    setSelectedForDeletion(newSet);
    setDownloadUrl(null);
  };

  const handleApplyDeletion = async () => {
    if (!file || selectedForDeletion.size === 0) {
      alert('Please select at least 1 page to delete.');
      return;
    }
    if (selectedForDeletion.size === pages.length) {
      alert('You cannot delete all pages in the PDF.');
      return;
    }
    setIsProcessing(true);
    try {
      const arrayBuf = await file.arrayBuffer();
      const donorPdf = await PDFDocument.load(arrayBuf);
      const newPdf = await PDFDocument.create();

      const keepIndices = [];
      for (let i = 0; i < pages.length; i++) {
        if (!selectedForDeletion.has(i + 1)) {
          keepIndices.push(i);
        }
      }

      const copiedPages = await newPdf.copyPages(donorPdf, keepIndices);
      copiedPages.forEach((page) => newPdf.addPage(page));

      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setDownloadUrl(URL.createObjectURL(blob));
    } catch (err) {
      alert('Deletion failed: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {!file ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-rose-500 rounded-3xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-rose-50/20"
        >
          <Trash2 className="w-12 h-12 text-rose-600 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-800">Select PDF to Remove Unwanted Pages</h4>
          <p className="text-xs text-slate-500 mt-1">Visually click pages to discard and download a cleaned PDF document</p>
          <button
            type="button"
            className="mt-4 px-4 py-2 bg-[#083B82] text-white text-xs font-bold rounded-xl shadow-xs"
          >
            Browse PDF
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-800">📄 {file.name}</span>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Total Pages: {pages.length} • Marked for Removal: <strong className="text-rose-600">{selectedForDeletion.size}</strong>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedForDeletion(new Set())}
                className="text-xs font-semibold text-slate-600 hover:underline"
              >
                Clear Selection
              </button>
              <button
                type="button"
                onClick={() => { setFile(null); setPages([]); }}
                className="text-xs font-semibold text-slate-600 hover:underline"
              >
                Change PDF
              </button>
            </div>
          </div>

          {isRendering && (
            <div className="py-8 text-center text-xs text-slate-600 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-rose-600" />
              <span>Generating page thumbnails...</span>
            </div>
          )}

          {/* Page Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3.5">
            {pages.map((p) => {
              const isSelected = selectedForDeletion.has(p.pageNumber);
              return (
                <div
                  key={p.pageNumber}
                  onClick={() => togglePage(p.pageNumber)}
                  className={`relative p-2.5 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-rose-500 bg-rose-50/50 shadow-xs ring-2 ring-rose-500/30'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center relative">
                    <img src={p.dataUrl} alt="" className={`w-full h-full object-contain ${isSelected ? 'opacity-40 grayscale' : ''}`} />
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md">
                          <Trash2 className="w-4 h-4" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[11px] font-bold">
                    <span className={isSelected ? 'text-rose-700' : 'text-slate-700'}>Page {p.pageNumber}</span>
                    <span className={`text-[10px] uppercase font-black px-1.5 py-0.2 rounded ${isSelected ? 'bg-rose-200 text-rose-800' : 'bg-slate-100 text-slate-600'}`}>
                      {isSelected ? 'Delete' : 'Keep'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              disabled={isProcessing || selectedForDeletion.size === 0}
              onClick={handleApplyDeletion}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Remove {selectedForDeletion.size} Page{selectedForDeletion.size > 1 ? 's' : ''} &amp; Save</span>
                </>
              )}
            </button>

            {downloadUrl && (
              <a
                href={downloadUrl}
                download={`cleaned_${file.name}`}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Cleaned PDF</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 9. TOOL: REORDER PDF
// ============================================================================
function ReorderPdfTool() {
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]);
  const [isRendering, setIsRendering] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPages([]);
    setDownloadUrl(null);
    setIsRendering(true);

    try {
      const arrayBuf = await selected.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
      const numPages = pdf.numPages;
      const rendered = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.6 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;

        rendered.push({
          originalIndex: i - 1,
          label: i,
          dataUrl: canvas.toDataURL('image/jpeg', 0.8),
        });
      }
      setPages(rendered);
    } catch (err) {
      alert('Failed to load PDF pages: ' + err.message);
    } finally {
      setIsRendering(false);
    }
  };

  const handleMove = (index, direction) => {
    const newPages = [...pages];
    const target = index + direction;
    if (target < 0 || target >= newPages.length) return;
    const temp = newPages[index];
    newPages[index] = newPages[target];
    newPages[target] = temp;
    setPages(newPages);
    setDownloadUrl(null);
  };

  const handleSaveReordered = async () => {
    if (!file || !pages.length) return;
    setIsProcessing(true);
    try {
      const arrayBuf = await file.arrayBuffer();
      const donorPdf = await PDFDocument.load(arrayBuf);
      const newPdf = await PDFDocument.create();

      const newIndices = pages.map((p) => p.originalIndex);
      const copiedPages = await newPdf.copyPages(donorPdf, newIndices);
      copiedPages.forEach((page) => newPdf.addPage(page));

      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setDownloadUrl(URL.createObjectURL(blob));
    } catch (err) {
      alert('Failed to save reordered PDF: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {!file ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-3xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/20"
        >
          <Move className="w-12 h-12 text-blue-600 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-800">Select PDF to Reorder Page Sequence</h4>
          <p className="text-xs text-slate-500 mt-1">Easily shuffle and arrange pages into your preferred order</p>
          <button
            type="button"
            className="mt-4 px-4 py-2 bg-[#083B82] text-white text-xs font-bold rounded-xl shadow-xs"
          >
            Browse PDF
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-800">📄 {file.name}</span>
              <div className="text-[11px] text-slate-500 mt-0.5">Total Pages: {pages.length}</div>
            </div>

            <button
              type="button"
              onClick={() => { setFile(null); setPages([]); }}
              className="text-xs font-semibold text-slate-600 hover:underline"
            >
              Change PDF
            </button>
          </div>

          {isRendering && (
            <div className="py-8 text-center text-xs text-slate-600 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span>Loading pages...</span>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3.5">
            {pages.map((p, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-2.5 shadow-xs flex flex-col justify-between">
                <div className="aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
                  <img src={p.dataUrl} alt="" className="w-full h-full object-contain" />
                </div>
                <div className="mt-2 text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Slot #{idx + 1}</span>
                  <span className="text-[10px] text-slate-400 font-normal">(Orig: P{p.label})</span>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMove(idx, -1)}
                    className="px-2 py-0.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-30"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    disabled={idx === pages.length - 1}
                    onClick={() => handleMove(idx, 1)}
                    className="px-2 py-0.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-30"
                  >
                    →
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleSaveReordered}
              className="px-6 py-2.5 bg-[#083B82] hover:bg-blue-900 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Move className="w-4 h-4" />
                  <span>Save Reordered PDF</span>
                </>
              )}
            </button>

            {downloadUrl && (
              <a
                href={downloadUrl}
                download={`reordered_${file.name}`}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Reordered PDF</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 10. TOOL: ROTATE PDF
// ============================================================================
function RotatePdfTool() {
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]);
  const [rotations, setRotations] = useState({}); // { [pageIndex]: angle }
  const [isRendering, setIsRendering] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPages([]);
    setRotations({});
    setDownloadUrl(null);
    setIsRendering(true);

    try {
      const arrayBuf = await selected.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
      const numPages = pdf.numPages;
      const rendered = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.6 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;

        rendered.push({
          index: i - 1,
          pageNumber: i,
          dataUrl: canvas.toDataURL('image/jpeg', 0.8),
        });
      }
      setPages(rendered);
    } catch (err) {
      alert('Failed to load PDF pages: ' + err.message);
    } finally {
      setIsRendering(false);
    }
  };

  const rotatePage = (pageIndex, delta) => {
    setRotations((prev) => {
      const current = prev[pageIndex] || 0;
      const next = (current + delta + 360) % 360;
      return { ...prev, [pageIndex]: next };
    });
    setDownloadUrl(null);
  };

  const rotateAll = (delta) => {
    setRotations((prev) => {
      const updated = {};
      pages.forEach((p) => {
        const current = prev[p.index] || 0;
        updated[p.index] = (current + delta + 360) % 360;
      });
      return updated;
    });
    setDownloadUrl(null);
  };

  const handleSaveRotated = async () => {
    if (!file || !pages.length) return;
    setIsProcessing(true);
    try {
      const arrayBuf = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuf);
      const docPages = pdfDoc.getPages();

      docPages.forEach((page, idx) => {
        const addAngle = rotations[idx] || 0;
        if (addAngle !== 0) {
          const currentRotation = page.getRotation().angle;
          page.setRotation(degrees((currentRotation + addAngle) % 360));
        }
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setDownloadUrl(URL.createObjectURL(blob));
    } catch (err) {
      alert('Failed to rotate PDF: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {!file ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-3xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-emerald-50/20"
        >
          <RotateCw className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-800">Select PDF to Rotate Pages</h4>
          <p className="text-xs text-slate-500 mt-1">Permanently fix upside-down or sideways pages in 90° / 180° / 270° increments</p>
          <button
            type="button"
            className="mt-4 px-4 py-2 bg-[#083B82] text-white text-xs font-bold rounded-xl shadow-xs"
          >
            Browse PDF
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-800">📄 {file.name}</span>
              <div className="text-[11px] text-slate-500 mt-0.5">Total Pages: {pages.length}</div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => rotateAll(90)}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 flex items-center gap-1"
              >
                <RotateCw className="w-3.5 h-3.5" /> Rotate All +90°
              </button>
              <button
                type="button"
                onClick={() => { setFile(null); setPages([]); }}
                className="text-xs font-semibold text-slate-600 hover:underline px-2"
              >
                Change PDF
              </button>
            </div>
          </div>

          {isRendering && (
            <div className="py-8 text-center text-xs text-slate-600 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              <span>Loading page previews...</span>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3.5">
            {pages.map((p) => {
              const currentAngle = rotations[p.index] || 0;
              return (
                <div key={p.index} className="bg-white border border-slate-200 rounded-2xl p-2.5 shadow-xs flex flex-col justify-between">
                  <div className="aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center p-2">
                    <img
                      src={p.dataUrl}
                      alt=""
                      style={{ transform: `rotate(${currentAngle}deg)`, transition: 'transform 0.2s' }}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="mt-2 text-[11px] font-bold text-slate-700 flex items-center justify-between">
                    <span>Page {p.pageNumber}</span>
                    <span className="text-[10px] text-emerald-600">{currentAngle}°</span>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => rotatePage(p.index, -90)}
                      className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                      title="Rotate counter-clockwise 90°"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => rotatePage(p.index, 90)}
                      className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                      title="Rotate clockwise 90°"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleSaveRotated}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Rotations...</span>
                </>
              ) : (
                <>
                  <RotateCw className="w-4 h-4" />
                  <span>Save Rotated PDF</span>
                </>
              )}
            </button>

            {downloadUrl && (
              <a
                href={downloadUrl}
                download={`rotated_${file.name}`}
                className="px-6 py-2.5 bg-[#083B82] hover:bg-blue-900 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Rotated PDF</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
