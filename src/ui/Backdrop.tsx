/** Fixed mesh-gradient background the glass surfaces blur over. */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="backdrop-orb bg-accent/35 dark:bg-accent/30 -top-32 -left-24 h-[28rem] w-[28rem]" />
      <div
        className="backdrop-orb bg-accent-soft/30 dark:bg-accent-soft/15 top-1/3 -right-32 h-[24rem] w-[24rem]"
        style={{ animationDelay: '-6s' }}
      />
      <div
        className="backdrop-orb -bottom-40 left-1/4 h-[22rem] w-[22rem] bg-sky-300/30 dark:bg-indigo-500/15"
        style={{ animationDelay: '-12s' }}
      />
    </div>
  )
}
