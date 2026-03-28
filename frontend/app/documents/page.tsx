"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Upload, Trash2, ToggleLeft, ToggleRight, Search,
  Database, Cpu, ArrowUpRight, CheckCircle, Clock, AlertCircle,
  File, FileImage, X, Eye,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard";
import { GlassCard, NeonButton, StatusBadge } from "@/components/ui";

interface Doc {
  id: string;
  name: string;
  size: string;
  type: string;
  status: "indexed" | "processing" | "error";
  active: boolean;
  uploadedAt: string;
  chunks: number;
}

const INITIAL_DOCS: Doc[] = [
  { id: "1", name: "Company_Research_Google.pdf", size: "2.4 MB", type: "pdf", status: "indexed", active: true, uploadedAt: "2 hours ago", chunks: 47 },
  { id: "2", name: "System_Design_Notes.docx", size: "890 KB", type: "docx", status: "indexed", active: true, uploadedAt: "1 day ago", chunks: 23 },
  { id: "3", name: "Behavioral_Questions.txt", size: "45 KB", type: "txt", status: "indexed", active: false, uploadedAt: "3 days ago", chunks: 8 },
  { id: "4", name: "Resume_v3_Final.pdf", size: "1.1 MB", type: "pdf", status: "processing", active: true, uploadedAt: "5 min ago", chunks: 0 },
  { id: "5", name: "Job_Description_SDE3.txt", size: "12 KB", type: "txt", status: "indexed", active: true, uploadedAt: "6 hours ago", chunks: 3 },
];

