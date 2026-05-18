import axios from "axios";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_REQUEST_TIMEOUT_MS = 20000;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const PRIMARY_SYSTEM_PROMPT_CHARS = Number(process.env.GROQ_PRIMARY_SYSTEM_PROMPT_CHARS || 1800);
const PRIMARY_USER_PROMPT_CHARS = Number(process.env.GROQ_PRIMARY_USER_PROMPT_CHARS || 8500);
const RETRY_SYSTEM_PROMPT_CHARS = Number(process.env.GROQ_RETRY_SYSTEM_PROMPT_CHARS || 900);
const RETRY_USER_PROMPT_CHARS = Number(process.env.GROQ_RETRY_USER_PROMPT_CHARS || 2600);
const PRIMARY_MAX_TOKENS = Number(process.env.GROQ_PRIMARY_MAX_TOKENS || 450);
const RETRY_MAX_TOKENS = Number(process.env.GROQ_RETRY_MAX_TOKENS || 280);

const GROQ_LIMIT_FRIENDLY_MESSAGE =
  "That request is too large for the current AI model. Please ask a shorter question or start a new chat.";

const EMPTY_USAGE = Object.freeze({
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
});

const createServiceError = (message, statusCode = 500) => {
  return Object.assign(new Error(message), { statusCode });
};

const normalizeUsage = (usage) => {
  if (!usage || typeof usage !== "object") {
    return { ...EMPTY_USAGE };
  }

  const promptTokens = Number.isFinite(Number(usage.prompt_tokens))
    ? Math.max(0, Number(usage.prompt_tokens))
    : 0;
  const completionTokens = Number.isFinite(Number(usage.completion_tokens))
    ? Math.max(0, Number(usage.completion_tokens))
    : 0;
  const totalTokens = Number.isFinite(Number(usage.total_tokens))
    ? Math.max(0, Number(usage.total_tokens))
    : promptTokens + completionTokens;

  return {
    promptTokens,
    completionTokens,
    totalTokens,
  };
};

const clampText = (value, maxChars) => {
  const normalized = String(value || "").trim();
  if (normalized.length <= maxChars) {
    return normalized;
  }

  return `${normalized.slice(0, maxChars)}\n\n[truncated to fit model limits]`;
};

const toClientStatus = (status) => {
  if (!status) {
    return 502;
  }

  if (status >= 500) {
    return 502;
  }

  if (status === 413) {
    return 429;
  }

  return status;
};

const isLimitError = (status, message) => {
  if (status === 413 || status === 429) {
    return true;
  }

  const normalizedMessage = String(message || "").toLowerCase();
  return (
    normalizedMessage.includes("request too large") ||
    normalizedMessage.includes("tokens per minute") ||
    normalizedMessage.includes("tpm") ||
    normalizedMessage.includes("context length") ||
    normalizedMessage.includes("rate limit")
  );
};

const buildCompactRetryUserPrompt = (userPrompt) => {
  const normalized = String(userPrompt || "");
  const contextMarkerIndex = normalized.indexOf("\nContext snapshot:");

  if (contextMarkerIndex > -1) {
    const questionPart = normalized.slice(0, contextMarkerIndex).trim();
    return clampText(
      `${questionPart}\n\nContext omitted to fit model limits. Answer with concise guidance and ask for follow-up details if needed.`,
      RETRY_USER_PROMPT_CHARS
    );
  }

  return clampText(normalized, RETRY_USER_PROMPT_CHARS);
};

const callGroqApi = async ({ apiKey, systemPrompt, userPrompt, maxTokens }) => {
  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: maxTokens,
        presence_penalty: 0.3,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: GROQ_REQUEST_TIMEOUT_MS,
      }
    );

    const payload = response.data;
    const aiText = payload?.choices?.[0]?.message?.content;

    if (typeof aiText !== "string" || aiText.trim().length === 0) {
      return {
        ok: false,
        status: 502,
        message: "Groq API returned an empty response",
      };
    }

    return {
      ok: true,
      reply: aiText.trim(),
      usage: normalizeUsage(payload?.usage),
      model: String(payload?.model || GROQ_MODEL),
    };
  } catch (error) {
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      return {
        ok: false,
        status: 504,
        message: "Groq API request timed out",
      };
    }

    const status = error.response?.status || 502;
    const message = error.response?.data?.error?.message || error.message || "Failed to reach Groq API";

    return {
      ok: false,
      status,
      message,
    };
  }
};

export const generateGroqReply = async ({ systemPrompt, userPrompt }) => {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw createServiceError("GROQ_API_KEY is not configured", 500);
  }

  if (typeof systemPrompt !== "string" || systemPrompt.trim().length === 0) {
    throw createServiceError("systemPrompt is required", 400);
  }

  if (typeof userPrompt !== "string" || userPrompt.trim().length === 0) {
    throw createServiceError("userPrompt is required", 400);
  }

  const preparedSystemPrompt = clampText(systemPrompt, PRIMARY_SYSTEM_PROMPT_CHARS);
  const preparedUserPrompt = clampText(userPrompt, PRIMARY_USER_PROMPT_CHARS);

  const primaryResult = await callGroqApi({
    apiKey,
    systemPrompt: preparedSystemPrompt,
    userPrompt: preparedUserPrompt,
    maxTokens: PRIMARY_MAX_TOKENS,
  });

  if (primaryResult.ok) {
    return {
      reply: primaryResult.reply,
      usage: primaryResult.usage,
      model: primaryResult.model,
    };
  }

  if (isLimitError(primaryResult.status, primaryResult.message)) {
    const retrySystemPrompt = clampText(systemPrompt, RETRY_SYSTEM_PROMPT_CHARS);
    const retryUserPrompt = buildCompactRetryUserPrompt(userPrompt);

    const retryResult = await callGroqApi({
      apiKey,
      systemPrompt: retrySystemPrompt,
      userPrompt: retryUserPrompt,
      maxTokens: RETRY_MAX_TOKENS,
    });

    if (retryResult.ok) {
      return {
        reply: retryResult.reply,
        usage: retryResult.usage,
        model: retryResult.model,
      };
    }

    if (isLimitError(retryResult.status, retryResult.message)) {
      throw createServiceError(GROQ_LIMIT_FRIENDLY_MESSAGE, 429);
    }

    throw createServiceError(retryResult.message, toClientStatus(retryResult.status));
  }

  throw createServiceError(primaryResult.message, toClientStatus(primaryResult.status));
};

export default generateGroqReply;