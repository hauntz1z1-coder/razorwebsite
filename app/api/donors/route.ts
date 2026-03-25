import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Admin password for protection (default: admin@@1)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin@@1'

// Calculate tier based on amount
function getTier(amount: number): string {
  if (amount >= 100) return 'SURREAL'
  if (amount >= 50) return 'LENDA'
  if (amount >= 20) return 'ELITE'
  if (amount >= 10) return 'DIAMANTE'
  return 'PLATINA'
}

// GET - List all donors
export async function GET() {
  try {
    const { data: donors, error } = await supabase
      .from('donors')
      .select('*')
      .order('amount', { ascending: false })
    
    if (error) {
      console.error('Erro ao buscar doadores:', error)
      return NextResponse.json({ error: 'Erro ao buscar doadores' }, { status: 500 })
    }
    
    const grouped = {
      SURREAL: donors?.filter(d => d.tier === 'SURREAL') || [],
      LENDA: donors?.filter(d => d.tier === 'LENDA') || [],
      ELITE: donors?.filter(d => d.tier === 'ELITE') || [],
      DIAMANTE: donors?.filter(d => d.tier === 'DIAMANTE') || [],
      PLATINA: donors?.filter(d => d.tier === 'PLATINA') || [],
    }
    
    return NextResponse.json({ 
      success: true,
      total: donors?.length || 0,
      donors,
      grouped
    })
  } catch (error) {
    console.error('Erro ao ler doadores:', error)
    return NextResponse.json({ error: 'Erro ao ler doadores' }, { status: 500 })
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
      .from('donors')
      .insert({
        name,
        amount: parseFloat(amount),
        email: email || null,
        message: message || null,
        tier,
        transaction_id: `manual_${Date.now()}`
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
      .from('donors')
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
