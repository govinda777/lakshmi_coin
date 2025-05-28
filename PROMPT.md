# Prompt para Desenvolvimento do Projeto Lakshmi DAO na ZetaChain  

**Instruções para a AI:**  
Crie uma especificação técnica completa para o projeto Lakshmi DAO integrado à ZetaChain, considerando os seguintes requisitos:  

## 1. Arquitetura Multichain  
- Implementar contratos omnichain usando **ZetaChain Protocol Contracts** (GatewayZEVM/ZRC20) [6][9]  
- Habilitar interações nativas com Bitcoin via **TSS e ZetaConnector** [14][16]  
- Integrar mecanismos de staking cross-chain usando **SystemContract** para gerenciamento de liquidez [16]  

## 2. Módulos Principais  
### 2.1 Smart Contracts  
- **LakshmiZRC20**: Token filantrópico com taxas automáticas para causas sociais (5% por transação) [2][5]  
- **DonationVault**: Contrato para distribuição automática de doações via Chainlink Oracles [7]  
- **GovernanceDAO**: Mecanismo de votação quadrática usando ZetaChain's **FUNGIBLE_MODULE_ADDRESS** [16]  

### 2.2 Frontend  
- Interface React com **RainbowKit + UniversalKit** para conexão multichain [8][13]  
- Dashboard de impacto social com visualização de doações em tempo real  
- Integração com carteiras Bitcoin via **XDEFI Wallet SDK** [14]  

## 3. Fluxos Cross-Chain  
```solidity
// Exemplo de contrato para doações BTC→ETH
function donateBitcoin(address cause) external payable {
  bytes memory params = abi.encode(cause, msg.value);
  connector.send{value: msg.value}(
    ZETA_CHAIN_ID,
    donationVaultAddress,
    params,
    prepareData(params)
  );
}
```
*Implementar usando ZetaChain Toolkit's `prepareData` [8][15]*  

## 4. DevOps & Segurança  
- Pipeline CI/CD com testes em **ZetaChain Localnet** [20]  
- Auditoria automática usando **Slither + CertiK** no fluxo GitHub Actions [6][19]  
- Configuração de multisig via **Safe{Wallet}** em ZetaChain e Ethereum [9]  

## 5. Requisitos Específicos  
- Compatibilidade com tokenomics existente do $LUCK [2][7]  
- Mecanismo de queima deflacionária ativado por transações cross-chain  
- Relatórios de conformidade fiscal usando **The Graph** [6]  

**Entregáveis Esperados:**  
1. Estrutura de diretórios do repositório GitHub  
2. Contratos principais com comentários NatSpec  
3. Configurações do Hardhat para ZetaChain Testnet/Mainnet  
4. Scripts de implantação usando `zeta-cli` [20]  
5. Modelo de README.md com guias para:  
   - Configuração do ambiente  
   - Variáveis de ambiente necessárias  
   - Testes end-to-end  
   - Contribuição à DAO  

**Exemplo de Uso:**  
```bash
# Clonar template
git clone https://github.com/govinda777/lakshmi_coin
cd lakshmi_coin

# Instalar dependências
yarn add @zetachain/toolkit @openzeppelin/contracts

# Iniciar Localnet
npx hardhat zeta-test --network zeta_localnet
```

**Referências Obrigatórias:**  
- Documentação oficial da ZetaChain [6][8][16]  
- Padrões ERC-20/ZRC-20 [9]  
- Modelo econômico do $LUCK [2][7]

Citations:
[1] https://github.com/govinda777/lakshmi_coin
[2] https://www.accessnewswire.com/newsroom/en/blockchain-and-cryptocurrency/divine-tokens-announces-launch-of-lakshmi-coin-luck-to-drive-global-p-1027568
[3] https://pitchlucy.ai/pitch
[4] https://sbi.co.in/webfiles/uploads/files_2021/SBM%20FY%202011-2012.pdf
[5] https://www.coinmama.com/blog/lakshmi-cryptocurrency
[6] https://github.com/zeta-chain/node
[7] https://www.coingabbar.com/en/crypto-ico-details/lakshmi-coin-new-crypto-presale-decentralized-finance-project
[8] https://www.zetachain.com/docs/developers/frontend/toolkit/
[9] https://github.com/zeta-chain/protocol-contracts
[10] https://symbiosis.finance/bridge-zetachain
[11] https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/customizing-your-profile/managing-your-profile-readme
[12] https://www.bullionmart.ca/product/10-grams-lakshmi-ji-pure-silver-coin/
[13] https://rainbowkit.com/docs/installation
[14] https://www.xdefi.io/pt-br/zetachain-building-an-omnichain-future/
[15] https://github.com/zeta-chain/toolkit
[16] https://www.zetachain.com/docs/developers/architecture/protocol/contracts/zevm/SystemContract.sol/contract.SystemContract
[17] https://docs.github.com/articles/about-readmes
[18] https://www.zetachain.com/blog/building-cross-chain-dex-restaking-btc-staking-as-an-omnichain-smart
[19] https://www.npmjs.com/package/@zetachain/toolkit/v/1.0.0-athens3
[20] https://www.zetachain.com/id-ID/blog/introducing-localnet-and-devnet-build-universal-apps-faster-with-the-newest
[21] https://www.zetachain.com/docs/developers/tutorials/hello/
[22] https://www.cgc.ac.in/education-loan?newsdragon_tiger_prediction_pdf%EF%B8%8F=&page=5
[23] https://www.justdial.com/Vijayawada/Adhesive-Distributors-in-Govinda-Rajulu-Naidu-Street-Suryarao-Pet/nct-10006721
[24] https://nsdl.co.in/nsdlnews/pan_deactivated.php
[25] https://www.justdial.com/Kolkata/City-Union-Banks-in-Govinda-Khatick-Road/nct-11981999
[26] https://www.nobroker.in/unfurnished-flats-for-sale-near-akshaya_towers_chennai-page-4
[27] https://github.com/zeta-chain/template
[28] https://www.binance.com/en/square/post/3699432560537
[29] https://github.com/rainbow-me/rainbowkit/discussions/1846
[30] https://rainbowkit.com/es-419/guides/rainbowkit-wagmi-v2
[31] https://github.com/rainbow-me/rainbowkit
[32] https://docs.tableland.xyz/playbooks/frameworks/wagmi
[33] https://blog.amis.com/a-hierarchical-threshold-signature-830683b87873
[34] https://github.com/andreykobal/zetachain-crosschain-nft-game-sdk
[35] https://www.npmjs.com/package/@rainbow-me/rainbowkit
