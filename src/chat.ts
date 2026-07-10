import {
  uuid, md5, unixTimestamp, timestamp, isBASE64Data, extractBASE64DataFormat,
  removeBASE64DataHeader, getMimeType, getExtension, basename, isURL,
  isArray, isObject, isString, isFiniteNumber, isUndefined, isError, attempt,
  randomChoice, sleep, fetchFileBASE64
} from "./utils.ts";
import { createParser } from "./sse.ts";

const MODEL_NAME = "glm";
const DEFAULT_ASSISTANT_ID = "65940acff94777010aa6b796";
const ACCESS_TOKEN_EXPIRES = 3600;
const MAX_RETRY_COUNT = 3;
const RETRY_DELAY = 5000;
const FILE_MAX_SIZE = 100 * 1024 * 1024;

let signSecret = "8a1317a7468aa3ad86e997d08f3f31cb";

export function setSignSecret(secret: string) {
  signSecret = secret;
}

// ==================== 自动删除会话开关 ====================

let autoDelete = true;

export function setAutoDelete(v: boolean) {
  autoDelete = v;
  console.error(`[Config] auto_delete = ${v}`);
}

export function getAutoDelete(): boolean {
  return autoDelete;
}

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:124.0) Gecko/20100101 Firefox/124.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0"
];

const FAKE_HEADERS: Record<string, string> = {
  "Accept": "text/event-stream",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
  "App-Name": "chatglm",
  "Cache-Control": "no-cache",
  "Content-Type": "application/json",
  "Origin": "https://chatglm.cn",
  "Pragma": "no-cache",
  "Priority": "u=1, i",
  "Sec-Ch-Ua": '"Microsoft Edge";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "X-App-Fr": "browser_extension",
  "X-App-Platform": "pc",
  "X-App-Version": "0.0.1",
  "X-Device-Brand": "",
  "X-Device-Model": "",
  "X-Exp-Groups": "na_android_config:exp:NA,na_4o_config:exp:4o_A,tts_config:exp:tts_config_a,na_glm4plus_config:exp:open,mainchat_server_app:exp:A,mobile_history_daycheck:exp:a,desktop_toolbar:exp:A,chat_drawing_server:exp:A,drawing_server_cogview:exp:cogview4,app_welcome_v2:exp:A,chat_drawing_streamv2:exp:A,mainchat_rm_fc:exp:add,mainchat_dr:exp:open,chat_auto_entrance:exp:A,drawing_server_hi_dream:control:A,homepage_square:exp:close,assistant_recommend_prompt:exp:3,app_home_regular_user:exp:A,memory_common:exp:enable,mainchat_moe:exp:300,assistant_greet_user:exp:greet_user,app_welcome_personalize:exp:A,assistant_model_exp_group:exp:glm4.5,ai_wallet:exp:ai_wallet_enable",
  "X-Lang": "zh"
};

function getHeaders() {
  const userAgent = randomChoice(USER_AGENTS) || USER_AGENTS[0];
  return { ...FAKE_HEADERS, "User-Agent": userAgent };
}

// ==================== Tool Calling Helpers ====================

function buildDynamicExamples(tools: any[]): string {
  if (tools.length === 0) return "";
  const sorted = [...tools].sort((a, b) => {
    const na = (a.function || a).name || "";
    const nb = (b.function || b).name || "";
    return na.length - nb.length;
  });
  const picked = sorted.slice(0, Math.min(2, sorted.length));
  const examples: string[] = [];
  for (const tool of picked) {
    const fn = tool.function || tool;
    const name = fn.name;
    const params = fn.parameters || fn.input_schema || {};
    const props = params.properties || {};
    const required = params.required || [];
    const sampleArgs: Record<string, any> = {};
    for (const key of required.slice(0, 2)) {
      const prop = props[key];
      if (!prop) continue;
      if (prop.type === "string") sampleArgs[key] = prop.description || "example_value";
      else if (prop.type === "number" || prop.type === "integer") sampleArgs[key] = 1;
      else if (prop.type === "boolean") sampleArgs[key] = true;
      else sampleArgs[key] = "example_value";
    }
    if (Object.keys(sampleArgs).length === 0) {
      const firstKey = Object.keys(props)[0];
      if (firstKey) sampleArgs[firstKey] = "example_value";
    }
    if (Object.keys(sampleArgs).length > 0) {
      examples.push("User: [task requiring " + name + "]\nAssistant: ##TOOL_CALL##\n" + JSON.stringify({name, arguments: sampleArgs}) + "\n##END_CALL##");
    }
  }
  examples.push("User: Hello!\nAssistant: Hello! How can I help you today?");
  return examples.join("\n\n");
}

function injectToolsPrompt(messages: any[], tools: any[]): any[] {
  if (!tools || tools.length === 0) return messages;
  const toolsDesc = tools.map((tool: any) => {
    const fn = tool.function || tool;
    return "### " + fn.name + "\nDescription: " + (fn.description || "No description") + "\nParameters: " + JSON.stringify(fn.parameters || fn.input_schema || {}, null, 2);
  }).join("\n\n");
  const examples = buildDynamicExamples(tools);
  const prompt = "You have access to the following tools. To call a tool, use EXACTLY one of these two formats. No explanations before or after the tool call.\n\n" +
    "FORMAT A (preferred):\n##TOOL_CALL##\n{\"name\":\"tool_name\",\"arguments\":{\"key\":\"value\"}}\n##END_CALL##\n\n" +
    "FORMAT B (OpenAI-compatible):\n{\"tool_calls\":[{\"name\":\"tool_name\",\"arguments\":{\"key\":\"value\"}}]}\n\n" +
    "RULES:\n1. Output ONLY the tool call JSON. No markdown fences, no extra text.\n2. For multiple tools, use multiple ##TOOL_CALL## blocks or one {\"tool_calls\":[...]} array.\n3. If no tool is needed, respond normally with plain text.\n\n" +
    "Available tools:\n" + toolsDesc + "\n\n" + examples;
  const newMessages = [...messages];
  const systemIdx = newMessages.findIndex((m: any) => m.role === "system");
  if (systemIdx >= 0) {
    const original = newMessages[systemIdx].content || "";
    newMessages[systemIdx] = { ...newMessages[systemIdx], content: original + "\n\n" + prompt };
  } else {
    newMessages.unshift({ role: "system", content: prompt });
  }
  return newMessages;
}

// --- Tool call parsing: multi-format waterfall ---

