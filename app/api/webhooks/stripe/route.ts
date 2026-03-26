import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Supabase client with SERVICE ROLE KEY (not anon key) for server-side operations
// URL padrao: https://euamfkbnnjsfjpjredvre.supabase.co
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://euamfkbnnjsfjpjredvre.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

// Calculate tier based on amount in BRL (Gold = R$100, Silver = R$50, Bronze = R$10)
function getTier(amount: number): string {
  if (amount >= 100) return 'GOLD'
  if (amount >= 50) return 'SILVER'
  return 'BRONZE'
}

// Send notification to Discord
async function sendDiscordNotification(donor: { name: string; amount: number; tier: string }) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL
  if (!webhookUrl) {
    console.log('[v0] DISCORD_WEBHOOK_URL nao configurado')
    return
  }

  const tierColors: Record<string, number> = {
    GOLD: 0xFFD700,
    SILVER: 0xC0C0C0,
    BRONZE: 0xCD7F32,
  }

  const tierEmojis: Record<string, string> = {
    GOLD: '🥇',
    SILVER: '🥈',
    BRONZE: '🥉',
  }

  try {
    console.log('[v0] Enviando notificacao para Discord...')
    const response = await fetch(webhookUrl, {
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
    console.log('[v0] Discord response status:', response.status)
  } catch (error) {
    console.error('[v0] Erro ao enviar para Discord:', error)
  }
}

export async function POST(request: Request) {
  console.log('[v0] ========== WEBHOOK STRIPE RECEBIDO ==========')
  
  let body: string
  try {
    body = await request.text()
    console.log('[v0] Body recebido, tamanho:', body.length)
  } catch (err) {
    console.error('[v0] Erro ao ler body:', err)
    return NextResponse.json({ error: 'Erro ao ler body' }, { status: 400 })
  }

  const headersList = await headers()
  const signature = headersList.get('stripe-signature')
  console.log('[v0] Signature presente:', !!signature)

  let event: Stripe.Event

  try {
    if (process.env.STRIPE_WEBHOOK_SECRET && signature) {
      console.log('[v0] Verificando assinatura do webhook...')
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      )
      console.log('[v0] Assinatura verificada com sucesso!')
    } else {
      console.log('[v0] Processando sem verificacao de assinatura (modo teste)')
      event = JSON.parse(body) as Stripe.Event
    }
  } catch (err) {
    console.error('[v0] Erro na verificacao da assinatura:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log('[v0] Tipo do evento:', event.type)

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    console.log('[v0] Checkout session ID:', session.id)

    // Pega o nome do customer_details (do formulario de pagamento do Stripe)
    const donorName = session.customer_details?.name || session.metadata?.donor_name || 'Anonimo'
    console.log('[v0] Nome do doador:', donorName)

    // Pega o valor do amount_total (em centavos) e converte para BRL
    const amountCents = session.amount_total || 0
    const amountBrl = amountCents / 100
    console.log('[v0] Valor em centavos:', amountCents)
    console.log('[v0] Valor em BRL:', amountBrl)

    if (amountBrl > 0) {
      const tier = getTier(amountBrl)
      console.log('[v0] Tier calculado:', tier)

      // Save to Supabase (tabela patrocinadores)
      console.log('[v0] Conectando ao Supabase...')
      console.log('[v0] URL:', supabaseUrl)
      console.log('[v0] Service Role Key presente:', !!supabaseKey)
      
      try {
        console.log('[v0] Inserindo no banco de dados...')
        const { data, error } = await supabase.from('patrocinadores').insert({
          nome: donorName,
          valor: amountBrl,
          elo: tier,
        }).select()

        if (error) {
          console.error('[v0] ERRO ao salvar no Supabase:', error.message)
          console.error('[v0] Detalhes do erro:', JSON.stringify(error))
        } else {
          console.log('[v0] SUCESSO! Doador salvo:', JSON.stringify(data))
        }
      } catch (err) {
        console.error('[v0] EXCECAO ao conectar com Supabase:', err)
      }

      // Send Discord notification
      await sendDiscordNotification({
        name: donorName,
        amount: amountBrl,
        tier: tier,
      })
    } else {
      console.log('[v0] Valor zerado, ignorando...')
    }
  } else {
    console.log('[v0] Evento ignorado (nao e checkout.session.completed)')
  }

  console.log('[v0] ========== WEBHOOK PROCESSADO ==========')
  return NextResponse.json({ received: true })
}
