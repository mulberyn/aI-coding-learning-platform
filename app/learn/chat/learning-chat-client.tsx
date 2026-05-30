"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import {
  Bot,
  BookOpen,
  ChevronDown,
  FileText,
  Lightbulb,
  MessageSquareText,
  Plus,
  Send,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: Array<{
    id: string;
    type: "selection" | "preset";
    title: string;
    content: string;
  }>;
};

type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt?: string;
};

type ConversationRow = {
  id?: unknown;
  title?: unknown;
  messages?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type PresetOption = {
  title: string;
  detail: string;
  prompt: string;
  icon: typeof Lightbulb;
};

type SelectedFile = {
  id: string;
  name: string;
  content: string;
};

const DEFAULT_CONVERSATION_TITLE = "新建对话";

const PRESET_OPTIONS: PresetOption[] = [
  {
    title: "我在学习过程中遇到了哪些薄弱点？",
    detail: "结合本平台学习概览分析当前短板。",
    prompt: "请结合我在本平台内的学习概览，分析我当前的薄弱点。",
    icon: Lightbulb,
  },
  {
    title: "我应该优先学习哪些知识点？",
    detail: "结合平台内学习情况给出优先级清单。",
    prompt: "请结合我在本平台内的学习概览，给出一个优先级清晰的学习建议列表。",
    icon: BookOpen,
  },
  {
    title: "我有哪些题目是错的？",
    detail: "结合平台内记录回顾近期错题。",
    prompt: "请结合我在本平台内的学习概览，回顾近期做错的题目并总结原因。",
    icon: MessageSquareText,
  },
  {
    title: "信息教练 skill",
    detail: "结合平台学习概览诊断学习状态。",
    prompt:
      "使用信息教练 skill，结合我在本平台内的学习概览，对当前学习状态进行诊断。",
    icon: Sparkles,
  },
  {
    title: "求职辅导 skill",
    detail: "结合平台内学习情况给出建议。",
    prompt:
      "使用求职辅导 skill，结合我在本平台内的学习概览，给出简历与面试准备建议。",
    icon: Bot,
  },
  {
    title: "学习规划 skill",
    detail: "结合平台内学习情况生成安排。",
    prompt:
      "使用学习规划 skill，结合我在本平台内的学习概览，制定未来两周的学习计划。",
    icon: FileText,
  },
];

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function normalizeMessages(rawMessages: unknown): ChatMessage[] {
  let candidate = rawMessages;

  for (let index = 0; index < 3; index += 1) {
    const parsed = parseMaybeJson(candidate);
    if (parsed === candidate) {
      break;
    }
    candidate = parsed;
  }

  if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
    const wrapped = candidate as { messages?: unknown };
    if (Array.isArray(wrapped.messages)) {
      candidate = wrapped.messages;
    }
  }

  if (!Array.isArray(candidate)) {
    return [];
  }

  return candidate
    .map((message): ChatMessage | null => {
      if (!message || typeof message !== "object") {
        return null;
      }

      const value = message as {
        role?: unknown;
        content?: unknown;
        attachments?: unknown;
      };

      const role =
        typeof value.role === "string" &&
        ["user", "assistant", "system"].includes(value.role)
          ? (value.role as ChatMessage["role"])
          : null;

      const content = typeof value.content === "string" ? value.content : "";
      if (!role || !content.trim()) {
        return null;
      }

      const attachments = Array.isArray(value.attachments)
        ? value.attachments
            .filter((item) => item && typeof item === "object")
            .map((item) => {
              const attachment = item as {
                id?: unknown;
                type?: unknown;
                title?: unknown;
                content?: unknown;
              };

              return {
                id:
                  typeof attachment.id === "string" && attachment.id.trim()
                    ? attachment.id
                    : createId("att"),
                type: attachment.type === "selection" ? "selection" : "preset",
                title:
                  typeof attachment.title === "string" ? attachment.title : "",
                content:
                  typeof attachment.content === "string"
                    ? attachment.content
                    : "",
              };
            })
        : undefined;

      return {
        role,
        content,
        attachments,
      };
    })
    .filter((message): message is ChatMessage => Boolean(message));
}

function normalizeConversation(row: ConversationRow): Conversation | null {
  const id = typeof row.id === "string" ? row.id : "";
  if (!id) {
    return null;
  }

  return {
    id,
    title:
      typeof row.title === "string" && row.title.trim()
        ? row.title
        : DEFAULT_CONVERSATION_TITLE,
    messages: normalizeMessages(row.messages),
    createdAt:
      typeof row.createdAt === "string" && row.createdAt.trim()
        ? row.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof row.updatedAt === "string" && row.updatedAt.trim()
        ? row.updatedAt
        : undefined,
  };
}

