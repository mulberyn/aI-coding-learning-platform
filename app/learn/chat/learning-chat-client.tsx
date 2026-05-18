"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import {
  BookOpen,
  ChevronRight,
  Lightbulb,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  GraduationCap,
  Bot,
  Trash2,
} from "lucide-react";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  promptText?: string | null;
  attachments?: Array<{
    id: string;
    type: "selection" | "preset";
    title: string;
    content: string;
  }>;
};

type SavedItem = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
};

type PresetOption = {
  title: string;
  content: string;
  icon: typeof Lightbulb;
};

const PRESET_OPTIONS: PresetOption[] = [
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
        code: ({ inline, children, ...props }: any) =>
          inline ? (
            <code
              className="rounded border border-ui bg-panel-strong px-1.5 py-0.5 text-[0.88em]"
              {...props}
            >
              {children}
            </code>
          ) : (
            <code {...props}>{children}</code>
          ),
        pre: ({ children }) => (
          <pre className="overflow-x-auto rounded border border-ui bg-panel p-3">
            {children}
          </pre>
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

// Message bubble with arrow indicator
function MessageBubble({
  message,
  isUser,
}: {
  message: ChatMessage;
  isUser: boolean;
}) {
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} gap-2`}>
      <div className={`relative max-w-[70%]`}>
        {/* Arrow indicator */}
        <div
          className={`absolute top-2 ${isUser ? "-right-2" : "-left-2"} w-3 h-3 bg-inherit`}
          style={{
            borderRadius: isUser ? "0 4px 0 0" : "4px 0 0 0",
            backgroundColor: isUser
              ? "rgb(239, 246, 255)"
              : "var(--color-bg-panel)",
            border: isUser
              ? "1px solid rgb(191, 215, 255)"
              : "1px solid var(--color-border-ui)",
            borderRight: isUser ? "none" : undefined,
            borderBottom: isUser ? "none" : undefined,
            borderLeft: !isUser ? "none" : undefined,
            borderTop: !isUser ? "none" : undefined,
          }}
        />

        {/* Message bubble */}
        <div
          className={`rounded-[8px] border px-3 py-2 ${
            isUser ? "border-[#bfd7ff] bg-[#eff6ff]" : "border-ui bg-panel"
          }`}
        >
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-2 space-y-1">
              {message.attachments.map((att) => (
                <div
                  key={att.id}
                  className="rounded-[6px] border border-ui bg-background px-2 py-1 text-xs"
                >
                  <div className="font-semibold">{att.title}</div>
                  {att.type === "preset" && (
                    <div className="mt-0.5 text-muted line-clamp-2">
                      {att.content}
                    </div>
                  )}
                  {att.type === "selection" && (
                    <div className="mt-0.5 text-muted">📎 {att.content}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="prose prose-sm dark:prose-invert max-w-none">
            {renderMessageContent(message.content)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LearningChatClient() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [selected, setSelected] = useState<SavedItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedPresets, setSelectedPresets] = useState<PresetOption[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<
    { name: string; content: string }[]
  >([]);
  const [showPresets, setShowPresets] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  function syncConversationToItems(nextConversation: SavedItem) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === nextConversation.id
          ? { ...item, ...nextConversation }
          : item,
      ),
    );
  }

  async function handleSelectConversation(item: SavedItem) {
    setSelected(item);
    setSelectedPresets([]);
    setUploadedFiles([]);
    setInputText("");
    setShowPresets(false);

    if (item.messages.length > 0) {
      return;
    }

    try {
      const resp = await fetch("/api/ai/conversations", {
        cache: "no-store",
      });
      if (!resp.ok) {
        return;
      }

      const data = (await resp.json()) as { items?: SavedItem[] };
      const nextItems = data.items ?? [];
      setItems(nextItems);

      const latest = nextItems.find((candidate) => candidate.id === item.id);
      if (latest) {
        setSelected(latest);
      }
    } catch (error) {
      console.error("Failed to reload conversation:", error);
    }
  }

  // Load conversations on mount
  useEffect(() => {
    void (async () => {
      setIsLoading(true);
      try {
        const resp = await fetch("/api/ai/conversations", {
          cache: "no-store",
        });
        if (!resp.ok) {
          setItems([]);
          setSelected(null);
          return;
        }
        const data = (await resp.json()) as { items?: SavedItem[] };
        const nextItems = data.items ?? [];
        setItems(nextItems);
        if (nextItems.length > 0) {
          setSelected(nextItems[0]);
        }
      } catch (error) {
        console.error("Failed to load conversations:", error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages]);

  // Create new conversation
  async function createNewConversation() {
    const newConversation: SavedItem = {
      id: createId("conv"),
      title: "新建对话",
      messages: [],
      createdAt: new Date().toISOString(),
    };
    setItems((prev) => [newConversation, ...prev]);
    setSelected(newConversation);
    setSelectedPresets([]);
    setUploadedFiles([]);
    setInputText("");
  }

  // Handle file upload
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setUploadedFiles((prev) => [...prev, { name: file.name, content }]);
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // Remove uploaded file
  function removeFile(index: number) {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  // Delete conversation
  async function deleteConversation(id: string) {
    if (!confirm("确定要删除这个对话吗？此操作无法撤销。")) {
      return;
    }
    try {
      const resp = await fetch(`/api/ai/conversations/${id}`, {
        method: "DELETE",
      });
      if (!resp.ok) {
        console.error("Failed to delete conversation");
        alert("删除失败，请重试");
        return;
      }
      // Remove from local list
      setItems((prev) => prev.filter((item) => item.id !== id));
      // Clear selection if it was the selected one
      if (selected?.id === id) {
        setSelected(null);
        setInputText("");
        setSelectedPresets([]);
        setUploadedFiles([]);
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      alert("删除失败，请重试");
    }
  }

  // Toggle preset selection
  function togglePreset(preset: PresetOption) {
    setSelectedPresets((prev) => {
      const exists = prev.some((p) => p.title === preset.title);
      if (exists) {
        return prev.filter((p) => p.title !== preset.title);
      }
      return [...prev, preset];
    });
  }

  // Send message
  async function sendMessage() {
    if (
      !selected ||
      (!inputText.trim() &&
        selectedPresets.length === 0 &&
        uploadedFiles.length === 0)
    ) {
      return;
    }

    setIsSending(true);

    try {
      // Build user message content
      let userContent = inputText.trim();
      const attachments: ChatMessage["attachments"] = [];

      // Add preset options as attachments
      for (const preset of selectedPresets) {
        attachments.push({
          id: createId("att"),
          type: "preset",
          title: preset.title,
          content: preset.content,
        });
      }

      // Add uploaded files as attachments
      for (const file of uploadedFiles) {
        attachments.push({
          id: createId("att"),
          type: "selection",
          title: file.name,
          content: file.name, // Display filename only
        });
      }

      // If no text input, use first preset content
      if (!userContent && selectedPresets.length > 0) {
        userContent = selectedPresets[0].content;
      }

      if (!userContent) return;

      // Add user message to local state
      const userMessage: ChatMessage = {
        role: "user",
        content: userContent,
        attachments: attachments.length > 0 ? attachments : undefined,
      };

      const messagesAfterUser = [...selected.messages, userMessage];
      const nextConversationAfterUser = {
        ...selected,
        messages: messagesAfterUser,
      };

      setSelected(nextConversationAfterUser);
      syncConversationToItems(nextConversationAfterUser);

      // Call AI API
      const chatResponse = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesAfterUser,
          context: uploadedFiles.map((f) => f.content).join("\n---\n"),
        }),
      });

      if (!chatResponse.ok) {
        throw new Error("Failed to get AI response");
      }

      const aiResponse = (await chatResponse.json()) as { content?: string };
      const assistantContent =
        aiResponse.content || "Sorry, I couldn't generate a response.";

      // Add assistant message to local state
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: assistantContent,
      };

      const messagesAfterAssistant = [...messagesAfterUser, assistantMessage];
      const nextConversationAfterAssistant = {
        ...selected,
        messages: messagesAfterAssistant,
      };

      setSelected(nextConversationAfterAssistant);
      syncConversationToItems(nextConversationAfterAssistant);

      // Save updated conversation
      await fetch("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          title: selected.title,
          messages: messagesAfterAssistant,
        }),
      });

      // Clear input
      setInputText("");
      setSelectedPresets([]);
      setUploadedFiles([]);
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex h-[calc(100vh-120px)] gap-6 -mx-4 sm:-mx-6 lg:-mx-8">
        {/* Left Sidebar - Conversation History */}
        <div className="w-64 border-r border-ui bg-background p-4 flex flex-col">
          <button
            onClick={createNewConversation}
            className="mb-4 flex items-center gap-2 rounded-[6px] bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus size={16} />
            新建对话
          </button>

          <div className="flex-1 overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="text-xs text-muted">加载中...</div>
            ) : items.length === 0 ? (
              <div className="text-xs text-muted">暂无已保存对话</div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className={`group flex items-start gap-2 rounded-[6px] border px-3 py-2 transition-colors ${
                    selected?.id === item.id
                      ? "border-primary bg-primary/5"
                      : "border-ui hover:bg-panel"
                  }`}
                >
                  <button
                    onClick={() => {
                      void handleSelectConversation(item);
                    }}
                    className="flex-1 text-left"
                  >
                    <div className="truncate font-medium">{item.title}</div>
                    <div className="mt-1 text-xs text-muted">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </button>
                  <button
                    onClick={() => deleteConversation(item.id)}
                    className="shrink-0 rounded-[4px] p-1 text-muted opacity-0 transition-opacity hover:bg-panel hover:text-destructive group-hover:opacity-100"
                    title="删除对话"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Chat Display & Input */}
        <div className="flex-1 flex flex-col bg-background">
          {selected ? (
            <>
              {/* Chat Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {selected.messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-muted">
                      <div className="text-lg font-medium">开始新对话</div>
                      <div className="text-sm mt-2">
                        在下方输入框中输入您的问题或选择预设选项
                      </div>
                    </div>
                  </div>
                ) : (
                  selected.messages
                    .filter((m) => m.role !== "system")
                    .map((msg, idx) => (
                      <MessageBubble
                        key={idx}
                        message={msg}
                        isUser={msg.role === "user"}
                      />
                    ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-ui bg-panel p-4 space-y-3">
                {/* Preset Options */}
                {showPresets && (
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-[8px] border border-ui bg-background">
                    {PRESET_OPTIONS.map((preset) => {
                      const IconComponent = preset.icon;
                      const isSelected = selectedPresets.some(
                        (p) => p.title === preset.title,
                      );
                      return (
                        <button
                          key={preset.title}
                          onClick={() => togglePreset(preset)}
                          className={`flex items-start gap-2 rounded-[6px] border p-2 text-left text-sm transition-colors ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-ui hover:bg-panel"
                          }`}
                        >
                          <IconComponent
                            size={16}
                            className="mt-0.5 flex-shrink-0"
                          />
                          <span className="line-clamp-2">{preset.title}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Selected Presets Display */}
                {selectedPresets.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedPresets.map((preset) => (
                      <div
                        key={preset.title}
                        className="inline-flex items-center gap-1 rounded-[4px] bg-primary/10 border border-primary/30 px-2 py-1 text-sm"
                      >
                        <span>{preset.title}</span>
                        <button
                          onClick={() => togglePreset(preset)}
                          className="ml-1 text-primary hover:opacity-70"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Uploaded Files Display */}
                {uploadedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {uploadedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-2 rounded-[4px] bg-blue-50 border border-blue-200 px-2 py-1 text-sm dark:bg-blue-900/20 dark:border-blue-800"
                      >
                        <span>📎 {file.name}</span>
                        <button
                          onClick={() => removeFile(idx)}
                          className="text-blue-600 hover:opacity-70 dark:text-blue-400"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Input Row */}
                <div className="flex items-end gap-2">
                  {/* Buttons - Presets and Upload */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => setShowPresets(!showPresets)}
                      className="p-2 rounded-[4px] border border-ui hover:bg-panel transition-colors"
                      title="预设选项"
                    >
                      <ChevronRight size={18} />
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 rounded-[4px] border border-ui hover:bg-panel transition-colors"
                      title="上传 Skill 文件"
                    >
                      📎
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".md"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  {/* Text Input */}
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.ctrlKey) {
                        void sendMessage();
                      }
                    }}
                    placeholder="输入您的问题（Ctrl+Enter 发送）"
                    className="flex-1 rounded-[6px] border border-ui bg-background px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                    rows={3}
                  />

                  {/* Send Button */}
                  <button
                    onClick={sendMessage}
                    disabled={
                      isSending ||
                      (!inputText.trim() &&
                        selectedPresets.length === 0 &&
                        uploadedFiles.length === 0)
                    }
                    className="p-2 rounded-[4px] bg-primary text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted">
                <div className="text-lg font-medium">
                  选择一个对话或创建新对话
                </div>
                <div className="text-sm mt-2">
                  左侧栏中的"新建对话"按钮可以创建新对话
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
