import { useState } from "react"
import {
  useGetBookings, useCheckoutBooking,
  useGetBookingExtras, getGetBookingExtrasQueryKey,
} from "@workspace/api-client-react"
import type { Booking } from "@workspace/api-client-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import {
  LogOut, CalendarClock, User, Hash, IndianRupee,
  AlertCircle, ShoppingBag, CheckCircle2,
} from "lucide-react"
import { format } from "date-fns"

const EASE = [0.22, 1, 0.36, 1] as const

const PAYMENT_METHODS = ["Cash", "PhonePe", "GPay", "Card"] as const
type PaymentMethod = typeof PAYMENT_METHODS[number]

const METHOD_ICONS: Record<PaymentMethod, string> = {
  Cash: "💵",
  PhonePe: "📱",
  GPay: "📲",
  Card: "💳",
}

type SplitMap = Record<PaymentMethod, string>

function CheckoutModal({
  booking,
  onClose,
  onDone,
}: {
  booking: Booking
  onClose: () => void
  onDone: () => void
}) {
  const checkoutBooking = useCheckoutBooking()

  const { data: extras } = useGetBookingExtras(booking.id, {
    query: { queryKey: getGetBookingExtrasQueryKey(booking.id) }
  })

  const extrasTotal = (extras ?? []).reduce((sum, e) => sum + e.rate * e.qty, 0)
  const grandTotal = booking.roomAmount + extrasTotal
  const totalDue = Math.max(0, grandTotal - booking.amountPaid)

  const [splits, setSplits] = useState<SplitMap>({ Cash: "", PhonePe: "", GPay: "", Card: "" })

  const splitTotal = PAYMENT_METHODS.reduce((sum, m) => sum + (Number(splits[m]) || 0), 0)
  const remaining = totalDue - splitTotal
  const isBalanced = Math.abs(remaining) < 0.01

  const handleSplitChange = (method: PaymentMethod, value: string) => {
    setSplits(prev => ({ ...prev, [method]: value }))
  }

  const handleFillRemaining = (method: PaymentMethod) => {
    const otherTotal = PAYMENT_METHODS
      .filter(m => m !== method)
      .reduce((sum, m) => sum + (Number(splits[m]) || 0), 0)
    const needed = totalDue - otherTotal
    if (needed > 0) {
      setSplits(prev => ({ ...prev, [method]: String(Math.round(needed * 100) / 100) }))
    }
  }

  const handleCheckout = async () => {
    if (totalDue > 0 && !isBalanced) {
      toast.error(`Split total ₹${splitTotal.toLocaleString("en-IN")} doesn't match due ₹${totalDue.toLocaleString("en-IN")}`)
      return
    }
    const paymentSplits = PAYMENT_METHODS
      .filter(m => (Number(splits[m]) || 0) > 0)
      .map(m => ({ method: m, amount: Number(splits[m]) }))

    if (totalDue > 0 && paymentSplits.length === 0) {
      toast.error("Enter how the due amount is being paid")
      return
    }
    try {
      await checkoutBooking.mutateAsync({
        id: booking.id,
        data: { paymentSplits: totalDue === 0 ? [] : paymentSplits },
      })
      toast.success(`${booking.guestName} checked out from ${booking.roomNumber}`)
      onDone()
    } catch (error: any) {
      toast.error(error.message || "Failed to checkout")
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ scale: 0.93, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 12 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
          className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md p-6 space-y-5 max-h-[92vh] overflow-y-auto"
        >
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <h2 className="text-xl font-display font-bold text-foreground">Confirm Check-Out</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {booking.guestName} — Room {booking.roomNumber}
            </p>
          </motion.div>

          {/* Bill summary */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.13 }}
            className="rounded-xl border border-border/60 bg-secondary/20 p-4 space-y-2 text-sm"
          >
            <div className="flex justify-between">
              <span className="text-muted-foreground">Room Amount</span>
              <span className="font-semibold text-foreground">₹{booking.roomAmount?.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid at Check-In ({booking.paymentMethod})</span>
              <span className="font-semibold text-success">₹{booking.amountPaid?.toLocaleString("en-IN")}</span>
            </div>

            {extras && extras.length > 0 && (
              <div className="border-t border-border/40 pt-2 mt-1 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <ShoppingBag className="h-3 w-3" /> Extras
                </div>
                {extras.map((extra, i) => (
                  <motion.div
                    key={extra.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.05 }}
                    className="flex justify-between text-xs"
                  >
                    <span className="text-muted-foreground">{extra.itemName} × {extra.qty}</span>
                    <span className="font-medium text-foreground">₹{(extra.rate * extra.qty).toLocaleString("en-IN")}</span>
                  </motion.div>
                ))}
                <div className="flex justify-between pt-1 text-sm font-semibold border-t border-border/30">
                  <span className="text-foreground">Extras Subtotal</span>
                  <span className="text-primary">₹{extrasTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>
            )}

            <div className="border-t border-border/50 pt-2 space-y-1">
              {extrasTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Grand Total</span>
                  <span className="font-semibold text-foreground">₹{grandTotal.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-semibold text-foreground">Due at Checkout</span>
                <motion.span
                  key={totalDue}
                  initial={{ scale: 1.1, opacity: 0.7 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`text-lg font-bold ${totalDue > 0 ? "text-destructive" : "text-success"}`}
                >
                  ₹{totalDue.toLocaleString("en-IN")}
                </motion.span>
              </div>
            </div>
          </motion.div>

          {/* Split payment section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
          >
            {totalDue > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">
                  How is ₹{totalDue.toLocaleString("en-IN")} being paid?
                  <span className="text-xs font-normal text-muted-foreground ml-1">(can split across methods)</span>
                </p>

                <div className="space-y-2">
                  {PAYMENT_METHODS.map((method, i) => (
                    <motion.div
                      key={method}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.06, type: "spring", stiffness: 280, damping: 24 }}
                      className="flex items-center gap-2"
                    >
                      <div className={`flex items-center gap-2 flex-1 px-3 py-2.5 rounded-xl border transition-colors ${
                        (Number(splits[method]) || 0) > 0
                          ? "border-primary/50 bg-primary/5"
                          : "border-border bg-secondary/30"
                      }`}>
                        <span className="text-base">{METHOD_ICONS[method]}</span>
                        <span className="text-sm font-medium text-foreground w-16 shrink-0">{method}</span>
                        <div className="flex items-center flex-1 gap-1">
                          <span className="text-muted-foreground text-sm">₹</span>
                          <input
                            type="number"
                            min="0"
                            value={splits[method]}
                            onChange={e => handleSplitChange(method, e.target.value)}
                            placeholder="0"
                            className="flex-1 bg-transparent text-sm text-foreground focus:outline-none min-w-0"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFillRemaining(method)}
                        className="text-xs text-primary hover:underline whitespace-nowrap px-1"
                        title="Fill remaining balance here"
                      >
                        Fill ₹{Math.max(0, Math.round((totalDue - PAYMENT_METHODS.filter(m => m !== method).reduce((s, m2) => s + (Number(splits[m2]) || 0), 0)) * 100) / 100).toLocaleString("en-IN")}
                      </button>
                    </motion.div>
                  ))}
                </div>

                {/* Running balance */}
                <motion.div
                  animate={{
                    backgroundColor: isBalanced
                      ? "rgba(34,197,94,0.08)"
                      : splitTotal > totalDue
                        ? "rgba(239,68,68,0.08)"
                        : "rgba(251,191,36,0.08)"
                  }}
                  transition={{ duration: 0.3 }}
                  className={`flex items-center justify-between rounded-xl px-4 py-2.5 border text-sm font-semibold transition-colors ${
                    isBalanced
                      ? "border-success/30 text-success"
                      : splitTotal > totalDue
                        ? "border-destructive/30 text-destructive"
                        : "border-amber-400/30 text-amber-400"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {isBalanced ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {isBalanced
                      ? "Balanced — ready to check out"
                      : splitTotal > totalDue
                        ? `Over by ₹${(splitTotal - totalDue).toLocaleString("en-IN")}`
                        : `Remaining ₹${remaining.toLocaleString("en-IN")}`}
                  </span>
                  <motion.span key={splitTotal} initial={{ scale: 1.1, opacity: 0.7 }} animate={{ scale: 1, opacity: 1 }}>
                    ₹{splitTotal.toLocaleString("en-IN")} / ₹{totalDue.toLocaleString("en-IN")}
                  </motion.span>
                </motion.div>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 text-success text-sm font-semibold"
              >
                <CheckCircle2 className="h-4 w-4" />
                Already fully paid at check-in. No due amount.
              </motion.div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="flex gap-3 pt-1"
          >
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleCheckout}
              isLoading={checkoutBooking.isPending}
              disabled={totalDue > 0 && !isBalanced}
            >
              Confirm Check-Out
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default function CheckOut() {
  const queryClient = useQueryClient()
  const { data: bookings, isLoading } = useGetBookings()
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  const handleDone = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/bookings"] })
    queryClient.invalidateQueries({ queryKey: ["/api/rooms"] })
    queryClient.invalidateQueries({ queryKey: ["/api/history"] })
    setSelectedBooking(null)
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 max-w-4xl mx-auto">
        <div className="h-10 w-48 bg-secondary rounded mb-8"></div>
        {[1, 2, 3].map(i => <div key={i} className="h-28 bg-secondary rounded-2xl"></div>)}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: EASE }}
      >
        <h1 className="text-3xl font-display font-bold text-foreground">Departures</h1>
        <p className="text-muted-foreground mt-1">Manage guest check-outs and clear rooms.</p>
      </motion.div>

      {!bookings || bookings.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="text-center py-20 px-6 bg-card rounded-2xl border border-dashed border-border"
        >
          <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
            <LogOut className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No Active Bookings</h3>
          <p className="text-muted-foreground">There are currently no guests to check out.</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking, i) => (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.38, ease: EASE }}
              whileHover={{ y: -2 }}
            >
              <Card className="border border-border/70 hover:border-primary/40 transition-colors bg-card">
                <CardContent className="p-0">
                  <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Hash className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Room</p>
                        <p className="text-base font-bold text-foreground">{booking.roomNumber}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Guest</p>
                        <p className="text-sm font-semibold truncate text-foreground">{booking.guestName}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Amount</p>
                        <p className="text-sm font-semibold text-foreground">₹{booking.roomAmount?.toLocaleString("en-IN")}</p>
                        {(booking.extrasTotal ?? 0) > 0 && (
                          <p className="text-xs text-primary font-medium">+₹{booking.extrasTotal?.toLocaleString("en-IN")} extras</p>
                        )}
                        <p className="text-xs text-muted-foreground">Paid: ₹{booking.amountPaid?.toLocaleString("en-IN")} via {booking.paymentMethod}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <CalendarClock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Check-In</p>
                        <p className="text-xs font-medium text-foreground">{format(new Date(booking.checkInTime), "MMM d, h:mm a")}</p>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 pb-4 flex items-center justify-between border-t border-border/40 pt-3 gap-4">
                    <div className={`flex items-center gap-2 text-sm font-semibold ${
                      ((booking.dueAmount ?? 0) + (booking.extrasTotal ?? 0)) > 0 ? "text-destructive" : "text-success"
                    }`}>
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {((booking.dueAmount ?? 0) + (booking.extrasTotal ?? 0)) > 0
                        ? `Due: ₹${((booking.dueAmount ?? 0) + (booking.extrasTotal ?? 0)).toLocaleString("en-IN")}`
                        : "Fully Paid"}
                    </div>
                    <motion.div whileTap={{ scale: 0.96 }}>
                      <Button
                        size="sm"
                        onClick={() => setSelectedBooking(booking)}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Check Out
                      </Button>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedBooking && (
          <CheckoutModal
            booking={selectedBooking}
            onClose={() => setSelectedBooking(null)}
            onDone={handleDone}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
