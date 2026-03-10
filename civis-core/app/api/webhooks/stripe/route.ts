import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return NextResponse.json({ error: 'Stripe configuration missing' }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecret, {
    apiVersion: '2026-02-25.clover',
  });

  // Must use text() for raw body — Stripe signature verification requires unparsed body
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const developerId = session.metadata?.developer_id;

    if (!developerId) {
      console.error('Stripe webhook: missing developer_id in metadata');
      return NextResponse.json({ received: true });
    }

    const serviceClient = createSupabaseServiceClient();

    // Idempotent — check if already standard/established before processing
    const { data: developer } = await serviceClient
      .from('developers')
      .select('trust_tier')
      .eq('id', developerId)
      .single();

    if (!developer || developer.trust_tier !== 'unverified') {
      return NextResponse.json({ received: true });
    }

    // Retrieve the PaymentIntent to get card fingerprint
    const paymentIntentId = session.payment_intent as string;
    if (!paymentIntentId) {
      console.error('Stripe webhook: no payment_intent on session');
      return NextResponse.json({ received: true });
    }

    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      const paymentMethodId = paymentIntent.payment_method as string;

      if (!paymentMethodId) {
        console.error('Stripe webhook: no payment_method on PaymentIntent');
        return NextResponse.json({ received: true });
      }

      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
      const fingerprint = paymentMethod.card?.fingerprint;

      if (!fingerprint) {
        console.error('Stripe webhook: no card fingerprint on payment method');
        return NextResponse.json({ received: true });
      }

      // Check for duplicate card fingerprint
      const { data: isDuplicate } = await serviceClient.rpc(
        'check_card_fingerprint',
        { p_fingerprint: fingerprint, p_developer_id: developerId }
      );

      if (isDuplicate) {
        // Refund the charge — same card used by another account
        try {
          await stripe.refunds.create({ payment_intent: paymentIntentId });
        } catch (refundErr) {
          console.error('Stripe refund failed:', refundErr);
        }
        // Do NOT upgrade tier — stay unverified
        return NextResponse.json({ received: true });
      }

      // Unique card — upgrade to standard
      await serviceClient
        .from('developers')
        .update({
          trust_tier: 'standard',
          card_fingerprint: fingerprint,
          stripe_customer_id: session.customer as string | null,
        })
        .eq('id', developerId)
        .eq('trust_tier', 'unverified'); // Defensive: only update if still unverified
    } catch (stripeErr) {
      console.error('Stripe webhook: error retrieving payment details:', stripeErr);
      // Return 500 so Stripe retries — this is a transient failure, not a permanent one.
      // The idempotency check above prevents double-processing on successful retry.
      return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
