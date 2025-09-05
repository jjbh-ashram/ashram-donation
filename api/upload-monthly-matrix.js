import { createClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'
import formidable from 'formidable'

export const config = {
  api: {
    bodyParser: false
  }
}

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = []
    stream.on('data', (c) => chunks.push(c))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers['authorization'] || req.headers['Authorization']
  if (process.env.ADMIN_SECRET) {
    if (!authHeader || String(authHeader) !== `Bearer ${process.env.ADMIN_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_KEY
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return res.status(500).json({ error: 'Supabase service credentials not configured on server.' })
  }

  // Parse multipart/form-data using formidable (modern API)
  const form = formidable({ maxFileSize: 50 * 1024 * 1024 }) // 50MB

  try {
    const formResult = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err)
        resolve({ fields, files })
      })
    })

    const file = formResult.files?.file || formResult.files?.upload
    if (!file) return res.status(400).json({ error: 'No file uploaded. Use form field `file`.' })

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(file.path)

    // Expect the matrix sheet in first worksheet
    const ws = workbook.worksheets[0]
    if (!ws) return res.status(400).json({ error: 'Uploaded xlsx has no worksheets' })

    // Convert sheet to rows
    const rows = []
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const values = row.values
      // ExcelJS row.values is 1-based; drop index 0
      rows.push(values.slice(1))
    })

    if (rows.length < 2) return res.status(400).json({ error: 'Uploaded sheet is empty or missing header' })

    // Connect to Supabase with service role
    const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

  // Decide action: validate (preview) or apply (perform backups + DB changes)
  const action = (formResult.fields?.action || 'validate').toString().toLowerCase()

  // For 'validate' we only parse and return a preview (no backups or DB modifications)

    // Parse uploaded matrix into an array of objects using header row
    const header = rows[0].map(h => (h || '').toString().trim())
    const dataRows = rows.slice(1)
    const parsedRows = dataRows.map(r => {
      const obj = {}
      for (let i = 0; i < header.length; i++) obj[header[i] || `col${i}`] = r[i]
      return obj
    })

    // Quick validation: ensure Bhakt ID or Bhakt Name column exists
    const lowerHeaders = header.map(h => (h || '').toString().toLowerCase())
    const hasBhaktId = lowerHeaders.includes('bhakt id') || lowerHeaders.includes('bhakt_id')
    const hasBhaktName = lowerHeaders.includes('name') || lowerHeaders.includes('bhakt name') || lowerHeaders.includes('bhakt_name')
    if (!hasBhaktId && !hasBhaktName) {
      return res.status(400).json({ error: 'Uploaded sheet missing Bhakt identifier (Bhakt ID or Name) column' })
    }

    // Fetch current bhakt list for validation
    const { data: bhakts } = await supa.from('bhakt').select('id,name').order('id', { ascending: true })
    const nameToId = new Map((bhakts || []).map(b => [String(b.name).trim().toLowerCase(), b.id]))
    const idSet = new Set((bhakts || []).map(b => b.id))

    // Determine if any new bhakt names exist in uploaded sheet
    const newBhakts = []
  for (const row of parsedRows) {
      const nameVal = row['Bhakt Name'] || row['bhakt_name'] || row['Name'] || row['name']
      const idVal = row['Bhakt ID'] || row['bhakt_id'] || row['id']
      if (idVal && !idSet.has(Number(idVal))) {
        // unknown id - treat as new if name provided
        if (nameVal) newBhakts.push({ id: idVal, name: nameVal })
      } else if (!idVal && nameVal) {
        const key = String(nameVal).trim().toLowerCase()
        if (!nameToId.has(key)) {
          newBhakts.push({ name: nameVal })
        }
      }
    }

    // Prepare to return preview info
    const preview = {
      newBhakts,
      totalRows: parsedRows.length
    }

    if (action === 'validate') {
      // Build monthly changes preview similar to changes below
      const monthlyChanges = []
      // Fetch current monthly_sync entries for comparison
      const { data: currentSync } = await supa.from('monthly_sync').select('*')
      const syncMapPreview = new Map()
      for (const s of currentSync || []) syncMapPreview.set(`${s.bhakt_id}::${s.year}::${s.month}`, s)

      for (const row of parsedRows) {
        let bid = row['Bhakt ID'] || row['bhakt_id'] || row['id']
        const nameVal = row['Bhakt Name'] || row['bhakt_name'] || row['Name'] || row['name']
        if (!bid && nameVal) {
          const key = String(nameVal).trim().toLowerCase()
          bid = nameToId.get(key)
        }
        const entryDiffs = []
        for (let i = 0; i < header.length; i++) {
          const h = header[i]
          const m = (h || '').toString()
          const mmatch = m.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-/]*(\d{4})/i) || m.match(/(\d{4})[\-](\d{2})/)
          if (mmatch) {
            let year, month
            if (mmatch.length === 3 && isNaN(Number(mmatch[1]))) {
              // monthname year
              year = Number(mmatch[2])
              const monStr = mmatch[1]
              month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].findIndex(x => x.toLowerCase() === monStr.toLowerCase()) + 1
            } else {
              // pattern YYYY-MM
              year = Number(mmatch[1])
              month = Number(mmatch[2])
            }
            const cellVal = row[i]
            const donated = (cellVal === undefined || cellVal === null || cellVal === '') ? null : (isNaN(Number(cellVal)) ? String(cellVal) : Number(cellVal))
            const key = bid ? `${Number(bid)}::${year}::${month}` : `name::${nameVal}::${year}::${month}`
            const existing = bid ? syncMapPreview.get(key) : null
            if (!existing || existing.donated !== donated) {
              entryDiffs.push({ year, month, existing: existing || null, uploaded: donated })
            }
          }
        }
        if (entryDiffs.length > 0) {
          monthlyChanges.push({ bhakt_id: bid || null, name: nameVal || null, diffs: entryDiffs })
        }
      }

      preview.monthlyChanges = monthlyChanges
      return res.status(200).json({ success: true, preview })
    }

    // If action is 'apply', perform backups then apply changes
    if (action === 'apply') {
      // Create a backup folder in storage with timestamp
      const bucket = process.env.SUPABASE_BACKUP_BUCKET || 'backups'
      const now = new Date()
      const dd = String(now.getDate()).padStart(2, '0')
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const yyyy = now.getFullYear()
      const timePart = now.toISOString().replace(/[:.]/g, '-')
      const backupPrefix = `before-overwrite/${yyyy}-${mm}-${dd}/${timePart}`

      // Backup required tables: bhakt, monthly_sync, monthly_donations, year_config
      const tablesToBackup = ['bhakt', 'monthly_sync', 'monthly_donations', 'year_config']
      const backupFiles = []

      for (const tbl of tablesToBackup) {
        const { data, error } = await supa.from(tbl).select('*')
        if (error) {
          console.warn('Backup read error for', tbl, error)
          continue
        }
        // Save as JSON and CSV and XLSX
        const jsonStr = JSON.stringify(data || [])
        const jsonName = `${backupPrefix}/${tbl}.json`
        await supa.storage.from(bucket).upload(jsonName, Buffer.from(jsonStr), { upsert: true, contentType: 'application/json' })

        // CSV
        if ((data || []).length > 0) {
          const keys = Object.keys(data[0])
          const csvRows = [keys.join(',')]
          for (const r of data) {
            csvRows.push(keys.map(k => (r[k] !== null && r[k] !== undefined) ? (`"${String(r[k]).replace(/"/g, '""')}"`) : '').join(','))
          }
          const csvName = `${backupPrefix}/${tbl}.csv`
          await supa.storage.from(bucket).upload(csvName, Buffer.from(csvRows.join('\n')), { upsert: true, contentType: 'text/csv' })
        }

        // XLSX backup - create a minimal workbook
        try {
          const wb = new ExcelJS.Workbook()
          const s = wb.addWorksheet(tbl)
          if ((data || []).length > 0) {
            const keys = Object.keys(data[0])
            s.addRow(keys)
            for (const r of data) s.addRow(keys.map(k => r[k]))
          }
          const buf = await wb.xlsx.writeBuffer()
          const xname = `${backupPrefix}/${tbl}.xlsx`
          await supa.storage.from(bucket).upload(xname, Buffer.from(buf), { upsert: true, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        } catch (xbErr) {
          console.warn('Failed xlsx backup for', tbl, xbErr)
        }

        backupFiles.push(tbl)
      }

      // If there are new bhakts, insert them (map up to first 6 fields)
      const createdBhakts = []
      if (newBhakts.length > 0) {
        for (const nb of newBhakts) {
          // find the parsed row for this nb to map additional fields
          const matchRow = parsedRows.find(r => {
            const nameVal = r['Bhakt Name'] || r['bhakt_name'] || r['Name'] || r['name']
            return nameVal && String(nameVal).trim() === String(nb.name).trim()
          })
          const insertFields = { name: nb.name }
          if (matchRow) {
            insertFields.monthly_donation_amount = matchRow['monthly_donation_amount'] || matchRow['Monthly Donation Amount'] || matchRow['monthly_donation'] || null
            insertFields.carry_forward_balance = matchRow['carry_forward_balance'] || matchRow['Carry Forward Balance'] || null
            insertFields.last_payment_date = matchRow['last_payment_date'] || matchRow['Last Payment Date'] || null
            insertFields.payment_status = matchRow['payment_status'] || matchRow['Payment Status'] || null
          }
          try {
            const { data: inserted, error: insErr } = await supa.from('bhakt').insert(insertFields).select().single()
            if (insErr) console.warn('Failed to insert bhakt', insErr)
            else createdBhakts.push(inserted)
          } catch (ie) {
            console.warn('Insert bhakt error', ie)
          }
        }
      }

      // Now compute and apply diffs for monthly_sync
      const { data: currentSync } = await supa.from('monthly_sync').select('*')
      const syncMap = new Map()
      for (const s of currentSync || []) {
        const key = `${s.bhakt_id}::${s.year}::${s.month}`
        syncMap.set(key, s)
      }

      const changesToApply = []
      for (const row of parsedRows) {
        let bid = row['Bhakt ID'] || row['bhakt_id'] || row['id']
        const nameVal = row['Bhakt Name'] || row['bhakt_name'] || row['Name'] || row['name']
        if (!bid && nameVal) {
          const key = String(nameVal).trim().toLowerCase()
          // check createdBhakts
          const created = createdBhakts.find(b => b.name && String(b.name).trim().toLowerCase() === key)
          bid = created ? created.id : nameToId.get(key)
        }
        if (!bid) continue

        for (let i = 0; i < header.length; i++) {
          const h = header[i]
          const m = (h || '').toString()
          const mmatch = m.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-/]*(\d{4})/i) || m.match(/(\d{4})[\-](\d{2})/)
          if (mmatch) {
            let year, month
            if (mmatch.length === 3 && isNaN(Number(mmatch[1]))) {
              year = Number(mmatch[2])
              const monStr = mmatch[1]
              month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].findIndex(x => x.toLowerCase() === monStr.toLowerCase()) + 1
            } else {
              year = Number(mmatch[1])
              month = Number(mmatch[2])
            }
            const cellVal = row[i]
            const donated = (cellVal === undefined || cellVal === null || cellVal === '') ? null : (isNaN(Number(cellVal)) ? String(cellVal) : Number(cellVal))
            const key = `${Number(bid)}::${year}::${month}`
            const existing = syncMap.get(key)
            if (!existing || existing.donated !== donated) {
              changesToApply.push({ bhakt_id: Number(bid), year, month, donated })
            }
          }
        }
      }

      // Apply upserts into monthly_sync
      if (changesToApply.length > 0) {
        const upserts = changesToApply.map(c => ({ bhakt_id: c.bhakt_id, year: c.year, month: c.month, donated: c.donated }))
        const { data: upData, error: upErr } = await supa.from('monthly_sync').upsert(upserts)
        if (upErr) throw upErr
      }

      return res.status(200).json({ success: true, applied: changesToApply.length, backups: backupFiles, createdBhakts: createdBhakts.length })
    }

    return res.status(400).json({ error: 'Unknown action. Use action=validate or action=apply' })

    // Now compute diffs for monthly_sync: expect columns like Year/Month/Name/Amount/LastPayment/ExtraBalance/PaymentStatus
    // We will look for a 'Bhakt ID' or 'Bhakt Name' column and month/year columns or month columns per year.
    // For simplicity, attempt to find columns for 'Year','Month','Donated','Last Payment','Extra Balance','Payment Status' or similar.

    // Fetch current monthly_sync entries
    const { data: currentSync } = await supa.from('monthly_sync').select('*')

    // Build a map for quick lookup by bhakt id + year + month
    const syncMap = new Map()
    for (const s of currentSync || []) {
      const key = `${s.bhakt_id}::${s.year}::${s.month}`
      syncMap.set(key, s)
    }

    const changes = []
    // Attempt to interpret parsed rows; this is specific to your exported format and may need adjustments
  for (const row of parsedRows) {
      // find bhakt id
      let bid = row['Bhakt ID'] || row['bhakt_id'] || row['id']
      const nameVal = row['Bhakt Name'] || row['bhakt_name'] || row['Name'] || row['name']
      if (!bid && nameVal) {
        const key = String(nameVal).trim().toLowerCase()
        bid = nameToId.get(key) || (createdBhakts.find(b => b.name && String(b.name).trim().toLowerCase() === key) && createdBhakts.find(b => b.name && String(b.name).trim().toLowerCase() === key).id)
      }
      if (!bid) continue

      // Now for each month column in the header, try to detect columns like 'Jan 2025' or 'Jan-2025' etc.
      for (let i = 0; i < header.length; i++) {
        const h = header[i]
        // crude month-year detection: look for month short name + year
        const m = (h || '').toString()
        const mmatch = m.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-/]*(\d{4})/i)
        if (mmatch) {
          const monStr = mmatch[1]
          const yr = Number(mmatch[2])
          const monIndex = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].findIndex(x => x.toLowerCase() === monStr.toLowerCase()) + 1
          const cellVal = row[i]
          // determine value, last_payment_date, extra_balance, payment_status from cellVal if complex; here we assume cellVal is the donation amount
          const year = yr
          const month = monIndex
          const key = `${Number(bid)}::${year}::${month}`
          const existing = syncMap.get(key)
          // if values differ, prepare an upsert
          const donated = (cellVal === undefined || cellVal === null || cellVal === '') ? null : Number(cellVal)
          if (!existing || existing.donated !== donated) {
            changes.push({ bhakt_id: Number(bid), year, month, donated, existing })
          }
        }
      }
    }

    // If no changes found, respond accordingly
    if (changes.length === 0) {
      return res.status(200).json({ success: true, message: 'No changes detected', backups: backupFiles, createdBhakts: createdBhakts.length })
    }

    // Apply changes in a transaction: delete existing entries for the changed keys and insert new ones
    try {
      // Upsert changes into monthly_sync
      const upserts = changes.map(c => ({ bhakt_id: c.bhakt_id, year: c.year, month: c.month, donated: c.donated }))
      const { data: upData, error: upErr } = await supa.from('monthly_sync').upsert(upserts)
      if (upErr) throw upErr
      return res.status(200).json({ success: true, updated: upserts.length, backups: backupFiles })
    } catch (applyErr) {
      console.error('Failed to apply changes', applyErr)
      return res.status(500).json({ error: 'Failed to apply changes', details: applyErr.message || String(applyErr) })
    }
  } catch (err) {
    console.error('upload-monthly-matrix error', err)
    return res.status(500).json({ error: err.message || 'Server error' })
  }
}
