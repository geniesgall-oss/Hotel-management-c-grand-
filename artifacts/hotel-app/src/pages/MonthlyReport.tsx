import { useState } from "react"
import { useGetMonthlyReport, getGetMonthlyReportQueryKey } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import {
  BarChart3, IndianRupee, Calendar, TrendingUp,
  Banknote, Smartphone, CreditCard, ChevronLeft, ChevronRight,
} from "lucide-react"
import { format } from "date-fns"

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]

function StatCard({ label, value, icon: Icon, color, delay = 0 }: { label: string; value: string; icon: any; color: string; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.35 }}>
      <Card className="border border-border/60 shadow-lg bg-card overflow-hidden relative">
        <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl opacity-10 rounded-full ${color}`} />
        <CardContent className="p-5 flex items-center gap-4">
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${color.replace("bg-","bg-").replace("/60","/15")}`}>
            <Icon className={`h-6 w-6 ${color.replace("bg-","text-").replace("/60","")}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-display font-bold text-foreground mt-0.5">{value}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function PayBar({ label, amount, total, color, icon }: { label: string; amount: number; total: number; color: string; icon: string }) {
  const pct = total > 0 ? Math.round((amount / total) * 100) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <span>{icon}</span>{label}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">{pct}%</span>
          <span className="font-bold text-foreground">₹{amount.toLocaleString("en-IN")}</span>
        </div>
      </div>
      <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  )
}

export default function MonthlyReport() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { data: report, isLoading } = useGetMonthlyReport(
    { year, month },
    { query: { queryKey: getGetMonthlyReportQueryKey({ year, month }), enabled: true } }
  )

  const prev = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const next = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Monthly Report</h1>
          <p className="text-muted-foreground mt-1">Occupancy and revenue summary by month.</p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 bg-card border border-border rounded-2xl px-2 py-1.5 shadow-sm">
          <button onClick={prev} className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-secondary transition-colors">
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="text-center min-w-[140px]">
            <p className="text-sm font-display font-bold text-foreground">{MONTHS[month - 1]}</p>
            <p className="text-xs text-muted-foreground">{year}</p>
          </div>
          <button onClick={next} disabled={isCurrentMonth} className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-secondary transition-colors disabled:opacity-30">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-secondary rounded-2xl animate-pulse" />)}
        </div>
      ) : report ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Bookings" value={String(report.totalBookings)} icon={Calendar} color="bg-primary/60" delay={0} />
            <StatCard label="Total Revenue" value={`₹${report.totalRevenue.toLocaleString("en-IN")}`} icon={TrendingUp} color="bg-success/60" delay={0.06} />
            <StatCard label="Avg. per Booking" value={report.totalBookings > 0 ? `₹${Math.round(report.totalRevenue / report.totalBookings).toLocaleString("en-IN")}` : "—"} icon={IndianRupee} color="bg-blue-500/60" delay={0.12} />
            <StatCard label="Rooms Used" value={`${new Set(report.bookings.map(b => b.roomNumber)).size} / 12`} icon={BarChart3} color="bg-violet-500/60" delay={0.18} />
          </div>

          {/* Payment Breakdown */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}>
            <Card className="border border-border/60 shadow-lg bg-card">
              <CardHeader className="bg-secondary/40 border-b border-border/60 pb-4">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Banknote className="h-5 w-5 text-primary" />
                  Payment Method Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {report.totalRevenue === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">No transactions for this month.</p>
                ) : (
                  <>
                    <PayBar label="Cash" amount={report.cashTotal} total={report.totalRevenue} color="bg-emerald-500" icon="💵" />
                    <PayBar label="PhonePe" amount={report.phonePeTotal} total={report.totalRevenue} color="bg-violet-500" icon="📱" />
                    <PayBar label="GPay" amount={report.gPayTotal} total={report.totalRevenue} color="bg-blue-500" icon="📲" />
                    <PayBar label="Card" amount={report.cardTotal} total={report.totalRevenue} color="bg-amber-500" icon="💳" />
                    <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">Total Revenue</span>
                      <span className="text-xl font-display font-bold text-success">₹{report.totalRevenue.toLocaleString("en-IN")}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Bookings Table */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.4 }}>
            <Card className="overflow-hidden shadow-lg border-border/50 bg-card">
              <CardHeader className="bg-secondary/40 border-b border-border/60 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    All Bookings — {MONTHS[month - 1]} {year}
                  </CardTitle>
                  <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs px-3 py-1">
                    {report.totalBookings} records
                  </Badge>
                </div>
              </CardHeader>
              <div className="overflow-x-auto">
                {report.bookings.length === 0 ? (
                  <div className="px-6 py-16 text-center text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No bookings found for {MONTHS[month - 1]} {year}.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-secondary/60 border-b border-border">
                      <tr>
                        <th className="px-5 py-4 font-semibold">Guest</th>
                        <th className="px-5 py-4 font-semibold">Room</th>
                        <th className="px-5 py-4 font-semibold">Check-In</th>
                        <th className="px-5 py-4 font-semibold">Check-Out</th>
                        <th className="px-5 py-4 font-semibold">Payment</th>
                        <th className="px-5 py-4 font-semibold text-right"><span className="flex items-center justify-end gap-1"><IndianRupee className="h-3.5 w-3.5" />Total Paid</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {report.bookings.map((b, i) => (
                        <motion.tr key={b.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03, duration: 0.25 }}
                          className="hover:bg-secondary/20 transition-colors">
                          <td className="px-5 py-3.5 font-medium text-foreground whitespace-nowrap">
                            <div>{b.guestName}</div>
                            <div className="text-xs text-muted-foreground">{b.phone}</div>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <Badge variant="outline" className="bg-background text-foreground border-border">{b.roomNumber}</Badge>
                          </td>
                          <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap text-xs">{format(new Date(b.checkInTime), "dd MMM, HH:mm")}</td>
                          <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap text-xs">{format(new Date(b.checkOutTime), "dd MMM, HH:mm")}</td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1 text-xs">
                              <span>{b.paymentMethodAtCheckin}</span>
                              {b.duePaymentMethodAtCheckout !== b.paymentMethodAtCheckin && b.duePaymentMethodAtCheckout && (
                                <span className="text-muted-foreground">+ {b.duePaymentMethodAtCheckout}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <span className="font-bold text-success">₹{b.totalPaid.toLocaleString("en-IN")}</span>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-border bg-secondary/40">
                      <tr>
                        <td colSpan={5} className="px-5 py-3 text-sm font-bold text-foreground">Month Total</td>
                        <td className="px-5 py-3 text-right">
                          <span className="text-lg font-display font-bold text-success">₹{report.totalRevenue.toLocaleString("en-IN")}</span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </Card>
          </motion.div>
        </>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p>Select a month to view the report.</p>
        </div>
      )}
    </div>
  )
}
