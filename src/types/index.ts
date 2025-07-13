export interface ValidationResult {
  is_valid: boolean;
  common_files: string[];
  missing_files: Record<string, string[]>;
}

export interface ComparisonResult {
  filename: string;
  iou_scores: Record<string, number>;
  accuracy_scores: Record<string, number>;
  paths: Record<string, string>;
}

export interface ComparisonFolder {
  id: string;
  name: string;
  path: string;
}

export interface FolderData {
  gt: string;
  my: string;
  comparison: ComparisonFolder[];
}

export type Step = 'folder-selection' | 'validation' | 'comparison';

export interface HistoryRecord {
  id: string;
  name: string;
  folders: FolderData;
  createdAt: string;
  description?: string;
}

export interface AppState {
  currentStep: Step;
  folders: FolderData;
  validationResult: ValidationResult | null;
  comparisonResults: ComparisonResult[];
  loading: boolean;
  error: string | null;
  historyRecords: HistoryRecord[];
} 