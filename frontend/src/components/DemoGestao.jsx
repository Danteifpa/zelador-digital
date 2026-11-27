import { useMemo, useState } from 'react'
import PainelGestor from './PainelGestor'
import { aplicarAlteracaoDemo, gerarChamadosDemo } from '../lib/demo'

/**
 * Painel de Gestão em modo demonstração: chamados fictícios, sem login.
 * Todas as alterações ficam só na memória desta aba e somem ao sair ou recarregar.
 */
export default function DemoGestao({ onSair }) {
  const [chamados, setChamados] = useState(() => gerarChamadosDemo())
  const demo = useMemo(() => ({
    atualizar: (id, campos) => setChamados((lista) => aplicarAlteracaoDemo(lista, id, campos)),
    excluir: (id) => setChamados((lista) => lista.filter((item) => item.id !== id)),
    sair: onSair
  }), [onSair])

  return <PainelGestor ocorrencias={chamados} demo={demo} />
}
