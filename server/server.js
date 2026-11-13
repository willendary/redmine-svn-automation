const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const util = require('util');
const { REPO_BASE, PROJECTS } = require('./projetos');
const mergePendentes = require('./merge_pendentes');
const branches = require('./branches');
const fluxo = require('./fluxo');
const redmine = require('./redmine');
const preferencias = require('./preferencias');
const app = express();

app.use(cors());
app.use(express.json());

const { XMLParser } = require('fast-xml-parser');
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Private-Network', 'true');
    next();
});

// Sistema de Logs Internos
const appLogs = [];
function addLog(type, msg) {
    const time = new Date().toLocaleTimeString();
    const logStr = `[${time}] [${type}] ${msg}`;
    appLogs.push(logStr);
    if (appLogs.length > 1000) appLogs.shift();
    if (type === 'ERROR' || type === 'WARN') {
        process.stderr.write(logStr + '\n');
    } else {
        process.stdout.write(logStr + '\n');
    }
}

app.get('/logs/dados', (req, res) => {
    res.json({ logs: appLogs });
});

app.post('/clear-logs', (req, res) => {
    appLogs.length = 0;
    res.json({ success: true });
});

// Promisify exec para usar async/await
const execAsync = util.promisify(exec);

mergePendentes.definirLogger(addLog);

// Arquivos estáticos (tela de pendentes de merge)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'pendentes.html')));
app.get('/pendentes', (req, res) => res.sendFile(path.join(__dirname, 'public', 'pendentes.html')));
app.get('/minhas-tarefas', (req, res) => res.sendFile(path.join(__dirname, 'public', 'minhas-tarefas.html')));
app.get('/tarefa/:id', (req, res) => res.sendFile(path.join(__dirname, 'public', 'tarefa.html')));
app.get('/config', (req, res) => res.sendFile(path.join(__dirname, 'public', 'config.html')));
app.get('/logs', (req, res) => res.sendFile(path.join(__dirname, 'public', 'logs.html')));

// Configuração do Redmine usada pela tela de pendentes
app.get('/config-redmine', (req, res) => {
    const config = mergePendentes.lerConfigRedmine();
    res.json({ configurado: Boolean(config.apiKey), url: config.url });
});

app.post('/config-redmine', async (req, res) => {
    try {
        const usuario = await mergePendentes.salvarConfigRedmine(req.body || {});
        addLog('INFO', `[CONFIG] API key do Redmine validada para ${usuario.login || usuario.name}`);
        res.json({ success: true, usuario: usuario.name || usuario.login || '' });
    } catch (erro) {
        addLog('WARN', `[CONFIG] Falha ao salvar configuração do Redmine: ${erro.message}`);
        res.status(400).json({ error: erro.message });
    }
});

app.get('/preferencias', (req, res) => {
    res.json({ secoes: preferencias.listarSecoes() });
});

app.put('/preferencias', (req, res) => {
    try {
        preferencias.salvar(req.body || {});
        addLog('INFO', '[CONFIG] Preferências atualizadas.');
        res.json({ success: true, secoes: preferencias.listarSecoes() });
    } catch (erro) {
        res.status(400).json({ error: erro.message });
    }
});

function dataIsoValida(data) {
    if (typeof data !== 'string') return false;
    const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
    if (!partes) return false;
    return new Date(Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])))
        .toISOString().startsWith(data);
}

function obterHorasValidas(valor) {
    const horas = Number(valor);
    if (!Number.isFinite(horas) || horas <= 0) throw new Error('Informe uma quantidade de horas maior que zero.');
    const arredondadas = Math.round(horas * 100) / 100;
    if (arredondadas <= 0) throw new Error('Informe pelo menos 0,01 hora.');
    return arredondadas;
}

app.get('/time-entries', async (req, res) => {
    const data = String(req.query.date || '');
    if (!dataIsoValida(data)) return res.status(400).json({ error: 'Informe uma data válida no formato AAAA-MM-DD.' });

    try {
        const [lancamentos, atividades] = await Promise.all([
            redmine.obterLancamentosPorDia(data),
            redmine.obterAtividadesTempo()
        ]);
        res.json({ success: true, lancamentos, atividades });
    } catch (erro) {
        addLog('ERROR', `[HORAS] Falha ao consultar lançamentos de ${data}: ${erro.message}`);
        res.status(500).json({ error: erro.message });
    }
});

