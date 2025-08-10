# Regras Invioláveis para a Construção do "Universal Asset Studio"

Este documento define as regras não negociáveis que o agente de IA DEVE seguir para construir este projeto. O objetivo é eliminar falhas de comunicação e configuração, garantindo entregas funcionais e incrementais. A violação destas regras invalida o trabalho.

## 1. A Diretiva do Prompt é Absoluta e Sequencial

- **NÃO HÁ DESVIOS:** Você deve seguir as Fases (0, 1, 2, 3) e os Pilares descritos no prompt na ORDEM EXATA.
- **NÃO HÁ ADIANTAMENTOS:** Você não deve iniciar NENHUM trabalho de uma fase subsequente (ex: Lógica do "Mapeador de Cores" da Fase 2) até que o "Contrato de Sucesso" da fase atual esteja 100% cumprido e visualmente verificado.

## 2. Princípio da Verificação Visual e do "Contrato de Sucesso"

- **PROVE, NÃO APENAS AFIRME:** Você não deve NUNCA declarar uma fase como "concluída" ou "bem-sucedida" sem descrever o resultado VISUAL que comprova o sucesso.
- **EXEMPLO DE RELATÓRIO CORRETO:** "Fase 1 completa. **Prova Visual:** Ao carregar 'Sonic.bin', a galeria na aba 'Editor de Sprites' agora exibe 64 imagens `ImageData`, mostrando claramente os sprites do Sonic, anéis e Badniks com cores corretas."
- **EXEMPLO DE RELATÓRIO INCORRETO (PROIBIDO):** "Fase 1 completa. A lógica de decodificação foi implementada."

## 3. Arquitetura de "Confiança Zero" e Autossuficiência

- **ZERO DEPENDÊNCIAS DE CDN:** Todas as dependências de JavaScript (como `loader.js`, `emulator.js`) e binários (`.wasm`) DEVEM ser baixadas e servidas localmente a partir da pasta `/public` do projeto. O uso de `importScripts` ou `fetch` para um CDN externo (como cdn.jsdelivr.net) é estritamente proibido.
- **LOGGING VISÍVEL OBRIGATÓRIO:** A primeira coisa a ser implementada na UI é um painel de log visível. TODA a comunicação com o Web Worker (envio de mensagens, recebimento de status, erros) DEVE ser registrada neste painel em tempo real.
- **MANIPULAÇÃO DE ERROS EXPLÍCITA:** Todo ponto de falha potencial deve ser tratado.
    - A instanciação do Web Worker na UI DEVE ter um manipulador `.onerror` anexado imediatamente após a criação.
    - Todas as operações assíncronas dentro do worker (carregamento de scripts, execução do emulador) DEVEM estar dentro de um bloco `try...catch` que envia uma mensagem de erro (`status: 'error'`) para a UI em caso de falha.

## 4. Código Comentado e Justificado

- **COMENTE O "PORQUÊ":** Antes de cada bloco de código significativo (uma função, uma classe, um hook do React), você deve adicionar um comentário explicando QUAL parte do prompt aquele código está implementando.
- **EXEMPLO:** `// Implementando o Pilar 1.2: MegaDrivePaletteDecoder.ts. Esta função estática 'decode' converte a CRAM bruta (Uint8Array) para um array de paletas de cores CSS.`

## 5. Honestidade sobre Dados Técnicos

- **NÃO ALUCINE PONTEIROS DE MEMÓRIA:** Para a Fase 3 (Expansão do Universo), ao adicionar um novo sistema, você deve declarar explicitamente de qual fonte documental está extraindo os ponteiros de memória (ex: `_vramStart`, `_oamStart`) para esse sistema. Se não tiver a informação, deve declarar que precisa do documento de referência.