// 工具名大小写模糊匹配：根据 tools 列表修正工具名
function normalizeToolName(name: string, tools: any[]): string {
  if (!name || !tools || tools.length === 0) return name;
  const lower = name.toLowerCase();
  // 精确匹配
  for (const tool of tools) {
    const fn = tool.function || tool;
    if (fn.name === name) return name;
  }
  // 大小写不敏感匹配
  for (const tool of tools) {
    const fn = tool.function || tool;
    if (fn.name?.toLowerCase() === lower) return fn.name;
  }
  // 去掉下划线/横杠后匹配（如 bash_tool -> Bash）
  const stripped = lower.replace(/[-_]/g, "");
  for (const tool of tools) {
    const fn = tool.function || tool;
    if (fn.name?.toLowerCase().replace(/[-_]/g, "") === stripped) return fn.name;
  }
  return name; // 未找到匹配，返回原名
}

// 常见参数名别名映射
const PARAM_ALIASES: Record<string, string[]> = {
  command: ["cmd", "script", "shell"],
  file_path: ["path", "filepath", "filename", "file", "target_file"],
  content: ["text", "body", "data", "file_content", "contents", "value", "file_content"],
  query: ["question", "search", "prompt"],
  url: ["uri", "link"],
};

// 工具参数修复：根据 schema 修复参数名和类型
function coerceToolArguments(call: any, tools?: any[]): any {
  const fn = call.function;
  if (!fn) return call;
  let args: any;
  try {
    args = typeof fn.arguments === "string" ? JSON.parse(fn.arguments) : fn.arguments;
  } catch { return call; }
  if (!args || typeof args !== "object") return call;

  // 1. 找到对应 tool 的 schema
  const toolDef = tools?.find((t: any) => {
    const f = t.function || t;
    return f.name === fn.name;
  });
  const schema = toolDef?.function?.parameters || toolDef?.parameters || toolDef?.function?.input_schema || {};
  const props = schema.properties || {};
  const required = schema.required || [];

  // 2. 大小写不敏感的参数名修复（按 schema properties 匹配）
  const fixed: Record<string, any> = {};
  const propKeys = Object.keys(props);
  for (const [key, value] of Object.entries(args)) {
    let matchedKey = key;
    // 精确匹配
    if (!props[key]) {
      // 大小写不敏感匹配
      const lower = key.toLowerCase();
      const found = propKeys.find((pk) => pk.toLowerCase() === lower);
      if (found) matchedKey = found;
      else {
        // 别名匹配
        for (const [canonical, aliases] of Object.entries(PARAM_ALIASES)) {
          if (aliases.includes(lower) && props[canonical]) {
            matchedKey = canonical;
            break;
          }
        }
      }
    }
    fixed[matchedKey] = value;
  }

  // 3. 类型修复：根据 schema 将字符串转换为正确类型
  for (const [key, value] of Object.entries(fixed)) {
    const propSchema = props[key];
    if (!propSchema) continue;
    const type = propSchema.type;
    // 字符串 "true"/"false" -> boolean
    if (type === "boolean" && typeof value === "string") {
      if (value.toLowerCase() === "true") fixed[key] = true;
      else if (value.toLowerCase() === "false") fixed[key] = false;
    }
    // 字符串数字 -> number
    if (type === "number" || type === "integer") {
      if (typeof value === "string" && !isNaN(Number(value))) {
        fixed[key] = Number(value);
      }
    }
    // 字符串 JSON -> object/array
    if ((type === "object" || type === "array") && typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed === "object") fixed[key] = parsed;
      } catch { /* keep as string */ }
    }
  }

  return {
    ...call,
    function: { ...fn, arguments: JSON.stringify(fixed) },
  };
}

function makeToolCall(name: string, args: any, idx = 0): any {
  const argsStr = typeof args === "string" ? args : JSON.stringify(args || {});
  return {
    id: `call_${Math.random().toString(36).slice(2, 11)}_${idx}`,
    type: "function",
    function: { name, arguments: argsStr },
  };
}

function stripCodeBlocks(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return match ? match[1].trim() : text;
}

function extractMarkerToolCalls(text: string): { calls: any[]; cleaned: string } {
  const calls: any[] = [];
  const re = /##TOOL_CALL##\s*([\s\S]*?)\s*##END_CALL##/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed.name) {
        calls.push(makeToolCall(parsed.name, parsed.arguments || parsed.input || {}, calls.length));
      } else if (parsed.tool_calls && Array.isArray(parsed.tool_calls)) {
        for (const tc of parsed.tool_calls) {
          const name = tc.name || tc.function?.name || "";
          const args = tc.arguments || tc.function?.arguments || tc.input || {};
          if (name) calls.push(makeToolCall(name, args, calls.length));
        }
      }
    } catch { /* skip malformed */ }
  }
  const cleaned = text.replace(re, "").trim();
  return { calls, cleaned };
}

function extractJSONObject(str: string, key: string): string | null {
  const idx = str.indexOf(`"${key}"`);
  if (idx === -1) return null;
  let start = idx;
  while (start > 0 && str[start] !== "{") start--;
  if (str[start] !== "{") return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < str.length; i++) {
    const ch = str[i];
    if (esc) { esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"' && !esc) { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) return str.slice(start, i + 1); }
  }
  return null;
}

function extractJSONToolCalls(text: string): any[] {
  const calls: any[] = [];
  const block = extractJSONObject(text, "tool_calls");
  if (block) {
    try {
      const parsed = JSON.parse(block);
      if (Array.isArray(parsed.tool_calls)) {
        for (const tc of parsed.tool_calls) {
          const name = tc.name || tc.function?.name || "";
          const args = tc.arguments || tc.function?.arguments || tc.input || {};
          if (name) calls.push(makeToolCall(name, args, calls.length));
        }
      }
    } catch { /* ignore */ }
  }
  if (calls.length === 0) {
    const single = extractJSONObject(text, "name");
    if (single) {
      try {
        const parsed = JSON.parse(single);
        if (parsed.name && typeof parsed.name === "string") {
          const args = parsed.arguments || parsed.input || {};
          calls.push(makeToolCall(parsed.name, args, 0));
        }
      } catch { /* ignore */ }
    }
  }
  return calls;
}

function repairJSON(text: string): string {
  let s = text.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  s = s.replace(/(['"])?([a-zA-Z_][a-zA-Z0-9_]*)(['"])?\s*:/g, '"$2":');
  s = s.replace(/:\s*'([^']*)'/g, ':"$1"');
  s = s.replace(/,\s*([\]}])/g, "$1");
  const openBrace = (s.match(/{/g) || []).length - (s.match(/}/g) || []).length;
  const openBracket = (s.match(/\[/g) || []).length - (s.match(/]/g) || []).length;
  for (let i = 0; i < openBracket; i++) s += "]";
  for (let i = 0; i < openBrace; i++) s += "}";
  return s;
}

