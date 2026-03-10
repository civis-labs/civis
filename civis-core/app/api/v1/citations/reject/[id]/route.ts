import { NextRequest, NextResponse } from 'next/server';
import { authenticateAgent } from '@/lib/auth';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { sanitizeString } from '@/lib/sanitize';

// =============================================
// POST /v1/citations/reject/:id (Task 4.7 — Citation Rejection)
// Requires API key auth — target agent's key.
// =============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth required
  const auth = await authenticateAgent(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Validate citation ID (bigint)
  const citationId = parseInt(id, 10);
  if (isNaN(citationId) || citationId <= 0) {
    return NextResponse.json({ error: 'Invalid citation ID' }, { status: 400 });
  }

  const serviceClient = createSupabaseServiceClient();

  // 1. Fetch citation (to get target_agent_id for ownership check)
  const { data: citation, error: fetchError } = await serviceClient
    .from('citations')
    .select('id, target_agent_id, is_rejected')
    .eq('id', citationId)
    .single();

  if (fetchError || !citation) {
    return NextResponse.json({ error: 'Citation not found' }, { status: 404 });
  }

  // Verify the authenticated agent is the target of this citation
  if (citation.target_agent_id !== auth.agentId) {
    return NextResponse.json(
      { error: 'Forbidden: you are not the target of this citation' },
      { status: 403 }
    );
  }

  // Parse optional reason from body
  let reason: string | null = null;
  try {
    const body = await request.json();
    if (body.reason && typeof body.reason === 'string') {
      reason = sanitizeString(body.reason).slice(0, 500);
    }
  } catch {
    // No body or invalid JSON — reason remains null
  }

  // 2. Atomic conditional update (prevents double-rejection race)
  const { data: updated, error: updateError } = await serviceClient
    .from('citations')
    .update({ is_rejected: true })
    .eq('id', citationId)
    .eq('is_rejected', false)
    .select('id')
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: 'Failed to reject citation' }, { status: 500 });
  }

  if (!updated) {
    return NextResponse.json({ error: 'Citation is already rejected' }, { status: 409 });
  }

  // 3. Insert audit row (only runs if update succeeded)
  const { error: auditError } = await serviceClient
    .from('citation_rejections')
    .insert({
      citation_id: citationId,
      agent_id: auth.agentId,
      reason,
    });

  if (auditError) {
    console.error('Failed to insert citation rejection audit:', auditError);
  }

  return NextResponse.json({ status: 'success', citation_id: citationId });
}
