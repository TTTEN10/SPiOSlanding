interface SkeletonLoaderProps {
  className?: string;
  lines?: number;
  rounded?: boolean;
}

export default function SkeletonLoader({ 
  className = '', 
  lines = 1,
  rounded = false 
}: SkeletonLoaderProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-gray-200 dark:bg-gray-700 animate-pulse ${
            rounded ? 'rounded-full' : 'rounded'
          } ${
            i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'
          }`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