function normalizeConversationList(rawItems: unknown): Conversation[] {
  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems
    .map((item) => normalizeConversation(item as ConversationRow))
    .filter((item): item is Conversation => Boolean(item));
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        p: ({ children }) => <p className="m-0 leading-6">{children}</p>,
        ul: ({ children }) => (
          <ul className="m-0 list-disc space-y-1 pl-5">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="m-0 list-decimal space-y-1 pl-5">{children}</ol>
        ),
        li: ({ children }) => <li>{children}</li>,
        a: ({ children, ...props }) => (
          <a {...props} className="text-sky-600 underline underline-offset-2">
            {children}
          </a>
        ),
        code: ({ inline, children, ...props }: any) =>
          inline ? (
            <code
              className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[0.9em] text-slate-800"
              {...props}
            >
              {children}
            </code>
          ) : (
            <code {...props}>{children}</code>
          ),
        pre: ({ children }) => (
          <pre className="overflow-x-auto rounded-[10px] border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
            {children}
          </pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-slate-300 pl-3 text-slate-600">
            {children}
          </blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function ChatBubble({
  message,
  isUser,
}: {
  message: ChatMessage;
  isUser: boolean;
}) {
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="relative max-w-[min(42rem,88%)]">
        <span
          aria-hidden="true"
          className={`absolute top-4 h-3 w-3 rotate-45 border ${
            isUser
              ? "-right-1.5 border-r border-t border-sky-200 bg-sky-50"
              : "-left-1.5 border-l border-b border-slate-200 bg-white"
          }`}
        />

        <div
          className={`rounded-[10px] border px-4 py-3 text-[0.96rem] shadow-sm ${
            isUser
              ? "border-sky-200 bg-sky-50 text-slate-800"
              : "border-slate-200 bg-white text-slate-800"
          }`}
        >
          <div className="mb-2 flex items-center justify-between gap-3 text-xs text-slate-500">
            <span className="font-medium text-slate-600">
              {isUser ? "我" : "AI"}
            </span>
          </div>

          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {message.attachments.map((attachment) => (
                <span
                  key={attachment.id}
                  className={`inline-flex items-center gap-1 rounded-[6px] border px-2 py-1 text-xs ${
                    attachment.type === "selection"
                      ? "border-slate-200 bg-slate-50 text-slate-600"
                      : "border-sky-200 bg-sky-50 text-sky-700"
                  }`}
                >
                  <FileText size={12} />
                  <span className="max-w-[18rem] truncate">
                    {attachment.title}
                  </span>
                </span>
              ))}
            </div>
          )}

          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-0 prose-ul:my-0 prose-ol:my-0 prose-li:my-0">
            <MarkdownContent content={message.content} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function LearningChatClient() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [presetPanelOpen, setPresetPanelOpen] = useState(true);
  const [selectedPresets, setSelectedPresets] = useState<PresetOption[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.id === selectedConversationId,
      ) ?? null,
    [conversations, selectedConversationId],
  );

  const hasComposerContent =
    draftText.trim().length > 0 ||
    selectedPresets.length > 0 ||
    selectedFiles.length > 0;

  async function loadConversations() {
    setIsLoading(true);
    try {
      const resp = await fetch("/api/ai/conversations", { cache: "no-store" });
      if (!resp.ok) {
        setConversations([]);
        setSelectedConversationId(null);
        return;
      }

      const data = (await resp.json()) as { items?: unknown };
      const nextConversations = normalizeConversationList(data.items);
      setConversations(nextConversations);
      setSelectedConversationId(nextConversations[0]?.id ?? null);
    } catch (error) {
      console.error("Failed to load conversations:", error);
      setConversations([]);
      setSelectedConversationId(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConversation?.messages.length]);

  function resetComposer() {
    setDraftText("");
    setSelectedPresets([]);
    setSelectedFiles([]);
    setPresetPanelOpen(false);
  }

  async function persistConversation(nextConversation: Conversation) {
    const resp = await fetch("/api/ai/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: nextConversation.id,
        title: nextConversation.title,
        messages: nextConversation.messages,
      }),
    });

    if (!resp.ok) {
      throw new Error("Failed to persist conversation");
    }
  }

  async function createNewConversation() {
    const nextConversation: Conversation = {
      id: createId("conv"),
      title: DEFAULT_CONVERSATION_TITLE,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setConversations((prev) => [nextConversation, ...prev]);
    setSelectedConversationId(nextConversation.id);
    resetComposer();

    try {
      await persistConversation(nextConversation);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  }

  function selectConversation(id: string) {
    setSelectedConversationId(id);
    resetComposer();
  }

  function togglePreset(preset: PresetOption) {
    setSelectedPresets((prev) => {
      const exists = prev.some((item) => item.title === preset.title);
      if (exists) {
        return prev.filter((item) => item.title !== preset.title);
      }

      return [...prev, preset];
    });
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    const nextFiles = await Promise.all(
      files.map(async (file) => ({
        id: createId("skill"),
        name: file.name,
        content: await file.text(),
      })),
    );

    setSelectedFiles((prev) => [...prev, ...nextFiles]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function removeFile(fileId: string) {
    setSelectedFiles((prev) => prev.filter((item) => item.id !== fileId));
  }

  async function maybeGenerateConversationTitle(
    conversation: Conversation,
    promptSeed: string,
  ) {
    if (
      conversation.title &&
      conversation.title !== DEFAULT_CONVERSATION_TITLE
    ) {
      return conversation.title;
    }

    const resp = await fetch("/api/ai/generate-name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: promptSeed }),
    });

    if (!resp.ok) {
      return promptSeed.slice(0, 16) || DEFAULT_CONVERSATION_TITLE;
    }

    const data = (await resp.json()) as { title?: unknown };
    const nextTitle = typeof data.title === "string" ? data.title.trim() : "";

    return nextTitle || promptSeed.slice(0, 16) || DEFAULT_CONVERSATION_TITLE;
  }

  async function sendMessage() {
    const conversation = selectedConversation;
    if (!conversation || isSending || !hasComposerContent) {
      return;
    }

    const attachmentSummaries = [
      ...selectedPresets.map((preset) => ({
        id: createId("att"),
        type: "preset" as const,
        title: preset.title,
        content: preset.prompt,
      })),
      ...selectedFiles.map((file) => ({
        id: createId("att"),
        type: "selection" as const,
        title: file.name,
        content: file.name,
      })),
    ];

    const userText =
      draftText.trim() || selectedPresets.map((item) => item.title).join("；");
    const contextText = [
      selectedPresets.map((preset) => preset.prompt).join("\n\n"),
      selectedFiles
        .map((file) => `【skill 文件：${file.name}】\n${file.content.trim()}`)
        .join("\n\n"),
    ]
      .filter((item) => item.trim().length > 0)
      .join("\n\n---\n\n");

    const userMessage: ChatMessage = {
      role: "user",
      content: userText,
      attachments:
        attachmentSummaries.length > 0 ? attachmentSummaries : undefined,
    };

    const messagesAfterUser = [...conversation.messages, userMessage];
    const nextConversationAfterUser: Conversation = {
      ...conversation,
      messages: messagesAfterUser,
      updatedAt: new Date().toISOString(),
    };

    setConversations((prev) =>
      prev.map((item) =>
        item.id === conversation.id ? nextConversationAfterUser : item,
      ),
    );

    setIsSending(true);

    try {
      const chatResp = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesAfterUser,
          context: contextText,
        }),
      });

      if (!chatResp.ok) {
        throw new Error("Failed to get AI response");
      }

      const chatData = (await chatResp.json()) as { content?: unknown };
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content:
          typeof chatData.content === "string" && chatData.content.trim()
            ? chatData.content
            : "暂时没有生成内容，请稍后再试。",
      };

      const messagesAfterAssistant = [...messagesAfterUser, assistantMessage];
      let nextTitle = conversation.title;
      if (conversation.title === DEFAULT_CONVERSATION_TITLE) {
        nextTitle = await maybeGenerateConversationTitle(
          { ...conversation, messages: messagesAfterAssistant },
          [
            userText,
            ...selectedPresets.map((preset) => preset.title),
            ...selectedFiles.map((file) => file.name),
          ]
            .filter(Boolean)
            .join(" | "),
        );
      }

      const nextConversation: Conversation = {
        ...conversation,
        title: nextTitle,
        messages: messagesAfterAssistant,
        updatedAt: new Date().toISOString(),
      };

      setConversations((prev) =>
        prev.map((item) =>
          item.id === conversation.id ? nextConversation : item,
        ),
      );

      await persistConversation(nextConversation);
      resetComposer();
    } catch (error) {
      console.error("Failed to send message:", error);
      setConversations((prev) =>
        prev.map((item) => (item.id === conversation.id ? conversation : item)),
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-120px)] w-full max-w-7xl overflow-hidden px-4 sm:px-6 lg:px-8">
      <aside className="flex w-[300px] shrink-0 flex-col border-r border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="border-b border-slate-200/80 px-4 py-4">
          <button
            type="button"
            onClick={createNewConversation}
            className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-sky-100 px-3 text-sm font-medium text-sky-700 transition-colors hover:bg-sky-200"
          >
            <Plus size={16} />
            创建新对话
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            对话历史
          </div>

          {isLoading ? (
            <div className="px-2 py-3 text-sm text-slate-500">正在加载...</div>
          ) : conversations.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
              还没有保存的对话，先创建一个新的开始聊天。
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conversation) => {
                const active = conversation.id === selectedConversationId;
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => selectConversation(conversation.id)}
                    className={`w-full rounded-[10px] border px-3 py-3 text-left transition-colors ${
                      active
                        ? "border-sky-200 bg-sky-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="truncate text-sm font-medium text-slate-800">
                      {conversation.title}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {formatDateTime(conversation.createdAt)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-white/60">
        {selectedConversation ? (
          <>
            <header className="border-b border-slate-200/80 px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-slate-900">
                    {selectedConversation.title}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    创建于 {formatDateTime(selectedConversation.createdAt)}
                  </div>
                </div>

                <div className="text-sm text-slate-500">
                  {selectedConversation.messages.length > 0
                    ? `${selectedConversation.messages.length} 条消息`
                    : "空白对话"}
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {selectedConversation.messages.filter(
                (item) => item.role !== "system",
              ).length === 0 ? (
                <div className="flex h-full items-center justify-center py-16 text-center text-slate-500">
                  <div>
                    <div className="text-lg font-medium text-slate-700">
                      开始一段新的对话
                    </div>
                    <div className="mt-2 text-sm">
                      先从下方选择一个预设问题，或者直接输入你的问题。
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedConversation.messages
                    .filter((item) => item.role !== "system")
                    .map((message, index) => (
                      <ChatBubble
                        key={`${selectedConversation.id}-${index}`}
                        message={message}
                        isUser={message.role === "user"}
                      />
                    ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <footer className="border-t border-slate-200/80 bg-white/95 px-6 py-4 backdrop-blur">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPresetPanelOpen((prev) => !prev)}
                    className="inline-flex h-9 items-center gap-1 rounded-[8px] border border-slate-200 bg-white px-3 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    预设问题
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${presetPanelOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex h-9 items-center gap-1 rounded-[8px] border border-slate-200 bg-white px-3 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <Upload size={14} />
                    上传 skill
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      void handleFileSelect(event);
                    }}
                  />

                  <div className="ml-auto text-xs text-slate-400">
                    Ctrl + Enter 发送
                  </div>
                </div>

                {presetPanelOpen ? (
                  <div className="grid gap-2 rounded-[10px] border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 xl:grid-cols-3">
                    {PRESET_OPTIONS.map((preset) => {
                      const Icon = preset.icon;
                      const active = selectedPresets.some(
                        (item) => item.title === preset.title,
                      );

                      return (
                        <button
                          key={preset.title}
                          type="button"
                          onClick={() => togglePreset(preset)}
                          className={`flex items-start gap-2 rounded-[8px] border p-3 text-left transition-colors ${
                            active
                              ? "border-sky-200 bg-sky-50"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <span className="mt-0.5 rounded-[6px] bg-slate-100 p-1.5 text-slate-700">
                            <Icon size={14} />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-slate-800">
                              {preset.title}
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-slate-500">
                              {preset.detail}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {selectedPresets.length > 0 || selectedFiles.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedPresets.map((preset) => (
                      <span
                        key={preset.title}
                        className="inline-flex items-center gap-1 rounded-[8px] border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs text-sky-700"
                      >
                        {preset.title}
                        <button
                          type="button"
                          onClick={() => togglePreset(preset)}
                          className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-sky-100"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}

                    {selectedFiles.map((file) => (
                      <span
                        key={file.id}
                        className="inline-flex items-center gap-1 rounded-[8px] border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600"
                      >
                        <FileText size={12} />
                        {file.name}
                        <button
                          type="button"
                          onClick={() => removeFile(file.id)}
                          className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-slate-100"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="flex items-end gap-2">
                  <textarea
                    value={draftText}
                    onChange={(event) => setDraftText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && event.ctrlKey) {
                        event.preventDefault();
                        void sendMessage();
                      }
                    }}
                    placeholder="输入你的问题，或先选一个预设问题 / skill"
                    rows={4}
                    className="min-h-[112px] flex-1 resize-none rounded-[8px] border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      void sendMessage();
                    }}
                    disabled={isSending || !hasComposerContent}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] bg-sky-500 text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                    aria-label="发送消息"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center px-6 py-16 text-center text-slate-500">
            <div>
              <div className="text-lg font-medium text-slate-700">
                选择一个对话或创建新对话
              </div>
              <div className="mt-2 text-sm">
                左侧先创建会话，再在右侧继续追问、追加预设问题或上传 skill。
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
