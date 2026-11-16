import { useEffect, useState } from 'react';
import { Scale } from 'lucide-react';
import { getStoredToken } from '../lib/api.ts';

interface OfficeLogoProps {
  logoFilename?: string;
  sizeClass?: string;
  refreshKey?: number;
}

export function OfficeLogo({
  logoFilename,
  sizeClass = 'w-12 h-12',
  refreshKey = 0,
}: OfficeLogoProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!logoFilename) {
      setBlobUrl(null);
      return;
    }

    let active = true;
    let objectUrl: string | null = null;
    const token = getStoredToken();

    fetch(`/api/settings/logo?v=${encodeURIComponent(logoFilename)}&r=${refreshKey}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error('logo unavailable');
        return res.blob();
      })
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => {
        if (active) setBlobUrl(null);
      });

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [logoFilename, refreshKey]);

  if (blobUrl) {
    return (
      <img
        src={blobUrl}
        alt="Logo Kantor Notaris"
        referrerPolicy="no-referrer"
        className={`${sizeClass} object-contain rounded-lg border border-slate-200 bg-white p-1 shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-lg bg-[#0F1E36] text-amber-400 flex items-center justify-center shrink-0`}
    >
      <Scale className="w-6 h-6" />
    </div>
  );
}
