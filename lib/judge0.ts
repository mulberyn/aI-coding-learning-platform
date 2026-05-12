import {
  JudgeResultStatus,
  SubmissionLanguage,
  SubmissionStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

const judge0LanguageIdMap: Record<SubmissionLanguage, number> = {
  C: 50,
  CPP: 54,
  PYTHON: 71,
  GO: 60,
  RUST: 73,
  JAVA: 62,
};

const terminalJudge0StatusIds = new Set([
  3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
]);

type Judge0Result = {
  status?: { id: number; description: string };
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  time?: string | null;
  memory?: number | null;
};

type NormalizedCaseOutcome = {
  judgeResultStatus: JudgeResultStatus;
  submissionStatus: SubmissionStatus;
};

function getJudge0Headers() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (process.env.JUDGE0_API_KEY) {
    headers["X-RapidAPI-Key"] = process.env.JUDGE0_API_KEY;
  }

  if (process.env.JUDGE0_API_HOST) {
    headers["X-RapidAPI-Host"] = process.env.JUDGE0_API_HOST;
  }

  return headers;
}

function getJudge0BaseUrl() {
  return (process.env.JUDGE0_API_BASE_URL ?? "https://ce.judge0.com").replace(
    /\/$/,
    "",
  );
}

async function sleep(ms: number) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeOutcome(statusId: number): NormalizedCaseOutcome {
  if (statusId === 3) {
    return {
      judgeResultStatus: JudgeResultStatus.PASSED,
      submissionStatus: SubmissionStatus.ACCEPTED,
    };
  }

  if (statusId === 4) {
    return {
      judgeResultStatus: JudgeResultStatus.FAILED,
      submissionStatus: SubmissionStatus.WRONG_ANSWER,
    };
  }

  if (statusId === 5) {
    return {
      judgeResultStatus: JudgeResultStatus.ERROR,
      submissionStatus: SubmissionStatus.TIME_LIMIT_EXCEEDED,
    };
  }

  if (statusId === 6) {
    return {
      judgeResultStatus: JudgeResultStatus.ERROR,
      submissionStatus: SubmissionStatus.COMPILE_ERROR,
    };
  }

  if ([7, 8, 9, 10, 11, 12].includes(statusId)) {
    return {
      judgeResultStatus: JudgeResultStatus.ERROR,
      submissionStatus: SubmissionStatus.RUNTIME_ERROR,
    };
  }

  return {
    judgeResultStatus: JudgeResultStatus.ERROR,
    submissionStatus: SubmissionStatus.JUDGE_ERROR,
  };
}

function aggregateSubmissionStatus(statuses: SubmissionStatus[]) {
  if (statuses.length === 0) {
    return SubmissionStatus.JUDGE_ERROR;
  }

  if (statuses.every((status) => status === SubmissionStatus.ACCEPTED)) {
    return SubmissionStatus.ACCEPTED;
  }

  if (statuses.includes(SubmissionStatus.COMPILE_ERROR)) {
    return SubmissionStatus.COMPILE_ERROR;
  }

  if (statuses.includes(SubmissionStatus.TIME_LIMIT_EXCEEDED)) {
    return SubmissionStatus.TIME_LIMIT_EXCEEDED;
  }

  if (statuses.includes(SubmissionStatus.RUNTIME_ERROR)) {
    return SubmissionStatus.RUNTIME_ERROR;
  }

  if (statuses.includes(SubmissionStatus.WRONG_ANSWER)) {
    return SubmissionStatus.WRONG_ANSWER;
  }

  return SubmissionStatus.JUDGE_ERROR;
}

async function submitToJudge0(
  language: SubmissionLanguage,
  sourceCode: string,
  stdin: string,
  expectedOutput: string,
) {
  const maxRetries = 8; // 从 5 次增加到 8 次
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      const response = await fetch(
        `${getJudge0BaseUrl()}/submissions?base64_encoded=false&wait=false`,
        {
          method: "POST",
          headers: getJudge0Headers(),
          body: JSON.stringify({
            language_id: judge0LanguageIdMap[language],
            source_code: sourceCode,
            stdin,
            expected_output: expectedOutput,
          }),
        },
      );

      // 处理 504/503/429 这样的临时错误
      if (
        response.status === 504 ||
        response.status === 503 ||
        response.status === 429
      ) {
        lastError = new Error(
          `Judge0 temporarily unavailable (${response.status})`,
        );

        // 改进的指数退避策略：1s, 2s, 3s, 4s, 5s, 5s, 5s
        // 前几次快速增长，后续保持固定时间
        let backoffMs = 1000;
        if (attempt > 0) {
          backoffMs = Math.min(1000 + attempt * 1000, 5000);
        }
        console.log(
          `[Judge0 Retry] Attempt ${attempt + 1}/${maxRetries}, waiting ${backoffMs}ms before retry`,
        );
        await sleep(backoffMs);
        continue;
      }

      if (!response.ok) {
        throw new Error(`Judge0 submit failed: ${response.status}`);
      }

      const data = (await response.json()) as { token?: string };
      if (!data.token) {
        throw new Error("Judge0 submit did not return token.");
      }

      console.log(`[Judge0 Success] Submission token received: ${data.token}`);
      return data.token;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 如果不是临时错误，立即抛出
      if (!lastError.message.includes("temporarily unavailable")) {
        console.error(`[Judge0 Fatal Error] Non-retryable error:`, lastError);
        throw lastError;
      }
    }
  }

  console.error(
    `[Judge0 Failed] All ${maxRetries} retries exhausted:`,
    lastError?.message,
  );
  throw new Error(
    `Judge0 submit failed after ${maxRetries} retries: ${lastError?.message}`,
  );
}

