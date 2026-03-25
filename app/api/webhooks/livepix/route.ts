import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

// Elos e suas configuracoes
const ELOS = {
  SURREAL: { min: 100, color: 0x9b59b6, image: 'unreal.png', name: 'SURREAL' },
  LENDA: { min: 50, color: 0xff6b35, image: 'lenda.png', name: 'LENDA' },
  ELITE: { min: 20, color: 0x2ecc71, image: 'elite.png', name: 'ELITE' },
  DIAMANTE: { min: 10, color: 0x3498db, image: 'diamante.png', name: 'DIAMANTE' },
  PLATINA: { min: 0, color: 0x1abc9c, image: 'platina.png', name: 'PLATINA' },
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
const DISCORD_WEBHOOK_URL = 'https://canary.discord.com/api/webhooks/1486386264944148741/Ot_tvPi4zrVKAEZrDsaUpUhxk5jBTZxW7vB1oawnrDEUCcRRE3-yF2KR9QXARvZhTA57'

// Determinar o elo baseado no valor
function getElo(amount: number): keyof typeof ELOS {
  if (amount >= 100) return 'SURREAL'
  if (amount >= 50) return 'LENDA'
  if (amount >= 20) return 'ELITE'
  if (amount >= 10) return 'DIAMANTE'
  return 'PLATINA'
}

// Caminho do arquivo de doadores
const DONORS_FILE = path.join(process.cwd(), 'data', 'donors.json')

// Interface do doador
interface Donor {
  id: string
  name: string
  amount: number
  elo: string
  date: string
}

// Ler doadores do arquivo
async function readDonors(): Promise<Donor[]> {
  try {
    const data = await fs.readFile(DONORS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

// Salvar doadores no arquivo
async function saveDonors(donors: Donor[]): Promise<void> {
  const dir = path.dirname(DONORS_FILE)
  try {
    await fs.mkdir(dir, { recursive: true })
  } catch {
    // Diretorio ja existe
  }
  await fs.writeFile(DONORS_FILE, JSON.stringify(donors, null, 2))
}

// Enviar notificacao para o Discord
async function sendDiscordNotification(donor: Donor, elo: keyof typeof ELOS): Promise<void> {
  const eloConfig = ELOS[elo]
  
  const embed = {
    title: '💎 NOVA DOACAO RECEBIDA! 💎',
    description: `**${donor.name}** acabou de apoiar a Razor Team!`,
    color: eloConfig.color,
    fields: [
      {
        name: '💰 Valor',
        value: `R$ ${donor.amount.toFixed(2)}`,
        inline: true,
      },
      {
        name: '🏆 Elo Conquistado',
        value: eloConfig.name,
        inline: true,
      },
    ],
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
    const amount = body.amount || body.value || body.donation?.amount || 0
    const name = body.name || body.donor?.name || body.username || 'Anonimo'
    const id = body.id || body.transaction_id || Date.now().toString()
    
    if (amount <= 0) {
      return NextResponse.json({ error: 'Valor invalido' }, { status: 400 })
    }
    
    // Determinar o elo
    const elo = getElo(amount)
    
    // Criar objeto do doador
    const donor: Donor = {
      id,
      name,
      amount,
      elo,
      date: new Date().toISOString(),
    }
    
    // Ler doadores existentes e adicionar o novo
    const donors = await readDonors()
    
    // Verificar se o doador ja existe (pelo nome) e atualizar o valor total
    const existingIndex = donors.findIndex(d => d.name.toLowerCase() === name.toLowerCase())
    
    if (existingIndex >= 0) {
      // Atualizar doador existente
      donors[existingIndex].amount += amount
      donors[existingIndex].elo = getElo(donors[existingIndex].amount)
      donors[existingIndex].date = donor.date
    } else {
      // Adicionar novo doador
      donors.push(donor)
    }
    
    // Ordenar por valor (maior primeiro)
    donors.sort((a, b) => b.amount - a.amount)
    
    // Salvar doadores
    await saveDonors(donors)
    
    // Enviar notificacao para o Discord
    await sendDiscordNotification(donor, elo)
    
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
