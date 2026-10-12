import { Skeleton } from "@/components/ui";

/** Mostrado na hora em toda navegação: o toque responde antes de os dados chegarem. */
export default function Loading() {
  return (
    <div className="entrar mx-auto flex max-w-3xl flex-col gap-5" role="status" aria-label="Carregando">
      <div className="h-1 w-full overflow-hidden rounded-full bg-nevoa">
        <div className="h-full w-1/3 animate-[carregando_1s_ease-in-out_infinite] rounded-full bg-azul" />
      </div>
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-28 w-full rounded-lg" />
        <Skeleton className="h-28 w-full rounded-lg" />
      </div>
      <Skeleton className="h-40 w-full rounded-lg" />
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
