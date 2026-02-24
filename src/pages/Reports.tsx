import { products, recentSales } from "@/data/mockData";
import { TrendingUp, TrendingDown, Award, Package } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from "recharts";

// Compute product sales frequency
const productSalesMap = new Map<string, { name: string; qty: number; revenue: number }>();
recentSales.forEach((sale) => {
  sale.items.forEach((item) => {
    const existing = productSalesMap.get(item.productId) || { name: item.name, qty: 0, revenue: 0 };
    existing.qty += item.quantity;
    existing.revenue += item.total;
    productSalesMap.set(item.productId, existing);
  });
});

const topProducts = Array.from(productSalesMap.values()).sort((a, b) => b.qty - a.qty);
const topProductsChart = topProducts.slice(0, 8).map((p) => ({
  name: p.name.length > 12 ? p.name.slice(0, 12) + "…" : p.name,
  quantity: p.qty,
  revenue: p.revenue,
}));

const revenueByDay = [
  { date: "Feb 20", revenue: 1200 },
  { date: "Feb 21", revenue: 1800 },
  { date: "Feb 22", revenue: 345 },
  { date: "Feb 23", revenue: 658 },
  { date: "Feb 24", revenue: 798 },
];

const totalRevenue = recentSales.reduce((a, s) => a + s.total, 0);
const avgOrderValue = Math.round(totalRevenue / recentSales.length);

export default function Reports() {
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
          value={topProducts[0]?.name || "N/A"}
          subtitle={`${topProducts[0]?.qty || 0} units sold`}
          icon={Award}
          iconClassName="bg-warning"
        />
        <StatCard
          title="Total Products"
          value={products.length.toString()}
          subtitle={`${products.filter(p => p.stock <= 10).length} low stock`}
          icon={Package}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="stat-card">
          <h3 className="text-sm font-semibold mb-4 font-heading">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={revenueByDay}>
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
            <BarChart data={topProductsChart} layout="vertical">
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
          {products.sort((a, b) => a.stock - b.stock).slice(0, 6).map((p) => (
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
        </div>
      </div>
    </div>
  );
}