function dedupeToolCalls(calls: any[]): any[] {
  const seen = new Set<string>();
  return calls.filter((tc) => {
    const key = tc.function.name + "\x00" + tc.function.arguments;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseToolCalls(content: string, tools?: any[]): { tool_calls: any[] | null; text: string } {
  if (!content || !content.trim()) return { tool_calls: null, text: content };

  // 1. ##TOOL_CALL## marker format (highest priority)
  const { calls: markerCalls, cleaned } = extractMarkerToolCalls(content);

  // 2. Strip code blocks from remaining text
  const stripped = stripCodeBlocks(cleaned);

  // 3. JSON tool_calls format
  const jsonCalls = extractJSONToolCalls(stripped);

  // 4. Single {"name":"...","arguments":{...}} format
  let singleCalls: any[] = [];
  if (markerCalls.length === 0 && jsonCalls.length === 0) {
    singleCalls = extractJSONToolCalls(repairJSON(stripped));
  }

  const allCalls = [...markerCalls, ...jsonCalls, ...singleCalls];
  if (allCalls.length === 0) return { tool_calls: null, text: content };

  const deduped = dedupeToolCalls(allCalls);
  if (deduped.length === 0) return { tool_calls: null, text: content };

  // 工具名大小写修复 + 参数修复
  const fixed = deduped.map((tc) => {
    let fixedName = normalizeToolName(tc.function.name, tools || []);
    let fixed = coerceToolArguments({ ...tc, function: { ...tc.function, name: fixedName } }, tools);
    return fixed;
  });

  // Calculate remaining text
  let text = content;
  const markerRe = /##TOOL_CALL##\s*[\s\S]*?\s*##END_CALL##/g;
  text = text.replace(markerRe, "").trim();
  if (markerCalls.length === 0 && jsonCalls.length > 0) {
    const block = extractJSONObject(content, "tool_calls");
    if (block) text = text.replace(block, "").trim();
  }
  if (!text) text = "";

  return { tool_calls: fixed, text };
}

function convertToolMessages(messages: any[]): any[] {
  return messages.map((m: any) => {
    if (m.role === "tool") {
      return {
        role: "user",
        content: `工具 ${m.name || ""} (调用ID: ${m.tool_call_id || ""}) 返回结果：\n${m.content || ""}`,
      };
    }
    return m;
  });
}

function getWorkerCache(): Cache {
  return (caches as any).default;
}

function getTokenCacheKey(refreshToken: string): Request {
  return new Request(`https://internal-cache/glm-token/${refreshToken}`);
}

async function getCachedAccessToken(refreshToken: string): Promise<string | null> {
  const response = await getWorkerCache().match(getTokenCacheKey(refreshToken));
  if (!response) return null;
  try {
    const data: any = await response.json();
    if (data.refreshTime > unixTimestamp()) return data.accessToken;
  } catch {}
  return null;
}

async function setCachedAccessToken(refreshToken: string, accessToken: string, refreshTime: number) {
  await getWorkerCache().put(getTokenCacheKey(refreshToken), new Response(JSON.stringify({ accessToken, refreshTime }), {
    headers: { "Content-Type": "application/json" }
  }));
}

async function deleteCachedAccessToken(refreshToken: string) {
  await getWorkerCache().delete(getTokenCacheKey(refreshToken));
}

async function generateSign() {
  const e = Date.now();
  const A = e.toString();
  const t = A.length;
  const o = A.split("").map((c) => Number(c));
  const i = o.reduce((sum, v) => sum + v, 0) - o[t - 2];
  const a = i % 10;
  const timestamp = A.substring(0, t - 2) + a + A.substring(t - 1, t);
  const nonce = uuid(false);
  const sign = await md5(`${timestamp}-${nonce}-${signSecret}`);
  return { timestamp, nonce, sign };
}

const tokenRequestQueues: Record<string, Array<(result: any) => void>> = {};

async function requestToken(refreshToken: string) {
  if (tokenRequestQueues[refreshToken]) {
    return new Promise((resolve) => tokenRequestQueues[refreshToken].push(resolve));
  }
  tokenRequestQueues[refreshToken] = [];
  const doRequest = async () => {
    const sign = await generateSign();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch("https://chatglm.cn/chatglm/user-api/user/refresh", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${refreshToken}`,
          "Content-Type": "application/json",
          ...getHeaders(),
          "X-Device-Id": uuid(false),
          "X-Nonce": sign.nonce,
          "X-Request-Id": uuid(false),
          "X-Sign": sign.sign,
          "X-Timestamp": `${sign.timestamp}`,
        },
        signal: controller.signal,
      });
      const data = await checkResult(response, refreshToken);
      const { access_token, refresh_token } = data.result;
      return { accessToken: access_token, refreshToken: refresh_token, refreshTime: unixTimestamp() + ACCESS_TOKEN_EXPIRES };
    } finally {
      clearTimeout(timeoutId);
    }
  };
  try {
    const result = await doRequest();
    tokenRequestQueues[refreshToken].forEach((resolve) => resolve(result));
    return result;
  } catch (err) {
    tokenRequestQueues[refreshToken].forEach((resolve) => resolve(err));
    throw err;
  } finally {
    delete tokenRequestQueues[refreshToken];
  }
}

async function acquireToken(refreshToken: string): Promise<string> {
  const cached = await getCachedAccessToken(refreshToken);
  if (cached) return cached;
  const tokenData: any = await requestToken(refreshToken);
  await setCachedAccessToken(refreshToken, tokenData.accessToken, tokenData.refreshTime);
  return tokenData.accessToken;
}

async function removeConversation(convId: string, refreshToken: string, assistantId = DEFAULT_ASSISTANT_ID) {
  if (!getAutoDelete()) return;
  const token = await acquireToken(refreshToken);
  const sign = await generateSign();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch("https://chatglm.cn/chatglm/mainchat-api/conversation/bulk_delete", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Referer: "https://chatglm.cn/main/alltoolsdetail",
        "X-Device-Id": uuid(false),
        "X-Request-Id": uuid(false),
        "X-Sign": sign.sign,
        "X-Timestamp": sign.timestamp,
        "X-Nonce": sign.nonce,
        ...getHeaders(),
      },
      body: JSON.stringify({ conversation_ids: [convId], assistant_id: assistantId }),
      signal: controller.signal,
    });
    await checkResult(response, refreshToken);
    console.error(`[AutoDelete] 会话 ${convId} 已删除`);
  } catch (err: any) {
    console.error(`[AutoDelete] 删除会话 ${convId} 失败: ${err.message}`);
  }
  finally { clearTimeout(timeoutId); }
}

export class TokenExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TokenExpiredError";
  }
}

async function checkResult(response: Response, refreshToken: string): Promise<any> {
  const data: any = await response.json().catch(() => null);
  if (!data) return null;
  const { code, status, message } = data;
  if (!isFiniteNumber(code) && !isFiniteNumber(status)) return data;
  if (code === 0 || status === 0) return data;
  if (code == 401) await deleteCachedAccessToken(refreshToken);
  if (message?.includes('40102') || code === 40102) {
    throw new TokenExpiredError(`refresh_token已过期`);
  }
  throw new Error(`[请求glm失败]: ${message}`);
}

async function glmPostStream(url: string, body: any, headers: Record<string, string>, timeout = 180000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function createCompletion(messages: any[], refreshToken: string, model = MODEL_NAME, refConvId = "", retryCount = 0, tools?: any[]): Promise<any> {
  return (async () => {
    let processedMessages = convertToolMessages(messages);
    processedMessages = injectToolsPrompt(processedMessages, tools || []);
    const refFileUrls = extractRefFileUrls(processedMessages);
    const refs = refFileUrls.length ? await Promise.all(refFileUrls.map((fileUrl) => uploadFile(fileUrl, refreshToken))) : [];
    if (!/[0-9a-zA-Z]{24}/.test(refConvId)) refConvId = "";
    let assistantId = /^[a-z0-9]{24,}$/.test(model) ? model : DEFAULT_ASSISTANT_ID;
    let chatMode = 'thinking';
    if (model.includes('fast')) { chatMode = ''; }
    else if (model.includes('deep')) { chatMode = 'deep_thinking'; }
    if (model.includes('deepresearch')) { chatMode = 'deep_research'; }
    const token = await acquireToken(refreshToken);
    const sign = await generateSign();
    const response = await glmPostStream(
      "https://chatglm.cn/chatglm/backend-api/assistant/stream",
      {
        assistant_id: assistantId,
        conversation_id: refConvId,
        project_id: "",
        chat_type: "user_chat",
        messages: messagesPrepare(processedMessages, refs, !!refConvId),
        meta_data: {
          channel: "",
          chat_mode: chatMode || undefined,
          draft_id: "",
          if_plus_model: true,
          input_question_type: "xxxx",
          is_networking: true,
          is_test: false,
          platform: "pc",
          quote_log_id: "",
          cogview: { rm_label_watermark: false }
        },
      },
      {
        Authorization: `Bearer ${token}`,
        ...getHeaders(),
        "X-Device-Id": uuid(false),
        "X-Request-Id": uuid(false),
        "X-Sign": sign.sign,
        "X-Timestamp": sign.timestamp,
        "X-Nonce": sign.nonce,
      }
    );
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/event-stream")) {
      const errText = await response.text().catch(() => "");
      console.error(errText);
      if (errText.includes("40102") || errText.includes("refresh_token")) {
        throw new TokenExpiredError("refresh_token已过期");
      }
      throw new Error(`上游返回非SSE响应: ${contentType} ${errText.slice(0, 200)}`);
    }
    const answer = await receiveStream(model, response.body!, tools);
    removeConversation(answer.id, refreshToken, assistantId).catch(() => {});
    return answer;
  })().catch(async (err) => {
    if (err instanceof TokenExpiredError) throw err;
    if (retryCount < MAX_RETRY_COUNT) {
      console.error(`Stream response error: ${err.stack || err.message}`);
      await sleep(RETRY_DELAY);
      return createCompletion(messages, refreshToken, model, refConvId, retryCount + 1, tools);
    }
    throw err;
  });
}

export async function createCompletionStream(messages: any[], refreshToken: string, model = MODEL_NAME, refConvId = "", retryCount = 0, tools?: any[]): Promise<ReadableStream> {
  return (async () => {
    let processedMessages = convertToolMessages(messages);
    processedMessages = injectToolsPrompt(processedMessages, tools || []);
    const refFileUrls = extractRefFileUrls(processedMessages);
    const refs = refFileUrls.length ? await Promise.all(refFileUrls.map((fileUrl) => uploadFile(fileUrl, refreshToken))) : [];
    if (!/[0-9a-zA-Z]{24}/.test(refConvId)) refConvId = "";
    let assistantId = /^[a-z0-9]{24,}$/.test(model) ? model : DEFAULT_ASSISTANT_ID;
    let chatMode = 'thinking';
    if (model.includes('fast')) { chatMode = ''; }
    else if (model.includes('deep')) { chatMode = 'deep_thinking'; }
    if (model.includes('deepresearch')) { chatMode = 'deep_research'; }
    const token = await acquireToken(refreshToken);
    const sign = await generateSign();
    const response = await glmPostStream(
      "https://chatglm.cn/chatglm/backend-api/assistant/stream",
      {
        assistant_id: assistantId,
        conversation_id: refConvId,
        project_id: "",
        chat_type: "user_chat",
        messages: messagesPrepare(processedMessages, refs, !!refConvId),
        meta_data: {
          channel: "",
          chat_mode: chatMode || undefined,
          draft_id: "",
          if_plus_model: true,
          input_question_type: "xxxx",
          is_networking: true,
          is_test: false,
          platform: "pc",
          quote_log_id: "",
          cogview: { rm_label_watermark: false }
        },
      },
      {
        Authorization: `Bearer ${token}`,
        Referer: assistantId == DEFAULT_ASSISTANT_ID ? "https://chatglm.cn/main/alltoolsdetail" : `https://chatglm.cn/main/gdetail/${assistantId}`,
        "X-Device-Id": uuid(false),
        "X-Request-Id": uuid(false),
        "X-Sign": sign.sign,
        "X-Timestamp": sign.timestamp,
        "X-Nonce": sign.nonce,
        ...getHeaders(),
      }
    );
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/event-stream")) {
      const errText = await response.text().catch(() => "");
      console.error("Invalid response Content-Type:", contentType, errText);
      // 检测 token 过期
      if (errText.includes("40102") || errText.includes("refresh_token")) {
        throw new TokenExpiredError("refresh_token已过期");
      }
      throw new Error(`上游返回非SSE响应: ${contentType} ${errText.slice(0, 200)}`);
    }
    return createTransStream(model, response.body!, (convId: string) => {
      removeConversation(convId, refreshToken, assistantId).catch(() => {});
    }, tools);
  })().catch(async (err) => {
    // token 过期不重试，直接向上抛出由 token 轮转逻辑处理
    if (err instanceof TokenExpiredError) throw err;
    if (retryCount < MAX_RETRY_COUNT) {
      console.error(`Stream response error: ${err.stack || err.message}`);
      await sleep(RETRY_DELAY);
      return createCompletionStream(messages, refreshToken, model, refConvId, retryCount + 1, tools);
    }
    throw err;
  });
}

