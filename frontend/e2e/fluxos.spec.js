import { expect, test } from '@playwright/test'

// Cada teste registra num ponto diferente (dentro do "Bairro de Teste" do seed),
// para não cair no aviso de problema repetido a menos de 50 m.
async function abrirApp(page, ponto) {
  await page.context().setGeolocation(ponto)
  await page.addInitScript(() => {
    localStorage.setItem('zelador_onboarding_concluido', 'true')
    localStorage.setItem('zelador_onboarding_visto', '1')
  })
  await page.goto('/')
}

async function registrar(page, { tipo = /Lixo/, referencia }) {
  await page.getByText('Registrar Nova Ocorrência').click()
  await page.getByRole('button', { name: tipo }).first().click()
  await page.getByRole('button', { name: /^Continuar$/ }).click()
  await expect(page.getByText(/Fotografe o problema/)).toBeVisible()
  await page.getByRole('button', { name: /Continuar sem foto/ }).click()
  await expect(page.getByRole('button', { name: /Atualizar localização/ })).toBeVisible({ timeout: 15_000 })
  await page.getByLabel(/Ponto de referência/).fill(referencia)
  await page.getByRole('button', { name: /^Continuar$/ }).click()
  await page.getByRole('button', { name: /Enviar registro/ }).click()
  await expect(page.getByText('O seu protocolo')).toBeVisible({ timeout: 20_000 })
  return (await page.getByText(/^ZD-[0-9A-F]{6}$/).first().innerText()).trim()
}

test('morador registra um problema e recebe o protocolo', async ({ page }) => {
  await abrirApp(page, { latitude: -1.3655, longitude: -48.3955 })
  const protocolo = await registrar(page, { referencia: 'E2E registro' })
  expect(protocolo).toMatch(/^ZD-[0-9A-F]{6}$/)
})

test('transparência mostra o bairro do registro e baixa os dados abertos', async ({ page }) => {
  await abrirApp(page, { latitude: -1.3645, longitude: -48.3870 })
  await registrar(page, { tipo: /Alagamento/, referencia: 'E2E transparência' })
  await page.goto('/?aba=transparencia')
  await expect(page.getByText('Como está cada bairro de Ananindeua')).toBeVisible()
  await expect(page.getByText('Bairro de Teste')).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /Planilha \(CSV\)/ }).click()
  expect((await download).suggestedFilename()).toMatch(/dados-abertos.*\.csv$/)
})

test('morador denuncia um registro uma única vez', async ({ page }) => {
  await abrirApp(page, { latitude: -1.3665, longitude: -48.3825 })
  await registrar(page, { referencia: 'E2E denuncia' })
  await page.getByRole('button', { name: /^Acompanhar$/ }).click()
  await page.getByText('E2E denuncia').first().click()
  await page.getByRole('button', { name: /Denunciar foto ou registro/ }).click()
  await page.getByRole('button', { name: /Registro falso ou repetido/ }).click()
  await expect(page.getByText(/denúncia foi enviada/)).toBeVisible()
  await expect(page.getByText(/Você denunciou este registro/)).toBeVisible()
})

test('página de gestão pede login', async ({ page }) => {
  await abrirApp(page, { latitude: -1.3655, longitude: -48.3955 })
  await page.goto('/?aba=gestao')
  await expect(page.getByRole('heading', { name: 'Painel de Gestão' })).toBeVisible()
})

test('morador responde o questionário de usabilidade depois de registrar', async ({ page }) => {
  await abrirApp(page, { latitude: -1.3635, longitude: -48.3915 })
  await registrar(page, { referencia: 'E2E pesquisa' })
  await page.getByRole('button', { name: /^Responder$/ }).click()
  const grupos = page.locator('fieldset')
  await expect(grupos).toHaveCount(10)
  for (let i = 0; i < 10; i++) {
    await grupos.nth(i).getByRole('button', { name: i % 2 === 0 ? 'Concordo' : 'Discordo', exact: true }).click()
  }
  await page.getByRole('button', { name: 'Enviar respostas' }).click()
  await expect(page.getByText(/Obrigado! Sua resposta/)).toBeVisible()
})
