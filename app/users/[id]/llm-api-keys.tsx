"use client";

import { useState } from "react";

interface LLMApiKeyItem {
  id: string;
  provider: string;
  name: string;
  model: string;
  apiKey: string;
  isActive: boolean;
}

interface LLMApiKeysProps {
  initialKeys: LLMApiKeyItem[];
  userId: string;
  onSave?: () => void;
}

const PROVIDERS = {
  deepseek: {
    label: "Deepseek",
    models: ["deepseek-chat", "deepseek-reasoner"],
  },
  qwen: {
    label: "Qwen",
    models: ["qwen-plus", "qwen-turbo", "qwen-max"],
  },
};

export function LLMApiKeys({ initialKeys, userId, onSave }: LLMApiKeysProps) {
  const [keys, setKeys] = useState<LLMApiKeyItem[]>(initialKeys);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    provider: "deepseek" as keyof typeof PROVIDERS,
    name: "",
    model: "deepseek-chat",
    apiKey: "",
  });
  const [loading, setLoading] = useState(false);

  const handleAddKey = async () => {
    if (!formData.name.trim() || !formData.apiKey.trim()) {
      alert("请填写完整的 API Key 名称和密钥");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}/llm-configs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: formData.provider,
          name: formData.name.trim(),
          model: formData.model,
          apiKey: formData.apiKey.trim(),
        }),
      });

      if (response.ok) {
        const newKey = await response.json();
        setKeys([...keys, newKey]);
        setFormData({
          provider: "deepseek",
          name: "",
          model: "deepseek-chat",
          apiKey: "",
        });
        setShowAddForm(false);
        onSave?.();
      } else {
        alert("添加失败，请重试");
      }
    } catch (error) {
      console.error("添加 API Key 失败:", error);
      alert("添加失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectKey = async (keyId: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/users/${userId}/llm-configs/${keyId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: true }),
        },
      );

      if (response.ok) {
        setKeys((prevKeys) =>
          prevKeys.map((key) => ({
            ...key,
            isActive: key.id === keyId,
          })),
        );
        onSave?.();
      }
    } catch (error) {
      console.error("选择 API Key 失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm("确定要删除这个 API Key 吗？")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/users/${userId}/llm-configs/${keyId}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        setKeys(keys.filter((key) => key.id !== keyId));
        onSave?.();
      } else {
        alert("删除失败，请重试");
      }
    } catch (error) {
      console.error("删除 API Key 失败:", error);
      alert("删除失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const currentProvider =
    PROVIDERS[formData.provider as keyof typeof PROVIDERS];

  return (
    <div className="space-y-4">
      {/* Keys List */}
      <div className="space-y-2">
        {keys.length === 0 ? (
          <div className="rounded-md border border-ui bg-panel/50 px-3 py-4 text-center text-sm text-muted">
            暂无大模型 API Key 配置，请添加一个
          </div>
        ) : (
          keys.map((key) => (
            <div
              key={key.id}
              className={`flex items-center justify-between rounded-lg border px-3 py-3 transition-colors ${
                key.isActive
                  ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20"
                  : "border-ui bg-panel hover:bg-panel-strong"
              }`}
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="inline-block min-w-16 rounded-md bg-opacity-20 px-2 py-0.5 text-xs font-semibold">
                      <span
                        className={`${
                          key.provider === "deepseek"
                            ? "bg-orange-500/20 text-orange-700 dark:text-orange-300"
                            : "bg-purple-500/20 text-purple-700 dark:text-purple-300"
                        }`}
                      >
                        {PROVIDERS[key.provider as keyof typeof PROVIDERS]
                          ?.label || key.provider}
                      </span>
                    </span>
                  </div>
                  <span className="font-medium text-foreground">
                    {key.name}
                  </span>
                  {key.isActive && (
                    <span className="inline-block rounded-full bg-blue-500 px-2 py-0.5 text-xs font-semibold text-white">
                      使用中
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted">
                  模型: {key.model} | Key: {key.apiKey.substring(0, 8)}••••••••
                  {key.apiKey.substring(key.apiKey.length - 4)}
                </div>
              </div>
              <div className="flex gap-2">
                {!key.isActive && (
                  <button
                    type="button"
                    onClick={() => handleSelectKey(key.id)}
                    disabled={loading}
                    className="rounded px-3 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-blue-50 disabled:opacity-50 dark:text-blue-300 dark:hover:bg-blue-900/30"
                  >
                    选择
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDeleteKey(key.id)}
                  disabled={loading}
                  className="rounded px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/30"
                >
                  删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add New Key Form */}
      {!showAddForm ? (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          disabled={loading}
          className="w-full rounded-lg border-2 border-dashed border-ui bg-transparent px-4 py-2 text-sm font-medium text-muted transition hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 dark:hover:border-blue-400 dark:hover:text-blue-300"
        >
          + 添加新的 API Key
        </button>
      ) : (
        <div className="space-y-3 rounded-lg border border-ui bg-panel p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                运营商
              </label>
              <select
                value={formData.provider}
                onChange={(e) => {
                  const provider = e.target.value as keyof typeof PROVIDERS;
                  const models = PROVIDERS[provider].models;
                  setFormData({
                    ...formData,
                    provider,
                    model: models[0],
                  });
                }}
                className="w-full rounded-md border border-ui bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-blue-500"
              >
                {Object.entries(PROVIDERS).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                模型
              </label>
              <select
                value={formData.model}
                onChange={(e) =>
                  setFormData({ ...formData, model: e.target.value })
                }
                className="w-full rounded-md border border-ui bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-blue-500"
              >
                {currentProvider.models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              配置名称
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="例如：Deepseek-主账号、Qwen-测试"
              className="w-full rounded-md border border-ui bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              API Key
            </label>
            <input
              type="password"
              value={formData.apiKey}
              onChange={(e) =>
                setFormData({ ...formData, apiKey: e.target.value })
              }
              placeholder="请输入 API Key"
              className="w-full rounded-md border border-ui bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-muted">
              建议仅在自己的设备上填写敏感信息
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setFormData({
                  provider: "deepseek",
                  name: "",
                  model: "deepseek-chat",
                  apiKey: "",
                });
              }}
              disabled={loading}
              className="rounded-md border border-ui bg-panel px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-panel-strong disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleAddKey}
              disabled={loading}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {loading ? "添加中..." : "确认添加"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
