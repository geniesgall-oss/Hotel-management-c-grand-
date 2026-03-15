import { useState } from "react"
import { useGetBookings, useCheckoutBooking } from "@workspace/api-client-react"
import type { Booking } from "@workspace/api-client-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { LogOut, CalendarClock, User, Hash, IndianRupee, CreditCard, AlertCircle } from "lucide-react"
import { format } from "date-fns"

const PAYMENT_METHODS = ["Cash", "PhonePe", "GPay", "Card"] as const
type PaymentMethod = typeof PAYMENT_METHODS[number]

export default function CheckOut() {
  const queryClient = useQueryClient()
  const { data: bookings, isLoading } = useGetBookings()
  const checkoutBooking = useCheckoutBooking()

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [duePaymentMethod, setDuePaymentMethod] = useState<PaymentMethod>("Cash")

  const handleCheckout = async () => {
    if (!selectedBooking) return
    try {
      await checkoutBooking.mutateAsync({
        id: selectedBooking.id,
        data: {
          duePaymentMethod,
          dueAmountPaid: selectedBooking.dueAmount,
        },
      })
      toast.success(`${selectedBooking.guestName} checked out from ${selectedBooking.roomNumber}`)
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] })
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] })
      queryClient.invalidateQueries({ queryKey: ["/api/history"] })
      setSelectedBooking(null)
      setDuePaymentMethod("Cash")
    } catch (error: any) {
      toast.error(error.message || "Failed to checkout")
    }
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
                    (booking.dueAmount ?? 0) > 0 ? "text-destructive" : "text-success"
                  }`}>
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {(booking.dueAmount ?? 0) > 0
                      ? `Due: ₹${booking.dueAmount?.toLocaleString("en-IN")}`
                      : "Fully Paid"}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => { setSelectedBooking(booking); setDuePaymentMethod("Cash") }}
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

      {/* Checkout Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedBooking(null)} />
          <div className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md p-6 space-y-5">
            <div>
              <h2 className="text-xl font-display font-bold text-foreground">Confirm Check-Out</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedBooking.guestName} — Room {selectedBooking.roomNumber}
              </p>
            </div>

            {/* Payment summary */}
            <div className="rounded-xl border border-border/60 bg-secondary/20 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Room Amount</span>
                <span className="font-semibold text-foreground">₹{selectedBooking.roomAmount?.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid at Check-In ({selectedBooking.paymentMethod})</span>
                <span className="font-semibold text-success">₹{selectedBooking.amountPaid?.toLocaleString("en-IN")}</span>
              </div>
              <div className="border-t border-border/50 pt-2 flex justify-between">
                <span className="font-semibold text-foreground">Due Amount</span>
                <span className={`text-lg font-bold ${(selectedBooking.dueAmount ?? 0) > 0 ? "text-destructive" : "text-success"}`}>
                  ₹{selectedBooking.dueAmount?.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {(selectedBooking.dueAmount ?? 0) > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-primary" />
                  How is the due amount being paid?
                </p>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_METHODS.map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setDuePaymentMethod(method)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                        duePaymentMethod === method
                          ? "bg-primary text-primary-foreground border-primary shadow-md"
                          : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                      }`}
                    >
                      {method === "PhonePe" ? "📱 PhonePe" : method === "GPay" ? "📲 GPay" : method === "Card" ? "💳 Card" : "💵 Cash"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setSelectedBooking(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleCheckout}
                isLoading={checkoutBooking.isPending}
              >
                Confirm Check-Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
