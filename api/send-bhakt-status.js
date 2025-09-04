import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Optional admin protection
  const authHeader = req.headers['authorization'] || req.headers['Authorization']
  if (process.env.ADMIN_SECRET) {
    if (!authHeader || String(authHeader) !== `Bearer ${process.env.ADMIN_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }

  try {
    const { bhakt_id } = req.body || {}
    if (!bhakt_id) return res.status(400).json({ error: 'bhakt_id required' })

    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_KEY
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      return res.status(500).json({ error: 'Supabase service credentials not configured on server.' })
    }

    const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

    const { data: bhakt, error } = await supa
      .from('bhakt')
      .select('id,name,email,phone_number,monthly_donation_amount,last_payment_date,carry_forward_balance,payment_status')
      .eq('id', bhakt_id)
      .single()

    if (error || !bhakt) return res.status(404).json({ error: 'Bhakt not found' })
    if (!bhakt.email) return res.status(400).json({ error: 'Bhakt has no email' })

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })

    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER
    const fromName = process.env.SMTP_FROM_NAME || process.env.EMAIL_FROM_NAME || ''
    const fromHeader = fromName ? `${fromName} <${fromAddress}>` : fromAddress

    const name = bhakt.name || 'Bhakt'
    const monthly = bhakt.monthly_donation_amount != null ? `₹${bhakt.monthly_donation_amount}` : '₹0'
    const lastPay = bhakt.last_payment_date ? new Date(bhakt.last_payment_date).toLocaleDateString('en-IN') : 'N/A'
    const extra = bhakt.carry_forward_balance != null ? `₹${bhakt.carry_forward_balance}` : '₹0'
    const status = bhakt.payment_status || 'Unknown'

    const body = `Jai JagatBandhu Hari\nHere is your Bhiksha Status for Jagatbandhu Ashram\n\nName: ${name}\nMonthly Donation: ${monthly}\nLast Payment Date: ${lastPay}\nExtra Balance: ${extra}\nStatus: ${status}`

    await transporter.sendMail({
      from: fromHeader,
      to: bhakt.email,
      subject: `Bhiksha Status - ${name}`,
      text: body
    })

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('send-bhakt-status error', err)
    return res.status(500).json({ error: err.message || 'Server error' })
  }
}
