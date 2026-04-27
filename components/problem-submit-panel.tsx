"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Check, ChevronDown, Clock3, X } from "lucide-react";

type SubmissionStatus =
  | "QUEUED"
  | "RUNNING"
  | "ACCEPTED"
  | "WRONG_ANSWER"
  | "COMPILE_ERROR"
  | "RUNTIME_ERROR"
  | "TIME_LIMIT_EXCEEDED"
  | "JUDGE_ERROR";

type SubmissionLanguage = "CPP" | "C" | "PYTHON" | "GO" | "RUST" | "JAVA";

type UiLanguage =
  | "CPP"
  | "C"
  | "JAVA"
  | "KOTLIN"
  | "PASCAL"
  | "PYTHON"
  | "RUST"
  | "SWFIT"
  | "GO"
  | "HASKELL"
  | "CSHARP";

type JudgeResult = {
  id: string;
  status: "PENDING" | "PASSED" | "FAILED" | "ERROR";
  judge0StatusId: number | null;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  timeSec: number | null;
  memoryKb: number | null;
  testCase: {
    id: string;
    sortOrder: number;
    isSample: boolean;
  };
};

type SubmissionResponse = {
  id: string;
  status: SubmissionStatus;
  score: number;
  message: string | null;
  judgeResults: JudgeResult[];
};

type ProblemSubmitPanelProps = {
  problemSlug: string;
  problemType: "FUNCTIONAL" | "TRADITIONAL";
  initialCode: string;
};

type SelectOption = {
  value: string;
  label: string;
};

const languageOptions: Array<{ value: UiLanguage; label: string }> = [
  { value: "CPP", label: "C++" },
  { value: "C", label: "C" },
  { value: "JAVA", label: "Java" },
  { value: "KOTLIN", label: "Kotlin" },
  { value: "PASCAL", label: "Pascal" },
  { value: "PYTHON", label: "Python" },
  { value: "RUST", label: "Rust" },
  { value: "SWFIT", label: "Swfit" },
  { value: "GO", label: "Go" },
  { value: "HASKELL", label: "Haskell" },
  { value: "CSHARP", label: "C#" },
];

const compilerOptions: SelectOption[] = [
  { value: "g++", label: "G++" },
  { value: "clang++", label: "Clang++" },
  { value: "gcc", label: "GCC" },
  { value: "clang", label: "Clang" },
];

const cppStandardOptions: SelectOption[] = [
  { value: "c++17", label: "C++17" },
  { value: "c++20", label: "C++20" },
  { value: "c++14", label: "C++14" },
  { value: "gnu++17", label: "GNU++17" },
];

const optimizeOptions: SelectOption[] = [
  { value: "O2", label: "-O2" },
  { value: "O3", label: "-O3" },
  { value: "O1", label: "-O1" },
  { value: "O0", label: "-O0" },
];

const archOptions: SelectOption[] = [
  { value: "x64", label: "64位" },
  { value: "x86", label: "32位" },
];

const pythonVersionOptions: SelectOption[] = [
  { value: "3.10", label: "Python 3.10" },
  { value: "3.11", label: "Python 3.11" },
  { value: "3.9", label: "Python 3.9" },
];

const kotlinVersionOptions: SelectOption[] = [
  { value: "2.0", label: "Kotlin 2.0" },
  { value: "1.9", label: "Kotlin 1.9" },
  { value: "1.8", label: "Kotlin 1.8" },
];

const kotlinPlatformOptions: SelectOption[] = [
  { value: "jvm", label: "JVM" },
  { value: "native", label: "Native" },
  { value: "js", label: "JavaScript" },
];

const pascalOptimizeOptions: SelectOption[] = [
  { value: "speed", label: "速度优先" },
  { value: "size", label: "体积优先" },
  { value: "balance", label: "均衡优化" },
];

const rustVersionOptions: SelectOption[] = [
  { value: "stable", label: "Stable" },
  { value: "1.80", label: "1.80" },
  { value: "nightly", label: "Nightly" },
];

