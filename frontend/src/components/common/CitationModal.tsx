import React from 'react';
import { Modal } from './Modal';
import { Badge } from './Badge';
import { FileText, Copy, ExternalLink, Check } from 'lucide-react';
import { Citation } from '../../types';
import { Link } from 'react-router-dom';

interface CitationModalProps {
  citation: Citation | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CitationModal: React.FC<CitationModalProps> = ({
  citation,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!citation) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(citation.excerpt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const similarityPercent = citation.similarity ? Math.round(citation.similarity * 100) : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Grounded Source Evidence" maxWidth="lg">
      <div className="space-y-5">
        {/* Document Header */}
        <div className="flex items-start justify-between p-4 bg-surface-950 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-500/10 border border-brand-500/20 rounded-xl text-brand-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-base leading-tight">{citation.document_name}</h4>
              <p className="text-xs text-slate-400 mt-1">
                Source Location: <span className="text-slate-200 font-medium">Page {citation.page_number || 1}</span>
              </p>
            </div>
          </div>
          {similarityPercent !== null && (
            <Badge variant="indigo" size="sm">
              {similarityPercent}% Match
            </Badge>
          )}
        </div>

        {/* Excerpt Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Exact Extracted Passage
            </span>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 font-medium"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Excerpt'}
            </button>
          </div>
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-300 text-sm font-mono leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
            {citation.excerpt}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <Link
            to={`/documents/${citation.document_id}`}
            onClick={onClose}
            className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-brand-400 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Full Document & Chunks
          </Link>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-800 hover:bg-surface-700 text-white text-xs font-medium rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
