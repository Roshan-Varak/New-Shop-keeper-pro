import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

function getFinancialYears() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const years: string[] = [];
  const endYear = currentMonth >= 3 ? currentYear + 1 : currentYear;
  for (let i = endYear; i >= endYear - 5; i--) {
    years.push(`${i - 1}-${i}`);
  }
  return years;
}

function getCurrentFY() {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${year + 1}`;
}

function getFYDates(fy: string) {
  const [start, end] = fy.split("-").map(Number);
  return {
    startDate: `${start}-04-01`,
    endDate: `${end}-03-31`,
  };
}

interface BalanceData {
  totalSales: number;
  totalPurchases: number;
  inventoryValue: number;
  totalCredit: number;
  paymentsReceived: number;
}

export default function Accounting() {
  const [selectedFY, setSelectedFY] = useState(getCurrentFY());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BalanceData>({
    totalSales: 0, totalPurchases: 0, inventoryValue: 0,
    totalCredit: 0, paymentsReceived: 0,
  });

  const financialYears = useMemo(() => getFinancialYears(), []);
  const { startDate, endDate } = useMemo(() => getFYDates(selectedFY), [selectedFY]);

  useEffect(() => {
    fetchBalanceData();
  }, [selectedFY]);

  const fetchBalanceData = async () => {
    setLoading(true);
    try {
      const [salesRes, purchasesRes, productsRes, creditRes, paymentsRes] = await Promise.all([
        supabase.from("sales").select("total").gte("created_at", startDate).lte("created_at", endDate + "T23:59:59"),
        supabase.from("purchases").select("total_cost").gte("purchase_date", startDate).lte("purchase_date", endDate),
        supabase.from("products").select("stock, price"),
        supabase.from("credit_transactions").select("amount").eq("type", "credit").gte("created_at", startDate).lte("created_at", endDate + "T23:59:59"),
        supabase.from("credit_transactions").select("amount").eq("type", "payment").gte("created_at", startDate).lte("created_at", endDate + "T23:59:59"),
      ]);

      const totalSales = (salesRes.data || []).reduce((s, r) => s + Number(r.total), 0);
      const totalPurchases = (purchasesRes.data || []).reduce((s, r) => s + Number(r.total_cost), 0);
      const inventoryValue = (productsRes.data || []).reduce((s, r) => s + Number(r.stock) * Number(r.price), 0);
      const totalCredit = (creditRes.data || []).reduce((s, r) => s + Number(r.amount), 0);
      const paymentsReceived = (paymentsRes.data || []).reduce((s, r) => s + Number(r.amount), 0);

      setData({ totalSales, totalPurchases, inventoryValue, totalCredit, paymentsReceived });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load balance sheet data");
    }
    setLoading(false);
  };

  const fmt = (v: number) => `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  // Derived values for balance sheet
  const cashInHand = data.totalSales - data.totalPurchases + data.paymentsReceived;
  const receivables = data.totalCredit - data.paymentsReceived; // outstanding credit
  const totalCurrentAssets = cashInHand + receivables;
  const totalAssets = totalCurrentAssets + data.inventoryValue;

  const totalCurrentLiabilities = data.totalCredit > data.paymentsReceived ? 0 : 0; // payables if any
  const totalLiabilities = totalCurrentLiabilities;

  const retainedEarnings = data.totalSales - data.totalPurchases;
  const capitalInvested = data.inventoryValue; // approximation
  const totalOwnersEquity = totalAssets - totalLiabilities;

  const allRows = [
    { label: "Total Sales Turnover", value: data.totalSales },
    { label: "Total Purchases", value: data.totalPurchases },
    { label: "Inventory Value", value: data.inventoryValue },
    { label: "Total Credit / Udhari", value: data.totalCredit },
    { label: "Payments Received", value: data.paymentsReceived },
    { label: "Net Profit / Loss", value: retainedEarnings },
  ];

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Balance Sheet", 14, 20);
    doc.setFontSize(11);
    doc.text(`Financial Year: ${selectedFY.replace("-", "–")}`, 14, 28);
    doc.text(`As at 31 March ${selectedFY.split("-")[1]}`, 14, 35);

    autoTable(doc, {
      startY: 42,
      head: [["Particulars", "Amount (₹)", "Total (₹)"]],
      body: [
        [{ content: "ASSETS", colSpan: 3, styles: { fontStyle: "bold" } }],
        ["Cash in Hand", fmt(cashInHand), ""],
        ["Receivables (Udhari)", fmt(receivables), ""],
        [{ content: "Total Current Assets", styles: { fontStyle: "bold" } }, "", fmt(totalCurrentAssets)],
        ["Inventory (Stock)", fmt(data.inventoryValue), ""],
        [{ content: "Total Assets", styles: { fontStyle: "bold" } }, "", fmt(totalAssets)],
        ["", "", ""],
        [{ content: "LIABILITIES", colSpan: 3, styles: { fontStyle: "bold" } }],
        ["Current Liabilities", fmt(totalCurrentLiabilities), ""],
        [{ content: "Total Liabilities", styles: { fontStyle: "bold" } }, "", fmt(totalLiabilities)],
        ["", "", ""],
        [{ content: "OWNER'S EQUITY", colSpan: 3, styles: { fontStyle: "bold" } }],
        ["Retained Earnings (Profit/Loss)", fmt(retainedEarnings), ""],
        [{ content: "Total Owner's Equity", styles: { fontStyle: "bold" } }, "", fmt(totalOwnersEquity)],
        ["", "", ""],
        [{ content: "Total Liabilities & Equity", styles: { fontStyle: "bold" } }, "", fmt(totalLiabilities + totalOwnersEquity)],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`Balance_Sheet_FY_${selectedFY}.pdf`);
    toast.success("PDF exported!");
  };

  const exportExcel = () => {
    const rows = [
      ["Balance Sheet"],
      [`Financial Year: ${selectedFY.replace("-", "–")}`],
      [`As at 31 March ${selectedFY.split("-")[1]}`],
      [],
      ["Particulars", "Amount (₹)", "Total (₹)"],
      ["ASSETS"],
      ["Cash in Hand", cashInHand],
      ["Receivables (Udhari)", receivables],
      ["Total Current Assets", "", totalCurrentAssets],
      ["Inventory (Stock)", data.inventoryValue],
      ["Total Assets", "", totalAssets],
      [],
      ["LIABILITIES"],
      ["Current Liabilities", totalCurrentLiabilities],
      ["Total Liabilities", "", totalLiabilities],
      [],
      ["OWNER'S EQUITY"],
      ["Retained Earnings (Profit/Loss)", retainedEarnings],
      ["Total Owner's Equity", "", totalOwnersEquity],
      [],
      ["Total Liabilities & Equity", "", totalLiabilities + totalOwnersEquity],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Balance Sheet");
    XLSX.writeFile(wb, `Balance_Sheet_FY_${selectedFY}.xlsx`);
    toast.success("Excel exported!");
  };

  const BalanceRow = ({ label, amount, total, bold, underline }: { label: string; amount?: string; total?: string; bold?: boolean; underline?: boolean }) => (
    <tr className={`${bold ? "font-bold" : ""}`}>
      <td className={`py-1.5 pr-4 ${bold ? "pl-8" : "pl-4"}`}>{label}</td>
      <td className={`py-1.5 text-right pr-6 ${underline ? "border-b border-foreground" : ""}`}>{amount || ""}</td>
      <td className={`py-1.5 text-right ${underline ? "border-b border-foreground" : ""}`}>{total || ""}</td>
    </tr>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <tr>
      <td colSpan={3} className="pt-5 pb-1.5 font-bold text-base">{title}</td>
    </tr>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Accounting</h1>
          <p className="page-subtitle">Financial Year Balance Sheet</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={selectedFY} onValueChange={setSelectedFY}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {financialYears.map(fy => (
                <SelectItem key={fy} value={fy}>FY {fy.replace("-", "–")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportPDF} disabled={loading}>
            <Download className="w-4 h-4 mr-1" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel} disabled={loading}>
            <FileSpreadsheet className="w-4 h-4 mr-1" /> Excel
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              {/* Header */}
              <thead>
                <tr className="bg-muted/60">
                  <td className="p-4 pb-1">
                    <p className="font-bold text-lg font-heading">Balance Sheet</p>
                    <p className="text-muted-foreground text-xs">
                      As at 31 March {selectedFY.split("-")[1]} &nbsp;|&nbsp; FY {selectedFY.replace("-", "–")}
                    </p>
                  </td>
                  <td className="p-4 pb-1 text-right text-xs text-muted-foreground italic" colSpan={2}>
                    Figures in ₹
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Particulars</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide pr-6">Amount</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Total</th>
                </tr>
              </thead>
              <tbody className="font-mono text-[13px]">
                {/* ASSETS */}
                <SectionHeader title="ASSETS" />
                <BalanceRow label="Cash in Hand" amount={fmt(cashInHand)} />
                <BalanceRow label="Receivables (Udhari)" amount={fmt(receivables)} underline />
                <BalanceRow label="Total Current Assets" total={fmt(totalCurrentAssets)} bold />
                <BalanceRow label="Inventory (Stock Value)" amount={fmt(data.inventoryValue)} underline />
                <BalanceRow label="Total Assets" total={fmt(totalAssets)} bold underline />

                {/* LIABILITIES */}
                <SectionHeader title="LIABILITIES" />
                <BalanceRow label="Current Liabilities" amount={fmt(totalCurrentLiabilities)} underline />
                <BalanceRow label="Total Liabilities" total={fmt(totalLiabilities)} bold />

                {/* OWNER'S EQUITY */}
                <SectionHeader title="OWNER'S EQUITY" />
                <BalanceRow label="Capital (Inventory Investment)" amount={fmt(capitalInvested)} />
                <BalanceRow label="Retained Earnings (Profit/Loss)" amount={fmt(retainedEarnings)} underline />
                <BalanceRow label="Total Owner's Equity" total={fmt(totalOwnersEquity)} bold />

                {/* TOTAL */}
                <tr className="border-t-2 border-foreground bg-muted/40">
                  <td className="py-3 px-4 font-bold text-sm">Total Liabilities & Equity</td>
                  <td className="py-3 text-right pr-6"></td>
                  <td className="py-3 text-right font-bold text-sm">{fmt(totalLiabilities + totalOwnersEquity)}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}