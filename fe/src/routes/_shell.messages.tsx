"use client";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { MessageSquare, RefreshCw, Send, Search, CheckCircle2, AlertCircle, Clock, Ban } from "lucide-react";
import { toast } from "sonner";
import { Guard, PageHeader, Panel, Stat, TableWrap, Empty, NativeSelect, StatusBadge, Field } from "@/components/hms/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mutate, useDB, useCurrentUser } from "@/lib/hms/store";
import { fmtDateTime } from "@/lib/hms/logic";
import type { Message, MessageStatus, SmsType } from "@/lib/hms/types";

export const Route = createFileRoute("/_shell/messages")({
  head: () => ({ meta: [{ title: "SMS & Messages Centre — Hospital Management System" }] }),
  component: () => <Guard perm="patients.view" what="message centre"><MessagesCentre /></Guard>,
});

function MessagesCentre() {
  const db = useDB();
  const user = useCurrentUser();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [previewMsg, setPreviewMsg] = useState<Message | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composePatientId, setComposePatientId] = useState("");
  const [composeType, setComposeType] = useState<SmsType>("manual");
  const [composeText, setComposeText] = useState("");

  const filtered = useMemo(() => {
    return db.messages.filter((m) => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (typeFilter !== "all" && m.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const pt = db.patients.find((p) => p.id === m.patientId);
        const matchPt = pt?.name.toLowerCase().includes(q) || pt?.mobile.includes(q);
        const matchText = m.text.toLowerCase().includes(q);
        if (!matchPt && !matchText) return false;
      }
      return true;
    });
  }, [db.messages, db.patients, statusFilter, typeFilter, search]);

  const stats = useMemo(() => {
    const total = db.messages.length;
    const delivered = db.messages.filter((m) => m.status === "Delivered").length;
    const sent = db.messages.filter((m) => m.status === "Sent").length;
    const failed = db.messages.filter((m) => m.status === "Failed").length;
    const pending = db.messages.filter((m) => m.status === "Pending").length;
    return { total, delivered, sent, failed, pending };
  }, [db.messages]);

  const handleRetry = (msg: Message) => {
    mutate((d) => {
      const target = d.messages.find((m) => m.id === msg.id);
      if (target) {
        target.status = "Pending";
        target.simulatedNote = "Retrying delivery via simulated SMS gateway…";
      }

      // Add a simulated delivered status after pending
      setTimeout(() => {
        mutate((inner) => {
          const m = inner.messages.find((x) => x.id === msg.id);
          if (m) {
            m.status = "Delivered";
            m.simulatedNote = "Simulated delivery confirmed by provider webhook.";
          }
        });
      }, 1000);
    });

    toast.success("Retry initiated. Gateway status updated.");
  };

  const handleSendCompose = () => {
    if (!composePatientId) {
      toast.error("Please select a patient");
      return;
    }
    if (!composeText.trim()) {
      toast.error("Message content cannot be empty");
      return;
    }

    const patient = db.patients.find((p) => p.id === composePatientId);
    if (!patient) return;

    mutate((d) => {
      d.messages.unshift({
        id: `msg${Date.now()}`,
        ts: new Date().toISOString(),
        patientId: patient.id,
        type: composeType,
        text: `${composeText.trim()} [DEMO: Simulated SMS]`,
        status: "Sent",
        simulatedNote: "Simulated message dispatched to carrier queue.",
      });
    });

    toast.success(`Message sent to ${patient.name}`);
    setComposeOpen(false);
    setComposePatientId("");
    setComposeText("");
  };

  return (
    <>
      <PageHeader
        title="Messages / SMS Centre"
        description="Outbound simulated patient messaging, appointment notifications, and delivery logs."
        actions={
          <Button size="sm" onClick={() => setComposeOpen(true)}>
            <Send className="mr-1.5 size-4" /> Send Manual SMS
          </Button>
        }
      />

      {/* Honest Banner */}
      <div className="mb-5 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning flex items-center gap-2">
        <AlertCircle className="size-4 shrink-0" />
        <span>
          <strong>Simulated SMS Provider:</strong> No real cellular or carrier messages are transmitted in this demo prototype. Delivery states are simulated with webhook mock confirmations.
        </span>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-5">
        <Stat label="Total Dispatched" value={stats.total} />
        <Stat label="Delivered" value={stats.delivered} />
        <Stat label="Sent / In Transit" value={stats.sent} />
        <Stat label="Failed" value={stats.failed} hint={stats.failed > 0 ? "Eligible for retry" : undefined} />
        <Stat label="Pending" value={stats.pending} />
      </div>

      {/* Filters */}
      <Panel className="mb-5">
        <div className="grid gap-3 p-4 sm:grid-cols-3">
          <Input
            placeholder="Search by patient name, mobile, or text…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <NativeSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="Delivered">Delivered</option>
            <option value="Sent">Sent</option>
            <option value="Pending">Pending</option>
            <option value="Failed">Failed</option>
          </NativeSelect>
          <NativeSelect value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            <option value="booking_confirm">Booking Confirmation</option>
            <option value="session_change">Session Change</option>
            <option value="session_cancel">Session Cancellation</option>
            <option value="ebill">E-Bill Link</option>
            <option value="manual">Manual Message</option>
          </NativeSelect>
        </div>
      </Panel>

      {/* Table */}
      <div className="rounded-lg border bg-card shadow-xs">
        <TableWrap>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Sent At</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Recipient</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Mobile</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Message Preview</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.slice(0, 100).map((m) => {
                const pt = db.patients.find((p) => p.id === m.patientId);
                return (
                  <tr key={m.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{fmtDateTime(m.ts)}</td>
                    <td className="px-4 py-2 font-medium">{pt?.name ?? "Patient"}</td>
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{pt?.mobile ?? "—"}</td>
                    <td className="px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground">
                      {m.type.replace("_", " ")}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="px-4 py-2 max-w-sm truncate text-muted-foreground" title={m.text}>
                      {m.text}
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => setPreviewMsg(m)}>
                          View
                        </Button>
                        {m.status === "Failed" && (
                          <Button size="sm" variant="outline" onClick={() => handleRetry(m)}>
                            <RefreshCw className="mr-1 size-3.5" /> Retry
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
        {filtered.length === 0 && <Empty title="No messages found" />}
      </div>

      {/* Message Preview Dialog */}
      <Dialog open={Boolean(previewMsg)} onOpenChange={(v) => !v && setPreviewMsg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message Details</DialogTitle>
            <DialogDescription>Simulated transmission details (no clinical data disclosed).</DialogDescription>
          </DialogHeader>
          {previewMsg && (
            <div className="space-y-3 py-2 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={previewMsg.status} />
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Timestamp</span>
                <span>{fmtDateTime(previewMsg.ts)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Recipient</span>
                <span className="font-medium">{db.patients.find((p) => p.id === previewMsg.patientId)?.name}</span>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground block text-xs">Body</span>
                <div className="rounded-md bg-muted p-3 text-xs leading-relaxed font-sans">{previewMsg.text}</div>
              </div>
              {previewMsg.simulatedNote && (
                <p className="text-[11px] text-muted-foreground italic">{previewMsg.simulatedNote}</p>
              )}
            </div>
          )}
          <DialogFooter>
            {previewMsg?.status === "Failed" && (
              <Button onClick={() => { handleRetry(previewMsg); setPreviewMsg(null); }}>
                <RefreshCw className="mr-1.5 size-4" /> Retry Send
              </Button>
            )}
            <Button variant="outline" onClick={() => setPreviewMsg(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compose Manual SMS Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compose Simulated SMS</DialogTitle>
            <DialogDescription>Send a manual notification or update to a patient.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Recipient Patient" required>
              <NativeSelect value={composePatientId} onChange={(e) => setComposePatientId(e.target.value)}>
                <option value="">Select a registered patient…</option>
                {db.patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.mobile || "No mobile"})
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Notification Type" required>
              <NativeSelect value={composeType} onChange={(e) => setComposeType(e.target.value as SmsType)}>
                <option value="manual">General Notification</option>
                <option value="booking_confirm">Booking Confirmation</option>
                <option value="session_change">Session Schedule Change</option>
                <option value="ebill">E-Bill Access</option>
              </NativeSelect>
            </Field>
            <Field label="Message Text" required>
              <Textarea
                rows={4}
                value={composeText}
                onChange={(e) => setComposeText(e.target.value)}
                placeholder="Enter SMS content (e.g. Please be reminded of your lab tests tomorrow at 9 AM)…"
              />
            </Field>
            <p className="text-[11px] text-muted-foreground">
              Note: Clinical notes, sensitive diagnoses, and test results must never be sent over clear text SMS.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendCompose}>
              <Send className="mr-1.5 size-4" /> Send Simulated SMS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
