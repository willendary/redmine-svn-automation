# Sky Redmine Workspace

Aplicação web local que reúne tarefas do Redmine, branches SVN, pendências de merge e registro de horas. O projeto contém somente o frontend web e a API Node.js.

## Iniciar

Pré-requisitos: Node.js 24 ou superior, npm e SVN CLI disponível no PATH. As ações de abrir log e executar merge também usam o TortoiseSVN instalado no Windows.

Na raiz do projeto:

```powershell
npm ci --prefix server
npm start --prefix server
```

Abra [http://localhost:3000](http://localhost:3000). No Windows, também é possível executar `iniciar_web.cmd`. O servidor permanece ativo enquanto o terminal estiver aberto.

Se a porta 3000 já estiver em uso por este projeto, use a instância existente. O iniciador não encerra outros processos.

## Telas

- **Pendentes de merge:** indicadores calculados a partir dos filtros, busca, filtros por responsável/sistema/ano/situação/versão, revisões e ações de conferência e merge.
- **Minhas tarefas:** tarefas por sprint, cronômetro, total de horas, progresso da meta de 7h e histórico de lançamentos em largura completa.
- **Detalhes da tarefa:** dados do Redmine, branch, cronômetro e tarefas relacionadas.
- **Configurações:** conexão com Redmine e preferências de exibição.
- **Logs do sistema:** busca nos registros, atualização automática opcional e limpeza com confirmação.

Use o botão **Modo escuro / Modo claro** no topo de qualquer tela. A preferência fica salva neste navegador; sem escolha salva, acompanha o tema do sistema operacional. A tecla `/` leva ao campo de busca, quando disponível. Diálogos suportam Tab e Escape. Em telas pequenas, a navegação abre pelo botão de menu e as tabelas largas permitem rolagem horizontal.

## Configuração

Abra **Configurações** e informe a URL e a API key do Redmine. A API key pode ser obtida na página **Minha conta** do Redmine.

Os arquivos locais `server/config.json`, `server/timer.json` e `server/preferencias.json` não são versionados. A configuração dos projetos SVN fica em `server/projetos.js`.

A API é disponibilizada pelo servidor em `127.0.0.1:3000`. Ações de SVN e registro de horas mantêm os fluxos e validações do backend.

## Estrutura

```text
server/
  public/             Telas HTML, scripts e estilos da aplicação
    interface.js      Navegação, tema, ícones e acessibilidade
    interface.css     Identidade visual, responsividade e modo escuro
    comum.js          Utilitários, requisições e diálogos compartilhados
  server.js           API Express e rotas das telas
  tailwind.css        Estilos base; gera public/tailwind.css
  frontend.test.js    Testes de integração do frontend com API simulada
  *.test.js           Testes da lógica da API
iniciar_web.cmd       Inicialização local no Windows
```

O frontend usa HTML, CSS e JavaScript, servidos pela própria API. Não precisa de um servidor de desenvolvimento separado.

## Verificação e estilos

```powershell
npm test --prefix server
npm run build:css --prefix server
```

Os testes de frontend executam os scripts reais em um DOM com respostas simuladas: navegação, IDs, temas, filtros, indicadores, histórico e diálogos. Eles não efetuam merges, gravam horas ou modificam a configuração real. Testes de DOM não substituem uma revisão visual em navegador.

Edite `server/public/interface.css` para mudar o tema; esse arquivo é servido diretamente. Ao alterar `server/tailwind.css`, execute o build de CSS. Os recursos possuem um parâmetro de versão nos HTMLs para evitar mistura de arquivos antigos no cache; incremente-o ao publicar mudanças incompatíveis.

A extensão Chrome, o aplicativo Electron/EXE, seus artefatos e os scripts de empacotamento foram removidos. O manual anterior foi substituído por este README.

Uso interno.
