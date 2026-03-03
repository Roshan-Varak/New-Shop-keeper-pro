import { useState, useMemo, useEffect, useRef } from "react";
import { Search, Plus, Minus, Trash2, Receipt, Printer, User, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  stock: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  unit: string;
  category_id: string | null;
}

interface Customer {
  id: string;
  name: string;
  mobile: string;
}

interface BillData {
  billNumber: string;
  date: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  customerName?: string;
}

export default function Billing() {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [printBill, setPrintBill] = useState<BillData | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("id, name, price, stock, unit, category_id");
    if (data) setProducts(data);
  };

  useEffect(() => {
    fetchProducts();
    const fetchCustomers = async () => {
      const { data } = await supabase.from("customers").select("id, name, mobile");
      if (data) setCustomers(data);
    };
    fetchCustomers();
  }, []);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    if (product.stock <= 0) { toast.error("Out of stock!"); return; }
    const existing = cart.find((c) => c.productId === productId);
    if (existing) {
      if (existing.quantity >= product.stock) { toast.error("Insufficient stock!"); return; }
      setCart(cart.map((c) =>
        c.productId === productId
          ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * c.price }
          : c
      ));
    } else {
      setCart([...cart, { productId, name: product.name, quantity: 1, price: product.price, total: product.price, stock: product.stock }]);
    }
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(cart.map((c) => {
      if (c.productId !== productId) return c;
      const newQty = c.quantity + delta;
      if (newQty <= 0) return c;
      if (newQty > c.stock) { toast.error("Insufficient stock!"); return c; }
      return { ...c, quantity: newQty, total: newQty * c.price };
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((c) => c.productId !== productId));
  };

  const subtotal = useMemo(() => cart.reduce((a, c) => a + c.total, 0), [cart]);
  const total = subtotal - discount;

  const handleGenerateBill = async () => {
    if (cart.length === 0) { toast.error("Add items to the cart first!"); return; }
    if (paymentMethod === "Credit" && !selectedCustomerId) { toast.error("Select a customer for credit sale!"); return; }

    setSubmitting(true);
    const billNumber = `PGS-${Date.now().toString().slice(-6)}`;

    const items = cart.map((c) => ({
      product_id: c.productId, name: c.name, quantity: c.quantity, price: c.price, total: c.total,
    }));

    const { data, error } = await supabase.rpc("create_sale", {
      p_bill_number: billNumber,
      p_subtotal: subtotal,
      p_discount: discount,
      p_total: total,
      p_payment_method: paymentMethod,
      p_customer_id: paymentMethod === "Credit" ? selectedCustomerId : null,
      p_items: items,
    });

    if (error) {
      console.error("Billing error:", error);
      toast.error(error.message || "Failed to create sale");
      setSubmitting(false);
      return;
    }

    const customerName = paymentMethod === "Credit" ? customers.find(c => c.id === selectedCustomerId)?.name : undefined;

    setPrintBill({
      billNumber,
      date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      items: [...cart],
      subtotal,
      discount,
      total,
      paymentMethod,
      customerName,
    });

    toast.success(`Bill ${billNumber} generated! Total: ₹${total}`);
    setCart([]);
    setDiscount(0);
    setSearch("");
    setPaymentMethod("Cash");
    setSelectedCustomerId("");
    setSubmitting(false);
    fetchProducts();
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Bill - ${printBill?.billNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; font-size: 12px; padding: 10px; max-width: 300px; margin: 0 auto; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .line { border-top: 1px dashed #000; margin: 6px 0; }
        .row { display: flex; justify-content: space-between; padding: 2px 0; }
        .items th, .items td { text-align: left; padding: 2px 4px; font-size: 11px; }
        .items { width: 100%; border-collapse: collapse; }
        .items th { border-bottom: 1px solid #000; }
        .right { text-align: right; }
        h2 { font-size: 16px; margin-bottom: 2px; }
        @media print { body { padding: 0; } }
      </style></head><body>
    `);
    printWindow.document.write(content.innerHTML);
    printWindow.document.write("</body></html>");
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="page-header">
        <h1 className="page-title">New Sale</h1>
        <p className="page-subtitle">Create a new bill</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Product Selection */}
        <div className="lg:col-span-3 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search products to add..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-auto">
            {filteredProducts.map((p) => (
              <button key={p.id} onClick={() => addToCart(p.id)} disabled={p.stock <= 0}
                className="stat-card text-left hover:border-primary/50 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                <p className="text-sm font-medium truncate">{p.name}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-bold text-primary">₹{p.price}</span>
                  <Badge variant={p.stock <= 5 ? "destructive" : "secondary"} className="text-[10px]">
                    {p.stock <= 0 ? "Out" : `${p.stock} left`}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{p.unit}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Cart / Bill */}
        <div className="lg:col-span-2">
          <div className="glass-card p-5 sticky top-0">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="w-5 h-5 text-primary" />
              <h3 className="text-base font-semibold font-heading">Current Bill</h3>
              <Badge className="ml-auto">{cart.length} items</Badge>
            </div>

            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Click on products to add them to the bill</p>
            ) : (
              <div className="space-y-3 max-h-[40vh] overflow-auto">
                {cart.map((item) => (
                  <div key={item.productId} className="flex items-center gap-3 py-2 border-b last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">₹{item.price} each</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.productId, -1)}><Minus className="w-3 h-3" /></Button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.productId, 1)}><Plus className="w-3 h-3" /></Button>
                    </div>
                    <p className="text-sm font-semibold w-16 text-right">₹{item.total}</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(item.productId)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                ))}
              </div>
            )}

            <Separator className="my-4" />

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">₹{subtotal}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <Input type="number" value={discount} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))} className="w-24 h-8 text-right" min={0} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Payment</span>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Credit">Credit / Udhari</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod === "Credit" && (
                <div className="space-y-2 p-3 rounded-lg bg-muted/50 border border-dashed">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <User className="w-4 h-4 text-primary" /> Select Customer
                  </div>
                  <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                    <SelectTrigger className="h-8"><SelectValue placeholder="Choose customer..." /></SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name} — {c.mobile}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {customers.length === 0 && <p className="text-xs text-muted-foreground">No customers yet. Add from Credit Management.</p>}
                </div>
              )}

              <Separator />
              <div className="flex justify-between text-lg font-bold font-heading">
                <span>Total</span>
                <span className="text-primary">₹{total}</span>
              </div>
            </div>

            <Button className="w-full mt-4" size="lg" onClick={handleGenerateBill} disabled={submitting}>
              <Printer className="w-4 h-4 mr-2" /> {submitting ? "Processing..." : "Generate Bill"}
            </Button>
          </div>
        </div>
      </div>

      {/* Print Bill Dialog */}
      <Dialog open={!!printBill} onOpenChange={(o) => { if (!o) setPrintBill(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Bill Generated
            </DialogTitle>
          </DialogHeader>
          {printBill && (
            <div className="space-y-4">
              {/* Hidden printable content */}
              <div ref={printRef} style={{ position: "absolute", left: "-9999px" }}>
                <div className="center">
                  <h2 className="bold">Pravinkumar General Store</h2>
                  <div className="line"></div>
                  <div className="row"><span>Bill No:</span><span>{printBill.billNumber}</span></div>
                  <div className="row"><span>Date:</span><span>{printBill.date}</span></div>
                  {printBill.customerName && <div className="row"><span>Customer:</span><span>{printBill.customerName}</span></div>}
                  <div className="line"></div>
                  <table className="items">
                    <thead><tr><th>Item</th><th className="right">Qty</th><th className="right">Rate</th><th className="right">Amt</th></tr></thead>
                    <tbody>
                      {printBill.items.map((item, i) => (
                        <tr key={i}><td>{item.name}</td><td className="right">{item.quantity}</td><td className="right">₹{item.price}</td><td className="right">₹{item.total}</td></tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="line"></div>
                  <div className="row"><span>Subtotal:</span><span>₹{printBill.subtotal}</span></div>
                  {printBill.discount > 0 && <div className="row"><span>Discount:</span><span>-₹{printBill.discount}</span></div>}
                  <div className="row bold"><span>TOTAL:</span><span>₹{printBill.total}</span></div>
                  <div className="line"></div>
                  <div className="row"><span>Payment:</span><span>{printBill.paymentMethod}</span></div>
                  <div className="line"></div>
                  <p className="center" style={{ marginTop: "8px", fontSize: "10px" }}>Thank you for your purchase!</p>
                </div>
              </div>

              {/* Preview in dialog */}
              <div className="border rounded-lg p-4 bg-muted/30 text-sm space-y-2 font-mono">
                <p className="text-center font-bold text-base">Pravinkumar General Store</p>
                <Separator />
                <div className="flex justify-between"><span>Bill No:</span><span>{printBill.billNumber}</span></div>
                <div className="flex justify-between"><span>Date:</span><span>{printBill.date}</span></div>
                {printBill.customerName && <div className="flex justify-between"><span>Customer:</span><span>{printBill.customerName}</span></div>}
                <Separator />
                {printBill.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="flex-1 truncate">{item.name}</span>
                    <span className="w-10 text-right">{item.quantity}x</span>
                    <span className="w-16 text-right">₹{item.price}</span>
                    <span className="w-16 text-right font-medium">₹{item.total}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between"><span>Subtotal:</span><span>₹{printBill.subtotal}</span></div>
                {printBill.discount > 0 && <div className="flex justify-between text-muted-foreground"><span>Discount:</span><span>-₹{printBill.discount}</span></div>}
                <div className="flex justify-between font-bold text-base"><span>TOTAL:</span><span>₹{printBill.total}</span></div>
                <div className="flex justify-between text-xs text-muted-foreground"><span>Payment:</span><span>{printBill.paymentMethod}</span></div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-2" /> Print Bill
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setPrintBill(null)}>
                  <X className="w-4 h-4 mr-2" /> Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