export async function generateImages(model = "65a232c082ff90a2ad2f15e2", prompt: string, refreshToken: string, retryCount = 0): Promise<string[]> {
  return (async () => {
    const messages = [{ role: "user", content: prompt.indexOf("画") == -1 ? `请画：${prompt}` : prompt }];
    const token = await acquireToken(refreshToken);
    const sign = await generateSign();
    const response = await glmPostStream(
      "https://chatglm.cn/chatglm/backend-api/assistant/stream",
      {
        assistant_id: model,
        conversation_id: "",
        messages: messagesPrepare(messages, []),
        meta_data: {
          channel: "", draft_id: "", if_plus_model: true,
          input_question_type: "xxxx", is_test: false, platform: "pc", quote_log_id: ""
        },
      },
      {
        Authorization: `Bearer ${token}`,
        Referer: `https://chatglm.cn/main/gdetail/${model}`,
        "X-Device-Id": uuid(false),
        "X-Request-Id": uuid(false),
        "X-Sign": sign.sign,
        "X-Timestamp": sign.timestamp,
        "X-Nonce": sign.nonce,
        ...getHeaders(),
      }
    );
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/event-stream")) throw new Error(`Stream response Content-Type invalid: ${contentType}`);
    const { convId, imageUrls } = await receiveImages(response.body!);
    removeConversation(convId, refreshToken, model).catch(() => {});
    if (imageUrls.length == 0) throw new Error("图像生成失败");
    return imageUrls;
  })().catch(async (err) => {
    if (retryCount < MAX_RETRY_COUNT) {
      console.error(`Image generation error: ${err.message}`);
      await sleep(RETRY_DELAY);
      return generateImages(model, prompt, refreshToken, retryCount + 1);
    }
    throw err;
  });
}

