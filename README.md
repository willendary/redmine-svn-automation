# 🚀 Redmine SVN Automation

Ferramenta de produtividade que integra o **Redmine** ao **TortoiseSVN** para criação automatizada de branches.

Este projeto adiciona um botão inteligente na interface do Redmine que permite criar branches no SVN baseadas em Tags ou no Trunk, seguindo o padrão de nomenclatura da empresa.

## 📂 Estrutura do Projeto

- **/server**: API em Node.js que executa os comandos SVN CLI no sistema operacional.
- **/extension**: Extensão para Google Chrome que injeta a interface no Redmine.

## ✨ Funcionalidades

- **Detecção Automática:** Lê o ID da tarefa e a Versão de destino diretamente da página do Redmine.
- **Listagem de Tags:** Busca recursivamente todas as tags do ano no SVN para seleção.
- **Criação de Branch:** Executa o `svn copy` criando automaticamente a estrutura de pastas (Ano/Mês/Versão).
- **Interface Responsiva:** Modal integrado ao Redmine sem necessidade de sair da página.

---

## 🛠️ Pré-requisitos

1. **Node.js** instalado.
2. **TortoiseSVN** (com a opção *Command line client tools* marcada na instalação) ou **SVN CLI**.
3. Acesso ao repositório SVN configurado e autenticado no terminal.

---

## 🚀 Instalação e Uso

### 1. Configurando o Servidor (Backend)

O servidor é responsável por executar os comandos SVN.

```bash
cd server
npm install
node server.js
```
> O servidor rodará na porta `3000`. Mantenha o terminal aberto.

### 2. Instalando a Extensão (Frontend)

1. Abra o Chrome e vá para `chrome://extensions/`.
2. Ative o **Modo do desenvolvedor** (canto superior direito).
3. Clique em **Carregar sem compactação**.
4. Selecione a pasta `extension` deste projeto.

### 3. Utilizando

1. Acesse uma tarefa no Redmine.
2. Clique no botão azul **⚡ Criar Branch** no menu superior.
3. Selecione a **Tag de Origem** (ou deixe vazio para usar o Trunk).
4. Confirme a criação.

---

## ⚙️ Configuração

Para alterar a URL do repositório SVN, edite a constante `REPO_BASE` no arquivo `server/server.js`.

```javascript
const REPO_BASE = 'https://repo.skyinformatica.com.br/svn/sky';
```

## 📝 Licença

Este projeto é de uso interno.