app.post('/time-entries', async (req, res) => {
    const { taskId, date, atividadeId } = req.body || {};
    const idTarefa = Number(taskId);
    const idAtividade = Number(atividadeId);

    if (!Number.isInteger(idTarefa) || idTarefa <= 0) {
        return res.status(400).json({ error: 'Informe um número de tarefa válido.' });
    }
    if (!dataIsoValida(date)) {
        return res.status(400).json({ error: 'Informe uma data válida no formato AAAA-MM-DD.' });
    }

    let horas;
    try {
        horas = obterHorasValidas(req.body.horas);
    } catch (erro) {
        return res.status(400).json({ error: erro.message });
    }

    try {
        const atividades = await redmine.obterAtividadesTempo();
        if (!atividades.some(atividade => atividade.id === idAtividade)) {
            return res.status(400).json({ error: 'Selecione uma atividade válida.' });
        }

        const resultado = await redmine.registrarTempo({
            taskId: idTarefa,
            horas,
            comentario: String(req.body.comentario || ''),
            atividade: idAtividade,
            data
        });
        addLog('INFO', `[HORAS] ${horas}h lançadas em T#${idTarefa} para ${date}`);
        res.status(201).json({ success: true, lancamento: resultado?.time_entry || null });
    } catch (erro) {
        addLog('ERROR', `[HORAS] Falha ao lançar em T#${idTarefa}: ${erro.message}`);
        res.status(500).json({ error: erro.message });
    }
});

app.put('/time-entries/:id', async (req, res) => {
    const id = Number(req.params.id);
    const { atividadeId, date, dataOriginal } = req.body || {};
    const idAtividade = Number(atividadeId);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Lançamento inválido.' });
    if (!dataIsoValida(date)) return res.status(400).json({ error: 'Informe uma data válida no formato AAAA-MM-DD.' });
    if (!dataIsoValida(dataOriginal)) return res.status(400).json({ error: 'A data original do lançamento é inválida.' });

    let horas;
    try {
        horas = obterHorasValidas(req.body?.horas);
    } catch (erro) {
        return res.status(400).json({ error: erro.message });
    }

    try {
        const [lancamento, usuario, atividades] = await Promise.all([
            redmine.obterLancamentoTempo(id),
            redmine.obterUsuarioAtual(),
            redmine.obterAtividadesTempo()
        ]);
        if (Number(lancamento.user?.id) !== Number(usuario.id)) {
            return res.status(403).json({ error: 'Só é possível alterar lançamentos criados por você.' });
        }
        if (lancamento.spent_on !== dataOriginal) {
            return res.status(409).json({ error: 'Este lançamento foi alterado desde que a lista foi carregada. Atualize e tente novamente.' });
        }
        if (!atividades.some(atividade => atividade.id === idAtividade)) {
            return res.status(400).json({ error: 'Selecione uma atividade válida.' });
        }

        await redmine.atualizarLancamentoTempo(id, {
            horas,
            comentario: String(req.body.comentario || ''),
            atividadeId: idAtividade,
            data: date
        });
        addLog('INFO', `[HORAS] Lançamento ${id} alterado para ${horas}h em ${date}`);
        res.json({ success: true });
    } catch (erro) {
        addLog('ERROR', `[HORAS] Falha ao alterar lançamento ${id}: ${erro.message}`);
        res.status(500).json({ error: erro.message });
    }
});

