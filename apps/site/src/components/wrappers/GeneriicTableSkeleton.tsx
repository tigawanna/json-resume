interface GeneriicTableSkeletonProps {
  columns?: number;
  rows?: number;
}
export function GeneriicTableSkeleton({ rows, columns }: GeneriicTableSkeletonProps) {
  const data = Array.from({ length: rows ?? 12 });
  return (
    <div className="min-h-screen w-full overflow-auto">
      <div className="bg-base-300 sticky top-0 h-12 p-2" />
      <ul className="flex h-full w-full flex-col gap-2 p-2">
        {data?.map((_, idx) => {
          return (
            <li key={idx} className="flex min-h-8 w-full gap-1 rounded-none">
              {Array.from({ length: columns ?? 4 }).map((_, idx) => {
                return <div key={idx} className="skeleton bg-base-300 w-full rounded-none p-1" />;
              })}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
