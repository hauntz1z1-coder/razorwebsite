'use client'

import { useState, useCallback } from 'react'
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import Link from 'next/link'
import { createDonationSession } from '@/app/actions/donation'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// Tier thresholds
const tiers = [
  { name: 'PLATINA', min: 1, max: 9, color: '#00CED1', description: 'R$ 1 - R$ 9' },
  { name: 'DIAMANTE', min: 10, max: 19, color: '#45B7FF', description: 'R$ 10 - R$ 19' },
  { name: 'ELITE', min: 20, max: 49, color: '#4FFFB0', description: 'R$ 20 - R$ 49' },
  { name: 'LENDA', min: 50, max: 99, color: '#FF6B35', description: 'R$ 50 - R$ 99' },
  { name: 'SURREAL', min: 100, max: null, color: '#9945FF', description: 'R$ 100+' },
]

function getTierFromAmount(amount: number) {
  if (amount >= 100) return tiers[4]
  if (amount >= 50) return tiers[3]
  if (amount >= 20) return tiers[2]
  if (amount >= 10) return tiers[1]
  return tiers[0]
}

export default function DoarPage() {
  const [step, setStep] = useState<'form' | 'checkout' | 'success'>('form')
  const [donorName, setDonorName] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [clientSecret, setClientSecret] = useState<string | null>(null)

  const amountNumber = parseFloat(amount) || 0
  const currentTier = getTierFromAmount(amountNumber)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!donorName.trim()) {
      setError('Por favor, informe seu nome/nick')
      return
    }

    if (amountNumber < 1) {
      setError('Valor minimo: R$ 1,00')
      return
    }

    try {
      const secret = await createDonationSession(Math.round(amountNumber * 100), donorName.trim())
      if (secret) {
        setClientSecret(secret)
        setStep('checkout')
      }
    } catch (err) {
      setError('Erro ao iniciar pagamento. Tente novamente.')
      console.error(err)
    }
  }

  const handleCheckoutComplete = useCallback(() => {
    setStep('success')
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-[#1a1a1a] bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img 
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/222-GKtyNvT90SRGeOg1lwQUpSvoTmtwaH.png" 
              alt="RAZOR" 
              className="h-10"
            />
          </Link>
          <Link href="/patrocinadores.html" className="text-[#00ff88] hover:underline">
            Ver Patrocinadores
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-2xl">
        {step === 'form' && (
          <>
            <div className="text-center mb-8">
              <span className="inline-block px-3 py-1 bg-[#00ff88]/10 text-[#00ff88] text-sm font-semibold rounded mb-4">
                APOIE A RAZOR
              </span>
              <h1 className="text-4xl font-bold mb-4">Seja um Patrocinador</h1>
              <p className="text-gray-400">
                Apoie a Razor Team e apareca no nosso Hall da Fama de Patrocinadores!
              </p>
            </div>

            {/* Tier Preview */}
            <div className="bg-[#111] border border-[#222] rounded-xl p-6 mb-8">
              <h3 className="text-lg font-semibold mb-4">Tiers de Patrocinio</h3>
              <div className="space-y-3">
                {tiers.map((tier) => (
                  <div 
                    key={tier.name}
                    className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                      currentTier.name === tier.name 
                        ? 'bg-[#1a1a1a] border-2' 
                        : 'bg-[#0d0d0d] border border-[#222]'
                    }`}
                    style={{ borderColor: currentTier.name === tier.name ? tier.color : undefined }}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tier.color, boxShadow: `0 0 10px ${tier.color}` }}
                      />
                      <span className="font-semibold" style={{ color: tier.color }}>{tier.name}</span>
                    </div>
                    <span className="text-gray-400 text-sm">{tier.description}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="bg-[#111] border border-[#222] rounded-xl p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Seu Nome/Nick</label>
                  <input
                    type="text"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    placeholder="Como voce quer aparecer no ranking"
                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#333] rounded-lg focus:border-[#00ff88] focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Valor da Doacao (R$)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="10.00"
                    min="1"
                    step="0.01"
                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#333] rounded-lg focus:border-[#00ff88] focus:outline-none transition-colors text-2xl font-bold"
                  />
                </div>

                {amountNumber >= 1 && (
                  <div 
                    className="p-4 rounded-lg text-center"
                    style={{ backgroundColor: `${currentTier.color}20`, border: `1px solid ${currentTier.color}` }}
                  >
                    <p className="text-sm text-gray-300">Voce sera um patrocinador</p>
                    <p className="text-2xl font-bold" style={{ color: currentTier.color }}>
                      {currentTier.name}
                    </p>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-4 bg-[#00ff88] text-black font-bold rounded-lg hover:bg-[#00cc6a] transition-colors text-lg"
                >
                  Continuar para Pagamento
                </button>
              </div>
            </form>
          </>
        )}

        {step === 'checkout' && clientSecret && (
          <div className="bg-[#111] border border-[#222] rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Pagamento</h2>
              <button 
                onClick={() => setStep('form')}
                className="text-gray-400 hover:text-white"
              >
                Voltar
              </button>
            </div>
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ 
                clientSecret,
                onComplete: handleCheckoutComplete 
              }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-[#00ff88]/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-[#00ff88]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-4">Obrigado, {donorName}!</h2>
            <p className="text-gray-400 mb-2">Sua doacao foi processada com sucesso.</p>
            <p className="text-gray-400 mb-8">
              Voce agora e um patrocinador <span style={{ color: currentTier.color }} className="font-bold">{currentTier.name}</span>!
            </p>
            <div className="flex gap-4 justify-center">
              <Link 
                href="/patrocinadores.html"
                className="px-6 py-3 bg-[#00ff88] text-black font-bold rounded-lg hover:bg-[#00cc6a] transition-colors"
              >
                Ver Hall da Fama
              </Link>
              <Link 
                href="/"
                className="px-6 py-3 bg-[#222] text-white font-bold rounded-lg hover:bg-[#333] transition-colors"
              >
                Voltar ao Site
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
