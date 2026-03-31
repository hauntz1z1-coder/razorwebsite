import { NextRequest, NextResponse } from 'next/server'

/**
 * WEBHOOK LIVEPIX -> DISCORD
 * 
 * Este endpoint recebe webhooks do Livepix quando um pagamento e confirmado
 * e envia uma notificacao formatada para o Discord.
 * 
 * =====================================================
 * COMO CADASTRAR O WEBHOOK NO LIVEPIX:
 * =====================================================
 * 
 * 1. Acesse sua conta no Livepix: https://livepix.gg
 * 2. Va em Configuracoes > API/Integracao > Webhooks
 * 3. Clique em "Adicionar Webhook"
 * 4. URL do Webhook: https://seudominio.com/api/livepix/webhook
 * 5. Selecione o evento: "Pagamento Recebido" (payment.received)
 * 6. Salve a configuracao
 * 
 * OU via API do Livepix (POST):
 * 
 * curl -X POST https://api.livepix.gg/v2/webhooks \
 *   -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "url": "https://seudominio.com/api/livepix/webhook",
 *     "events": ["payment.received"]
 *   }'
 * 
 * =====================================================
 * VARIAVEIS DE AMBIENTE NECESSARIAS (Netlify):
 * =====================================================
 * 
 * DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/SEU_WEBHOOK_ID/SEU_WEBHOOK_TOKEN
 * 
 * (Opcional - para autenticacao OAuth2 do Livepix):
 * LIVEPIX_CLIENT_ID=seu_client_id
 * LIVEPIX_CLIENT_SECRET=seu_client_secret
 * 
 */

// Cache do token OAuth2 do Livepix
let livepixAccessToken: string | null = null
let tokenExpiresAt: number = 0

// Obter token OAuth2 do Livepix (opcional - para consultar detalhes extras)
async function getLivepixToken(): Promise<string | null> {
  const clientId = process.env.LIVEPIX_CLIENT_ID
  const clientSecret = process.env.LIVEPIX_CLIENT_SECRET
  
  if (!clientId || !clientSecret) {
    return null
  }
  
  // Verifica se o token ainda e valido
  if (livepixAccessToken && Date.now() < tokenExpiresAt) {
    return livepixAccessToken
  }
  
  try {
    const response = await fetch('https://oauth.livepix.gg/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'account:read payments:read messages:read',
      }),
    })
    
    if (!response.ok) {
      console.error('[LIVEPIX] Erro ao obter token OAuth2:', await response.text())
      return null
    }
    
    const data = await response.json()
    livepixAccessToken = data.access_token
    tokenExpiresAt = Date.now() + (data.expires_in * 1000) - 60000 // 1 min de margem
    
    return livepixAccessToken
  } catch (error) {
    console.error('[LIVEPIX] Erro ao autenticar:', error)
    return null
  }
}

