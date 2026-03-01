import { useState, useEffect } from "react";
import { Package, AlertTriangle, TrendingUp, CreditCard, Loader2 } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = [
  "hsl(160, 60%, 28%)", "hsl(38, 92%, 50%)", "hsl(210, 80%, 52%)",
  "hsl(142, 71%, 45%)", "hsl(0, 72%, 51%)", "hsl(280, 60%, 50%)",
];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [categoryData, setCategoryData] = useState<{ name: string; value: number }[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [weeklySales, setWeeklySales] = useState<{ day: string; sales: number }[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);

      // Fetch credit outstanding
      const { data: creditData } = await supabase.from("credit_transactions").select("amount, type");
      if (creditData) {
        const credit = creditData.filter(t => t.type === "credit").reduce((a, t) => a + Number(t.amount), 0);
        const paid = creditData.filter(t => t.type === "payment").reduce((a, t) => a + Number(t.amount), 0);
        setTotalOutstanding(Math.max(0, credit - paid));
      }

      // Fetch products for stats
      const [{ data: prods }, { data: cats }] = await Promise.all([
        supabase.from("products").select("id, name, stock, category_id"),
        supabase.from("categories").select("id, name"),
      ]);
      if (prods) {
        setProductCount(prods.length);
        setLowStockCount(prods.filter(p => p.stock <= 10).length);
        setLowStockProducts(prods.filter(p => p.stock <= 10));
        const catMap = new Map((cats || []).map(c => [c.id, c.name]));
        const grouped = prods.reduce((acc, p) => {
          const key = catMap.get(p.category_id || "") || "Uncategorized";
          const found = acc.find(c => c.name === key);
          if (found) found.value += p.stock;
          else acc.push({ name: key, value: p.stock });
          return acc;
        }, [] as { name: string; value: number }[]);
        setCategoryData(grouped);
      }

      // Fetch recent sales
      const { data: salesData } = await supabase
        .from("sales")
        .select("*, sale_items(*)")
        .order("created_at", { ascending: false })
        .limit(5);
      if (salesData) setRecentSales(salesData);

      // Today's revenue
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: todaySales } = await supabase
        .from("sales")
        .select("total")
        .gte("created_at", todayStart.toISOString());
      if (todaySales) {
        setTodayRevenue(todaySales.reduce((a, s) => a + Number(s.total), 0));
      }

      // Weekly sales (last 7 days)
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const weekData: { day: string; sales: number }[] = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        weekData.push({ day: dayNames[d.getDay()], sales: 0 });
      }
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);
      const { data: weekSalesData } = await supabase
        .from("sales")
        .select("total, created_at")
        .gte("created_at", weekStart.toISOString());
      if (weekSalesData) {
        weekSalesData.forEach((s) => {
          const saleDate = new Date(s.created_at);
          const diffDays = Math.floor((saleDate.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays < 7) {
            weekData[diffDays].sales += Number(s.total);
          }
        });
      }
      setWeeklySales(weekData);

      setLoading(false);
    };

    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of your store performance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Revenue"
          value={`₹${todayRevenue.toLocaleString()}`}
          subtitle="Today's total sales"
          icon={TrendingUp}
          iconClassName="bg-primary"
        />
        <StatCard
          title="Total Products"
          value={productCount.toString()}
          subtitle="In inventory"
          icon={Package}
        />
        <StatCard
          title="Low Stock Alert"
          value={lowStockCount.toString()}
          subtitle="Items need restocking"
          icon={AlertTriangle}
          iconClassName="bg-warning"
        />
        <StatCard
          title="Outstanding Credit"
          value={`₹${totalOutstanding.toLocaleString()}`}
          subtitle="Total udhari pending"
          icon={CreditCard}
          iconClassName="bg-destructive"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 stat-card">
          <h3 className="text-sm font-semibold mb-4 font-heading">Weekly Sales Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weeklySales}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(150, 12%, 89%)" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ borderRadius: "8px", border: "1px solid hsl(150, 12%, 89%)", fontSize: "12px" }}
                formatter={(value: number) => [`₹${value}`, "Sales"]}
              />
              <Bar dataKey="sales" fill="hsl(160, 60%, 28%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="stat-card">
          <h3 className="text-sm font-semibold mb-4 font-heading">Stock by Category</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                {categoryData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number, name: string) => [value, name]} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="stat-card">
          <h3 className="text-sm font-semibold mb-4 font-heading">Recent Sales</h3>
          <div className="space-y-3">
            {recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales yet</p>
            ) : recentSales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{sale.bill_number}</p>
                  <p className="text-xs text-muted-foreground">{sale.sale_items?.length || 0} items • {sale.payment_method}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">₹{sale.total}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(sale.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="stat-card">
          <h3 className="text-sm font-semibold mb-4 font-heading flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Low Stock Products
          </h3>
          {lowStockProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">All products are well stocked!</p>
          ) : (
            <div className="space-y-3">
              {lowStockProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    p.stock <= 5 ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
                  }`}>
                    {p.stock} left
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
