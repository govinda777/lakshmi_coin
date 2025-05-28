# Pools

## Pools de Liquidez do Lakshmi Coin ($LUCK) na Zetachain

### **O que são pools de liquidez e como funcionam**

Pools de liquidez são reservas de dois ou mais ativos digitais (por exemplo, LUCK e ZETA) depositados em contratos inteligentes nas DEXs da Zetachain. Eles permitem que qualquer usuário troque LUCK por outros tokens de forma descentralizada, sem depender de intermediários. Os provedores de liquidez (LPs) depositam pares de tokens nesses pools e, em troca, recebem tokens de liquidez que representam sua participação e direito a uma fração das taxas geradas pelas negociações[3][4][6].

Na Zetachain, os pools de liquidez operam com o modelo Automated Market Maker (AMM), geralmente seguindo o padrão Uniswap V2, que utiliza a fórmula do produto constante para precificação dos ativos.

---

### **Como adicionar liquidez**

1. O usuário acessa a interface da DEX (ex: ZetaHub).
2. Seleciona o pool desejado (ex: LUCK/ZETA).
3. Deposita valores equivalentes de LUCK e ZETA no contrato inteligente do pool.
4. Recebe tokens de LP, que podem ser usados para resgatar sua parte do pool e as taxas acumuladas[4].

---

### **Cálculo da Cotação do LUCK**

A cotação do LUCK dentro do pool é determinada automaticamente pelo AMM, com base na proporção entre os dois ativos depositados. O modelo matemático mais comum é o produto constante:

$$
x \times y = k
$$

- $$x$$ = quantidade de LUCK no pool
- $$y$$ = quantidade de ZETA (ou outro token pareado) no pool
- $$k$$ = constante (produto das reservas)

Quando alguém faz uma troca (swap), o contrato ajusta as quantidades de cada ativo para manter $$k$$ constante. O preço do LUCK em relação ao outro token é dado pela razão entre as reservas:

$$
\text{Preço do LUCK} = \frac{y}{x}
$$

Assim, se há mais compras de LUCK, sua reserva diminui e seu preço sobe; se há mais vendas, o preço cai[3][5][6].

---

### **Automação e Finalidade dos Pools**

- **Liquidez Inicial:** Uma parte do suprimento do LUCK é destinada e bloqueada nos principais pools de liquidez, garantindo estabilidade e volume para negociações[1].
- **Recompensas:** Os LPs recebem parte das taxas de transação do pool proporcionalmente à sua participação.
- **Gestão Descentralizada:** A adição, retirada e movimentação de liquidez são todas geridas por contratos inteligentes, sem intervenção manual.
- **Transparência:** Todas as operações podem ser auditadas publicamente na blockchain.

---

### **Resumo Visual do Fluxo**

```
Usuário ↔ DEX (ZetaHub) ↔ Pool de Liquidez (LUCK/ZETA)
          |                         |
          |--- Swap de tokens ------|
          |--- Depósito/Resgate ---|
```

---

### **Benefícios dos Pools de Liquidez**

- Facilita negociações rápidas e sem intermediários.
- Garante cotação justa e dinâmica via AMM.
- Gera renda passiva para provedores de liquidez.
- Suporta estratégias DeFi como yield farming e staking[3][4][6].

---

## Taxa de Conversão de ZETA para USDT e BTC

Para operações envolvendo o Lakshmi Coin ($LUCK) em pools de liquidez na Zetachain, a cotação do token é frequentemente referenciada em ZETA, o token nativo da rede. Para facilitar a compreensão do valor real de $LUCK, é fundamental acompanhar as taxas de conversão de ZETA para stablecoins (como USDT) e para Bitcoin (BTC).

---

### **Taxa de Conversão ZETA ↔ USDT**

- **1 ZETA ≈ 0,27 USDT**  
  Exemplo de conversão:
  - 5 ZETA ≈ 1,36 USDT
  - 10 ZETA ≈ 2,72 USDT
  - 100 ZETA ≈ 27,2 USDT
