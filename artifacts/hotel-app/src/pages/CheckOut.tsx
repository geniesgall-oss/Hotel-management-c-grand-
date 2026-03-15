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
import {
  LogOut, CalendarClock, User, Hash, IndianRupee,
  AlertCircle, ShoppingBag, CheckCircle2,
} from "lucide-react"
import { format } from "date-fns"

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md p-6 space-y-5 max-h-[92vh] overflow-y-auto">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Confirm Check-Out</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {booking.guestName} — Room {booking.roomNumber}
          </p>
        </div>

        {/* Bill summary */}
        <div className="rounded-xl border border-border/60 bg-secondary/20 p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Room Amount</span>
            <span className="font-semibold text-foreground">₹{booking.roomAmount?.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Paid at Check-In ({booking.paymentMethod})</span>
            <span className="font-semibold text-success">₹{booking.amountPaid?.toLocaleString("en-IN")}</span>
          </div>

          {/* Extras */}
          {extras && extras.length > 0 && (
            <div className="border-t border-border/40 pt-2 mt-1 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <ShoppingBag className="h-3 w-3" /> Extras
              </div>
              {extras.map(extra => (
                <div key={extra.id} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{extra.itemName} × {extra.qty}</span>
                  <span className="font-medium text-foreground">₹{(extra.rate * extra.qty).toLocaleString("en-IN")}</span>
                </div>
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
              <span className={`text-lg font-bold ${totalDue > 0 ? "text-destructive" : "text-success"}`}>
                ₹{totalDue.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* Split payment section */}
        {totalDue > 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">
              How is ₹{totalDue.toLocaleString("en-IN")} being paid?
              <span className="text-xs font-normal text-muted-foreground ml-1">(can split across methods)</span>
            </p>

            <div className="space-y-2">
              {PAYMENT_METHODS.map(method => (
                <div key={method} className="flex items-center gap-2">
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
                </div>
              ))}
            </div>

            {/* Running balance */}
            <div className={`flex items-center justify-between rounded-xl px-4 py-2.5 border text-sm font-semibold transition-colors ${
              isBalanced
                ? "bg-success/8 border-success/30 text-success"
                : splitTotal > totalDue
                  ? "bg-destructive/8 border-destructive/30 text-destructive"
                  : "bg-amber-400/8 border-amber-400/30 text-amber-400"
            }`}>
              <span className="flex items-center gap-1.5">
                {isBalanced ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {isBalanced
                  ? "Balanced — ready to check out"
                  : splitTotal > totalDue
                    ? `Over by ₹${(splitTotal - totalDue).toLocaleString("en-IN")}`
                    : `Remaining ₹${remaining.toLocaleString("en-IN")}`}
              </span>
              <span>₹{splitTotal.toLocaleString("en-IN")} / ₹{totalDue.toLocaleString("en-IN")}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-success text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            Already fully paid at check-in. No due amount.
          </div>
        )}

        <div className="flex gap-3 pt-1">
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
        </div>
      </div>
    </div>
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
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Departures</h1>
        <p className="text-muted-foreground mt-1">Manage guest check-outs and clear rooms.</p>
      </div>

      {!bookings || bookings.length === 0 ? (
        <div className="text-center py-20 px-6 bg-card rounded-2xl border border-dashed border-border">
          <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
            <LogOut className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No Active Bookings</h3>
          <p className="text-muted-foreground">There are currently no guests to check out.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <Card key={booking.id} className="border border-border/70 hover:border-primary/40 transition-colors bg-card">
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
                  <Button
                    size="sm"
                    onClick={() => setSelectedBooking(booking)}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Check Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedBooking && (
        <CheckoutModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onDone={handleDone}
        />
      )}
    </div>
  )
}
