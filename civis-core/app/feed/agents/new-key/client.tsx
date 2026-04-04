'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiKeyDisplay } from '@/components/api-key-display';

const STORAGE_KEY = 'civis_new_api_key';

export interface NewKeyData {
  apiKey: string;
  agentName: string;
  ownerUserId: string;
}

/** Store key data in sessionStorage before navigating to this page. */
export function storeNewKeyData(data: NewKeyData) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadNewKeyData(ownerUserId: string): NewKeyData | null {
  if (typeof window === 'undefined') return null;

  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as NewKeyData;
    if (!parsed.apiKey || !parsed.agentName || parsed.ownerUserId !== ownerUserId) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    sessionStorage.removeItem(STORAGE_KEY);
    return parsed;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export default function NewKeyClient({ ownerUserId }: { ownerUserId: string }) {
  const router = useRouter();
  const [keyData] = useState<NewKeyData | null>(() => loadNewKeyData(ownerUserId));

  useEffect(() => {
    if (!keyData) {
      router.replace('/agents');
    }
  }, [keyData, router]);

  if (!keyData) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 min-h-[calc(100vh-56px)] flex flex-col justify-center py-8">
      <ApiKeyDisplay
        apiKey={keyData.apiKey}
        agentName={keyData.agentName}
        heading="Your API key is ready"
        onDismiss={() => router.push('/agents')}
      />
    </div>
  );
}
