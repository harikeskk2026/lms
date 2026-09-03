'use client'
import { useAuth } from '@/context/AuthContext'
import SuperAdminDashboard from '@/components/admin/dashboard/SuperAdminDashboard'
import AdminDashboardView from '@/components/admin/dashboard/AdminDashboardView'
import TrainerDashboardView from '@/components/admin/dashboard/TrainerDashboardView'
import { SkeletonStat } from '@/components/student/SkeletonCard'

export default function DashboardPage() {
  const { user, loading } = useAuth()

  if (loading || !user) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="h-32 bg-purple-900/20 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonStat key={i} />)}
        </div>
      </div>
    )
  }

  if (user.role === 'SUPERADMIN') {
    return <SuperAdminDashboard />
  }

  if (user.role === 'TRAINER') {
    return <TrainerDashboardView />
  }

  // Default to ADMIN view for ADMIN or other administrative roles
  return <AdminDashboardView />
}
