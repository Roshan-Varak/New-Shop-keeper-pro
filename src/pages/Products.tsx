import { useState, useEffect } from "react";
import { Search, Plus, Pencil, Trash2, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  category_id: string | null;
  price: number;
  stock: number;
  supplier: string | null;
  barcode: string | null;
  unit: string;
}

interface Category {
  id: string;
  name: string;
}

export default function Products() {
  const [productList, setProductList] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const emptyForm = { name: "", category_id: "", price: 0, stock: 0, supplier: "", unit: "pack", barcode: "" };
  const [formData, setFormData] = useState(emptyForm);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: prods }, { data: cats }] = await Promise.all([
      supabase.from("products").select("*").order("name"),
      supabase.from("categories").select("*").order("name"),
    ]);
    if (prods) setProductList(prods);
    if (cats) setCategories(cats);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getCategoryName = (id: string | null) => categories.find(c => c.id === id)?.name || "—";

  const filtered = productList.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.supplier || "").toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === "all" || p.category_id === filterCategory;
    return matchSearch && matchCategory;
  });

  const handleAdd = async () => {
    if (!formData.name.trim()) { toast.error("Product name is required"); return; }
    const { error } = await supabase.from("products").insert({
      name: formData.name.trim(),
      category_id: formData.category_id || null,
      price: formData.price,
      stock: formData.stock,
      supplier: formData.supplier.trim() || null,
      unit: formData.unit.trim() || "pack",
      barcode: formData.barcode.trim() || null,
    });
    if (error) { console.error("Insert product error:", error); toast.error(error.message); return; }
    toast.success("Product added!");
    setFormData(emptyForm);
    setIsAddOpen(false);
    fetchData();
  };

  const handleEdit = async () => {
    if (!editingProduct) return;
    const { error } = await supabase.from("products").update({
      name: formData.name.trim(),
      category_id: formData.category_id || null,
      price: formData.price,
      stock: formData.stock,
      supplier: formData.supplier.trim() || null,
      unit: formData.unit.trim() || "pack",
      barcode: formData.barcode.trim() || null,
    }).eq("id", editingProduct.id);
    if (error) { console.error("Update product error:", error); toast.error(error.message); return; }
    toast.success("Product updated!");
    setEditingProduct(null);
    setFormData(emptyForm);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { console.error("Delete product error:", error); toast.error(error.message); return; }
    toast.success("Product deleted!");
    fetchData();
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category_id: product.category_id || "",
      price: product.price,
      stock: product.stock,
      supplier: product.supplier || "",
      unit: product.unit,
      barcode: product.barcode || "",
    });
  };

  const ProductForm = ({ onSubmit, title }: { onSubmit: () => void; title: string }) => (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="font-heading">{title}</DialogTitle>
        <DialogDescription>Fill in the product details below.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label>Product Name</Label>
          <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter product name" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>Category</Label>
            <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Unit</Label>
            <Input value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>Price (₹)</Label>
            <Input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} />
          </div>
          <div className="grid gap-2">
            <Label>Stock</Label>
            <Input type="number" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })} />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Supplier</Label>
          <Input value={formData.supplier} onChange={(e) => setFormData({ ...formData, supplier: e.target.value })} placeholder="Supplier name" />
        </div>
        <div className="grid gap-2">
          <Label>Barcode (optional)</Label>
          <Input value={formData.barcode} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} placeholder="Barcode" />
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button onClick={onSubmit}>{title}</Button>
      </DialogFooter>
    </DialogContent>
  );

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">{productList.length} products in inventory</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setFormData(emptyForm)}>
              <Plus className="w-4 h-4 mr-2" /> Add Product
            </Button>
          </DialogTrigger>
          <ProductForm onSubmit={handleAdd} title="Add Product" />
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search products or suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="hidden md:table-cell">Supplier</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : filtered.map((product) => (
              <TableRow key={product.id} className="animate-fade-in">
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.unit}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">{getCategoryName(product.category_id)}</Badge>
                </TableCell>
                <TableCell className="text-right font-medium">₹{product.price}</TableCell>
                <TableCell className="text-right">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    product.stock <= 5 ? "bg-destructive/10 text-destructive" :
                    product.stock <= 15 ? "bg-warning/10 text-warning" :
                    "bg-success/10 text-success"
                  }`}>
                    {product.stock}
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {product.supplier || "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(product)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </DialogTrigger>
                      <ProductForm onSubmit={handleEdit} title="Edit Product" />
                    </Dialog>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(product.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No products found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
