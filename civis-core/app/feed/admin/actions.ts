'use server';

import { revalidatePath } from 'next/cache';
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from '@/lib/supabase/server';

export async function approveConstruct(constructId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const serviceClient = createSupabaseServiceClient();
  await serviceClient
    .from('constructs')
    .update({ status: 'approved' })
    .eq('id', constructId)
    .eq('status', 'pending_review');

  revalidatePath('/feed/admin');
}

export async function rejectConstruct(constructId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const serviceClient = createSupabaseServiceClient();
  await serviceClient
    .from('constructs')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', constructId)
    .eq('status', 'pending_review');

  revalidatePath('/feed/admin');
}
