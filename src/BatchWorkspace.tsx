import { useEffect, useRef, useState } from 'react';
import LoanRow from './LoanEntry';
import { calcSI, fmtINR, buildShareText, today } from './calc';
import { saveBatch, type SavedBatch, type SavedLoanEntry } from './db';

interface Props {
  defaultRate: number;
  onBatchSaved: () => void;
}

async function doShare(text: string, onCopied: () => void) {
  try { await navigator.clipboard.writeText(text); onCopied(); } catch { /* unavailable */ }
  if (navigator.share) {
    try { await navigator.share({ title: 'Interest Receipt', text }); return; }
    catch (err) { if (err instanceof DOMException && err.name === 'AbortError') return; }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
}

export default function BatchWorkspace({ defaultRate, onBatchSaved }: Props) {
  const [principal, setPrincipal] = useState('');
  const [startDate, setStartDate] = useState('');
  // rate and endDate persist across entries — user rarely changes them
  const [rate, setRate] = useState(String(defaultRate));
  const [endDate, setEndDate] = useState(today());
  const [formError, setFormError] = useState('');

  const fromDateRef = useRef<HTMLInputElement>(null);

  const [entries, setEntries] = useState<SavedLoanEntry[]>([]);
  const [acPending, setAcPending] = useState(false);
  const [toast, setToast] = useState('');
  const [sharePreview, setSharePreview] = useState<{ batch: SavedBatch; text: string } | null>(null);
  const [closingSharePreview, setClosingSharePreview] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(true);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  // sync rate field when config changes via settings
  useEffect(() => { setRate(String(defaultRate)); }, [defaultRate]);

  useEffect(() => {
    if (entries.length === 0 || !showSwipeHint) return;
    const t = window.setTimeout(() => setShowSwipeHint(false), 5000);
    return () => window.clearTimeout(t);
  }, [entries.length, showSwipeHint]);

  function handleAdd() {
    const p = parseFloat(principal);
    const r = parseFloat(rate);
    if (!(p > 0)) { setFormError('Enter a principal amount'); return; }
    if (!(r > 0)) { setFormError('Enter a valid rate'); return; }
    if (r > 100) { setFormError('Rate looks too high — check %/mo value'); return; }
    if (!startDate)  { setFormError('Select a start date'); return; }
    if (!endDate)    { setFormError('Select an end date'); return; }
    if (startDate > endDate) { setFormError('Start date must be before end date'); return; }

    const res = calcSI(p, r, startDate, endDate);
    setEntries(prev => [
      ...prev,
      { id: crypto.randomUUID(), principal: p, ratePerMonth: r, startDate, endDate, days: res.days, interest: res.interest },
    ]);
    // clear only the fields that change per entry
    setPrincipal('');
    setStartDate('');
    setFormError('');
  }

  const totalPrincipal = entries.reduce((s, e) => s + e.principal, 0);
  const totalInterest  = entries.reduce((s, e) => s + e.interest, 0);
  const grandTotal     = totalPrincipal + totalInterest;

  function handleSaveShare() {
    if (entries.length === 0) return;
    const batch: SavedBatch = {
      id: crypto.randomUUID(),
      entries,
      totalPrincipal,
      totalInterest,
      grandTotal,
      createdAt: Date.now(),
    };
    setClosingSharePreview(false);
    setSharePreview({ batch, text: buildShareText(batch) });
  }

  async function handleConfirmShare() {
    if (!sharePreview) return;
    setClosingSharePreview(false);
    await saveBatch(sharePreview.batch);
    onBatchSaved();
    setSharePreview(null);
    await doShare(sharePreview.text, () => showToast('Copied to clipboard ✓'));
  }

  function handleCancelShare() {
    setClosingSharePreview(true);
    window.setTimeout(() => {
      setSharePreview(null);
      setClosingSharePreview(false);
    }, 220);
  }

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* ── Persistent entry form ── */}
      <div className="shrink-0 bg-white px-4 pt-4 pb-4 border-b border-slate-100">

        {/* Principal + Rate on one row */}
        <div className="flex gap-2.5 mb-2.5">
          <div className="flex-1 min-w-0">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Principal
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-lg select-none pointer-events-none">
                ₹
              </span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={principal ? Number(principal).toLocaleString('en-IN') : ''}
                onChange={e => { setPrincipal(e.target.value.replace(/\D/g, '')); setFormError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); fromDateRef.current?.focus(); } }}
                className="w-full h-14 pl-9 pr-3 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-400 text-2xl font-bold text-slate-800 placeholder:text-slate-200 focus:outline-none transition-colors"
                autoFocus
              />
            </div>
          </div>
          <div className="w-[88px] shrink-0">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Rate
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={rate}
                onChange={e => setRate(e.target.value)}
                className="w-full h-14 px-2 pb-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-400 text-2xl font-bold text-slate-800 text-center focus:outline-none transition-colors"
              />
              <span className="absolute bottom-2.5 left-0 right-0 text-center text-[10px] text-slate-400 font-semibold pointer-events-none">
                %/mo
              </span>
            </div>
          </div>
        </div>

        {/* Dates row — FROM is visually loud (needs input), TO is quiet (pre-set to today) */}
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5 flex items-center gap-1.5"
              style={{ color: startDate ? '#818cf8' : '#6366f1' }}>
              From
              {!startDate && <span className="text-[9px] font-bold bg-indigo-100 text-indigo-500 px-1.5 py-0.5 rounded-full leading-none">enter first</span>}
            </label>
            <input
              ref={fromDateRef}
              type="date"
              lang="en-GB"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setFormError(''); }}
              className={`w-full h-11 px-3 rounded-xl border-2 text-sm text-slate-700 focus:outline-none transition-colors ${
                startDate
                  ? 'bg-indigo-50/40 border-indigo-100 focus:border-indigo-400'
                  : 'bg-white border-indigo-200 focus:border-indigo-500 shadow-sm shadow-indigo-100'
              }`}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              To
              {endDate === today() && <span className="text-[9px] font-bold bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full leading-none">today</span>}
            </label>
            <input
              type="date"
              lang="en-GB"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-emerald-50/60 border-2 border-emerald-100 focus:border-emerald-400 text-sm text-slate-700 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Error + Add button */}
        <div className="flex items-center gap-3">
          <p className={`text-xs font-medium text-red-400 flex-1 transition-opacity ${formError ? 'opacity-100' : 'opacity-0'}`}>
            {formError || '\u00a0'}
          </p>
          <button
            onClick={handleAdd}
            className="shrink-0 h-11 px-7 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-700 text-white font-bold text-sm active:scale-95 transition-transform shadow-md shadow-indigo-200"
          >
            + Add
          </button>
        </div>
      </div>

      {/* ── Compact result rows ── */}
      <div className="flex-1 overflow-y-auto thin-scrollbar px-4 pt-3 pb-2 space-y-2">
        {entries.length > 0 && showSwipeHint && (
          <div
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-500 px-3 py-1 text-[11px] font-semibold"
            style={{ animation: 'fadeSlideIn 0.2s ease-out' }}
          >
            <span>←</span>
            <span>Swipe left to delete</span>
          </div>
        )}
        {entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 text-slate-300 gap-2 select-none">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl mb-1">
              🧾
            </div>
            <p className="text-sm font-medium text-slate-400">No loans yet</p>
            <p className="text-xs text-slate-300">Fill the form above and tap + Add</p>
          </div>
        )}
        {entries.map(entry => (
          <LoanRow
            key={entry.id}
            entry={entry}
            onRemove={() => setEntries(prev => prev.filter(e => e.id !== entry.id))}
          />
        ))}
      </div>

      {/* ── Totals bar ── */}
      {entries.length > 0 && (
        <div className="shrink-0 px-4 py-3 bg-white border-t-2 border-slate-100">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-slate-400">Principal</span>
            <span className="text-sm font-semibold text-slate-500">{fmtINR(totalPrincipal)}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-slate-400">+ Interest</span>
            <span className="text-sm font-bold text-indigo-500">{fmtINR(totalInterest)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-200">
            <span className="text-sm font-bold text-slate-700">Total Due</span>
            <span className="text-2xl font-black text-emerald-600">{fmtINR(grandTotal)}</span>
          </div>
        </div>
      )}

      {/* ── Action bar ── */}
      <div className="shrink-0 px-4 py-3 bg-white border-t border-slate-100 pb-safe">
        <div className="flex items-center gap-2">
          {!acPending ? (
            <button
              onClick={() => entries.length > 0 && setAcPending(true)}
              disabled={entries.length === 0}
              className="w-14 h-12 rounded-2xl bg-red-50 text-red-400 font-black text-sm disabled:opacity-20 active:scale-90 transition-all"
            >
              AC
            </button>
          ) : (
            <div
              className="flex gap-1.5 origin-left"
              style={{ animation: 'spreadIn 0.5s cubic-bezier(0.22, 1, 0.36, 1)' }}
            >
              <button
                onClick={() => { setEntries([]); setAcPending(false); }}
                className="h-12 px-4 rounded-2xl bg-red-500 text-white font-bold text-sm active:scale-90 transition-all"
              >
                Clear all
              </button>
              <button
                onClick={() => setAcPending(false)}
                className="h-12 px-3 rounded-2xl bg-slate-100 text-slate-500 text-sm active:scale-90 transition-all"
              >
                Cancel
              </button>
            </div>
          )}
          <button
            onClick={handleSaveShare}
            disabled={entries.length === 0}
            className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm disabled:opacity-25 active:scale-95 transition-transform shadow-md shadow-emerald-200 flex items-center justify-center gap-2"
          >
            <span>Save & Share</span>
            <span className="text-base">↗</span>
          </button>
        </div>
      </div>

      {/* ── Share preview popup ── */}
      {sharePreview && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            style={{
              animation: closingSharePreview
                ? 'slideDownFade 0.22s ease-in forwards'
                : 'slideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <div className="px-4 pt-4 pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Preview</h3>
            </div>
            <pre className="max-h-[50vh] overflow-y-auto thin-scrollbar px-4 py-3 text-[11px] leading-5 text-slate-700 whitespace-pre-wrap break-words bg-slate-50/60">
              {sharePreview.text}
            </pre>
            <div className="px-4 py-3 border-t border-slate-100 flex gap-2 bg-white">
              <button
                onClick={handleCancelShare}
                className="flex-1 h-11 rounded-2xl bg-slate-100 text-slate-600 text-sm font-semibold active:scale-95 transition-transform"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmShare}
                className="flex-1 h-11 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold active:scale-95 transition-transform"
              >
                Share
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast notification ── */}
      {toast && (
        <div
          className="fixed bottom-24 left-1/2 z-50 bg-slate-800/90 backdrop-blur-sm text-white text-xs font-semibold px-5 py-2.5 rounded-full shadow-xl pointer-events-none"
          style={{ animation: 'toastIn 0.2s ease-out', transform: 'translateX(-50%)' }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
