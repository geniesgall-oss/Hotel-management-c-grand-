import { useState } from "react"
import { useGetHistory, useDeleteHistory, useUpdateHistory } from "@workspace/api-client-react"
import type { HistoryRecord } from "@workspace/api-client-react"
import { useAuth } from "@/hooks/use-auth"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import {
  Trash2, History as HistoryIcon, Clock, IndianRupee, X,
  User, Phone, BedDouble, LogIn, LogOut, UserCheck,
  CheckCircle2, AlertCircle, Pencil,
} from "lucide-react"
import { format } from "date-fns"

function DetailRow({ label, value, accent }: { label: string; value: string | React.ReactNode; accent?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm font-semibold text-right ${accent || "text-foreground"}`}>{value}</span>
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <div className="px-4 py-2.5 flex items-center gap-2 border-b border-border/60 bg-secondary/50">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-xs font-bold uppercase tracking-wide text-foreground">{title}</span>
      </div>
      <div className="px-4 bg-card/40">{children}</div>
    </div>
  )
}

function pmIcon(m: string) {
  return m === "PhonePe" ? "📱" : m === "GPay" ? "📲" : m === "Card" ? "💳" : "💵"
}

function toInputDatetime(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const modalVariants = {
  hidden:  { scale: 0.97, opacity: 0, y: 10 },
  visible: { scale: 1,    opacity: 1, y: 0 },
  exit:    { scale: 0.98, opacity: 0, y: 6  },
}
const modalTransition = { type: "spring" as const, stiffness: 300, damping: 26 }

export default function History() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: historyRecords, isLoading } = useGetHistory()
  const deleteHistory = useDeleteHistory()
  const updateHistory = useUpdateHistory()

  const [recordToDelete, setRecordToDelete] = useState<number | null>(null)
  const [detailRecord, setDetailRecord] = useState<HistoryRecord | null>(null)
  const [editRecord, setEditRecord] = useState<HistoryRecord | null>(null)
  const isAdmin = user?.role === "admin"

  const [editName, setEditName] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editRoomAmount, setEditRoomAmount] = useState("")
  const [editAmountPaidAtCheckin, setEditAmountPaidAtCheckin] = useState("")
  const [editCheckIn, setEditCheckIn] = useState("")
  const [editCheckOut, setEditCheckOut] = useState("")

  const openEdit = (r: HistoryRecord) => {
    setEditRecord(r)
    setDetailRecord(null)
    setEditName(r.guestName)
    setEditPhone(r.phone.replace(/^\+91/, ""))
    setEditRoomAmount(String(r.roomAmount))
    setEditAmountPaidAtCheckin(String(r.amountPaidAtCheckin))
    setEditCheckIn(toInputDatetime(r.checkInTime))
    setEditCheckOut(toInputDatetime(r.checkOutTime))
  }

  const handleSaveEdit = async () => {
    if (!editRecord) return
    const phoneDigits = editPhone.replace(/\D/g, "")
    if (!editName.trim() || phoneDigits.length !== 10) {
      toast.error("Enter a valid guest name and 10-digit phone number")
      return
    }
    try {
      await updateHistory.mutateAsync({
        id: editRecord.id,
        data: {
          guestName: editName.trim(),
          phone: `+91${phoneDigits}`,
          roomAmount: Number(editRoomAmount) || 0,
          amountPaidAtCheckin: Number(editAmountPaidAtCheckin) || 0,
          checkInTime: new Date(editCheckIn).toISOString(),
          checkOutTime: new Date(editCheckOut).toISOString(),
        },
      })
      toast.success("Record updated successfully")
      queryClient.invalidateQueries({ queryKey: ["/api/history"] })
      setEditRecord(null)
    } catch (err: any) {
      toast.error(err.message || "Failed to update record")
    }
  }

  const handleDelete = async () => {
    if (!recordToDelete) return
    try {
      await deleteHistory.mutateAsync({ id: recordToDelete })
      toast.success("Record deleted permanently")
      queryClient.invalidateQueries({ queryKey: ["/api/history"] })
      setRecordToDelete(null)
      setDetailRecord(null)
    } catch (error: any) {
      toast.error(error.message || "Failed to delete record")
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 max-w-6xl mx-auto">
        <div className="h-10 w-48 bg-secondary rounded mb-8" />
        <div className="h-[400px] w-full bg-secondary rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">History Log</h1>
          <p className="text-muted-foreground mt-1">Past 2 months of check-out records. Click any row for full details.</p>
        </div>
        <Badge className="px-4 py-2 gap-2 text-sm bg-primary/10 text-primary border border-primary/20">
          <Clock className="h-4 w-4" />Last 60 Days
        </Badge>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.24, ease: "easeOut" }}
      >
        <Card className="overflow-hidden shadow-lg border-border/50 bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/60 border-b border-border">
                <tr>
                  <th className="px-5 py-4 font-semibold">Guest</th>
                  <th className="px-5 py-4 font-semibold">Room</th>
                  <th className="px-5 py-4 font-semibold">Check-In</th>
                  <th className="px-5 py-4 font-semibold">Check-Out</th>
                  <th className="px-5 py-4 font-semibold"><span className="flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5" />Amount</span></th>
                  <th className="px-5 py-4 font-semibold">Paid Check-In</th>
                  <th className="px-5 py-4 font-semibold">Paid Check-Out</th>
                  <th className="px-5 py-4 font-semibold text-success">Total</th>
                  {isAdmin && <th className="px-5 py-4 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {!historyRecords || historyRecords.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 8} className="px-6 py-16 text-center text-muted-foreground">
                      <HistoryIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No history records for the last 2 months.</p>
                    </td>
                  </tr>
                ) : historyRecords.map((record, i) => (
                  <motion.tr
                    key={record.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.25), duration: 0.2, ease: "easeOut" }}
                    className="hover:bg-primary/5 transition-colors cursor-pointer group"
                    onClick={() => setDetailRecord(record)}
                  >
                    <td className="px-5 py-4 font-medium text-foreground whitespace-nowrap group-hover:text-primary transition-colors">
                      <div>{record.guestName}</div>
                      <div className="text-xs text-muted-foreground">{record.phone}</div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <Badge variant="outline" className="bg-background text-foreground border-border">{record.roomNumber}</Badge>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground whitespace-nowrap text-xs">{format(new Date(record.checkInTime), "dd MMM yy, HH:mm")}</td>
                    <td className="px-5 py-4 text-muted-foreground whitespace-nowrap text-xs">{format(new Date(record.checkOutTime), "dd MMM yy, HH:mm")}</td>
                    <td className="px-5 py-4 font-semibold text-foreground whitespace-nowrap">₹{record.roomAmount?.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-medium">₹{record.amountPaidAtCheckin?.toLocaleString("en-IN")}</div>
                      <div className="text-xs text-muted-foreground">{record.paymentMethodAtCheckin}</div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-medium">₹{record.dueAmountPaidAtCheckout?.toLocaleString("en-IN")}</div>
                      <div className="text-xs text-muted-foreground">{record.duePaymentMethodAtCheckout}</div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-success font-bold">₹{record.totalPaid?.toLocaleString("en-IN")}</span>
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(record)} className="text-primary hover:bg-primary/10 hover:text-primary h-8 w-8">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setRecordToDelete(record.id)} className="text-destructive hover:bg-destructive/10 h-8 w-8">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      {/* ── Edit Modal ── */}
      <AnimatePresence>
        {editRecord && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setEditRecord(null)} />
            <motion.div
              variants={modalVariants} initial="hidden" animate="visible" exit="exit"
              transition={modalTransition}
              className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-card z-10 px-6 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-display font-bold text-foreground">Edit Record</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Room {editRecord.roomNumber}</p>
                </div>
                <button onClick={() => setEditRecord(null)} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {[
                  { label: "Guest Name", node: (
                    <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Guest full name"
                      className="flex h-11 w-full rounded-xl border border-border bg-input/50 px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  )},
                  { label: "Mobile Number", node: (
                    <div className="flex">
                      <span className="flex items-center px-3 rounded-l-xl border border-r-0 border-border bg-secondary text-muted-foreground text-sm font-medium select-none">+91</span>
                      <input value={editPhone} onChange={e => setEditPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} maxLength={10} type="tel"
                        className="flex h-11 w-full rounded-r-xl border border-border bg-input/50 px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    </div>
                  )},
                ].map((field, i) => (
                  <motion.div
                    key={field.label}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 + i * 0.06 }}
                    className="space-y-1.5"
                  >
                    <label className="text-sm font-medium text-foreground">{field.label}</label>
                    {field.node}
                  </motion.div>
                ))}

                <motion.div
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Room Amount (₹)</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input type="number" min="0" value={editRoomAmount} onChange={e => setEditRoomAmount(e.target.value)}
                        className="flex h-11 w-full rounded-xl border border-border bg-input/50 pl-9 pr-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Paid at Check-In (₹)</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input type="number" min="0" value={editAmountPaidAtCheckin} onChange={e => setEditAmountPaidAtCheckin(e.target.value)}
                        className="flex h-11 w-full rounded-xl border border-border bg-input/50 pl-9 pr-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.26 }}
                  className="space-y-1.5"
                >
                  <label className="text-sm font-medium text-foreground">Check-In Date & Time</label>
                  <input type="datetime-local" value={editCheckIn} onChange={e => setEditCheckIn(e.target.value)}
                    className="flex h-11 w-full rounded-xl border border-border bg-input/50 px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.32 }}
                  className="space-y-1.5"
                >
                  <label className="text-sm font-medium text-foreground">Check-Out Date & Time</label>
                  <input type="datetime-local" value={editCheckOut} onChange={e => setEditCheckOut(e.target.value)}
                    className="flex h-11 w-full rounded-xl border border-border bg-input/50 px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.36 }}
                  className="flex gap-3 pt-2"
                >
                  <Button variant="outline" className="flex-1" onClick={() => setEditRecord(null)}>Cancel</Button>
                  <Button className="flex-1" onClick={handleSaveEdit} isLoading={updateHistory.isPending}>
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />Save Changes
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Detail Modal ── */}
      <AnimatePresence>
        {detailRecord && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setDetailRecord(null)} />
            <motion.div
              variants={modalVariants} initial="hidden" animate="visible" exit="exit"
              transition={modalTransition}
              className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-card z-10 px-6 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-display font-bold text-foreground">{detailRecord.guestName}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Booking Details — Room {detailRecord.roomNumber}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <>
                      <button onClick={() => openEdit(detailRecord)} className="h-8 w-8 rounded-lg flex items-center justify-center text-primary hover:bg-primary/10 transition-colors" title="Edit record">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => { setRecordToDelete(detailRecord.id) }} className="h-8 w-8 rounded-lg flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors" title="Delete record">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  <button onClick={() => setDetailRecord(null)} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="p-6 space-y-4"
              >
                <Section title="Guest Information" icon={User}>
                  <DetailRow label="Full Name" value={detailRecord.guestName} />
                  <DetailRow label="Mobile" value={detailRecord.phone} />
                  <DetailRow label="Room" value={<Badge variant="outline" className="text-sm font-bold border-primary/30 bg-primary/5 text-primary"><BedDouble className="h-3.5 w-3.5 mr-1.5" />{detailRecord.roomNumber}</Badge>} />
                </Section>
                <Section title="Stay Duration" icon={Clock}>
                  <DetailRow label="Check-In" value={<span className="flex items-center gap-1.5"><LogIn className="h-3.5 w-3.5 text-success" />{format(new Date(detailRecord.checkInTime), "dd MMM yyyy, hh:mm a")}</span>} />
                  <DetailRow label="Check-Out" value={<span className="flex items-center gap-1.5"><LogOut className="h-3.5 w-3.5 text-destructive" />{format(new Date(detailRecord.checkOutTime), "dd MMM yyyy, hh:mm a")}</span>} />
                </Section>
                <Section title="Payment Breakdown" icon={IndianRupee}>
                  <DetailRow label="Room Amount" value={`₹${detailRecord.roomAmount?.toLocaleString("en-IN")}`} />
                  <DetailRow label="Paid at Check-In" value={<span>{pmIcon(detailRecord.paymentMethodAtCheckin)} {detailRecord.paymentMethodAtCheckin} — ₹{detailRecord.amountPaidAtCheckin?.toLocaleString("en-IN")}</span>} />
                  {(detailRecord.dueAmountPaidAtCheckout ?? 0) > 0
                    ? <DetailRow label="Due Cleared at Check-Out" value={<span>{pmIcon(detailRecord.duePaymentMethodAtCheckout)} {detailRecord.duePaymentMethodAtCheckout} — ₹{detailRecord.dueAmountPaidAtCheckout?.toLocaleString("en-IN")}</span>} />
                    : <DetailRow label="Due at Check-Out" value={<span className="flex items-center gap-1.5 text-success"><CheckCircle2 className="h-3.5 w-3.5" />Fully paid at check-in</span>} />
                  }
                  <DetailRow label="Total Paid" value={`₹${detailRecord.totalPaid?.toLocaleString("en-IN")}`} accent={detailRecord.totalPaid >= detailRecord.roomAmount ? "text-success" : "text-destructive"} />
                  {detailRecord.totalPaid < detailRecord.roomAmount && (
                    <DetailRow label="Outstanding" value={<span className="flex items-center gap-1.5 text-destructive"><AlertCircle className="h-3.5 w-3.5" />₹{(detailRecord.roomAmount - detailRecord.totalPaid).toLocaleString("en-IN")}</span>} />
                  )}
                </Section>
                <Section title="Staff Record" icon={UserCheck}>
                  <DetailRow label="Checked In By" value={<span className="flex items-center gap-1.5"><LogIn className="h-3.5 w-3.5 text-success" />{detailRecord.checkedInBy || "—"}</span>} />
                  <DetailRow label="Checked Out By" value={<span className="flex items-center gap-1.5"><LogOut className="h-3.5 w-3.5 text-destructive" />{detailRecord.checkedOutBy || "—"}</span>} />
                </Section>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation ── */}
      <AnimatePresence>
        {recordToDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setRecordToDelete(null)} />
            <motion.div
              variants={modalVariants} initial="hidden" animate="visible" exit="exit"
              transition={modalTransition}
              className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm p-6 space-y-4"
            >
              <h2 className="text-xl font-display font-bold text-foreground">Delete Record</h2>
              <p className="text-sm text-muted-foreground">This will permanently delete the history record. This cannot be undone.</p>
              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setRecordToDelete(null)}>Cancel</Button>
                <Button variant="destructive" className="flex-1" onClick={handleDelete} isLoading={deleteHistory.isPending}>Delete</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
