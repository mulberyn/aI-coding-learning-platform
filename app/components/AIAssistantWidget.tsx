"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  BookOpen,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Lightbulb,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { useEffect, useMemo, useRef, useState } from "react";

type ContextItem = {
  id: string;
  type: "selection" | "preset";
  title: string;
  content: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: ContextItem[];
  promptText?: string;
};

type AssistantApiResponse = {
  content?: string;
  error?: string;
};

type PresetItem = {
  title: string;
  content: string;
  icon: typeof Lightbulb;
};

const presetItems: PresetItem[] = [
  {
    title: "我在学习过程中遇到了哪些薄弱点？",
    content: "请基于我的做题与提交记录，分析我当前的薄弱点。",
    icon: Lightbulb,
  },
  {
    title: "我应该优先学习哪些知识点？",
    content: "请给出一个优先级清晰的学习建议列表。",
    icon: BookOpen,
  },
  {
    title: "我有哪些题目是错的？",
    content: "请帮助我回顾近期做错的题目并总结原因。",
    icon: MessageSquare,
  },
  {
    title: "信息教练 skill",
    content: "使用信息教练 skill，对当前学习状态进行诊断。",
    icon: Sparkles,
  },
  {
    title: "求职辅导 skill",
    content: "使用求职辅导 skill，给出简历与面试准备建议。",
    icon: GraduationCap,
  },
  {
    title: "学习规划 skill",
    content: "使用学习规划 skill，制定未来两周的学习计划。",
    icon: Bot,
  },
];

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function renderMessageContent(content: string) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        p: ({ children }) => <p className="m-0">{children}</p>,
        ul: ({ children }) => (
          <ul className="m-0 list-disc pl-5">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="m-0 list-decimal pl-5">{children}</ol>
        ),
        li: ({ children }) => <li className="mt-1 first:mt-0">{children}</li>,
        a: ({ children, ...props }) => (
          <a {...props} className="text-primary underline underline-offset-2">
            {children}
          </a>
        ),
        code: ({ inline, children, className, ...props }: any) =>
          inline ? (
            <code
              className="rounded border border-ui bg-panel-strong px-1.5 py-0.5 text-[0.88em]"
              {...props}
            >
              {children}
            </code>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          ),
        pre: ({ children }) => (
          <pre className="overflow-x-auto">{children}</pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-ui pl-3 text-muted">
            {children}
          </blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export function AIAssistantWidget() {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const selectionTextRef = useRef("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const resizeStateRef = useRef<{
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [draftSelection, setDraftSelection] = useState("");
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [previewItem, setPreviewItem] = useState<ContextItem | null>(null);
  const [panelSize, setPanelSize] = useState({ width: 460, height: 540 });
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: createId("assistant"),
      role: "assistant",
      content:
        "你好，我是 AI 助手。你可以选中文本、选择预设问题或直接输入问题。我也支持公式，比如 $a^2+b^2=c^2$。",
    },
  ]);
  const [isSending, setIsSending] = useState(false);

  const combinedContextText = useMemo(() => {
    if (contextItems.length === 0) {
      return "";
    }

    return contextItems
      .map((item, index) => {
        const label =
          item.type === "selection" ? `上下文 ${index + 1}` : item.title;
        return `- ${label}: ${item.content}`;
      })
      .join("\n");
  }, [contextItems]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!panelRef.current) {
        return;
      }

      const target = event.target;
      if (target instanceof Node && !panelRef.current.contains(target)) {
        setPresetOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedSize = window.localStorage.getItem("aioj.ai-assistant.size.v1");
    if (!storedSize) {
      return;
    }

    try {
      const parsed = JSON.parse(storedSize) as {
        width?: number;
        height?: number;
      };
      if (
        typeof parsed.width === "number" &&
        typeof parsed.height === "number"
      ) {
        setPanelSize({ width: parsed.width, height: parsed.height });
      }
    } catch {
      // Ignore malformed storage.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      "aioj.ai-assistant.size.v1",
      JSON.stringify(panelSize),
    );
  }, [panelSize]);

  useEffect(() => {
    if (!selectionMode) {
      setDraftSelection("");
      selectionTextRef.current = "";
      document.body.style.cursor = "";
      return;
    }

    const previousCursor = document.body.style.cursor;
    document.body.style.cursor = "text";

    const syncSelection = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim() ?? "";

      if (!text) {
        setDraftSelection("");
        selectionTextRef.current = "";
        return;
      }

      const anchorNode = selection?.anchorNode;
      if (anchorNode && panelRef.current?.contains(anchorNode)) {
        return;
      }

      selectionTextRef.current = text;
      setDraftSelection(text);
    };

    document.addEventListener("selectionchange", syncSelection);

    return () => {
      document.removeEventListener("selectionchange", syncSelection);
      document.body.style.cursor = previousCursor;
    };
  }, [selectionMode]);

  useEffect(() => {
    if (!open) {
      setSelectionMode(false);
      setPresetOpen(false);
      clearSelection();
    }
  }, [open]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        block: "end",
        behavior: open ? "smooth" : "auto",
      });
    }
  }, [messages, open]);

  function clearSelection() {
    window.getSelection()?.removeAllRanges();
    selectionTextRef.current = "";
    setDraftSelection("");
  }

  function confirmSelection() {
    const text = selectionTextRef.current.trim();
    if (!text) {
      return;
    }

    const nextItem: ContextItem = {
      id: createId("selection"),
      type: "selection",
      title: `文本 ${contextItems.filter((item) => item.type === "selection").length + 1}`,
      content: text,
    };

    setContextItems((items) => [...items, nextItem]);
    setPreviewItem(nextItem);
    clearSelection();
  }

  function addPreset(item: PresetItem) {
    setContextItems((items) => [
      ...items,
      {
        id: createId("preset"),
        type: "preset",
        title: item.title,
        content: item.content,
      },
    ]);
    setPresetOpen(false);
  }

  function removeContextItem(id: string) {
    setContextItems((items) => items.filter((item) => item.id !== id));
  }

  function sendMessage() {
    const trimmedText = draftText.trim();
    const parts = [combinedContextText, trimmedText].filter(Boolean);

    if (parts.length === 0 || isSending) {
      return;
    }

    const content = parts.join("\n\n");
    const userMessage: ChatMessage = {
      id: createId("user"),
      role: "user",
      content,
      attachments: contextItems,
      promptText: trimmedText,
    };

    setMessages((items) => [...items, userMessage]);
    setDraftText("");
    setIsSending(true);

    void (async () => {
      try {
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((message) => ({
              role: message.role,
              content: message.content,
            })),
          }),
        });

        const payload = (await response
          .json()
          .catch(() => ({}))) as AssistantApiResponse;

        if (!response.ok) {
          throw new Error(payload.error || "AI 请求失败");
        }

        setMessages((items) => [
          ...items,
          {
            id: createId("assistant"),
            role: "assistant",
            content: payload.content || "当前没有可返回的内容，请重试一次。",
          },
        ]);
      } catch (error) {
        const fallbackText =
          error instanceof Error ? error.message : "AI 请求失败，请稍后重试";

        setMessages((items) => [
          ...items,
          {
            id: createId("assistant"),
            role: "assistant",
            content: fallbackText,
          },
        ]);
      } finally {
        setIsSending(false);
      }
    })();
  }

  function openPreview(item: ContextItem) {
    setPreviewItem(item);
  }

  function startResize(event: React.PointerEvent, direction: string) {
    if (!panelRef.current) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = panelRef.current.offsetWidth;
    const startHeight = panelRef.current.offsetHeight;

    resizeStateRef.current = {
      startX,
      startY,
      startWidth,
      startHeight,
    };

    const onPointerMove = (moveEvent: PointerEvent) => {
      const state = resizeStateRef.current;
      if (!state) return;

      const dx = moveEvent.clientX - state.startX;
      const dy = moveEvent.clientY - state.startY;

      let nextWidth = state.startWidth;
      let nextHeight = state.startHeight;

      // Horizontal adjustments
      if (direction.includes("e")) {
        nextWidth = state.startWidth + dx;
      } else if (direction.includes("w")) {
        nextWidth = state.startWidth - dx;
      }

      // Vertical adjustments
      if (direction.includes("s")) {
        nextHeight = state.startHeight + dy;
      } else if (direction.includes("n")) {
        nextHeight = state.startHeight - dy;
      }

      // Clamp sizes
      const minW = 320;
      const minH = 200;
      const maxW = Math.max(minW, window.innerWidth - 20);
      const maxH = Math.max(minH, window.innerHeight - 20);

      nextWidth = Math.min(Math.max(minW, Math.round(nextWidth)), maxW);
      nextHeight = Math.min(Math.max(minH, Math.round(nextHeight)), maxH);

      setPanelSize({ width: nextWidth, height: nextHeight });
    };

    const stopResize = () => {
      resizeStateRef.current = null;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    document.body.style.userSelect = "none";
    // set appropriate cursor based on direction
    if (direction === "ne" || direction === "sw") {
      document.body.style.cursor = "nesw-resize";
    } else if (direction === "nw" || direction === "se") {
      document.body.style.cursor = "nwse-resize";
    } else if (direction.includes("n") || direction.includes("s")) {
      document.body.style.cursor = "ns-resize";
    } else if (direction.includes("e") || direction.includes("w")) {
      document.body.style.cursor = "ew-resize";
    } else {
      document.body.style.cursor = "nwse-resize";
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
  }

  return (
    <div className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-3">
      <AnimatePresence>
        {open ? (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative flex flex-col overflow-hidden rounded-[1rem] border border-ui bg-background shadow-[0_24px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl dark:shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
            style={{ width: panelSize.width, height: panelSize.height }}
          >
            <div className="flex items-center justify-between border-b border-ui px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-[0.7rem] bg-panel-strong text-current">
                  <Bot className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-sm font-semibold tracking-tight">
                    AI 助手
                  </div>
                  <div className="text-xs text-muted">
                    Markdown · 数学公式 · 学习上下文
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[0.7rem] border border-ui bg-panel-strong text-muted hover:text-current"
                aria-label="关闭 AI 助手"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {messages.map((message) => {
                const isUser = message.role === "user";
                const selectionAttachments =
                  message.attachments?.filter(
                    (attachment) => attachment.type === "selection",
                  ) ?? [];
                const presetAttachments =
                  message.attachments?.filter(
                    (attachment) => attachment.type === "preset",
                  ) ?? [];

                return (
                  <div
                    key={message.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`relative max-w-[84%] rounded-[0.9rem] border px-3 py-2 shadow-sm ${
                        isUser
                          ? "border-[#bfd7ff] bg-[#eff6ff] text-[#0f172a] dark:border-[#28508a] dark:bg-[#10233e] dark:text-[#eff6ff]"
                          : "border-ui bg-panel text-foreground"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`absolute top-4 h-2.5 w-2.5 rotate-45 border ${
                          isUser
                            ? "-right-1.5 border-l-0 border-b-0 border-[#bfd7ff] bg-[#eff6ff] dark:border-[#28508a] dark:bg-[#10233e]"
                            : "-left-1.5 border-r-0 border-t-0 border-ui bg-panel"
                        }`}
                      />

                      <div className="space-y-2">
                        {selectionAttachments.length > 0 ||
                        presetAttachments.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {selectionAttachments.map((item, index) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => openPreview(item)}
                                className="inline-flex items-center gap-2 rounded-[0.65rem] border border-[#bfd7ff] bg-[#eff6ff] px-2.5 py-1 text-xs font-medium text-[#1d4ed8] hover:bg-[#dbeafe] dark:border-[#28508a] dark:bg-[#10233e] dark:text-[#bfdbfe] dark:hover:bg-[#17304f]"
                              >
                                <span className="inline-flex h-5 items-center justify-center rounded-[0.45rem] bg-white/70 px-1.5 text-[10px] font-semibold text-[#1d4ed8] dark:bg-white/10 dark:text-[#bfdbfe]">
                                  文本 [{index + 1}]
                                </span>
                                <span className="max-w-44 truncate text-left">
                                  点击查看
                                </span>
                              </button>
                            ))}
                            {presetAttachments.map((item) => (
                              <span
                                key={item.id}
                                className="inline-flex items-center rounded-[0.65rem] border border-ui bg-panel-strong px-2.5 py-1 text-xs text-muted"
                              >
                                {item.title}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        {message.promptText ? (
                          <div className="rounded-[0.8rem] border border-ui bg-panel px-3 py-2 text-sm leading-7 text-foreground">
                            {message.promptText}
                          </div>
                        ) : null}

                        {!isUser || !message.promptText ? (
                          <div className="ai-markdown">
                            {renderMessageContent(message.content)}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-ui bg-panel/80 px-4 py-3 backdrop-blur-sm">
              <div className="mb-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectionMode((value) => !value)}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-[0.65rem] border text-sm ${
                    selectionMode
                      ? "border-[#93c5fd] bg-[#dbeafe] text-[#1d4ed8]"
                      : "border-ui bg-panel-strong text-muted hover:text-current"
                  }`}
                  title={selectionMode ? "退出文本选择" : "选择页面文本"}
                  aria-label="选择页面文本"
                  aria-pressed={selectionMode}
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPresetOpen((value) => !value)}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-[0.65rem] border text-sm ${
                    presetOpen
                      ? "border-[#93c5fd] bg-[#dbeafe] text-[#1d4ed8]"
                      : "border-ui bg-panel-strong text-muted hover:text-current"
                  }`}
                  title="选择预设问题或 skill"
                  aria-label="选择预设问题或 skill"
                  aria-haspopup="menu"
                  aria-expanded={presetOpen}
                >
                  {presetOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="flex max-h-24 flex-wrap items-center gap-2 overflow-y-auto overscroll-contain pr-1">
                    {contextItems.map((item, index) => {
                      const selectionIndex =
                        item.type === "selection"
                          ? contextItems
                              .slice(0, index + 1)
                              .filter(
                                (currentItem) =>
                                  currentItem.type === "selection",
                              ).length
                          : 0;

                      return (
                        <span
                          key={item.id}
                          className="inline-flex max-w-full items-center gap-1 rounded-[0.55rem] border border-ui bg-panel-strong px-2 py-1 text-xs text-muted"
                          title={item.content}
                          role="button"
                          tabIndex={0}
                          onClick={() => openPreview(item)}
                        >
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-panel px-1 text-[10px] font-semibold text-current">
                            {item.type === "selection" ? selectionIndex : "P"}
                          </span>
                          <span className="truncate">{item.title}</span>
                          <button
                            type="button"
                            onClick={() => removeContextItem(item.id)}
                            className="ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-muted hover:text-current"
                            aria-label={`移除 ${item.title}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                    {contextItems.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setContextItems([])}
                        className="inline-flex h-7 items-center gap-1 rounded-[0.55rem] border border-ui bg-panel-strong px-2 text-xs text-muted hover:text-current"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        清空
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {selectionMode && draftSelection ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="mb-2 rounded-[0.8rem] border border-ui bg-panel px-3 py-2"
                  >
                    <div className="mb-2 text-xs font-medium text-muted">
                      已选中文本
                    </div>
                    <div className="max-h-16 overflow-y-auto text-sm text-foreground">
                      {draftSelection}
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="inline-flex h-8 items-center rounded-[0.6rem] border border-ui bg-panel-strong px-3 text-xs text-muted hover:text-current"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={confirmSelection}
                        className="inline-flex h-8 items-center rounded-[0.6rem] bg-[#dbeafe] px-3 text-xs font-medium text-[#1d4ed8] hover:bg-[#bfdbfe]"
                      >
                        确认
                      </button>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <AnimatePresence>
                {presetOpen ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="mb-2 rounded-[0.8rem] border border-ui bg-background p-2 shadow-[0_12px_30px_rgba(0,0,0,0.14)]"
                  >
                    <div className="mb-2 px-1 text-xs font-medium text-muted">
                      预设问题 / skill
                    </div>
                    <div className="max-h-56 space-y-1.5 overflow-y-auto overscroll-contain pr-1">
                      {presetItems.map((item) => {
                        const Icon = item.icon;

                        return (
                          <button
                            key={item.title}
                            type="button"
                            onClick={() => addPreset(item)}
                            className="flex items-start gap-2 rounded-[0.7rem] border border-ui bg-panel px-2.5 py-2 text-left hover:bg-panel-strong"
                          >
                            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[0.6rem] bg-panel-strong text-muted">
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-foreground">
                                {item.title}
                              </span>
                              <span className="mt-0.5 block text-xs text-muted">
                                点击后加入当前发送内容
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <div className="flex items-end gap-2">
                <div className="min-h-24 flex-1 rounded-[0.8rem] border border-ui bg-background px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                  <textarea
                    value={draftText}
                    onChange={(event) => setDraftText(event.target.value)}
                    rows={4}
                    placeholder="输入你想问 AI 的问题"
                    className="h-full w-full resize-none border-0 bg-transparent text-sm outline-none placeholder:text-muted"
                  />
                </div>
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={isSending}
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[0.8rem] bg-[#dbeafe] text-[#1d4ed8] shadow-sm hover:bg-[#bfdbfe] disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="发送消息"
                  title="发送消息"
                >
                  {isSending ? (
                    <span className="h-4 w-4 animate-pulse rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="button"
              onPointerDown={(e) => startResize(e, "se")}
              className="absolute bottom-1 right-1 z-30 flex h-8 w-8 items-end justify-end rounded-[0.45rem] text-muted hover:text-current"
              aria-label="调整聊天窗口大小"
              title="拖动调整大小"
            >
              <span className="pointer-events-none select-none text-[11px] leading-none">
                ⤢
              </span>
            </button>

            {/* Edge / corner handles for whole-panel resize */}
            <div
              onPointerDown={(e) => startResize(e, "n")}
              className="absolute left-3 right-3 top-0 z-20 h-4 cursor-ns-resize touch-none"
            />
            <div
              onPointerDown={(e) => startResize(e, "s")}
              className="absolute left-3 right-3 bottom-0 z-20 h-4 cursor-ns-resize touch-none"
            />
            <div
              onPointerDown={(e) => startResize(e, "w")}
              className="absolute bottom-3 left-0 top-3 z-20 w-4 cursor-ew-resize touch-none"
            />
            <div
              onPointerDown={(e) => startResize(e, "e")}
              className="absolute bottom-3 right-0 top-3 z-20 w-4 cursor-ew-resize touch-none"
            />

            <div
              onPointerDown={(e) => startResize(e, "nw")}
              className="absolute left-0 top-0 z-30 h-5 w-5 cursor-nwse-resize touch-none"
            />
            <div
              onPointerDown={(e) => startResize(e, "ne")}
              className="absolute right-0 top-0 z-30 h-5 w-5 cursor-nesw-resize touch-none"
            />
            <div
              onPointerDown={(e) => startResize(e, "sw")}
              className="absolute bottom-0 left-0 z-30 h-5 w-5 cursor-nesw-resize touch-none"
            />
            <div
              onPointerDown={(e) => startResize(e, "se")}
              className="absolute bottom-0 right-0 z-30 h-5 w-5 cursor-nwse-resize touch-none"
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => {
          setOpen((value) => {
            const nextValue = !value;
            if (!nextValue) {
              setSelectionMode(false);
              setPresetOpen(false);
              clearSelection();
            }

            return nextValue;
          });
        }}
        className="group flex flex-col items-center gap-1"
        aria-label="打开 AI 助手"
        aria-expanded={open}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-[1rem] border border-ui bg-background text-current shadow-[0_10px_24px_rgba(0,0,0,0.12)] backdrop-blur-md group-hover:bg-panel-strong">
          <Bot className="h-6 w-6" />
        </span>
        <span className="text-[11px] font-medium tracking-[0.08em] text-muted">
          AI 助手
        </span>
      </button>

      <AnimatePresence>
        {previewItem ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/20 px-4 py-6 backdrop-blur-sm"
            onClick={() => setPreviewItem(null)}
          >
            <div
              className="w-[min(30rem,calc(100vw-2rem))] rounded-[1rem] border border-ui bg-background p-4 shadow-[0_24px_60px_rgba(0,0,0,0.18)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 border-b border-ui pb-3">
                <div>
                  <div className="text-sm font-semibold tracking-tight text-foreground">
                    {previewItem.title}
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    点击右上角关闭，或点击外部区域关闭
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[0.7rem] border border-ui bg-panel-strong text-muted hover:text-current"
                  aria-label="关闭文本预览"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-[0.85rem] border border-ui bg-panel px-3 py-2.5 text-sm leading-7 text-foreground">
                {previewItem.content}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
