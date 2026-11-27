// Marca do app: nome, cidade e categorias. Cada prefeitura pode ter a sua versão
// só mudando variáveis de ambiente no deploy (sem mexer no código):
//
//   VITE_MARCA_NOME        nome do app (ex.: "Zela Marituba")
//   VITE_MARCA_NOME_CURTO  nome no ícone do celular (até ~12 letras)
//   VITE_MARCA_CIDADE      cidade (ex.: "Marituba")
//   VITE_MARCA_UF          estado (ex.: "PA")
//   VITE_MARCA_PREFEITURA  quem opera, se for oficial (ex.: "Prefeitura de Marituba");
//                          vazio = versão comunitária independente
//   VITE_MARCA_CENTRO      "latitude,longitude" do centro da cidade
//   VITE_MARCA_RAIO_KM     raio aceito para registros, em km
//   VITE_CATEGORIAS        ids ativos, separados por vírgula (vazio = todas)
//
// Este arquivo também é lido pelo vite.config.js para gerar o manifest e o index.html.

export const MARCA_PADRAO = {
  nome: 'Bora Zelar',
  nomeCurto: 'Bora Zelar',
  cidade: 'Ananindeua',
  uf: 'PA',
  prefeitura: '',
  latitude: -1.365,
  longitude: -48.375,
  raioKm: 18,
  categorias: []
}

const texto = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null)

/** Monta a marca a partir das variáveis de ambiente, com os valores padrão. */
export function marcaDe(env = {}) {
  const [lat, lng] = String(env.VITE_MARCA_CENTRO || '').split(',').map((v) => Number(v.trim()))
  const raio = Number(env.VITE_MARCA_RAIO_KM)
  const centroValido = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && String(env.VITE_MARCA_CENTRO || '').includes(',')
  const nome = texto(env.VITE_MARCA_NOME) || MARCA_PADRAO.nome
  return {
    nome,
    nomeCurto: texto(env.VITE_MARCA_NOME_CURTO) || (texto(env.VITE_MARCA_NOME) ? nome.split(' ')[0] : MARCA_PADRAO.nomeCurto),
    cidade: texto(env.VITE_MARCA_CIDADE) || MARCA_PADRAO.cidade,
    uf: texto(env.VITE_MARCA_UF) || MARCA_PADRAO.uf,
    prefeitura: texto(env.VITE_MARCA_PREFEITURA) || MARCA_PADRAO.prefeitura,
    latitude: centroValido ? lat : MARCA_PADRAO.latitude,
    longitude: centroValido ? lng : MARCA_PADRAO.longitude,
    raioKm: Number.isFinite(raio) && raio > 0 ? raio : MARCA_PADRAO.raioKm,
    categorias: String(env.VITE_CATEGORIAS || '').split(',').map((c) => c.trim().toLowerCase()).filter(Boolean)
  }
}

export const MARCA = marcaDe((typeof import.meta !== 'undefined' && import.meta.env) || {})

/** "Ananindeua - PA" */
export const cidadeUf = (marca = MARCA) => `${marca.cidade} - ${marca.uf}`