// Dados da tarefa para a tela /tarefa/:id
app.get('/tarefa/:id/dados', async (req, res) => {
    const id = String(req.params.id).replace(/\D/g, '');
    const config = mergePendentes.lerConfigRedmine();

    if (!config.apiKey) {
        return res.status(400).json({ error: 'API key do Redmine não configurada. Abra /config.' });
    }

    try {
        const issue = await redmine.obterIssue(id);
        const [horasHoje, tarefasDoFluxo, branch] = await Promise.all([
            redmine.obterHorasHoje(id).catch(() => 0),
            fluxo.obterFluxo(id).catch(() => []),
            fluxo.obterBranchDoFluxo(id, issue.fixed_version?.name || '')
                .catch(erro => ({ encontrada: false, url: null, viaTaskId: null, erro: erro.message }))
        ]);

        const tarefa = {
            ...mergePendentes.mapearTarefa(issue, config.url),
            horasHoje,
            horasEstimadas: Number(issue.estimated_hours) || 0,
            horasGastas: Number(issue.spent_hours) || 0
        };

        res.json({
            success: true,
            tarefa,
            fluxo: tarefasDoFluxo.map(item => mergePendentes.mapearTarefa(item, config.url)),
            branch
        });
    } catch (erro) {
        addLog('ERROR', `[TAREFA] Falha ao carregar T#${id}: ${erro.message}`);
        res.status(500).json({ error: erro.message });
    }
});

// Lista de tarefas atribuidas ao usuario, com horas de hoje e alerta de dias < 7h
app.get('/minhas-tarefas/dados', async (req, res) => {
    const config = mergePendentes.lerConfigRedmine();

    if (!config.apiKey) {
        return res.status(400).json({ error: 'API key do Redmine não configurada. Abra /config.' });
    }

    try {
        const [issues, entradasHoje, dias] = await Promise.all([
            redmine.listarMinhasTarefas(),
            redmine.obterEntradasHoje(),
            redmine.obterHorasPorDia(10)
        ]);

        const porTarefa = redmine.agruparHorasPorTarefa(entradasHoje);
        const tarefas = issues.map(issue => ({
            ...mergePendentes.mapearTarefa(issue, config.url),
            horasHoje: porTarefa.get(String(issue.id)) || 0
        }));

        res.json({
            success: true,
            tarefas,
            totalHoje: redmine.somarHoras(entradasHoje),
            dias
        });
    } catch (erro) {
        addLog('ERROR', `[TAREFAS] Falha ao listar minhas tarefas: ${erro.message}`);
        res.status(500).json({ error: erro.message });
    }
});

// Tarefas com revisões no SVN ainda não mescladas no trunk
app.get('/merge-pendentes', async (req, res) => {
    try {
        const anos = String(req.query.years || new Date().getFullYear())
            .split(',')
            .map(Number)
            .filter(ano => ano >= 2000 && ano <= 2100);

        const projetos = String(req.query.projects || Object.keys(PROJECTS).join(','))
            .split(',')
            .filter(projeto => PROJECTS[projeto]);

        if (anos.length === 0) return res.status(400).json({ error: 'Ano inválido' });
        if (projetos.length === 0) return res.status(400).json({ error: 'Projeto inválido' });

        const dados = await mergePendentes.coletarPendentes({ anos, projetos });
        res.json(dados);
    } catch (erro) {
        addLog('ERROR', `[MERGE] ${erro.message}`);
        res.status(500).json({ error: 'Erro ao buscar pendentes de merge', details: erro.message });
    }
});

// Helper para rodar SVN e retornar array de linhas limpas
async function svnList(url) {
    try {
        addLog('INFO', `[SVN] Listando (XML): ${url}`);
        const { stdout } = await execAsync(`svn list "${url}" --xml --non-interactive`, { maxBuffer: 1024 * 1024 * 5 });
        
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            parseTagValue: false
        });
        const jsonObj = parser.parse(stdout);
        
        if (!jsonObj.lists || !jsonObj.lists.list || !jsonObj.lists.list.entry) return [];
        
        const entries = Array.isArray(jsonObj.lists.list.entry) ? jsonObj.lists.list.entry : [jsonObj.lists.list.entry];
        
        return entries
            .filter(e => e['@_kind'] === 'dir')
            .map(e => ({
                name: e.name,
                author: e.commit.author,
                date: e.commit.date,
                revision: e.commit['@_revision']
            }));
            
    } catch (error) {
        // Pega apenas a primeira linha do erro para não poluir o log
        const errorMsg = error.message ? error.message.split('\n')[0] : 'Erro desconhecido';
        addLog('WARN', `Falha ao listar ${url}: ${errorMsg}`);
        return [];
    }
}

