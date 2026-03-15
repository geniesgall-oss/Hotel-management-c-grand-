import { useState } from "react"
import {
  useGetRooms, useUpdateBooking, useDeleteBooking, useMarkRoomClean,
  useGetBookingExtras, useAddBookingExtra, useDeleteBookingExtra,
  getGetBookingExtrasQueryKey,
} from "@workspace/api-client-react"
import type { Booking, RoomExtra } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { motion, AnimatePresence, type Variants, type Easing } from "framer-motion"
import {
  DoorOpen, User, Phone, CalendarClock, IndianRupee, AlertCircle,
  Pencil, Trash2, X, Check, CreditCard, Sparkles, Wind,
  ShoppingBag, Plus, Minus,
} from "lucide-react"
import { format } from "date-fns"

const PAYMENT_METHODS = ["Cash", "PhonePe", "GPay", "Card"] as const

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.04, duration: 0.35, ease: "easeOut" as const },
  }),
}

function ExtrasModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { data: extras, isLoading } = useGetBookingExtras(booking.id, {
    query: { queryKey: getGetBookingExtrasQueryKey(booking.id) }
  })
  const addExtra = useAddBookingExtra()
  const deleteExtra = useDeleteBookingExtra()

  const [itemName, setItemName] = useState("")
  const [rate, setRate] = useState("")
  const [qty, setQty] = useState("1")

  const extrasTotal = (extras ?? []).reduce((sum, e) => sum + e.rate * e.qty, 0)

  const PREBUILT_ITEMS = [
    "1L Water Bottle", "Coke", "Pepsi", "Kinley", "Soda", "Sprite",
  ]

  const handleAdd = async () => {
    if (!itemName.trim()) { toast.error("Enter an item name"); return }
    const rateNum = Number(rate)
    if (!rateNum || rateNum <= 0) { toast.error("Enter a valid rate"); return }
    try {
      await addExtra.mutateAsync({ id: booking.id, data: { itemName: itemName.trim(), rate: rateNum, qty: Math.max(1, Number(qty) || 1) } })
      toast.success(`Added: ${itemName.trim()}`)
      queryClient.invalidateQueries({ queryKey: getGetBookingExtrasQueryKey(booking.id) })
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] })
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] })
      setItemName(""); setRate(""); setQty("1")
    } catch (err: any) {
      toast.error(err.message || "Failed to add item")
    }
  }

  const handleDelete = async (extra: RoomExtra) => {
    try {
      await deleteExtra.mutateAsync({ id: booking.id, extraId: extra.id })
      toast.success(`Removed: ${extra.itemName}`)
      queryClient.invalidateQueries({ queryKey: getGetBookingExtrasQueryKey(booking.id) })
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] })
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] })
    } catch (err: any) {
      toast.error(err.message || "Failed to remove item")
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border/50">
          <div>
            <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Room Extras — {booking.roomNumber}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{booking.guestName}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Extras list */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map(i => <div key={i} className="h-10 bg-secondary rounded-xl animate-pulse" />)}
            </div>
          ) : extras && extras.length > 0 ? (
            <div className="space-y-2">
              {extras.map(extra => (
                <div key={extra.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-secondary/40 rounded-xl border border-border/50 group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{extra.itemName}</p>
                    <p className="text-xs text-muted-foreground">
                      ₹{extra.rate.toLocaleString("en-IN")} × {extra.qty}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold text-foreground">
                      ₹{(extra.rate * extra.qty).toLocaleString("en-IN")}
                    </span>
                    <button
                      onClick={() => handleDelete(extra)}
                      disabled={deleteExtra.isPending}
                      className="h-6 w-6 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-40"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
              {/* Extras total */}
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-primary/8 rounded-xl border border-primary/20">
                <span className="text-sm font-semibold text-foreground">Extras Total</span>
                <span className="text-base font-bold text-primary">₹{extrasTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No extras added yet
            </div>
          )}

          {/* Add new extra form */}
          <div className="pt-2 border-t border-border/50 space-y-3">
            <p className="text-sm font-semibold text-foreground">Add Item</p>

            {/* Prebuilt quick-select */}
            <div className="flex flex-wrap gap-1.5">
              {PREBUILT_ITEMS.map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setItemName(item)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                    itemName === item
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary/60 text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <input
                value={itemName}
                onChange={e => setItemName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAdd()}
                placeholder="Or type a custom item name…"
                className="flex h-10 w-full rounded-xl border border-border bg-input/50 px-3.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="number" min="0" value={rate}
                    onChange={e => setRate(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleAdd()}
                    placeholder="Rate"
                    className="flex h-10 w-full rounded-xl border border-border bg-input/50 pl-8 pr-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <input
                  type="number" min="1" value={qty}
                  onChange={e => setQty(e.target.value)}
                  placeholder="Qty"
                  className="flex h-10 w-full rounded-xl border border-border bg-input/50 px-3.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <Button className="w-full" onClick={handleAdd} isLoading={addExtra.isPending}>
                <Plus className="h-4 w-4 mr-1.5" />Add to Room
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: rooms, isLoading, error } = useGetRooms()
  const updateBooking = useUpdateBooking()
  const deleteBooking = useDeleteBooking()
  const markClean = useMarkRoomClean()
  const isAdmin = user?.role === "admin"

  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Booking | null>(null)
  const [cleaningRoom, setCleaningRoom] = useState<string | null>(null)
  const [extrasBooking, setExtrasBooking] = useState<Booking | null>(null)

  const [editName, setEditName] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editRoomAmount, setEditRoomAmount] = useState("")
  const [editAmountPaid, setEditAmountPaid] = useState("")
  const [editPaymentMethod, setEditPaymentMethod] = useState("Cash")

  const openEdit = (booking: Booking) => {
    setEditingBooking(booking)
    setEditName(booking.guestName)
    setEditPhone(booking.phone.replace(/^\+91/, ""))
    setEditRoomAmount(String(booking.roomAmount))
    setEditAmountPaid(String(booking.amountPaid))
    setEditPaymentMethod(booking.paymentMethod)
  }

  const handleSaveEdit = async () => {
    if (!editingBooking) return
    const roomAmount = Number(editRoomAmount) || 0
    const amountPaid = Math.min(Number(editAmountPaid) || 0, roomAmount)
    const phoneDigits = editPhone.replace(/\D/g, "")
    if (!editName.trim() || phoneDigits.length !== 10) {
      toast.error("Enter a valid guest name and 10-digit phone number")
      return
    }
    try {
      await updateBooking.mutateAsync({
        id: editingBooking.id,
        data: { guestName: editName.trim(), phone: `+91${phoneDigits}`, roomAmount, amountPaid, paymentMethod: editPaymentMethod },
      })
      toast.success("Booking updated")
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] })
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] })
      setEditingBooking(null)
    } catch (err: any) {
      toast.error(err.message || "Failed to update booking")
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await deleteBooking.mutateAsync({ id: deleteConfirm.id })
      toast.success(`Booking for ${deleteConfirm.guestName} deleted — room marked dirty`)
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] })
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] })
      setDeleteConfirm(null)
    } catch (err: any) {
      toast.error(err.message || "Failed to delete booking")
    }
  }

  const handleMarkClean = async (roomNumber: string) => {
    setCleaningRoom(roomNumber)
    try {
      await markClean.mutateAsync({ number: roomNumber })
      toast.success(`Room ${roomNumber} is now clean and available!`)
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] })
    } catch (err: any) {
      toast.error(err.message || "Failed to mark room clean")
    } finally {
      setCleaningRoom(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-secondary rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-64 bg-secondary rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-48 bg-secondary rounded-2xl animate-pulse" style={{ animationDelay: `${i * 40}ms` }} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-destructive/10 rounded-2xl border border-destructive/20 text-destructive">
        <h3 className="font-bold text-lg mb-2">Failed to load dashboard</h3>
        <p>Please check your connection and try again.</p>
      </div>
    )
  }

  const availableCount = rooms?.filter(r => r.status === "available").length || 0
  const occupiedCount  = rooms?.filter(r => r.status === "occupied").length  || 0
  const dirtyCount     = rooms?.filter(r => r.status === "dirty").length     || 0
  const editDue = Math.max(0, (Number(editRoomAmount) || 0) - (Number(editAmountPaid) || 0))

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Overview</h1>
          <p className="text-muted-foreground mt-1">Real-time status of all 12 rooms.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-card px-3.5 py-2 rounded-xl border border-border flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-success shadow-[0_0_8px] shadow-success/60" />
            <span className="text-sm font-semibold">{availableCount} Available</span>
          </div>
          <div className="bg-card px-3.5 py-2 rounded-xl border border-border flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-destructive shadow-[0_0_8px] shadow-destructive/60" />
            <span className="text-sm font-semibold">{occupiedCount} Occupied</span>
          </div>
          {dirtyCount > 0 && (
            <div className="bg-card px-3.5 py-2 rounded-xl border border-amber-500/30 flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_8px] shadow-amber-400/60" />
              <span className="text-sm font-semibold text-amber-400">{dirtyCount} Needs Cleaning</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Room Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {rooms?.map((room, idx) => {
          const isOccupied = room.status === "occupied"
          const isDirty    = room.status === "dirty"
          const booking = room.currentBooking
          const hasDue = isOccupied && (booking?.dueAmount ?? 0) > 0
          const hasExtras = isOccupied && (booking?.extrasTotal ?? 0) > 0

          return (
            <motion.div
              key={room.id}
              custom={idx}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
            >
              <Card className={`relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 border h-full ${
                isOccupied  ? "border-destructive/25 hover:border-destructive/50" :
                isDirty     ? "border-amber-500/30 hover:border-amber-400/60" :
                              "border-success/20 hover:border-success/40"
              } bg-card`}>
                {/* Glow */}
                <div className={`absolute top-0 right-0 w-28 h-28 blur-3xl -z-0 rounded-full opacity-10 group-hover:opacity-25 transition-opacity duration-500 ${
                  isOccupied ? "bg-destructive" : isDirty ? "bg-amber-400" : "bg-success"
                }`} />

                <CardHeader className="pb-3 border-b border-border/40 relative z-10">
                  <div className="flex items-center justify-between gap-1">
                    <CardTitle className="flex items-center gap-2 text-xl text-foreground">
                      <DoorOpen className={`h-5 w-5 ${isOccupied ? "text-destructive" : isDirty ? "text-amber-400" : "text-success"}`} />
                      {room.number}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      {isOccupied && booking && (
                        <button
                          onClick={() => setExtrasBooking(booking)}
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors relative"
                          title="Room Extras"
                        >
                          <ShoppingBag className="h-3.5 w-3.5" />
                          {hasExtras && (
                            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
                          )}
                        </button>
                      )}
                      {isAdmin && isOccupied && booking && (
                        <>
                          <button onClick={() => openEdit(booking)} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors" title="Edit booking">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setDeleteConfirm(booking)} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="Delete booking">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      <Badge className={`text-xs font-semibold border ${
                        isOccupied  ? "bg-destructive/15 text-destructive border-destructive/30" :
                        isDirty     ? "bg-amber-400/15 text-amber-400 border-amber-400/30" :
                                      "bg-success/15 text-success border-success/30"
                      }`}>
                        {isOccupied ? "Occupied" : isDirty ? "Dirty" : "Available"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 pb-5 min-h-[130px] flex flex-col justify-center relative z-10">
                  {isOccupied && booking ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                          <User className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <p className="font-semibold text-foreground truncate text-sm">{booking.guestName}</p>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <p className="truncate">{booking.phone}</p>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                        <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                        <p className="truncate">{format(new Date(booking.checkInTime), "MMM d, h:mm a")}</p>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <IndianRupee className="h-3.5 w-3.5 shrink-0" />
                          <span>₹{booking.roomAmount?.toLocaleString("en-IN")}</span>
                          {hasExtras && (
                            <span className="text-primary font-medium">+₹{booking.extrasTotal?.toLocaleString("en-IN")}</span>
                          )}
                        </div>
                        {hasDue ? (
                          <div className="flex items-center gap-1 text-xs font-semibold text-destructive">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Due ₹{booking.dueAmount?.toLocaleString("en-IN")}
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-success">Paid ✓</span>
                        )}
                      </div>
                    </div>
                  ) : isDirty ? (
                    <div className="flex flex-col items-center justify-center text-center h-full space-y-3">
                      <div className="h-11 w-11 rounded-full bg-amber-400/15 flex items-center justify-center">
                        <Wind className="h-5 w-5 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-amber-400">Needs Cleaning</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Room was just vacated</p>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleMarkClean(room.number)}
                        disabled={cleaningRoom === room.number}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-400/15 text-amber-400 border border-amber-400/30 hover:bg-amber-400/25 transition-colors disabled:opacity-60"
                      >
                        {cleaningRoom === room.number ? (
                          <span className="h-3.5 w-3.5 rounded-full border-2 border-amber-400 border-r-transparent animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        Mark as Clean
                      </motion.button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center h-full space-y-2 opacity-50">
                      <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center text-success">
                        <DoorOpen className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">Ready for check-in</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* ── Extras Modal ── */}
      <AnimatePresence>
        {extrasBooking && (
          <ExtrasModal booking={extrasBooking} onClose={() => setExtrasBooking(null)} />
        )}
      </AnimatePresence>

      {/* ── Edit Booking Modal ── */}
      <AnimatePresence>
        {editingBooking && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditingBooking(null)} />
            <motion.div
              initial={{ scale: 0.93, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-display font-bold text-foreground">Edit Booking — {editingBooking.roomNumber}</h2>
                <button onClick={() => setEditingBooking(null)} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Guest Name</label>
                  <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Guest full name"
                    className="flex h-11 w-full rounded-xl border border-border bg-input/50 px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Mobile Number</label>
                  <div className="flex">
                    <span className="flex items-center px-3 rounded-l-xl border border-r-0 border-border bg-secondary text-muted-foreground text-sm font-medium select-none">+91</span>
                    <input value={editPhone} onChange={e => setEditPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      maxLength={10} type="tel" placeholder="9876543210"
                      className="flex h-11 w-full rounded-r-xl border border-border bg-input/50 px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                      <input type="number" min="0" value={editAmountPaid} onChange={e => setEditAmountPaid(e.target.value)}
                        className="flex h-11 w-full rounded-xl border border-border bg-input/50 pl-9 pr-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    </div>
                  </div>
                </div>
                <motion.div animate={{ backgroundColor: editDue > 0 ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)" }}
                  className={`flex items-center justify-between rounded-xl px-4 py-2.5 border text-sm font-semibold ${editDue > 0 ? "border-destructive/30 text-destructive" : "border-success/30 text-success"}`}>
                  <span>{editDue > 0 ? "Due Remaining" : "Fully Paid"}</span>
                  <span>₹{editDue.toLocaleString("en-IN")}</span>
                </motion.div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" />Payment Method</label>
                  <div className="flex flex-wrap gap-2">
                    {PAYMENT_METHODS.map(m => (
                      <button key={m} type="button" onClick={() => setEditPaymentMethod(m)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${editPaymentMethod === m ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/50"}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setEditingBooking(null)}>Cancel</Button>
                <Button className="flex-1" onClick={handleSaveEdit} isLoading={updateBooking.isPending}>
                  <Check className="h-4 w-4 mr-1.5" />Save Changes
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation Modal ── */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
            <motion.div initial={{ scale: 0.93, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm p-6 space-y-4">
              <h2 className="text-xl font-display font-bold text-foreground">Delete Active Booking</h2>
              <p className="text-sm text-muted-foreground">
                Delete booking for <span className="font-semibold text-foreground">{deleteConfirm.guestName}</span> in room <span className="font-semibold text-foreground">{deleteConfirm.roomNumber}</span>?
                The room will be marked dirty. This cannot be undone.
              </p>
              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                <Button variant="destructive" className="flex-1" onClick={handleDelete} isLoading={deleteBooking.isPending}>
                  <Trash2 className="h-4 w-4 mr-1.5" />Delete
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
