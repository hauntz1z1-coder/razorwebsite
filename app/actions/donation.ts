'use server'

import { stripe } from '@/lib/stripe'

export async function createDonationSession(amount: number, donorName: string) {
  // Validate amount (minimum R$ 1.00)
  if (amount < 100) {
    throw new Error('Valor minimo de doacao: R$ 1,00')
  }

  // Create Checkout Session
  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded',
    redirect_on_completion: 'never',
    line_items: [
      {
        price_data: {
          currency: 'brl',
          product_data: {
            name: 'Doacao Razor Team',
            description: `Doacao de ${donorName} para a Razor Team`,
          },
          unit_amount: amount, // amount in centavos
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    metadata: {
      donor_name: donorName,
      amount_brl: (amount / 100).toFixed(2),
    },
  })

  return session.client_secret
}
