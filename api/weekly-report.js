import { generateMonthlyMatrixBuffer } from './_lib/excel-generator.js'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'

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

    // Optional: upload backup to Supabase Storage
    const bucketName = process.env.SUPABASE_BACKUP_BUCKET || 'backups'
    try {
      const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
      // Use a timestamped path inside the bucket
      const now = new Date()
      const dd = String(now.getDate()).padStart(2, '0')
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const yyyy = now.getFullYear()
      const timePart = now.toISOString().replace(/[:.]/g, '-')
      const objectName = `monthly-matrix/${yyyy}-${mm}-${dd}/${timePart}-${fileName}`

      const uploadRes = await supa.storage.from(bucketName).upload(objectName, Buffer.from(buffer), {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true
      })
      if (uploadRes.error) {
        console.warn('Supabase storage upload warning:', uploadRes.error)
      }
    } catch (storeErr) {
      console.warn('Failed to upload backup to Supabase Storage:', storeErr)
      // Continue even if backup fails
    }

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

    // Use DD/MM/YYYY in email subject for human readability
    const d = new Date()
    const subjectDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
    // Allow custom display name for the sender using SMTP_FROM_NAME or EMAIL_FROM_NAME
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER
    const fromName = process.env.SMTP_FROM_NAME || process.env.EMAIL_FROM_NAME || ''
    const fromHeader = fromName ? `${fromName} <${fromAddress}>` : fromAddress
    const replyTo = process.env.SMTP_REPLY_TO || fromAddress

    await transporter.sendMail({
      from: fromHeader,
      to: recipients.join(','),
      replyTo,
      subject: `Weekly MonthlySync Matrix - ${subjectDate}`,
  text: 'Jai JagatBandhu Hari\nAttached Weekly Bhiksha Excel Sheet',
      attachments: [{ filename: fileName, content: Buffer.from(buffer) }]
    })

    return res.status(200).json({ success: true, recipients })
  } catch (err) {
    console.error('weekly-report error', err)
    return res.status(500).json({ error: err.message || 'Server error' })
  }
}