const FILE_ICONS: Record<string, React.ReactNode> = {
  pdf: <FileText className="w-5 h-5 text-brand-red" />,
  docx: <File className="w-5 h-5 text-brand-cyan" />,
  txt: <FileText className="w-5 h-5 text-brand-green" />,
  img: <FileImage className="w-5 h-5 text-brand-purple" />,
};

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>(INITIAL_DOCS);
  const [dragOver, setDragOver] = useState(false);
  const [search, setSearch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const toggleDoc = (id: string) =>
    setDocs((d) => d.map((doc) => (doc.id === id ? { ...doc, active: !doc.active } : doc)));

  const deleteDoc = (id: string) =>
    setDocs((d) => d.filter((doc) => doc.id !== id));

  const handleUpload = () => {
    const newDoc: Doc = {
      id: String(Date.now()),
      name: "New_Upload.pdf",
      size: "1.5 MB",
      type: "pdf",
      status: "processing",
      active: true,
      uploadedAt: "Just now",
      chunks: 0,
    };
    setDocs((d) => [newDoc, ...d]);
  };

  const filtered = docs.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));
  const activeCount = docs.filter((d) => d.active).length;
  const totalChunks = docs.reduce((a, d) => a + d.chunks, 0);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-cyan to-brand-purple flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-textPrimary">DocuMind™ — Knowledge Base</h1>
              <p className="text-xs text-textMuted">Upload documents for AI-powered RAG context during interviews</p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Documents", value: docs.length, icon: <FileText className="w-4 h-4" />, color: "brand-cyan" },
            { label: "Active for RAG", value: activeCount, icon: <CheckCircle className="w-4 h-4" />, color: "brand-green" },
            { label: "Total Chunks", value: totalChunks, icon: <Cpu className="w-4 h-4" />, color: "brand-purple" },
            { label: "Max Upload", value: "10 MB", icon: <ArrowUpRight className="w-4 h-4" />, color: "brand-amber" },
          ].map((s) => (
            <GlassCard key={s.label} className="p-3 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg bg-${s.color}/10 flex items-center justify-center text-${s.color}`}>{s.icon}</div>
              <div>
                <p className="text-lg font-bold text-textPrimary">{s.value}</p>
                <p className="text-[10px] text-textMuted">{s.label}</p>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Upload zone */}
        <div
          className={`rounded-2xl bg-white/[0.03] backdrop-blur-xl border p-6 border-2 border-dashed text-center cursor-pointer transition-all ${dragOver ? "border-brand-cyan bg-brand-cyan/5" : "border-white/[0.08] hover:border-white/[0.15]"}`}
          onDragOver={(e: React.DragEvent) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e: React.DragEvent) => { e.preventDefault(); setDragOver(false); handleUpload(); }}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.txt" title="Upload documents" className="hidden" onChange={handleUpload} />
          <Upload className="w-8 h-8 mx-auto text-textMuted mb-2" />
          <p className="text-sm text-textPrimary">Drop files here or click to upload</p>
          <p className="text-xs text-textMuted mt-1">PDF, DOCX, TXT — max 10 MB each — up to 20 documents (Pro)</p>
        </div>

        {/* Search + Document list */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-textPrimary">Your Documents</h2>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents..." className="pl-8 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/[0.06] text-xs text-textPrimary placeholder-textMuted outline-none focus:border-brand-cyan/30 w-52" />
            </div>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] text-textMuted uppercase tracking-wider border-b border-white/[0.06]">
            <span className="col-span-5">Document</span>
            <span className="col-span-2">Status</span>
            <span className="col-span-1 text-center">Chunks</span>
            <span className="col-span-2">Uploaded</span>
            <span className="col-span-2 text-right">Actions</span>
          </div>

          {/* Document rows */}
          <div className="divide-y divide-white/[0.04]">
            <AnimatePresence>
              {filtered.map((doc) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-12 gap-2 items-center px-3 py-3"
                >
                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    {FILE_ICONS[doc.type] || FILE_ICONS.txt}
                    <div className="min-w-0">
                      <p className="text-sm text-textPrimary truncate">{doc.name}</p>
                      <p className="text-[10px] text-textMuted">{doc.size}</p>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <StatusBadge variant={doc.status === "indexed" ? "green" : doc.status === "processing" ? "amber" : "red"}>
                      {doc.status === "indexed" ? "Indexed" : doc.status === "processing" ? "Processing" : "Error"}
                    </StatusBadge>
                  </div>
                  <div className="col-span-1 text-center text-xs text-textSecondary">{doc.chunks || "—"}</div>
                  <div className="col-span-2 text-xs text-textMuted">{doc.uploadedAt}</div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <button onClick={() => toggleDoc(doc.id)} className={`p-1.5 rounded-lg transition ${doc.active ? "text-brand-green hover:bg-brand-green/10" : "text-textMuted hover:bg-white/5"}`} title={doc.active ? "Active (click to disable)" : "Disabled (click to enable)"}>
                      {doc.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button onClick={() => deleteDoc(doc.id)} className="p-1.5 rounded-lg text-textMuted hover:text-brand-red hover:bg-brand-red/10 transition" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {filtered.length === 0 && (
              <div className="py-8 text-center text-sm text-textMuted">No documents found</div>
            )}
          </div>
        </GlassCard>

        {/* RAG pipeline info */}
        <GlassCard className="p-5">
          <h2 className="text-sm font-semibold text-textPrimary mb-3 flex items-center gap-2"><Cpu className="w-4 h-4 text-brand-purple" /> RAG Pipeline</h2>
          <div className="flex items-center gap-4">
            {[
              { step: "1", label: "Upload", desc: "PDF/DOCX/TXT" },
              { step: "2", label: "Chunk", desc: "Smart splitting" },
              { step: "3", label: "Embed", desc: "Vector encode" },
              { step: "4", label: "Index", desc: "FAISS store" },
              { step: "5", label: "Retrieve", desc: "Semantic match" },
            ].map((s, i) => (
              <div key={s.step} className="flex items-center gap-3">
                <div className="text-center">
                  <div className="w-8 h-8 rounded-full bg-brand-purple/10 flex items-center justify-center text-xs font-bold text-brand-purple mx-auto">{s.step}</div>
                  <p className="text-xs text-textPrimary mt-1">{s.label}</p>
                  <p className="text-[9px] text-textMuted">{s.desc}</p>
                </div>
                {i < 4 && <div className="w-8 h-[1px] bg-white/10" />}
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </DashboardLayout>
  );
}
