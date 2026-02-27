import { useState, useEffect } from "react";
import { IndianRupee, ShoppingBag, Package, AlertTriangle, TrendingUp, CreditCard } from "lucide-react";
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

const salesByDay = [
  { day: "Mon", sales: 2400 }, { day: "Tue", sales: 1800 },
  { day: "Wed", sales: 3200 }, { day: "Thu", sales: 2800 },
  { day: "Fri", sales: 3600 }, { day: "Sat", sales: 4200 },
  { day: "Sun", sales: 2100 },
];

export default function Dashboard() {
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [categoryData, setCategoryData] = useState<{ name: string; value: number }[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);

  useEffect(() => {
    // Fetch outstanding credit
    supabase.from("credit_transactions").select("*").then(({ data }) => {
      if (data) {
        const credit = data.filter(t => t.type === "credit").reduce((a, t) => a + Number(t.amount), 0);
        const paid = data.filter(t => t.type === "payment").reduce((a, t) => a + Number(t.amount), 0);
        setTotalOutstanding(credit - paid);
      }
    });

    // Fetch products for stats
    supabase.from("products").select("id, name, stock, category_id").then(({ data }) => {
      if (data) {
        setProductCount(data.length);
        setLowStockCount(data.filter(p => p.stock <= 10).length);
        setLowStockProducts(data.filter(p => p.stock <= 10));
        // Category grouping by category_id (simplified)
        const grouped = data.reduce((acc, p) => {
          const key = p.category_id || "Uncategorized";
          const found = acc.find(c => c.name === key);
          if (found) found.value += p.stock;
          else acc.push({ name: key, value: p.stock });
          return acc;
        }, [] as { name: string; value: number }[]);
        setCategoryData(grouped);
      }
    });

    // Fetch recent sales
    supabase.from("sales").select("*, sale_items(*)").order("created_at", { ascending: false }).limit(4).then(({ data }) => {
      if (data) setRecentSales(data);
    });
  }, []);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of your store performance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          title="Recent Sales"
          value={recentSales.length.toString()}
          subtitle="Latest transactions"
          icon={TrendingUp}
          iconClassName="bg-info"
        />
        <StatCard
          title="Outstanding Credit"
          value={`₹${Math.max(0, totalOutstanding).toLocaleString()}`}
          subtitle="Total udhari pending"
          icon={CreditCard}
          iconClassName="bg-destructive"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 stat-card">
          <h3 className="text-sm font-semibold mb-4 font-heading">Weekly Sales Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={salesByDay}>
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
