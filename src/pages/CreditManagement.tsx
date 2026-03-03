import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, IndianRupee, AlertTriangle, Clock, Search, Phone, MapPin, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Customer {
  id: string;
  name: string;
  mobile: string;
  address: string | null;
  created_at: string;
}

interface CreditSummary {
  customer_id: string;
  customer_name: string;
  mobile: string;
  address: string | null;
  total_credit: number;
  total_paid: number;
  balance: number;
  last_purchase_date: string | null;
  days_pending: number;
}

export default function CreditManagement() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [creditSummaries, setCreditSummaries] = useState<CreditSummary[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Add customer dialog
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMobile, setNewMobile] = useState("");
  const [newAddress, setNewAddress] = useState("");

  // Edit customer dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [editName, setEditName] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editAddress, setEditAddress] = useState("");

  // Delete customer dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteCustomer, setDeleteCustomer] = useState<CreditSummary | null>(null);

  // Receive payment dialog
  const [payOpen, setPayOpen] = useState(false);
  const [payCustomer, setPayCustomer] = useState<CreditSummary | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const { data: custData } = await supabase.from("customers").select("*").order("name");
    const { data: txData } = await supabase.from("credit_transactions").select("*");

    if (custData) {
      setCustomers(custData);
      const summaries: CreditSummary[] = custData.map((c) => {
        const txs = (txData || []).filter((t) => t.customer_id === c.id);
        const totalCredit = txs.filter((t) => t.type === "credit").reduce((a, t) => a + Number(t.amount), 0);
        const totalPaid = txs.filter((t) => t.type === "payment").reduce((a, t) => a + Number(t.amount), 0);
        const creditTxs = txs.filter((t) => t.type === "credit").sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const lastDate = creditTxs.length > 0 ? creditTxs[0].created_at : null;
        const daysPending = lastDate ? Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;

        return {
          customer_id: c.id,
          customer_name: c.name,
          mobile: c.mobile,
          address: c.address,
          total_credit: totalCredit,
          total_paid: totalPaid,
          balance: totalCredit - totalPaid,
          last_purchase_date: lastDate,
          days_pending: daysPending,
        };
      });
      setCreditSummaries(summaries);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filteredSummaries = useMemo(() =>
    creditSummaries.filter((s) =>
      s.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      s.mobile.includes(search)
    ), [creditSummaries, search]);

  const totalOutstanding = useMemo(() =>
    creditSummaries.reduce((a, s) => a + Math.max(0, s.balance), 0), [creditSummaries]);

  const overdue30 = useMemo(() =>
    creditSummaries.filter((s) => s.balance > 0 && s.days_pending > 30), [creditSummaries]);

  const handleAddCustomer = async () => {
    if (!newName.trim() || !newMobile.trim()) {
      toast.error("Name and mobile are required");
      return;
    }
    if (!/^\d{10}$/.test(newMobile.trim())) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    const { error } = await supabase.from("customers").insert({
      name: newName.trim(),
      mobile: newMobile.trim(),
      address: newAddress.trim() || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Customer added!");
    setNewName(""); setNewMobile(""); setNewAddress("");
    setAddOpen(false);
    fetchData();
  };

  const handleEditCustomer = async () => {
    if (!editCustomer) return;
    if (!editName.trim() || !editMobile.trim()) {
      toast.error("Name and mobile are required");
      return;
    }
    if (!/^\d{10}$/.test(editMobile.trim())) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    const { error } = await supabase.from("customers").update({
      name: editName.trim(),
      mobile: editMobile.trim(),
      address: editAddress.trim() || null,
    }).eq("id", editCustomer.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Customer updated!");
    setEditOpen(false);
    setEditCustomer(null);
    fetchData();
  };

  const handleDeleteCustomer = async () => {
    if (!deleteCustomer) return;
    const { error } = await supabase.from("customers").delete().eq("id", deleteCustomer.customer_id);
    if (error) { toast.error(error.message); return; }
    toast.success(`${deleteCustomer.customer_name} deleted`);
    setDeleteOpen(false);
    setDeleteCustomer(null);
    fetchData();
  };

  const openEditDialog = (s: CreditSummary) => {
    const cust = customers.find(c => c.id === s.customer_id);
    if (!cust) return;
    setEditCustomer(cust);
    setEditName(cust.name);
    setEditMobile(cust.mobile);
    setEditAddress(cust.address || "");
    setEditOpen(true);
  };

  const handleReceivePayment = async () => {
    if (!payCustomer) return;
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (amount > payCustomer.balance) {
      toast.error("Amount exceeds outstanding balance");
      return;
    }
    const { error } = await supabase.from("credit_transactions").insert({
      customer_id: payCustomer.customer_id,
      amount,
      type: "payment",
      note: payNote.trim() || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`₹${amount} payment received from ${payCustomer.customer_name}`);
    setPayAmount(""); setPayNote("");
    setPayOpen(false); setPayCustomer(null);
    fetchData();
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="page-header">
        <h1 className="page-title">Credit / Udhari Management</h1>
        <p className="page-subtitle">Track customer credit and payments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-destructive" />
              <span className="text-2xl font-bold font-heading text-destructive">₹{totalOutstanding.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold font-heading">{customers.length}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-warning" /> Overdue ({">"}30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold font-heading text-warning">{overdue30.length}</span>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or mobile..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Add Customer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Customer</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <Input placeholder="Customer Name *" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <Input placeholder="Mobile Number (10 digits) *" value={newMobile} onChange={(e) => setNewMobile(e.target.value)} maxLength={10} />
              <Input placeholder="Address (optional)" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} />
              <Button className="w-full" onClick={handleAddCustomer}>Add Customer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Customer Credit Table */}
      <div className="stat-card overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Total Credit</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Last Purchase</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filteredSummaries.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No customers found</TableCell></TableRow>
            ) : (
              filteredSummaries.map((s) => (
                <TableRow key={s.customer_id} className={s.balance > 0 && s.days_pending > 30 ? "bg-destructive/5" : ""}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{s.customer_name}</p>
                      {s.address && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{s.address}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm flex items-center gap-1"><Phone className="w-3 h-3" />{s.mobile}</span>
                  </TableCell>
                  <TableCell className="text-right font-medium">₹{s.total_credit.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-success font-medium">₹{s.total_paid.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-bold text-destructive">
                    {s.balance > 0 ? `₹${s.balance.toLocaleString()}` : <span className="text-success">Cleared</span>}
                  </TableCell>
                  <TableCell>
                    {s.last_purchase_date ? (
                      <span className="text-xs text-muted-foreground">
                        {new Date(s.last_purchase_date).toLocaleDateString("en-IN")}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    {s.balance > 0 && s.days_pending > 30 ? (
                      <Badge variant="destructive" className="text-[10px]">
                        <Clock className="w-3 h-3 mr-1" />{s.days_pending}d overdue
                      </Badge>
                    ) : s.balance > 0 ? (
                      <Badge variant="secondary" className="text-[10px]">Pending</Badge>
                    ) : (
                      <Badge className="bg-success text-success-foreground text-[10px]">Clear</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {s.balance > 0 && (
                        <Button size="sm" variant="outline" onClick={() => { setPayCustomer(s); setPayOpen(true); }}>
                          Receive
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditDialog(s)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { setDeleteCustomer(s); setDeleteOpen(true); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Customer Dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditCustomer(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Customer</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <Input placeholder="Customer Name *" value={editName} onChange={(e) => setEditName(e.target.value)} />
            <Input placeholder="Mobile Number (10 digits) *" value={editMobile} onChange={(e) => setEditMobile(e.target.value)} maxLength={10} />
            <Input placeholder="Address (optional)" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
            <Button className="w-full" onClick={handleEditCustomer}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Customer Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteCustomer?.customer_name}</strong>?
              {deleteCustomer && deleteCustomer.balance > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  ⚠️ This customer has ₹{deleteCustomer.balance.toLocaleString()} outstanding balance. All credit records will be permanently deleted.
                </span>
              )}
              <span className="block mt-1">Past sales records will be preserved.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCustomer} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Receive Payment Dialog */}
      <Dialog open={payOpen} onOpenChange={(o) => { setPayOpen(o); if (!o) setPayCustomer(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receive Payment — {payCustomer?.customer_name}</DialogTitle>
          </DialogHeader>
          {payCustomer && (
            <div className="space-y-3 pt-2">
              <p className="text-sm text-muted-foreground">Outstanding: <span className="font-bold text-destructive">₹{payCustomer.balance.toLocaleString()}</span></p>
              <Input type="number" placeholder="Amount to receive" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} min={1} max={payCustomer.balance} />
              <Input placeholder="Note (optional)" value={payNote} onChange={(e) => setPayNote(e.target.value)} />
              <Button className="w-full" onClick={handleReceivePayment}>
                <IndianRupee className="w-4 h-4 mr-2" /> Receive ₹{payAmount || "0"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
