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
import { useLocation } from "wouter"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { UserPlus, Clock, IndianRupee, CreditCard, CheckCircle2 } from "lucide-react"

const PAYMENT_METHODS = ["Cash", "PhonePe", "GPay", "Card"] as const

const checkInSchema = z.object({
  guestName: z.string().min(2, "Guest name must be at least 2 characters"),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  roomNumber: z.string().min(1, "Please select a room"),
  roomAmount: z
    .number({ invalid_type_error: "Enter a valid amount" })
    .min(1, "Room amount must be greater than 0"),
  amountPaid: z
    .number({ invalid_type_error: "Enter a valid amount" })
    .min(0, "Amount paid cannot be negative"),
  paymentMethod: z.enum(PAYMENT_METHODS, { errorMap: () => ({ message: "Select a payment method" }) }),
}).refine(d => d.amountPaid <= d.roomAmount, {
  message: "Amount paid cannot exceed room amount",
  path: ["amountPaid"],
})

type CheckInForm = z.infer<typeof checkInSchema>

const PM_ICONS: Record<string, string> = {
  PhonePe: "📱", GPay: "📲", Card: "💳", Cash: "💵",
}

export default function CheckIn() {
  const queryClient = useQueryClient()
  const { data: rooms } = useGetRooms()
  const createBooking = useCreateBooking()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [, setLocation] = useLocation()
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<CheckInForm>({
    resolver: zodResolver(checkInSchema),
    defaultValues: { paymentMethod: "Cash", amountPaid: 0 },
  })

  const roomAmount = watch("roomAmount") || 0
  const amountPaid = watch("amountPaid") || 0
  const selectedPaymentMethod = watch("paymentMethod")
  const dueAmount = Math.max(0, Number(roomAmount) - Number(amountPaid))

  const availableRooms = rooms?.filter(r => r.status === "available") || []

  const onSubmit = async (data: CheckInForm) => {
    try {
      const result = await createBooking.mutateAsync({ data: { ...data, phone: `+91${data.phone}` } })
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] })
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] })
      reset({ paymentMethod: "Cash", amountPaid: 0 })
      setShowSuccess(true)
      toast.success(`${data.guestName} checked into ${data.roomNumber}!`)
      // Brief success flash, then navigate to overview
      setTimeout(() => {
        setShowSuccess(false)
        setLocation("/")
      }, 1400)
    } catch (error: any) {
      toast.error(error.message || "Failed to check in")
    }
  }

  const inputCls = (hasError?: boolean) =>
    `flex h-11 w-full rounded-xl border bg-input/50 px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all ${hasError ? "border-destructive" : "border-border"}`

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Success overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="bg-card rounded-3xl p-10 flex flex-col items-center gap-4 shadow-2xl border border-border"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 18 }}
                className="h-20 w-20 rounded-full bg-success/15 flex items-center justify-center"
              >
                <CheckCircle2 className="h-10 w-10 text-success" />
              </motion.div>
              <p className="text-2xl font-display font-bold text-foreground">Check-In Complete</p>
              <p className="text-muted-foreground text-sm">Redirecting to overview…</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <h1 className="text-3xl font-display font-bold text-foreground">New Check-In</h1>
        <p className="text-muted-foreground mt-1">Register a new guest and record their payment.</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}>
        <Card className="border border-border/70 shadow-2xl shadow-black/30">
          <CardHeader className="bg-secondary/40 pb-6 border-b border-border/60">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <UserPlus className="h-5 w-5 text-primary" />
              Guest & Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              {/* Name + Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="guestName">Guest Full Name</Label>
                  <Input
                    id="guestName"
                    placeholder="e.g. Ramesh Kumar"
                    {...register("guestName")}
                    className={errors.guestName ? "border-destructive" : ""}
                  />
                  {errors.guestName && <p className="text-xs text-destructive">{errors.guestName.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">Mobile Number (India)</Label>
                  <div className="flex">
                    <span className="flex items-center px-3 rounded-l-xl border border-r-0 border-border bg-secondary text-muted-foreground text-sm font-medium select-none">
                      +91
                    </span>
                    <input
                      id="phone"
                      type="tel"
                      maxLength={10}
                      placeholder="9876543210"
                      {...register("phone")}
                      className={`${inputCls(!!errors.phone)} rounded-l-none border-l-0`}
                    />
                  </div>
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
                </div>
              </div>

              {/* Room + Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="roomNumber">Assign Room</Label>
                  <select
                    id="roomNumber"
                    {...register("roomNumber")}
                    className={`${inputCls(!!errors.roomNumber)} appearance-none cursor-pointer`}
                  >
                    <option value="">Select available room...</option>
                    {availableRooms.map(room => (
                      <option key={room.id} value={room.number}>{room.number}</option>
                    ))}
                  </select>
                  {errors.roomNumber && <p className="text-xs text-destructive">{errors.roomNumber.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label>Auto Check-In Time</Label>
                  <div className="flex h-11 w-full rounded-xl border border-border bg-secondary/50 px-4 items-center text-sm text-muted-foreground gap-2 cursor-not-allowed select-none">
                    <Clock className="h-4 w-4 shrink-0" />
                    {currentTime.toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              {/* Payment section */}
              <div className="rounded-xl border border-border/60 bg-secondary/20 p-4 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <IndianRupee className="h-3.5 w-3.5" />
                  Payment at Check-In
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="roomAmount">Total Room Amount (₹)</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <input
                        id="roomAmount"
                        type="number"
                        min="0"
                        placeholder="0"
                        {...register("roomAmount", { valueAsNumber: true })}
                        className={`${inputCls(!!errors.roomAmount)} pl-9`}
                      />
                    </div>
                    {errors.roomAmount && <p className="text-xs text-destructive">{errors.roomAmount.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="amountPaid">Amount Paid Now (₹)</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <input
                        id="amountPaid"
                        type="number"
                        min="0"
                        placeholder="0"
                        {...register("amountPaid", { valueAsNumber: true })}
                        className={`${inputCls(!!errors.amountPaid)} pl-9`}
                      />
                    </div>
                    {errors.amountPaid && <p className="text-xs text-destructive">{errors.amountPaid.message}</p>}
                  </div>
                </div>

                {/* Payment method selector */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" />
                    Payment Method
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {PAYMENT_METHODS.map(method => (
                      <motion.button
                        key={method}
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setValue("paymentMethod", method)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                          selectedPaymentMethod === method
                            ? "bg-primary text-primary-foreground border-primary shadow-md"
                            : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                        }`}
                      >
                        {PM_ICONS[method]} {method}
                      </motion.button>
                    ))}
                  </div>
                  {errors.paymentMethod && <p className="text-xs text-destructive">{errors.paymentMethod.message}</p>}
                </div>

                {/* Due amount display */}
                <motion.div
                  animate={{ backgroundColor: dueAmount > 0 ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)" }}
                  transition={{ duration: 0.4 }}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 border ${
                    dueAmount > 0 ? "border-destructive/30 text-destructive" : "border-success/30 text-success"
                  }`}
                >
                  <span className="text-sm font-semibold">
                    {dueAmount > 0 ? "Due Amount Remaining" : "Fully Paid ✓"}
                  </span>
                  <motion.span
                    key={dueAmount}
                    initial={{ scale: 1.15, opacity: 0.7 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-xl font-bold"
                  >
                    ₹{dueAmount.toLocaleString("en-IN")}
                  </motion.span>
                </motion.div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full text-base"
                  isLoading={createBooking.isPending}
                  disabled={availableRooms.length === 0}
                >
                  {availableRooms.length === 0 ? "No Rooms Available" : "Confirm Check-In"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
