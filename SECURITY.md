# Política de segurança

## Como relatar uma falha

**Não abra uma issue pública.** Use o relato privado do GitHub:

1. Acesse a aba [**Security**](https://github.com/Danteifpa/zelador-digital/security) do repositório.
2. Clique em **Report a vulnerability** e descreva o problema, como reproduzir e o impacto.

Você receberá uma resposta em até 7 dias. Pedimos que não divulgue a falha antes de ela ser corrigida.

## O que está no escopo

- O app em [zeladordigital.vercel.app](https://zeladordigital.vercel.app).
- As regras de acesso, funções e migrações em [`supabase/`](supabase/).

## Observações

- As chaves presentes no código do app (Supabase *publishable* e chave pública VAPID) são **públicas por definição**. Relatos sobre elas só interessam se mostrarem acesso indevido a dados apesar das regras de acesso (RLS).
- Dados pessoais: o app não pede nome, CPF nem telefone do morador. Fotos e localizações enviadas ficam públicas no mapa comunitário.
