import { generateMonthlyMatrixBuffer } from './_lib/excel-generator.js'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'

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
    const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
    const now = new Date()
    const dd = String(now.getDate()).padStart(2, '0')
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const yyyy = now.getFullYear()
    const timePart = now.toISOString().replace(/[:.]/g, '-')
    // Upload matrix
    try {
      const objectName = `monthly-matrix/${yyyy}-${mm}-${dd}/${timePart}-${fileName}`

      const uploadRes = await supa.storage.from(bucketName).upload(objectName, Buffer.from(buffer), {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true
      })
      if (uploadRes.error) {
        console.warn('Supabase storage upload warning (matrix):', uploadRes.error)
      }
    } catch (storeErr) {
      console.warn('Failed to upload matrix backup to Supabase Storage:', storeErr)
      // Continue even if backup fails
    }

    // Generate transactions Excel and upload it too
    let txBuffer = null
    let txFileName = null
    try {
      const { data: transactions, error: txErr } = await supa
        .from('monthly_donations')
        .select('*')
        .order('created_at', { ascending: true })

      if (txErr) throw txErr

      if (transactions && transactions.length > 0) {
        const txWb = new ExcelJS.Workbook()
        const txWs = txWb.addWorksheet('transactions')

        // Determine columns, excluding id, bhakt_id, updated_at, and use friendly headers
        const exclude = new Set(['id', 'bhakt_id', 'updated_at'])
        const HEADER_MAP = {
          id: 'ID',
          bhakt_id: 'Bhakt ID',
          bhakt_name: 'Bhakt Name',
          year: 'Year',
          month: 'Month',
          donated: 'Donated',
          amount: 'Amount',
          donation_date: 'Donation Date',
          payment_date: 'Payment Date',
          amount_paid: 'Amount Paid',
          notes: 'Notes',
          remarks: 'Remarks',
          created_at: 'Created At',
          updated_at: 'Updated At'
        }

        const sample = transactions[0]
        const keys = Object.keys(sample).filter(k => !exclude.has(k))

        txWs.columns = keys.map(k => ({ header: HEADER_MAP[k] || k, key: k, width: 20 }))

        for (const row of transactions) {
          const filtered = {}
          for (const k of keys) filtered[k] = row[k]
          txWs.addRow(filtered)
        }

        txBuffer = await txWb.xlsx.writeBuffer()
        txFileName = `MonthlyDonations_${dd}-${mm}-${yyyy}.xlsx`

        try {
          const txObject = `monthly-transactions/${yyyy}-${mm}-${dd}/${timePart}-${txFileName}`
          const uploadTx = await supa.storage.from(bucketName).upload(txObject, Buffer.from(txBuffer), {
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            upsert: true
          })
          if (uploadTx.error) console.warn('Supabase storage upload warning (transactions):', uploadTx.error)
        } catch (uErr) {
          console.warn('Failed to upload transactions backup to Supabase Storage:', uErr)
        }
      }
    } catch (txCatch) {
      console.warn('Failed to generate/upload transactions excel:', txCatch)
      // continue without transactions file
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

    const attachments = [{ filename: fileName, content: Buffer.from(buffer) }]
    if (txBuffer && txFileName) attachments.push({ filename: txFileName, content: Buffer.from(txBuffer) })

    await transporter.sendMail({
      from: fromHeader,
      to: recipients.join(','),
      replyTo,
      subject: `Weekly Bhiksha Excel Sheet - ${subjectDate}`,
      text: 'Jai JagatBandhu Hari\nHere is Attached Weekly Bhiksha Excel Sheet and Weekly Donations Report',
      attachments
    })

    // ... (rest of the email sending logic)

    // --- Google Drive Backup Logic ---
    try {
      const gDriveFolderBase = `ashramapp/WEEKLY-BACKUPS`
      
      // Upload Matrix to GDrive
      const matrixFolder = `${gDriveFolderBase}/monthly-matrix/${yyyy}-${mm}-${dd}`
      const matrixFileName = `${timePart}-${fileName}`
      await uploadToGDrive(buffer, matrixFileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', matrixFolder)

      // Upload Transactions to GDrive (if exists)
      if (txBuffer && txFileName) {
        const txFolder = `${gDriveFolderBase}/monthly-transactions/${yyyy}-${mm}-${dd}`
        const txFinalName = `${timePart}-${txFileName}`
        await uploadToGDrive(txBuffer, txFinalName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', txFolder)
      }
    } catch (gdErr) {
      console.error('Google Drive Backup Failed:', gdErr)
      // Don't fail the request if backup fails, just log it
    }

    return res.status(200).json({ success: true, recipients })
  } catch (err) {
    console.error('weekly-report error', err)
    return res.status(500).json({ error: err.message || 'Server error' })
  }
}

// --- Google Drive Helpers ---

async function getAccessToken() {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.VITE_GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN || process.env.VITE_GOOGLE_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Google Drive credentials')
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.error_description || 'Failed to get access token')
  return data.access_token
}

async function findOrCreateFolder(accessToken, folderName, parentId = null) {
  // 1. Search
  let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`
  if (parentId) query += ` and '${parentId}' in parents`
  
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  const searchData = await searchRes.json()
  
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id
  }

  // 2. Create if not found
  const metadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentId ? [parentId] : []
  }
  
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  })
  const createData = await createRes.json()
  return createData.id
}

async function uploadToGDrive(buffer, fileName, mimeType, folderPath) {
    try {
        const accessToken = await getAccessToken()
        
        // Resolve path to folder ID
        const parts = folderPath.split('/').filter(Boolean)
        let parentId = null // Root
        
        for (const part of parts) {
            parentId = await findOrCreateFolder(accessToken, part, parentId)
        }
        
        // Upload file
        const metadata = {
            name: fileName,
            parents: [parentId]
        }
        
        const boundary = '-------314159265358979323846'
        const delimiter = "\r\n--" + boundary + "\r\n"
        const close_delim = "\r\n--" + boundary + "--"
        
        const base64Data = buffer.toString('base64')
        
        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: ' + mimeType + '\r\n' +
            'Content-Transfer-Encoding: base64\r\n' +
            '\r\n' +
            base64Data +
            close_delim

        const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'multipart/related; boundary="' + boundary + '"'
            },
            body: multipartRequestBody
        })
        
        if (!uploadRes.ok) {
             const errText = await uploadRes.text()
             throw new Error(`Upload failed: ${errText}`)
        }
        
        console.log(`Uploaded ${fileName} to GDrive: ${folderPath}`)
        
    } catch (error) {
        console.error('GDrive Backup Error:', error)
        throw error
    }
}
