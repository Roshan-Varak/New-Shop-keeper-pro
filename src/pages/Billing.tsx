import { useState, useMemo } from "react";
import { Search, Plus, Minus, Trash2, Receipt, Printer } from "lucide-react";
import { products as allProducts, SaleItem } from "@/data/mockData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function Billing() {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState(0);

  const filteredProducts = allProducts.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (productId: string) => {
    const product = allProducts.find((p) => p.id === productId);
    if (!product) return;
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
        productId, name: product.name, quantity: 1, price: product.price, total: product.price,
      }]);
    }
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(cart.map((c) => {
      if (c.productId !== productId) return c;
      const newQty = c.quantity + delta;
      if (newQty <= 0) return c;
      const product = allProducts.find((p) => p.id === productId);
      if (product && newQty > product.stock) {
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

  const handleGenerateBill = () => {
    if (cart.length === 0) {
      toast.error("Add items to the cart first!");
      return;
    }
    const billNumber = `PGS-${Date.now().toString().slice(-6)}`;
    toast.success(`Bill ${billNumber} generated! Total: ₹${total}`);
    setCart([]);
    setDiscount(0);
    setSearch("");
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
                className="stat-card text-left hover:border-primary/50 cursor-pointer transition-all active:scale-[0.98]"
              >
                <p className="text-sm font-medium truncate">{p.name}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-bold text-primary">₹{p.price}</span>
                  <Badge variant={p.stock <= 5 ? "destructive" : "secondary"} className="text-[10px]">
                    {p.stock} left
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{p.category} • {p.unit}</p>
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

            <div className="space-y-2">
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
              <Separator />
              <div className="flex justify-between text-lg font-bold font-heading">
                <span>Total</span>
                <span className="text-primary">₹{total}</span>
              </div>
            </div>

            <Button className="w-full mt-4" size="lg" onClick={handleGenerateBill}>
              <Printer className="w-4 h-4 mr-2" /> Generate Bill
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
