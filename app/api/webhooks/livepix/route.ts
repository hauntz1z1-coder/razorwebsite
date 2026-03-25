import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase client with service role for bypassing RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Elos e suas configuracoes
const ELOS = {
  SURREAL: { min: 100, color: 0x9b59b6, name: 'SURREAL' },
  LENDA: { min: 50, color: 0xff6b35, name: 'LENDA' },
  ELITE: { min: 20, color: 0x2ecc71, name: 'ELITE' },
  DIAMANTE: { min: 10, color: 0x3498db, name: 'DIAMANTE' },
  PLATINA: { min: 0, color: 0x1abc9c, name: 'PLATINA' },
}

// URLs das imagens dos elos
const ELO_IMAGES: Record<string, string> = {
  SURREAL: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unreal-NKFwkWJCckIcToSwhzSFvSCMl1Vx5V.png',
  LENDA: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/lenda-2czyILe0dMJkigiJTiesaL3jXcriU1.png',
  ELITE: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/elite-gGQZXBT7NxD1fnPmDOspGE6KZwAMWX.png',
  DIAMANTE: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/diamante-cQQEUfIwGewDPZcCUUR62YKPgHkS4Z.png',
  PLATINA: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/platina-nYbkDBYNCOvOwIMIdSwcHsdI5mbor9.png',
}

// Discord Webhook URL
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || ''

// Determinar o elo baseado no valor
function getElo(amount: number): keyof typeof ELOS {
  if (amount >= 100) return 'SURREAL'
  if (amount >= 50) return 'LENDA'
  if (amount >= 20) return 'ELITE'
  if (amount >= 10) return 'DIAMANTE'
  return 'PLATINA'
}

// Enviar notificacao para o Discord
async function sendDiscordNotification(name: string, amount: number, elo: keyof typeof ELOS, message?: string): Promise<void> {
  if (!DISCORD_WEBHOOK_URL) {
    console.log('[v0] Discord webhook URL nao configurada')
    return
  }

  const eloConfig = ELOS[elo]
  
  const fields = [
    {
      name: '💰 Valor',
      value: `R$ ${amount.toFixed(2)}`,
      inline: true,
    },
    {
      name: '🏆 Elo Conquistado',
      value: eloConfig.name,
      inline: true,
    },
  ]

  if (message) {
    fields.push({
      name: '💬 Mensagem',
      value: message,
      inline: false,
    })
  }

  const embed = {
    title: '💎 NOVA DOACAO RECEBIDA! 💎',
    description: `**${name}** acabou de apoiar a Razor Team!`,
    color: eloConfig.color,
    fields,
    thumbnail: {
      url: ELO_IMAGES[elo],
    },
    image: {
      url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo%20razor-hDpYnwWiCP8jfRz4tOZrBtLnGokpQr.png',
    },
    footer: {
      text: 'Razor Team - Obrigado pelo apoio!',
      icon_url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo%20razor-hDpYnwWiCP8jfRz4tOZrBtLnGokpQr.png',
    },
    timestamp: new Date().toISOString(),
  }

  const payload = {
    username: 'Razor Team Donations',
    avatar_url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo%20razor-hDpYnwWiCP8jfRz4tOZrBtLnGokpQr.png',
    embeds: [embed],
  }

  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    console.error('[v0] Erro ao enviar notificacao Discord:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Log para debug
    console.log('[v0] Webhook Livepix recebido:', JSON.stringify(body, null, 2))
    
    // Extrair dados da doacao (ajuste conforme o formato real do Livepix)
    // Livepix pode enviar em diferentes formatos
    const amount = parseFloat(body.amount || body.value || body.donation?.amount || body.payment?.amount || 0)
    const name = body.name || body.donor?.name || body.username || body.sender?.name || 'Anonimo'
    const email = body.email || body.donor?.email || body.sender?.email || null
    const message = body.message || body.donation?.message || body.text || null
    const transactionId = body.id || body.transaction_id || body.payment_id || Date.now().toString()
    
    if (amount <= 0) {
      return NextResponse.json({ error: 'Valor invalido' }, { status: 400 })
    }
    
    // Determinar o elo
    const elo = getElo(amount)
    
    // Verificar se ja existe doacao com este transaction_id
    const { data: existingDonation } = await supabase
      .from('donors')
      .select('id')
      .eq('transaction_id', transactionId)
      .single()
    
    if (existingDonation) {
      return NextResponse.json({ 
        success: true, 
        message: 'Doacao ja processada anteriormente'
      })
    }
    
    // Inserir nova doacao no Supabase
    const { data: donor, error } = await supabase
      .from('donors')
      .insert({
        name,
        email,
        amount,
        tier: elo,
        message,
        transaction_id: transactionId,
      })
      .select()
      .single()
    
    if (error) {
      console.error('[v0] Erro ao salvar no Supabase:', error)
      return NextResponse.json({ error: 'Erro ao salvar doacao' }, { status: 500 })
    }
    
    // Enviar notificacao para o Discord
    await sendDiscordNotification(name, amount, elo, message)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Doacao processada com sucesso',
      donor,
      elo 
    })
    
  } catch (error) {
    console.error('[v0] Erro ao processar webhook:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// GET para verificar se a API esta funcionando
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Webhook Livepix ativo',
    timestamp: new Date().toISOString()
  })
}
