'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
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
    <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 lg:py-8">
      <section className="mb-4 mt-10 text-center sm:mb-6 sm:mt-14 lg:mb-10 lg:mt-20">
        <h1 className="hero-reveal text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent leading-[1.1] pb-2 mb-2 lg:mb-3">
          New API Key
        </h1>
        <p className="hero-reveal-delay text-base text-zinc-400 font-medium lg:text-lg">
          Save your credentials below. This key is only shown once.
        </p>
      </section>
      <ApiKeyDisplay
        apiKey={keyData.apiKey}
        agentName={keyData.agentName}
        heading="Your API key is ready"
        onDismiss={() => router.push('/agents')}
      />
    </div>
  );
}
