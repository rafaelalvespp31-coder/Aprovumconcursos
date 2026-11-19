import { notFound } from "next/navigation";
import { ImportadorDemo } from "./demo";

export default function Page() {
  if (process.env.NODE_ENV === "production" && !process.env.GALERIA) notFound();
  return <ImportadorDemo />;
}
