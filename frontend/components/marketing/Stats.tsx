const STATS = [
  { value: '4+', label: 'bản nháp / 1 bài viết' },
  { value: '<60s', label: 'thời gian tạo trung bình' },
  { value: '100%', label: 'giọng văn thương hiệu nhất quán' },
]

export function Stats() {
  return (
    <section id="stats" className="bg-midnight-ink px-4 py-12 md:px-8 md:py-16">
      <div className="mx-auto max-w-[1180px]">
        <div className="grid gap-8 text-center md:grid-cols-3">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <p className="font-serif text-5xl text-pure-canvas md:text-6xl">{stat.value}</p>
              <p className="mt-3 text-sm leading-6 text-pure-canvas/70 md:text-base">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}