export default function ComingSoon({ title }) {
  return (
    <div>
      <h1 className="text-xl font-bold text-navy-900">{title}</h1>
      <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
        This page is coming in the next step.
      </div>
    </div>
  )
}
