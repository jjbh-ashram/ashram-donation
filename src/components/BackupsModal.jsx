import React, { useState } from 'react'
import SimpleModal from './SimpleModal'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'

const BackupsModal = ({ isOpen, onClose }) => {
  const [isDownloadingMatrix, setIsDownloadingMatrix] = useState(false)
  const [isDownloadingTransactions, setIsDownloadingTransactions] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatusLines, setUploadStatusLines] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [previewData, setPreviewData] = useState(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const downloadMatrix = async () => {
    setIsDownloadingMatrix(true)
    try {
      const resp = await fetch('/api/generate-monthly-matrix')
      if (!resp.ok) throw new Error('Server error')
      const blob = await resp.blob()
      const cd = resp.headers.get('content-disposition') || ''
      let filename = `MonthlySync_Matrix_${new Date().toISOString().slice(0,10)}.xlsx`
      const match = /filename="?([^";]+)"?/.exec(cd)
      if (match) filename = match[1]
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Error downloading matrix: ' + err.message)
    } finally {
      setIsDownloadingMatrix(false)
    }
  }

  const parseResponseSafely = async (resp) => {
    // Try JSON, fall back to text
    try {
      const json = await resp.json()
      return { ok: resp.ok, body: json }
    } catch (e) {
      const text = await resp.text()
      return { ok: resp.ok, body: text }
    }
  }

  const uploadExcel = () => {
    if (!selectedFile) return alert('Please select an Excel file to upload')

    // Confirm overwrite
    const ok = window.confirm('This will overwrite the Monthly Sync table in the database. Do you want to continue?')
    if (!ok) return

    // perform upload
    // Step 1: validate (get preview)
    const doValidate = async () => {
      setIsUploading(true)
      setUploadStatusLines(['Validating uploaded file...'])
      try {
        const form = new FormData()
        form.append('file', selectedFile)
        form.append('action', 'validate')

        const headers = {}
        if (process.env.REACT_APP_ADMIN_SECRET) headers['Authorization'] = `Bearer ${process.env.REACT_APP_ADMIN_SECRET}`

        const resp = await fetch('/api/upload-monthly-matrix', { method: 'POST', headers, body: form })
        const parsed = await parseResponseSafely(resp)
        if (!parsed.ok) {
          const body = parsed.body
          setUploadStatusLines(prev => [...prev, `Validation failed: ${body && (body.error || body) || resp.statusText}`])
          alert('Validation failed: ' + (body && (body.error || body) || resp.statusText))
          setIsUploading(false)
          return
        }

        const json = parsed.body
        setUploadStatusLines(prev => [...prev, 'Validation successful — preview ready'])
        setPreviewData(json.preview)
        setIsPreviewOpen(true)
      } catch (err) {
        setUploadStatusLines(prev => [...prev, `Validation error: ${err.message || err}`])
        alert('Validation error: ' + err.message)
      } finally {
        setIsUploading(false)
      }
    }

    doValidate()
  }

  const onFileChange = (e) => {
    const f = e.target.files && e.target.files[0]
    setSelectedFile(f || null)
  }

  const onDragOver = (e) => { e.preventDefault(); setDragActive(true) }
  const onDragLeave = (e) => { e.preventDefault(); setDragActive(false) }
  const onDrop = (e) => {
    e.preventDefault(); setDragActive(false)
    const f = e.dataTransfer.files && e.dataTransfer.files[0]
    setSelectedFile(f || null)
  }

  const applyUpload = async () => {
    if (!selectedFile) return alert('No file to apply')
    const ok = window.confirm('Are you sure you want to apply these changes and overwrite the database?')
    if (!ok) return

    setIsUploading(true)
    setUploadStatusLines(['Applying changes...'])
    try {
      const form = new FormData()
      form.append('file', selectedFile)
      form.append('action', 'apply')

      const headers = {}
      if (process.env.REACT_APP_ADMIN_SECRET) headers['Authorization'] = `Bearer ${process.env.REACT_APP_ADMIN_SECRET}`

      setUploadStatusLines(prev => [...prev, 'Uploading file and applying changes on server...'])
      const resp = await fetch('/api/upload-monthly-matrix', { method: 'POST', headers, body: form })
      const json = await resp.json()
      if (!resp.ok) {
        setUploadStatusLines(prev => [...prev, `Apply failed: ${json.error || resp.statusText}`])
        alert('Apply failed: ' + (json.error || resp.statusText))
      } else {
        setUploadStatusLines(prev => [...prev, `Apply complete: updated ${json.applied || 0} entries; created ${json.createdBhakts || 0} bhakts`])
        alert('Apply completed: ' + (json.applied || 0) + ' changes applied')
        setIsPreviewOpen(false)
        setPreviewData(null)
      }
    } catch (err) {
      setUploadStatusLines(prev => [...prev, `Apply error: ${err.message || err}`])
      alert('Apply failed: ' + err.message)
    } finally {
      setIsUploading(false)
    }
  }

  const downloadTransactions = async () => {
    setIsDownloadingTransactions(true)
    try {
      // Fetch all transactions (admin only action)
      const { data, error } = await supabase
        .from('monthly_donations')
        .select('*')
        .order('payment_date', { ascending: true })

      if (error) throw error
      if (!data || data.length === 0) {
        alert('No transaction records found.')
        return
      }

      // Exclude sensitive/internal columns if present and add friendly headers
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

      const filtered = data.map(row => {
        const obj = {}
        for (const k of Object.keys(row)) {
          if (!exclude.has(k)) obj[k] = row[k]
        }
        return obj
      })

      // Build an array-of-arrays with header row (friendly labels) then data rows
      const keys = Object.keys(filtered[0] || {})
      const headerRow = keys.map(k => HEADER_MAP[k] || k)
      const rows = filtered.map(r => keys.map(k => r[k]))
      const aoa = [headerRow, ...rows]
      const worksheet = XLSX.utils.aoa_to_sheet(aoa)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'MonthlyDonations')
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], { type: 'application/octet-stream' })
      const url = window.URL.createObjectURL(blob)
      const now = new Date()
      const dd = String(now.getDate()).padStart(2, '0')
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const yyyy = now.getFullYear()
      const filename = `MonthlyDonations_${dd}-${mm}-${yyyy}.xlsx`
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Error exporting transactions: ' + (err.message || err))
    } finally {
      setIsDownloadingTransactions(false)
    }
  }

  return (
    <SimpleModal isOpen={isOpen} onClose={onClose} title="Backups" maxWidth='max-w-xl'>
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ">
            
          <button
            onClick={downloadMatrix}
            disabled={isDownloadingMatrix}
            className={`px-4 py-3 rounded text-white ${isDownloadingMatrix ? 'bg-gray-300 cursor-wait' : 'bg-gray-400 hover:bg-gray-600'}`}>
            {isDownloadingMatrix ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                Preparing...
              </span>
            ) : (
              'Download Excel sheet'
            )}
          </button>

          <button
            onClick={downloadTransactions}
            disabled={isDownloadingTransactions}
            className={`px-4 py-3 rounded text-white ${isDownloadingTransactions ? 'bg-gray-500 cursor-wait' : 'bg-gray-700 hover:bg-gray-800'}`}>
            {isDownloadingTransactions ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                Preparing...
              </span>
            ) : (
              'Download Transaction Records'
            )}
          </button>
          
        </div>
        <p className="text-sm text-blue-600 mt-2 pb-3 w-full border-b-2 border-black">ℹ️ Use the Download Excel sheet button to get the Manually Maintainable Excel sheet - Same as Table Displaying on website.</p>
        
        
        <div>
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`p-4 rounded border-2 ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-dashed border-gray-300 bg-white'}`}>
            <div className="flex items-center space-x-3">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16l-4-4m0 0l4-4m-4 4h18"></path></svg>
              <div>
                <div className="font-medium">Drag & drop your Excel file here, or</div>
                <label className="text-blue-600 underline cursor-pointer">click to browse
                  <input type="file" accept=".xlsx,.xls" onChange={onFileChange} className="hidden" />
                </label>
                <div className="text-sm text-gray-500">Accepted: .xlsx, .xls — Format must match exported matrix</div>
              </div>
            </div>
            {selectedFile && (
              <div className="mt-3 text-sm">Selected file: <strong>{selectedFile.name}</strong></div>
            )}
          </div>
          <div className="mt-2">
            <button onClick={uploadExcel} className="w-full px-4 py-3 bg-red-400 hover:bg-red-500 text-gray-800 rounded cursor-pointer">Upload Excel Sheet</button>
          </div>
        </div>
        <p className="text-sm text-yellow-700 ">⚠️ Uploading Excel Sheet - Will overwrite the Database MonthlySync Table and it is not reversible.</p>
      </div>
      {/* Blocking progress overlay while uploading */}
      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 backdrop-blur-sm bg-white/40" />
          <div className="relative bg-white p-6 rounded shadow-lg w-11/12 max-w-2xl">
            <h3 className="font-bold mb-3">Applying Upload — Please wait</h3>
            <div className="w-full bg-gray-200 rounded h-3 mb-3">
              <div className="bg-blue-500 h-3 rounded" style={{ width: '50%' }} />
            </div>
            <div className="space-y-1 text-sm max-h-60 overflow-auto">
              {uploadStatusLines.map((l, i) => (
                <div key={i} className="py-1 border-b">{l}</div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Preview modal */}
      {isPreviewOpen && previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg w-11/12 max-w-3xl">
            <h3 className="font-bold mb-3">Upload Preview</h3>
            <div className="mb-4 text-sm">
              <div>Rows in uploaded file: <strong>{previewData.totalRows}</strong></div>
              <div>New Bhakts detected: <strong>{previewData.newBhakts?.length || 0}</strong></div>
              <div>Monthly changes detected: <strong>{previewData.monthlyChanges?.length || 0}</strong></div>
            </div>
            <div className="max-h-64 overflow-auto border p-2 mb-4">
              <h4 className="font-semibold">New Bhakts</h4>
              {previewData.newBhakts && previewData.newBhakts.length > 0 ? (
                <ul className="list-disc pl-5">
                  {previewData.newBhakts.map((n, i) => <li key={i}>{n.name || `${n.id || 'unknown id'}`}</li>)}
                </ul>
              ) : (
                <div className="text-sm text-gray-600">None</div>
              )}
            </div>
            <div className="max-h-64 overflow-auto border p-2 mb-4">
              <h4 className="font-semibold">Sample Monthly Changes</h4>
              {previewData.monthlyChanges && previewData.monthlyChanges.length > 0 ? (
                <table className="w-full text-sm table-auto">
                  <thead>
                    <tr className="text-left"><th>Bhakt</th><th>Year</th><th>Month</th><th>Existing</th><th>Uploaded</th></tr>
                  </thead>
                  <tbody>
                    {previewData.monthlyChanges.slice(0,50).map((mc, idx) => (
                      mc.diffs.map((d, j) => (
                        <tr key={`${idx}-${j}`}>
                          <td>{mc.name || mc.bhakt_id}</td>
                          <td>{d.year}</td>
                          <td>{d.month}</td>
                          <td>{d.existing ? String(d.existing.donated) : 'N/A'}</td>
                          <td>{String(d.uploaded)}</td>
                        </tr>
                      ))
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-sm text-gray-600">No monthly changes detected</div>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button onClick={() => { setIsPreviewOpen(false); setPreviewData(null) }} className="px-3 py-2 border rounded">Cancel</button>
              <button onClick={applyUpload} className="px-3 py-2 bg-red-500 text-white rounded">Apply Overwrite</button>
            </div>
          </div>
        </div>
      )}
    </SimpleModal>
  )
}

export default BackupsModal
