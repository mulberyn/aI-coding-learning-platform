"use client";

import { isValidElement, useEffect, useId, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";

type AnalysisContent = {
  tutoringType: string;
  tutoringContent: string;
};

function MermaidDiagram({ chart }: { chart: string }) {
  const renderId = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const renderChart = async () => {
      try {
        const { default: mermaid } = await import("mermaid");
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "neutral",
        });

        const result = await mermaid.render(
          `analysis-mermaid-${renderId}`,
          chart,
        );

        if (!isActive) {
          return;
        }

        setSvg(result.svg);
        setError(null);
      } catch (err) {
        if (!isActive) {
          return;
        }

        setSvg(null);
        setError(err instanceof Error ? err.message : "图表渲染失败");
      }
    };

    void renderChart();

    return () => {
      isActive = false;
    };
  }, [chart, renderId]);

  return (
    <div className="mb-3 overflow-x-auto rounded border border-ui bg-background p-3">
      {error ? (
        <div className="space-y-2">
          <div className="text-sm text-rose-600">图表渲染失败：{error}</div>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded border border-ui bg-panel-strong p-3 text-sm text-foreground">
            {chart}
          </pre>
        </div>
      ) : svg ? (
        <div dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <pre className="overflow-x-auto whitespace-pre-wrap rounded border border-ui bg-panel-strong p-3 text-sm text-foreground">
          {chart}
        </pre>
      )}
    </div>
  );
}

export default function AnalysisPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const submissionId = params.submissionId as string;
  const type = params.type as string;
  const problemId = searchParams.get("problemId");
  const problemSlug = searchParams.get("problemSlug");

  const [analysis, setAnalysis] = useState<AnalysisContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typeLabel: Record<string, string> = {
    code_analysis: "代码分析",
    improvement_suggestion: "改进建议",
    error_analysis: "错误分析",
  };

  const fetchAnalysis = async (isRegenerate = false) => {
    try {
      if (isRegenerate) {
        setIsRegenerating(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const res = await fetch(
        `/api/learn/analysis?submissionId=${submissionId}&type=${type}&regenerate=${isRegenerate}`,
      );
      if (!res.ok) {
        throw new Error("Failed to fetch analysis");
      }
      const data = await res.json();
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch analysis");
    } finally {
      setLoading(false);
      setIsRegenerating(false);
    }
  };

  useEffect(() => {
    if (submissionId && type) {
      fetchAnalysis();
    }
  }, [submissionId, type]);

  const handleBack = () => {
    // Return to learn page with the same problem context
    const params = new URLSearchParams();
    if (problemId) {
      params.append("problemId", problemId);
    }
    if (problemSlug) {
      params.append("problemSlug", problemSlug);
    }
    router.push(`/learn?${params.toString()}`);
  };

  const handleRegenerate = () => {
    fetchAnalysis(true);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background pt-16">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <button
            onClick={handleBack}
            className="mb-6 flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            返回学习页面
          </button>
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !analysis) {
    return (
      <main className="min-h-screen bg-background pt-16">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <button
            onClick={handleBack}
            className="mb-6 flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            返回学习页面
          </button>
          <div className="rounded-lg border border-ui bg-panel p-4 text-sm text-rose-600">
            错误：{error || "分析内容未找到"}
          </div>
          <div className="mt-4">
            <button
              onClick={() => fetchAnalysis(true)}
              disabled={isRegenerating}
              className="flex items-center gap-2 rounded-lg border border-ui px-4 py-2 text-sm font-medium text-foreground hover:bg-panel-strong transition-colors disabled:opacity-50"
            >
              {isRegenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {isRegenerating ? "生成中..." : "重新生成"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pt-16">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <button
          onClick={handleBack}
          className="mb-6 flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          返回学习页面
        </button>

        <div className="rounded-lg border border-ui bg-panel p-6">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-foreground">
              {typeLabel[type] || type}
            </h1>
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="flex items-center gap-2 rounded-lg border border-ui px-3 py-2 text-sm font-medium text-foreground hover:bg-panel-strong transition-colors disabled:opacity-50"
              title="重新生成分析内容"
            >
              {isRegenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {isRegenerating ? "生成中..." : "重新生成"}
            </button>
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkMath, remarkGfm]}
              rehypePlugins={[rehypeKatex]}
              components={{
                p: ({ children }) => <p className="mb-3">{children}</p>,
                ul: ({ children }) => (
                  <ul className="mb-3 list-disc pl-5">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-3 list-decimal pl-5">{children}</ol>
                ),
                li: ({ children }) => <li className="mb-1">{children}</li>,
                a: ({ children, ...props }) => (
                  <a
                    {...props}
                    className="text-primary underline underline-offset-2"
                  >
                    {children}
                  </a>
                ),
                table: ({ children }) => (
                  <div className="mb-3 overflow-x-auto">
                    <table className="w-full border-collapse border border-ui text-left text-sm">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-panel-strong">{children}</thead>
                ),
                tbody: ({ children }) => <tbody>{children}</tbody>,
                tr: ({ children }) => (
                  <tr className="border-b border-ui last:border-b-0">
                    {children}
                  </tr>
                ),
                th: ({ children }) => (
                  <th className="border border-ui px-3 py-2 font-semibold text-foreground">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-ui px-3 py-2 align-top text-foreground">
                    {children}
                  </td>
                ),
                pre: ({ children }) => {
                  if (isValidElement(children)) {
                    const childProps = children.props as {
                      className?: string;
                      children?: React.ReactNode;
                    };

                    if (
                      typeof childProps.className === "string" &&
                      childProps.className.includes("language-mermaid")
                    ) {
                      const chart = String(childProps.children ?? "").replace(
                        /\n$/,
                        "",
                      );

                      return <MermaidDiagram chart={chart} />;
                    }
                  }

                  return (
                    <pre className="overflow-x-auto rounded border border-ui bg-background p-3 mb-3">
                      {children}
                    </pre>
                  );
                },
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
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-ui pl-3 text-muted mb-3">
                    {children}
                  </blockquote>
                ),
                h2: ({ children }) => (
                  <h2 className="mb-3 text-lg font-semibold">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mb-2 text-base font-semibold">{children}</h3>
                ),
              }}
            >
              {analysis.tutoringContent}
            </ReactMarkdown>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleBack}
            className="rounded-lg border border-ui px-4 py-2 text-sm font-medium text-foreground hover:bg-panel-strong transition-colors"
          >
            返回学习页面
          </button>
        </div>
      </div>
    </main>
  );
}