const rustOptimizeOptions: SelectOption[] = [
  { value: "O2", label: "-O2" },
  { value: "O3", label: "-O3" },
  { value: "O1", label: "-O1" },
  { value: "Oz", label: "-Oz" },
];

const backendLanguageMap: Partial<Record<UiLanguage, SubmissionLanguage>> = {
  CPP: "CPP",
  C: "C",
  JAVA: "JAVA",
  PYTHON: "PYTHON",
  RUST: "RUST",
  GO: "GO",
};

const terminalStatuses: SubmissionStatus[] = [
  "ACCEPTED",
  "WRONG_ANSWER",
  "COMPILE_ERROR",
  "RUNTIME_ERROR",
  "TIME_LIMIT_EXCEEDED",
  "JUDGE_ERROR",
];

const codeFontFamily =
  '"FiraCode Nerd Font Mono", "Fira Code", "JetBrains Mono", "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", monospace';

const editorPrefsStorageKey = "submit:editor-prefs:v1";

function escapeHtml(source: string) {
  return source
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeEditorText(raw: string) {
  if (!/(code-token-|<\/?span|<class=|&lt;)/.test(raw)) {
    return raw;
  }

  return raw
    .replace(/class=["']code-token-[^"']*["']>/g, "")
    .replace(/class=["']code-token-[^"']*["']&gt;/g, "")
    .replace(/<\/?span[^>]*code-token-[^>]*>/g, "")
    .replace(/<class=\"code-token-[^\"]*\">/g, "")
    .replace(/<\/?span[^>]*>/g, "")
    .replace(/<\/?class[^>]*>/g, "")
    .replace(/&lt;\/?span[^&]*&gt;/g, "")
    .replace(/&lt;class=\"code-token-[^\"]*\"&gt;/g, "")
    .replace(/&lt;\/span&gt;/g, "")
    .replace(/&lt;\/class&gt;/g, "")
    .replace(/\r\n?/g, "\n");
}

type EditorPreferences = {
  lastLanguage: UiLanguage;
  compiler: string;
  cppStandard: string;
  optimization: string;
  architecture: string;
  pythonVersion: string;
  kotlinVersion: string;
  kotlinPlatform: string;
  pascalOptimization: string;
  rustVersion: string;
  rustOptimization: string;
};

function alphaToken(index: number) {
  let current = index;
  let result = "";

  do {
    result = String.fromCharCode(65 + (current % 26)) + result;
    current = Math.floor(current / 26) - 1;
  } while (current >= 0);

  return `__PH${result}__`;
}

function keywordPattern(language: UiLanguage) {
  const shared = [
    "if",
    "else",
    "for",
    "while",
    "return",
    "break",
    "continue",
    "switch",
    "case",
    "default",
    "class",
    "struct",
    "public",
    "private",
    "protected",
    "static",
    "const",
    "let",
    "var",
    "fn",
    "function",
    "import",
    "from",
    "package",
  ];

  if (language === "PYTHON") {
    return [
      ...shared,
      "def",
      "in",
      "and",
      "or",
      "not",
      "lambda",
      "None",
      "True",
      "False",
    ];
  }

  if (language === "RUST") {
    return [...shared, "impl", "trait", "mut", "match", "enum", "crate"];
  }

  if (language === "KOTLIN") {
    return [...shared, "val", "when", "object", "interface", "companion"];
  }

  return [
    ...shared,
    "int",
    "long",
    "double",
    "float",
    "void",
    "new",
    "nullptr",
  ];
}

function highlightCode(source: string, language: UiLanguage) {
  if (!source) {
    return "";
  }

  let work = source;
  const commentRegex = language === "PYTHON" ? /#.*$/gm : /\/\/.*$/gm;
  const stringRegex = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/gm;
  const numberRegex = /\b\d+(?:\.\d+)?\b/g;
  const keywords = keywordPattern(language)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const keywordRegex = new RegExp(`\\b(${keywords})\\b`, "g");
  const tokenMap = new Map<string, string>();

  function stash(regex: RegExp, tokenClass: string) {
    work = work.replace(regex, (token) => {
      const key = alphaToken(tokenMap.size);
      tokenMap.set(
        key,
        `<span class=\"${tokenClass}\">${escapeHtml(token)}</span>`,
      );
      return key;
    });
  }

  stash(stringRegex, "code-token-string");
  stash(commentRegex, "code-token-comment");

  let highlighted = escapeHtml(work);

  highlighted = highlighted
    .replace(
      keywordRegex,
      (_token, group1) => `<span class=\"code-token-keyword\">${group1}</span>`,
    )
    .replace(
      numberRegex,
      (token) => `<span class=\"code-token-number\">${token}</span>`,
    );

  tokenMap.forEach((value, key) => {
    highlighted = highlighted.replaceAll(key, value);
  });

  return highlighted;
}

type StyledSelectProps = {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (nextValue: string) => void;
};

function StyledSelect({ label, value, options, onChange }: StyledSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current) {
        return;
      }

      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedLabel =
    options.find((item) => item.value === value)?.label ??
    options[0]?.label ??
    "";

  return (
    <div ref={rootRef} className="relative z-30 isolate min-w-[11rem]">
      <p className="mb-1 text-xs text-muted">{label}</p>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-md border border-ui bg-panel px-3 py-2 text-sm text-foreground"
        style={{ backgroundColor: "var(--panel)", opacity: 1 }}
      >
        <span>{selectedLabel}</span>
        <ChevronDown
          className={`h-4 w-4 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          className="absolute left-0 right-0 z-[80] mt-1 max-h-56 overflow-auto rounded-md border border-ui bg-panel py-1 shadow-xl"
          style={{
            backgroundColor: "var(--panel)",
            opacity: 1,
            backdropFilter: "none",
          }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-foreground hover:bg-panel-strong"
              style={{ backgroundColor: "var(--panel)" }}
            >
              <span>{option.label}</span>
              {option.value === value ? (
                <Check className="h-4 w-4 text-muted" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function statusText(status: SubmissionStatus) {
  switch (status) {
    case "QUEUED":
      return "排队中";
    case "RUNNING":
      return "评测中";
    case "ACCEPTED":
      return "通过";
    case "WRONG_ANSWER":
      return "答案错误";
    case "COMPILE_ERROR":
      return "编译错误";
    case "RUNTIME_ERROR":
      return "运行错误";
    case "TIME_LIMIT_EXCEEDED":
      return "超时";
    default:
      return "评测异常";
  }
}

function getJudgeResultIcon(status: string, judge0StatusId: number | null) {
  if (status === "PENDING") {
    return <Clock3 className="h-4 w-4 text-amber-500" />;
  }
  if (status === "PASSED") {
    return <Check className="h-4 w-4 text-emerald-600" />;
  }
  if (
    judge0StatusId !== null &&
    [7, 8, 9, 10, 11, 12].includes(judge0StatusId)
  ) {
    return <X className="h-4 w-4 text-purple-600" />;
  }
  return <X className="h-4 w-4 text-rose-600" />;
}

export function ProblemSubmitPanel({
  problemSlug,
  problemType,
  initialCode,
}: ProblemSubmitPanelProps) {
  const [language, setLanguage] = useState<UiLanguage>("CPP");
  const [compiler, setCompiler] = useState("g++");
  const [cppStandard, setCppStandard] = useState("c++17");
  const [optimization, setOptimization] = useState("O2");
  const [architecture, setArchitecture] = useState("x64");
  const [pythonVersion, setPythonVersion] = useState("3.10");
  const [kotlinVersion, setKotlinVersion] = useState("2.0");
  const [kotlinPlatform, setKotlinPlatform] = useState("jvm");
  const [pascalOptimization, setPascalOptimization] = useState("speed");
  const [rustVersion, setRustVersion] = useState("stable");
  const [rustOptimization, setRustOptimization] = useState("O2");
  const [sourceCode, setSourceCode] = useState(initialCode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<SubmissionResponse | null>(null);
  const preRef = useRef<HTMLPreElement | null>(null);
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const linesRef = useRef<HTMLDivElement | null>(null);

  const runtimeLanguage = backendLanguageMap[language] ?? null;

  const samplePassed = useMemo(() => {
    if (!submission) {
      return 0;
    }
    return submission.judgeResults.filter(
      (result) => result.status === "PASSED",
    ).length;
  }, [submission]);

  const highlightedCode = useMemo(
    () => highlightCode(sourceCode, language),
    [sourceCode, language],
  );

  const lineCount = useMemo(
    () => Math.max(1, sourceCode.split("\n").length),
    [sourceCode],
  );

  const cacheKey = useMemo(() => `submit:last-code:${language}`, [language]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const rawPrefs = window.localStorage.getItem(editorPrefsStorageKey);
    if (!rawPrefs) {
      return;
    }

    try {
      const prefs = JSON.parse(rawPrefs) as Partial<EditorPreferences>;
      if (
        prefs.lastLanguage &&
        languageOptions.some((item) => item.value === prefs.lastLanguage)
      ) {
        setLanguage(prefs.lastLanguage);
      }
      if (prefs.compiler) {
        setCompiler(prefs.compiler);
      }
      if (prefs.cppStandard) {
        setCppStandard(prefs.cppStandard);
      }
      if (prefs.optimization) {
        setOptimization(prefs.optimization);
      }
      if (prefs.architecture) {
        setArchitecture(prefs.architecture);
      }
      if (prefs.pythonVersion) {
        setPythonVersion(prefs.pythonVersion);
      }
      if (prefs.kotlinVersion) {
        setKotlinVersion(prefs.kotlinVersion);
      }
      if (prefs.kotlinPlatform) {
        setKotlinPlatform(prefs.kotlinPlatform);
      }
      if (prefs.pascalOptimization) {
        setPascalOptimization(prefs.pascalOptimization);
      }
      if (prefs.rustVersion) {
        setRustVersion(prefs.rustVersion);
      }
      if (prefs.rustOptimization) {
        setRustOptimization(prefs.rustOptimization);
      }
    } catch {
      window.localStorage.removeItem(editorPrefsStorageKey);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const prefs: EditorPreferences = {
      lastLanguage: language,
      compiler,
      cppStandard,
      optimization,
      architecture,
      pythonVersion,
      kotlinVersion,
      kotlinPlatform,
      pascalOptimization,
      rustVersion,
      rustOptimization,
    };

    window.localStorage.setItem(editorPrefsStorageKey, JSON.stringify(prefs));
  }, [
    language,
    compiler,
    cppStandard,
    optimization,
    architecture,
    pythonVersion,
    kotlinVersion,
    kotlinPlatform,
    pascalOptimization,
    rustVersion,
    rustOptimization,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const cached = window.localStorage.getItem(cacheKey);
    const normalized = normalizeEditorText(cached ?? initialCode);
    setSourceCode(normalized);

    if (cached && cached !== normalized) {
      window.localStorage.setItem(cacheKey, normalized);
    }
  }, [cacheKey, initialCode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(cacheKey, normalizeEditorText(sourceCode));
  }, [cacheKey, sourceCode]);

  function syncEditorScroll() {
    if (!textRef.current) {
      return;
    }

    const { scrollTop, scrollLeft } = textRef.current;

    if (preRef.current) {
      preRef.current.scrollTop = scrollTop;
      preRef.current.scrollLeft = scrollLeft;
    }

    if (linesRef.current) {
      linesRef.current.scrollTop = scrollTop;
    }
  }

  function handleEditorKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    const editor = event.currentTarget;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;

    if (event.key === "Tab") {
      event.preventDefault();

      const nextValue = `${sourceCode.slice(0, start)}  ${sourceCode.slice(end)}`;
      setSourceCode(nextValue);

      requestAnimationFrame(() => {
        if (!textRef.current) {
          return;
        }

        textRef.current.selectionStart = start + 2;
        textRef.current.selectionEnd = start + 2;
      });
      return;
    }

    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    const lineStart = sourceCode.lastIndexOf("\n", start - 1) + 1;
    const currentLine = sourceCode.slice(lineStart, start);
    const indent = currentLine.match(/^[\t ]*/)?.[0] ?? "";
    const nextValue = `${sourceCode.slice(0, start)}\n${indent}${sourceCode.slice(end)}`;

    setSourceCode(nextValue);

    requestAnimationFrame(() => {
      if (!textRef.current) {
        return;
      }

      const cursor = start + 1 + indent.length;
      textRef.current.selectionStart = cursor;
      textRef.current.selectionEnd = cursor;
    });
  }

  async function pollSubmission(submissionId: string) {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const response = await fetch(`/api/submissions/${submissionId}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("拉取评测状态失败。请稍后重试。");
      }

      const data = (await response.json()) as SubmissionResponse;
      setSubmission(data);

      if (terminalStatuses.includes(data.status)) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1200));
    }

    throw new Error("评测轮询超时，请稍后刷新页面查看。");
  }

  async function handleSubmit() {
    if (!sourceCode.trim()) {
      setError("请先输入代码再提交。");
      return;
    }

    if (!runtimeLanguage) {
      setError(
        "当前语言暂未接入评测后端，请先选择 C/C++/Java/Python/Rust/Go。",
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          problemSlug,
          language: runtimeLanguage,
          sourceCode,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "提交失败，请稍后重试。");
      }

      const payload = (await response.json()) as {
        submissionId: string;
      };

      await pollSubmission(payload.submissionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="pt-1">
        <div className="flex flex-wrap gap-3">
          <StyledSelect
            label="编程语言"
            value={language}
            options={languageOptions}
            onChange={(nextValue) => {
              setLanguage(nextValue as UiLanguage);
            }}
          />

          {(language === "C" || language === "CPP") && (
            <>
              <StyledSelect
                label="编译器"
                value={compiler}
                options={compilerOptions}
                onChange={setCompiler}
              />
              <StyledSelect
                label="语言标准"
                value={cppStandard}
                options={cppStandardOptions}
                onChange={setCppStandard}
              />
              <StyledSelect
                label="优化"
                value={optimization}
                options={optimizeOptions}
                onChange={setOptimization}
              />
              <StyledSelect
                label="架构"
                value={architecture}
                options={archOptions}
                onChange={setArchitecture}
              />
            </>
          )}

          {language === "PYTHON" && (
            <StyledSelect
              label="Python 版本"
              value={pythonVersion}
              options={pythonVersionOptions}
              onChange={setPythonVersion}
            />
          )}

          {language === "KOTLIN" && (
            <>
              <StyledSelect
                label="语言版本"
                value={kotlinVersion}
                options={kotlinVersionOptions}
                onChange={setKotlinVersion}
              />
              <StyledSelect
                label="平台"
                value={kotlinPlatform}
                options={kotlinPlatformOptions}
                onChange={setKotlinPlatform}
              />
            </>
          )}

          {language === "PASCAL" && (
            <StyledSelect
              label="优化类型"
              value={pascalOptimization}
              options={pascalOptimizeOptions}
              onChange={setPascalOptimization}
            />
          )}

          {language === "RUST" && (
            <>
              <StyledSelect
                label="语言版本"
                value={rustVersion}
                options={rustVersionOptions}
                onChange={setRustVersion}
              />
              <StyledSelect
                label="优化类型"
                value={rustOptimization}
                options={rustOptimizeOptions}
                onChange={setRustOptimization}
              />
            </>
          )}
        </div>

        {!runtimeLanguage ? (
          <p className="mt-3 text-xs text-muted">
            当前语言先提供前端选择能力，评测后端暂未接入，请切换到
            C/C++/Java/Python/Rust/Go 提交。
          </p>
        ) : null}
      </div>

      <div className="border-t-2 border-ui" />

      <div className="overflow-hidden rounded-sm border border-ui bg-panel">
        <div className="relative h-[420px]">
          <div
            ref={linesRef}
            className="absolute inset-y-0 left-0 w-14 overflow-hidden border-r border-ui bg-panel-strong"
          >
            <div
              className="px-2 py-3 text-right text-xs leading-6 text-muted"
              style={{ fontFamily: codeFontFamily }}
            >
              {Array.from({ length: lineCount }, (_, index) => (
                <div key={index + 1}>{index + 1}</div>
              ))}
            </div>
          </div>

          <pre
            ref={preRef}
            className="pointer-events-none absolute inset-0 m-0 overflow-auto whitespace-pre px-4 py-3 pl-16 text-[13px] leading-6 code-editor"
            style={{
              fontFamily: codeFontFamily,
              fontVariantLigatures: "common-ligatures contextual",
              fontFeatureSettings: '"liga" 1, "calt" 1',
              tabSize: 2,
            }}
          >
            <code
              dangerouslySetInnerHTML={{ __html: highlightedCode || " " }}
            />
          </pre>

          <textarea
            ref={textRef}
            value={sourceCode}
            onChange={(event) =>
              setSourceCode(normalizeEditorText(event.target.value))
            }
            onScroll={syncEditorScroll}
            onKeyDown={handleEditorKeyDown}
            spellCheck={false}
            wrap="off"
            className="absolute inset-0 resize-none overflow-auto bg-transparent px-4 py-3 pl-16 text-[13px] leading-6 text-transparent caret-[var(--fg)] outline-none"
            style={{
              fontFamily: codeFontFamily,
              fontVariantLigatures: "common-ligatures contextual",
              fontFeatureSettings: '"liga" 1, "calt" 1',
              tabSize: 2,
              WebkitTextFillColor: "transparent",
            }}
          />
        </div>
      </div>

      <div className="border-t-2 border-ui" />

      <div className="rounded-xl border border-ui bg-panel-strong p-3 text-xs text-muted">
        {problemType === "FUNCTIONAL"
          ? "当前评测采用标准输入输出，请提交完整可运行程序。"
          : "传统题支持标准输入输出评测，提交完整程序即可。"}
      </div>

      {error ? (
        <div className="rounded-xl border border-ui bg-panel-strong p-3 text-sm">
          {error}
        </div>
      ) : null}

      <div className="flex gap-3">
        <button
          type="button"
          disabled={submitting}
          onClick={handleSubmit}
          className="btn-inverse rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "评测中..." : "提交评测"}
        </button>
      </div>

      {submission ? (
        <div className="space-y-3 rounded-md border border-ui bg-panel p-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link
              href={`/submissions/${submission.id}`}
              className="rounded-md border border-ui bg-panel-strong px-3 py-1 hover:bg-ui transition"
            >
              状态: {statusText(submission.status)}（点击查看源码）
            </Link>
            <span className="rounded-md border border-ui bg-panel-strong px-3 py-1">
              得分: {submission.score}
            </span>
            <span className="rounded-md border border-ui bg-panel-strong px-3 py-1">
              通过: {samplePassed}/{submission.judgeResults.length}
            </span>
          </div>

          {submission.message ? (
            <p className="text-sm text-muted bg-panel-strong border border-ui p-2 rounded-md">
              {submission.message}
            </p>
          ) : null}

          <div className="overflow-x-auto rounded-md border border-ui">
            <table className="min-w-full divide-y divide-[var(--border)] text-sm">
              <thead className="bg-panel-strong">
                <tr>
                  <th className="px-4 py-2 text-left">测试点</th>
                  <th className="px-4 py-2 text-left">状态</th>
                  <th className="px-4 py-2 text-left">耗时</th>
                  <th className="px-4 py-2 text-left">内存</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-panel">
                {submission.judgeResults.map((result) => (
                  <tr key={result.id}>
                    <td className="px-4 py-2">
                      #{result.testCase.sortOrder + 1}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center">
                        {getJudgeResultIcon(
                          result.status,
                          result.judge0StatusId,
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      {result.timeSec !== null
                        ? `${(result.timeSec * 1000).toFixed(0)} ms`
                        : "-"}
                    </td>
                    <td className="px-4 py-2">
                      {result.memoryKb !== null ? `${result.memoryKb} KB` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
