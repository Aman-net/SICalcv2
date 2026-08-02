import Dexie, { type Table } from 'dexie';

export interface ConfigRecord {
  key: string;
  value: number;
}

export interface SavedLoanEntry {
  id: string;
  principal: number;
  ratePerMonth: number;
  startDate: string;
  endDate: string;
  days: number;
  interest: number;
}

export interface SavedBatch {
  id: string;
  entries: SavedLoanEntry[];
  totalPrincipal: number;
  totalInterest: number;
  grandTotal: number;
  createdAt: number;
}

class SICalcDB extends Dexie {
  config!: Table<ConfigRecord, string>;
  batches!: Table<SavedBatch, string>;

  constructor() {
    super('sicalc3-db');
    this.version(1).stores({
      config: 'key',
      batches: 'id, createdAt',
    });
  }
}

export const db = new SICalcDB();

export const DEFAULT_RATE = 2;

export async function getRate(): Promise<number> {
  const rec = await db.config.get('ratePerMonth');
  return rec?.value ?? DEFAULT_RATE;
}

export async function saveRate(rate: number): Promise<void> {
  await db.config.put({ key: 'ratePerMonth', value: rate });
}

export async function saveBatch(batch: SavedBatch): Promise<void> {
  await db.batches.put(batch);
}

export async function getBatches(): Promise<SavedBatch[]> {
  return db.batches.orderBy('createdAt').reverse().toArray();
}

export async function deleteBatch(id: string): Promise<void> {
  await db.batches.delete(id);
}