async function pollJudge0(token: string): Promise<Judge0Result> {
  // 最多等待 3 分钟（180 次轮询 × 平均 1 秒 = ~3 分钟）
  const maxAttempts = 180;
  let intervalMs = 1000; // 从 1 秒开始（提高初始间隔）

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetch(
        `${getJudge0BaseUrl()}/submissions/${token}?base64_encoded=false&fields=status,stdout,stderr,compile_output,time,memory`,
        {
          headers: getJudge0Headers(),
        },
      );

      // 处理 504/503/429 这样的临时错误，继续轮询
      if (
        response.status === 504 ||
        response.status === 503 ||
        response.status === 429
      ) {
        console.log(
          `[Judge0 Poll Retry] Attempt ${attempt + 1}/${maxAttempts}, status ${response.status}, waiting ${intervalMs}ms`,
        );
        await sleep(Math.min(intervalMs, 5000));
        intervalMs = Math.min(intervalMs * 1.3, 5000); // 缓慢递增间隔，最多 5s
        continue;
      }

      if (!response.ok) {
        throw new Error(`Judge0 polling failed: ${response.status}`);
      }

      const data = (await response.json()) as Judge0Result;
      const statusId = data.status?.id;

      if (
        typeof statusId === "number" &&
        terminalJudge0StatusIds.has(statusId)
      ) {
        console.log(
          `[Judge0 Complete] Token ${token} completed with status ${statusId}`,
        );
        return data;
      }

      // 未完成，继续轮询
      await sleep(intervalMs);
      intervalMs = Math.min(intervalMs * 1.2, 5000); // 平缓增长间隔
    } catch (error) {
      // 对于网络错误，也进行重试
      if (attempt < maxAttempts - 1) {
        console.log(
          `[Judge0 Poll Error] Attempt ${attempt + 1}/${maxAttempts}, error: ${error instanceof Error ? error.message : String(error)}`,
        );
        await sleep(Math.min(intervalMs, 5000));
        intervalMs = Math.min(intervalMs * 1.3, 5000);
        continue;
      }
      throw error;
    }
  }

  console.error(
    `[Judge0 Timeout] Token ${token} did not complete after 3 minutes`,
  );
  throw new Error("Judge0 polling timeout after 3 minutes.");
}

export async function runSubmissionJudging(submissionId: string) {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      problem: {
        include: {
          testCases: {
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  if (!submission) {
    return;
  }

  if (submission.problem.testCases.length === 0) {
    await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: SubmissionStatus.JUDGE_ERROR,
        message: "当前题目没有配置评测用例。",
        finishedAt: new Date(),
      },
    });
    return;
  }

  await prisma.submission.update({
    where: { id: submission.id },
    data: {
      status: SubmissionStatus.RUNNING,
      startedAt: new Date(),
      message: "正在评测中...",
    },
  });

  const caseStatuses: SubmissionStatus[] = [];
  let passedCount = 0;

  try {
    for (const testCase of submission.problem.testCases) {
      const token = await submitToJudge0(
        submission.language,
        submission.sourceCode,
        testCase.input,
        testCase.expectedOutput,
      );

      const judge0Result = await pollJudge0(token);
      const statusId = judge0Result.status?.id ?? 0;
      const normalized = normalizeOutcome(statusId);
      caseStatuses.push(normalized.submissionStatus);

      if (normalized.judgeResultStatus === JudgeResultStatus.PASSED) {
        passedCount += 1;
      }

      await prisma.judgeResult.updateMany({
        where: {
          submissionId: submission.id,
          testCaseId: testCase.id,
        },
        data: {
          judge0Token: token,
          judge0StatusId: statusId,
          status: normalized.judgeResultStatus,
          stdout: judge0Result.stdout ?? null,
          stderr: judge0Result.stderr ?? null,
          compileOutput: judge0Result.compile_output ?? null,
          timeSec: judge0Result.time ? Number(judge0Result.time) : null,
          memoryKb: judge0Result.memory ?? null,
        },
      });
    }

    const finalStatus = aggregateSubmissionStatus(caseStatuses);
    const score = Math.round(
      (passedCount / submission.problem.testCases.length) * 100,
    );

    await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: finalStatus,
        score,
        message:
          finalStatus === SubmissionStatus.ACCEPTED
            ? "通过所有测试用例。"
            : "评测完成，未通过全部测试用例。",
        finishedAt: new Date(),
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "评测服务异常，请稍后重试。";

    // 区分不同的错误类型
    let userMessage = errorMessage;
    if (errorMessage.includes("temporarily unavailable")) {
      userMessage = "评测服务暂时不可用，请稍后重新提交。";
    } else if (errorMessage.includes("polling timeout")) {
      userMessage = "评测超时，请稍后重新提交。";
    } else if (errorMessage.includes("submit failed")) {
      userMessage = "代码提交失败，请检查网络连接后重试。";
    }

    await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: SubmissionStatus.JUDGE_ERROR,
        message: userMessage,
        finishedAt: new Date(),
      },
    });

    console.error(`[Judge0 Error] Submission ${submission.id}:`, errorMessage);
  }
}