export async function generateVideos(model = "cogvideox", prompt: string, refreshToken: string, options: {
  imageUrl: string; videoStyle: string; emotionalAtmosphere: string; mirrorMode: string; audioId: string;
}, refConvId = "", retryCount = 0): Promise<any[]> {
  return (async () => {
    if (!/[0-9a-zA-Z]{24}/.test(refConvId)) refConvId = "";
    const sourceList: string[] = [];
    if (model == "cogvideox-pro") {
      const imageUrls = await generateImages(undefined as any, prompt, refreshToken);
      options.imageUrl = imageUrls[0];
    }
    if (options.imageUrl) {
      const uploadResult = await uploadFile(options.imageUrl, refreshToken, true);
      sourceList.push(uploadResult.source_id);
    }
    let token = await acquireToken(refreshToken);
    const sign = await generateSign();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    let result;
    try {
      const resp = await fetch("https://chatglm.cn/chatglm/video-api/v1/chat", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Referer: "https://chatglm.cn/video",
          "X-Device-Id": uuid(false),
          "X-Request-Id": uuid(false),
          "X-Sign": sign.sign,
          "X-Timestamp": sign.timestamp,
          "X-Nonce": sign.nonce,
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation_id: refConvId,
          prompt,
          source_list: sourceList.length > 0 ? sourceList : undefined,
          advanced_parameter_extra: {
            emotional_atmosphere: options.emotionalAtmosphere,
            mirror_mode: options.mirrorMode,
            video_style: options.videoStyle,
          },
        }),
        signal: controller.signal,
      });
      result = await checkResult(resp, refreshToken);
    } finally { clearTimeout(timeoutId); }
    const { chat_id: chatId, conversation_id: convId } = result.result;
    const startTime = unixTimestamp();
    const results: any[] = [];
    while (true) {
      if (unixTimestamp() - startTime > 600) throw new Error("视频生成失败：超时");
      token = await acquireToken(refreshToken);
      const s = await generateSign();
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 30000);
      let statusResult;
      try {
        const resp = await fetch(`https://chatglm.cn/chatglm/video-api/v1/chat/status/${chatId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Referer: "https://chatglm.cn/video",
            "X-Device-Id": uuid(false),
            "X-Request-Id": uuid(false),
            "X-Sign": s.sign,
            "X-Timestamp": s.timestamp,
            "X-Nonce": s.nonce,
            ...getHeaders(),
          },
          signal: ctrl.signal,
        });
        statusResult = await checkResult(resp, refreshToken);
      } finally { clearTimeout(tid); }
      const { status, video_url, cover_url, video_duration, resolution } = statusResult.result;
      if (status != "init" && status != "processing") {
        if (status != "finished") throw new Error("视频生成失败");
        let videoUrl = video_url;
        if (options.audioId) {
          const [key, id] = options.audioId.split("-");
          token = await acquireToken(refreshToken);
          const s2 = await generateSign();
          const ctrl2 = new AbortController();
          const tid2 = setTimeout(() => ctrl2.abort(), 30000);
          try {
            const resp = await fetch("https://chatglm.cn/chatglm/video-api/v1/static/composite_video", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                Referer: "https://chatglm.cn/video",
                "X-Device-Id": uuid(false),
                "X-Request-Id": uuid(false),
                "X-Sign": s2.sign,
                "X-Timestamp": s2.timestamp,
                "X-Nonce": s2.nonce,
                ...getHeaders(),
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ chat_id: chatId, key, audio_id: id }),
              signal: ctrl2.signal,
            });
            const compositeResult = await checkResult(resp, refreshToken);
            videoUrl = compositeResult.result.url;
          } finally { clearTimeout(tid2); }
        }
        results.push({ conversation_id: convId, cover_url, video_url: videoUrl, video_duration, resolution });
        break;
      }
      await sleep(1000);
    }
    fetch(`https://chatglm.cn/chatglm/video-api/v1/chat/${chatId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}`, Referer: "https://chatglm.cn/video", "X-Device-Id": uuid(false), "X-Request-Id": uuid(false), ...getHeaders() },
    }).catch(() => {});
    return results;
  })().catch(async (err) => {
    if (retryCount < MAX_RETRY_COUNT) {
      console.error(`Video generation error: ${err.message}`);
      await sleep(RETRY_DELAY);
      return generateVideos(model, prompt, refreshToken, options, refConvId, retryCount + 1);
    }
    throw err;
  });
}

function extractRefFileUrls(messages: any[]) {
  const urls: string[] = [];
  if (!messages.length) return urls;
  const lastMessage = messages[messages.length - 1];
  if (isArray(lastMessage.content)) {
    lastMessage.content.forEach((v: any) => {
      if (!isObject(v) || !["file", "image_url"].includes(v["type"])) return;
      if (v["type"] == "file" && isObject(v["file_url"]) && isString(v["file_url"]["url"])) urls.push(v["file_url"]["url"]);
      else if (v["type"] == "image_url" && isObject(v["image_url"]) && isString(v["image_url"]["url"])) urls.push(v["image_url"]["url"]);
    });
  }
  return urls;
}

