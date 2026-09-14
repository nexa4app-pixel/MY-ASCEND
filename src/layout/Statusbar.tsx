import React, { useEffect, useState } from 'react';
import { Database, Laptop, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCurrentTime } from '../hooks/useCurrentTime';
import { useSettingsStore } from '../store/useSettingsStore';
import { db } from '../db/client';

export const Statusbar: React.FC = () => {
  const { utcDisplay } = useCurrentTime();
  const deviceId = useSettingsStore((state) => state.settings.device_id);
  const [schemaVersion, setSchemaVersion] = useState<number | null>(null);
  const [isDbConnected, setIsDbConnected] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const checkDb = async () => {
      try {
        const ping = await db.ping();
        const ver = await db.getSchemaVersion();
        if (isMounted) {
          setIsDbConnected(ping.status === 'healthy');
          setSchemaVersion(ver);
        }
      } catch {
        if (isMounted) {
          setIsDbConnected(false);
        }
      }
    };

    checkDb();
    const interval = setInterval(checkDb, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <footer className="h-7 bg-[#f3f3f3] dark:bg-[#181818] border-t border-black/8 dark:border-white/8 px-4 flex items-center justify-between text-[11px] text-[#616161] dark:text-[#8a8a8a] select-none font-mono shrink-0">
      {/* Left: DB Status & Schema Version */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          {isDbConnected ? (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <CheckCircle2 className="w-3 h-3 hidden sm:inline" />
              <span>SQLite Connected</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-500">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <AlertCircle className="w-3 h-3" />
              <span>SQLite Offline</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-[#8a8a8a]">
          <Database className="w-3 h-3" />
          <span>Schema v{schemaVersion ?? 4}</span>
        </div>
      </div>

      {/* Right: Active Device ID & UTC Clock */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-1.5">
          <Laptop className="w-3 h-3 text-[#8a8a8a]" />
          <span className="truncate max-w-[140px]" title={deviceId}>
            {deviceId}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[#1f1f1f] dark:text-white font-medium">
          <Clock className="w-3 h-3 text-[#0078d4]" />
          <span>{utcDisplay}</span>
        </div>
      </div>
    </footer>
  );
};
