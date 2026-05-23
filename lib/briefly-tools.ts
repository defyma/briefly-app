export type ToolId = "meeting-notes" | "task-breakdown" | "reply-draft";
export type ModelOption = {
  id: string;
  label: string;
};
export type SupportedLanguage = "id" | "en";

export type OutputSectionTemplate = {
  key: string;
  label: string;
};

export type ToolDefinition = {
  id: ToolId;
  name: string;
  shortDescription: string;
  inputLabel: string;
  placeholder: string;
  ctaLabel: string;
  introLabel: string;
  sections: OutputSectionTemplate[];
};

export type GeneratedSection = OutputSectionTemplate & {
  items: string[];
};

export type GeneratedBrief = {
  toolId: ToolId;
  title: string;
  intro: string;
  sections: GeneratedSection[];
  mode: "pollinations" | "fallback";
  source: "byop" | "server" | "anonymous";
  model?: string;
  warning?: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  kind?: "seed-context" | "default";
};

export type ChatSeed = {
  toolId: ToolId;
  toolName: string;
  summary: string;
};

export const MODEL_OPTIONS: ModelOption[] = [
  { id: "deepseek", label: "DeepSeek V4 Flash (Lite)" },
  { id: "qwen-safety", label: "Qwen3Guard 8B" },
  { id: "nova-fast", label: "Nova Micro" },
  { id: "mistral", label: "Mistral Small 3.2" },
  { id: "llama-scout", label: "Meta Llama 4 Scout" },
  { id: "openai-fast", label: "GPT-5 Nano" },
];

export const BYOP_MODEL_OPTIONS = MODEL_OPTIONS;
export const DEFAULT_MODEL_ID = BYOP_MODEL_OPTIONS[0]?.id ?? "deepseek";
export const BYOP_AUTH_MODELS = BYOP_MODEL_OPTIONS.map((model) => model.id).join(",");

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    id: "meeting-notes",
    name: "Meeting Notes",
    shortDescription:
      "Turn rough notes into a clean summary, decisions, actions, and open questions.",
    inputLabel: "Paste rough notes or transcript",
    placeholder:
      "Example: Weekly sync with design. Need to finalize landing page copy by Tuesday. Sinta will review the hero section. Pricing is still undecided.",
    ctaLabel: "Summarize notes",
    introLabel: "Meeting snapshot",
    sections: [
      { key: "decisions", label: "Decisions" },
      { key: "action-items", label: "Action Items" },
      { key: "open-questions", label: "Open Questions" },
    ],
  },
  {
    id: "task-breakdown",
    name: "Task Breakdown",
    shortDescription:
      "Break a big goal into steps, priorities, order, and a focused checklist.",
    inputLabel: "Describe the goal you want to execute",
    placeholder:
      "Example: Launch the first Briefly landing page this week with a strong Pollinations showcase story.",
    ctaLabel: "Break it down",
    introLabel: "Execution snapshot",
    sections: [
      { key: "steps", label: "Steps" },
      { key: "priorities", label: "Priorities" },
      { key: "execution-order", label: "Execution Order" },
      { key: "checklist", label: "Checklist" },
    ],
  },
  {
    id: "reply-draft",
    name: "Reply Draft",
    shortDescription:
      "Draft a concise reply, tone options, and a practical follow-up.",
    inputLabel: "Paste the message or email context",
    placeholder:
      "Example: Need to reply to a client asking for a timeline change and budget confirmation after two late approvals.",
    ctaLabel: "Draft reply",
    introLabel: "Reply angle",
    sections: [
      { key: "draft-reply", label: "Draft Reply" },
      { key: "tone-options", label: "Tone Options" },
      { key: "follow-up", label: "Follow-Up" },
    ],
  },
];

export function getToolDefinition(toolId: ToolId) {
  return TOOL_DEFINITIONS.find((tool) => tool.id === toolId);
}

export function detectLanguage(input: string): SupportedLanguage {
  const lowered = ` ${input.toLowerCase()} `;
  const indonesianSignals = [
    " yang ",
    " dan ",
    " dengan ",
    " untuk ",
    " dari ",
    " belum ",
    " perlu ",
    " tolong ",
    " rapat ",
    " catatan ",
    " balas ",
    " langkah ",
    " tugas ",
    " ini ",
    " itu ",
    " agar ",
    " supaya ",
    " apakah ",
    " siapa ",
    " kapan ",
  ];

  const score = indonesianSignals.reduce(
    (count, signal) => count + (lowered.includes(signal) ? 1 : 0),
    0,
  );

  return score >= 2 ? "id" : "en";
}

