import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET() {
  try {
    // Buscar todos os doadores ordenados por valor
    const { data: donors, error } = await supabase
      .from('donors')
      .select('*')
      .order('amount', { ascending: false })
    
    if (error) {
      console.error('[v0] Erro ao buscar doadores:', error)
      return NextResponse.json({ error: 'Erro ao buscar doadores' }, { status: 500 })
    }
    
    // Agrupar por tier/elo
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
    console.error('[v0] Erro ao ler doadores:', error)
    return NextResponse.json({ error: 'Erro ao ler doadores' }, { status: 500 })
  }
}
