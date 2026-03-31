export interface ReadingData {
  astrology_reading: string;
  design_insights: string[];
  third_way: string;
  journal_prompt: string;
  confidence_level: "low" | "medium" | "high";
}

export const CONFIDENCE_MESSAGES: Record<string, string> = {
  low: "This reading has some tension across your systems — sit with it.",
  medium: "This reading has solid alignment across your systems.",
  high: "This reading has strong alignment across your six systems.",
};
