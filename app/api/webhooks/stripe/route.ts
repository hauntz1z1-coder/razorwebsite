import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Supabase client with service role for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Calculate tier based on amount in BRL
function getTier(amount: number): string {
  if (amount >= 100) return 'SURREAL'
  if (amount >= 50) return 'LENDA'
  if (amount >= 20) return 'ELITE'
  if (amount >= 10) return 'DIAMANTE'
  return 'PLATINA'
}

// Send notification to Discord
async function sendDiscordNotification(donor: { name: string; amount: number; tier: string }) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL
  if (!webhookUrl) return

  const tierColors: Record<string, number> = {
    SURREAL: 0x9945FF,
    LENDA: 0xFF6B35,
    ELITE: 0x4FFFB0,
    DIAMANTE: 0x45B7FF,
    PLATINA: 0x00CED1,
  }

  const tierEmojis: Record<string, string> = {
    SURREAL: '🌟',
    LENDA: '🔥',
    ELITE: '💎',
    DIAMANTE: '💠',
    PLATINA: '⭐',
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            title: `${tierEmojis[donor.tier]} Nova Doacao Recebida!`,
            color: tierColors[donor.tier] || 0x00ff88,
            fields: [
              { name: 'Doador', value: donor.name, inline: true },
              { name: 'Valor', value: `R$ ${donor.amount.toFixed(2)}`, inline: true },
              { name: 'Tier', value: donor.tier, inline: true },
            ],
            footer: { text: 'Razor Team - Sistema de Patrocinadores' },
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    })
  } catch (error) {
    console.error('Erro ao enviar para Discord:', error)
  }
}

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  // If no webhook secret, process without verification (for testing)
  let event: Stripe.Event

  try {
    if (process.env.STRIPE_WEBHOOK_SECRET && signature) {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      )
    } else {
      // For testing without webhook signature
      event = JSON.parse(body) as Stripe.Event
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    // Get donor info from metadata
    const donorName = session.metadata?.donor_name || 'Anonimo'
    const amountBrl = parseFloat(session.metadata?.amount_brl || '0')

    if (amountBrl > 0) {
      const tier = getTier(amountBrl)

      // Save to Supabase
      try {
        const { error } = await supabase.from('donors').insert({
          name: donorName,
          email: session.customer_email || null,
          amount: amountBrl,
          tier: tier,
          transaction_id: session.id,
        })

        if (error) {
          console.error('Erro ao salvar no Supabase:', error)
        } else {
          console.log(`Doador ${donorName} salvo com sucesso!`)
        }
      } catch (err) {
        console.error('Erro ao conectar com Supabase:', err)
      }

      // Send Discord notification
      await sendDiscordNotification({
        name: donorName,
        amount: amountBrl,
        tier: tier,
      })
    }
  }

  return NextResponse.json({ received: true })
}
