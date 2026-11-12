const API = '/api/admin';
const app = document.getElementById('app');
let adminAtual = null;
let diasSelecionados = 30;

function elemento(nome, classe, texto) {
  const no = document.createElement(nome);
  if (classe) no.className = classe;
  if (texto != null) no.textContent = texto;
  return no;
}

async function requisicao(caminho, opcoes = {}) {
  const resposta = await fetch(`${API}${caminho}`, {
    credentials: 'same-origin',
    ...opcoes,
    headers: {
      ...(opcoes.body ? { 'Content-Type': 'application/json' } : {}),
      ...opcoes.headers,
    },
  });
  if (resposta.status === 204) return null;
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(dados.mensagem || 'Não foi possível concluir a operação.');
  return dados;
}

function mostrarErro(container, mensagem) {
  const alerta = elemento('p', 'notice notice-error', mensagem);
  container.prepend(alerta);
}

function mostrarSucesso(container, mensagem) {
  const alerta = elemento('p', 'notice notice-success', mensagem);
  container.prepend(alerta);
}

function criarFormularioLogin() {
  app.replaceChildren();
  const card = elemento('section', 'auth-card');
  card.append(
    elemento('div', 'brand-mark', '🐾'),
    elemento('p', 'eyebrow', 'ÁREA RESTRITA'),
    elemento('h1', '', 'Painel PetWanted'),
    elemento('p', 'muted', 'Entre com uma conta administrativa autorizada.')
  );
  const form = elemento('form', 'form-stack');
  const emailLabel = elemento('label', '', 'E-mail');
  const email = elemento('input');
  email.type = 'email';
  email.name = 'email';
  email.autocomplete = 'username';
  email.required = true;
  emailLabel.append(email);
  const senhaLabel = elemento('label', '', 'Senha');
  const senha = elemento('input');
  senha.type = 'password';
  senha.name = 'senha';
  senha.autocomplete = 'current-password';
  senha.required = true;
  senhaLabel.append(senha);
  const status = elemento('div', 'form-status');
  const submit = elemento('button', 'button button-primary', 'Entrar');
  submit.type = 'submit';
  form.append(emailLabel, senhaLabel, status, submit);
  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    status.replaceChildren();
    submit.disabled = true;
    try {
      const resultado = await requisicao('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.value, senha: senha.value }),
      });
      adminAtual = resultado.admin;
      await mostrarPainel();
    } catch (erro) {
      mostrarErro(status, erro.message);
    } finally {
      submit.disabled = false;
    }
  });
  card.append(form);
  app.append(card);
}

function criarFormularioConvite(token) {
  app.replaceChildren();
  const card = elemento('section', 'auth-card');
  card.append(
    elemento('div', 'brand-mark', '🐾'),
    elemento('p', 'eyebrow', 'CONVITE ADMINISTRATIVO'),
    elemento('h1', '', 'Ative seu acesso'),
    elemento('p', 'muted', 'Crie uma senha com pelo menos 12 caracteres e no máximo 72 bytes. O convite pode ser usado uma única vez.')
  );
  const form = elemento('form', 'form-stack');
  const senhaLabel = elemento('label', '', 'Nova senha');
  const senha = elemento('input');
  senha.type = 'password';
  senha.minLength = 12;
  senha.maxLength = 72;
  senha.autocomplete = 'new-password';
  senha.required = true;
  senhaLabel.append(senha);
  const confirmacaoLabel = elemento('label', '', 'Confirme a senha');
  const confirmacao = elemento('input');
  confirmacao.type = 'password';
  confirmacao.minLength = 12;
  confirmacao.maxLength = 72;
  confirmacao.autocomplete = 'new-password';
  confirmacao.required = true;
  confirmacaoLabel.append(confirmacao);
  const status = elemento('div', 'form-status');
  const submit = elemento('button', 'button button-primary', 'Ativar conta');
  submit.type = 'submit';
  form.append(senhaLabel, confirmacaoLabel, status, submit);
  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    status.replaceChildren();
    if (senha.value !== confirmacao.value) {
      mostrarErro(status, 'As senhas não coincidem.');
      return;
    }
    submit.disabled = true;
    try {
      await requisicao('/auth/aceitar-convite', {
        method: 'POST',
        body: JSON.stringify({ token, senha: senha.value }),
      });
      history.replaceState(null, '', location.pathname);
      mostrarSucesso(status, 'Conta criada. Agora entre com seu e-mail e senha.');
      window.setTimeout(criarFormularioLogin, 1800);
    } catch (erro) {
      mostrarErro(status, erro.message);
    } finally {
      submit.disabled = false;
    }
  });
  card.append(form);
  app.append(card);
}

