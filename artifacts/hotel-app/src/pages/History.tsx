import { useState } from "react"
import { useGetHistory, useDeleteHistory } from "@workspace/api-client-react"
import { useAuth } from "@/hooks/use-auth"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Trash2, History as HistoryIcon, Clock } from "lucide-react"
import { format } from "date-fns"

export default function History() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: historyRecords, isLoading } = useGetHistory()
  const deleteHistory = useDeleteHistory()
  
  const [recordToDelete, setRecordToDelete] = useState<number | null>(null)

  const isAdmin = user?.role === 'admin'

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
    return <div className="animate-pulse space-y-4 max-w-6xl mx-auto">
      <div className="h-10 w-48 bg-secondary rounded mb-8"></div>
      <div className="h-[400px] w-full bg-secondary rounded-2xl"></div>
    </div>
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">History Log</h1>
          <p className="text-muted-foreground mt-1">Past 2 months of check-out records.</p>
        </div>
        <Badge variant="secondary" className="px-4 py-2 gap-2 text-sm bg-primary/5 text-primary border border-primary/20">
          <Clock className="h-4 w-4" />
          Last 60 Days
        </Badge>
      </div>

      <Card className="overflow-hidden shadow-lg border-border/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-semibold">Guest</th>
                <th className="px-6 py-4 font-semibold">Contact</th>
                <th className="px-6 py-4 font-semibold">Room</th>
                <th className="px-6 py-4 font-semibold">Check-In</th>
                <th className="px-6 py-4 font-semibold">Check-Out</th>
                {isAdmin && <th className="px-6 py-4 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!historyRecords || historyRecords.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-6 py-12 text-center text-muted-foreground">
                    <HistoryIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No history records found for the last 2 months.</p>
                  </td>
                </tr>
              ) : (
                historyRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground whitespace-nowrap">
                      {record.guestName}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                      {record.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="outline" className="bg-background">
                        {record.roomNumber}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                      {format(new Date(record.checkInTime), "MMM d, yyyy HH:mm")}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                      {format(new Date(record.checkOutTime), "MMM d, yyyy HH:mm")}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-right whitespace-nowrap">
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

      <Dialog 
        open={!!recordToDelete} 
        onClose={() => setRecordToDelete(null)}
        title="Delete History Record"
        description="Are you sure you want to permanently delete this history record? This action cannot be undone."
      >
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setRecordToDelete(null)}>Cancel</Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            isLoading={deleteHistory.isPending}
          >
            Delete Record
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
