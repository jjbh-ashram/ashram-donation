import React, { useState } from 'react'
import SimpleModal from './SimpleModal'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'

const BackupsModal = ({ isOpen, onClose }) => {
  const [isDownloadingMatrix, setIsDownloadingMatrix] = useState(false)
  const [isDownloadingTransactions, setIsDownloadingTransactions] = useState(false)

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

  const uploadExcel = () => {
    // placeholder - user will implement upload parsing & server endpoint
    alert('Upload Excel - not implemented yet')
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

      // Convert to worksheet and download using SheetJS
      const worksheet = XLSX.utils.json_to_sheet(data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'transactions')
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], { type: 'application/octet-stream' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      const filename = `monthly_donations_${new Date().toISOString().slice(0,10)}.xlsx`
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
            className={`px-4 py-3 rounded text-white ${isDownloadingMatrix ? 'bg-red-400 cursor-wait' : 'bg-red-600 hover:bg-red-700'}`}>
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
        <p className="text-sm text-gray-600 mt-2 pb-3 w-full border-b-2 border-black">Use the Download Excel sheet button to get the Manually Maintainable Excel sheet - Same as Table Displaying on website.</p>
        
        
        <button onClick={uploadExcel} className="w-full px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded cursor-pointer">Upload Excel Sheet</button>
        <p className="text-sm text-gray-600 ">Uploading Excel Sheet - Will overwrite the Database MonthlySync Table and it is not reversible.</p>
      </div>
    </SimpleModal>
  )
}

export default BackupsModal
