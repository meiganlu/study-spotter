export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Runs a task on each item with at most `limit` running at the same time
export async function runWithLimit<T>(items: T[], limit: number, task: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  // Each worker keeps taking the next item until none are left
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      await task(item);
    }
  });
  await Promise.all(workers);
}