export function buildPrompt(tool: ToolDefinition, input: string) {
  const language = detectLanguage(input);
  const schema = JSON.stringify(
    {
      title:
        language === "id"
          ? "judul singkat hasil"
          : "short title for the result",
      intro:
        language === "id"
          ? "ringkasan dua kalimat yang bernilai tinggi"
          : "two-sentence high-value summary",
      sections: tool.sections.map((section) => ({
        key: section.key,
        label:
          language === "id"
            ? translateSectionLabel(section.label)
            : section.label,
        items:
          language === "id"
            ? ["poin 1", "poin 2"]
            : ["bullet 1", "bullet 2"],
      })),
    },
    null,
    2,
  );

  return {
    system:
      "You are Briefly, a practical productivity copilot. Return strict JSON only. Do not wrap the JSON in markdown fences. Keep the output concise, high-signal, and directly usable.",
    user: [
      `Tool: ${tool.name}`,
      `Goal: ${tool.shortDescription}`,
      language === "id"
        ? "Gunakan bahasa Indonesia yang natural karena input user ditulis dalam bahasa Indonesia."
        : "Respond in natural English because the user input is in English.",
      "Return valid JSON using this exact schema shape:",
      schema,
      "Rules:",
      "- Keep every item actionable and specific.",
      "- Prefer 3 to 5 bullets per section when possible.",
      "- Do not include extra keys outside title, intro, and sections.",
      "- Preserve the section order exactly as provided.",
      language === "id"
        ? "- Semua title, intro, label, dan item harus memakai bahasa Indonesia."
        : "- Keep the title, intro, labels, and items in English.",
      "",
      "User input:",
      input,
    ].join("\n"),
  };
}

