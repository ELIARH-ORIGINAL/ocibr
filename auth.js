// ELIARH — Esqueleto de conexão Supabase
// ocibr.com.br — base para todos os projetos

const SUPABASE_URL = Netlify.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Netlify.env.get('SUPABASE_ANON_KEY');

// Função auxiliar — chama o Supabase REST API
async function supabase(path, method = 'GET', body = null, token = null) {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`
  };

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${SUPABASE_URL}${path}`, options);
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

// Função auxiliar — chama o Supabase Auth API
async function supabaseAuth(path, body) {
  const res = await fetch(`${SUPABASE_URL.replace('/rest/v1', '')}/auth/v1${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

export default async (req) => {
  const { action, email, password, nome, tipo } = await req.json();

  // ── CADASTRO ──────────────────────────────────────────
  if (action === 'cadastro') {
    // 1. Cria usuário no Supabase Auth
    const authResult = await supabaseAuth('/signup', {
      email,
      password,
      data: { nome, tipo: tipo || 'comum' }
    });

    if (!authResult.ok) {
      return new Response(JSON.stringify({
        erro: authResult.data.message || 'Erro ao cadastrar'
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      sucesso: true,
      mensagem: 'Cadastro realizado. Verifique seu e-mail para confirmar.'
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // ── LOGIN ─────────────────────────────────────────────
  if (action === 'login') {
    const authResult = await supabaseAuth('/token?grant_type=password', {
      email,
      password
    });

    if (!authResult.ok) {
      return new Response(JSON.stringify({
        erro: 'E-mail ou senha incorretos'
      }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      sucesso: true,
      token: authResult.data.access_token,
      usuario: authResult.data.user
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // ── VERIFICAR TOKEN ───────────────────────────────────
  if (action === 'verificar') {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ erro: 'Token não fornecido' }), {
        status: 401, headers: { 'Content-Type': 'application/json' }
      });
    }

    const userResult = await fetch(`${SUPABASE_URL.replace('/rest/v1', '')}/auth/v1/user`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`
      }
    });

    const userData = await userResult.json();

    if (!userResult.ok) {
      return new Response(JSON.stringify({ erro: 'Token inválido' }), {
        status: 401, headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      sucesso: true,
      usuario: userData
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ erro: 'Ação não reconhecida' }), {
    status: 400, headers: { 'Content-Type': 'application/json' }
  });
};

export const config = {
  path: '/api/auth'
};