// Consultar detalhes do pagamento na API do Livepix (opcional)
async function getPaymentDetails(paymentId: string): Promise<any | null> {
  const token = await getLivepixToken()
  if (!token) return null
  
  try {
    const response = await fetch(`https://api.livepix.gg/v2/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    
    if (!response.ok) {
      console.error('[LIVEPIX] Erro ao consultar pagamento:', await response.text())
      return null
    }
    
    return await response.json()
  } catch (error) {
    console.error('[LIVEPIX] Erro ao buscar detalhes:', error)
    return null
  }
}

// Enviar notificacao para o Discord
async function sendDiscordNotification(data: {
  username: string
  amount: number
  message?: string
  currency?: string
}) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL
  
  if (!webhookUrl) {
    console.error('[DISCORD] DISCORD_WEBHOOK_URL nao configurada!')
    return false
  }
  
  const { username, amount, message, currency = 'BRL' } = data
  
  // Formata o valor
  const formattedAmount = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency,
  }).format(amount)
  
  // Monta o embed do Discord
  const embed = {
    title: '🎉 Nova Doacao no RAZOR CLUB!',
    description: `**${username}** apoiou a Razor Team!`,
    color: 0xFFD700, // Dourado
    fields: [
      {
        name: '💰 Valor',
        value: formattedAmount,
        inline: true,
      },
    ],
    footer: {
      text: 'RAZOR CLUB - Via Livepix',
      icon_url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/gold-tFJ97dFLolFgsynzZwmjcIroy6vjrY.png',
    },
    timestamp: new Date().toISOString(),
  }
  
  // Adiciona mensagem se houver
  if (message && message.trim()) {
    embed.fields.push({
      name: '💬 Mensagem',
      value: message,
      inline: false,
    })
  }
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'RAZOR CLUB',
        avatar_url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/gold-tFJ97dFLolFgsynzZwmjcIroy6vjrY.png',
        embeds: [embed],
      }),
    })
    
    if (!response.ok) {
      console.error('[DISCORD] Erro ao enviar webhook:', await response.text())
      return false
    }
    
    console.log('[DISCORD] Notificacao enviada com sucesso!')
    return true
  } catch (error) {
    console.error('[DISCORD] Erro ao enviar notificacao:', error)
    return false
  }
}

// Handler do Webhook
export async function POST(request: NextRequest) {
  console.log('[WEBHOOK] ========================================')
  console.log('[WEBHOOK] Recebido webhook do Livepix')
  console.log('[WEBHOOK] ========================================')
  
  try {
    // Parse do body
    const body = await request.json()
    console.log('[WEBHOOK] Payload recebido:', JSON.stringify(body, null, 2))
    
    // Estrutura esperada do webhook Livepix:
    // {
    //   "userId": "...",
    //   "clientId": "...",
    //   "event": "new",
    //   "resource": {
    //     "id": "...",
    //     "reference": "...",
    //     "type": "payment"
    //   }
    // }
    
    // Valida o Client ID (opcional mas recomendado)
    const expectedClientId = process.env.LIVEPIX_CLIENT_ID || 'f1dc11b8-f8e5-4859-ad01-61dc972a2f93'
    if (body.clientId && body.clientId !== expectedClientId) {
      console.log('[WEBHOOK] Client ID invalido:', body.clientId)
      return NextResponse.json({ success: false, error: 'Client ID invalido' }, { status: 403 })
    }
    
    const { event, resource } = body
    
    // Verifica se e um evento de pagamento
    if (!resource || resource.type !== 'payment') {
      console.log('[WEBHOOK] Evento ignorado - nao e um pagamento')
      return NextResponse.json({ success: true, message: 'Evento ignorado' })
    }
    
    // Extrai dados do payload
    // O Livepix pode enviar dados diretamente ou apenas o ID
    let username = body.username || body.sender?.name || body.payer?.name || 'Apoiador Anonimo'
    let amount = body.amount || body.value || 0
    let message = body.message || body.text || ''
    let currency = body.currency || 'BRL'
    
    // Se tiver apenas o resource.id, tenta buscar detalhes completos
    if (resource?.id && (!amount || amount === 0)) {
      console.log('[WEBHOOK] Buscando detalhes do pagamento:', resource.id)
      const details = await getPaymentDetails(resource.id)
      
      if (details) {
        username = details.username || details.sender?.name || username
        amount = details.amount || details.value || amount
        message = details.message || details.text || message
        currency = details.currency || currency
      }
    }
    
    // Converte amount se vier em centavos
    if (amount > 1000) {
      amount = amount / 100
    }
    
    console.log('[WEBHOOK] Dados extraidos:')
    console.log('[WEBHOOK] - Username:', username)
    console.log('[WEBHOOK] - Amount:', amount)
    console.log('[WEBHOOK] - Message:', message)
    console.log('[WEBHOOK] - Currency:', currency)
    
    // Envia para o Discord
    const discordSent = await sendDiscordNotification({
      username,
      amount,
      message,
      currency,
    })
    
    if (discordSent) {
      console.log('[WEBHOOK] SUCESSO! Notificacao enviada ao Discord')
    } else {
      console.log('[WEBHOOK] AVISO: Falha ao enviar para Discord')
    }
    
    // Retorna sucesso (200 OK) para o Livepix
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processado',
      discordNotified: discordSent,
    })
    
  } catch (error) {
    console.error('[WEBHOOK] ERRO ao processar webhook:', error)
    
    // Retorna 200 mesmo com erro para evitar retentativas do Livepix
    return NextResponse.json({ 
      success: false, 
      error: 'Erro ao processar webhook',
    }, { status: 200 })
  }
}

// GET para verificar se o endpoint esta funcionando
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Webhook Livepix -> Discord ativo',
    endpoint: '/api/livepix/webhook',
    method: 'POST',
  })
}
