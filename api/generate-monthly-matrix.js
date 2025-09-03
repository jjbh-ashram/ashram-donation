import { createClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Use service role key on server - set as VERCEL env: SUPABASE_SERVICE_ROLE and SUPABASE_URL
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_KEY

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      return res.status(500).json({ error: 'Supabase service credentials not configured on server.' })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

    // Fetch bhakts
    const { data: bhakts, error: bhError } = await supabase
      .from('bhakt')
      .select('id,name,monthly_donation_amount,carry_forward_balance,last_payment_date,payment_status')
      .order('name', { ascending: true })

    if (bhError) throw bhError

    // Fetch active years
    const { data: yearsCfg, error: yErr } = await supabase
      .from('year_config')
      .select('year')
      .eq('is_active', true)
      .order('year', { ascending: true })

    if (yErr) throw yErr

    const yearsList = (yearsCfg && yearsCfg.length > 0) ? yearsCfg.map(y => y.year) : [new Date().getFullYear()]

    // Fetch monthly_sync for these years
    const { data: monthlySyncRows, error: msErr } = await supabase
      .from('monthly_sync')
      .select('bhakt_id,year,month,is_paid')
      .in('year', yearsList)

    if (msErr) throw msErr

    const paidSet = new Set((monthlySyncRows || []).filter(r => r.is_paid).map(r => `${r.bhakt_id}::${r.year}::${r.month}`))

    const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

    // Build workbook
    const workbook = new ExcelJS.Workbook()
    const ws = workbook.addWorksheet('MonthlyMatrix', { properties: { defaultRowHeight: 20 } })

    const frontCols = [
      { header: 'bhakt_id', key: 'bhakt_id', width: 36 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'monthly_donation_amount', key: 'monthly_donation_amount', width: 18 },
      { header: 'carry_forward_balance', key: 'carry_forward_balance', width: 18 },
      { header: 'last_payment_date', key: 'last_payment_date', width: 18 },
      { header: 'payment_status', key: 'payment_status', width: 20 }
    ]

    const monthCols = []
    for (const y of yearsList) {
      for (let m = 1; m <= 12; m++) {
        monthCols.push({ header: `${y}-${String(m).padStart(2,'0')}`, key: `${y}_${m}`, width: 8 })
      }
    }

    ws.columns = [...frontCols, ...monthCols]

    // Hide bhakt_id column, reduce width
    ws.getColumn(1).hidden = true
    ws.getColumn(1).width = 2

    // Header rows
    const headerRow1 = ws.getRow(1)
    const headerRow2 = ws.getRow(2)
    const frontCount = frontCols.length
    for (let c = 1; c <= frontCount; c++) {
      headerRow1.getCell(c).value = frontCols[c-1].header
      headerRow2.getCell(c).value = ''
      headerRow1.getCell(c).font = { bold: true }
    }

    const yearColors = ['FFDBF5FF','FFDFF7E3','FFF3E8FF','FFFFF2D9','FFE8F8FF']
    let colIndex = frontCount + 1
    for (let yi = 0; yi < yearsList.length; yi++) {
      const y = yearsList[yi]
      const start = colIndex
      const color = yearColors[yi % yearColors.length]
      for (let m = 1; m <= 12; m++) {
        const cell = headerRow2.getCell(colIndex)
        cell.value = monthLabels[m-1]
        cell.alignment = { horizontal: 'center' }
        cell.font = { bold: true }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
        cell.border = { top: {style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} }
        colIndex++
      }
      const end = colIndex - 1
      ws.mergeCells(1, start, 1, end)
      const merged = ws.getCell(1, start)
      merged.value = String(y)
      merged.alignment = { horizontal: 'center', vertical: 'middle' }
      merged.font = { bold: true }
      merged.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
    }

    headerRow1.commit()
    headerRow2.commit()

    // Add data rows
    for (const b of bhakts || []) {
      const row = []
      row.push(b.id)
      row.push(b.name || '')
      row.push(b.monthly_donation_amount ?? '')
      row.push(b.carry_forward_balance ?? '')
      row.push(b.last_payment_date ?? '')
      row.push(b.payment_status ?? '')
      for (const y of yearsList) {
        for (let m = 1; m <= 12; m++) {
          const key = `${b.id}::${y}::${m}`
          row.push(paidSet.has(key) ? '✓' : '')
        }
      }
      const added = ws.addRow(row)
      let monthColStart = frontCount + 1
      for (let i = 0; i < yearsList.length; i++) {
        const bg = yearColors[i % yearColors.length]
        for (let m = 1; m <= 12; m++) {
          const c = monthColStart
          const cell = added.getCell(c)
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
          cell.alignment = { horizontal: 'center' }
          if (cell.value === '✓') {
            cell.font = { bold: true, color: { argb: 'FF006400' } }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF98FB98' } }
          }
          monthColStart++
        }
      }
      added.commit()
    }

    ws.getCell('B1').value = 'Instructions: Do not edit bhakt_id (hidden column). Put any value in month cells to mark paid.'

    const buffer = await workbook.xlsx.writeBuffer()

    const fileName = `MonthlySync_Matrix_${new Date().toISOString().slice(0,10)}.xlsx`
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    return res.status(200).send(Buffer.from(buffer))
  } catch (error) {
    console.error('Error generating matrix excel:', error)
    return res.status(500).json({ success: false, error: error.message || 'Server error' })
  }
}
