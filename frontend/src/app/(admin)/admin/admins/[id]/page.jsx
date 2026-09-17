'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Mail, Phone, Briefcase, Building2, Calendar, Clock } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api'

export default function AdminDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    adminApi.getAdmin(id)
      .then(r => setAdmin(r.data?.data || r.data))
      .catch(err => toast.error(err.response?.data?.message || 'Failed to load admin'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="max-w-4xl mx-auto space-y-4">
      {[...Array(2)].map((_, i) => <div key={i} className="glass-card p-6 animate-pulse h-24" />)}
    </div>
  )

  if (!admin) return <div className="text-center py-20 text-gray-400">Admin not found</div>

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-start gap-4">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors flex-shrink-0 mt-1">
          <ArrowLeft size={16} />
        </button>
        <div className="glass-card p-5 flex-1 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-extrabold text-xl font-display">
              {admin.name[0].toUpperCase()}
            </div>
            <div>
              <h1 className="font-display text-xl font-extrabold text-gray-900 dark:text-white">{admin.name}</h1>
              <p className="text-sm text-gray-500">{admin.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${admin.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {admin.active ? 'Login Allowed' : 'Login Blocked'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-6 space-y-4">
        <h3 className="font-display font-bold text-gray-800 dark:text-white">Admin Info</h3>
        {[
          { icon: Mail, label: 'Email', value: admin.email },
          { icon: Phone, label: 'Phone', value: admin.phone || '—' },
          { icon: Briefcase, label: 'Designation', value: admin.designation || '—' },
          { icon: Building2, label: 'Department', value: admin.department || '—' },
          { icon: Calendar, label: 'Created', value: admin.createdAt ? format(new Date(admin.createdAt), 'dd MMM yyyy') : '—' },
          { icon: Clock, label: 'Last Login', value: admin.lastLoginAt ? format(new Date(admin.lastLoginAt), 'dd MMM yyyy, hh:mm a') : 'Never' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
              <Icon size={13} className="text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 break-all">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
