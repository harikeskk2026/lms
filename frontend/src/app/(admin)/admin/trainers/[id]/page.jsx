'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, Briefcase, Building2, Calendar, Clock } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api'

export default function TrainerDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [trainer, setTrainer] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    adminApi.getTrainerDetail(id)
      .then(r => setTrainer(r.data?.data || r.data))
      .catch(err => toast.error(err.response?.data?.message || 'Failed to load trainer'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="max-w-4xl mx-auto space-y-4">
      {[...Array(2)].map((_, i) => <div key={i} className="glass-card p-6 animate-pulse h-24" />)}
    </div>
  )

  if (!trainer) return <div className="text-center py-20 text-gray-400">Trainer not found</div>

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
              {trainer.name[0].toUpperCase()}
            </div>
            <div>
              <h1 className="font-display text-xl font-extrabold text-gray-900 dark:text-white">{trainer.name}</h1>
              <p className="text-sm text-gray-500">{trainer.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${trainer.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {trainer.active ? 'Login Allowed' : 'Login Blocked'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-display font-bold text-gray-800 dark:text-white">Trainer Info</h3>
          {[
            { icon: Mail, label: 'Email', value: trainer.email },
            { icon: Phone, label: 'Phone', value: trainer.phone || '—' },
            { icon: Briefcase, label: 'Designation', value: trainer.designation || '—' },
            { icon: Building2, label: 'Department', value: trainer.department || '—' },
            { icon: Calendar, label: 'Created', value: trainer.createdAt ? format(new Date(trainer.createdAt), 'dd MMM yyyy') : '—' },
            { icon: Clock, label: 'Last Login', value: trainer.lastLoginAt ? format(new Date(trainer.lastLoginAt), 'dd MMM yyyy, hh:mm a') : 'Never' },
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

        <div className="glass-card p-5">
          <h3 className="font-display font-bold text-gray-800 dark:text-white mb-3">
            Assigned Batches {trainer.batches && trainer.batches.length > 0 ? `(${trainer.batches.length})` : ''}
          </h3>
          {trainer.batches && trainer.batches.length > 0 ? (
            <div className="space-y-4 divide-y divide-gray-100 dark:divide-gray-800">
              {trainer.batches.map(b => (
                <Link key={b.id} href={`/admin/batches/${b.id}`} className="block space-y-1 pt-2 first:pt-0 hover:opacity-80">
                  <p className="font-semibold text-gray-800 dark:text-white">{b.name}</p>
                  <p className="text-sm text-gray-500">{b.courseTitle || '—'}</p>
                  <p className="text-xs text-gray-400">{b.timing || 'No time set'} · {b.mode || '—'}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No batches assigned</p>
          )}
        </div>
      </div>
    </div>
  )
}
