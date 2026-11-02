"use client";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Download, Edit2, Trash2, Search, Filter } from "lucide-react";
import { toast } from "sonner";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Guard, PageHeader, Panel, Stat, TableWrap, Empty, NativeSelect, ConfirmDialog, Field } from "@/components/hms/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mutate, useDB, useCurrentUser } from "@/lib/hms/store";
import { money, fmtDate, inRange } from "@/lib/hms/logic";
import type { Expense, PayMethod } from "@/lib/hms/types";

export const Route = createFileRoute("/_shell/expenses")({
  head: () => ({ meta: [{ title: "Expenses — Hospital Management System" }] }),
  component: () => <Guard perm="expenses.manage" what="expenses"><ExpensesPage /></Guard>,
});

const EXPENSE_CATEGORIES = [
  "Rent",
  "Salaries",
  "Utilities",
  "Consumables",
  "Maintenance",
  "Medical Supplies",
  "Marketing",
  "Administrative",
  "Other",
] as const;

const COLORS = ["#1729C4", "#3b82f6", "#60a5fa", "#93c5fd", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#64748b"];

const expenseSchema = z.object({
  date: z.string().min(1, "Date required"),
  category: z.string().min(1, "Category required"),
  description: z.string().trim().min(3, "Description must be at least 3 characters"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  method: z.enum(["Cash", "Card", "Bank transfer"] as const),
  reference: z.string().trim().optional(),
});
type ExpenseForm = z.infer<typeof expenseSchema>;

function ExpensesPage() {
  const db = useDB();
  const user = useCurrentUser();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedMethod, setSelectedMethod] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteExpense, setDeleteExpense] = useState<Expense | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      category: "Consumables",
      description: "",
      amount: 1000,
      method: "Cash",
      reference: "",
    },
  });

  const openCreateModal = () => {
    setEditingExpense(null);
    reset({
      date: new Date().toISOString().slice(0, 10),
      category: "Consumables",
      description: "",
      amount: 1000,
      method: "Cash",
      reference: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    reset({
      date: exp.date,
      category: exp.category,
      description: exp.description,
      amount: exp.amount,
      method: exp.method,
      reference: exp.reference ?? "",
    });
    setModalOpen(true);
  };

  const onSave = (data: ExpenseForm) => {
    const byName = user?.name ?? "Staff";
    mutate((d) => {
      if (editingExpense) {
        const target = d.expenses.find((e) => e.id === editingExpense.id);
        if (target) {
          Object.assign(target, {
            date: data.date,
            category: data.category,
            description: data.description,
            amount: data.amount,
            method: data.method,
            reference: data.reference || undefined,
          });
          d.auditLog.unshift({
            id: `audit${Date.now()}`,
            ts: new Date().toISOString(),
            userId: d.auth.userId!,
            userName: byName,
            action: "update",
            entity: "expense",
            entityId: target.id,
            detail: `Updated expense: ${target.description} (${money(target.amount)})`,
          });
        }
      } else {
        const newExp: Expense = {
          id: `exp${Date.now()}`,
          date: data.date,
          category: data.category,
          description: data.description,
          amount: data.amount,
          method: data.method,
          reference: data.reference || undefined,
          by: byName,
        };
        d.expenses.unshift(newExp);
        d.auditLog.unshift({
          id: `audit${Date.now()}`,
          ts: new Date().toISOString(),
          userId: d.auth.userId!,
          userName: byName,
          action: "create",
          entity: "expense",
          entityId: newExp.id,
          detail: `Recorded new expense: ${newExp.description} (${money(newExp.amount)})`,
        });
      }
    });

    toast.success(editingExpense ? "Expense updated" : "Expense added");
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (!deleteExpense) return;
    const byName = user?.name ?? "Staff";
    mutate((d) => {
      d.expenses = d.expenses.filter((e) => e.id !== deleteExpense.id);
      d.auditLog.unshift({
        id: `audit${Date.now()}`,
        ts: new Date().toISOString(),
        userId: d.auth.userId!,
        userName: byName,
        action: "delete",
        entity: "expense",
        entityId: deleteExpense.id,
        detail: `Deleted expense: ${deleteExpense.description} (${money(deleteExpense.amount)})`,
      });
    });
    toast.success("Expense deleted");
    setDeleteExpense(null);
  };

  // Filtered expenses
  const filtered = useMemo(() => {
    return db.expenses
      .filter((e) => {
        if (selectedCategory !== "all" && e.category !== selectedCategory) return false;
        if (selectedMethod !== "all" && e.method !== selectedMethod) return false;
        if (dateFrom && e.date < dateFrom) return false;
        if (dateTo && e.date > dateTo) return false;
        if (search) {
          const q = search.toLowerCase();
          const matchDesc = e.description.toLowerCase().includes(q);
          const matchRef = e.reference?.toLowerCase().includes(q);
          const matchBy = e.by.toLowerCase().includes(q);
          if (!matchDesc && !matchRef && !matchBy) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [db.expenses, selectedCategory, selectedMethod, dateFrom, dateTo, search]);

  const totalFilteredAmount = useMemo(() => {
    return filtered.reduce((sum, e) => sum + e.amount, 0);
  }, [filtered]);

  // Category breakdown for chart
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filtered) {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const exportCsv = () => {
    const headers = ["Date", "Category", "Description", "Amount", "Method", "Reference", "Recorded By"];
    const rows = filtered.map((e) => [
      e.date,
      `"${e.category}"`,
      `"${e.description.replace(/"/g, '""')}"`,
      e.amount,
      e.method,
      `"${e.reference || ""}"`,
      `"${e.by}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `expenses_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Expenses exported as CSV");
  };

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Track operational expenses, supplies, utilities, and disbursements."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download className="mr-1.5 size-4" /> Export CSV
            </Button>
            <Button size="sm" onClick={openCreateModal}>
              <Plus className="mr-1.5 size-4" /> Record Expense
            </Button>
          </div>
        }
      />

      {/* KPI Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        <Stat label="Total Expenses" value={money(totalFilteredAmount)} hint={`${filtered.length} entries matched`} />
        <Stat
          label="This Month"
          value={money(
            db.expenses
              .filter((e) => e.date.startsWith(new Date().toISOString().slice(0, 7)))
              .reduce((s, e) => s + e.amount, 0),
          )}
        />
        <Stat
          label="Salaries (Total)"
          value={money(
            db.expenses
              .filter((e) => e.category === "Salaries")
              .reduce((s, e) => s + e.amount, 0),
          )}
        />
        <Stat
          label="Rent & Utilities"
          value={money(
            db.expenses
              .filter((e) => e.category === "Rent" || e.category === "Utilities")
              .reduce((s, e) => s + e.amount, 0),
          )}
        />
      </div>

      {/* Breakdown Chart & Filters */}
      <div className="grid gap-5 lg:grid-cols-3 mb-5">
        <Panel title="Category Breakdown" className="lg:col-span-1">
          <div className="p-4 flex flex-col items-center justify-center min-h-[220px]">
            {categoryData.length === 0 ? (
              <Empty title="No data to graph" />
            ) : (
              <>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={65}
                        paddingAngle={2}
                      >
                        {categoryData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => money(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center text-[11px] text-muted-foreground mt-2">
                  {categoryData.slice(0, 5).map((c, i) => (
                    <span key={c.name} className="flex items-center gap-1">
                      <span className="size-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      {c.name}: {money(c.value)}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </Panel>

        <Panel title="Filters" className="lg:col-span-2">
          <div className="grid gap-3 p-4 sm:grid-cols-2 md:grid-cols-4">
            <div className="sm:col-span-2 md:col-span-4">
              <Input
                placeholder="Search description, reference, or staff name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div>
              <NativeSelect
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                aria-label="Filter category"
              >
                <option value="all">All Categories</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </NativeSelect>
            </div>
            <div>
              <NativeSelect
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                aria-label="Filter payment method"
              >
                <option value="all">All Methods</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Bank transfer">Bank Transfer</option>
              </NativeSelect>
            </div>
            <div>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                aria-label="From date"
              />
            </div>
            <div>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                aria-label="To date"
              />
            </div>
          </div>
        </Panel>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card shadow-xs">
        <TableWrap>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Method</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Ref</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Recorded By</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.slice(0, 100).map((exp) => (
                <tr key={exp.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{fmtDate(exp.date)}</td>
                  <td className="px-4 py-2.5 font-medium">{exp.category}</td>
                  <td className="px-4 py-2.5 max-w-xs truncate" title={exp.description}>{exp.description}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{exp.method}</td>
                  <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{exp.reference || "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{exp.by}</td>
                  <td className="px-4 py-2.5 text-right font-medium tabular text-destructive">
                    -{money(exp.amount)}
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => openEditModal(exp)}>
                      <Edit2 className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => setDeleteExpense(exp)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        {filtered.length === 0 && <Empty title="No expenses match current filters" />}
        {filtered.length > 100 && (
          <p className="border-t px-4 py-2 text-center text-xs text-muted-foreground">
            Showing first 100 of {filtered.length} entries. Refine filters above to see specific ranges.
          </p>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Edit Expense" : "Record New Expense"}</DialogTitle>
            <DialogDescription>
              {editingExpense ? "Update expense details." : "Enter disbursement details. This affects the P&L statement."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSave)} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date" error={errors.date?.message} required>
                <Input type="date" {...register("date")} />
              </Field>
              <Field label="Category" error={errors.category?.message} required>
                <NativeSelect {...register("category")}>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <Field label="Description" error={errors.description?.message} required>
              <Input placeholder="e.g. Electricity bill for October, OPD supplies" {...register("description")} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount" error={errors.amount?.message} required>
                <Input type="number" step="0.01" min={1} placeholder="LKR" {...register("amount")} />
              </Field>
              <Field label="Payment Method" error={errors.method?.message} required>
                <NativeSelect {...register("method")}>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Bank transfer">Bank transfer</option>
                </NativeSelect>
              </Field>
            </div>
            <Field label="Reference (optional)" error={errors.reference?.message}>
              <Input placeholder="Invoice / Voucher / Cheque #" {...register("reference")} />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {editingExpense ? "Save Changes" : "Record Expense"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteExpense)}
        onOpenChange={(v) => !v && setDeleteExpense(null)}
        title="Delete Expense?"
        description={`Are you sure you want to delete "${deleteExpense?.description}" for ${deleteExpense ? money(deleteExpense.amount) : ""}? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}
