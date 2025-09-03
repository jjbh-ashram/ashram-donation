import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Optional CRON secret protection
  const authHeader = req.headers['authorization'] || req.headers['Authorization']
  if (process.env.CRON_SECRET) {
    if (!authHeader || String(authHeader) !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_KEY
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      return res.status(500).json({ error: 'Supabase service credentials not configured on server.' })
    }

    const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

    // Query bhakts that are active and have an email
    const { data: bhakts, error } = await supa
      .from('bhakt')
      .select('id,name,email,monthly_donation_amount,last_payment_date,carry_forward_balance,payment_status,is_active')
      .not('email', 'is', null)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error

    if (!bhakts || bhakts.length === 0) {
      return res.status(200).json({ success: true, sent: 0 })
    }

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

    const maxPerRun = process.env.MAX_SENDS_PER_RUN ? parseInt(process.env.MAX_SENDS_PER_RUN) : 70
    const delayMs = process.env.SEND_DELAY_MS ? parseInt(process.env.SEND_DELAY_MS) : 2000

    let sentCount = 0
    for (const b of bhakts) {
      if (sentCount >= maxPerRun) break
      try {
        const name = b.name || 'Bhakt'
        const monthly = b.monthly_donation_amount != null ? `₹${b.monthly_donation_amount}` : '₹0'
        const lastPay = b.last_payment_date ? new Date(b.last_payment_date).toLocaleDateString() : 'N/A'
        const extra = b.carry_forward_balance != null ? `₹${b.carry_forward_balance}` : '₹0'
        const status = b.payment_status || 'Unknown'

        const body = `Jai JagatBandhu Hari\nHere is your Bhiksha Status for Jagatbandhu Ashram\n\nName: ${name}\nMonthly Donation: ${monthly}\nLast Payment Date: ${lastPay}\nExtra Balance: ${extra}\nStatus: ${status}`

        // retry logic for transient failures
        const maxAttempts = 3
        let attempt = 0
        let sent = false
        while (attempt < maxAttempts && !sent) {
          try {
            await transporter.sendMail({
              from: fromHeader,
              to: b.email,
              subject: `Bhiksha Status - ${name}`,
              text: body
            })
            sent = true
            sentCount++
          } catch (sendErr) {
            attempt++
            const backoff = Math.min(30000, 1000 * Math.pow(2, attempt))
            console.warn(`send attempt ${attempt} failed for ${b.email}:`, sendErr.message || sendErr)
            if (attempt < maxAttempts) await new Promise(r => setTimeout(r, backoff))
            else console.warn('Giving up sending to', b.email)
          }
        }

        // throttle between sends to avoid provider rate limits
        if (sentCount < maxPerRun) await new Promise(r => setTimeout(r, delayMs))
      } catch (singleErr) {
        console.warn('Failed to send to', b.email, singleErr)
        // continue to next
      }
    }

    return res.status(200).json({ success: true, sent: sentCount })
  } catch (err) {
    console.error('send-bhiksha-status error', err)
    return res.status(500).json({ error: err.message || 'Server error' })
  }
}
