import { lazy } from 'react'

// React.lazy com recuperação para o caso comum depois de um deploy: o telemóvel tem a página
// antiga aberta e o ficheiro JS antigo já não existe no servidor. Recarrega a página uma vez
// para obter a versão nova; se voltar a falhar, deixa o erro chegar ao ErrorBoundary.
const CHAVE = 'zelador_recarga_por_chunk'

export default function lazyComRecarga(importar) {
  return lazy(async () => {
    try {
      const modulo = await importar()
      sessionStorage.removeItem(CHAVE)
      return modulo
    } catch (erro) {
      if (!sessionStorage.getItem(CHAVE)) {
        sessionStorage.setItem(CHAVE, '1')
        window.location.reload()
        return new Promise(() => {})
      }
      throw erro
    }
  })
}
