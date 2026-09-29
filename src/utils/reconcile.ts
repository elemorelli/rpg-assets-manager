export interface RcloneCheckResult {
  matchCount: number;
  missingOnSource: string[];
  missingOnDestination: string[];
  differs: string[];
  errors: string[];
}
