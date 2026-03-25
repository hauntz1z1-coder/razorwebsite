import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

interface Donor {
  id: string
  name: string
  amount: number
  elo: string
  date: string
}

const DONORS_FILE = path.join(process.cwd(), 'data', 'donors.json')

async function readDonors(): Promise<Donor[]> {
  try {
    const data = await fs.readFile(DONORS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

export async function GET() {
  try {
    const donors = await readDonors()
    
    // Agrupar por elo
    const grouped = {
      SURREAL: donors.filter(d => d.elo === 'SURREAL'),
      LENDA: donors.filter(d => d.elo === 'LENDA'),
      ELITE: donors.filter(d => d.elo === 'ELITE'),
      DIAMANTE: donors.filter(d => d.elo === 'DIAMANTE'),
      PLATINA: donors.filter(d => d.elo === 'PLATINA'),
    }
    
    return NextResponse.json({ 
      success: true,
      total: donors.length,
      donors,
      grouped
    })
  } catch (error) {
    console.error('[v0] Erro ao ler doadores:', error)
    return NextResponse.json({ error: 'Erro ao ler doadores' }, { status: 500 })
  }
}
