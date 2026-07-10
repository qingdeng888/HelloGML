// @ts-nocheck
export function getAdminPanelHTML(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GLM-Free-API 管理面板</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Noto+Serif+SC:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --parchment: #f3ead6;
    --parchment-light: #faf5eb;
    --parchment-dark: #e8dcc4;
    --ink: #3d2b1f;
    --ink-light: #6b5344;
    --ink-faint: #9c8b7a;
    --gold: #c9a96e;
    --gold-light: #dcc092;
    --gold-dark: #a0824a;
    --sepia: #8b6914;
    --crimson: #8b3a3a;
    --green: #5a7d4a;
    --border: #d4c5a9;
    --shadow: rgba(61, 43, 31, 0.12);
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Noto Serif SC', Georgia, serif;
    background-color: var(--parchment);
    color: var(--ink);
    min-height: 100vh;
    line-height: 1.7;
    background-image:
      url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E");
  }

  .container { max-width: 960px; margin: 0 auto; padding: 2rem 1.5rem; }

  /* Header */
  .header {
    text-align: center;
    padding: 3rem 1rem 2rem;
    position: relative;
  }
  .header::before, .header::after {
    content: '';
    display: block;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--gold), transparent);
    margin: 1.2rem auto;
    max-width: 320px;
  }
  .header h1 {
    font-family: 'Cinzel', 'Noto Serif SC', serif;
    font-size: 1.9rem;
    font-weight: 600;
    color: var(--ink);
    letter-spacing: 0.12em;
  }
  .header .subtitle {
    font-size: 0.85rem;
    color: var(--ink-faint);
    margin-top: 0.4rem;
    font-style: italic;
  }

  /* Cards */
  .card {
    background: var(--parchment-light);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 1.8rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 4px 24px var(--shadow);
    position: relative;
  }
  .card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--gold-dark), var(--gold), var(--gold-dark));
    opacity: 0.6;
  }
  .card-title {
    font-family: 'Cinzel', 'Noto Serif SC', serif;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--ink);
    margin-bottom: 1.2rem;
    padding-bottom: 0.6rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  /* Navigation */
  .nav {
    display: flex;
    gap: 0.4rem;
    margin-bottom: 2rem;
    border-bottom: 1px solid var(--border);
    padding-bottom: 0;
  }
  .nav-item {
    padding: 0.7rem 1.4rem;
    cursor: pointer;
    border: none;
    background: none;
    font-family: 'Noto Serif SC', serif;
    font-size: 0.95rem;
    color: var(--ink-faint);
    position: relative;
    transition: color 0.3s;
  }
  .nav-item:hover { color: var(--ink-light); }
  .nav-item.active {
    color: var(--ink);
    font-weight: 600;
  }
  .nav-item.active::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0; right: 0;
    height: 2px;
    background: var(--gold);
  }

  /* Stats Grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.2rem;
    margin-bottom: 2rem;
  }
  .stat-item {
    background: linear-gradient(160deg, var(--parchment-light) 0%, var(--parchment-dark) 100%);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 1.4rem 1.2rem;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .stat-item::after {
    content: '';
    position: absolute;
    top: -50%; right: -50%;
    width: 100%; height: 100%;
    background: radial-gradient(circle, var(--gold-light) 0%, transparent 70%);
    opacity: 0.08;
  }
  .stat-value {
    font-family: 'Cinzel', serif;
    font-size: 2rem;
    font-weight: 700;
    color: var(--sepia);
    line-height: 1;
  }
  .stat-label {
    font-size: 0.8rem;
    color: var(--ink-faint);
    margin-top: 0.4rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.6rem 1.2rem;
    border-radius: 3px;
    border: 1px solid transparent;
    font-family: 'Noto Serif SC', serif;
    font-size: 0.88rem;
    cursor: pointer;
    transition: all 0.25s ease;
    text-decoration: none;
  }
  .btn-primary {
    background: linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%);
    color: #fff;
    border-color: var(--gold-dark);
    box-shadow: 0 2px 8px rgba(139, 105, 20, 0.25);
  }
  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(139, 105, 20, 0.35);
  }
  .btn-secondary {
    background: transparent;
    color: var(--ink-light);
    border-color: var(--border);
  }
  .btn-secondary:hover {
    background: var(--parchment-dark);
    border-color: var(--gold);
  }
  .btn-danger {
    background: transparent;
    color: var(--crimson);
    border-color: #c9a0a0;
  }
  .btn-danger:hover {
    background: rgba(139, 58, 58, 0.06);
  }
  .btn-sm { padding: 0.35rem 0.8rem; font-size: 0.8rem; }

  /* Table */
  .table-wrap { overflow-x: auto; }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }
  th, td {
    padding: 0.85rem 1rem;
    text-align: left;
    border-bottom: 1px solid var(--border);
  }
  th {
    font-weight: 600;
    color: var(--ink-light);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    background: var(--parchment-dark);
  }
  tr:hover td { background: rgba(201, 169, 110, 0.06); }
  .key-mask {
    font-family: monospace;
    font-size: 0.85rem;
    color: var(--ink-faint);
    background: var(--parchment-dark);
    padding: 0.2rem 0.5rem;
    border-radius: 3px;
    border: 1px solid var(--border);
  }

  /* Form */
  .form-group { margin-bottom: 1.2rem; }
  .form-label {
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--ink-light);
    margin-bottom: 0.4rem;
  }
  .form-input, .form-textarea {
    width: 100%;
    padding: 0.7rem 0.9rem;
    border: 1px solid var(--border);
    border-radius: 3px;
    background: var(--parchment-light);
    color: var(--ink);
    font-family: 'Noto Serif SC', serif;
    font-size: 0.9rem;
    transition: border-color 0.3s, box-shadow 0.3s;
  }
  .form-input:focus, .form-textarea:focus {
    outline: none;
    border-color: var(--gold);
    box-shadow: 0 0 0 3px rgba(201, 169, 110, 0.15);
  }
  .form-textarea { min-height: 100px; resize: vertical; }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(61, 43, 31, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s;
  }
  .modal-overlay.show { opacity: 1; pointer-events: auto; }
  .modal {
    background: var(--parchment-light);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 2rem;
    max-width: 440px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(61, 43, 31, 0.25);
    position: relative;
  }
  .modal::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 4px;
    background: linear-gradient(90deg, var(--gold-dark), var(--gold), var(--gold-dark));
  }
  .modal-title {
    font-family: 'Cinzel', 'Noto Serif SC', serif;
    font-size: 1.2rem;
    margin-bottom: 1.2rem;
    text-align: center;
  }

  /* Toast */
  .toast-container {
    position: fixed;
    top: 1.5rem;
    right: 1.5rem;
    z-index: 200;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .toast {
    padding: 0.8rem 1.2rem;
    border-radius: 4px;
    font-size: 0.9rem;
    box-shadow: 0 4px 16px var(--shadow);
    animation: slideIn 0.35s ease;
    border-left: 3px solid;
    max-width: 320px;
  }
  .toast.success { background: var(--parchment-light); border-color: var(--green); color: var(--green); }
  .toast.error { background: var(--parchment-light); border-color: var(--crimson); color: var(--crimson); }
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  /* Status badge */
  .badge {
    display: inline-block;
    padding: 0.2rem 0.6rem;
    border-radius: 2px;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.04em;
  }
  .badge-online { background: rgba(90, 125, 74, 0.12); color: var(--green); border: 1px solid rgba(90, 125, 74, 0.25); }
  .badge-offline { background: rgba(139, 58, 58, 0.08); color: var(--crimson); border: 1px solid rgba(139, 58, 58, 0.2); }
  .badge-unknown { background: rgba(156, 139, 122, 0.12); color: var(--ink-faint); border: 1px solid rgba(156, 139, 122, 0.2); }

  /* Guide section */
  .code-block {
    background: #2d2419;
    color: #e8dcc4;
    padding: 1rem;
    border-radius: 4px;
    font-family: 'SF Mono', Monaco, monospace;
    font-size: 0.82rem;
    overflow-x: auto;
    line-height: 1.6;
    border: 1px solid #4a3f2f;
  }
  .code-block .comment { color: #8b7d6b; }
  .code-block .string { color: #c9a96e; }
  .code-block .keyword { color: #d4a5a5; }

  /* Loading spinner */
  .spinner {
    width: 16px; height: 16px;
    border: 2px solid var(--border);
    border-top-color: var(--gold);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    display: inline-block;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .hidden { display: none !important; }
  .section { display: none; }
  .section.active { display: block; animation: fadeIn 0.4s ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

  /* Responsive */
  @media (max-width: 640px) {
    .header h1 { font-size: 1.4rem; }
    .nav { overflow-x: auto; }
    .stats-grid { grid-template-columns: 1fr; }
    .card { padding: 1.2rem; }
  }

  /* Toggle Switch */
  .toggle-wrap { display: flex; align-items: center; justify-content: space-between; padding: 1rem 0; }
  .toggle-info { flex: 1; }
  .toggle-info h4 { margin: 0 0 4px; font-size: 0.95rem; font-weight: 600; color: var(--ink); }
  .toggle-info p { margin: 0; font-size: 0.82rem; color: var(--ink-faint); }
  .toggle-switch { position: relative; width: 48px; height: 26px; flex-shrink: 0; margin-left: 1rem; }
  .toggle-switch input { opacity: 0; width: 0; height: 0; }
  .toggle-slider { position: absolute; cursor: pointer; inset: 0; background: var(--border); border-radius: 26px; transition: background 0.3s; }
  .toggle-slider::before { content: ''; position: absolute; height: 20px; width: 20px; left: 3px; bottom: 3px; background: #fff; border-radius: 50%; transition: transform 0.3s; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
  .toggle-switch input:checked + .toggle-slider { background: var(--green); }
  .toggle-switch input:checked + .toggle-slider::before { transform: translateX(22px); }
</style>
</head>
<body>

<!-- Toast Container -->
<div class="toast-container" id="toastContainer"></div>

<!-- Login Modal -->
<div class="modal-overlay" id="loginModal">
  <div class="modal">
    <div class="modal-title">管理面板登录</div>
    <p style="text-align:center;color:var(--ink-faint);font-size:0.85rem;margin-bottom:1.5rem;">请输入您的 Admin Key 以继续</p>
    <div class="form-group">
      <input type="password" class="form-input" id="adminKeyInput" placeholder="Admin Key" onkeydown="if(event.key==='Enter')doLogin()">
    </div>
    <button class="btn btn-primary" style="width:100%" onclick="doLogin()">进入面板</button>
    <p id="loginError" style="color:var(--crimson);text-align:center;font-size:0.85rem;margin-top:0.8rem;display:none;">认证失败，请检查 Admin Key</p>
  </div>
</div>

<div class="container">

  <!-- Header -->
  <div class="header">
    <h1>GLM-Free-API</h1>
    <div class="subtitle">管理控制台 &middot; Management Console</div>
  </div>

  <!-- Navigation -->
  <div class="nav">
    <button class="nav-item active" onclick="showSection('dashboard')">概览</button>
    <button class="nav-item" onclick="showSection('apikeys')">API Key</button>
    <button class="nav-item" onclick="showSection('tokens')">Token 池</button>
    <button class="nav-item" onclick="showSection('usage')">用量统计</button>
    <button class="nav-item" onclick="showSection('settings')">设置</button>
    <button class="nav-item" onclick="showSection('guide')">使用指南</button>
  </div>

  <!-- Dashboard Section -->
  <div class="section active" id="section-dashboard">
    <div class="stats-grid">
      <div class="stat-item">
        <div class="stat-value" id="statApiKeyCount">-</div>
        <div class="stat-label">API Key</div>
      </div>
      <div class="stat-item">
        <div class="stat-value" id="statTokenCount">-</div>
        <div class="stat-label">Token 池</div>
      </div>
      <div class="stat-item">
        <div class="stat-value" style="font-size:1.3rem;padding-top:0.4rem;" id="statStatus">检测中</div>
        <div class="stat-label">服务状态</div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-item">
        <div class="stat-value" id="statTotalRequests">-</div>
        <div class="stat-label">累计请求数</div>
      </div>
      <div class="stat-item">
        <div class="stat-value" id="statTotalInputTokens">-</div>
        <div class="stat-label">累计输入 Token</div>
      </div>
      <div class="stat-item">
        <div class="stat-value" id="statTotalOutputTokens">-</div>
        <div class="stat-label">累计输出 Token</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">服务信息</div>
      <div style="display:grid;grid-template-columns:auto 1fr;gap:0.6rem 1.2rem;font-size:0.9rem;">
        <span style="color:var(--ink-faint)">Worker 地址</span>
        <span id="workerUrl" style="font-family:monospace;font-size:0.85rem;">-</span>
        <span style="color:var(--ink-faint)">调度策略</span>
        <span>智能轮询（LRU + 频率保护 + 失败退避）</span>
        <span style="color:var(--ink-faint)">用量统计</span>
        <span>双维度 · API Key + GLM Cookie · 按日聚合</span>
        <span style="color:var(--ink-faint)">管理接口</span>
        <span><span class="badge badge-online">受保护</span> 需 X-Admin-Key</span>
        <span style="color:var(--ink-faint)">协议兼容</span>
        <span>OpenAI / Claude / Gemini</span>
      </div>
    </div>
  </div>

  <!-- API Keys Section -->
  <div class="section" id="section-apikeys">
    <div class="card">
      <div class="card-title">添加 API Key</div>
      <p style="color:var(--ink-faint);font-size:0.85rem;margin-bottom:1rem;">API Key 仅用于身份验证，所有 Key 共享同一个 Token 池。任意有效的 Key 均可调用服务。</p>
      <div class="form-group">
        <label class="form-label">API Key</label>
        <input type="text" class="form-input" id="newApiKey" placeholder="例如：sk-mykey123">
      </div>
      <div style="display:flex;gap:0.6rem;">
        <button class="btn btn-primary" onclick="addApiKey()">添加</button>
        <button class="btn btn-secondary" onclick="clearApiKeyForm()">清空</button>
      </div>
    </div>

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem;">
        <div class="card-title" style="margin:0;border:none;padding:0;">已配置 API Key</div>
        <button class="btn btn-secondary btn-sm" onclick="loadApiKeys()">刷新列表</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>API Key</th>
              <th style="text-align:right">请求数</th>
              <th style="text-align:right">输入 Token</th>
              <th style="text-align:right">输出 Token</th>
              <th>最后使用</th>
              <th style="text-align:right">操作</th>
            </tr>
          </thead>
          <tbody id="apiKeysTableBody">
            <tr><td colspan="6" style="text-align:center;color:var(--ink-faint)">加载中...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Token Pool Section -->
  <div class="section" id="section-tokens">
    <div class="card">
      <div class="card-title">手动添加 Token</div>
      <p style="color:var(--ink-faint);font-size:0.85rem;margin-bottom:1rem;">浏览器打开 <a href="https://chatglm.cn" target="_blank" style="color:var(--gold)">chatglm.cn</a> → F12 → Application → Cookies → 复制 <code>chatglm_refresh_token</code> 的值</p>
      <div class="form-group">
        <label class="form-label">Refresh Token</label>
        <textarea class="form-textarea" id="newRefreshToken" placeholder="粘贴智谱清言的 chatglm_refresh_token..."></textarea>
      </div>
      <div style="display:flex;gap:0.6rem;">
        <button class="btn btn-primary" onclick="addToken()">添加到池</button>
        <button class="btn btn-secondary" onclick="clearTokenForm()">清空</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">浏览器一键提取</div>
      <p style="color:var(--ink-faint);font-size:0.85rem;margin-bottom:1rem;">在 chatglm.cn 页面的控制台 (F12) 运行以下代码，自动提取并提交 Token：</p>
      <div class="code-block" id="consoleSnippet" style="cursor:pointer;position:relative;" onclick="copySnippet()">
        <span id="snippetContent"></span>
      </div>
      <div style="display:flex;gap:0.6rem;margin-top:0.8rem;">
        <button class="btn btn-secondary" onclick="copySnippet()">复制代码</button>
      </div>
      <div id="snippetStatus" style="display:none;margin-top:0.6rem;padding:0.6rem;border-radius:6px;font-size:0.85rem;"></div>
    </div>

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem;">
        <div class="card-title" style="margin:0;border:none;padding:0;">Token 池列表</div>
        <button class="btn btn-secondary btn-sm" onclick="loadTokens()">刷新列表</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Token 预览</th>
              <th>状态</th>
              <th style="text-align:right">请求数</th>
              <th style="text-align:right">输入 Token</th>
              <th style="text-align:right">输出 Token</th>
              <th>最后使用</th>
              <th style="text-align:right">操作</th>
            </tr>
          </thead>
          <tbody id="tokensTableBody">
            <tr><td colspan="8" style="text-align:center;color:var(--ink-faint)">加载中...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Usage Stats Section -->
  <div class="section" id="section-usage">
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem;flex-wrap:wrap;gap:0.6rem;">
        <div class="card-title" style="margin:0;border:none;padding:0;">按 API Key 维度</div>
        <div style="display:flex;gap:0.4rem;">
          <button class="btn btn-secondary btn-sm" onclick="loadUsageApiKeys()">刷新</button>
          <button class="btn btn-danger btn-sm" onclick="resetAllStats()">重置全部</button>
        </div>
      </div>
      <p style="color:var(--ink-faint);font-size:0.82rem;margin-bottom:0.8rem;">点击某行查看按日期的明细。Token 数为字符估算（GLM 网页 API 不返回真实用量）。</p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>API Key</th>
              <th style="text-align:right">请求</th>
              <th style="text-align:right">成功</th>
              <th style="text-align:right">失败</th>
              <th style="text-align:right">输入 Token</th>
              <th style="text-align:right">输出 Token</th>
              <th>最后使用</th>
            </tr>
          </thead>
          <tbody id="usageApiKeyTableBody">
            <tr><td colspan="7" style="text-align:center;color:var(--ink-faint)">加载中...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem;">
        <div class="card-title" style="margin:0;border:none;padding:0;">按 GLM Cookie (Token) 维度</div>
        <button class="btn btn-secondary btn-sm" onclick="loadUsageTokens()">刷新</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Token ID</th>
              <th>Cookie 预览</th>
              <th>状态</th>
              <th style="text-align:right">请求</th>
              <th style="text-align:right">成功</th>
              <th style="text-align:right">失败</th>
              <th style="text-align:right">输入 Token</th>
              <th style="text-align:right">输出 Token</th>
              <th>最后使用</th>
            </tr>
          </thead>
          <tbody id="usageTokenTableBody">
            <tr><td colspan="9" style="text-align:center;color:var(--ink-faint)">加载中...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card" id="usageDailyCard" style="display:none;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem;">
        <div class="card-title" style="margin:0;border:none;padding:0;" id="usageDailyTitle">明细</div>
        <button class="btn btn-secondary btn-sm" onclick="closeUsageDaily()">关闭</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>日期</th>
              <th style="text-align:right">请求</th>
              <th style="text-align:right">成功</th>
              <th style="text-align:right">失败</th>
              <th style="text-align:right">输入 Token</th>
              <th style="text-align:right">输出 Token</th>
            </tr>
          </thead>
          <tbody id="usageDailyTableBody"></tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Settings Section -->
  <div class="section" id="section-settings">
    <div class="card">
      <div class="card-title">运行时设置</div>
      <div class="toggle-wrap">
        <div class="toggle-info">
          <h4>自动删除会话</h4>
          <p>开启后，每次 API 请求完成（含流式回复结束）后自动删除智谱清言端的会话，防止多用户串台。</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="toggleAutoDelete" onchange="toggleAutoDelete(this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>
  </div>

  <!-- Guide Section -->
  <div class="section" id="section-guide">
    <div class="card">
      <div class="card-title">架构说明</div>
      <p style="color:var(--ink-light);margin-bottom:1rem;">
        本系统采用<strong>认证与资源分离</strong>的架构：
      </p>
      <ul style="color:var(--ink-light);padding-left:1.2rem;margin-bottom:1rem;">
        <li><strong>API Key</strong>：仅用于身份认证，证明你有权使用服务</li>
        <li><strong>Token 池</strong>：所有 refresh_token 组成一个共享池，系统按轮询策略自动选择可用账号</li>
      </ul>
      <p style="color:var(--ink-faint);font-size:0.85rem;">
        这意味着你可以为不同客户端分配不同的 API Key，但它们背后共享同一组智谱账号资源。
      </p>
    </div>

    <div class="card">
      <div class="card-title">OpenAI SDK 调用示例</div>
      <div class="code-block">
<span class="keyword">from</span> openai <span class="keyword">import</span> OpenAI

client = OpenAI(
    api_key=<span class="string">"your-api-key"</span>,
    base_url=<span class="string">"<span id="guideBaseUrl">https://your-domain/v1</span>"</span>
)

response = client.chat.completions.create(
    model=<span class="string">"glm-4.7"</span>,
    messages=[{<span class="string">"role"</span>: <span class="string">"user"</span>, <span class="string">"content"</span>: <span class="string">"你好"</span>}],
    stream=<span class="keyword">True</span>
)
<span class="keyword">for</span> chunk <span class="keyword">in</span> response:
    <span class="keyword">print</span>(chunk.choices[<span class="string">0</span>].delta.content <span class="keyword">or</span> <span class="string">""</span>, end=<span class="string">""</span>)
      </div>
    </div>

    <div class="card">
      <div class="card-title">curl 直接调用</div>
      <div class="code-block">
curl -X POST <span class="string">"<span id="guideCurlUrl">https://your-domain/v1/chat/completions</span>"</span> \\
  -H <span class="string">"Content-Type: application/json"</span> \\
  -H <span class="string">"Authorization: Bearer your-api-key"</span> \\
  -d <span class="string">'{"model":"glm-4.7","messages":[{"role":"user","content":"你好"}]}'</span>
      </div>
    </div>

    <div class="card">
      <div class="card-title">管理接口示例</div>
      <div class="code-block">
<span class="comment"># --- API Key 管理 ---</span>

<span class="comment"># 添加 API Key</span>
curl -X POST <span class="string">"<span class="guideAdminUrl">https://your-domain/admin/apikey</span>"</span> \\
  -H <span class="string">"X-Admin-Key: your-admin-key"</span> \\
  -d <span class="string">'{"api_key":"sk-mykey"}'</span>

<span class="comment"># 列出所有 API Key</span>
curl -X GET <span class="string">"<span class="guideAdminUrl">https://your-domain/admin/apikey</span>"</span> \\
  -H <span class="string">"X-Admin-Key: your-admin-key"</span>

<span class="comment"># 删除 API Key</span>
curl -X DELETE <span class="string">"<span class="guideAdminUrl">https://your-domain/admin/apikey</span>"</span> \\
  -H <span class="string">"X-Admin-Key: your-admin-key"</span> \\
  -d <span class="string">'{"api_key":"sk-mykey"}'</span>

<span class="comment"># --- Token 池管理 ---</span>

<span class="comment"># 添加 Token 到池子</span>
curl -X POST <span class="string">"<span class="guideAdminUrl">https://your-domain/admin/token</span>"</span> \\
  -H <span class="string">"X-Admin-Key: your-admin-key"</span> \\
  -d <span class="string">'{"refresh_token":"eyJ..."}'</span>

<span class="comment"># 列出 Token 池</span>
curl -X GET <span class="string">"<span class="guideAdminUrl">https://your-domain/admin/token</span>"</span> \\
  -H <span class="string">"X-Admin-Key: your-admin-key"</span>

<span class="comment"># 从池子删除 Token</span>
curl -X DELETE <span class="string">"<span class="guideAdminUrl">https://your-domain/admin/token</span>"</span> \\
  -H <span class="string">"X-Admin-Key: your-admin-key"</span> \\
  -d <span class="string">'{"id":"tk_xxx"}'</span>
      </div>
    </div>
  </div>

</div>

<!-- Footer -->
<div style="max-width:960px;margin:0 auto;padding:0 1.5rem 2rem;">
  <div style="border-top:1px solid var(--border);padding-top:1.2rem;text-align:center;font-size:0.8rem;color:var(--ink-faint);">
    <p style="margin-bottom:0.6rem;">
      <span style="font-family:'Cinzel',serif;letter-spacing:0.08em;">Friendly Links</span>
      <span style="margin:0 0.4rem;">&middot;</span>
      <span style="font-family:'Noto Serif SC',serif;">友链</span>
    </p>
    <a href="https://linux.do/" target="_blank" rel="noreferrer" style="color:var(--gold-dark);text-decoration:none;font-weight:600;transition:color 0.2s ease;" onmouseover="this.style.color='var(--sepia)'" onmouseout="this.style.color='var(--gold-dark)'">
      LinuxDO — 让我们在一起
    </a>
  </div>
</div>

<script>
(function() {
  const ADMIN_KEY_KEY = 'glm_admin_key';
  let adminKey = localStorage.getItem(ADMIN_KEY_KEY) || '';

  function getBaseUrl() {
    return location.origin;
  }

  function $(id) { return document.getElementById(id); }

  function showToast(message, type) {
    const container = $('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  async function api(path, opts) {
    const url = getBaseUrl() + path;
    const res = await fetch(url, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': adminKey,
        ...(opts.headers || {})
      }
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.message || '请求失败: ' + res.status);
    }
    return data;
  }

  window.showSection = function(name) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    $('section-' + name).classList.add('active');
    event.target.classList.add('active');
    if (name === 'apikeys') loadApiKeys();
    if (name === 'tokens') loadTokens();
    if (name === 'dashboard') loadDashboard();
    if (name === 'usage') loadUsage();
    if (name === 'settings') loadSettings();
  };
  
  window.doLogin = async function() {
    const input = $('adminKeyInput');
    const key = input.value.trim();
    if (!key) return;
    try {
      await api('/admin/apikey', { method: 'GET', headers: { 'X-Admin-Key': key } });
      adminKey = key;
      localStorage.setItem(ADMIN_KEY_KEY, adminKey);
      $('loginModal').classList.remove('show');
      showToast('登录成功', 'success');
      loadDashboard();
      updateSnippetUrl();
    } catch (e) {
      $('loginError').style.display = 'block';
      input.value = '';
    }
  };
  
  window.loadDashboard = async function() {
    $('workerUrl').textContent = getBaseUrl();
    try {
      const akData = await api('/admin/apikey', { method: 'GET' });
      const apiKeys = akData.keys || [];
      $('statApiKeyCount').textContent = apiKeys.length;
  
      const tkData = await api('/admin/token', { method: 'GET' });
      const tokens = tkData.tokens || [];
      $('statTokenCount').textContent = tokens.length;
      $('statStatus').innerHTML = '<span class="badge badge-online">运行中</span>';
    } catch (e) {
      $('statStatus').innerHTML = '<span class="badge badge-offline">异常</span>';
    }

    // 累计用量（用 token 维度汇总，与 server 的 getSummary 一致）
    try {
      const stData = await api('/admin/stats', { method: 'GET' });
      const sum = stData.summary || {};
      $('statTotalRequests').textContent = formatNum(sum.total_requests || 0);
      $('statTotalInputTokens').textContent = formatNum(sum.total_input_tokens || 0);
      $('statTotalOutputTokens').textContent = formatNum(sum.total_output_tokens || 0);
    } catch (e) {
      $('statTotalRequests').textContent = '-';
      $('statTotalInputTokens').textContent = '-';
      $('statTotalOutputTokens').textContent = '-';
    }
  };

  function formatNum(n) {
    if (n == null || isNaN(n)) return '0';
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(n);
  }

  function formatTime(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '—';
    const pad = function(n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  
  // ==================== API Key Management ====================
  
  window.loadApiKeys = async function() {
    const tbody = $('apiKeysTableBody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--ink-faint)">加载中...</td></tr>';
    try {
      const data = await api('/admin/apikey', { method: 'GET' });
      const keys = data.keys || [];
      if (keys.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--ink-faint)">暂无配置 API Key</td></tr>';
        return;
      }
      tbody.innerHTML = keys.map(function(k) {
        return '<tr data-key="' + k.api_key + '">' +
          '<td><span class="key-mask">' + maskKey(k.api_key) + '</span></td>' +
          '<td style="text-align:right">' + formatNum(k.total_requests || 0) + '</td>' +
          '<td style="text-align:right">' + formatNum(k.total_input_tokens || 0) + '</td>' +
          '<td style="text-align:right">' + formatNum(k.total_output_tokens || 0) + '</td>' +
          '<td style="color:var(--ink-faint);font-size:0.82rem;">' + formatTime(k.last_used) + '</td>' +
          '<td style="text-align:right">' +
            '<button class="btn btn-danger btn-sm" onclick="deleteApiKey(\\'' + k.api_key + '\\')">删除</button>' +
          '</td>' +
        '</tr>';
      }).join('');
    } catch (e) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--crimson)">加载失败: ' + e.message + '</td></tr>';
    }
  };
  
  window.addApiKey = async function() {
    const apiKey = $('newApiKey').value.trim();
    if (!apiKey) {
      showToast('请填写 API Key', 'error');
      return;
    }
    try {
      await api('/admin/apikey', { method: 'POST', body: JSON.stringify({ api_key: apiKey }) });
      showToast('API Key 添加成功', 'success');
      clearApiKeyForm();
      loadApiKeys();
      loadDashboard();
    } catch (e) {
      showToast('添加失败: ' + e.message, 'error');
    }
  };
  
  window.deleteApiKey = async function(apiKey) {
    if (!confirm('确定要删除 API Key "' + apiKey + '" 吗？此操作不可恢复。')) return;
    try {
      await api('/admin/apikey', { method: 'DELETE', body: JSON.stringify({ api_key: apiKey }) });
      showToast('删除成功', 'success');
      loadApiKeys();
      loadDashboard();
    } catch (e) {
      showToast('删除失败: ' + e.message, 'error');
    }
  };
  
  window.clearApiKeyForm = function() {
    $('newApiKey').value = '';
  };
  
  // ==================== Token Pool Management ====================
  
  window.loadTokens = async function() {
    const tbody = $('tokensTableBody');
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--ink-faint)">加载中...</td></tr>';
    try {
      const data = await api('/admin/token', { method: 'GET' });
      const tokens = data.tokens || [];
      if (tokens.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--ink-faint)">Token 池为空</td></tr>';
        return;
      }
      tbody.innerHTML = tokens.map(function(t) {
        return '<tr data-id="' + t.id + '">' +
          '<td><code style="font-size:0.8rem;background:var(--parchment-dark);padding:2px 6px;border-radius:3px;">' + t.id + '</code></td>' +
          '<td><span class="key-mask">' + t.token_preview + '</span></td>' +
          '<td><span class="badge badge-unknown token-status-badge">未检测</span></td>' +
          '<td style="text-align:right">' + formatNum(t.total_requests || 0) + '</td>' +
          '<td style="text-align:right">' + formatNum(t.total_input_tokens || 0) + '</td>' +
          '<td style="text-align:right">' + formatNum(t.total_output_tokens || 0) + '</td>' +
          '<td style="color:var(--ink-faint);font-size:0.82rem;">' + formatTime(t.last_used) + '</td>' +
          '<td style="text-align:right">' +
            '<button class="btn btn-secondary btn-sm" onclick="checkToken(\\'' + t.id + '\\', this)">检测</button>' +
            '<button class="btn btn-danger btn-sm" onclick="deleteToken(\\'' + t.id + '\\')">删除</button>' +
          '</td>' +
        '</tr>';
      }).join('');
    } catch (e) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--crimson)">加载失败: ' + e.message + '</td></tr>';
    }
  };

  window.checkToken = async function(id, btn) {
    const originalText = btn.textContent;
    btn.innerHTML = '<span class="spinner"></span>';
    btn.disabled = true;
    try {
      const data = await api('/admin/token/check', { method: 'POST', body: JSON.stringify({ id: id }) });
      updateTokenStatusBadge(id, data.live ? 'online' : 'offline');
      showToast(data.live ? 'Token 有效' : 'Token 已失效', data.live ? 'success' : 'error');
    } catch (e) {
      updateTokenStatusBadge(id, 'offline');
      showToast('检测失败: ' + e.message, 'error');
    }
    btn.textContent = originalText;
    btn.disabled = false;
  };

  function updateTokenStatusBadge(id, status) {
    const row = document.querySelector('tr[data-id="' + id + '"]');
    if (!row) return;
    const badge = row.querySelector('.token-status-badge');
    if (status === 'online') {
      badge.className = 'badge badge-online token-status-badge';
      badge.textContent = '在线';
    } else {
      badge.className = 'badge badge-offline token-status-badge';
      badge.textContent = '离线';
    }
  }

  window.addToken = async function() {
    const refreshToken = $('newRefreshToken').value.trim();
    if (!refreshToken) {
      showToast('请填写 Refresh Token', 'error');
      return;
    }
    try {
      await api('/admin/token', { method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }) });
      showToast('Token 已添加到池', 'success');
      clearTokenForm();
      loadTokens();
      loadDashboard();
    } catch (e) {
      showToast('添加失败: ' + e.message, 'error');
    }
  };
  
  window.deleteToken = async function(id) {
    if (!confirm('确定要删除 Token "' + id + '" 吗？此操作不可恢复。')) return;
    try {
      await api('/admin/token', { method: 'DELETE', body: JSON.stringify({ id: id }) });
      showToast('删除成功', 'success');
      loadTokens();
      loadDashboard();
    } catch (e) {
      showToast('删除失败: ' + e.message, 'error');
    }
  };
  
  window.clearTokenForm = function() {
    $('newRefreshToken').value = '';
  };

  // ==================== 浏览器控制台提取脚本 ====================

  function updateSnippetUrl() {
    const base = getBaseUrl();
    const code = 'fetch("' + base + '/token/auto-fetch",{method:"POST",headers:{"Content-Type":"application/json","X-Admin-Key":"' + adminKey + '"},body:JSON.stringify({refresh_token:document.cookie.match(/chatglm_refresh_token=([^;]+)/)?.[1]||""})}).then(r=>r.json()).then(d=>alert(d.success?"Token added! ID:"+d.id:"Error:"+d.message))';
    $('snippetContent').textContent = code;
  }

  window.copySnippet = function() {
    const text = $('snippetContent').textContent;
    navigator.clipboard.writeText(text).then(function() {
      showToast('代码已复制到剪贴板', 'success');
    }).catch(function() {
      showToast('复制失败，请手动复制', 'error');
    });
  };

  function maskKey(key) {
    if (key.length <= 8) return key;
    return key.slice(0, 6) + '****' + key.slice(-4);
  }

  // ==================== Usage Stats ====================

  window.loadUsage = function() {
    loadUsageApiKeys();
    loadUsageTokens();
    closeUsageDaily();
  };

  window.loadUsageApiKeys = async function() {
    const tbody = $('usageApiKeyTableBody');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--ink-faint)">加载中...</td></tr>';
    try {
      const data = await api('/admin/stats/apikeys', { method: 'GET' });
      const list = data.apikeys || [];
      if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--ink-faint)">暂无统计数据</td></tr>';
        return;
      }
      // 按请求数降序
      list.sort(function(a, b) { return (b.total?.requests || 0) - (a.total?.requests || 0); });
      tbody.innerHTML = list.map(function(item) {
        const t = item.total || {};
        const mark = item.configured ? '' : ' <span class="badge badge-unknown" title="未在配置列表">历史</span>';
        return '<tr style="cursor:pointer" onclick="showApiKeyDaily(\\'' + escapeJs(item.api_key) + '\\')">' +
          '<td><span class="key-mask">' + maskKey(item.api_key) + '</span>' + mark + '</td>' +
          '<td style="text-align:right">' + formatNum(t.requests || 0) + '</td>' +
          '<td style="text-align:right;color:var(--green)">' + formatNum(t.success || 0) + '</td>' +
          '<td style="text-align:right;color:var(--crimson)">' + formatNum(t.fail || 0) + '</td>' +
          '<td style="text-align:right">' + formatNum(t.input_tokens || 0) + '</td>' +
          '<td style="text-align:right">' + formatNum(t.output_tokens || 0) + '</td>' +
          '<td style="color:var(--ink-faint);font-size:0.82rem;">' + formatTime(item.last_used) + '</td>' +
        '</tr>';
      }).join('');
    } catch (e) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--crimson)">加载失败: ' + e.message + '</td></tr>';
    }
  };

  window.loadUsageTokens = async function() {
    const tbody = $('usageTokenTableBody');
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--ink-faint)">加载中...</td></tr>';
    try {
      const data = await api('/admin/stats/tokens', { method: 'GET' });
      const list = data.tokens || [];
      if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--ink-faint)">暂无统计数据</td></tr>';
        return;
      }
      list.sort(function(a, b) { return (b.total?.requests || 0) - (a.total?.requests || 0); });
      tbody.innerHTML = list.map(function(item) {
        const t = item.total || {};
        const status = item.in_pool
          ? '<span class="badge badge-online">在池</span>'
          : '<span class="badge badge-unknown">已移除</span>';
        return '<tr style="cursor:pointer" onclick="showTokenDaily(\\'' + escapeJs(item.id) + '\\')">' +
          '<td><code style="font-size:0.78rem;background:var(--parchment-dark);padding:2px 6px;border-radius:3px;">' + item.id + '</code></td>' +
          '<td><span class="key-mask">' + (item.token_preview || '—') + '</span></td>' +
          '<td>' + status + '</td>' +
          '<td style="text-align:right">' + formatNum(t.requests || 0) + '</td>' +
          '<td style="text-align:right;color:var(--green)">' + formatNum(t.success || 0) + '</td>' +
          '<td style="text-align:right;color:var(--crimson)">' + formatNum(t.fail || 0) + '</td>' +
          '<td style="text-align:right">' + formatNum(t.input_tokens || 0) + '</td>' +
          '<td style="text-align:right">' + formatNum(t.output_tokens || 0) + '</td>' +
          '<td style="color:var(--ink-faint);font-size:0.82rem;">' + formatTime(item.last_used) + '</td>' +
        '</tr>';
      }).join('');
    } catch (e) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--crimson)">加载失败: ' + e.message + '</td></tr>';
    }
  };

  window.showApiKeyDaily = async function(apiKey) {
    try {
      const data = await api('/admin/stats/apikeys?key=' + encodeURIComponent(apiKey), { method: 'GET' });
      renderDaily('API Key · ' + maskKey(apiKey), data.daily || {});
    } catch (e) {
      showToast('加载明细失败: ' + e.message, 'error');
    }
  };

  window.showTokenDaily = async function(id) {
    try {
      const data = await api('/admin/stats/tokens?id=' + encodeURIComponent(id), { method: 'GET' });
      const title = 'GLM Token · ' + id + (data.token_preview ? ' (' + data.token_preview + ')' : '');
      renderDaily(title, data.daily || {});
    } catch (e) {
      showToast('加载明细失败: ' + e.message, 'error');
    }
  };

  function renderDaily(title, daily) {
    const card = $('usageDailyCard');
    const tbody = $('usageDailyTableBody');
    $('usageDailyTitle').textContent = '每日明细 · ' + title;
    const dates = Object.keys(daily).sort(function(a, b) { return b.localeCompare(a); });
    if (dates.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--ink-faint)">无明细数据</td></tr>';
    } else {
      tbody.innerHTML = dates.map(function(date) {
        const d = daily[date] || {};
        return '<tr>' +
          '<td style="font-family:monospace;">' + date + '</td>' +
          '<td style="text-align:right">' + formatNum(d.requests || 0) + '</td>' +
          '<td style="text-align:right;color:var(--green)">' + formatNum(d.success || 0) + '</td>' +
          '<td style="text-align:right;color:var(--crimson)">' + formatNum(d.fail || 0) + '</td>' +
          '<td style="text-align:right">' + formatNum(d.input_tokens || 0) + '</td>' +
          '<td style="text-align:right">' + formatNum(d.output_tokens || 0) + '</td>' +
        '</tr>';
      }).join('');
    }
    card.style.display = 'block';
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  window.closeUsageDaily = function() {
    $('usageDailyCard').style.display = 'none';
  };

  window.resetAllStats = async function() {
    if (!confirm('确定要重置所有用量统计数据吗？该操作不可恢复。')) return;
    try {
      await api('/admin/stats/reset', { method: 'POST' });
      showToast('统计数据已重置', 'success');
      loadUsage();
      loadDashboard();
      loadApiKeys();
      loadTokens();
    } catch (e) {
      showToast('重置失败: ' + e.message, 'error');
    }
  };

  // ==================== Settings ====================

  window.loadSettings = async function() {
    try {
      const data = await api('/admin/settings', { method: 'GET' });
      $('toggleAutoDelete').checked = !!data.auto_delete;
    } catch (e) {
      showToast('加载设置失败: ' + e.message, 'error');
    }
  };

  window.toggleAutoDelete = async function(enabled) {
    try {
      await api('/admin/settings', { method: 'POST', body: JSON.stringify({ auto_delete: enabled }) });
      showToast('自动删除会话已' + (enabled ? '开启' : '关闭'), 'success');
    } catch (e) {
      showToast('设置失败: ' + e.message, 'error');
      $('toggleAutoDelete').checked = !enabled;
    }
  };

  function escapeJs(s) {
    return String(s).replace(/\\\\/g, '\\\\\\\\').replace(/'/g, "\\\\'");
  }

  function init() {
    // 更新指南中的URL
    const base = getBaseUrl();
    document.querySelectorAll('#guideBaseUrl').forEach(el => el.textContent = base + '/v1');
    document.querySelectorAll('#guideCurlUrl').forEach(el => el.textContent = base + '/v1/chat/completions');
    document.querySelectorAll('.guideAdminUrl').forEach(el => el.textContent = base + '/admin/token');

    if (!adminKey) {
      $('loginModal').classList.add('show');
    } else {
      // 验证存储的key是否仍有效
      api('/admin/token', { method: 'GET' }).then(() => {
        loadDashboard();
        updateSnippetUrl();
      }).catch(() => {
        localStorage.removeItem(ADMIN_KEY_KEY);
        adminKey = '';
        $('loginModal').classList.add('show');
      });
    }
  }

  init();
})();
</script>
</body>
</html>`;
}