function criarCartao(titulo, valor, detalhe) {
  const card = elemento('article', 'metric-card');
  card.append(
    elemento('p', 'metric-label', titulo),
    elemento('strong', 'metric-value', valor),
    elemento('p', 'metric-detail', detalhe || '')
  );
  return card;
}

function formatarNumero(valor) {
  return new Intl.NumberFormat('pt-BR').format(Number(valor) || 0);
}

async function carregarEstatisticas(container) {
  container.replaceChildren(elemento('p', 'muted', 'Carregando estatísticas…'));
  try {
    const stats = await requisicao(`/estatisticas?dias=${diasSelecionados}`);
    container.replaceChildren();

    const secaoUsuarios = elemento('section', 'dashboard-section');
    secaoUsuarios.append(elemento('h2', '', 'Comunidade'));
    const usuariosGrid = elemento('div', 'metric-grid');
    usuariosGrid.append(
      criarCartao('Usuários cadastrados', formatarNumero(stats.usuarios.total), 'Contas registradas no app'),
      criarCartao('Usuários ativos', formatarNumero(stats.usuarios.ativosUltimos30Dias), 'Atividade autenticada nos últimos 30 dias')
    );
    secaoUsuarios.append(usuariosGrid);

    const secaoAnimais = elemento('section', 'dashboard-section');
    secaoAnimais.append(elemento('h2', '', 'Anúncios e animais'));
    const animaisGrid = elemento('div', 'metric-grid');
    animaisGrid.append(
      criarCartao('Registros no banco', formatarNumero(stats.animais.total), 'Anúncios atualmente armazenados'),
      criarCartao('Anúncios ativos', formatarNumero(stats.animais.ativos), 'Perdidos, encontrados e adoções ativos'),
      criarCartao('Perdidos ativos', formatarNumero(stats.animais.perdidos_ativos)),
      criarCartao('Encontrados ativos', formatarNumero(stats.animais.encontrados_ativos)),
      criarCartao('Adoções ativas', formatarNumero(stats.animais.adocoes_ativas)),
      criarCartao('Reunidos com tutor', formatarNumero(stats.animais.reunidos)),
      criarCartao('Adotados', formatarNumero(stats.animais.adotados)),
      criarCartao('Concluídos', formatarNumero(stats.animais.concluidos), 'Reunidos com tutor ou adotados')
    );
    secaoAnimais.append(animaisGrid);

    const secaoMatches = elemento('section', 'dashboard-section');
    secaoMatches.append(elemento('h2', '', 'Qualidade dos matches de IA'));
    const matchesGrid = elemento('div', 'metric-grid');
    const precisao = stats.matches.precisaoComFeedback == null
      ? 'Sem dados'
      : `${stats.matches.precisaoComFeedback}%`;
    matchesGrid.append(
      criarCartao('Matches gerados', formatarNumero(stats.matches.geradosNoPeriodo), `Nos últimos ${stats.periodoDias} dias`),
      criarCartao('Pendentes', formatarNumero(stats.matches.pendentes), 'Aguardando decisão do tutor'),
      criarCartao('Confirmados', formatarNumero(stats.matches.confirmados), 'Tutor confirmou o match'),
      criarCartao('Rejeitados', formatarNumero(stats.matches.rejeitados), 'Tutor indicou que não era o animal'),
      criarCartao('Precisão com feedback', precisao, `${formatarNumero(stats.matches.avaliados)} respostas consideradas`),
      criarCartao('Taxa de rejeição', stats.matches.taxaRejeicao == null ? 'Sem dados' : `${stats.matches.taxaRejeicao}%`, 'Entre matches com resposta')
    );
    secaoMatches.append(matchesGrid);

    const nota = elemento('p', 'notice notice-info', stats.definicoes.limitacao);
    secaoMatches.append(nota);
    const tabelaFaixas = elemento('div', 'table-wrap');
    const tabela = elemento('table');
    const cabecalho = elemento('thead');
    const linhaCabecalho = elemento('tr');
    ['Pontuação IA', 'Confirmados', 'Rejeitados', 'Respostas'].forEach((titulo) => {
      linhaCabecalho.append(elemento('th', '', titulo));
    });
    cabecalho.append(linhaCabecalho);
    const corpo = elemento('tbody');
    stats.matches.porFaixaPontuacao.forEach((faixa) => {
      const linha = elemento('tr');
      [faixa.faixa, formatarNumero(faixa.confirmados), formatarNumero(faixa.rejeitados), formatarNumero(faixa.avaliados)]
        .forEach((valor) => linha.append(elemento('td', '', valor)));
      corpo.append(linha);
    });
    tabela.append(cabecalho, corpo);
    tabelaFaixas.append(tabela);
    secaoMatches.append(elemento('h3', '', 'Resultado por faixa de pontuação'), tabelaFaixas);

    container.append(secaoUsuarios, secaoAnimais, secaoMatches);
  } catch (erro) {
    container.replaceChildren();
    mostrarErro(container, erro.message);
  }
}

