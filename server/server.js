const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const util = require('util');
const app = express();

app.use(cors());
app.use(express.json());

// Promisify exec para usar async/await
const execAsync = util.promisify(exec);

const REPO_BASE = 'https://repo.skyinformatica.com.br/svn/sky';

// Helper para rodar SVN e retornar array de linhas limpas
async function svnList(url) {
    try {
        console.log(`[SVN] Listando: ${url}`);
        const { stdout } = await execAsync(`svn list "${url}" --non-interactive`, { maxBuffer: 1024 * 1024 * 5 });
        
        // Normaliza quebras de linha e faz o split simples
        const rawLines = stdout.replace(/\r\n/g, '\n').split('\n');
        
        return rawLines
            .map(line => line.trim())
            .filter(line => line.length > 0);
            
    } catch (error) {
        // Pega apenas a primeira linha do erro para não poluir o log
        const errorMsg = error.message ? error.message.split('\n')[0] : 'Erro desconhecido';
        console.warn(`[AVISO] Falha ao listar ${url}: ${errorMsg}`);
        return [];
    }
}

// Rota OTIMIZADA para listar tags (Year -> Month -> Tags)
app.get('/list-tags', async (req, res) => {
    const { year } = req.query;
    if (!year) return res.status(400).json({ error: 'Ano obrigatório' });

    const yearUrl = `${REPO_BASE}/tags/financeiro/${year}`;
    const allTags = [];

    try {
        // 1. Lista os MESES (01/, 02/, etc)
        const months = await svnList(yearUrl);
        
        // Filtra apenas diretórios (terminam com /)
        const monthDirs = months.filter(m => m.endsWith('/'));

        if (monthDirs.length === 0) {
            return res.json({ tags: [], message: "Nenhum mês encontrado neste ano." });
        }

        // 2. Busca as tags dentro de cada mês (em paralelo para ser rápido)
        const promises = monthDirs.map(async (monthDir) => {
            const monthNum = monthDir.replace('/', ''); // "01"
            const monthUrl = `${yearUrl}/${monthNum}`;
            
            const tagsInMonth = await svnList(monthUrl);
            
            // Adiciona as tags encontradas
            tagsInMonth.forEach(tagFolder => {
                // Aceita apenas diretórios como tags
                if (tagFolder.endsWith('/')) {
                    const tagName = tagFolder.replace('/', '');
                    allTags.push({
                        value: `${monthNum}/${tagName}`, // Valor para o backend: "01/TAG"
                        label: `${tagName} (Mês ${monthNum})` // Label visual
                    });
                }
            });
        });

        // Aguarda todas as requisições terminarem
        await Promise.all(promises);

        // 3. Ordena: Mais recentes primeiro
        allTags.sort((a, b) => {
            if (a.label < b.label) return 1;
            if (a.label > b.label) return -1;
            return 0;
        });

        console.log(`[SUCESSO] Total de tags encontradas: ${allTags.length}`);
        res.json({ tags: allTags, path: yearUrl });

    } catch (error) {
        console.error(`[ERRO CRITICO] ${error.message}`);
        res.status(500).json({ error: 'Erro ao buscar tags', details: error.message });
    }
});

// Helper simples para exec callback
function runSvnCallback(command, res, successCallback) {
    console.log(`[CMD] ${command}`);
    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`[ERRO] Falha: ${error.message}`);
            console.error(`[STDERR] ${stderr}`);
            return res.status(500).json({ error: 'Erro no SVN', details: stderr || error.message });
        }
        successCallback(stdout);
    });
}

// Rota de Criação de Branch
app.post('/create-branch', (req, res) => {
    const { taskId, version, sourceTag, year } = req.body;

    if (!taskId || !version) return res.status(400).json({ error: 'Faltam dados' });

    const now = new Date();
    const cYear = now.getFullYear();
    const cMonth = String(now.getMonth() + 1).padStart(2, '0');

    let sourceUrl = `${REPO_BASE}/trunk`;
    
    if (sourceTag) {
        sourceUrl = `${REPO_BASE}/tags/financeiro/${year}/${sourceTag}`;
    }

    const branchUrl = `${REPO_BASE}/branches/Financeiro/${cYear}/${cMonth}/${version}/T${taskId}`;
    const command = `svn copy "${sourceUrl}" "${branchUrl}" --parents -m "Automacao: Branch T${taskId} baseada em ${sourceTag || 'trunk'}" --non-interactive`;

    runSvnCallback(command, res, (stdout) => {
        console.log(`[SUCESSO] Branch criada: ${branchUrl}`);
        res.json({ success: true, url: branchUrl, output: stdout });
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor SVN Otimizado rodando em http://localhost:${PORT}`);
});
