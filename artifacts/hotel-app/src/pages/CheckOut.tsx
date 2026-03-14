import { useState } from "react"
import { useGetBookings, useCheckoutBooking } from "@workspace/api-client-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { LogOut, CalendarClock, User, Hash } from "lucide-react"
import { format } from "date-fns"

export default function CheckOut() {
  const queryClient = useQueryClient()
  const { data: bookings, isLoading } = useGetBookings()
  const checkoutBooking = useCheckoutBooking()
  
  const [selectedBooking, setSelectedBooking] = useState<number | null>(null)

  const handleCheckout = async () => {
    if (!selectedBooking) return
    
    try {
      await checkoutBooking.mutateAsync({ id: selectedBooking })
      toast.success("Guest checked out successfully")
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] })
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] })
      queryClient.invalidateQueries({ queryKey: ["/api/history"] })
      setSelectedBooking(null)
    } catch (error: any) {
      toast.error(error.message || "Failed to checkout")
    }
  }

  if (isLoading) {
    return <div className="animate-pulse space-y-4 max-w-4xl mx-auto">
      <div className="h-10 w-48 bg-secondary rounded mb-8"></div>
      {[1, 2, 3].map(i => <div key={i} className="h-24 bg-secondary rounded-2xl"></div>)}
    </div>
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
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card key={booking.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-0 flex flex-col sm:flex-row items-center justify-between">
                <div className="p-6 flex-1 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Hash className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Room</p>
                      <p className="text-lg font-bold">{booking.roomNumber}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Guest Name</p>
                      <p className="text-base font-semibold truncate">{booking.guestName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <CalendarClock className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Checked In</p>
                      <p className="text-sm font-medium truncate">{format(new Date(booking.checkInTime), "MMM d, h:mm a")}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 sm:border-l border-border/50 bg-secondary/20 sm:w-48 flex items-center justify-center">
                  <Button 
                    onClick={() => setSelectedBooking(booking.id)}
                    className="w-full bg-foreground text-background hover:bg-foreground/90 shadow-xl shadow-foreground/10"
                  >
                    Check Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog 
        open={!!selectedBooking} 
        onClose={() => setSelectedBooking(null)}
        title="Confirm Check-Out"
        description="Are you sure you want to check out this guest? This will make the room available and move the record to history."
      >
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setSelectedBooking(null)}>Cancel</Button>
          <Button 
            onClick={handleCheckout} 
            isLoading={checkoutBooking.isPending}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            Confirm Check-Out
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
