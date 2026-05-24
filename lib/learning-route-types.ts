export type LearningRoutePointStatus = "pending" | "in_progress" | "done";

export type LearningRoutePointType = "problem" | "contest" | "forum" | "custom";

export type LearningRoutePoint = {
  id: string;
  routeId: string;
  title: string;
  description: string;
  pointType: LearningRoutePointType;
  refId: string | null;
  targetDate: string | null;
  status: LearningRoutePointStatus;
  sortOrder: number;
  linkHref?: string | null;
  linkLabel?: string | null;
  problemAttemptState?: "UNTRIED" | "ATTEMPTED" | "SOLVED";
  contestRegistered?: boolean;
  contestScore?: number | null;
  contestRank?: number | null;
};

export type LearningRoute = {
  id: string;
  userId: string;
  name: string;
  source: "manual" | "ai";
  inputPrompt: string | null;
  summary: string | null;
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
  progress?: {
    totalPoints: number;
    completedPoints: number;
    completionRate: number;
    isComplete: boolean;
  };
  tracking?: LearningRouteTracking | null;
};

export type LearningRouteTracking = {
  summary: string;
  analysis: string[];
  suggestions: Array<{
    title: string;
    reason: string;
  }>;
  snippets: Array<{
    problemTitle: string;
    status: string;
    createdAt: string;
    code: string;
  }>;
  completionSignature: string;
  updatedAt: string;
};

export type LearningRouteWithPoints = {
  route: LearningRoute;
  points: LearningRoutePoint[];
};

export type GeneratedLearningRoute = {
  routeName: string;
  summary: string;
  points: Array<{
    title: string;
    description: string;
    pointType: LearningRoutePointType;
    refId?: string | null;
    targetDate?: string | null;
    status?: LearningRoutePointStatus;
  }>;
};
