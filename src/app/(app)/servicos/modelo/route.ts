import { verificarSessao } from "@/lib/auth";
import { NOME_ARQUIVO_MODELO } from "@/lib/planilha/colunas";
import { gerarModelo } from "@/lib/planilha/modelo";

/**
 * Entrega o modelo de planilha para o usuário preencher.
 *
 * Route handlers não passam pelo layout do grupo `(app)`, então a sessão
 * precisa ser conferida aqui dentro — o guard da navegação não alcança esta
 * rota.
 */
export async function GET() {
  const sessao = await verificarSessao();
  if (!sessao) {
    return new Response("Não autorizado", { status: 401 });
  }

  const arquivo = await gerarModelo();

  return new Response(new Uint8Array(arquivo), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${NOME_ARQUIVO_MODELO}"`,
      "Content-Length": String(arquivo.byteLength),
      // O modelo muda junto com o código; nunca deve vir de cache antigo.
      "Cache-Control": "no-store",
    },
  });
}
