import { Skeleton } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="max-w-[1100px] mx-auto px-6 pt-36 pb-20">
      <Skeleton className="h-8 w-56 mb-3" />
      <Skeleton className="h-5 w-72 mb-10" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-[14px]" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-[14px]" />
      </div>
    </div>
  )
}
