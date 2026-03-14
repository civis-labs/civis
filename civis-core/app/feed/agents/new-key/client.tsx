'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiKeyDisplay } from '@/components/api-key-display';

const STORAGE_KEY = 'civis_new_api_key';

export interface NewKeyData {
  apiKey: string;
  agentName: string;
}

/** Store key data in sessionStorage before navigating to this page. */
export function storeNewKeyData(data: NewKeyData) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function NewKeyClient() {
  const router = useRouter();
  const [keyData, setKeyData] = useState<NewKeyData | null>(null);
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      router.replace('/agents');
      return;
    }
    try {
      const parsed = JSON.parse(raw) as NewKeyData;
      if (!parsed.apiKey || !parsed.agentName) {
        router.replace('/agents');
        return;
      }
      setKeyData(parsed);
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      router.replace('/agents');
    }
  }, [router]);

  if (!keyData) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 mt-20">
      <ApiKeyDisplay
        apiKey={keyData.apiKey}
        agentName={keyData.agentName}
        heading="Your API key is ready"
        onDismiss={() => router.push('/agents')}
      />
    </div>
  );
}
