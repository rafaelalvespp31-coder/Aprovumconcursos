import { UploadPage } from "@/components/aprovum-ai/upload-page";

/** Galeria de desenvolvimento: estado visual da página de upload (sem login), cobrindo o shell da galeria. */
export default function Page() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, overflow: "auto", background: "#fff" }}>
      <UploadPage name="Rafael" dueReviews={3} hasPreps />
    </div>
  );
}
