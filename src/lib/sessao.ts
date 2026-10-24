/** Identificador anônimo do navegador (sem login). */
export function getSessaoId(): string {
  try {
    let id = localStorage.getItem("sessao_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("sessao_id", id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}
