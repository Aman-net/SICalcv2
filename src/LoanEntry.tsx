import { useRef, useState } from 'react';
import { fmtINR, fmtDate } from './calc';
import type { SavedLoanEntry } from './db';

interface Props {
  entry: SavedLoanEntry;
  onRemove: () => void;
}

export default function LoanRow({ entry, onRemove }: Props) {
  const minBilled = entry.days < 30;
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number | null>(null);
  const cardWidth = useRef(0);
  const reveal = cardWidth.current > 0 ? Math.min(Math.abs(dragX) / (cardWidth.current * 0.5), 1) : 0;

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    startX.current = e.clientX;
    cardWidth.current = e.currentTarget.getBoundingClientRect().width;
    setDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    setDragX(Math.min(0, dx));
  }

  function handlePointerUp() {
    if (cardWidth.current > 0 && Math.abs(dragX) >= cardWidth.current * 0.5) {
      onRemove();
      return;
    }
    startX.current = null;
    setDragX(0);
    setDragging(false);
  }

  return (
    <div className="relative">
      <div className="absolute inset-y-1.5 right-1.5 left-16 rounded-[20px] overflow-hidden pointer-events-none">
        <div
          className="h-full w-full bg-gradient-to-l from-red-500 via-rose-500 to-rose-400 flex items-center justify-end px-4 text-white"
          style={{ opacity: 0.18 + reveal * 0.82 }}
        >
          <div
            className="flex items-center gap-2"
            style={{ transform: `translateX(${(1 - reveal) * 14}px)`, opacity: 0.35 + reveal * 0.65 }}
          >
            <span className="text-sm leading-none">🗑</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em]">Delete</span>
          </div>
        </div>
      </div>
      <div
        className="bg-white rounded-2xl shadow-sm shadow-slate-200 border border-slate-100 overflow-hidden touch-pan-y"
        style={{
          animation: 'fadeSlideIn 0.18s ease-out',
          transform: `translateX(${dragX}px)`,
          transition: dragging ? 'none' : 'transform 0.2s ease-out',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
      {/* Top row: principal · interest */}
      <div className="flex items-center gap-3 px-3.5 pt-3 pb-2">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest leading-none mb-0.5">Principal</p>
          <p className="text-[19px] font-bold text-slate-800 tracking-tight truncate">{fmtINR(entry.principal)}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest leading-none mb-0.5">Interest</p>
          <p className="text-base font-bold text-indigo-600 leading-none">{fmtINR(entry.interest)}</p>
        </div>
      </div>

      {/* Bottom row: metadata strip */}
      <div className="flex items-center gap-1.5 px-3.5 pb-3 text-[11px] text-slate-400">
        <span className="bg-slate-100 text-slate-500 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0">
          {entry.ratePerMonth}%/mo
        </span>
        <span className="truncate">{fmtDate(entry.startDate)}</span>
        <span className="text-slate-300 shrink-0">→</span>
        <span className="truncate">{fmtDate(entry.endDate)}</span>
        <span className={`ml-auto shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
          minBilled ? 'bg-amber-50 text-amber-500' : 'bg-indigo-50 text-indigo-400'
        }`}>
          {minBilled ? `${entry.days}d→30d` : `${entry.days}d`}
        </span>
      </div>
      </div>
    </div>
  );
}
