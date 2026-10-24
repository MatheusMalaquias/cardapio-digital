"use client";
export function ImprimirBtn() {
  return <button type="button" onClick={() => window.print()} className="h-11 rounded-full border border-stone-400 px-5 font-semibold print:hidden">Imprimir QR codes</button>;
}