// Rota OTIMIZADA para listar tags (Year -> Month -> Tags)
app.get('/list-tags', async (req, res) => {
    let { year, project } = req.query;
    if (!year) return res.status(400).json({ error: 'Ano obrigatório' });

    const initialYear = year;
    const projectKey = (project || 'financeiro').toLowerCase();

    const tagProject = PROJECTS[projectKey]?.tag || projectKey;

    let yearUrl = `${REPO_BASE}/tags/${tagProject}/${year}`;
    const allTags = [];
    let message = "";

    try {
        // 1. Tenta listar os MESES no ano atual
        let months = await svnList(yearUrl);
        
        // 2. Se não encontrou, tenta no ano anterior
        if (months.length === 0) {
            addLog('WARN', `Nenhuma tag encontrada para ${tagProject} em ${year}. Tentando ano anterior.`);
            year = String(parseInt(year) - 1);
            yearUrl = `${REPO_BASE}/tags/${tagProject}/${year}`;
            months = await svnList(yearUrl);

            if (months.length > 0) {
                message = `Nenhuma tag encontrada em ${initialYear}. Mostrando resultados de ${year}.`;
            }
        }

        if (months.length === 0) {
            return res.json({ tags: [], message: `Nenhuma tag encontrada para ${tagProject} em ${initialYear} ou ${year}.` });
        }

        // 3. Busca as tags dentro de cada mês (em paralelo para ser rápido)
        const promises = months.map(async (monthInfo) => {
            const monthNum = monthInfo.name; // "01"
            const monthUrl = `${yearUrl}/${monthNum}`;
            
            const tagsInMonth = await svnList(monthUrl);
            
            tagsInMonth.forEach(tagInfo => {
                const tagName = tagInfo.name;
                allTags.push({
                    value: `${year}/${monthNum}/${tagName}`, // Valor para o backend: "ANO/MES/TAG"
                    label: `${tagName}`, // Label visual
                    year: year, // Adiciona o ano para referência
                    month: monthNum,
                    author: tagInfo.author,
                    date: tagInfo.date,
                    revision: tagInfo.revision
                });
            });
        });

        await Promise.all(promises);

        allTags.sort((a, b) => new Date(b.date) - new Date(a.date));

        addLog('INFO',`[SUCESSO] Total de tags encontradas: ${allTags.length}`);
        res.json({ tags: allTags, path: yearUrl, message });

    } catch (error) {
        addLog('ERROR',`[ERRO CRITICO] ${error.message}`);
        res.status(500).json({ error: 'Erro ao buscar tags', details: error.message });
    }
});

// Helper simples para exec callback
function runSvnCallback(command, res, successCallback) {
    addLog('INFO',`[CMD] ${command}`);
    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
            addLog('ERROR',`[ERRO] Falha: ${error.message}`);
            addLog('ERROR',`[STDERR] ${stderr}`);
            return res.status(500).json({ error: 'Erro no SVN', details: stderr || error.message });
        }
        successCallback(stdout);
    });
}

