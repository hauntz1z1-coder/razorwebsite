import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Admin password for protection (default: admin@@1)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin@@1'

// Calculate tier based on amount (Gold = R$100, Silver = R$50, Bronze = R$10)
function getTier(amount: number): string {
  if (amount >= 100) return 'GOLD'
  if (amount >= 50) return 'SILVER'
  return 'BRONZE'
}

// GET - List all patrocinadores
export async function GET() {
  try {
    const { data: patrocinadores, error } = await supabase
      .from('patrocinadores')
      .select('*')
      .order('valor', { ascending: false })
    
    if (error) {
      console.error('Erro ao buscar patrocinadores:', error)
      return NextResponse.json({ error: 'Erro ao buscar patrocinadores' }, { status: 500 })
    }
    
    // Mapeia para formato esperado pelo frontend
    const donors = patrocinadores?.map(p => ({
      id: p.id,
      name: p.nome,
      amount: p.valor,
      tier: p.elo,
      created_at: p.created_at
    })) || []
    
    const grouped = {
      GOLD: donors.filter(d => d.tier === 'GOLD'),
      SILVER: donors.filter(d => d.tier === 'SILVER'),
      BRONZE: donors.filter(d => d.tier === 'BRONZE'),
    }
    
    return NextResponse.json({ 
      success: true,
      total: donors.length,
      donors,
      grouped
    })
  } catch (error) {
    console.error('Erro ao ler patrocinadores:', error)
    return NextResponse.json({ error: 'Erro ao ler patrocinadores' }, { status: 500 })
  }
}

// POST - Add new donor
export async function POST(request: Request) {
  try {
    const password = request.headers.get('x-admin-password')
    
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    
    const body = await request.json()
    const { name, amount, email, message } = body
    
    if (!name || !amount) {
      return NextResponse.json({ error: 'Nome e valor sao obrigatorios' }, { status: 400 })
    }
    
    const tier = getTier(parseFloat(amount))
    
    const { data: donor, error } = await supabase
      .from('patrocinadores')
      .insert({
        nome: name,
        valor: parseFloat(amount),
        elo: tier
      })
      .select()
      .single()
    
    if (error) {
      console.error('Erro ao inserir doador:', error)
      return NextResponse.json({ error: 'Erro ao adicionar doador' }, { status: 500 })
    }

    // Send to Discord if configured
    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL
    if (discordWebhookUrl) {
      try {
        await fetch(discordWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: 'Nova Doacao Registrada!',
              color: 0x00ff88,
              fields: [
                { name: 'Doador', value: name, inline: true },
                { name: 'Valor', value: `R$ ${parseFloat(amount).toFixed(2)}`, inline: true },
                { name: 'Tier', value: tier, inline: true },
              ],
              footer: { text: 'Razor Team - Sistema de Patrocinadores' },
              timestamp: new Date().toISOString()
            }]
          })
        })
      } catch (e) {
        console.error('Erro ao enviar para Discord:', e)
      }
    }
    
    return NextResponse.json({ 
      success: true,
      donor
    })
  } catch (error) {
    console.error('Erro ao adicionar doador:', error)
    return NextResponse.json({ error: 'Erro ao adicionar doador' }, { status: 500 })
  }
}

// DELETE - Remove donor
export async function DELETE(request: Request) {
  try {
    const password = request.headers.get('x-admin-password')
    
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID e obrigatorio' }, { status: 400 })
    }
    
    const { error } = await supabase
      .from('patrocinadores')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Erro ao deletar doador:', error)
      return NextResponse.json({ error: 'Erro ao remover doador' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar doador:', error)
    return NextResponse.json({ error: 'Erro ao remover doador' }, { status: 500 })
  }
}
