# Cobertura da LC 214/2025

Levantamento dos 161 `cClassTrib` da tabela oficial `V0059` (30/09/2026) contra as regras do motor. Um teste confere este arquivo contra `COVERAGE` em `packages/domain/src/rules/products.ts` e contra o README.

- **resolve**: a regra decide sozinha quando NCM, descrição e CFOP bastam.
- **pergunta**: a regra existe, mas depende de fato que a nota não traz (destinação, adquirente, habilitação); o motor nunca devolve o código em silêncio, devolve a pergunta.
- **aviso**: código do mesmo produto para outro adquirente; o motor emite o alerta `buyer_dependent_code`.
- **não coberto**: o motor não tem regra própria. Se a tabela oficial aceita o NCM nesse código e nenhuma regra o explica, o item sai como `review` com `unmapped_benefit`, nunca como tributação integral. Quando o item cai numa pergunta de outro código (ex.: 200038), o código não coberto só aparece no texto da pergunta.

A coluna *Lista de NCM* diz se a API oficial restringe os NCM aceitos no código (17 de 161). Para os 17, todo NCM folha coberto por regra foi conferido na API, e um teste (`packages/sources/src/sources.test.ts`) falha se algum for recusado.

## Resumo

| Situação | Códigos |
|---|---|
| resolve | 14 |
| pergunta | 8 |
| aviso | 3 |
| não coberto | 136 |

## Os 17 códigos com lista restrita de NCM

