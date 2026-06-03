import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function BrowseLoading() {
  return (
    <div className="max-w-[1100px] mx-auto px-6 pt-36 pb-20">
      <Skeleton className="h-10 w-72 mb-4" />
      <Skeleton className="h-5 w-96 mb-7" />
      <Skeleton className="h-14 w-full max-w-[560px] rounded-[14px] mb-8" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
