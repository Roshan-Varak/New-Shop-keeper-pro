import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ParsedRow {
  categoryName: string;
  productName: string;
  price: number;
  stock: number;
  unit: string;
  error?: string;
}

interface ExcelImportDialogProps {
  onImportComplete: () => void;
}

export function ExcelImportDialog({ onImportComplete }: ExcelImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duplicateAction, setDuplicateAction] = useState<"skip" | "update">("skip");
  const [result, setResult] = useState<{ added: number; updated: number; skipped: number; errors: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setRows([]);
    setProgress(0);
    setResult(null);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    reset();
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

        const parsed: ParsedRow[] = json.map((row, i) => {
          const categoryName = String(row["Category Name"] || row["category_name"] || row["Category"] || "").trim();
          const productName = String(row["Product Name"] || row["product_name"] || row["Name"] || row["name"] || "").trim();
          const price = Number(row["Price"] || row["price"] || 0);
          const stock = Number(row["Stock"] || row["stock"] || 0);
          const unit = String(row["Unit"] || row["unit"] || "piece").trim();

          let error: string | undefined;
          if (!productName) error = "Missing product name";
          if (!categoryName) error = (error ? error + "; " : "") + "Missing category";
          if (isNaN(price) || price < 0) error = (error ? error + "; " : "") + "Invalid price";

          return { categoryName, productName, price, stock: isNaN(stock) ? 0 : stock, unit, error };
        });

        setRows(parsed);
      } catch {
        toast.error("Failed to parse Excel file");
      }
    };
    reader.readAsBinaryString(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleImport = async () => {
    const validRows = rows.filter(r => !r.error);
    if (!validRows.length) { toast.error("No valid rows to import"); return; }

    setImporting(true);
    setProgress(0);
    let added = 0, updated = 0, skipped = 0, errors = 0;

    // Fetch existing categories & products
    const [{ data: existingCats }, { data: existingProds }] = await Promise.all([
      supabase.from("categories").select("id, name"),
      supabase.from("products").select("id, name"),
    ]);

    const catMap = new Map<string, string>();
    (existingCats || []).forEach(c => catMap.set(c.name.toLowerCase(), c.id));

    const prodSet = new Map<string, string>();
    (existingProds || []).forEach(p => prodSet.set(p.name.toLowerCase(), p.id));

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      setProgress(Math.round(((i + 1) / validRows.length) * 100));

      try {
        // Ensure category exists
        let catId = catMap.get(row.categoryName.toLowerCase());
        if (!catId) {
          const { data: newCat, error: catErr } = await supabase
            .from("categories").insert({ name: row.categoryName }).select("id").single();
          if (catErr) throw catErr;
          catId = newCat.id;
          catMap.set(row.categoryName.toLowerCase(), catId);
        }

        const existingId = prodSet.get(row.productName.toLowerCase());
        if (existingId) {
          if (duplicateAction === "update") {
            await supabase.from("products").update({
              price: row.price, stock: row.stock, unit: row.unit, category_id: catId,
            }).eq("id", existingId);
            updated++;
          } else {
            skipped++;
          }
        } else {
          const { data: newProd, error: prodErr } = await supabase.from("products").insert({
            name: row.productName, price: row.price, stock: row.stock, unit: row.unit, category_id: catId,
          }).select("id").single();
          if (prodErr) throw prodErr;
          prodSet.set(row.productName.toLowerCase(), newProd.id);
          added++;
        }
      } catch (err) {
        console.error("Import row error:", err);
        errors++;
      }
    }

    setResult({ added, updated, skipped, errors });
    setImporting(false);
    toast.success(`Import complete: ${added} added, ${updated} updated, ${skipped} skipped`);
    onImportComplete();
  };

  const validCount = rows.filter(r => !r.error).length;
  const errorCount = rows.filter(r => r.error).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileSpreadsheet className="w-4 h-4 mr-2" /> Import Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Import Products from Excel</DialogTitle>
          <DialogDescription>
            Upload an Excel file (.xlsx/.xls) with columns: Category Name, Product Name, Price, Stock, Unit
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-3">Select an Excel file to import</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
              <Button variant="outline" onClick={() => fileRef.current?.click()}>Choose File</Button>
            </div>

            {rows.length > 0 && (
              <>
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="secondary">{rows.length} rows parsed</Badge>
                  <Badge variant="default">{validCount} valid</Badge>
                  {errorCount > 0 && <Badge variant="destructive">{errorCount} errors</Badge>}
                </div>

                <div className="flex items-center gap-3">
                  <Label className="text-sm whitespace-nowrap">If product exists:</Label>
                  <Select value={duplicateAction} onValueChange={(v: "skip" | "update") => setDuplicateAction(v)}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">Skip duplicate</SelectItem>
                      <SelectItem value="update">Update stock & price</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-lg border overflow-auto max-h-64">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row, i) => (
                        <TableRow key={i} className={row.error ? "bg-destructive/5" : ""}>
                          <TableCell className="text-xs">{i + 1}</TableCell>
                          <TableCell className="text-sm">{row.categoryName}</TableCell>
                          <TableCell className="text-sm font-medium">{row.productName}</TableCell>
                          <TableCell className="text-right text-sm">₹{row.price}</TableCell>
                          <TableCell className="text-right text-sm">{row.stock}</TableCell>
                          <TableCell className="text-sm">{row.unit}</TableCell>
                          <TableCell>
                            {row.error ? (
                              <span className="text-xs text-destructive flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> {row.error}
                              </span>
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-success" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {importing && <Progress value={progress} className="h-2" />}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-4 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-success" />
            <h3 className="text-lg font-bold font-heading">Import Complete!</h3>
            <div className="flex justify-center gap-3 flex-wrap">
              <Badge variant="default">{result.added} added</Badge>
              <Badge variant="secondary">{result.updated} updated</Badge>
              <Badge variant="outline">{result.skipped} skipped</Badge>
              {result.errors > 0 && <Badge variant="destructive">{result.errors} errors</Badge>}
            </div>
          </div>
        )}

        <DialogFooter>
          {!result && rows.length > 0 && (
            <Button onClick={handleImport} disabled={importing || validCount === 0}>
              {importing ? `Importing... ${progress}%` : `Import ${validCount} Products`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