export function buildChatPrompt(params: {
  language: SupportedLanguage;
  context?: ChatSeed | null;
  messages: ChatMessage[];
}) {
  const { language, context, messages } = params;

  const system = [
    "You are Briefly Chat, a practical productivity copilot.",
    language === "id"
      ? "Jawab dalam bahasa Indonesia yang natural dan ringkas."
      : "Respond in natural concise English.",
    language === "id"
      ? "Kalau user minta revisi, lanjutkan, atau mempertajam hasil, bantu secara konkret."
      : "If the user asks to revise, extend, or sharpen an output, help concretely.",
    language === "id"
      ? "Format jawaban dengan rapi. Hindari tabel markdown, hindari heading berlebihan, dan jangan keluarkan simbol markup yang tidak perlu."
      : "Keep the response cleanly formatted. Avoid markdown tables, avoid excessive headings, and do not output unnecessary markup symbols.",
    language === "id"
      ? "Utamakan paragraf pendek atau bullet sederhana hanya jika memang membantu."
      : "Prefer short paragraphs or simple bullets only when they genuinely help.",
    language === "id"
      ? "Kalau butuh formatting, gunakan hanya format ringan berikut: *bold*, _italic_, ~strikethrough~, `inline code`, ```code block```, bullet list dengan '- ' atau '* ', numbered list dengan '1. ', dan quote dengan '> '. Jangan gunakan format markdown lain di luar itu."
      : "If formatting helps, use only these lightweight formats: *bold*, _italic_, ~strikethrough~, `inline code`, ```code block```, bullet lists with '- ' or '* ', numbered lists with '1. ', and quotes with '> '. Do not use other markdown formats beyond these.",
    context
      ? language === "id"
        ? `Konteks awal berasal dari tool ${context.toolName}.`
        : `The starting context came from the ${context.toolName} tool.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const seededMessages = context
    ? [
        {
          role: "system" as const,
          content:
            language === "id"
              ? `Hasil sebelumnya untuk dibahas:\n${context.summary}`
              : `Previous result to discuss:\n${context.summary}`,
        },
      ]
    : [];

  return {
    system,
    messages: [...seededMessages, ...messages],
  };
}

export function extractJsonObject(value: string) {
  const trimmed = value.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
    return null;
  }

  return trimmed.slice(firstBrace, lastBrace + 1);
}

function splitIntoUsefulLines(input: string) {
  return input
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function splitIntoSentences(input: string) {
  return input
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function truncate(value: string, max = 140) {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max - 1).trimEnd()}...`;
}

function uniqueItems(items: string[], fallback: string[]) {
  const deduped = Array.from(
    new Set(items.map((item) => item.trim()).filter(Boolean)),
  );

  return deduped.length > 0 ? deduped : fallback;
}

function translateSectionLabel(label: string) {
  const translations: Record<string, string> = {
    Decisions: "Keputusan",
    "Action Items": "Action Items",
    "Open Questions": "Pertanyaan Terbuka",
    Steps: "Langkah",
    Priorities: "Prioritas",
    "Execution Order": "Urutan Eksekusi",
    Checklist: "Checklist",
    "Draft Reply": "Draft Balasan",
    "Tone Options": "Pilihan Tone",
    "Follow-Up": "Follow-Up",
  };

  return translations[label] || label;
}

function meetingFallback(input: string, source: GeneratedBrief["source"]) {
  const language = detectLanguage(input);
  const lines = splitIntoUsefulLines(input);
  const sentences = splitIntoSentences(input);
  const decisions = uniqueItems(
    lines.filter((line) =>
      /(decid|final|approved|agreed|chosen|selected|confirmed)/i.test(line),
    ),
    lines.slice(0, 2).map((line) =>
      language === "id"
        ? `Konfirmasi konteks: ${truncate(line, 90)}`
        : `Confirm context: ${truncate(line, 90)}`,
    ),
  );
  const actionItems = uniqueItems(
    lines.filter((line) =>
      /(need|todo|action|follow up|next|assign|owner|must|by\s)/i.test(line),
    ),
    lines.slice(0, 3).map((line) =>
      language === "id"
        ? `Tindak lanjuti: ${truncate(line, 90)}`
        : `Follow up on: ${truncate(line, 90)}`,
    ),
  );
  const questions = uniqueItems(
    lines.filter((line) => line.includes("?")),
    language === "id"
      ? [
          "Perjelas hal apa yang masih belum selesai dari catatan ini.",
          "Tentukan penanggung jawab dan waktu untuk langkah paling mendesak.",
        ]
      : [
          "Clarify what is still unresolved from these notes.",
          "Confirm owners and timing for the most urgent next step.",
        ],
  );

  return {
    toolId: "meeting-notes",
    title:
      language === "id" ? "Catatan meeting diringkas" : "Meeting notes condensed",
    intro:
      sentences.slice(0, 2).join(" ") ||
      (language === "id"
        ? "Catatan ini sudah diringkas menjadi keputusan utama dan langkah berikutnya."
        : "These notes have been condensed into the main decisions and next actions."),
    sections: [
      {
        key: "decisions",
        label: translateSectionLabel("Decisions"),
        items: decisions.slice(0, 5),
      },
      {
        key: "action-items",
        label: translateSectionLabel("Action Items"),
        items: actionItems.slice(0, 5),
      },
      {
        key: "open-questions",
        label: translateSectionLabel("Open Questions"),
        items: questions.slice(0, 5),
      },
    ],
    mode: "fallback",
    source,
    model: "fallback",
    warning:
      language === "id"
        ? "Briefly memakai format fallback karena Pollinations tidak tersedia untuk request ini."
        : "Using Briefly fallback formatting because Pollinations was not available for this request.",
  } satisfies GeneratedBrief;
}

function taskFallback(input: string, source: GeneratedBrief["source"]) {
  const language = detectLanguage(input);
  const lines = splitIntoUsefulLines(input);
  const mainGoal = truncate(
    lines[0] || input || (language === "id" ? "Selesaikan hasil yang diminta." : "Deliver the requested outcome."),
  );

  const steps = uniqueItems(
    lines.slice(0, 4).map((line, index) =>
      language === "id"
        ? `Langkah ${index + 1}: ${truncate(line, 90)}`
        : `Step ${index + 1}: ${truncate(line, 90)}`,
    ),
    language === "id"
      ? [
          `Definisikan scope untuk: ${mainGoal}`,
          "Pecah goal menjadi deliverable kecil.",
          "Kerjakan bagian paling berisiko lebih dulu.",
        ]
      : [
          `Define the scope for: ${mainGoal}`,
          "Break the goal into small deliverables.",
          "Execute the highest-risk piece first.",
        ],
  );

  return {
    toolId: "task-breakdown",
    title:
      language === "id" ? "Rencana eksekusi disusun" : "Execution plan drafted",
    intro:
      language === "id"
        ? `Goal-nya adalah "${mainGoal}". Ini breakdown praktis yang bisa langsung dikerjakan tanpa kehilangan momentum.`
        : `The goal is "${mainGoal}". Here is a practical breakdown you can execute in order without losing momentum.`,
    sections: [
      { key: "steps", label: translateSectionLabel("Steps"), items: steps.slice(0, 5) },
      {
        key: "priorities",
        label: translateSectionLabel("Priorities"),
        items:
          language === "id"
            ? [
                "Kunci dulu kriteria suksesnya.",
                "Kerjakan blocker terbesar sebelum merapikan detail.",
                "Buat dependensi tetap terlihat supaya plan tetap realistis.",
              ]
            : [
                "Lock the success criteria first.",
                "Handle the biggest blocker before polishing details.",
                "Keep dependencies visible so the plan stays realistic.",
              ],
      },
      {
        key: "execution-order",
        label: translateSectionLabel("Execution Order"),
        items:
          language === "id"
            ? [
                "1. Perjelas scope dan constraint.",
                "2. Bangun versi terkecil yang tetap berguna.",
                "3. Review, rapikan, lalu siapkan delivery.",
              ]
            : [
                "1. Clarify scope and constraints.",
                "2. Build the smallest useful version.",
                "3. Review, refine, and prepare delivery.",
              ],
      },
      {
        key: "checklist",
        label: translateSectionLabel("Checklist"),
        items:
          language === "id"
            ? [
                "Tulis output konkret yang diharapkan.",
                "Identifikasi siapa atau apa yang jadi dependensi.",
                "Pasang checkpoint review singkat sebelum delivery final.",
              ]
            : [
                "Write down the concrete output expected.",
                "Identify who or what you depend on.",
                "Set a short review point before final delivery.",
              ],
      },
    ],
    mode: "fallback",
    source,
    model: "fallback",
    warning:
      language === "id"
        ? "Briefly memakai planning fallback karena Pollinations tidak tersedia untuk request ini."
        : "Using Briefly fallback planning because Pollinations was not available for this request.",
  } satisfies GeneratedBrief;
}

function replyFallback(input: string, source: GeneratedBrief["source"]) {
  const language = detectLanguage(input);
  const context = truncate(
    splitIntoSentences(input)[0] || input || (language === "id" ? "permintaan ini" : "the request"),
  );

  return {
    toolId: "reply-draft",
    title:
      language === "id" ? "Draft balasan disiapkan" : "Reply draft prepared",
    intro:
      language === "id"
        ? `Draft ini fokus pada kejelasan, tone yang tenang, dan next step yang berguna untuk ${context}.`
        : `This draft focuses on clarity, calm tone, and a useful next step for ${context}.`,
    sections: [
      {
        key: "draft-reply",
        label: translateSectionLabel("Draft Reply"),
        items:
          language === "id"
            ? [
                "Terima kasih untuk updatenya. Aku paham konteks dan concern soal timeline-nya.",
                "Dari sisi kami, next step terbaik adalah menyamakan revisi scope lalu memastikan apa yang masih bisa jalan minggu ini.",
                "Kalau cocok, aku bisa kirim plan yang lebih rapi beserta penyesuaian timing dan dampak budget-nya.",
              ]
            : [
                "Thanks for the update. I understand the context and the timeline concern.",
                "From our side, the best next step is to align on the revised scope and confirm what can still move this week.",
                "If you are okay with that, I can send a tighter plan with the adjusted timing and any budget impact.",
              ],
      },
      {
        key: "tone-options",
        label: translateSectionLabel("Tone Options"),
        items:
          language === "id"
            ? [
                "Profesional: langsung dan minim emosi.",
                "Hangat: kolaboratif dan menenangkan.",
                "Tegas: jelas soal batasan dan keputusan berikutnya.",
              ]
            : [
                "Professional: direct and low-emotion.",
                "Warm: collaborative and reassuring.",
                "Firm: clear on constraints and next decision needed.",
              ],
      },
      {
        key: "follow-up",
        label: translateSectionLabel("Follow-Up"),
        items:
          language === "id"
            ? [
                "Minta satu konfirmasi konkret untuk membuka langkah berikutnya.",
                "Usulkan deadline balasan kalau urusannya mendesak.",
                "Tawarkan call singkat hanya kalau thread tertulisnya sudah terlalu berantakan.",
              ]
            : [
                "Ask for one concrete confirmation to unblock the next step.",
                "Propose a deadline for reply if the matter is urgent.",
                "Offer a short call only if the written thread is getting messy.",
              ],
      },
    ],
    mode: "fallback",
    source,
    model: "fallback",
    warning:
      language === "id"
        ? "Briefly memakai draft fallback karena Pollinations tidak tersedia untuk request ini."
        : "Using Briefly fallback drafting because Pollinations was not available for this request.",
  } satisfies GeneratedBrief;
}

export function buildFallbackResult(
  toolId: ToolId,
  input: string,
  source: GeneratedBrief["source"] = "anonymous",
) {
  if (toolId === "meeting-notes") {
    return meetingFallback(input, source);
  }

  if (toolId === "task-breakdown") {
    return taskFallback(input, source);
  }

  return replyFallback(input, source);
}

export function normalizeModelResult(
  tool: ToolDefinition,
  rawContent: string,
  source: GeneratedBrief["source"],
  model?: string,
) {
  const extracted = extractJsonObject(rawContent);

  if (!extracted) {
    return null;
  }

  const parsed = JSON.parse(extracted) as {
    title?: unknown;
    intro?: unknown;
    sections?: Array<{
      key?: unknown;
      label?: unknown;
      items?: unknown;
    }>;
  };

  if (
    typeof parsed.title !== "string" ||
    typeof parsed.intro !== "string" ||
    !Array.isArray(parsed.sections)
  ) {
    return null;
  }

  const sections = tool.sections.map((expectedSection) => {
    const matched = parsed.sections?.find(
      (section) => section?.key === expectedSection.key,
    );

    const items = Array.isArray(matched?.items)
      ? matched.items.filter((item): item is string => typeof item === "string")
      : [];

    return {
      ...expectedSection,
      items: uniqueItems(items, [`No ${expectedSection.label.toLowerCase()} returned.`]).slice(0, 5),
    };
  });

  return {
    toolId: tool.id,
    title: parsed.title.trim(),
    intro: parsed.intro.trim(),
    sections,
    mode: "pollinations",
    source,
    model,
  } satisfies GeneratedBrief;
}

export function formatBriefForCopy(result: GeneratedBrief) {
  const chunks = [`${result.title}`, "", result.intro];

  for (const section of result.sections) {
    chunks.push("", `${section.label}`);
    for (const item of section.items) {
      chunks.push(`- ${item}`);
    }
  }

  return chunks.join("\n");
}

export function buildChatFallback(params: {
  language: SupportedLanguage;
  message: string;
  context?: ChatSeed | null;
}) {
  const { language, message, context } = params;

  if (language === "id") {
    return context
      ? `Kita bisa lanjut dari hasil ${context.toolName.toLowerCase()} tadi. Fokus permintaanmu sekarang: "${truncate(
          message,
          120,
        )}". Kalau mau, aku bisa bantu revisi, bikin versi lebih ringkas, atau teruskan jadi langkah berikutnya.`
      : `Aku tangkap arah permintaanmu: "${truncate(
          message,
          120,
        )}". Kalau mau, aku bisa bantu pecah jadi revisi yang lebih spesifik atau lanjutkan jadi output berikutnya.`;
  }

  return context
    ? `We can continue from the earlier ${context.toolName.toLowerCase()} result. Your current ask is "${truncate(
        message,
        120,
      )}". I can help revise it, tighten it, or extend it into the next step.`
    : `I understand the direction of your request: "${truncate(
        message,
        120,
      )}". I can help turn that into a sharper revision or continue it into the next output.`;
}
