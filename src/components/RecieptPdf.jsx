import React, { useRef } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

const AshramReceipt = ({
  ashramName = "श्री श्री प्रभु जगदबन्धु सुन्दर आश्रम",
  ashramAddress = "नैमिषारण्य धाम, जनपद सीतापुर (उ०प्र०)",
  name = "A N CHAKRAVORTI",
  monthlyDonation = "₹300",
  lastPaymentDate = "30 Aug 2025",
  extraBalance = "₹0",
  currentStatus = "Paid till Jan 2025 (Overdue)",
  statusColor = "#7a1fa2"
}) => {
  const receiptRef = useRef();

  const handleDownloadPDF = async () => {
    // Render content at normal scale for smaller image
  const canvas = await html2canvas(receiptRef.current, { scale: 2 });
  const imgData = canvas.toDataURL("image/png");

  // Standard A4: 595 x 842 px
  const pageWidth = 595;
  const pageHeight = 842;

  // Desired max image/card width for fitting inside A4
  const targetWidth = 270; // px; adjust 280–320 for even smaller receipts
  const aspectRatio = canvas.height / canvas.width;
  const targetHeight = targetWidth * aspectRatio;

  // Centering coordinates
  const xOffset = (pageWidth - targetWidth) / 2;
  const yOffset = 65;

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "px",
    format: "a4"
  });

  // Optional: white card effect (subtle frame around receipt)
  pdf.setFillColor(255, 255, 255);
  pdf.rect(xOffset, yOffset, targetWidth, targetHeight, "F");

  // Draw border around the card (stroke only)
pdf.setLineWidth(2);
pdf.setDrawColor(180, 141, 55); // Gold border
pdf.rect(xOffset - 12, yOffset - 12, targetWidth + 24, targetHeight + 24, "S");

  pdf.addImage(imgData, "PNG", xOffset, yOffset, targetWidth, targetHeight);
  pdf.save(`${name}_${lastPaymentDate}_receipt.pdf`);
  };

  return (
    <div
      style={{
        minHeight: "400px",
        width: "500px",
        margin: "2rem auto",
        background: "#ffffffff",
        borderRadius: "16px",
        boxShadow: "0 4px 12px #c0b28026",
        fontFamily: "'Mukti Narrow', sans-serif",
        padding: "1.5rem"
      }}
    >
      <div ref={receiptRef}>
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <img src="/img.jpg" alt="Header spiritual" style={{
            width: "60%", borderRadius: "18px", boxShadow: "0 2px 8px #888", objectFit: "cover", margin: "0 auto"
          }} />
        </div>
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <div style={{
            fontSize: "1.3rem",
            fontWeight: "700",
            color: "#be2424",
            lineHeight: "1.5"
          }}>
            {ashramName}
          </div>
          <div style={{ fontSize: "1.05rem", color: "#3b3499", fontWeight: "500" }}>
            {ashramAddress}
          </div>
        </div>
        <div style={{
          background: "#fff",
          borderRadius: "12px",
          boxShadow: "0 1px 6px #d8cfa2",
          padding: "1rem 1.2rem",
          fontSize: "1.2rem"
        }}>
          <div style={{ fontSize: "1.07rem", fontWeight: "700", color: "#6d4f0c", marginBottom: "0.7rem", display: "flex", alignItems: "center" }}>
            <span role="img" aria-label="Receipt" style={{ marginRight: "8px", fontSize: "1.18rem" }}>🧾</span>
            Payment Receipt
          </div>
          <div><strong>Name:</strong> {name}</div>
          <div>
            <strong>Monthly Donation:</strong>
            <span style={{ color: "#1ab63a", fontWeight: "bold" }}> {monthlyDonation}</span>
          </div>
          <div><strong>Last Payment Date:</strong> {lastPaymentDate}</div>
          <div>
            <strong>Extra Balance:</strong>
            <span style={{ color: "#1176c0" }}> {extraBalance}</span>
          </div>
          <div>
            <strong>Current Status:</strong>
            <span style={{ color: statusColor, fontWeight: "bold" }}> {currentStatus}</span>
          </div>
        </div>
      </div>
      <button
        onClick={handleDownloadPDF}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-base font-medium rounded-lg transition duration-200 w-full mt-6 hover:scale-95 hover:cursor-pointer"
      >
        Download PDF
      </button>
    </div>
  );
};

export default AshramReceipt;
