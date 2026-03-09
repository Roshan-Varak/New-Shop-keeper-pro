import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, FileSpreadsheet, IndianRupee, TrendingUp, TrendingDown, Package, CreditCard, Wallet } from "lucide-react";
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
  profitLoss: number;
}

export default function Accounting() {
  const [selectedFY, setSelectedFY] = useState(getCurrentFY());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BalanceData>({
    totalSales: 0, totalPurchases: 0, inventoryValue: 0,
    totalCredit: 0, paymentsReceived: 0, profitLoss: 0,
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

      setData({
        totalSales, totalPurchases, inventoryValue, totalCredit, paymentsReceived,
        profitLoss: totalSales - totalPurchases,
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load balance sheet data");
    }
    setLoading(false);
  };

  const formatCurrency = (v: number) => `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  const balanceRows = [
    { label: "Total Sales Turnover", value: data.totalSales, icon: TrendingUp, color: "text-success" },
    { label: "Total Purchases", value: data.totalPurchases, icon: TrendingDown, color: "text-destructive" },
    { label: "Inventory Value (Current)", value: data.inventoryValue, icon: Package, color: "text-primary" },
    { label: "Total Credit / Udhari", value: data.totalCredit, icon: CreditCard, color: "text-warning" },
    { label: "Payments Received", value: data.paymentsReceived, icon: Wallet, color: "text-success" },
  ];

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Balance Sheet", 14, 22);
    doc.setFontSize(12);
    doc.text(`Financial Year: ${selectedFY.replace("-", "–")}`, 14, 32);
    doc.text(`Period: ${startDate} to ${endDate}`, 14, 40);

    autoTable(doc, {
      startY: 50,
      head: [["Particulars", "Amount (₹)"]],
      body: [
        ...balanceRows.map(r => [r.label, formatCurrency(r.value)]),
        ["", ""],
        ["Net Profit / Loss", formatCurrency(data.profitLoss)],
      ],
      styles: { fontSize: 11 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`Balance_Sheet_FY_${selectedFY}.pdf`);
    toast.success("PDF exported!");
  };

  const exportExcel = () => {
    const rows = [
      ["Balance Sheet"],
      [`Financial Year: ${selectedFY.replace("-", "–")}`],
      [`Period: ${startDate} to ${endDate}`],
      [],
      ["Particulars", "Amount (₹)"],
      ...balanceRows.map(r => [r.label, r.value]),
      [],
      ["Net Profit / Loss", data.profitLoss],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Balance Sheet");
    XLSX.writeFile(wb, `Balance_Sheet_FY_${selectedFY}.xlsx`);
    toast.success("Excel exported!");
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Accounting</h1>
          <p className="page-subtitle">Financial Year Balance Sheet</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportPDF} disabled={loading}>
            <Download className="w-4 h-4 mr-2" /> Export PDF
          </Button>
          <Button variant="outline" onClick={exportExcel} disabled={loading}>
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg font-heading">Financial Year</CardTitle>
            <Select value={selectedFY} onValueChange={setSelectedFY}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {financialYears.map(fy => (
                  <SelectItem key={fy} value={fy}>FY {fy.replace("-", "–")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">
            Period: 1 April {selectedFY.split("-")[0]} → 31 March {selectedFY.split("-")[1]}
          </p>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {balanceRows.map(row => (
              <Card key={row.label}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-muted ${row.color}`}>
                      <row.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{row.label}</p>
                      <p className="text-lg font-bold font-heading">{formatCurrency(row.value)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${data.profitLoss >= 0 ? "bg-success/10" : "bg-destructive/10"}`}>
                    <IndianRupee className={`w-6 h-6 ${data.profitLoss >= 0 ? "text-success" : "text-destructive"}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Net Profit / Loss</p>
                    <p className="text-2xl font-bold font-heading">{formatCurrency(data.profitLoss)}</p>
                  </div>
                </div>
                <Badge variant={data.profitLoss >= 0 ? "default" : "destructive"} className="text-sm">
                  {data.profitLoss >= 0 ? "Profit" : "Loss"}
                </Badge>
              </div>
              <Separator className="my-4" />
              <p className="text-xs text-muted-foreground">
                Calculated as: Total Sales ({formatCurrency(data.totalSales)}) − Total Purchases ({formatCurrency(data.totalPurchases)})
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
