# SI Calc — Simple Interest Calculator for Moneylenders

A fast, mobile-first simple interest calculator built as a Progressive Web App (PWA). It follows the common Indian moneylender convention where interest is calculated on a **30-day month basis**.

## Features

- **30-day billing convention** — `SI = P × (R/100) × (days/30)`, with loans under 30 days billed as a full month
- **Batch entry** — add multiple loans to one batch and get combined totals
- **Per-loan interest rate** — every entry can carry its own `%/mo` rate
- **Date wheel picker** — mobile-style day/month/year scrollers
- **Compact duration display** — durations shown as `4y 2mo`, `3mo 5d`, `1mo` (30-day month / 360-day year basis)
- **Share as receipt** — clean, table-aligned WhatsApp text with the full breakdown
- **History** — saved batches grouped by month with sticky headers, expandable details, swipe-to-delete, and **undo**
- **Haptics** — subtle vibration feedback on add/delete/save (Android)
- **Offline-first PWA** — installable, works without a connection
- **Settings** — default rate pre-fills every new entry
- **Local-only storage** — all data stays in your browser's IndexedDB

## Tech Stack

- [React](https://react.dev) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/) v4
- [Dexie](https://dexie.org/) — IndexedDB wrapper for local storage
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) — offline support & installability

## Getting Started

```bash
npm install
npm run dev
```

For testing on a phone over your local network:

```bash
npm run dev -- --host 0.0.0.0
```

Then open the printed Network URL (e.g. `http://192.168.x.x:5173/SICalcv2/`) on your device.

Build for production:

```bash
npm run build
npm run preview
```

## How Interest Works

Interest is computed on a 30-day month basis:

```
interest = principal × (rate per month / 100) × (days / 30)
```

- `days` = calendar days between the start and end date
- Any loan shorter than 30 days is still billed as a full 30-day month
- Durations are displayed as months/years where `1 month = 30 days` and `1 year = 12 months = 360 days`, so the display always matches the math

## Data & Privacy

Everything is stored locally in your browser via IndexedDB — no accounts, no servers, no tracking of your loan data (only anonymous page-view/event analytics are collected).

## License

Private project.