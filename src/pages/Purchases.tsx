import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Loader2, Search, Package, Trash2 } from "lucide-react";
import { format } from "date-fns";

type PurchaseItem = {
  product_id: string;
  product_name: string;
  quantity: number;
  purchase_price: number;
  total: number;
};

export default function Purchases() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [search, setSearch] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("all");

  // Current item being added
  const [curProductId, setCurProductId] = useState("");
  const [curQty, setCurQty] = useState(1);
  const [curPrice, setCurPrice] = useState(0);

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, name, price").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: purchases, isLoading } = useQuery({
    queryKey: ["purchases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("*, suppliers(name), purchase_items(*, products(name))")
        .order("purchase_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!supplierId) throw new Error("Select a supplier");
      if (items.length === 0) throw new Error("Add at least one item");

      const totalCost = items.reduce((s, i) => s + i.total, 0);

      const { data: purchase, error: pErr } = await supabase
        .from("purchases")
        .insert({
          supplier_id: supplierId,
          purchase_date: purchaseDate,
          invoice_number: invoiceNumber,
          total_cost: totalCost,
        })
        .select("id")
        .single();
      if (pErr) throw pErr;

      const itemRows = items.map((i) => ({
        purchase_id: purchase.id,
        product_id: i.product_id,
        quantity: i.quantity,
        purchase_price: i.purchase_price,
        total: i.total,
      }));

      const { error: iErr } = await supabase.from("purchase_items").insert(itemRows);
      if (iErr) throw iErr;
    },
    onSuccess: () => {
      toast.success("Purchase recorded — stock updated automatically");
      qc.invalidateQueries({ queryKey: ["purchases"] });
      qc.invalidateQueries({ queryKey: ["products-list"] });
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const closeDialog = () => {
    setOpen(false);
    setSupplierId("");
    setPurchaseDate(format(new Date(), "yyyy-MM-dd"));
    setInvoiceNumber("");
    setItems([]);
    setCurProductId("");
    setCurQty(1);
    setCurPrice(0);
  };

  const addItem = () => {
    if (!curProductId || curQty <= 0 || curPrice <= 0) {
      toast.error("Fill product, quantity and price");
      return;
    }
    const product = products?.find((p) => p.id === curProductId);
    if (!product) return;
    setItems([
      ...items,
      {
        product_id: curProductId,
        product_name: product.name,
        quantity: curQty,
        purchase_price: curPrice,
        total: curQty * curPrice,
      },
    ]);
    setCurProductId("");
    setCurQty(1);
    setCurPrice(0);
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const filtered = purchases?.filter((p) => {
    const matchSupplier = filterSupplier === "all" || p.supplier_id === filterSupplier;
    const matchSearch =
      !search ||
      (p.suppliers as any)?.name?.toLowerCase().includes(search.toLowerCase()) ||
      (p.invoice_number || "").toLowerCase().includes(search.toLowerCase());
    return matchSupplier && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Purchases</h1>
          <p className="page-subtitle">Record and track stock purchases from suppliers</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : closeDialog())}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />New Purchase</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Record Purchase</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Supplier *</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                    <SelectContent>
                      {suppliers?.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Purchase Date</Label>
                  <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Invoice / Reference Number</Label>
                <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Optional" />
              </div>

              <div className="border rounded-lg p-4 space-y-3">
                <h3 className="font-medium text-sm">Add Items</h3>
                <div className="grid grid-cols-[1fr_80px_100px_auto] gap-2 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Product</Label>
                    <Select value={curProductId} onValueChange={setCurProductId}>
                      <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                      <SelectContent>
                        {products?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input type="number" min={1} value={curQty} onChange={(e) => setCurQty(Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Price (₹)</Label>
                    <Input type="number" min={0} step="0.01" value={curPrice} onChange={(e) => setCurPrice(Number(e.target.value))} />
                  </div>
                  <Button type="button" size="sm" onClick={addItem}>Add</Button>
                </div>

                {items.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((it, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{it.product_name}</TableCell>
                          <TableCell className="text-right">{it.quantity}</TableCell>
                          <TableCell className="text-right">₹{it.purchase_price}</TableCell>
                          <TableCell className="text-right">₹{it.total}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={3} className="font-medium text-right">Grand Total</TableCell>
                        <TableCell className="text-right font-bold">₹{items.reduce((s, i) => s + i.total, 0)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </div>

              <Button className="w-full" disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Purchase
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterSupplier} onValueChange={setFilterSupplier}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter by supplier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Suppliers</SelectItem>
            {suppliers?.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5" /> Purchase History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{format(new Date(p.purchase_date), "dd MMM yyyy")}</TableCell>
                    <TableCell className="font-medium">{(p.suppliers as any)?.name || "—"}</TableCell>
                    <TableCell>{p.invoice_number || "—"}</TableCell>
                    <TableCell>
                      {(p.purchase_items as any[])?.map((pi: any) => (
                        <div key={pi.id} className="text-xs">
                          {(pi.products as any)?.name} × {pi.quantity} @ ₹{pi.purchase_price}
                        </div>
                      ))}
                    </TableCell>
                    <TableCell className="text-right font-medium">₹{p.total_cost}</TableCell>
                  </TableRow>
                ))}
                {(!filtered || filtered.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No purchases found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
