import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useGetRooms, useCreateBooking } from "@workspace/api-client-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { UserPlus, Clock } from "lucide-react"

const checkInSchema = z.object({
  guestName: z.string().min(2, "Guest name is required"),
  phone: z.string().min(5, "Valid phone number is required"),
  roomNumber: z.string().min(1, "Please select a room"),
})

type CheckInForm = z.infer<typeof checkInSchema>

export default function CheckIn() {
  const queryClient = useQueryClient()
  const { data: rooms } = useGetRooms()
  const createBooking = useCreateBooking()
  
  const [currentTime, setCurrentTime] = useState(new Date())
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CheckInForm>({
    resolver: zodResolver(checkInSchema)
  })

  const availableRooms = rooms?.filter(r => r.status === 'available') || []

  const onSubmit = async (data: CheckInForm) => {
    try {
      await createBooking.mutateAsync({ data })
      toast.success(`${data.guestName} checked into ${data.roomNumber} successfully!`)
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] })
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] })
      reset()
    } catch (error: any) {
      toast.error(error.message || "Failed to check in")
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">New Check-In</h1>
        <p className="text-muted-foreground mt-1">Register a new guest to an available room.</p>
      </div>

      <Card className="border-t-4 border-t-primary shadow-xl">
        <CardHeader className="bg-secondary/30 pb-8 border-b border-border">
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            Guest Details
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="guestName">Guest Full Name</Label>
                <Input
                  id="guestName"
                  placeholder="John Doe"
                  {...register("guestName")}
                  className={errors.guestName ? "border-destructive" : ""}
                />
                {errors.guestName && <p className="text-sm text-destructive">{errors.guestName.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="+1 (555) 000-0000"
                  {...register("phone")}
                  className={errors.phone ? "border-destructive" : ""}
                />
                {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="roomNumber">Assign Room</Label>
                <select
                  id="roomNumber"
                  {...register("roomNumber")}
                  className={`flex h-12 w-full rounded-xl border-2 border-input bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 transition-all ${errors.roomNumber ? "border-destructive" : ""}`}
                >
                  <option value="">Select available room...</option>
                  {availableRooms.map((room) => (
                    <option key={room.id} value={room.number}>
                      {room.number}
                    </option>
                  ))}
                </select>
                {errors.roomNumber && <p className="text-sm text-destructive">{errors.roomNumber.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Auto Check-in Time</Label>
                <div className="flex h-12 w-full rounded-xl border-2 border-border bg-secondary/50 px-4 items-center text-sm text-muted-foreground gap-2 cursor-not-allowed">
                  <Clock className="h-4 w-4" />
                  {currentTime.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Button type="submit" size="lg" className="w-full text-lg" isLoading={createBooking.isPending} disabled={availableRooms.length === 0}>
                {availableRooms.length === 0 ? "No Rooms Available" : "Confirm Check-In"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