- **1 USDT ≈ 3,68 ZETA**  
  Exemplo de conversão:
  - 10 USDT ≈ 36,76 ZETA
  - 100 USDT ≈ 367,58 ZETA[1]

---

### **Taxa de Conversão ZETA ↔ BTC**

- **1 ZETA ≈ 0,000002413 BTC**  
  Exemplo de conversão:
  - 10 ZETA ≈ 0,00002413 BTC
  - 100 ZETA ≈ 0,0002413 BTC
  - 1000 ZETA ≈ 0,002413 BTC
- **1 BTC ≈ 414.392 ZETA**  
  Exemplo de conversão:
  - 0,1 BTC ≈ 41.439 ZETA
  - 0,01 BTC ≈ 4.144 ZETA[2]

---

### **Taxa de Conversão ZETA ↔ USD (referência adicional)**

- **1 ZETA ≈ $0,2563 USD**  
  - 10 ZETA ≈ $2,56 USD
  - 100 ZETA ≈ $25,63 USD[3]

---

### **Como isso impacta os pools de liquidez do $LUCK**

- A cotação do $LUCK em USDT ou BTC depende do pool LUCK/ZETA e das taxas de conversão de ZETA para USDT ou BTC.
- Para saber o valor do $LUCK em USDT ou BTC, basta multiplicar a cotação do LUCK em ZETA pela taxa de conversão correspondente.
- Exemplo:  
  Se 1 LUCK = 2 ZETA e 1 ZETA = 0,27 USDT, então 1 LUCK ≈ 0,54 USDT.

---

**Observação:**  
As taxas de conversão são dinâmicas e podem variar conforme o mercado. Recomenda-se sempre consultar fontes confiáveis e atualizadas antes de realizar operações financeiras com $LUCK, ZETA, USDT ou BTC[1][2][3].

**Referências:**  
- [ZetaChain Docs: Liquidity Pools][2][4]  
- [Mitrade: Pools de Liquidez][3]  
- [Bitybank: Pools de Liquidez][6]  
- [CoinDesk: O que são pools de liquidez][5]

Citations:
[1] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/collection_1c759f64-a08a-4864-8124-28f8d1539a42/ec3393e2-2ac8-4e39-924a-388d26c3151d/Alocao-doSuprimento.csv
[2] https://www.zetachain.com/docs/about/token-utility/liquidity/
[3] https://www.mitrade.com/pt/insights/cripto/tutorial/o-que-sao-pools-de-liquidez-e-como-utilizar
[4] https://www.zetachain.com/docs/users/zetahub/pool/
[5] https://www.coindesk.com/pt-br/learn/what-are-liquidity-pools
[6] https://www.bity.com.br/blog/pools-de-liquidez-o-que-sao/
[7] https://www.mb.com.br/economia-digital/criptomoedas/o-que-e-zetachain-zeta/
[8] https://coinmarketcap.com/currencies/zetachain/
[9] https://portaldobitcoin.uol.com.br/mercado-bitcoin-lista-token-zeta/
[10] https://br.cointelegraph.com/news/cryptocurrency-for-free-binance-to-give-away-588-000-000-bitcoin-staking-protocol-tokens
[11] https://forbes.com.br/forbes-money/2024/11/a-maquina-selvagem-de-dinheiro-que-alimenta-a-bolha-mais-absurda-do-mundo-cripto/
[1] https://www.kraken.com/convert/zeta/usdt
[2] https://coinmarketcap.com/currencies/zetachain/zeta/btc/
[3] https://www.coingecko.com/en/coins/zetachain/usd
[4] https://www.coinbase.com/en-br/converter/zeta/usdt
[5] https://coinmarketcap.com/currencies/zetachain/
[6] https://cex.io/convert/zeta-usdt?amount=100
[7] https://www.binance.com/en/price/zetachain
[8] https://www.coingecko.com/en/coins/zetachain/btc
[9] https://www.coinbase.com/en-fr/converter/ZETA/USD
[10] https://cex.io/convert/zeta-usd?amount=20%2C000