function messagesPrepare(messages: any[], refs: any[], isRefConv = false) {
  let content: string;
  if (isRefConv || messages.length < 2) {
    content = messages.reduce((content: string, message: any) => {
      if (isArray(message.content)) {
        return message.content.reduce((_content: string, v: any) => {
          if (!isObject(v) || v["type"] != "text") return _content;
          return _content + (v["text"] || "") + "\n";
        }, content);
      }
      return content + `${message.content}\n`;
    }, "");
  } else {
    const latestMessage = messages[messages.length - 1];
    const hasFileOrImage = isArray(latestMessage.content) && latestMessage.content.some((v: any) => typeof v === "object" && ["file", "image_url"].includes(v["type"]));
    if (hasFileOrImage) {
      messages.splice(messages.length - 1, 0, { content: "关注用户最新发送文件和消息", role: "system" });
    }
    content = (messages.reduce((content: string, message: any) => {
      const role = message.role.replace("system", "<|sytstem|>").replace("assistant", "<|assistant|>").replace("user", "<|user|>");
      if (isArray(message.content)) {
        return message.content.reduce((_content: string, v: any) => {
          if (!isObject(v) || v["type"] != "text") return _content;
          return _content + (`${role}\n` + v["text"] || "") + "\n";
        }, content);
      }
      return (content += `${role}\n${message.content}\n`);
    }, "") + "<|assistant|>\n").replace(/\!\[.+\]\(.+\)/g, "").replace(/\/mnt\/data\/.+/g, "");
  }
  const fileRefs = refs.filter((ref) => !ref.width && !ref.height);
  const imageRefs = refs.filter((ref) => ref.width || ref.height).map((ref: any) => { ref.image_url = ref.file_url; return ref; });
  return [{
    role: "user",
    content: [
      { type: "text", text: content },
      ...(fileRefs.length == 0 ? [] : [{ type: "file", file: fileRefs }]),
      ...(imageRefs.length == 0 ? [] : [{ type: "image", image: imageRefs }]),
    ],
  }];
}

async function checkFileUrl(fileUrl: string) {
  if (isBASE64Data(fileUrl)) return;
  const response = await fetch(fileUrl, { method: "HEAD" });
  if (response.status >= 400) throw new Error(`File ${fileUrl} is not valid: [${response.status}] ${response.statusText}`);
  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    const fileSize = parseInt(contentLength, 10);
    if (fileSize > FILE_MAX_SIZE) throw new Error(`File ${fileUrl} exceeds size limit`);
  }
}

async function uploadFile(fileUrl: string, refreshToken: string, isVideoImage = false) {
  await checkFileUrl(fileUrl);
  let filename: string, fileData: ArrayBuffer, mimeType: string | null = null;
  if (isBASE64Data(fileUrl)) {
    mimeType = extractBASE64DataFormat(fileUrl);
    const ext = mimeType ? getExtension(mimeType) : "bin";
    filename = `${uuid()}.${ext || "bin"}`;
    const base64Data = removeBASE64DataHeader(fileUrl);
    fileData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0)).buffer;
  } else {
    filename = basename(fileUrl);
    const response = await fetch(fileUrl);
    fileData = await response.arrayBuffer();
  }
  mimeType = mimeType || getMimeType(filename);
  // 注意：CF Worker 不支持 sharp，跳过图片 resize
  const formData = new FormData();
  formData.append("file", new Blob([fileData], { type: mimeType }), filename);
  const token = await acquireToken(refreshToken);
  const uploadUrl = isVideoImage
    ? "https://chatglm.cn/chatglm/video-api/v1/static/upload"
    : "https://chatglm.cn/chatglm/backend-api/assistant/file_upload";
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Referer: isVideoImage ? "https://chatglm.cn/video" : "https://chatglm.cn/",
      ...getHeaders(),
    },
    body: formData,
  });
  const uploadResult = await checkResult(response, refreshToken);
  return uploadResult.result;
}

