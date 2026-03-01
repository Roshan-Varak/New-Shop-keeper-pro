import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Award, Package, IndianRupee, Loader2 } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from "recharts";

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [avgOrderValue, setAvgOrderValue] = useState(0);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [bestSeller, setBestSeller] = useState<{ name: string; qty: number }>({ name: "N/A", qty: 0 });
  const [productCount, setProductCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [topProducts, setTopProducts] = useState<{ name: string; quantity: number }[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<{ date: string; revenue: number }[]>([]);
  const [inventoryStatus, setInventoryStatus] = useState<{ id: string; name: string; stock: number; category: string }[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);

      // Fetch all sales with items
      const { data: sales } = await supabase
        .from("sales")
        .select("total, created_at, sale_items(name, quantity, product_id)")
        .order("created_at", { ascending: false });

      if (sales) {
        const rev = sales.reduce((a, s) => a + Number(s.total), 0);
        setTotalRevenue(rev);
        setAvgOrderValue(sales.length > 0 ? Math.round(rev / sales.length) : 0);

        // Top selling products
        const productMap = new Map<string, { name: string; quantity: number }>();
        sales.forEach((s) => {
          (s.sale_items as any[])?.forEach((item) => {
            const existing = productMap.get(item.product_id) || { name: item.name, quantity: 0 };
            existing.quantity += item.quantity;
            productMap.set(item.product_id, existing);
          });
        });
        const sorted = Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity);
        setTopProducts(sorted.slice(0, 8).map(p => ({
          name: p.name.length > 14 ? p.name.slice(0, 14) + "…" : p.name,
          quantity: p.quantity,
        })));
        if (sorted.length > 0) setBestSeller({ name: sorted[0].name, qty: sorted[0].quantity });

        // Revenue trend (last 7 days)
        const dayMap = new Map<string, number>();
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          dayMap.set(d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }), 0);
        }
        sales.forEach((s) => {
          const d = new Date(s.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
          if (dayMap.has(d)) dayMap.set(d, (dayMap.get(d) || 0) + Number(s.total));
        });
        setRevenueTrend(Array.from(dayMap.entries()).map(([date, revenue]) => ({ date, revenue })));
      }

      // Products + categories for inventory
      const [{ data: prods }, { data: cats }, { data: creditData }] = await Promise.all([
        supabase.from("products").select("id, name, stock, category_id").order("stock", { ascending: true }),
        supabase.from("categories").select("id, name"),
        supabase.from("credit_transactions").select("amount, type"),
      ]);

      if (prods) {
        setProductCount(prods.length);
        setLowStockCount(prods.filter(p => p.stock <= 10).length);
        const catMap = new Map((cats || []).map(c => [c.id, c.name]));
        setInventoryStatus(prods.slice(0, 6).map(p => ({
          id: p.id,
          name: p.name,
          stock: p.stock,
          category: catMap.get(p.category_id || "") || "—",
        })));
      }

      if (creditData) {
        const credit = creditData.filter(t => t.type === "credit").reduce((a, t) => a + Number(t.amount), 0);
        const paid = creditData.filter(t => t.type === "payment").reduce((a, t) => a + Number(t.amount), 0);
        setTotalOutstanding(Math.max(0, credit - paid));
      }

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
        <h1 className="page-title">Reports & Analytics</h1>
        <p className="page-subtitle">Insights into your store's performance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={`₹${totalRevenue.toLocaleString()}`}
          icon={TrendingUp}
          iconClassName="bg-primary"
        />
        <StatCard
          title="Avg Order Value"
          value={`₹${avgOrderValue}`}
          icon={TrendingDown}
        />
        <StatCard
          title="Best Seller"
          value={bestSeller.name}
          subtitle={`${bestSeller.qty} units sold`}
          icon={Award}
          iconClassName="bg-warning"
        />
        <StatCard
          title="Outstanding Credit"
          value={`₹${totalOutstanding.toLocaleString()}`}
          subtitle="Total udhari pending"
          icon={IndianRupee}
          iconClassName="bg-destructive"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="stat-card">
          <h3 className="text-sm font-semibold mb-4 font-heading">Revenue Trend (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(150, 12%, 89%)" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => [`₹${v}`, "Revenue"]} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(150,12%,89%)", fontSize: "12px" }} />
              <Line type="monotone" dataKey="revenue" stroke="hsl(160, 60%, 28%)" strokeWidth={2.5} dot={{ fill: "hsl(160, 60%, 28%)", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="stat-card">
          <h3 className="text-sm font-semibold mb-4 font-heading">Top Selling Products</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topProducts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(150, 12%, 89%)" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
              <Tooltip formatter={(v: number) => [v, "Qty Sold"]} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(150,12%,89%)", fontSize: "12px" }} />
              <Bar dataKey="quantity" fill="hsl(38, 92%, 50%)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="stat-card">
        <h3 className="text-sm font-semibold mb-4 font-heading">Inventory Status</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {inventoryStatus.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.category}</p>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                p.stock <= 5 ? "bg-destructive/10 text-destructive" :
                p.stock <= 15 ? "bg-warning/10 text-warning" :
                "bg-success/10 text-success"
              }`}>
                {p.stock} in stock
              </span>
            </div>
          ))}
          {inventoryStatus.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-3 text-center py-4">No products found</p>
          )}
        </div>
      </div>
    </div>
  );
}
