// components/OfflineIndicator.tsx
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { useSyncQueue } from "../hooks/useSyncQueue";

/**
 * Drop this once near the top of your app layout (e.g. in App.tsx or a
 * shared header). It's self-contained — no props needed.
 */
export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const { stats } = useSyncQueue();

  if (isOnline && stats.pendingCount === 0) return null;

  return (
    <div
      className={`w-full text-center text-xs py-1.5 px-3 ${
        isOnline ? "bg-yellow-500 text-black" : "bg-slate-800 text-white"
      }`}
    >
      {!isOnline ? (
        <>📴 You're offline — reports will be saved and sent automatically once you're back online.</>
      ) : (
        <>🔄 Syncing {stats.pendingCount} pending report{stats.pendingCount === 1 ? "" : "s"}…</>
      )}
    </div>
  );
}