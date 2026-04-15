export type AIProvider = {
  name: string;
  family: string;
  endpointStyle: string;
  strength: string;
};

export const aiProviders: AIProvider[] = [
  {
    name: "OpenAI Compatible",
    family: "通用对话",
    endpointStyle: "OpenAI API",
    strength: "通用性强",
  },
  {
    name: "Qwen",
    family: "中文编程",
    endpointStyle: "DashScope / OpenAI Compatible",
    strength: "中文理解与代码生成",
  },
  {
    name: "DeepSeek",
    family: "推理增强",
    endpointStyle: "OpenAI Compatible",
    strength: "推理与代码辅助",
  },
  {
    name: "Kimi",
    family: "长上下文",
    endpointStyle: "HTTP API",
    strength: "长文档分析",
  },
];