function seletorPeriodo(onChange) {
  const grupo = elemento('label', 'period-control', 'Período dos matches');
  const select = elemento('select');
  [
    ['7', '7 dias'],
    ['30', '30 dias'],
    ['90', '90 dias'],
    ['365', '12 meses'],
  ].forEach(([valor, rotulo]) => {
    const opcao = elemento('option', '', rotulo);
    opcao.value = valor;
    opcao.selected = Number(valor) === diasSelecionados;
    select.append(opcao);
  });
  select.addEventListener('change', () => {
    diasSelecionados = Number(select.value);
    onChange();
  });
  grupo.append(select);
  return grupo;
}

async function carregarAdministradores(container) {
  container.replaceChildren(elemento('p', 'muted', 'Carregando administradores…'));
  try {
    const dados = await requisicao('/administradores');
    container.replaceChildren();
    const conviteCard = elemento('section', 'panel-card');
    conviteCard.append(elemento('h2', '', 'Convidar administrador'));
    const form = elemento('form', 'invite-form');
    const email = elemento('input');
    email.type = 'email';
    email.placeholder = 'E-mail da pessoa';
    email.required = true;
    const role = elemento('select');
    [['analyst', 'Analista (estatísticas)'], ['owner', 'Owner (gerencia admins)']].forEach(([valor, rotulo]) => {
      const opcao = elemento('option', '', rotulo);
      opcao.value = valor;
      role.append(opcao);
    });
    const submit = elemento('button', 'button button-primary', 'Enviar convite');
    submit.type = 'submit';
    const status = elemento('div', 'form-status');
    form.append(email, role, submit);
    form.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      status.replaceChildren();
      submit.disabled = true;
      try {
        const resultado = await requisicao('/administradores/convites', {
          method: 'POST',
          body: JSON.stringify({ email: email.value, role: role.value }),
        });
        mostrarSucesso(status, resultado.mensagem);
        email.value = '';
        await carregarAdministradores(container);
      } catch (erro) {
        mostrarErro(status, erro.message);
      } finally {
        submit.disabled = false;
      }
    });
    conviteCard.append(form, status);
    container.append(conviteCard);

    const tabelaAdmins = elemento('section', 'panel-card');
    tabelaAdmins.append(elemento('h2', '', 'Administradores'));
    const table = elemento('table');
    const head = elemento('thead');
    const headRow = elemento('tr');
    ['E-mail', 'Acesso', 'Estado', ''].forEach((label) => headRow.append(elemento('th', '', label)));
    head.append(headRow);
    const body = elemento('tbody');
    dados.administradores.forEach((admin) => {
      const row = elemento('tr');
      row.append(elemento('td', '', admin.email));
      const roleCell = elemento('td');
      const roleSelect = elemento('select');
      [['analyst', 'Analista'], ['owner', 'Owner']].forEach(([value, label]) => {
        const option = elemento('option', '', label);
        option.value = value;
        option.selected = admin.role === value;
        roleSelect.append(option);
      });
      roleCell.append(roleSelect);
      const stateCell = elemento('td');
      const activeLabel = elemento('label', 'checkbox-label', admin.ativo ? 'Ativo' : 'Desativado');
      const active = elemento('input');
      active.type = 'checkbox';
      active.checked = admin.ativo;
      activeLabel.prepend(active);
      stateCell.append(activeLabel);
      const actions = elemento('td');
      const save = elemento('button', 'button button-secondary button-small', 'Salvar');
      save.type = 'button';
      const proprio = Number(admin.id) === Number(adminAtual.id);
      roleSelect.disabled = proprio;
      active.disabled = proprio;
      save.disabled = proprio;
      save.addEventListener('click', async () => {
        save.disabled = true;
        try {
          await requisicao(`/administradores/${admin.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ role: roleSelect.value, ativo: active.checked }),
          });
          mostrarSucesso(container, 'Permissões atualizadas.');
          await carregarAdministradores(container);
        } catch (erro) {
          mostrarErro(container, erro.message);
          save.disabled = false;
        }
      });
      actions.append(save);
      row.append(roleCell, stateCell, actions);
      body.append(row);
    });
    table.append(head, body);
    const adminsWrap = elemento('div', 'table-wrap');
    adminsWrap.append(table);
    tabelaAdmins.append(adminsWrap);
    container.append(tabelaAdmins);

    const convites = elemento('section', 'panel-card');
    convites.append(elemento('h2', '', 'Convites pendentes'));
    if (!dados.convites.length) {
      convites.append(elemento('p', 'muted', 'Nenhum convite pendente.'));
    } else {
      const lista = elemento('ul', 'invite-list');
      dados.convites.forEach((item) => {
        const data = new Date(item.expira_em).toLocaleString('pt-BR');
        lista.append(elemento('li', '', `${item.email} · ${item.role === 'owner' ? 'Owner' : 'Analista'} · expira ${data}`));
      });
      convites.append(lista);
    }
    container.append(convites);

    const auditoria = elemento('section', 'panel-card');
    auditoria.append(elemento('h2', '', 'Atividade administrativa'));
    const registros = await requisicao('/auditoria');
    if (!registros.registros.length) {
      auditoria.append(elemento('p', 'muted', 'Ainda não há ações administrativas registradas.'));
    } else {
      const lista = elemento('ul', 'invite-list');
      registros.registros.forEach((item) => {
        const data = new Date(item.criado_em).toLocaleString('pt-BR');
        lista.append(elemento('li', '', `${data} · ${item.admin_email || 'Admin removido'} · ${item.acao}${item.email_alvo ? ` · ${item.email_alvo}` : ''}`));
      });
      auditoria.append(lista);
    }
    container.append(auditoria);
  } catch (erro) {
    container.replaceChildren();
    mostrarErro(container, erro.message);
  }
}

async function mostrarPainel() {
  if (!adminAtual) {
    const sessao = await requisicao('/auth/me');
    adminAtual = sessao.admin;
  }
  app.replaceChildren();
  const shell = elemento('div', 'dashboard-shell');
  const header = elemento('header', 'dashboard-header');
  const brand = elemento('div', 'dashboard-brand');
  brand.append(elemento('span', 'brand-mark brand-mark-small', '🐾'), elemento('span', '', 'PetWanted < Admin'));
  const conta = elemento('div', 'account-actions');
  conta.append(
    elemento('span', 'account-email', adminAtual.email),
    elemento('span', 'role-badge', adminAtual.role === 'owner' ? 'Owner' : 'Analista')
  );
  const sair = elemento('button', 'button button-secondary button-small', 'Sair');
  sair.addEventListener('click', async () => {
    await requisicao('/auth/logout', { method: 'POST' }).catch(() => {});
    adminAtual = null;
    criarFormularioLogin();
  });
  conta.append(sair);
  header.append(brand, conta);

  const nav = elemento('nav', 'tabs');
  const content = elemento('div', 'dashboard-content');
  const secaoStats = elemento('div');
  const tituloStats = elemento('div', 'section-heading');
  tituloStats.append(elemento('div', '', ''));
  const seletor = seletorPeriodo(() => carregarEstatisticas(secaoStats));
  tituloStats.replaceChildren(elemento('div', 'heading-copy'));
  tituloStats.firstChild.append(elemento('p', 'eyebrow', 'VISÃO GERAL'), elemento('h1', '', 'Estatísticas do app'));
  tituloStats.append(seletor);
  secaoStats.append(tituloStats);

  const mudarAba = (aba) => {
    nav.querySelectorAll('button').forEach((botao) => {
      botao.classList.toggle('tab-active', botao.dataset.aba === aba);
    });
    content.replaceChildren();
    if (aba === 'stats') {
      content.append(secaoStats);
      carregarEstatisticas(secaoStats);
    } else {
      const admins = elemento('div', 'admin-content');
      admins.append(
        elemento('p', 'eyebrow', 'ACESSO E SEGURANÇA'),
        elemento('h1', '', 'Administradores e auditoria')
      );
      content.append(admins);
      carregarAdministradores(admins);
    }
  };
  const criarTab = (id, texto) => {
    const button = elemento('button', 'tab', texto);
    button.type = 'button';
    button.dataset.aba = id;
    button.addEventListener('click', () => mudarAba(id));
    nav.append(button);
  };
  criarTab('stats', 'Estatísticas');
  if (adminAtual.role === 'owner') criarTab('admins', 'Administradores');
  shell.append(header, nav, content);
  app.append(shell);
  mudarAba('stats');
}

async function iniciar() {
  const convite = new URLSearchParams(location.hash.slice(1)).get('convite');
  if (convite) {
    criarFormularioConvite(convite);
    return;
  }

  try {
    const sessao = await requisicao('/auth/me');
    adminAtual = sessao.admin;
    await mostrarPainel();
  } catch (erro) {
    criarFormularioLogin();
  }
}

iniciar();
