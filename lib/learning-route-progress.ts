import { type LearningRouteWithPoints } from "@/lib/learning-route-types";

export function getLearningRouteProgress(
  detail: LearningRouteWithPoints | null,
) {
  if (!detail) {
    return null;
  }

  const problemPoints = detail.points.filter(
    (point) => point.pointType === "problem",
  );
  const contestPoints = detail.points.filter(
    (point) => point.pointType === "contest",
  );
  const forumPoints = detail.points.filter(
    (point) => point.pointType === "forum",
  );
  const customPoints = detail.points.filter(
    (point) => point.pointType === "custom",
  );

  const solvedProblems = problemPoints.filter(
    (point) => point.problemAttemptState === "SOLVED",
  ).length;
  const finishedContests = contestPoints.filter((point) =>
    Boolean(point.contestRegistered && point.contestScore !== null),
  ).length;
  const finishedForums = forumPoints.filter(
    (point) => point.status === "done",
  ).length;
  const finishedCustom = customPoints.filter(
    (point) => point.status === "done",
  ).length;

  const completedPoints =
    solvedProblems + finishedContests + finishedForums + finishedCustom;
  const totalPoints = detail.points.length;

  return {
    totalPoints,
    completedPoints,
    problemPoints,
    solvedProblems,
    contestPoints,
    finishedContests,
    forumPoints,
    finishedForums,
    customPoints,
    finishedCustom,
    problemNodeComplete:
      problemPoints.length > 0 && solvedProblems === problemPoints.length,
    completionRate: totalPoints > 0 ? completedPoints / totalPoints : 0,
    isComplete: totalPoints > 0 && completedPoints === totalPoints,
  };
}
