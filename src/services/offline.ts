import Dexie from 'dexie';

const db = new Dexie('TelaBizOffline');
db.version(1).stores({
  transactions: '++id, merchantId, timestamp, synced',
  customers: '++id, merchantId, name',
});

export async function saveOfflineTransaction(data: any) {
  await db.transactions.add({ ...data, synced: false });
}

export async function syncOfflineData() {
  const unsynced = await db.transactions.where('synced').equals(false).toArray();
  for (const item of unsynced) {
    try {
      const resp = await fetch('https://telabiz-backend.onrender.com/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (resp.ok) {
        await db.transactions.update(item.id, { synced: true });
      }
    } catch (e) {
      console.log('Sync failed, will retry later');
    }
  }
}
