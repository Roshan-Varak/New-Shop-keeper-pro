import { useState, useMemo, useEffect } from "react";
import { Search, Plus, Minus, Trash2, Receipt, Printer, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function Billing() {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

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
    if (product.stock <= 0) {
      toast.error("Out of stock!");
      return;
    }
    const existing = cart.find((c) => c.productId === productId);
    if (existing) {
      if (existing.quantity >= product.stock) {
        toast.error("Insufficient stock!");
        return;
      }
      setCart(cart.map((c) =>
        c.productId === productId
          ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * c.price }
          : c
      ));
    } else {
      setCart([...cart, {
        productId, name: product.name, quantity: 1, price: product.price, total: product.price, stock: product.stock,
      }]);
    }
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(cart.map((c) => {
      if (c.productId !== productId) return c;
      const newQty = c.quantity + delta;
      if (newQty <= 0) return c;
      if (newQty > c.stock) {
        toast.error("Insufficient stock!");
        return c;
      }
      return { ...c, quantity: newQty, total: newQty * c.price };
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((c) => c.productId !== productId));
  };

  const subtotal = useMemo(() => cart.reduce((a, c) => a + c.total, 0), [cart]);
  const total = subtotal - discount;

  const handleGenerateBill = async () => {
    if (cart.length === 0) {
      toast.error("Add items to the cart first!");
      return;
    }
    if (paymentMethod === "Credit" && !selectedCustomerId) {
      toast.error("Select a customer for credit sale!");
      return;
    }

    setSubmitting(true);
    const billNumber = `PGS-${Date.now().toString().slice(-6)}`;

    const items = cart.map((c) => ({
      product_id: c.productId,
      name: c.name,
      quantity: c.quantity,
      price: c.price,
      total: c.total,
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

    toast.success(`Bill ${billNumber} generated! Total: ₹${total}`);
    setCart([]);
    setDiscount(0);
    setSearch("");
    setPaymentMethod("Cash");
    setSelectedCustomerId("");
    setSubmitting(false);

    // Refresh products to get updated stock
    fetchProducts();
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
            <Input
              placeholder="Search products to add..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-auto">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p.id)}
                disabled={p.stock <= 0}
                className="stat-card text-left hover:border-primary/50 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
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
              <p className="text-sm text-muted-foreground text-center py-8">
                Click on products to add them to the bill
              </p>
            ) : (
              <div className="space-y-3 max-h-[40vh] overflow-auto">
                {cart.map((item) => (
                  <div key={item.productId} className="flex items-center gap-3 py-2 border-b last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">₹{item.price} each</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.productId, -1)}>
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.productId, 1)}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-sm font-semibold w-16 text-right">₹{item.total}</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(item.productId)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
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
                <Input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                  className="w-24 h-8 text-right"
                  min={0}
                />
              </div>

              {/* Payment Method */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Payment</span>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="w-36 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Credit">Credit / Udhari</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Customer selection for Credit */}
              {paymentMethod === "Credit" && (
                <div className="space-y-2 p-3 rounded-lg bg-muted/50 border border-dashed">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <User className="w-4 h-4 text-primary" />
                    Select Customer
                  </div>
                  <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Choose customer..." />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} — {c.mobile}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {customers.length === 0 && (
                    <p className="text-xs text-muted-foreground">No customers yet. Add from Credit Management.</p>
                  )}
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
    </div>
  );
}
