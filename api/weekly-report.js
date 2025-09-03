import { generateMonthlyMatrixBuffer } from './_lib/excel-generator'
import nodemailer from 'nodemailer'

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Optional: protect with CRON_SECRET header
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

    const { buffer, fileName } = await generateMonthlyMatrixBuffer(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

    // Send email to recipients list from env var (comma separated)
    const recipientsRaw = process.env.WEEKLY_REPORT_RECIPIENTS || ''
    const recipients = recipientsRaw.split(',').map(s => s.trim()).filter(Boolean)
    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No recipients configured in WEEKLY_REPORT_RECIPIENTS' })
    }

    // Configure nodemailer transport
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: recipients.join(','),
      subject: `Weekly MonthlySync Matrix - ${new Date().toLocaleDateString()}`,
      text: 'Attached is the weekly MonthlySync matrix backup.',
      attachments: [{ filename: fileName, content: Buffer.from(buffer) }]
    })

    return res.status(200).json({ success: true, recipients })
  } catch (err) {
    console.error('weekly-report error', err)
    return res.status(500).json({ error: err.message || 'Server error' })
  }
}
