/** Estado devolvido pelas Server Actions usadas com `useActionState`. */
export type EstadoFormulario = {
  erro?: string;
  sucesso?: string;
  /** Erros por campo, para destacar o que precisa ser corrigido. */
  campos?: Record<string, string>;
};

export const ESTADO_INICIAL: EstadoFormulario = {};

/** Mensagem curta para o usuario a partir de um erro inesperado. */
export function falha(erro: unknown, padrao: string): EstadoFormulario {
  if (erro instanceof Error && erro.message) {
    return { erro: erro.message };
  }
  return { erro: padrao };
}
