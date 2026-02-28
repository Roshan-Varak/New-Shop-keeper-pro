import { useState, useEffect } from "react";
import { Search, Eye, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface SaleItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface Sale {
  id: string;
  bill_number: string;
  created_at: string;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string;
  sale_items: SaleItem[];
}

export default function SalesHistory() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSales = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("sales")
        .select("*, sale_items(*)")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Fetch sales error:", error);
      }
      if (data) setSales(data);
      setLoading(false);
    };
    fetchSales();
  }, []);

  const filtered = sales.filter((s) =>
    s.bill_number.toLowerCase().includes(search.toLowerCase()) ||
    s.created_at.includes(search)
  );

  const paymentColor: Record<string, string> = {
    Cash: "bg-success/10 text-success",
    UPI: "bg-info/10 text-info",
    Card: "bg-primary/10 text-primary",
    Credit: "bg-warning/10 text-warning",
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="page-header">
        <h1 className="page-title">Sales History</h1>
        <p className="page-subtitle">{sales.length} total sales recorded</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by bill number or date..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bill No.</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead className="text-center">Items</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No sales found</TableCell>
              </TableRow>
            ) : filtered.map((sale) => (
              <TableRow key={sale.id} className="animate-fade-in">
                <TableCell className="font-medium text-sm">{sale.bill_number}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <div>
                      <p>{new Date(sale.created_at).toLocaleDateString("en-IN")}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sale.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{sale.sale_items?.length || 0}</Badge>
                </TableCell>
                <TableCell>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${paymentColor[sale.payment_method] || ""}`}>
                    {sale.payment_method}
                  </span>
                </TableCell>
                <TableCell className="text-right font-semibold">₹{sale.total}</TableCell>
                <TableCell className="text-right">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="font-heading">Bill: {sale.bill_number}</DialogTitle>
                        <DialogDescription>Sale details and items</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{new Date(sale.created_at).toLocaleString("en-IN")}</span>
                          <span>{sale.payment_method}</span>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                          {sale.sale_items?.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span>{item.name} × {item.quantity}</span>
                              <span className="font-medium">₹{item.total}</span>
                            </div>
                          ))}
                        </div>
                        <Separator />
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>₹{sale.subtotal}</span>
                          </div>
                          {sale.discount > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Discount</span>
                              <span className="text-success">-₹{sale.discount}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-base font-bold font-heading pt-2">
                            <span>Total</span>
                            <span className="text-primary">₹{sale.total}</span>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
