const STEPS = [
  {
    number: '01',
    title: 'Dán bài viết gốc',
    description: 'Dán URL blog, bài viết dài hoặc text trực tiếp — bất kỳ nội dung nào bạn muốn tái sử dụng.',
  },
  {
    number: '02',
    title: 'AI tái chế thành nhiều bản nháp',
    description: 'Amplify đọc nội dung, áp dụng Brand Vault của bạn và tạo bản nháp phù hợp từng kênh (LinkedIn, Facebook, X, Threads, Instagram).',
  },
  {
    number: '03',
    title: 'Xem lại, chỉnh sửa và đăng',
    description: 'Xem lại từng bản nháp, chỉnh sửa trong workspace, copy hoặc lên lịch để Extension tự động đăng khi bạn muốn.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-app-bg px-4 py-12 md:px-8 md:py-20">
      <div className="mx-auto max-w-[1180px]">
        <h2 className="text-center font-serif text-3xl text-midnight-ink md:text-4xl">
          Cách Amplify hoạt động
        </h2>
        <p className="mx-auto mt-3 max-w-[640px] text-center text-sm leading-6 text-app-muted md:text-base">
          Ba bước đơn giản, không cần học công cụ mới.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.number} className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-blue text-pure-canvas font-serif text-xl">
                {step.number}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-midnight-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-app-muted">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}