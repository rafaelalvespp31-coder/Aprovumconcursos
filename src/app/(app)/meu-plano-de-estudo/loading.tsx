export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse" role="status" aria-label="Carregando">
      <div className="h-32 rounded-2xl bg-[#08090B]/90" />
      <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-7">{Array.from({ length: 14 }, (_, i) => <div key={i} className="h-[136px] rounded-xl border border-[#E4E4E7] bg-white" />)}</div>
    </div>
  );
}
