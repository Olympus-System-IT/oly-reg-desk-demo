"use client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Plus, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Guard, PageHeader, StatusBadge, Empty, TableWrap, NativeSelect, Field } from "@/components/hms/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { mutate, useDB } from "@/lib/hms/store";
import { patientAge, fmtDate } from "@/lib/hms/logic";
import type { Patient } from "@/lib/hms/types";

export const Route = createFileRoute("/_shell/patients")({
  head: () => ({ meta: [{ title: "Patients — Hospital Management System" }] }),
  component: () => <Guard perm="patients.view" what="patient records"><Patients /></Guard>,
});

const schema = z.object({
  name: z.string().trim().min(2, "Name required"),
  mobile: z.string().trim().regex(/^(07[0-9]{8})?$/, "Enter a valid mobile (07XXXXXXXX) or leave blank").optional().or(z.literal("")),
  sex: z.enum(["Male", "Female", "Other", ""]).optional(),
  useDob: z.boolean(),
  dob: z.string().optional(),
  approxAge: z.coerce.number().int().min(0).max(120).optional(),
  address: z.string().trim().max(200).optional(),
  guardian: z.string().trim().max(100).optional(),
  smsConsent: z.boolean(),
}).refine(d => !d.useDob || d.dob || (d.approxAge != null), { message: "Enter DOB or approximate age", path: ["dob"] });
type Form = z.infer<typeof schema>;

function Patients() {
  const db = useDB();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [nearDups, setNearDups] = useState<Patient[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", mobile: "", sex: "", useDob: true, smsConsent: true },
  });
  const useDob = watch("useDob");
  const watchedMobile = watch("mobile");
  const watchedName = watch("name");
  const smsConsent = watch("smsConsent");

  // Debounced search
  const q = search.toLowerCase().trim();
  const filtered = !q ? db.patients.slice(0, 50) : db.patients.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.code.includes(q) ||
    p.mobile.includes(q)
  ).slice(0, 50);

  const checkDuplicates = () => {
    if (!watchedName && !watchedMobile) { setNearDups([]); return; }
    const dups = db.patients.filter(p =>
      (watchedMobile && p.mobile === watchedMobile) ||
      (watchedName && p.name.toLowerCase() === watchedName.toLowerCase().trim())
    );
    setNearDups(dups);
  };

  const openNew = () => {
    reset({ name: "", mobile: "", sex: "", useDob: true, smsConsent: true });
    setNearDups([]);
    setOpen(true);
  };

  const onSubmit = (v: Form) => {
    mutate((d) => {
      const idx = (d.counters.patient = (d.counters.patient ?? 0) + 1);
      const id = `p${Date.now()}`;
      d.patients.push({
        id,
        code: `PT-${String(idx).padStart(6, "0")}`,
        name: v.name.trim(),
        mobile: v.mobile?.trim() ?? "",
        sex: (v.sex || undefined) as Patient["sex"],
        dob: v.useDob && v.dob ? v.dob : undefined,
        approxAge: !v.useDob ? v.approxAge : undefined,
        address: v.address?.trim() || undefined,
        guardian: v.guardian?.trim() || undefined,
        smsConsent: v.smsConsent,
        createdAt: new Date().toISOString().slice(0, 10),
      });
    });
    toast.success("Patient registered");
    setOpen(false);
  };

  return (
    <>
      <PageHeader
        title="Patients"
        description="Search by name, patient ID, or mobile number."
        actions={<Button onClick={openNew}><Plus className="mr-2 size-4" />Register patient</Button>}
      />

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden />
        <Input
          ref={searchRef}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, PT-XXXXXX, or mobile…"
          className="pl-9 max-w-md"
          aria-label="Search patients"
          autoFocus
        />
      </div>

      <div className="rounded-lg border bg-card shadow-xs">
        <TableWrap>
          <table className="w-full text-sm">
            <thead><tr className="border-b">{["Patient ID","Name","Mobile","Age/Sex","Registered",""].map(h => <th key={h} className={`px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground ${h === "" ? "text-right" : "text-left"}`}>{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{p.code}</td>
                  <td className="px-4 py-2 font-medium">{p.name}</td>
                  <td className="px-4 py-2 tabular">{p.mobile || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-2 text-muted-foreground">{patientAge(p)}{p.sex ? ` · ${p.sex}` : ""}</td>
                  <td className="px-4 py-2 text-muted-foreground">{fmtDate(p.createdAt)}</td>
                  <td className="px-4 py-2 text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/patients/$id" params={{ id: p.id }}>View</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        {filtered.length === 0 && <Empty title={q ? "No patients match your search" : "No patients yet"}>{!q && <Button onClick={openNew} variant="outline" className="mt-3">Register first patient</Button>}</Empty>}
        {!q && db.patients.length > 50 && (
          <p className="border-t px-4 py-2 text-center text-xs text-muted-foreground">Showing first 50. Use search to find more.</p>
        )}
      </div>

      {/* Registration dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Register patient</DialogTitle>
            <DialogDescription>Patient ID is assigned automatically. Mobile shared by a family is allowed.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {nearDups.length > 0 && (
              <Alert className="border-warning/40 bg-warning-soft">
                <AlertDescription className="text-sm text-warning">
                  {nearDups.length} similar record{nearDups.length > 1 ? "s" : ""} found:{" "}
                  {nearDups.map(p => `${p.name} (${p.code})`).join(", ")}. Proceed only if this is a different person.
                </AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Full name <span className="text-destructive">*</span></Label>
                <Input {...register("name")} onBlur={checkDuplicates} placeholder="First Last" />
                {errors.name && <p role="alert" className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Mobile</Label>
                <Input {...register("mobile")} onBlur={checkDuplicates} placeholder="07XXXXXXXX" />
                {errors.mobile && <p role="alert" className="text-xs text-destructive">{errors.mobile.message}</p>}
                <p className="text-xs text-muted-foreground">Shared family numbers allowed</p>
              </div>
              <div className="space-y-1.5">
                <Label>Sex</Label>
                <NativeSelect {...register("sex")}>
                  <option value="">Prefer not to say</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </NativeSelect>
              </div>
              <div className="col-span-2">
                <div className="flex items-center gap-3 mb-2">
                  <Switch id="useDob" checked={useDob} onCheckedChange={v => setValue("useDob", v)} />
                  <Label htmlFor="useDob">{useDob ? "Date of birth (known)" : "Approximate age only"}</Label>
                </div>
                {useDob ? (
                  <Input type="date" {...register("dob")} />
                ) : (
                  <div className="flex items-center gap-2">
                    <Input type="number" min={0} max={120} {...register("approxAge")} className="w-24" placeholder="Age" />
                    <span className="text-sm text-muted-foreground">years (approximate)</span>
                  </div>
                )}
                {errors.dob && <p role="alert" className="text-xs text-destructive">{errors.dob.message}</p>}
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Address</Label>
                <Input {...register("address")} placeholder="Optional" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Guardian (for minors)</Label>
                <Input {...register("guardian")} placeholder="Name — 07XXXXXXXX" />
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <Switch id="smsConsent" checked={smsConsent} onCheckedChange={v => setValue("smsConsent", v)} />
                <Label htmlFor="smsConsent">SMS consent (patient agreed to receive appointment notifications)</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>Register patient</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
