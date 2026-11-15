// Conteúdo do mini tutorial "Como usar o Zelador Digital".
// Linguagem simples, frases curtas, pensado para ser lido em voz alta no Modo Fácil.

export const PASSOS_COMO_USAR = [
  {
    id: 'registrar',
    titulo: 'Viu um problema na rua? Registre',
    resumo: 'Toque no botão azul grande "Registrar Nova Ocorrência" e escolha o tipo: lixo, poste apagado, buraco, esgoto, alagamento, árvore, calçada ou sinalização.',
    dica: 'Leva menos de um minuto e não precisa de cadastro.',
    icone: '📍',
    cor: 'from-blue-600 to-blue-500',
    acao: { rotulo: 'Registrar agora', destino: 'registrar' }
  },
  {
    id: 'foto',
    titulo: 'Tire uma foto do problema',
    resumo: 'Fotografe o problema, não pessoas nem placas de carro. O app borra rostos sozinho e você pode borrar outras partes com o botão "Borrar área".',
    dica: 'A foto fica pública no mapa, por isso o cuidado.',
    icone: '📷',
    cor: 'from-amber-500 to-orange-500'
  },
  {
    id: 'local',
    titulo: 'Confirme o local',
    resumo: 'O app pega sua localização pelo GPS. Se precisar, ajuste o ponto no mapa e escreva uma referência, como "em frente à padaria".',
    dica: 'O bairro é preenchido automaticamente.',
    icone: '🗺️',
    cor: 'from-emerald-500 to-teal-500'
  },
  {
    id: 'protocolo',
    titulo: 'Guarde o seu protocolo',
    resumo: 'Ao enviar, você recebe um código como ZD-1A2B3C. Com ele você acompanha o andamento em "Consultar", na tela inicial.',
    dica: 'Ative os avisos para receber uma notificação quando o status mudar.',
    icone: '🧾',
    cor: 'from-indigo-500 to-violet-500',
    acao: { rotulo: 'Consultar um protocolo', destino: 'consultar' }
  },
  {
    id: 'offline',
    titulo: 'Sem internet? Funciona mesmo assim',
    resumo: 'O registro fica guardado no celular e é enviado sozinho quando a internet voltar. O protocolo já vale na hora.',
    dica: 'Instale o app na tela inicial para abrir mais rápido.',
    icone: '📶',
    cor: 'from-slate-700 to-slate-500'
  },
  {
    id: 'apoiar',
    titulo: 'Já tem um registro parecido? Apoie',
    resumo: 'Antes de registrar de novo, veja em "Registros" ou no mapa. Se o problema já está lá, toque em "Também vi este problema". Quanto mais apoios, mais prioridade.',
    dica: 'Registros repetidos atrapalham, apoios ajudam.',
    icone: '👥',
    cor: 'from-sky-500 to-blue-500',
    acao: { rotulo: 'Ver registros', destino: 'registos' }
  },
  {
    id: 'denunciar',
    titulo: 'Viu uma foto imprópria? Denuncie',
    resumo: 'Abra o registro e toque em "Denunciar foto ou registro". Com 3 denúncias a foto some até a gestão revisar.',
    dica: 'Cada celular denuncia uma vez por registro.',
    icone: '🚩',
    cor: 'from-rose-500 to-red-500'
  },
  {
    id: 'transparencia',
    titulo: 'Acompanhe o seu bairro',
    resumo: 'Em "Transparência por bairro" você vê quantos problemas estão em aberto, quantos foram resolvidos e em quanto tempo. Dá para baixar todos os dados.',
    dica: 'Use esses números para cobrar melhorias.',
    icone: '🏛️',
    cor: 'from-slate-900 to-slate-700',
    acao: { rotulo: 'Abrir transparência', destino: 'transparencia' }
  },
  {
    id: 'facil',
    titulo: 'Modo Fácil: letras grandes e voz',
    resumo: 'Toque no ícone de acessibilidade no topo da tela. Os botões ficam maiores, o contraste aumenta e o app lê os passos em voz alta.',
    dica: 'Bom para quem tem dificuldade de enxergar ou de ler.',
    icone: '🔊',
    cor: 'from-fuchsia-500 to-pink-500'
  }
]

/** Texto completo de um passo, para a leitura em voz alta. */
export const textoDoPasso = (passo, indice) => `Passo ${indice + 1}. ${passo.titulo}. ${passo.resumo} ${passo.dica}`