// Rota de Criação de Branch
app.post('/create-branch', (req, res) => {
    const { taskId, version, sourceTag, year, project } = req.body;

    if (!taskId || !version) return res.status(400).json({ error: 'Faltam dados' });

    const now = new Date();
    const cYear = now.getFullYear();
    const cMonth = String(now.getMonth() + 1).padStart(2, '0');

    let sourceUrl = `${REPO_BASE}/trunk`;
    
    if (sourceTag) {
        const projectKey = (project || 'financeiro').toLowerCase();

        const tagProject = PROJECTS[projectKey]?.tag || projectKey;

        sourceUrl = `${REPO_BASE}/tags/${tagProject}/${sourceTag}`;
    }

    const projectKey = (project || 'financeiro').toLowerCase();

    const branchProject = PROJECTS[projectKey]?.branch || 'Financeiro';
    const branchUrl = `${REPO_BASE}/branches/${branchProject}/${cYear}/${cMonth}/${version}/T${taskId}`;
    
    // Verifica se a branch JÁ EXISTE para evitar criar subpasta (bug do SVN copy em destino existente)
    checkSvnPath(branchUrl).then(exists => {
        if (exists) {
            addLog('INFO',`[AVISO] Branch já existe: ${branchUrl}`);
            branches.limparCache();
            return res.json({ success: true, url: branchUrl, message: "Branch já existia." });
        }

        const command = `svn copy "${sourceUrl}" "${branchUrl}" --parents -m "Automacao: Branch T${taskId} baseada em ${sourceTag || 'trunk'}" --non-interactive`;

        runSvnCallback(command, res, (stdout) => {
            addLog('INFO',`[SUCESSO] Branch criada: ${branchUrl}`);
            branches.limparCache();
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

    addLog('INFO', `[BUSCA] Procurando branch para T${taskId} na versão ${version}...`);

    try {
        const url = await branches.localizarBranch(taskId, version);
        if (url) {
            addLog('INFO', `[ENCONTRADO] ${url}`);
            return res.json({ found: true, url });
        }

        addLog('INFO', `[NAO ENCONTRADO] Branch para T${taskId} não encontrada.`);
        return res.json({ found: false });
    } catch (erro) {
        addLog('ERROR', `[BUSCA] Falha ao procurar branch de T${taskId}: ${erro.message}`);
        return res.status(500).json({ found: false, error: erro.message });
    }
});

// Rota para buscar histórico de commits (Log)
app.get('/branch-log', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL obrigatória' });

    addLog('INFO',`[LOG] Buscando histórico de: ${url}`);
    
    // Busca os últimos 50 commits, parando na cópia (criação da branch)
    const command = `svn log "${url}" --xml --stop-on-copy --limit 50 --non-interactive`;

    exec(command, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
        if (error) {
            addLog('ERROR',`[ERRO LOG] ${error.message}`);
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

    addLog('INFO',`[MERGE PREVIEW] Comparando: ${target} -> ${source}`);
    
    // Usamos diff --summarize para ver mudanças entre URLs sem precisar de working copy
    const command = `svn diff --summarize "${target}" "${source}" --non-interactive`;
    
    exec(command, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
        if (error) {
            addLog('ERROR',`[ERRO PREVIEW] ${error.message}`);
            addLog('ERROR',`[STDERR] ${stderr}`);
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

// Abre o TortoiseProc direto, sem PowerShell (Kaspersky bloqueia Start-Process a partir de script JS).
function caminhoTortoiseProc() {
    const candidatos = [
        process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'TortoiseSVN', 'bin', 'TortoiseProc.exe'),
        process.env['ProgramFiles(x86)'] && path.join(process.env['ProgramFiles(x86)'], 'TortoiseSVN', 'bin', 'TortoiseProc.exe'),
        'C:\\Program Files\\TortoiseSVN\\bin\\TortoiseProc.exe'
    ].filter(Boolean);

    return candidatos.find(caminho => fs.existsSync(caminho)) || 'TortoiseProc.exe';
}

function abrirTortoise(args) {
    return new Promise((resolve, reject) => {
        const processo = spawn(caminhoTortoiseProc(), args, { detached: true, stdio: 'ignore' });
        processo.once('error', reject);
        processo.once('spawn', () => {
            processo.unref();
            resolve();
        });
    });
}

// Rota para executar o merge (Via Tortoise para maior segurança e suporte a Working Copy)
app.post('/execute-merge', async (req, res) => {
    const { source, target, revisions } = req.body;

    if (!source) return res.status(400).json({ error: 'Source obrigatório' });
    if (!target || target.startsWith('http')) {
        return res.status(400).json({ error: 'Informe o caminho local do Trunk.' });
    }

    const args = ['/command:merge', `/path:${target}`, `/fromurl:${source}`];
    const revrange = mergePendentes.agruparRevisoes(revisions);
    if (revrange) args.push(`/revrange:${revrange}`);

    addLog('INFO', `[MERGE TORTOISE] Abrindo merge: ${source} -> ${target} (${revrange || 'todas'})`);

    try {
        await abrirTortoise(args);
        res.json({ success: true, message: 'Interface do TortoiseSVN aberta.' });
    } catch (erro) {
        addLog('ERROR', `[ERRO TORTOISE] ${erro.message}`);
        res.status(500).json({ success: false, error: `Não foi possível abrir o TortoiseSVN: ${erro.message}` });
    }
});

// Confere se o conteúdo das revisões pendentes já está no trunk (arquivo a arquivo)
app.get('/verificar-conteudo', async (req, res) => {
    const { branchUrl } = req.query;
    const revisoes = String(req.query.revisoes || '')
        .split(',')
        .map(Number)
        .filter(Number.isFinite);

    if (!branchUrl) return res.status(400).json({ error: 'branchUrl é obrigatório.' });
    if (!String(branchUrl).startsWith(`${REPO_BASE}/branches/`)) {
        return res.status(400).json({ error: 'URL da branch inválida.' });
    }

    addLog('INFO', `[MERGE] Verificando conteúdo: ${branchUrl} (${revisoes.join(',') || 'sem revisões'})`);

    try {
        const resultado = await mergePendentes.verificarConteudo({ branchUrl, revisoes });
        res.json({ success: true, ...resultado });
    } catch (erro) {
        addLog('ERROR', `[MERGE] Falha na verificação de ${branchUrl}: ${erro.message}`);
        res.status(500).json({ error: erro.message });
    }
});

app.get('/branch-diff', async (req, res) => {
    const branchUrl = String(req.query.branchUrl || '');
    if (!branchUrl) return res.status(400).json({ error: 'branchUrl é obrigatório.' });

    try {
        const resultado = await mergePendentes.listarDiffBranch(branchUrl);
        res.json({ success: true, ...resultado });
    } catch (erro) {
        const status = erro.message === 'URL da branch inválida.' ? 400 : 500;
        addLog(status === 400 ? 'WARN' : 'ERROR', `[DIFF] Falha ao comparar ${branchUrl}: ${erro.message}`);
        res.status(status).json({ error: erro.message });
    }
});

app.get('/branch-diff/arquivo', async (req, res) => {
    const branchUrl = String(req.query.branchUrl || '');
    const caminho = String(req.query.caminho || '');
    if (!branchUrl || !caminho) return res.status(400).json({ error: 'branchUrl e caminho são obrigatórios.' });

    try {
        const resultado = await mergePendentes.obterDiffArquivoBranch({ branchUrl, caminho });
        res.json({ success: true, ...resultado });
    } catch (erro) {
        const status = /URL da branch inválida|Caminho de arquivo inválido/.test(erro.message) ? 400 : 500;
        addLog(status === 400 ? 'WARN' : 'ERROR', `[DIFF] Falha ao obter diff de ${caminho}: ${erro.message}`);
        res.status(status).json({ error: erro.message });
    }
});

// Marca a branch como mesclada no mergeinfo do trunk (record-only) e commita só a propriedade
app.post('/marcar-mesclada', async (req, res) => {
    const { taskId, branchUrl, revisoes } = req.body || {};
    const id = String(taskId || '').replace(/\D/g, '');

    if (!branchUrl || !Array.isArray(revisoes) || revisoes.length === 0) {
        return res.status(400).json({ error: 'branchUrl e revisoes são obrigatórios.' });
    }

    if (!String(branchUrl).startsWith(`${REPO_BASE}/branches/`)) {
        return res.status(400).json({ error: 'URL da branch inválida.' });
    }

    const mensagem = `Merge T #${id}`;
    addLog('INFO', `[MERGE] Marcando T#${id} como mesclada (record-only): ${revisoes.join(',')}`);

    try {
        const resultado = await mergePendentes.marcarComoMesclada({ branchUrl, revisoes, mensagem });
        addLog('INFO', `[MERGE] T#${id}: ${resultado.saida}`);
        res.json({ success: true, ...resultado });
    } catch (erro) {
        addLog('ERROR', `[MERGE] Falha ao marcar T#${id}: ${erro.message}`);
        res.status(500).json({ error: erro.message });
    }
});

// Utilitário para abrir o TortoiseSVN (Log ou Diff)
app.post('/open-tortoise', async (req, res) => {
    const { command, path: alvo, path2 } = req.body;

    const cmdType = command || 'log';
    const args = [`/command:${cmdType}`, `/path:${alvo}`];
    if (path2) args.push(`/path2:${path2}`);

    addLog('INFO', `[TORTOISE] Abrindo: ${cmdType} em ${alvo}`);

    try {
        await abrirTortoise(args);
        res.json({ success: true });
    } catch (erro) {
        res.status(500).json({ success: false, error: erro.message });
    }
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, '127.0.0.1', () => {
    addLog('INFO',`🚀 Servidor SVN Otimizado rodando em http://localhost:${PORT}`);
});