async function receiveStream(model: string, readableStream: ReadableStream, tools?: any[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = {
      id: "", model, object: "chat.completion",
      choices: [{ index: 0, message: { role: "assistant", content: "", reasoning_content: null as string | null }, finish_reason: "stop" }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      created: unixTimestamp(),
    };
    const isSilentModel = model.includes('silent');
    const cachedParts: any[] = [];
    let finished = false;
    const parser = createParser((event) => {
      try {
        const result = attempt(() => JSON.parse(event.data));
        if (isError(result)) throw new Error(`Stream response invalid: ${event.data}`);
        if (!data.id && result.conversation_id) data.id = result.conversation_id;
        if (result.status != "finish") {
          if (result.parts) { cachedParts.length = 0; cachedParts.push(...result.parts); }
          const searchMap = new Map<string, any>();
          cachedParts.forEach((part) => {
            if (!part.content || !isArray(part.content)) return;
            const { meta_data } = part;
            part.content.forEach((item: any) => {
              if (item.type == "tool_result" && meta_data?.tool_result_extra?.search_results) {
                meta_data.tool_result_extra.search_results.forEach((res: any) => { if (res.match_key) searchMap.set(res.match_key, res); });
              }
            });
          });
          const keyToIdMap = new Map<string, number>();
          let counter = 1;
          let fullText = "";
          let fullReasoning = "";
          cachedParts.forEach((part: any) => {
            const { content, meta_data } = part;
            if (!isArray(content)) return;
            let partText = "";
            let partReasoning = "";
            content.forEach((value: any) => {
              const { type, text, think, image, code, content: innerContent } = value;
              if (type == "text") {
                let txt = text;
                if (searchMap.size > 0) {
                  txt = txt.replace(/【?(turn\d+[a-zA-Z]+\d+)】?/g, (match: string, key: string) => {
                    const searchInfo = searchMap.get(key);
                    if (!searchInfo) return match;
                    if (!keyToIdMap.has(key)) keyToIdMap.set(key, counter++);
                    const newId = keyToIdMap.get(key);
                    return ` [${newId}](${searchInfo.url})`;
                  });
                }
                partText += txt;
              } else if (type == "think" && !isSilentModel) {
                partReasoning += think;
              } else if (type == "tool_result" && meta_data?.tool_result_extra?.search_results && isArray(meta_data.tool_result_extra.search_results) && !isSilentModel) {
                partReasoning += meta_data.tool_result_extra.search_results.reduce((meta: string, v: any) => meta + `> 检索 ${v.title}(${v.url}) ...\n`, "");
              } else if (type == "quote_result" && part.status == "finish" && meta_data && isArray(meta_data.metadata_list) && !isSilentModel) {
                partReasoning += meta_data.metadata_list.reduce((meta: string, v: any) => meta + `> 检索 ${v.title}(${v.url}) ...\n`, "");
              } else if (type == "image" && isArray(image) && part.status == "finish") {
                partText += image.reduce((imgs: string, v: any) => imgs + (/^(http|https):\/\//.test(v.image_url) ? `![图像](${v.image_url || ""})` : ""), "") + "\n";
              } else if (type == "code") {
                partText += "\`\`\`python\n" + code + (part.status == "finish" ? "\n\`\`\`\n" : "");
              } else if (type == "execution_output" && isString(innerContent) && part.status == "finish") {
                partText += innerContent + "\n";
              }
            });
            if (partText) fullText += (fullText.length > 0 ? "\n" : "") + partText;
            if (partReasoning) fullReasoning += (fullReasoning.length > 0 ? "\n" : "") + partReasoning;
          });
          data.choices[0].message.content = fullText;
          (data.choices[0].message as any).reasoning_content = fullReasoning || null;
        } else {
          finished = true;
          let content = data.choices[0].message.content;
          content = content.replace(/【\d+†(来源|源|source)】/g, "");
          data.choices[0].message.content = content;
          if (tools && tools.length > 0) {
            const parsed = parseToolCalls(content, tools);
            if (parsed.tool_calls) {
              (data.choices[0].message as any).tool_calls = parsed.tool_calls;
              (data.choices[0].message as any).content = parsed.text || "";
              data.choices[0].finish_reason = "tool_calls";
            }
          }
          resolve(data);
        }
      } catch (err) {
        reject(err);
      }
    });
    const reader = readableStream.getReader();
    const decoder = new TextDecoder();
    let finishReceived = false;
    const STREAM_CLOSE_WAIT = 3000; // 流关闭后等待 finish 事件的时间（毫秒）

    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            if (!finishReceived) {
              // 流关闭但未收到 finish，等待一段时间
              console.error(`[receiveStream] 流已关闭，等待 finish 事件 (${STREAM_CLOSE_WAIT}ms)...`);
              await new Promise(r => setTimeout(r, STREAM_CLOSE_WAIT));
            }
            if (finishReceived) {
              resolve(data);
            } else {
              // 超时仍未收到 finish，返回错误
              console.error(`[receiveStream] 等待超时，未收到 finish 事件，reject`);
              reject(new Error("上游流异常结束，未收到完成事件"));
            }
            break;
          }
          parser.feed(decoder.decode(value, { stream: true }));
        }
      } catch (err: any) {
        console.error(`[receiveStream] 流异常: ${err.message}`);
        reject(err);
      } finally {
        reader.releaseLock();
      }
    })();
  });
}

