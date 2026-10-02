import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  X,
  AlertCircle,
  ArrowLeft,
  Layers,
  Sparkles,
} from 'lucide-react';
import { docService } from '../services/docService';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useToast } from '../context/ToastContext';

export const UploadDocument: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState('General');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['internal']);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    const validExtensions = ['.pdf', '.docx', '.doc', '.txt', '.csv'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      toast('Unsupported file type. Please upload a PDF, DOCX, TXT, or CSV.', 'error');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast('File exceeds maximum size of 25MB.', 'error');
      return;
    }
    setSelectedFile(file);
  };

  const addTag = () => {
    const clean = tagInput.trim().replace(/^#/, '');
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setTagInput('');
    }
  };

  const removeTag = (tToRemove: string) => {
    setTags(tags.filter((t) => t !== tToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast('Please choose a document to upload.', 'error');
      return;
    }

    setUploading(true);
    try {
      const doc = await docService.upload(selectedFile, category, tags);
      toast(`Successfully uploaded '${doc.filename}'. Processing vector embeddings...`, 'success');
      navigate(`/documents/${doc.id}`);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to upload document. Please try again.';
      toast(msg, 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/documents"
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Ingest Knowledge Document</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Upload enterprise documents for automatic text extraction, chunking, and semantic vector indexing.
          </p>
        </div>
      </div>

      <Card glow className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Drag & Drop Area */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Document File (PDF, DOCX, TXT, CSV)
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt,.csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
            />

            {!selectedFile ? (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-slate-700/80 hover:border-slate-600 bg-surface-950/60'
                }`}
              >
                <div className="p-3 bg-brand-500/10 text-brand-400 rounded-2xl w-14 h-14 mx-auto flex items-center justify-center mb-3">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <p className="text-sm font-semibold text-white">
                  Drag and drop your file here, or <span className="text-brand-400">browse</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supports PDF, DOCX, TXT, and CSV up to 25MB
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-surface-950 border border-slate-700 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-brand-500/10 text-brand-400 rounded-xl">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{selectedFile.name}</p>
                    <p className="text-xs text-slate-400">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Knowledge Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-950 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="Human Resources">Human Resources (HR)</option>
                <option value="Engineering Operations">Engineering Operations</option>
                <option value="Information Security">Information Security</option>
                <option value="Product & Design">Product & Design</option>
                <option value="Legal & Compliance">Legal & Compliance</option>
                <option value="Finance">Finance</option>
                <option value="General">General Corporate</option>
              </select>
            </div>

            {/* Tags Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Document Tags
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="e.g. policy, vacation..."
                  className="flex-1 px-3.5 py-2 bg-surface-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <Button type="button" variant="secondary" size="sm" onClick={addTag}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 text-xs text-slate-300 rounded-lg"
                  >
                    #{t}
                    <button type="button" onClick={() => removeTag(t)} className="hover:text-rose-400">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* RAG Processing Notice */}
          <div className="p-4 bg-brand-950/40 border border-brand-500/20 rounded-xl text-xs text-slate-300 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Automated Vector Indexing Pipeline</p>
              <p className="text-slate-400 mt-0.5 leading-relaxed">
                Upon submission, the document will undergo SHA-256 duplicate verification, sliding-window chunking (800 chars / 150 overlap), and 768-dimension embedding generation.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Link to="/documents">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              loading={uploading}
              icon={<UploadCloud className="w-4 h-4" />}
            >
              Upload & Vectorize
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
