export const inp = "h-11 w-full rounded-xl border border-stone-300 bg-white px-3";
export const btn = "h-11 rounded-full bg-accent px-6 font-semibold text-white";

export function Campo({ rotulo, children, className = "" }: { rotulo: string; children: React.ReactNode; className?: string }) {
  return <label className={`block text-sm font-medium ${className}`}><span className="mb-1 block">{rotulo}</span>{children}</label>;
}
