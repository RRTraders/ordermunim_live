import React, { useState, useRef } from 'react';
import { PDFDocument, PageSizes, degrees } from 'pdf-lib';
import { 
  Printer, 
  Scissors, 
  UploadCloud, 
  FileText, 
  CheckCircle, 
  Download, 
  RefreshCw, 
  Trash2, 
  Settings2, 
  ShieldCheck, 
  Sparkles, 
  Sliders, 
  Layers, 
  FileCheck,
  AlertCircle
} from 'lucide-react';

export default function LabelCropper({ showToast }) {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedPdfUrl, setProcessedPdfUrl] = useState(null);
  const [processedFileName, setProcessedFileName] = useState('');
  const [stats, setStats] = useState({ totalPages: 0, totalLabels: 0 });
  const [dragActive, setDragActive] = useState(false);

  // Settings
  const [cropPreset, setCropPreset] = useState('meesho_thermal'); // 'meesho_thermal' | 'a4_4grid' | 'a4_2grid' | 'custom'
  const [cropHeightPercent, setCropHeightPercent] = useState(50); // percentage of page height from top
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270

  const fileInputRef = useRef(null);

  // Handle files selection
  const handleFiles = (newFiles) => {
    const validPdfs = Array.from(newFiles).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (validPdfs.length === 0) {
      if (showToast) showToast('Please select valid PDF files only', 'error');
      return;
    }
    setFiles(prev => [...prev, ...validPdfs]);
    setProcessedPdfUrl(null);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setProcessedPdfUrl(null);
  };

  const clearAll = () => {
    setFiles([]);
    setProcessedPdfUrl(null);
    setStats({ totalPages: 0, totalLabels: 0 });
  };

  // Main Crop & Formatting Logic using pdf-lib (100% in browser)
  const processLabels = async () => {
    if (files.length === 0) {
      if (showToast) showToast('Please upload at least one PDF file', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      // 4x6 inches in points = 288 x 432 pt
      const THERMAL_WIDTH = 288;
      const THERMAL_HEIGHT = 432;
      
      // Standard A4 in points = 595.28 x 841.89 pt
      const A4_WIDTH = 595.28;
      const A4_HEIGHT = 841.89;

      const mergedDoc = await PDFDocument.create();
      let labelCount = 0;

      for (const file of files) {
        const fileBytes = await file.arrayBuffer();
        const srcDoc = await PDFDocument.load(fileBytes);
        const pageCount = srcDoc.getPageCount();

        for (let i = 0; i < pageCount; i++) {
          const srcPage = srcDoc.getPage(i);
          const { width: origW, height: origH } = srcPage.getSize();

          // Calculate crop box (Meesho label is in the top portion)
          // In PDF coords: (0,0) is bottom-left, height is top
          const cropRatio = cropHeightPercent / 100;
          const cropH = origH * cropRatio;
          const cropY = origH - cropH; // starting Y for top half

          if (cropPreset === 'meesho_thermal' || cropPreset === 'custom') {
            // Mode: Thermal 4x6 inch single label
            const [embeddedPage] = await mergedDoc.embedPdf(srcDoc, [i]);
            const newPage = mergedDoc.addPage([THERMAL_WIDTH, THERMAL_HEIGHT]);

            // Scale cropped area to fill 4x6
            const scaleX = THERMAL_WIDTH / origW;
            const scaleY = THERMAL_HEIGHT / cropH;
            const scale = Math.min(scaleX, scaleY) * 0.96; // 4% padding for clean margins

            const drawW = origW * scale;
            const drawH = origH * scale;

            // Center on 4x6 page
            const offsetX = (THERMAL_WIDTH - drawW) / 2;
            // Shift Y so the cropped top half sits neatly centered
            const offsetY = (THERMAL_HEIGHT - (cropH * scale)) / 2 - (cropY * scale);

            newPage.drawImage(embeddedPage, {
              x: offsetX,
              y: offsetY,
              width: drawW,
              height: drawH,
              rotate: degrees(rotation)
            });

            labelCount++;
          } else if (cropPreset === 'a4_4grid') {
            // 4 labels per A4 page (2x2 grid)
            // We accumulate 4 labels then add a page
            // Handled below in grid accumulator
          }
        }
      }

      // Handle A4 4-Grid Mode if selected
      if (cropPreset === 'a4_4grid') {
        const allEmbedded = [];
        for (const file of files) {
          const fileBytes = await file.arrayBuffer();
          const srcDoc = await PDFDocument.load(fileBytes);
          const pageIndices = Array.from({ length: srcDoc.getPageCount() }, (_, i) => i);
          const embedded = await mergedDoc.embedPdf(srcDoc, pageIndices);
          embedded.forEach((emb, idx) => {
            const page = srcDoc.getPage(idx);
            allEmbedded.push({ emb, size: page.getSize() });
          });
        }

        const quadrantW = A4_WIDTH / 2;
        const quadrantH = A4_HEIGHT / 2;

        for (let i = 0; i < allEmbedded.length; i += 4) {
          const newPage = mergedDoc.addPage([A4_WIDTH, A4_HEIGHT]);
          const chunk = allEmbedded.slice(i, i + 4);

          chunk.forEach((item, pos) => {
            // positions: 0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right
            const col = pos % 2;
            const row = Math.floor(pos / 2); // 0 = top, 1 = bottom

            const qX = col * quadrantW;
            const qY = row === 0 ? quadrantH : 0; // In PDF Y=0 is bottom

            const { width: origW, height: origH } = item.size;
            const cropRatio = cropHeightPercent / 100;
            const cropH = origH * cropRatio;
            const cropY = origH - cropH;

            const scale = Math.min((quadrantW * 0.95) / origW, (quadrantH * 0.95) / cropH);
            const drawW = origW * scale;
            const drawH = origH * scale;

            const offX = qX + (quadrantW - drawW) / 2;
            const offY = qY + (quadrantH - (cropH * scale)) / 2 - (cropY * scale);

            newPage.drawImage(item.emb, {
              x: offX,
              y: offY,
              width: drawW,
              height: drawH
            });
            labelCount++;
          });
        }
      }

      const pdfBytes = await mergedDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setProcessedPdfUrl(url);
      setProcessedFileName(`Meesho_Labels_Cropped_${new Date().toISOString().slice(0, 10)}.pdf`);
      setStats({ totalPages: mergedDoc.getPageCount(), totalLabels: labelCount });

      if (showToast) showToast(`Successfully cropped ${labelCount} labels!`, 'success');
    } catch (err) {
      console.error(err);
      if (showToast) showToast(`Error processing PDF: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    if (!processedPdfUrl) return;
    const printWindow = window.open(processedPdfUrl);
    if (printWindow) {
      printWindow.onload = () => printWindow.print();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900/40 via-cyan-900/30 to-slate-900 border border-cyan-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-2">
              <Scissors className="w-3.5 h-3.5" />
              Meesho & E-commerce Smart Cropper
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              Shipping Label PDF Cropper
            </h2>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-xl">
              Crop Meesho, Flipkart, and Amazon shipping labels to standard <strong>4x6 inch thermal printer</strong> or <strong>A4 4-in-1 sheets</strong>. Saves 75% paper and ink.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-700/60 text-xs text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              100% Private (Browser only)
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Upload & Settings */}
        <div className="lg:col-span-2 space-y-5">
          {/* Drag & Drop Upload Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
              dragActive 
                ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]' 
                : 'border-slate-700/80 bg-slate-900/60 hover:border-cyan-500/50 hover:bg-slate-900'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/pdf"
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mx-auto mb-3">
              <UploadCloud className="w-7 h-7" />
            </div>
            <h4 className="text-sm md:text-base font-bold text-white mb-1">
              Click to upload or drag & drop Meesho label PDFs
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Select one or multiple label PDFs. All files will be automatically merged, cropped, and formatted.
            </p>
          </div>

          {/* Uploaded Files List */}
          {files.length > 0 && (
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  Uploaded PDFs ({files.length})
                </span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear All
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {files.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
                    <div className="flex items-center gap-2.5 truncate max-w-[80%]">
                      <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-slate-200 font-medium truncate">{file.name}</span>
                      <span className="text-slate-500 shrink-0">({(file.size / 1024).toFixed(0)} KB)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Crop & Printer Preset Settings */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-cyan-400" />
              Printer & Crop Settings
            </h4>

            {/* Presets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => { setCropPreset('meesho_thermal'); setCropHeightPercent(50); }}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  cropPreset === 'meesho_thermal'
                    ? 'bg-cyan-500/15 border-cyan-500 text-white shadow-lg shadow-cyan-950/50'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Printer className="w-4 h-4 text-cyan-400" />
                  {cropPreset === 'meesho_thermal' && <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />}
                </div>
                <p className="font-bold text-xs text-white">Thermal 4x6"</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Top Half $\rightarrow$ 100x150mm Rollo/TSC/TVS</p>
              </button>

              <button
                type="button"
                onClick={() => { setCropPreset('a4_4grid'); setCropHeightPercent(50); }}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  cropPreset === 'a4_4grid'
                    ? 'bg-cyan-500/15 border-cyan-500 text-white shadow-lg shadow-cyan-950/50'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Layers className="w-4 h-4 text-purple-400" />
                  {cropPreset === 'a4_4grid' && <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />}
                </div>
                <p className="font-bold text-xs text-white">A4 4-in-1 Grid</p>
                <p className="text-[11px] text-slate-400 mt-0.5">4 Labels per sheet (Saves 75% paper)</p>
              </button>

              <button
                type="button"
                onClick={() => setCropPreset('custom')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  cropPreset === 'custom'
                    ? 'bg-cyan-500/15 border-cyan-500 text-white shadow-lg shadow-cyan-950/50'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  {cropPreset === 'custom' && <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />}
                </div>
                <p className="font-bold text-xs text-white">Custom Ratio</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Adjust exact crop height</p>
              </button>
            </div>

            {/* Custom slider if custom mode */}
            {cropPreset === 'custom' && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Crop Height from Top:</span>
                  <span className="text-cyan-400 font-bold font-mono">{cropHeightPercent}%</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="90"
                  value={cropHeightPercent}
                  onChange={(e) => setCropHeightPercent(parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Actions, Stats & Download */}
        <div className="space-y-5">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Process & Download
            </h3>

            {/* Summary */}
            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Selected Files:</span>
                <span className="font-bold text-white">{files.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Target Output:</span>
                <span className="font-bold text-cyan-400">
                  {cropPreset === 'meesho_thermal' ? 'Thermal 4x6" (100x150mm)' : cropPreset === 'a4_4grid' ? 'A4 4-in-1 Sheet' : 'Custom'}
                </span>
              </div>
              {stats.totalLabels > 0 && (
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                  <span className="text-slate-400">Cropped Labels:</span>
                  <span className="font-bold text-emerald-400 font-mono text-sm">{stats.totalLabels} Labels</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              <button
                type="button"
                disabled={files.length === 0 || isProcessing}
                onClick={processLabels}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded-2xl shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Cropping Labels in Browser...
                  </>
                ) : (
                  <>
                    <Scissors className="w-4 h-4" />
                    Crop Shipping Labels Now
                  </>
                )}
              </button>

              {processedPdfUrl && (
                <>
                  <a
                    href={processedPdfUrl}
                    download={processedFileName}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-sm font-bold rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Download Cropped PDF
                  </a>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-2xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Directly (Browser)
                  </button>
                </>
              )}
            </div>

            {/* Security Notice */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-[11px] text-emerald-300 leading-relaxed flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>
                <strong>Zero server upload:</strong> All label cropping runs securely inside your local browser memory using WebAssembly.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
