export function LensMark({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="nslens-mark-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#A78BFA" />
          <stop offset=".55" stopColor="#7C3AED" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
        <radialGradient id="nslens-mark-glow" cx="20" cy="20" r="14" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" />
          <stop offset=".6" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="17" stroke="url(#nslens-mark-grad)" strokeWidth="2.4" fill="none" />
      <g stroke="url(#nslens-mark-grad)" strokeWidth="1.4" fill="url(#nslens-mark-grad)" fillOpacity=".25">
        <path d="M20 6 L26 14 L17 14 Z" />
        <path d="M34 20 L26 26 L26 17 Z" />
        <path d="M20 34 L14 26 L23 26 Z" />
        <path d="M6 20 L14 14 L14 23 Z" />
      </g>
      <circle cx="20" cy="20" r="5" fill="url(#nslens-mark-grad)" />
      <circle cx="20" cy="20" r="5" fill="url(#nslens-mark-glow)" />
      <circle cx="22.4" cy="17.6" r="1.2" fill="#fff" fillOpacity=".9" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <LensMark className="w-6 h-6" />
      <span>NS Lens</span>
    </span>
  );
}
