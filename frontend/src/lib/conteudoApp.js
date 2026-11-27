// Textos fixos do app: passos da apresentação inicial e "Novidades do app".

import { MARCA } from './marca'

export const ETAPAS_ONBOARDING = [
  {
    titulo: 'Voz Ativa no Seu Bairro',
    descricao: `O ${MARCA.nome} é uma plataforma ${MARCA.prefeitura ? `da ${MARCA.prefeitura}` : 'comunitária independente'} para identificar, documentar e transformar a zeladoria urbana.`,
    icone: '🏙️',
    gradiente: 'bg-placa'
  },
  {
    titulo: 'Registro Rápido & Georreferenciado',
    descricao: 'Tire uma fotografia em campo e deixe que o satélite GPS marque com precisão o ponto exato da ocorrência territorial.',
    icone: '📸',
    gradiente: 'bg-placa-escura'
  },
  {
    titulo: 'Transparência & Acompanhamento',
    descricao: 'Consulte os dados no mapa térmico e siga a linha do tempo desde o envio até a intervenção concluída.',
    icone: '🗺️',
    gradiente: 'bg-mangueira'
  }
]

// Novidades do app (reais e datadas). Avisos da gestão para o bairro ainda não existem:
// quando existirem, devem vir do banco, não deste arquivo.
export const NOTIFICACOES_PADRAO = [
  {
    id: 'v1.1-tambem-vi',
    titulo: 'Novo: "Também vi este problema"',
    mensagem: 'Viu um problema que alguém já registrou? Abra o chamado e confirme. Problemas com mais confirmações sobem na prioridade da gestão.',
    tipo: 'novidade',
    icone: '👥',
    data: '11/11/2026'
  },
  {
    id: 'v1.1-segundo-plano',
    titulo: 'Registros sem internet chegam sozinhos',
    mensagem: 'No Android, o que você registrar sem sinal é enviado quando a internet voltar, mesmo com o app fechado.',
    tipo: 'novidade',
    icone: '📶',
    data: '11/11/2026'
  },
  {
    id: 'v1.0-avisos',
    titulo: 'Acompanhe seu protocolo',
    mensagem: 'Depois de registrar, toque em "Ativar avisos" para receber uma notificação quando o status do seu chamado mudar.',
    tipo: 'novidade',
    icone: '🔔',
    data: '10/11/2026'
  }
]
