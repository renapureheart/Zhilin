import type {Entry, PersonalLink} from './forest';

export type ForestData = {entries: Entry[]; links: PersonalLink[]};
const databaseName = 'zhilin-personal-forest';
const storeName = 'state';
const stateKey = 'forest';
const legacyKey = 'zhilin-preview-entries';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('此浏览器未开放本地数据库。'));
      return;
    }
    const request = window.indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('无法打开本地数据库。'));
    request.onblocked = () => reject(new Error('请关闭其他打开的知林页面后重试。'));
  });
}

function readSnapshot(database: IDBDatabase): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const request = database.transaction(storeName, 'readonly').objectStore(storeName).get(stateKey);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('读取失败。'));
  });
}

function writeSnapshot(database: IDBDatabase, data: ForestData): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).put(data, stateKey);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('保存失败。'));
    transaction.onabort = () => reject(transaction.error ?? new Error('保存中断。'));
  });
}

// Older previews saved an array in localStorage. Leave that copy intact as a recovery point.
export async function loadForest(): Promise<ForestData> {
  const database = await openDatabase();
  try {
    const snapshot = await readSnapshot(database);
    if (snapshot !== undefined) return parseForest(snapshot);
    const legacy = window.localStorage.getItem(legacyKey);
    const entries = legacy ? JSON.parse(legacy) as unknown : [];
    if (!Array.isArray(entries)) throw new Error('旧版学习记录格式不正确。');
    const data = parseForest({entries, links: []});
    await writeSnapshot(database, data);
    return data;
  } finally {
    database.close();
  }
}

export async function saveForest(data: ForestData): Promise<void> {
  const database = await openDatabase();
  try {
    await writeSnapshot(database, data);
  } finally {
    database.close();
  }
}

export function parseForest(input: unknown): ForestData {
  if (!input || typeof input !== 'object') throw new Error('文件不是知林备份。');
  const value = input as {entries?: unknown; links?: unknown};
  if (!Array.isArray(value.entries) || !Array.isArray(value.links)) throw new Error('备份缺少学习记录或知识联系。');
  for (const entry of value.entries) {
    if (!entry || typeof entry.id !== 'string' || typeof entry.title !== 'string' ||
        !Array.isArray(entry.topics) || !entry.topics.every((topic: unknown) => typeof topic === 'string') ||
        typeof entry.created !== 'string') throw new Error('备份中的学习记录格式不正确。');
  }
  for (const link of value.links) {
    if (!link || typeof link.id !== 'string' || typeof link.a !== 'string' ||
        typeof link.b !== 'string' || typeof link.title !== 'string' ||
        typeof link.created !== 'string') throw new Error('备份中的知识联系格式不正确。');
  }
  return {entries: value.entries as Entry[], links: value.links as PersonalLink[]};
}
