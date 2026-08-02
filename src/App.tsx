import { useEffect, useState } from 'react';
import BatchWorkspace from './BatchWorkspace';
import History from './History';
import { getRate, saveRate } from './db';

type Tab = 'calculator' | 'history';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function App() {
  const [tab, setTab] = useState<Tab>('calculator');
  const [rate, setRate] = useState(2);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsRate, setSettingsRate] = useState('');
  const [historyKey, setHistoryKey] = useState(0);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(true);

  useEffect(() => {
    getRate().then(r => {
      setRate(r);
      setSettingsRate(String(r));
    });
  }, []);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setIsInstalled(standalone);

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    }

    function handleInstalled() {
      setIsInstalled(true);
      setInstallPrompt(null);
      setShowInstallBanner(false);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  async function handleSaveSettings() {
    const r = parseFloat(settingsRate);
    if (isNaN(r) || r <= 0) return;
    await saveRate(r);
    setRate(r);
    setShowSettings(false);
  }

  function handleBatchSaved() {
    setHistoryKey(k => k + 1);
  }

  function openSettings() {
    setSettingsRate(String(rate));
    setShowSettings(true);
  }

  async function handleInstallApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setInstallPrompt(null);
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 max-w-lg mx-auto relative">
      {/* ── Header ── */}
      <header className="shrink-0 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-3.5 flex items-center justify-between">
        <h1 className="text-xl font-black tracking-tight leading-none">SI Calc</h1>
        <button
          onClick={openSettings}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 active:scale-90 transition-all text-lg"
          aria-label="Settings"
        >
          ⚙️
        </button>
      </header>

      {installPrompt && !isInstalled && showInstallBanner && (
        <div className="shrink-0 px-4 pt-3">
          <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 flex items-center gap-3 shadow-sm shadow-emerald-100/60">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800">Install SI Calc</p>
              <p className="text-xs text-slate-500 mt-0.5">Add it to your home screen for faster offline use.</p>
            </div>
            <button
              onClick={() => setShowInstallBanner(false)}
              className="h-9 px-3 rounded-xl bg-white/80 text-slate-500 text-xs font-semibold active:scale-95 transition-transform"
            >
              Later
            </button>
            <button
              onClick={handleInstallApp}
              className="h-9 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold active:scale-95 transition-transform shadow-sm shadow-emerald-200"
            >
              Install
            </button>
          </div>
        </div>
      )}

      {/* ── Tab Bar ── */}
      <div className="shrink-0 bg-white border-b border-slate-100 flex">
        {(['calculator', 'history'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === t
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {t === 'calculator' ? '🧮 Calculator' : '📋 History'}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className={`flex-1 min-h-0 ${tab === 'calculator' ? 'block' : 'hidden'}`}>
          <BatchWorkspace defaultRate={rate} onBatchSaved={handleBatchSaved} />
        </div>
        <div className={`flex-1 min-h-0 ${tab === 'history' ? 'block' : 'hidden'}`}>
          <History refreshKey={historyKey} />
        </div>
      </div>

      {/* ── Settings Bottom Sheet ── */}
      {showSettings && (
        <div
          className="absolute inset-0 z-50 bg-black/50 flex items-end backdrop-blur-sm"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="w-full bg-white rounded-t-3xl px-6 pt-3 pb-8 space-y-5"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'slideUp 0.35s cubic-bezier(0.22, 1, 0.36, 1)' }}
          >
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto" />
            <h2 className="text-lg font-bold text-slate-800">Settings</h2>

            <div>
              <label className="text-sm font-medium text-slate-600 block mb-2">
                Default Interest Rate
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={settingsRate}
                  onChange={e => setSettingsRate(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveSettings()}
                  className="w-full h-14 px-4 pr-20 rounded-2xl bg-slate-50 border-2 border-slate-200 text-2xl font-bold text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors"
                  autoFocus
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">
                  %/month
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Pre-fills the rate on every new loan entry
              </p>
            </div>

            <button
              onClick={handleSaveSettings}
              className="w-full h-12 bg-indigo-600 text-white rounded-2xl font-semibold text-base active:scale-95 transition-transform"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
