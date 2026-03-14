import { useState } from "react"
import { useGetHistory, useDeleteHistory } from "@workspace/api-client-react"
import { useAuth } from "@/hooks/use-auth"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Trash2, History as HistoryIcon, Clock, IndianRupee } from "lucide-react"
import { format } from "date-fns"

export default function History() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: historyRecords, isLoading } = useGetHistory()
  const deleteHistory = useDeleteHistory()

  const [recordToDelete, setRecordToDelete] = useState<number | null>(null)
  const isAdmin = user?.role === "admin"

  const handleDelete = async () => {
    if (!recordToDelete) return
    try {
      await deleteHistory.mutateAsync({ id: recordToDelete })
      toast.success("Record deleted permanently")
      queryClient.invalidateQueries({ queryKey: ["/api/history"] })
      setRecordToDelete(null)
    } catch (error: any) {
      toast.error(error.message || "Failed to delete record")
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 max-w-6xl mx-auto">
        <div className="h-10 w-48 bg-secondary rounded mb-8"></div>
        <div className="h-[400px] w-full bg-secondary rounded-2xl"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">History Log</h1>
          <p className="text-muted-foreground mt-1">Past 2 months of check-out records.</p>
        </div>
        <Badge className="px-4 py-2 gap-2 text-sm bg-primary/10 text-primary border border-primary/20">
          <Clock className="h-4 w-4" />
          Last 60 Days
        </Badge>
      </div>

      <Card className="overflow-hidden shadow-lg border-border/50 bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/60 border-b border-border">
              <tr>
                <th className="px-5 py-4 font-semibold">Guest</th>
                <th className="px-5 py-4 font-semibold">Contact</th>
                <th className="px-5 py-4 font-semibold">Room</th>
                <th className="px-5 py-4 font-semibold">Check-In</th>
                <th className="px-5 py-4 font-semibold">Check-Out</th>
                <th className="px-5 py-4 font-semibold">
                  <span className="flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5" />Amount</span>
                </th>
                <th className="px-5 py-4 font-semibold">Paid at Check-In</th>
                <th className="px-5 py-4 font-semibold">Paid at Check-Out</th>
                <th className="px-5 py-4 font-semibold text-success">Total Paid</th>
                {isAdmin && <th className="px-5 py-4 font-semibold text-right">Del</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!historyRecords || historyRecords.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 10 : 9} className="px-6 py-16 text-center text-muted-foreground">
                    <HistoryIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No history records for the last 2 months.</p>
                  </td>
                </tr>
              ) : (
                historyRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-5 py-4 font-medium text-foreground whitespace-nowrap">{record.guestName}</td>
                    <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">{record.phone}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <Badge variant="outline" className="bg-background text-foreground border-border">{record.roomNumber}</Badge>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground whitespace-nowrap text-xs">
                      {format(new Date(record.checkInTime), "MMM d, yyyy HH:mm")}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground whitespace-nowrap text-xs">
                      {format(new Date(record.checkOutTime), "MMM d, yyyy HH:mm")}
                    </td>
                    <td className="px-5 py-4 font-semibold text-foreground whitespace-nowrap">
                      ₹{record.roomAmount?.toLocaleString("en-IN")}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-foreground font-medium">₹{record.amountPaidAtCheckin?.toLocaleString("en-IN")}</p>
                        <p className="text-xs text-muted-foreground">{record.paymentMethodAtCheckin}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-foreground font-medium">₹{record.dueAmountPaidAtCheckout?.toLocaleString("en-IN")}</p>
                        <p className="text-xs text-muted-foreground">{record.duePaymentMethodAtCheckout}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-success font-bold">₹{record.totalPaid?.toLocaleString("en-IN")}</span>
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setRecordToDelete(record.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Delete confirmation */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setRecordToDelete(null)} />
          <div className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-xl font-display font-bold text-foreground">Delete Record</h2>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to permanently delete this history record? This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setRecordToDelete(null)}>Cancel</Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDelete}
                isLoading={deleteHistory.isPending}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