function createTransStream(model: string, readableStream: ReadableStream, endCallback?: (convId: string) => void, tools?: any[]): ReadableStream {
  const created = unixTimestamp();
  const encoder = new TextEncoder();
  const isSilentModel = model.includes('silent');
  let sentContent = "";
  let sentReasoning = "";
  let fullContent = "";
  let isToolCallMode = false;
  let mightBeToolCall = false;
  let pendingContent = "";
  const cachedParts: any[] = [];
  return new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        id: "", model, object: "chat.completion.chunk",
        choices: [{ index: 0, delta: { role: "assistant", content: "" }, finish_reason: null }],
        created,
      })}\n\n`));
      const reader = readableStream.getReader();
      const decoder = new TextDecoder();
      const parser = createParser((event) => {
        try {
          const result = attempt(() => JSON.parse(event.data));
          if (isError(result)) return;
          if (result.status != "finish" && result.status != "intervene") {
            if (result.parts) {
              result.parts.forEach((part: any) => {
                const index = cachedParts.findIndex((p) => p.logic_id === part.logic_id);
                if (index !== -1) cachedParts[index] = part;
                else cachedParts.push(part);
              });
            }
            const searchMap = new Map<string, any>();
            cachedParts.forEach((part) => {
              if (!part.content || !isArray(part.content)) return;
              const { meta_data } = part;
              part.content.forEach((item: any) => {
                if (item.type == "tool_result" && meta_data?.tool_result_extra?.search_results) {
                  meta_data.tool_result_extra.search_results.forEach((res: any) => { if (res.match_key) searchMap.set(res.match_key, res); });
                }
              });
            });
            const keyToIdMap = new Map<string, number>();
            let counter = 1;
            let fullText = "";
            let fullReasoning = "";
            cachedParts.forEach((part: any) => {
              const { content, meta_data } = part;
              if (!isArray(content)) return;
              let partText = "";
              let partReasoning = "";
              content.forEach((value: any) => {
                const { type, text, think, image, code, content: innerContent } = value;
                if (type == "text") {
                  let txt = text;
                  if (searchMap.size > 0) {
                    txt = txt.replace(/【?(turn\d+[a-zA-Z]+\d+)】?/g, (match: string, key: string) => {
                      const searchInfo = searchMap.get(key);
                      if (!searchInfo) return match;
                      if (!keyToIdMap.has(key)) keyToIdMap.set(key, counter++);
                      const newId = keyToIdMap.get(key);
                      return ` [${newId}](${searchInfo.url})`;
                    });
                  }
                  partText += txt;
                } else if (type == "think" && !isSilentModel) {
                  partReasoning += think;
                } else if (type == "tool_result" && meta_data?.tool_result_extra?.search_results && isArray(meta_data.tool_result_extra.search_results) && !isSilentModel) {
                  partReasoning += meta_data.tool_result_extra.search_results.reduce((meta: string, v: any) => meta + `> 检索 ${v.title}(${v.url}) ...\n`, "");
                } else if (type == "quote_result" && part.status == "finish" && meta_data && isArray(meta_data.metadata_list) && !isSilentModel) {
                  partReasoning += meta_data.metadata_list.reduce((meta: string, v: any) => meta + `> 检索 ${v.title}(${v.url}) ...\n`, "");
                } else if (type == "image" && isArray(image) && part.status == "finish") {
                  partText += image.reduce((imgs: string, v: any) => imgs + (/^(http|https):\/\//.test(v.image_url) ? `![图像](${v.image_url || ""})` : ""), "") + "\n";
                } else if (type == "code") {
                  partText += "\`\`\`python\n" + code + (part.status == "finish" ? "\n\`\`\`\n" : "");
                } else if (type == "execution_output" && isString(innerContent) && part.status == "finish") {
                  partText += innerContent + "\n";
                }
              });
              if (partText) fullText += (fullText.length > 0 ? "\n" : "") + partText;
              if (partReasoning) fullReasoning += (fullReasoning.length > 0 ? "\n" : "") + partReasoning;
            });
            const reasoningChunk = fullReasoning.substring(sentReasoning.length);
            if (reasoningChunk) {
              sentReasoning += reasoningChunk;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                id: result.conversation_id, model: MODEL_NAME, object: "chat.completion.chunk",
                choices: [{ index: 0, delta: { reasoning_content: reasoningChunk }, finish_reason: null }],
                created,
              })}\n\n`));
            }
            const chunk = fullText.substring(sentContent.length);
            if (chunk) {
              sentContent += chunk;
              fullContent += chunk;
              if (!isToolCallMode && tools && tools.length > 0) {
                const trimmed = fullContent.trim();
                if (!mightBeToolCall) {
                  if (trimmed.startsWith("##") || trimmed.startsWith("{")) {
                    mightBeToolCall = true;
                    pendingContent += chunk;
                  } else {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                      id: result.conversation_id, model: MODEL_NAME, object: "chat.completion.chunk",
                      choices: [{ index: 0, delta: { content: chunk }, finish_reason: null }],
                      created,
                    })}\n\n`));
                  }
                } else {
                  pendingContent += chunk;
                  if (pendingContent.includes("##END_CALL##")) {
                    isToolCallMode = true;
                    pendingContent = "";
                  } else if (trimmed.includes('"tool_calls"') || (trimmed.startsWith("{") && trimmed.includes('"name"') && trimmed.length >= 15)) {
                    isToolCallMode = true;
                    pendingContent = "";
                  } else if (!trimmed.startsWith("##") && !trimmed.startsWith("{")) {
                    mightBeToolCall = false;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                      id: result.conversation_id, model: MODEL_NAME, object: "chat.completion.chunk",
                      choices: [{ index: 0, delta: { content: pendingContent }, finish_reason: null }],
                      created,
                    })}\n\n`));
                    pendingContent = "";
                  } else if (pendingContent.length > 100) {
                    mightBeToolCall = false;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                      id: result.conversation_id, model: MODEL_NAME, object: "chat.completion.chunk",
                      choices: [{ index: 0, delta: { content: pendingContent }, finish_reason: null }],
                      created,
                    })}\n\n`));
                    pendingContent = "";
                  }
                }
              } else if (!isToolCallMode) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  id: result.conversation_id, model: MODEL_NAME, object: "chat.completion.chunk",
                  choices: [{ index: 0, delta: { content: chunk }, finish_reason: null }],
                  created,
                })}\n\n`));
              }
            }
          } else {
            streamFinishReceived = true;
            let finishReason = "stop";
            let delta: any = result.status == "intervene" && result.last_error?.intervene_text ? { content: `\n\n${result.last_error.intervene_text}` } : {};
            if (tools && tools.length > 0) {
              const parsed = parseToolCalls(fullContent, tools);
              if (parsed.tool_calls) {
                finishReason = "tool_calls";
                delta = { tool_calls: parsed.tool_calls };
              }
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              id: result.conversation_id, model: MODEL_NAME, object: "chat.completion.chunk",
              choices: [{
                index: 0,
                delta,
                finish_reason: finishReason,
              }],
              usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
              created,
            })}\n\n`));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            endCallback?.(result.conversation_id);
          }
        } catch (err) {
          controller.error(err);
        }
      });
      let streamFinishReceived = false;
      const closeTimeout = 5000;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            // 流关闭后等待 finish 事件
            if (!streamFinishReceived) {
              console.error(`[createTransStream] 流已关闭，等待 finish 事件 (${closeTimeout}ms)...`);
              await new Promise(r => setTimeout(r, closeTimeout));
            }
            if (!streamFinishReceived) {
              console.error(`[createTransStream] 等待超时，强制关闭流`);
            }
            controller.close();
            break;
          }
          parser.feed(decoder.decode(value, { stream: true }));
        }
      } catch (err) {
        console.error(`[createTransStream] 流异常: ${err}`);
        controller.error(err);
      } finally {
        reader.releaseLock();
      }
    }
  });
}

async function receiveImages(readableStream: ReadableStream): Promise<{ convId: string; imageUrls: string[] }> {
  return new Promise((resolve, reject) => {
    let convId = "";
    const imageUrls: string[] = [];
    const parser = createParser((event) => {
      try {
        const result = attempt(() => JSON.parse(event.data));
        if (isError(result)) throw new Error(`Stream response invalid: ${event.data}`);
        if (!convId && result.conversation_id) convId = result.conversation_id;
        if (result.status == "intervene") throw new Error("内容由于合规问题已被阻止生成");
        if (result.status != "finish") {
          result.parts.forEach((part: any) => {
            const { status: partStatus, content } = part;
            if (!isArray(content)) return;
            content.forEach((value: any) => {
              const { type, image, text } = value;
              if (type == "image" && isArray(image) && partStatus == "finish") {
                image.forEach((value: any) => {
                  if (!/^(http|https):\/\//.test(value.image_url) || imageUrls.includes(value.image_url)) return;
                  imageUrls.push(value.image_url);
                });
              }
              if (type == "text" && partStatus == "finish") {
                const urlPattern = /\((https?:\/\/\S+)\)/g;
                let match;
                while ((match = urlPattern.exec(text)) !== null) {
                  const url = match[1];
                  if (!imageUrls.includes(url)) imageUrls.push(url);
                }
              }
            });
          });
        }
      } catch (err) {
        reject(err);
      }
    });
    const reader = readableStream.getReader();
    const decoder = new TextDecoder();
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) { resolve({ convId, imageUrls }); break; }
          parser.feed(decoder.decode(value, { stream: true }));
        }
      } catch (err) {
        reject(err);
      } finally {
        reader.releaseLock();
      }
    })();
  });
}

export function tokenSplit(authorization: string): string[] {
  return authorization.replace("Bearer ", "").split(",");
}

export async function getTokenLiveStatus(refreshToken: string) {
  const sign = await generateSign();
  try {
    const response = await fetch("https://chatglm.cn/chatglm/user-api/user/refresh", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${refreshToken}`,
        Referer: "https://chatglm.cn/main/alltoolsdetail",
        "X-Device-Id": uuid(false),
        "X-Request-Id": uuid(false),
        "X-Sign": sign.sign,
        "X-Timestamp": sign.timestamp,
        "X-Nonce": sign.nonce,
        ...getHeaders(),
        "Content-Type": "application/json",
      },
    });
    const data = await checkResult(response, refreshToken);
    return !!data.result?.access_token;
  } catch {
    return false;
  }
}
