// Simple mark: a filled circle with an orbit line. Uses currentColor so it works on any background.
export function Mark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="2" />
      <ellipse cx="16" cy="16" rx="15" ry="6" stroke="currentColor" strokeWidth="2" transform="rotate(-28 16 16)" />
      <circle cx="16" cy="16" r="4.5" fill="currentColor" />
    </svg>
  )
}

export default function Logo({ size = 'md' }) {
  const big = size === 'lg'
  return (
    <div className="flex items-center gap-2.5">
      <Mark size={big ? 40 : 26} />
      <span className={`font-display font-semibold ${big ? 'text-3xl' : 'text-lg'}`}>WorkSphere</span>
    </div>
  )
}
