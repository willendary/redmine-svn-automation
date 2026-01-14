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
    
    // Verifica se a branch JÁ EXISTE para evitar criar subpasta (bug do SVN copy em destino existente)
    checkSvnPath(branchUrl).then(exists => {
        if (exists) {
            console.log(`[AVISO] Branch já existe: ${branchUrl}`);
            return res.json({ success: true, url: branchUrl, message: "Branch já existia." });
        }

        const command = `svn copy "${sourceUrl}" "${branchUrl}" --parents -m "Automacao: Branch T${taskId} baseada em ${sourceTag || 'trunk'}" --non-interactive`;

        runSvnCallback(command, res, (stdout) => {
            console.log(`[SUCESSO] Branch criada: ${branchUrl}`);
            res.json({ success: true, url: branchUrl, output: stdout });
        });
    });
});

// Helper para verificar se um caminho existe
async function checkSvnPath(url) {
    try {
        await execAsync(`svn info "${url}" --non-interactive`, { stdio: 'ignore' });
        return true;
    } catch (e) {
        return false;
    }
}

// Rota para buscar branch existente
app.get('/task-branch', async (req, res) => {
    const { taskId, version } = req.query;
    
    if (!taskId || !version) {
        return res.status(400).json({ found: false, error: "taskId e version são obrigatórios" });
    }

    console.log(`[BUSCA] Procurando branch para T${taskId} na versão ${version}...`);

    const now = new Date();
    // Tenta nos últimos 24 meses (2 anos)
    const MAX_MONTHS_BACK = 24;
    
    // Gera lista de datas para verificar (do atual para o passado)
    const datesToCheck = [];
    for (let i = 0; i < MAX_MONTHS_BACK; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        datesToCheck.push({
            year: d.getFullYear(),
            month: String(d.getMonth() + 1).padStart(2, '0')
        });
    }

    // Função de busca (sequencial para não floodar o servidor SVN, mas pode ser paralelizada em lotes se necessário)
    for (const date of datesToCheck) {
        const candidateUrl = `${REPO_BASE}/branches/Financeiro/${date.year}/${date.month}/${version}/T${taskId}`;
        const exists = await checkSvnPath(candidateUrl);
        
        if (exists) {
            console.log(`[ENCONTRADO] ${candidateUrl}`);
            return res.json({ found: true, url: candidateUrl });
        }
    }

    console.log(`[NAO ENCONTRADO] Branch para T${taskId} não encontrada.`);
    return res.json({ found: false });
});

// Rota para buscar histórico de commits (Log)
app.get('/branch-log', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL obrigatória' });

    console.log(`[LOG] Buscando histórico de: ${url}`);
    
    // Busca os últimos 50 commits, parando na cópia (criação da branch)
    const command = `svn log "${url}" --xml --stop-on-copy --limit 50 --non-interactive`;

    exec(command, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`[ERRO LOG] ${error.message}`);
            return res.status(500).json({ error: 'Erro ao buscar log', details: stderr || error.message });
        }

        try {
            // Parser manual simples de XML para evitar dependências pesadas
            const commits = [];
            const regex = /<logentry\s+revision="(\d+)">[\s\S]*?<author>(.*?)<\/author>[\s\S]*?<date>(.*?)<\/date>[\s\S]*?<msg>([\s\S]*?)<\/msg>/g;
            
            let match;
            while ((match = regex.exec(stdout)) !== null) {
                commits.push({
                    revision: match[1],
                    author: match[2],
                    date: match[3],
                    message: match[4].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim()
                });
            }
            
            // Remove o último commit se for o de criação da branch (cópia)
            // Geralmente queremos apenas os commits DEPOIS da criação para merge
            // Mas deixar o usuário decidir é melhor, apenas garantimos que não traga o histórico do trunk.

            res.json({ success: true, commits });
        } catch (e) {
            res.status(500).json({ error: 'Erro ao processar XML do log', details: e.message });
        }
    });
});

// Rota para verificar conflitos antes do merge (Dry-run)
app.get('/merge-preview', async (req, res) => {
    const { source, target } = req.query;
    if (!source || !target) return res.status(400).json({ error: 'Source e Target obrigatórios' });

    console.log(`[MERGE PREVIEW] Comparando: ${target} -> ${source}`);
    
    // Usamos diff --summarize para ver mudanças entre URLs sem precisar de working copy
    const command = `svn diff --summarize "${target}" "${source}" --non-interactive`;
    
    exec(command, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`[ERRO PREVIEW] ${error.message}`);
            console.error(`[STDERR] ${stderr}`);
            return res.status(500).json({ error: 'Erro ao comparar', details: stderr || error.message });
        }

        const lines = stdout.split('\n');
        // No diff --summarize, as linhas começam com M, A, D, etc.
        const changes = lines
            .filter(l => l.trim().length > 0)
            .map(l => l.trim());

        // Nota: diff --summarize não detecta conflitos de merge automaticamente, 
        // mas nos diz se há diferenças.
        res.json({
            canMerge: true, 
            conflicts: [],
            changes,
            output: stdout
        });
    });
});

// Rota para executar o merge (Via Tortoise para maior segurança e suporte a Working Copy)
app.post('/execute-merge', (req, res) => {
    const { source, target, revisions } = req.body;

    if (!source) return res.status(400).json({ error: 'Source obrigatório' });

    console.log(`[MERGE TORTOISE] Abrindo interface de merge para: ${source}`);
    
    let args = `/command:merge /fromurl:"${source}"`;
    
    if (revisions && revisions.length > 0) {
        const revList = revisions.join(',');
        args += ` /revlist:"${revList}"`;
    }

    // Se tivermos o target e ele for uma URL, o Tortoise vai pedir o caminho local (WC)
    // Se o target fosse um caminho local, o Tortoise já saberia onde aplicar.
    if (target && !target.startsWith('http')) {
        args += ` /path:"${target}"`;
    }

    const psCommand = `Start-Process "TortoiseProc.exe" -ArgumentList '${args}'`;
    
    exec(`powershell.exe -Command "${psCommand}"`, (error) => {
        if (error) {
            console.error(`[ERRO TORTOISE] ${error.message}`);
            return res.status(500).json({ success: false, error: error.message });
        }
        res.json({ success: true, message: "Interface do TortoiseSVN aberta." });
    });
});

// Utilitário para abrir o TortoiseSVN (Log ou Diff)
app.post('/open-tortoise', (req, res) => {
    const { command, path, path2 } = req.body;
    
    // command: 'log', 'diff', 'merge', etc.
    // path: url ou caminho local
    
    const cmdType = command || 'log';
    let args = `/command:${cmdType} /path:"${path}"`;
    
    if (path2) {
        args += ` /path2:"${path2}"`;
    }

    console.log(`[TORTOISE] Abrindo: ${cmdType} em ${path}`);
    
    // Importante: Aspas corretas para PowerShell
    const psCommand = `Start-Process "TortoiseProc.exe" -ArgumentList '${args}'`;
    
    exec(`powershell.exe -Command "${psCommand}"`, (error) => {
        if (error) return res.status(500).json({ success: false, error: error.message });
        res.json({ success: true });
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor SVN Otimizado rodando em http://localhost:${PORT}`);
});
