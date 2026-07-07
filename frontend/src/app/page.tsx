'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ChevronRight, 
  ArrowLeft, 
  Sun, 
  Moon, 
  Database, 
  Sparkles,
  Info,
  Check,
  User,
  Phone,
  Mail,
  Calendar,
  Building2,
  MapPin,
  RefreshCw,
  Layers,
  ArrowRightLeft,
  Settings,
  Flame
} from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5005';

// Define the GrowEasy CRM fields
const CRM_FIELDS = [
  { key: 'created_at', label: 'Created At', desc: 'Lead creation timestamp', icon: Calendar, regex: /date|create/i },
  { key: 'name', label: 'Lead Name', desc: 'Full name of the contact', icon: User, regex: /name|full|first|last/i },
  { key: 'email', label: 'Primary Email', desc: 'Primary email address', icon: Mail, regex: /email|mail/i },
  { key: 'country_code', label: 'Country Code', desc: 'Dialing prefix (e.g. +91)', icon: Phone, regex: /code/i },
  { key: 'mobile_without_country_code', label: 'Mobile Number', desc: 'Primary phone (no country code)', icon: Phone, regex: /phone|mobile|contact|num/i },
  { key: 'company', label: 'Company Name', desc: 'Employer or firm name', icon: Building2, regex: /company|firm|org/i },
  { key: 'city', label: 'City', desc: 'City location', icon: MapPin, regex: /city/i },
  { key: 'state', label: 'State', desc: 'State or region', icon: MapPin, regex: /state/i },
  { key: 'country', label: 'Country', desc: 'Country location', icon: MapPin, regex: /country/i },
  { key: 'lead_owner', label: 'Lead Owner', desc: 'Assigned sales representative', icon: User, regex: /owner|sales|rep/i },
  { key: 'crm_status', label: 'CRM Status', desc: 'GOOD_LEAD_FOLLOW_UP, etc.', icon: Settings, regex: /status/i },
  { key: 'crm_note', label: 'CRM Notes', desc: 'Remarks & secondary phone/emails', icon: Info, regex: /note|remark|comment|detail/i },
  { key: 'data_source', label: 'Data Source', desc: 'leads_on_demand, meridian_tower, etc.', icon: Layers, regex: /source|medium/i },
  { key: 'possession_time', label: 'Possession Time', desc: 'Property possession timeline', icon: Calendar, regex: /possession|timeline/i },
  { key: 'description', label: 'Description', desc: 'Additional notes or requirements', icon: Info, regex: /description|desc|about/i }
];

