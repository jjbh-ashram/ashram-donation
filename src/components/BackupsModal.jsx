import React from 'react'
import SimpleModal from './SimpleModal'

const BackupsModal = ({ isOpen, onClose }) => {
  const downloadMatrix = async () => {
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
    }
  }

  const uploadExcel = () => {
    // placeholder - user will implement upload parsing & server endpoint
    alert('Upload Excel - not implemented yet')
  }

  const downloadTransactions = () => {
    // placeholder - could call /api/transactions-export
    alert('Download Transaction Records - not implemented yet')
  }

  return (
    <SimpleModal isOpen={isOpen} onClose={onClose} title="Backups" maxWidth='max-w-xl'>
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ">
            
          <button onClick={downloadMatrix} className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded cursor-pointer">Download Excel sheet</button>
          <button onClick={downloadTransactions} className="px-4 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded cursor-pointer">Download Transaction Records</button>
          
        </div>
        <p className="text-sm text-gray-600 mt-2 pb-3 w-full border-b-2 border-black">Use the Download Excel sheet button to get the Manually Maintainable Excel sheet - Same as Table Displaying on website.</p>
        
        
        <button onClick={uploadExcel} className="w-full px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded cursor-pointer">Upload Excel Sheet</button>
        <p className="text-sm text-gray-600 ">Uploading Excel Sheet - Will overwrite the Database MonthlySync Table and it is not reversible.</p>
      </div>
    </SimpleModal>
  )
}

export default BackupsModal
