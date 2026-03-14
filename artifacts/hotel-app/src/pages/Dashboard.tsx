import { useGetRooms } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DoorOpen, User, Phone, CalendarClock, IndianRupee, AlertCircle } from "lucide-react"
import { format } from "date-fns"

export default function Dashboard() {
  const { data: rooms, isLoading, error } = useGetRooms()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 bg-secondary rounded-lg animate-pulse mb-2"></div>
          <div className="h-4 w-64 bg-secondary rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-44 bg-secondary rounded-2xl animate-pulse"></div>
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
  const occupiedCount = rooms?.filter(r => r.status === "occupied").length || 0

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Overview</h1>
          <p className="text-muted-foreground mt-1">Real-time status of all 12 rooms.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-card px-4 py-2 rounded-xl border border-border flex items-center gap-2.5">
            <div className="h-2.5 w-2.5 rounded-full bg-success shadow-[0_0_8px] shadow-success/60" />
            <span className="text-sm font-semibold">{availableCount} Available</span>
          </div>
          <div className="bg-card px-4 py-2 rounded-xl border border-border flex items-center gap-2.5">
            <div className="h-2.5 w-2.5 rounded-full bg-destructive shadow-[0_0_8px] shadow-destructive/60" />
            <span className="text-sm font-semibold">{occupiedCount} Occupied</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {rooms?.map((room) => {
          const isOccupied = room.status === "occupied"
          const booking = room.currentBooking
          const hasDue = isOccupied && (booking?.dueAmount ?? 0) > 0

          return (
            <Card
              key={room.id}
              className={`relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 border ${
                isOccupied
                  ? "border-destructive/25 hover:border-destructive/50 bg-card"
                  : "border-success/20 hover:border-success/40 bg-card"
              }`}
            >
              {/* Glow */}
              <div className={`absolute top-0 right-0 w-28 h-28 blur-3xl -z-0 rounded-full opacity-10 group-hover:opacity-20 transition-opacity duration-500 ${
                isOccupied ? "bg-destructive" : "bg-success"
              }`} />

              <CardHeader className="pb-3 border-b border-border/40 relative z-10">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xl text-foreground">
                    <DoorOpen className={`h-5 w-5 ${isOccupied ? "text-destructive" : "text-success"}`} />
                    {room.number}
                  </CardTitle>
                  <Badge
                    className={`text-xs font-semibold border ${
                      isOccupied
                        ? "bg-destructive/15 text-destructive border-destructive/30"
                        : "bg-success/15 text-success border-success/30"
                    }`}
                  >
                    {isOccupied ? "Occupied" : "Available"}
                  </Badge>
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
                      </div>
                      {hasDue ? (
                        <div className="flex items-center gap-1 text-xs font-semibold text-destructive">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Due ₹{booking.dueAmount?.toLocaleString("en-IN")}
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-success">Paid</span>
                      )}
                    </div>
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
          )
        })}
      </div>
    </div>
  )
}