export default function Home() {
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Step Wizard State
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [file, setFile] = useState<File | null>(null);

  // CSV Parsing State (Step 2)
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);


  // Column Mapping Configuration State (Step 3)
  const [columnMapping, setColumnMapping] = useState<{[key: string]: string}>({});

  // AI Import State (Step 3 & 4)
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [progressText, setProgressText] = useState<string>('');
  const [importResult, setImportResult] = useState<{
    imported: any[];
    skipped: any[];
    stats: {
      totalProcessed: number;
      totalImported: number;
      totalSkipped: number;
    };
  } | null>(null);

  // Results View Tabs
  const [resultTab, setResultTab] = useState<'success' | 'skipped'>('success');

  // Drag and Drop Ref & State
  const [isDragActive, setIsDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Theme on load
  useEffect(() => {
    const docTheme = document.documentElement.getAttribute('data-theme') as 'light' | 'dark' || 'dark';
    setTheme(docTheme);
  }, []);

  // Theme Toggle Handler
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  // Run Column Mapping heuristics
  const performHeuristicMapping = (fileHeaders: string[]) => {
    const mapping: {[key: string]: string} = {};
    
    CRM_FIELDS.forEach(field => {
      // Find a CSV header matching the regex
      const matchedHeader = fileHeaders.find(h => field.regex.test(h));
      // Pre-select if matched, otherwise leave blank (or AI will guess)
      mapping[field.key] = matchedHeader || '';
    });
    
    setColumnMapping(mapping);
  };

  // Drag Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.csv')) {
        await processFile(droppedFile);
      } else {
        showError('Please upload a valid CSV file (.csv)');
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      await processFile(selectedFile);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 5000);
  };

  // Step 1: Upload file to backend for preview
  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('csvFile', selectedFile);

    try {
      const response = await fetch(`${BACKEND_URL}/api/upload-preview`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setHeaders(data.headers);
        setRows(data.rows);
        setTotalRows(data.totalRows);
        performHeuristicMapping(data.headers);
        setStep(2); // Go to Preview Step
      } else {
        showError(data.message || 'Failed to parse the CSV file');
        setFile(null);
      }
    } catch (err: any) {
      console.error(err);
      showError('Connection error to backend server');
      setFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Step 3: Trigger AI batch mapping and parsing
  const confirmImport = async () => {
    setIsImporting(true);
    setProgressText('Initiating ingestion pipeline...');
    
    const batchSize = 10;
    const totalBatches = Math.ceil(rows.length / batchSize);
    
    let currentBatch = 0;
    const progressInterval = setInterval(() => {
      if (currentBatch < totalBatches) {
        currentBatch++;
        setProgressText(`AI standardizing batch ${currentBatch} of ${totalBatches}...`);
      }
    }, 1500);

    try {
      const response = await fetch(`${BACKEND_URL}/api/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rows,
          headers,
          columnMapping // Pass the custom column map to backend
        }),
      });

      clearInterval(progressInterval);
      const data = await response.json();

      if (response.ok && data.success) {
        setImportResult(data);
        setStep(4); // Go to Results Step
      } else {
        showError(data.message || 'Failed during AI lead parsing');
      }
    } catch (err) {
      clearInterval(progressInterval);
      console.error(err);
      showError('Connection error during AI mapping');
    } finally {
      setIsImporting(false);
      setProgressText('');
    }
  };

  const resetImporter = () => {
    setFile(null);
    setHeaders([]);
    setRows([]);
    setTotalRows(0);
    setColumnMapping({});
    setImportResult(null);
    setStep(1);
  };

  // Handle dropdown mapping change
  const handleMappingChange = (fieldKey: string, headerValue: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [fieldKey]: headerValue
    }));
  };

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
    exit: { opacity: 0, y: -15, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } }
  };

  const cardVariants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: (i: number) => ({
      opacity: 1,
      scale: 1,
      transition: { delay: i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }
    })
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-primary/30 relative">
      
      {/* Background radial ambient light spots */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-8 py-4 border-b border-border/80 bg-background/70 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <motion.div 
            className="flex items-center justify-center p-2.5 rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/25"
            whileHover={{ rotate: 360, scale: 1.05 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            <Database size={22} />
          </motion.div>
          <div>
            <h1 className="text-xl font-bold tracking-tight font-display">
              GrowEasy <span className="text-primary font-extrabold bg-gradient-to-r from-primary via-indigo-400 to-accent bg-clip-text text-transparent">CSV Importer</span>
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <motion.button 
            onClick={toggleTheme}
            className="flex items-center justify-center p-2.5 border rounded-2xl cursor-pointer border-border bg-card/65 text-foreground transition-colors hover:bg-muted/80"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-700" />}
          </motion.button>
        </div>
      </header>


      {/* Progress Timelines Tracker */}
      <main className="flex-1 w-full max-w-5xl px-8 py-12 mx-auto">
        
        <div className="relative flex items-center justify-between max-w-xl mx-auto mb-16">
          <div className="absolute top-1/2 left-0 h-[2px] bg-border/80 w-full -translate-y-1/2 -z-10" />
          <div 
            className="absolute top-1/2 left-0 h-[2px] bg-gradient-to-r from-primary to-accent -translate-y-1/2 -z-10 transition-all duration-500" 
            style={{ width: `${((step - 1) / 3) * 100}%` }}
          />
          
          {[1, 2, 3, 4].map((s) => {
            const isActive = step >= s;
            const isCompleted = step > s;
            return (
              <div key={s} className="relative flex flex-col items-center">
                <motion.div 
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 font-display font-semibold text-sm transition-all duration-300 ${
                    isActive 
                      ? 'border-primary bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/20' 
                      : 'border-border bg-card text-muted-foreground'
                  }`}
                  animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  {isCompleted ? <Check size={15} strokeWidth={3} /> : s}
                </motion.div>
                <span className={`absolute -bottom-8 text-[0.65rem] font-extrabold uppercase tracking-widest whitespace-nowrap transition-colors duration-300 ${
                  isActive ? 'text-foreground font-extrabold' : 'text-muted-foreground'
                }`}>
                  {s === 1 && 'Upload'}
                  {s === 2 && 'Preview'}
                  {s === 3 && 'Mapping'}
                  {s === 4 && 'Complete'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Error Notification banner */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 p-4 mb-8 text-sm border rounded-2xl bg-destructive/10 border-destructive/25 text-destructive-foreground font-medium shadow-lg shadow-destructive/5"
            >
              <AlertCircle size={18} className="text-destructive shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Wizard Steps */}
        <AnimatePresence mode="wait">
          
          {/* STEP 1: UPLOAD AREA */}
          {step === 1 && (
            <motion.div 
              key="step1"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="max-w-2xl mx-auto glass-panel p-10 rounded-3xl border border-border/80 shadow-2xl relative"
            >
              <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-primary/5 to-accent/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="text-center mb-8">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[0.65rem] font-bold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20 mb-3">
                  <Flame size={12} /> AI Ingestor V2
                </span>
                <h2 className="text-3xl font-extrabold font-display tracking-tight text-foreground">Aesthetic CSV Lead Importer</h2>
                <p className="text-muted-foreground text-sm mt-2.5 max-w-md mx-auto">
                  Drag and drop lead exports from Facebook, Google, HubSpot, or standard spreadsheets. 
                  AI maps variables and normalizes attributes to CRM specifications.
                </p>
              </div>

              <motion.div 
                className={`dropzone cursor-pointer flex flex-col items-center justify-center gap-6 py-14 px-8 border-2 border-dashed rounded-2xl transition-all duration-300 bg-card/5 ${
                  isDragActive 
                    ? 'border-primary bg-primary/5 shadow-inner' 
                    : 'border-border hover:border-primary/50 hover:bg-card/25'
                }`}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".csv"
                  className="hidden"
                />
                
                <motion.div 
                  className="flex items-center justify-center p-4.5 rounded-2xl bg-secondary text-primary shadow-md border border-border/50"
                  animate={isDragActive ? { y: [0, -10, 0] } : {}}
                  transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                >
                  <Upload size={32} />
                </motion.div>
                
                <div className="text-center">
                  <p className="font-bold text-base text-foreground">
                    {isUploading ? 'Validating spreadsheet content...' : 'Upload your lead CSV file'}
                  </p>
                  <p className="text-muted-foreground text-xs mt-1.5 font-medium">
                    {!isUploading && 'Drag your file here or click to browse'}
                  </p>
                </div>

                {isUploading && (
                  <div className="flex flex-col items-center gap-2 mt-2">
                    <RefreshCw size={24} className="text-primary animate-spin" />
                  </div>
                )}
              </motion.div>

              <div className="mt-8 pt-6 border-t border-border/80 flex items-start gap-3.5 text-muted-foreground text-xs leading-relaxed">
                <Info size={16} className="text-primary shrink-0 mt-0.5" />
                <p>
                  <strong>Data Privacy & Sanitation:</strong> File parsing occurs locally. Rows missing both phone and email coordinates are skipped in step 3 to optimize dataset quality.
                </p>
              </div>
            </motion.div>
          )}

          {/* STEP 2: PREVIEW PRE-AI */}
          {step === 2 && (
            <motion.div 
              key="step2"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="glass-panel p-8 rounded-3xl border border-border/80 shadow-2xl"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-6 border-b border-border/60">
                <div>
                  <span className="text-xs font-bold text-primary tracking-wider uppercase">
                    Step 2 of 4 — Grid Validator
                  </span>
                  <h2 className="text-2xl font-bold font-display tracking-tight mt-1">Raw CSV Preview</h2>
                  <p className="text-muted-foreground text-xs mt-1">
                    File: <span className="font-semibold text-foreground">{file?.name}</span> • Read <span className="font-semibold text-foreground">{totalRows}</span> rows.
                  </p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <motion.button 
                    className="flex-1 md:flex-none btn btn-secondary flex items-center justify-center"
                    onClick={resetImporter}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <ArrowLeft size={16} /> Reupload
                  </motion.button>
                  <motion.button 
                    className="flex-1 md:flex-none btn btn-primary flex items-center justify-center"
                    onClick={() => setStep(3)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Configure Mappings <ChevronRight size={16} />
                  </motion.button>
                </div>
              </div>

              <div className="table-container bg-card/20 shadow-inner">
                <table className="min-w-full divide-y divide-border">
                  <thead>
                    <tr className="bg-muted/40">
                      {headers.map((h, i) => (
                        <th key={i} className="px-5 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider sticky top-0 border-b border-border">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card/5">
                    {rows.slice(0, 15).map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-primary/5 transition-colors">
                        {headers.map((h, colIndex) => (
                          <td key={colIndex} className="px-5 py-3.5 text-sm text-foreground max-w-xs truncate" title={row[h]}>
                            {row[h] || <span className="text-muted-foreground/60 italic text-xs font-light">empty</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalRows > 15 && (
                <p className="text-center text-xs text-muted-foreground mt-4 font-semibold">
                  Displaying first 15 records. AI batch mapping will apply to all {totalRows} records.
                </p>
              )}
            </motion.div>
          )}

          {/* STEP 3: INTERACTIVE COLUMN MAPPER */}
          {step === 3 && (
            <motion.div 
              key="step3"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="glass-panel p-8 rounded-3xl border border-border/80 shadow-2xl relative"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-6 border-b border-border/60">
                <div>
                  <span className="text-xs font-bold text-primary tracking-wider uppercase">
                    Step 3 of 4 — Alignment & Validation
                  </span>
                  <h2 className="text-2xl font-bold font-display tracking-tight mt-1">Review Column Mappings</h2>
                  <p className="text-muted-foreground text-xs mt-1">
                    Align your spreadsheet headers with standard GrowEasy CRM fields. 
                  </p>
                </div>
                {!isImporting && (
                  <div className="flex gap-3 w-full md:w-auto">
                    <motion.button 
                      className="flex-1 md:flex-none btn btn-secondary" 
                      onClick={() => setStep(2)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Back
                    </motion.button>
                    <motion.button 
                      className="flex-1 md:flex-none btn btn-primary flex items-center justify-center" 
                      onClick={confirmImport}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Sparkles size={16} /> Run Ingest Pipeline
                    </motion.button>
                  </div>
                )}
              </div>

              {isImporting ? (
                <div className="flex flex-col items-center justify-center gap-6 py-14 bg-primary/5 border border-dashed border-primary rounded-2xl my-4">
                  <RefreshCw className="text-primary animate-spin" size={36} />
                  <div className="text-center">
                    <p className="font-extrabold text-foreground text-lg font-display">Normalizing Spreadsheet Variables</p>
                    <p className="text-muted-foreground text-xs mt-1.5 animate-pulse font-semibold tracking-wider">
                      {progressText}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[460px] overflow-y-auto pr-2 border border-border/80 rounded-xl p-4 bg-secondary/20">
                  {CRM_FIELDS.map((field) => {
                    const matchedHeader = columnMapping[field.key];
                    const hasMatch = !!matchedHeader;

                    return (
                      <div 
                        key={field.key} 
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                          hasMatch 
                            ? 'bg-card/70 border-primary/20 shadow-sm' 
                            : 'bg-card/30 border-border/60 opacity-80'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl border ${
                            hasMatch ? 'bg-primary/10 text-primary border-primary/10' : 'bg-muted text-muted-foreground border-border'
                          }`}>
                            <field.icon size={16} />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-foreground tracking-tight">{field.label}</span>
                              <span className="text-[0.6rem] text-muted-foreground font-mono">({field.key})</span>
                            </div>
                            <span className="text-[0.65rem] text-muted-foreground block mt-0.5">{field.desc}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <ArrowRightLeft size={12} className="text-muted-foreground/60" />
                          <select
                            value={matchedHeader}
                            onChange={(e) => handleMappingChange(field.key, e.target.value)}
                            className="bg-background text-foreground border border-border rounded-lg text-xs p-1.5 font-semibold focus:outline-none focus:border-primary/50 cursor-pointer max-w-[160px]"
                          >
                            <option value="">-- Let AI decide --</option>
                            {headers.map((h, index) => (
                              <option key={index} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 4: IMPORT COMPLETED */}
          {step === 4 && importResult && (
            <motion.div 
              key="step4"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="glass-panel p-8 rounded-3xl border border-border/80 shadow-2xl"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-4 border-b border-border/40">
                <div>
                  <span className="text-xs font-bold text-primary tracking-wider uppercase">
                    Step 4 of 4 — Ingestion Success
                  </span>
                  <h2 className="text-2xl font-bold font-display tracking-tight mt-1">Lead Import Report</h2>
                  <p className="text-muted-foreground text-xs mt-1">
                    Spreadsheet elements standardisation complete.
                  </p>
                </div>
                <motion.button 
                  className="btn btn-primary w-full sm:w-auto" 
                  onClick={resetImporter}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Import Another CSV
                </motion.button>
              </div>

              {/* Grid Dashboard */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
                {[
                  { title: 'Total Processed', val: importResult.stats.totalProcessed, color: 'border-primary/80', icon: Layers },
                  { title: 'Standardized Leads', val: importResult.stats.totalImported, color: 'border-emerald-500', valColor: 'text-emerald-500', icon: CheckCircle2 },
                  { title: 'Skipped Records', val: importResult.stats.totalSkipped, color: 'border-rose-500', valColor: 'text-rose-500', icon: XCircle }
                ].map((m, idx) => (
                  <motion.div 
                    key={m.title}
                    custom={idx}
                    variants={cardVariants}
                    initial="initial"
                    animate="animate"
                    className="p-5 rounded-xl border border-border bg-card/30 flex justify-between items-center relative overflow-hidden"
                    style={{ borderLeftWidth: '4px', borderLeftColor: `var(--color-${m.color.split('-')[1]})` }}
                  >
                    <div>
                      <span className="text-[0.65rem] font-bold text-muted-foreground uppercase tracking-widest">{m.title}</span>
                      <p className={`text-3xl font-extrabold font-display mt-1.5 ${m.valColor || 'text-foreground'}`}>{m.val}</p>
                    </div>
                    <div className="text-muted-foreground/20">
                      <m.icon size={36} />
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border mb-6 gap-2 overflow-x-auto">
                <button 
                  onClick={() => setResultTab('success')}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
                    resultTab === 'success' 
                      ? 'border-primary text-foreground' 
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  Successfully Standardized Leads ({importResult.imported.length})
                </button>
                <button 
                  onClick={() => setResultTab('skipped')}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
                    resultTab === 'skipped' 
                      ? 'border-primary text-foreground' 
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <XCircle size={16} className="text-rose-500" />
                  Skipped / Invalid Rows ({importResult.skipped.length})
                </button>
              </div>

              {/* TABLE VIEW */}
              <AnimatePresence mode="wait">
                {resultTab === 'success' ? (
                  <motion.div 
                    key="tab-success"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                  >
                    {importResult.imported.length === 0 ? (
                      <div className="text-center py-16 text-muted-foreground text-sm font-medium bg-card/5 rounded-xl border border-dashed border-border">
                        No records succeeded the mapping criteria.
                      </div>
                    ) : (
                      <div className="table-container bg-card/25 shadow-inner">
                        <table className="min-w-full divide-y divide-border">
                          <thead>
                            <tr className="bg-muted/40">
                              {['Created At', 'Name', 'Email Address', 'Phone Line', 'Status Badge', 'Company', 'Location', 'Notes'].map((th, i) => (
                                <th key={i} className="px-5 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider sticky top-0 border-b border-border">
                                  {th}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border bg-card/5">
                            {importResult.imported.map((lead: any, idx: number) => (
                              <tr key={idx} className="hover:bg-primary/5 transition-colors">
                                <td className="px-5 py-3.5 text-xs text-muted-foreground font-mono" title={lead.created_at}>{lead.created_at}</td>
                                <td className="px-5 py-3.5 text-sm font-bold text-foreground" title={lead.name}>{lead.name}</td>
                                <td className="px-5 py-3.5 text-sm text-foreground" title={lead.email}>{lead.email || <span className="text-muted-foreground/60 italic text-xs">none</span>}</td>
                                <td className="px-5 py-3.5 text-sm text-foreground" title={`${lead.country_code} ${lead.mobile_without_country_code}`}>
                                  {lead.country_code} {lead.mobile_without_country_code || <span className="text-muted-foreground/60 italic text-xs">none</span>}
                                </td>
                                <td className="px-5 py-3.5 text-xs">
                                  <span className={`badge ${
                                    lead.crm_status === 'GOOD_LEAD_FOLLOW_UP' ? 'status-good' :
                                    lead.crm_status === 'DID_NOT_CONNECT' ? 'status-connect' :
                                    lead.crm_status === 'BAD_LEAD' ? 'status-bad' : 'status-sale'
                                  }`}>
                                    {lead.crm_status}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 text-sm text-foreground" title={lead.company}>{lead.company || <span className="text-muted-foreground/60 italic text-xs">none</span>}</td>
                                <td className="px-5 py-3.5 text-sm text-foreground" title={`${lead.city}, ${lead.state}`}>{lead.city || lead.state ? `${lead.city}, ${lead.state}` : <span className="text-muted-foreground/60 italic text-xs">none</span>}</td>
                                <td className="px-5 py-3.5 text-xs text-muted-foreground max-w-xs truncate" title={lead.crm_note}>{lead.crm_note}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div 
                    key="tab-skipped"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                  >
                    {importResult.skipped.length === 0 ? (
                      <div className="text-center py-16 text-muted-foreground text-sm font-medium bg-card/5 rounded-xl border border-dashed border-border">
                        Zero skipped items found. All rows mapped successfully!
                      </div>
                    ) : (
                      <div className="table-container bg-card/25 shadow-inner">
                        <table className="min-w-full divide-y divide-border">
                          <thead>
                            <tr className="bg-muted/40">
                              <th className="px-5 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider sticky top-0 border-b border-border">Skip Reason</th>
                              <th className="px-5 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider sticky top-0 border-b border-border">Raw CSV Line elements</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border bg-card/5">
                            {importResult.skipped.map((item: any, idx: number) => (
                              <tr key={idx} className="hover:bg-primary/5 transition-colors">
                                <td className="px-5 py-3.5 text-sm text-rose-500 font-bold shrink-0 align-top min-w-[200px]" title={item.reason}>
                                  {item.reason}
                                </td>
                                <td className="px-5 py-3.5 text-sm">
                                  <pre className="text-xs text-muted-foreground bg-black/30 p-4 rounded-lg overflow-x-auto max-w-xl max-h-40 border border-border">
                                    {JSON.stringify(item.row, null, 2)}
                                  </pre>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

        </AnimatePresence>

      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-border/80 bg-secondary/10 text-center text-xs text-muted-foreground mt-auto">
        <p>© 2026 GrowEasy CRM Ingestor Dashboard • Powered by Next.js, Express & Gemini AI</p>
      </footer>
    </div>
  );
}
