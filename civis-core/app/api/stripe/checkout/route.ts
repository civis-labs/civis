import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { checkCheckoutRateLimit } from '@/lib/rate-limit';
import Stripe from 'stripe';

export async function POST() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return NextResponse.json({ error: 'Stripe configuration missing' }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecret, {
    apiVersion: '2026-02-25.clover',
  });

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const rateLimit = await checkCheckoutRateLimit(user.id);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many checkout attempts. Try again later.', reset: rateLimit.reset },
      { status: 429 }
    );
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Civis Identity Verification',
            },
            unit_amount: 100, // $1.00
          },
          quantity: 1,
        },
      ],
      customer_creation: 'always',
      metadata: { developer_id: user.id },
      payment_intent_data: {
        metadata: { developer_id: user.id },
      },
      success_url: `${getBaseUrl()}/feed/agents?verified=true`,
      cancel_url: `${getBaseUrl()}/feed/verify?cancelled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

function getBaseUrl(): string {
  // In production, use the app domain
  if (process.env.VERCEL_ENV === 'production') {
    return 'https://app.civis.run';
  }
  // In preview/dev, use the Vercel URL or localhost
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://app.localhost:3000';
}