| Código | Descrição oficial | Situação | Como |
|---|---|---|---|
| 200003 | Vendas de produtos destinados à alimentação humana (Anexo I) | resolve | Anexo I (art. 125), lista de NCM. |
| 200004 | Fornecimento de dispositivos médicos (Anexo XII) | resolve | Anexo XII (art. 144, I), lista de NCM + descrição. |
| 200005 | Fornecimento de dispositivos médicos para órgãos da administração pública e enti | aviso | Anexo IV para órgão público ou entidade com CEBAS. O motor decide o código do consumidor comum (200030) e emite o alerta `buyer_dependent_code` citando este. |
| 200007 | Fornecimento dos dispositivos de acessibilidade próprios para pessoas com defici | resolve | Anexo XIII (art. 145, I), lista de NCM + descrição. Só cadeira de rodas, suas partes e próteses (8713, 871420, 9021) decidem sozinhas; os demais itens (ex.: barra de apoio 8302.41) viram pergunta porque o NCM é de uso geral. |
| 200008 | Fornecimento dos dispositivos de acessibilidade próprios para pessoas com defici | aviso | Anexo V para órgão público ou entidade com CEBAS. Alerta `buyer_dependent_code` no 200031. |
| 200011 | Fornecimento das composições para nutrição enteral e parenteral quando adquirida | aviso | Anexo VI para órgão público ou entidade com CEBAS. Alerta `buyer_dependent_code` no 200033. |
| 200014 | Fornecimento dos produtos hortícolas, frutas e ovos (Anexo XV) | resolve | Anexo XV (art. 148), lista de NCM. |
| 200030 | Venda dos dispositivos médicos (Anexo IV) | resolve | Anexo IV (art. 131), lista de NCM + descrição. |
| 200031 | Fornecimento dos dispositivos de acessibilidade próprios para pessoas com defici | pergunta | Anexo V (art. 132): NCM + descrição indicam o dispositivo, mas o uso por pessoa com deficiência não está na nota; sai como pergunta. |
| 200033 | Fornecimento das composições para nutrição enteral e parenteral (Anexo VI) | resolve | Anexo VI (art. 133, § 1º), NCM + sinal de nutrição enteral/parenteral ou EIM na descrição. |
| 200034 | Fornecimento dos alimentos destinados ao consumo humano (Anexo VII) | resolve | Anexo VII (art. 135), lista de NCM. |
| 200035 | Fornecimento dos produtos de higiene pessoal e limpeza (Anexo VIII) | resolve | Anexo VIII (art. 136), lista de NCM. |
| 200038 | Fornecimento dos insumos agropecuários e aquícolas (Anexo IX) | pergunta | Anexo IX (art. 138): exige registro no MAPA e destinação; a nota não traz. Pergunta. |
| 200039 | Fornecimento dos bens e serviços relacionados com produções nacionais artísticas | pergunta | Anexo X (art. 139): exige obra original de artista brasileiro. Pergunta. |
| 200043 | Fornecimento à administração pública dos serviços e dos bens relativos à soberan | pergunta | Anexo XI (art. 142, I): só para órgão da administração pública. Pergunta. |
| 200044 | Operações e prestações de serviços de segurança da informação e segurança cibern | não coberto | Art. 142, II, após a LC 227/2026, é só de serviços (NBS); o Anexo XI de NCM é o 200043. |
| 515001 | Operações, sujeitas a diferimento, com insumos agropecuários e aquícolas (Anexo  | não coberto | Diferimento de insumo (art. 138, § 2º) depende de o adquirente ser contribuinte do regime regular ou produtor rural. A pergunta do 200038 cita o diferimento. |

Itens de anexo sem efeito: os de serviço (NBS) dos Anexos II, III, IX (22 a 34), X e XI, e os `pendente de classificação` do Anexo XI. Três itens citam NCM que não existe na nomenclatura vigente (IV item 37 `9021.90.89`, VI item 31 `2827.39.98`, IX item 21 `0712.90.10`); ficam sem efeito até o NCM existir.

## Operações por CFOP

| CFOP | Tratamento | Código |
|---|---|---|
| 5.101 a 5.125, 5.401 a 5.405, 5.651 a 5.656, 5.667 (e 6.xxx) | venda: segue para as regras de produto | por produto |
| 5.151 a 5.155, 5.408, 5.409, 5.552, 5.557, 5.658, 5.659 | transferência | 410002 |
| 7.xxx (exceto 7.501 e 7.949) | exportação | 410004 |
| 5.910 / 6.910 | **pergunta**: bonificação ou doação | 410001 ou 410003 |
| 5.501, 5.502, 6.501, 6.502 | **pergunta**: suspensão do art. 82 | 550001 ou 000001 |
| 1.xxx, 2.xxx, 3.xxx | entrada: fora do escopo (o Enquadra classifica saídas) | alerta |
| devoluções (5.201 a 5.219, 5.411, 5.413, 5.414, 5.503, 5.504, 5.553 a 5.556, 5.660 a 5.662) | fora do escopo: segue a nota original | alerta |
| demais (comodato, demonstração, consignação, conserto, brinde 5.911, amostra grátis 5.912...) | **não coberto**: `out_of_scope` com alerta | alerta |

## Todos os 161 códigos

| Código | Situação | Lista de NCM | Nomenclatura | Descrição oficial | Por quê |
|---|---|---|---|---|---|
| 000001 | resolve | não | NBS ou NCM | Situações tributadas integralmente pelo IBS e CBS. | Regra geral: nenhuma hipótese da lei casa e a tabela oficial não aponta benefício. |
| 000002 | não coberto | não | NBS | Exploração de via | Exploração de via (serviço). |
| 000003 | não coberto | não | NCM | Regime automotivo - projetos incentivados (art. 311) | Regime automotivo: projeto incentivado do contribuinte. |
| 000004 | não coberto | não | NCM | Regime automotivo - projetos incentivados (art. 312) | Regime automotivo: projeto incentivado do contribuinte. |
| 000005 | não coberto | não | NCM | Operação com EAC destinado à mistura com gasolina A, mas com saída do biocombust | Mistura de etanol com gasolina: operação do contribuinte. |
| 010001 | não coberto | não | NBS | Operações do FGTS não realizadas pela Caixa Econômica Federal | Serviço (NBS): fora do escopo; o Enquadra classifica mercadoria (NCM). |
| 010002 | não coberto | não | NBS | Operações do serviço financeiro | Serviço (NBS): fora do escopo; o Enquadra classifica mercadoria (NCM). |
| 011001 | não coberto | não | NBS | Planos de assistência funerária. | Serviço (NBS): fora do escopo; o Enquadra classifica mercadoria (NCM). |
| 011002 | não coberto | não | NBS | Planos de assistência à saúde | Serviço (NBS): fora do escopo; o Enquadra classifica mercadoria (NCM). |
| 011003 | não coberto | não | NBS | Intermediação de planos de assistência à saúde | Serviço (NBS): fora do escopo; o Enquadra classifica mercadoria (NCM). |
| 011004 | não coberto | não | NBS | Concursos e prognósticos | Serviço (NBS): fora do escopo; o Enquadra classifica mercadoria (NCM). |
| 011005 | não coberto | não | NBS | Planos de assistência à saúde de animais domésticos | Serviço (NBS): fora do escopo; o Enquadra classifica mercadoria (NCM). |
| 200001 | não coberto | não | NBS ou NCM | Serviços de transporte de bens até as zonas de processamento de exportação e ben | Serviço de transporte. |
| 200002 | não coberto | não | NCM | Fornecimento ou importação para produtor rural não contribuinte ou TAC | Depende de o adquirente ser produtor rural não contribuinte. |
| 200003 | resolve | sim | NCM | Vendas de produtos destinados à alimentação humana (Anexo I) | Anexo I (art. 125), lista de NCM. |
| 200004 | resolve | sim | NCM | Fornecimento de dispositivos médicos (Anexo XII) | Anexo XII (art. 144, I), lista de NCM + descrição. |
| 200005 | aviso | sim | NCM | Fornecimento de dispositivos médicos para órgãos da administração pública e enti | Anexo IV para órgão público ou entidade com CEBAS. O motor decide o código do consumidor comum (200030) e emite o alerta `buyer_dependent_code` citando este. |
| 200006 | não coberto | não | NCM | Situação de emergência de saúde pública reconhecida pelo Poder público | Emergência de saúde pública: ato conjunto, sem lista de NCM. |
| 200007 | resolve | sim | NCM | Fornecimento dos dispositivos de acessibilidade próprios para pessoas com defici | Anexo XIII (art. 145, I), lista de NCM + descrição. Só cadeira de rodas, suas partes e próteses (8713, 871420, 9021) decidem sozinhas; os demais itens (ex.: barra de apoio 8302.41) viram pergunta porque o NCM é de uso geral. |
| 200008 | aviso | sim | NCM | Fornecimento dos dispositivos de acessibilidade próprios para pessoas com defici | Anexo V para órgão público ou entidade com CEBAS. Alerta `buyer_dependent_code` no 200031. |
| 200009 | não coberto | não | NCM | Fornecimento dos medicamentos registrados na Anvisa | Art. 146: medicamento por finalidade (doenças raras, oncologia, diabetes...) e lista de ato conjunto; a API aceita qualquer NCM e o NCM não revela a finalidade. |
| 200010 | não coberto | não | NCM | Fornecimento dos medicamentos registrados na Anvisa, adquiridos por órgãos da ad | Art. 146, § 1º: medicamento adquirido por órgão público ou entidade com CEBAS. |
| 200011 | aviso | sim | NCM | Fornecimento das composições para nutrição enteral e parenteral quando adquirida | Anexo VI para órgão público ou entidade com CEBAS. Alerta `buyer_dependent_code` no 200033. |
| 200012 | não coberto | não | NCM | Situação de emergência de saúde pública reconhecida pelo Poder público | Emergência de saúde pública: ato conjunto, sem lista de NCM. |
| 200013 | resolve | não | NCM | Fornecimento de tampões higiênicos, absorventes higiênicos internos ou externos | Art. 147, NCM 9619.00.00 + descrição (a API aceita qualquer NCM neste código). |
| 200014 | resolve | sim | NCM | Fornecimento dos produtos hortícolas, frutas e ovos (Anexo XV) | Anexo XV (art. 148), lista de NCM. |
| 200015 | não coberto | não | NCM | Venda de automóveis de passageiros de fabricação nacional adquiridos por motoris | Art. 149: automóvel adquirido por táxi ou pessoa com deficiência; fato do adquirente. |
| 200016 | não coberto | não | NBS | Prestação de serviços de pesquisa e desenvolvimento por Instituição Científica,  | Serviço (NBS): fora do escopo; o Enquadra classifica mercadoria (NCM). |
| 200017 | não coberto | não | NBS | Operações relacionadas ao FGTS | Serviço (NBS): fora do escopo; o Enquadra classifica mercadoria (NCM). |
| 200018 | não coberto | não | NBS | Operações de resseguro e retrocessão | Serviço (NBS): fora do escopo; o Enquadra classifica mercadoria (NCM). |
| 200019 | não coberto | não | NBS | Importador dos serviços financeiros contribuinte | Serviço (NBS): fora do escopo; o Enquadra classifica mercadoria (NCM). |
| 200020 | não coberto | não | NBS ou NCM | Operação praticada por sociedades cooperativas optantes por regime específico do | Regime de cooperativa: opção do contribuinte. |
| 200021 | não coberto | não | NBS | Serviços de transporte público coletivo de passageiros ferroviário e hidroviário | Serviço de transporte. |
| 200022 | não coberto | não | NCM | Operação originada fora da ZFM que destine bem material industrializado a contri | Zona Franca ou Área de Livre Comércio: depende da localização do adquirente (a nota traz só a UF). |
| 200023 | não coberto | não | NCM | Operação realizada por indústria incentivada que destine bem material intermediá | Zona Franca ou Área de Livre Comércio: depende da localização do adquirente (a nota traz só a UF). |
| 200024 | não coberto | não | NCM | Operação originada fora das Áreas de Livre Comércio destinadas a contribuinte es | Zona Franca ou Área de Livre Comércio: depende da localização do adquirente (a nota traz só a UF). |
| 200025 | não coberto | não | NBS ou NCM | Fornecimento dos serviços de educação relacionados ao Programa Universidade para | Serviço, locação ou imóvel: fora do escopo (mercadoria). |
| 200026 | não coberto | não | NBS ou NCM | Locação de imóveis localizados nas zonas reabilitadas | Serviço, locação ou imóvel: fora do escopo (mercadoria). |
| 200027 | não coberto | não | NBS ou NCM | Operações de locação, cessão onerosa e arrendamento de bens imóveis | Serviço, locação ou imóvel: fora do escopo (mercadoria). |
| 200028 | não coberto | não | NBS | Fornecimento dos serviços de educação (Anexo II) | Serviço (NBS): fora do escopo; o Enquadra classifica mercadoria (NCM). |
| 200029 | não coberto | não | NBS | Fornecimento dos serviços de saúde humana (Anexo III) | Serviço (NBS): fora do escopo; o Enquadra classifica mercadoria (NCM). |
| 200030 | resolve | sim | NCM | Venda dos dispositivos médicos (Anexo IV) | Anexo IV (art. 131), lista de NCM + descrição. |
| 200031 | pergunta | sim | NCM | Fornecimento dos dispositivos de acessibilidade próprios para pessoas com defici | Anexo V (art. 132): NCM + descrição indicam o dispositivo, mas o uso por pessoa com deficiência não está na nota; sai como pergunta. |
| 200032 | não coberto | não | NCM | Fornecimento dos medicamentos registrados na Anvisa ou produzidos por farmácias  | Art. 133: medicamento registrado na Anvisa. Sem lista de NCM (a API aceita qualquer): depende do registro e da lista de ato conjunto. |
| 200033 | resolve | sim | NCM | Fornecimento das composições para nutrição enteral e parenteral (Anexo VI) | Anexo VI (art. 133, § 1º), NCM + sinal de nutrição enteral/parenteral ou EIM na descrição. |
| 200034 | resolve | sim | NCM | Fornecimento dos alimentos destinados ao consumo humano (Anexo VII) | Anexo VII (art. 135), lista de NCM. |
| 200035 | resolve | sim | NCM | Fornecimento dos produtos de higiene pessoal e limpeza (Anexo VIII) | Anexo VIII (art. 136), lista de NCM. |
| 200036 | não coberto | não | NCM | Fornecimento de produtos agropecuários, aquícolas, pesqueiros, florestais e extr | Art. 137: produto in natura; o conceito (sem industrialização nem embalagem) não vem do NCM. |
| 200037 | não coberto | não | NBS ou NCM | Fornecimento de serviços ambientais de conservação ou recuperação da vegetação n | Serviço, locação ou imóvel: fora do escopo (mercadoria). |
| 200038 | pergunta | sim | NBS ou NCM | Fornecimento dos insumos agropecuários e aquícolas (Anexo IX) | Anexo IX (art. 138): exige registro no MAPA e destinação; a nota não traz. Pergunta. |
| 200039 | pergunta | sim | NBS ou NCM | Fornecimento dos bens e serviços relacionados com produções nacionais artísticas | Anexo X (art. 139): exige obra original de artista brasileiro. Pergunta. |
| 200040 | não coberto | não | NBS ou NCM | Fornecimento de serviços de comunicação institucional à administração pública | Serviço, locação ou imóvel: fora do escopo (mercadoria). |
| 200041 | não coberto | não | NBS ou NCM | Fornecimento de serviço de educação desportiva (art. 141. I) | Serviço, locação ou imóvel: fora do escopo (mercadoria). |
| 200042 | não coberto | não | NBS ou NCM | Fornecimento de serviço de gestão e exploração do desporto (art. 141. II) | Serviço, locação ou imóvel: fora do escopo (mercadoria). |
| 200043 | pergunta | sim | NBS ou NCM | Fornecimento à administração pública dos serviços e dos bens relativos à soberan | Anexo XI (art. 142, I): só para órgão da administração pública. Pergunta. |
| 200044 | não coberto | sim | NBS ou NCM | Operações e prestações de serviços de segurança da informação e segurança cibern | Art. 142, II, após a LC 227/2026, é só de serviços (NBS); o Anexo XI de NCM é o 200043. |
| 200045 | não coberto | não | NBS ou NCM | Operações relacionadas a projetos de reabilitação urbana de zonas históricas e d | Serviço, locação ou imóvel: fora do escopo (mercadoria). |
| 200046 | não coberto | não | NBS ou NCM | Operações com bens imóveis | Serviço, locação ou imóvel: fora do escopo (mercadoria). |
| 200047 | não coberto | não | NCM | Bares e Restaurantes | Bares e restaurantes: serviço de alimentação, não produto. |
| 200048 | não coberto | não | NBS ou NCM | Hotelaria, Parques de Diversão e Parques Temáticos | Serviço, locação ou imóvel: fora do escopo (mercadoria). |
| 200049 | não coberto | não | NBS ou NCM | Transporte coletivo de passageiros rodoviário, ferroviário e hidroviário | Serviço, locação ou imóvel: fora do escopo (mercadoria). |
| 200050 | não coberto | não | NBS ou NCM | Serviços de transporte aéreo regional coletivo de passageiros ou de carga | Serviço, locação ou imóvel: fora do escopo (mercadoria). |
| 200051 | não coberto | não | NBS ou NCM | Agências de Turismo | Serviço, locação ou imóvel: fora do escopo (mercadoria). |
| 200052 | não coberto | não | NBS ou NCM | Prestação de serviços de profissões intelectuais | Serviço, locação ou imóvel: fora do escopo (mercadoria). |
| 200053 | resolve | não | NCM | Fornecimento de medicamentos registrados na Anvisa, quando  classificados como s | Art. 146, § 1º, III: vacinas de uso humano (3002.41); a API aceita o NCM. |
| 200054 | não coberto | não | NCM | Fornecimento de bem material pela cooperativa de produção agropecuária a associa | Cooperativa agropecuária fornecendo a associado: fato do vendedor e do adquirente. |
| 221001 | não coberto | não | NBS ou NCM | Locação, cessão onerosa ou arrendamento de bem imóvel com alíquota sobre a recei | Imóveis (locação, incorporação, alienação): fora do escopo (mercadoria). |
| 221002 | não coberto | não | NBS ou NCM | Incorporação imobiliária submetida ao regime especial de tributação | Imóveis (locação, incorporação, alienação): fora do escopo (mercadoria). |
| 221003 | não coberto | não | NBS ou NCM | Incorporação imobiliária submetida ao regime especial de tributação | Imóveis (locação, incorporação, alienação): fora do escopo (mercadoria). |
| 221004 | não coberto | não | NBS ou NCM | Alienação de imóvel decorrente de parcelamento do solo | Imóveis (locação, incorporação, alienação): fora do escopo (mercadoria). |
| 222001 | não coberto | não | NBS | Transporte internacional de passageiros, caso os trechos de ida e volta sejam ve | Serviço (NBS): fora do escopo; o Enquadra classifica mercadoria (NCM). |
| 400001 | não coberto | não | NBS ou NCM | Fornecimento de serviços de transporte público coletivo de passageiros rodoviári | Transporte público coletivo de passageiros: serviço. |
| 400002 | não coberto | não | NBS ou NCM | Fornecimento de serviços de transporte público coletivo de passageiros rodoviári | Transporte público coletivo de passageiros: serviço. |
| 410001 | pergunta | não | NBS ou NCM | Fornecimento de bonificações quando constem no documento fiscal e que não depend | CFOP 5910/6910: bonificação no documento, sem evento posterior. Pergunta. |
| 410002 | resolve | não | NCM | Transferências entre estabelecimentos pertencentes ao mesmo contribuinte | CFOP de transferência (art. 6º, II). |
| 410003 | pergunta | não | NBS ou NCM | Doações sem contraprestação em benefício do doador | CFOP 5910/6910: doação. Pergunta. |
| 410004 | resolve | não | NBS ou NCM | Exportações de bens e serviços | CFOP de exportação (art. 8º). |
| 410005 | não coberto | não | NBS ou NCM | Fornecimentos realizados pela União, pelos Estados, pelo Distrito Federal e pelo | Imunidade por natureza do emitente (ente público, templo, partido, instituição): fato do emitente, fora da nota. |
| 410006 | não coberto | não | NBS ou NCM | Fornecimentos realizados por entidades religiosas e templos de qualquer culto | Imunidade por natureza do emitente (ente público, templo, partido, instituição): fato do emitente, fora da nota. |
| 410007 | não coberto | não | NBS ou NCM | Fornecimentos realizados por partidos políticos, entidades sindicais e instituiç | Imunidade por natureza do emitente (ente público, templo, partido, instituição): fato do emitente, fora da nota. |
| 410008 | resolve | não | NBS ou NCM | Fornecimentos de livros, jornais, periódicos e do papel destinado a sua impressã | Art. 9º, IV, NCM 4901 a 4903. |
| 410009 | pergunta | não | NBS ou NCM | Fornecimentos de fonogramas e videofonogramas musicais produzidos no Brasil | Art. 9º, V: mídia musical gravada; produção no Brasil e autor brasileiro não estão na nota, sai como pergunta. |
| 410010 | não coberto | não | NBS ou NCM | Fornecimentos de serviço de comunicação nas modalidades de radiodifusão sonora e | Fato do emitente ou do adquirente (produtor rural, transportador autônomo, condomínio, rádio, resíduos) ou operação sem lista de NCM. |
| 410011 | não coberto | não | NCM | Fornecimentos de ouro, quando definido em lei como ativo financeiro ou instrumen | Art. 9º, VII: ouro só quando definido em lei como ativo financeiro; depende da operação. |
| 410012 | não coberto | não | NBS ou NCM | Fornecimento de condomínio edilício não optante pelo regime regular | Fato do emitente ou do adquirente (produtor rural, transportador autônomo, condomínio, rádio, resíduos) ou operação sem lista de NCM. |
| 410013 | não coberto | não | NCM | Exportações de combustíveis | Fato do emitente ou do adquirente (produtor rural, transportador autônomo, condomínio, rádio, resíduos) ou operação sem lista de NCM. |
| 410014 | não coberto | não | NBS ou NCM | Fornecimento de produtor rural não contribuinte | Fato do emitente ou do adquirente (produtor rural, transportador autônomo, condomínio, rádio, resíduos) ou operação sem lista de NCM. |
| 410015 | não coberto | não | NBS ou NCM | Fornecimento por transportador autônomo não contribuinte | Fato do emitente ou do adquirente (produtor rural, transportador autônomo, condomínio, rádio, resíduos) ou operação sem lista de NCM. |
| 410016 | não coberto | não | NCM | Fornecimento ou aquisição de resíduos sólidos | Fato do emitente ou do adquirente (produtor rural, transportador autônomo, condomínio, rádio, resíduos) ou operação sem lista de NCM. |
| 410017 | não coberto | não | NCM | Aquisição de bem móvel com crédito presumido sob condição de revenda realizada | Fato do emitente ou do adquirente (produtor rural, transportador autônomo, condomínio, rádio, resíduos) ou operação sem lista de NCM. |
| 410018 | não coberto | não | NBS ou NCM | Operações relacionadas aos fundos garantidores e executores de políticas pública | Fato do emitente ou do adquirente (produtor rural, transportador autônomo, condomínio, rádio, resíduos) ou operação sem lista de NCM. |
| 410019 | não coberto | não | NCM | Exclusão da gorjeta na base de cálculo no fornecimento de alimentação | Ajuste de base de cálculo, garantia, crédito, fundo ou operação não onerosa: não é classificação de produto. |
| 410020 | não coberto | não | NCM | Exclusão do valor de intermediação na base de cálculo no fornecimento de aliment | Ajuste de base de cálculo, garantia, crédito, fundo ou operação não onerosa: não é classificação de produto. |
| 410021 | não coberto | não | NCM | Contribuição de que trata o art. 149-A da Constituição Federal | Ajuste de base de cálculo, garantia, crédito, fundo ou operação não onerosa: não é classificação de produto. |
| 410022 | não coberto | não | NCM | Consolidação da propriedade do bem pelo credor | Ajuste de base de cálculo, garantia, crédito, fundo ou operação não onerosa: não é classificação de produto. |
| 410023 | não coberto | não | NCM | Alienação de bens móveis ou imóveis que tenham sido objeto de garantia em que o  | Ajuste de base de cálculo, garantia, crédito, fundo ou operação não onerosa: não é classificação de produto. |
| 410024 | não coberto | não | NCM | Consolidação da propriedade do bem pelo grupo de consórcio | Ajuste de base de cálculo, garantia, crédito, fundo ou operação não onerosa: não é classificação de produto. |
| 410025 | não coberto | não | NCM | Alienação de bem que tenha sido objeto de garantia em que o prestador da garanti | Ajuste de base de cálculo, garantia, crédito, fundo ou operação não onerosa: não é classificação de produto. |
| 410026 | não coberto | não | NBS ou NCM | Doação com anulação de crédito | Ajuste de base de cálculo, garantia, crédito, fundo ou operação não onerosa: não é classificação de produto. |
| 410027 | não coberto | não | NBS | Exportação de serviço ou de bem imaterial | Serviço (NBS): fora do escopo; o Enquadra classifica mercadoria (NCM). |
| 410028 | não coberto | não | NBS | Operações com bens imóveis realizadas por pessoas físicas não consideradas contr | Serviço (NBS): fora do escopo; o Enquadra classifica mercadoria (NCM). |
| 410029 | não coberto | não | NCM | Operações acobertadas somente pelo ICMS | Ajuste de base de cálculo, garantia, crédito, fundo ou operação não onerosa: não é classificação de produto. |
| 410030 | não coberto | não | NCM | Estorno de crédito por perecimento, deteriorização, roubo, furto ou extravio. | Ajuste de base de cálculo, garantia, crédito, fundo ou operação não onerosa: não é classificação de produto. |
| 410031 | não coberto | não | NCM | Fornecimento em período anterior ao início de vigência de incidências de CBS e I | Ajuste de base de cálculo, garantia, crédito, fundo ou operação não onerosa: não é classificação de produto. |
| 410032 | não coberto | não | NBS ou NCM | Tributos incidentes na operação que não integram a base de cálculo do IBS e da C | Ajuste de base de cálculo, garantia, crédito, fundo ou operação não onerosa: não é classificação de produto. |
| 410033 | não coberto | não | NBS ou NCM | Operações de Fundos de Investimento Imobiliário (FII) e Fundos de Investimento n | Ajuste de base de cálculo, garantia, crédito, fundo ou operação não onerosa: não é classificação de produto. |
| 410034 | não coberto | não | NBS ou NCM | Operações de fundos de investimento | Ajuste de base de cálculo, garantia, crédito, fundo ou operação não onerosa: não é classificação de produto. |
| 410035 | não coberto | não | NBS ou NCM | Fornecimento realizado por nanoempreendedor | Ajuste de base de cálculo, garantia, crédito, fundo ou operação não onerosa: não é classificação de produto. |
| 410036 | não coberto | não | NBS ou NCM | Descontos incondicionais | Ajuste de base de cálculo, garantia, crédito, fundo ou operação não onerosa: não é classificação de produto. |
| 410037 | não coberto | não | NBS ou NCM | Importação os bens materiais sem incidência de IBS e CBS | Ajuste de base de cálculo, garantia, crédito, fundo ou operação não onerosa: não é classificação de produto. |
| 410999 | não coberto | não | NBS ou NCM | Operações não onerosas sem previsão de tributação, não especificadas anteriormen | Ajuste de base de cálculo, garantia, crédito, fundo ou operação não onerosa: não é classificação de produto. |
| 510001 | não coberto | não | NCM | Operações, sujeitas a diferimento, com energia elétrica, relativas à importação, | Diferimento, suspensão ou regime aduaneiro/incentivado (Repetro, ZPE, Renaval...): depende de habilitação do contribuinte, que a nota não traz. |
| 515001 | não coberto | sim | NBS ou NCM | Operações, sujeitas a diferimento, com insumos agropecuários e aquícolas (Anexo  | Diferimento de insumo (art. 138, § 2º) depende de o adquirente ser contribuinte do regime regular ou produtor rural. A pergunta do 200038 cita o diferimento. |
| 550001 | pergunta | não | NCM | Exportações de bens materiais | CFOP 5501/5502/6501/6502: suspensão do art. 82 só para exportadora habilitada. Pergunta. |
| 550002 | não coberto | não | NCM | Regime de Trânsito | Diferimento, suspensão ou regime aduaneiro/incentivado (Repetro, ZPE, Renaval...): depende de habilitação do contribuinte, que a nota não traz. |
| 550003 | não coberto | não | NCM | Regimes de Depósito (art. 85) | Diferimento, suspensão ou regime aduaneiro/incentivado (Repetro, ZPE, Renaval...): depende de habilitação do contribuinte, que a nota não traz. |
| 550004 | não coberto | não | NCM | Regimes de Depósito (art. 87) | Diferimento, suspensão ou regime aduaneiro/incentivado (Repetro, ZPE, Renaval...): depende de habilitação do contribuinte, que a nota não traz. |
| 550005 | não coberto | não | NCM | Regimes de Depósito (art. 87, Parágrafo único) | Diferimento, suspensão ou regime aduaneiro/incentivado (Repetro, ZPE, Renaval...): depende de habilitação do contribuinte, que a nota não traz. |
| 550006 | não coberto | não | NCM | Regimes de Permanência Temporária | Diferimento, suspensão ou regime aduaneiro/incentivado (Repetro, ZPE, Renaval...): depende de habilitação do contribuinte, que a nota não traz. |
| 550007 | não coberto | não | NCM | Regimes de Aperfeiçoamento | Diferimento, suspensão ou regime aduaneiro/incentivado (Repetro, ZPE, Renaval...): depende de habilitação do contribuinte, que a nota não traz. |
| 550008 | não coberto | não | NCM | Importação de bens para o Regime de Repetro-Temporário | Diferimento, suspensão ou regime aduaneiro/incentivado (Repetro, ZPE, Renaval...): depende de habilitação do contribuinte, que a nota não traz. |
| 550009 | não coberto | não | NCM | GNL-Temporário | Diferimento, suspensão ou regime aduaneiro/incentivado (Repetro, ZPE, Renaval...): depende de habilitação do contribuinte, que a nota não traz. |
| 550010 | não coberto | não | NCM | Repetro-Permanente | Diferimento, suspensão ou regime aduaneiro/incentivado (Repetro, ZPE, Renaval...): depende de habilitação do contribuinte, que a nota não traz. |
| 550011 | não coberto | não | NCM | Repetro-Industrialização | Diferimento, suspensão ou regime aduaneiro/incentivado (Repetro, ZPE, Renaval...): depende de habilitação do contribuinte, que a nota não traz. |
| 550012 | não coberto | não | NCM | Repetro-Nacional | Diferimento, suspensão ou regime aduaneiro/incentivado (Repetro, ZPE, Renaval...): depende de habilitação do contribuinte, que a nota não traz. |
| 550013 | não coberto | não | NCM | Repetro-Entreposto | Diferimento, suspensão ou regime aduaneiro/incentivado (Repetro, ZPE, Renaval...): depende de habilitação do contribuinte, que a nota não traz. |
| 550014 | não coberto | não | NCM | Zona de Processamento de Exportação | Diferimento, suspensão ou regime aduaneiro/incentivado (Repetro, ZPE, Renaval...): depende de habilitação do contribuinte, que a nota não traz. |
| 550015 | não coberto | não | NCM | Regime Tributário para Incentivo à Modernização e à Ampliação da Estrutura Portu | Diferimento, suspensão ou regime aduaneiro/incentivado (Repetro, ZPE, Renaval...): depende de habilitação do contribuinte, que a nota não traz. |
| 550016 | não coberto | não | NBS ou NCM | Regime Especial de Incentivos para o Desenvolvimento da Infraestrutura | Diferimento, suspensão ou regime aduaneiro/incentivado (Repetro, ZPE, Renaval...): depende de habilitação do contribuinte, que a nota não traz. |
| 550017 | não coberto | não | NCM | Regime Tributário para Incentivo à Atividade Naval - Renaval (Art. 107, I) | Diferimento, suspensão ou regime aduaneiro/incentivado (Repetro, ZPE, Renaval...): depende de habilitação do contribuinte, que a nota não traz. |
| 550018 | não coberto | não | NCM | Desoneração da aquisição de bens de capital | Diferimento, suspensão ou regime aduaneiro/incentivado (Repetro, ZPE, Renaval...): depende de habilitação do contribuinte, que a nota não traz. |
| 550019 | não coberto | não | NCM | Importação de bem material por indústria incentivada para utilização na ZFM | Diferimento, suspensão ou regime aduaneiro/incentivado (Repetro, ZPE, Renaval...): depende de habilitação do contribuinte, que a nota não traz. |
| 550020 | não coberto | não | NCM | Áreas de livre comércio | Diferimento, suspensão ou regime aduaneiro/incentivado (Repetro, ZPE, Renaval...): depende de habilitação do contribuinte, que a nota não traz. |
| 550021 | não coberto | não | NCM | Industrialização destinada a exportações | Diferimento, suspensão ou regime aduaneiro/incentivado (Repetro, ZPE, Renaval...): depende de habilitação do contribuinte, que a nota não traz. |
| 550022 | não coberto | não | NBS ou NCM | Regime Especial de Incentivos para a Produção de Hidrogênio de Baixa Emissão de  | Diferimento, suspensão ou regime aduaneiro/incentivado (Repetro, ZPE, Renaval...): depende de habilitação do contribuinte, que a nota não traz. |
| 550023 | não coberto | não | NBS ou NCM | Operações com hidrocarbonetos líquidos derivados de petróleo não combustíveis ou | Diferimento, suspensão ou regime aduaneiro/incentivado (Repetro, ZPE, Renaval...): depende de habilitação do contribuinte, que a nota não traz. |
| 550024 | não coberto | não | NBS ou NCM | Regime Tributário para Incentivo à Atividade Naval - Renaval (Art. 107, II) | Diferimento, suspensão ou regime aduaneiro/incentivado (Repetro, ZPE, Renaval...): depende de habilitação do contribuinte, que a nota não traz. |
| 550025 | não coberto | não | NBS ou NCM | Regime Tributário para Incentivo à Atividade Naval - Renaval (Art. 107, III) | Diferimento, suspensão ou regime aduaneiro/incentivado (Repetro, ZPE, Renaval...): depende de habilitação do contribuinte, que a nota não traz. |
| 620001 | não coberto | não | NCM | Tributação monofásica sobre combustíveis | Combustíveis (monofásico, art. 172 e seguintes): pede dados de retenção e regime que não estão na nota. |
| 620002 | não coberto | não | NCM | Tributação monofásica com responsabilidade pela retenção sobre combustíveis | Combustíveis (monofásico, art. 172 e seguintes): pede dados de retenção e regime que não estão na nota. |
| 620003 | não coberto | não | NCM | Tributação monofásica com responsabilidade de retenção de tributos por terceiros | Combustíveis (monofásico, art. 172 e seguintes): pede dados de retenção e regime que não estão na nota. |
| 620004 | não coberto | não | NCM | Tributação monofásica sobre mistura de EAC com gasolina A em percentual superior | Combustíveis (monofásico, art. 172 e seguintes): pede dados de retenção e regime que não estão na nota. |
| 620005 | não coberto | não | NCM | Tributação monofásica sobre mistura de EAC com gasolina A em percentual inferior | Combustíveis (monofásico, art. 172 e seguintes): pede dados de retenção e regime que não estão na nota. |
| 620006 | não coberto | não | NCM | Tributação monofásica sobre combustíveis cobrada anteriormente | Combustíveis (monofásico, art. 172 e seguintes): pede dados de retenção e regime que não estão na nota. |
| 620007 | não coberto | não | NCM | Perecimento, deteriorização, roubo, furto ou extravio no regime monofásico | Combustíveis (monofásico, art. 172 e seguintes): pede dados de retenção e regime que não estão na nota. |
| 800001 | não coberto | não | NBS ou NCM | Fusão, cisão ou incorporação | Documento de ajuste, transferência de crédito ou informativo: não é item de venda. |
| 800002 | não coberto | não | NBS ou NCM | Transferência de crédito do associado, inclusive as cooperativas singulares | Documento de ajuste, transferência de crédito ou informativo: não é item de venda. |
| 810001 | não coberto | não | Não possui | Crédito presumido de IBS sobre o valor apurado nos fornecimentos a partir da ZFM | Documento sem item de mercadoria ou serviço. |
| 811001 | não coberto | não | NBS ou NCM | Anulação de Crédito por Saídas Imunes/Isentas | Documento de ajuste, transferência de crédito ou informativo: não é item de venda. |
| 811002 | não coberto | não | NBS ou NCM | Débitos de notas fiscais não processadas na apuração | Documento de ajuste, transferência de crédito ou informativo: não é item de venda. |
| 811003 | não coberto | não | NBS ou NCM | Desenquadramento do Simples Nacional | Documento de ajuste, transferência de crédito ou informativo: não é item de venda. |
| 820001 | não coberto | não | NBS | Documento com informações de fornecimento de serviços de planos de assistência à | Serviço (NBS): fora do escopo; o Enquadra classifica mercadoria (NCM). |
| 820002 | não coberto | não | NBS | Documento com informações de fornecimento de serviços de planos de assistência f | Serviço (NBS): fora do escopo; o Enquadra classifica mercadoria (NCM). |
| 820003 | não coberto | não | NBS | Documento com informações de fornecimento de serviços de planos de assistência à | Serviço (NBS): fora do escopo; o Enquadra classifica mercadoria (NCM). |
| 820004 | não coberto | não | NBS | Documento com informações de prestação de serviços de consursos de prognósticos | Serviço (NBS): fora do escopo; o Enquadra classifica mercadoria (NCM). |
| 820005 | não coberto | não | Não possui | Documento com informações de alienação de bens imóveis | Documento sem item de mercadoria ou serviço. |
| 820006 | não coberto | não | NBS | Documento com informações de fornecimento de serviços de exploração de via | Serviço (NBS): fora do escopo; o Enquadra classifica mercadoria (NCM). |
| 820007 | não coberto | não | NBS | Documento com informações de fornecimento de serviços financeiros | Serviço (NBS): fora do escopo; o Enquadra classifica mercadoria (NCM). |
| 820008 | não coberto | não | NBS ou NCM | Documento com informações de fornecimento de serviço continuado, mas com tributa | Documento de ajuste, transferência de crédito ou informativo: não é item de venda. |
| 820009 | não coberto | não | NBS ou NCM | Cobrança relativa a fornecimentos declarados em outro documento | Documento de ajuste, transferência de crédito ou informativo: não é item de venda. |
| 830001 | não coberto | não | NCM | Documento com exclusão da BC da CBS e do IBS de energia elétrica fornecida pela  | Documento de ajuste, transferência de crédito ou informativo: não é item de venda. |
