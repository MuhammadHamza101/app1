// PatentFlow Enterprise - TypeScript Interfaces
// Core data types and interfaces for the frontend and backend

// User Management
export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  firmId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Firm {
  id: string;
  name: string;
  domain?: string;
  settings?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  refreshToken?: string;
  expiresAt: Date;
  createdAt: Date;
}

// Document Management
export interface Document {
  id: string;
  title: string;
  originalPath?: string;
  checksum?: string;
  version: number;
  status: DocumentStatus;
  metadata?: Record<string, any>;
  encryptedData?: string;
  firmId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentSnapshot {
  id: string;
  documentId: string;
  version: number;
  content: string;
  structuredData: StructuredDocumentData;
  mappingMetadata: MappingMetadata;
  checksum: string;
  createdAt: Date;
}

export interface StructuredDocumentData {
  sections: DocumentSection[];
  claims: Claim[];
  figures: Figure[];
  referenceNumerals: ReferenceNumeral[];
  terminology: TerminologyEntry[];
}

export interface DocumentSection {
  id: string;
  type: 'title' | 'abstract' | 'background' | 'summary' | 'detailed_description' | 'claims' | 'figures';
  title: string;
  content: string;
  startLine: number;
  endLine: number;
}

export interface Claim {
  id: string;
  number: number;
  type: 'independent' | 'dependent';
  text: string;
  dependencies: number[];
  category: 'apparatus' | 'method' | 'system' | 'composition';
  preamble?: string;
  body: string;
  startLine: number;
  endLine: number;
}

export interface Figure {
  id: string;
  number: string;
  title?: string;
  description?: string;
  referenceNumerals: string[];
  startLine: number;
  endLine: number;
}

export interface ReferenceNumeral {
  id: string;
  numeral: string;
  family: string; // Base numeral without suffix (e.g., "10" from "10a")
  text: string;
  context: string;
  locations: TextLocation[];
  figureReferences: string[];
  claimReferences: string[];
}

export interface TerminologyEntry {
  term: string;
  variants: string[];
  definition?: string;
  usage: TermUsage[];
  consistency: {
    isConsistent: boolean;
    issues: string[];
  };
}

export interface TermUsage {
  location: TextLocation;
  context: string;
  form: string; // The actual form used
}

export interface TextLocation {
  paragraphIndex: number;
  startOffset: number;
  endOffset: number;
  text: string;
}

export interface MappingMetadata {
  paragraphMap: ParagraphMapping[];
  anchorMap: Record<string, Anchor>;
  changeDetection: ChangeDetectionData;
}

export interface ParagraphMapping {
  index: number;
  wordStart: number;
  wordEnd: number;
  checksum: string;
  listString?: string; // Word list numbering (e.g., "1.", "a)")
}

export interface ChangeDetectionData {
  documentChecksum: string;
  lastSyncTime: Date;
  changeHistory: DocumentChange[];
}

export interface DocumentChange {
  type: 'insert' | 'delete' | 'modify';
  location: TextLocation;
  oldText?: string;
  newText?: string;
  timestamp: Date;
}

// Analysis Engine
export interface Analysis {
  id: string;
  documentId: string;
  snapshotId: string;
  userId: string;
  type: AnalysisType;
  status: AnalysisStatus;
  config?: AnalysisConfig;
  results?: AnalysisResults;
  metrics?: AnalysisMetrics;
  startedAt: Date;
  completedAt?: Date;
}

export interface AnalysisConfig {
  enabledRules: string[];
  severityFilters: Severity[];
  customRules: CustomRule[];
  nlpSettings: NLPSettings;
}

export interface CustomRule {
  id: string;
  name: string;
  pattern: string;
  type: RuleType;
  config: Record<string, any>;
}

export interface NLPSettings {
  model: string;
  confidenceThreshold: number;
  enableDisambiguation: boolean;
  customEntities: EntityPattern[];
}

export interface EntityPattern {
  name: string;
  pattern: string;
  posFilter?: string[];
}

export interface AnalysisResults {
  findings: Finding[];
  claimGraph: ClaimGraph;
  terminologyAnalysis: TerminologyAnalysis;
  numeralAnalysis: NumeralAnalysis;
  summary: AnalysisSummary;
}

export interface AnalysisMetrics {
  totalFindings: number;
  findingsBySeverity: Record<Severity, number>;
  findingsByType: Record<FindingType, number>;
  processingTime: number;
  memoryUsage: number;
  accuracy: {
    precision: number;
    recall: number;
    f1Score: number;
  };
}

export interface Finding {
  id: string;
  analysisId: string;
  snapshotId: string;
  ruleId?: string;
  type: FindingType;
  severity: Severity;
  title: string;
  description: string;
  suggestion?: string;
  context: string;
  anchorId?: string;
  metadata?: FindingMetadata;
  confidence?: number;
  status: FindingStatus;
  createdAt: Date;
}

export interface FindingMetadata {
  ruleName?: string;
  posTag?: string;
  dependencyChain?: string[];
  relatedFindings: string[];
  explanation: string;
  contextSnippet: {
    before: string;
    match: string;
    after: string;
  };
}

export interface Anchor {
  id: string;
  snapshotId: string;
  paragraphIndex: number;
  startOffset: number;
  endOffset: number;
  text: string;
  contextHash?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface ClaimGraph {
  nodes: ClaimNode[];
  edges: ClaimEdge[];
  metadata: GraphMetadata;
}

export interface ClaimNode {
  id: string;
  claimNumber: number;
  type: 'independent' | 'dependent';
  category: string;
  text: string;
  severity?: Severity;
  issueCount: number;
}

export interface ClaimEdge {
  from: string;
  to: string;
  type: 'depends_on';
  weight: number;
}

export interface GraphMetadata {
  totalClaims: number;
  independentClaims: number;
  dependentClaims: number;
  maxDepth: number;
  circularDependencies: string[];
}

export interface TerminologyAnalysis {
  entries: TerminologyEntry[];
  inconsistencies: TerminologyInconsistency[];
  undefinedTerms: string[];
  suggestions: TerminologySuggestion[];
}

export interface TerminologyInconsistency {
  term: string;
  variants: string[];
  locations: TextLocation[];
  severity: Severity;
  suggestion: string;
}

export interface TerminologySuggestion {
  type: 'standardization' | 'definition' | 'usage';
  term: string;
  suggestion: string;
  reasoning: string;
}

export interface NumeralAnalysis {
  numerals: ReferenceNumeral[];
  collisions: NumeralCollision[];
  missingSupports: MissingSupport[];
  typos: NumeralTypo[];
  families: NumeralFamily[];
}

export interface NumeralCollision {
  numerals: string[];
  locations: TextLocation[];
  severity: Severity;
}

export interface MissingSupport {
  numeral: string;
  type: 'figure' | 'specification';
  expectedLocations: string[];
  severity: Severity;
}

export interface NumeralTypo {
  incorrect: string;
  correct: string;
  confidence: number;
  locations: TextLocation[];
}

export interface NumeralFamily {
  base: string;
  members: string[];
  isConsistent: boolean;
  issues: string[];
}

export interface AnalysisSummary {
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  score: number; // 0-100 quality score
  recommendations: string[];
}

// Rule Engine
export interface Rule {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  type: RuleType;
  config: RuleConfig;
  enabled: boolean;
  version: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleConfig {
  pattern?: string;
  severity: Severity;
  message: string;
  suggestion?: string;
  parameters: Record<string, any>;
  dependencies?: string[];
  exceptions?: string[];
}

// Reporting
export interface Report {
  id: string;
  documentId: string;
  analysisId?: string;
  userId: string;
  type: ReportType;
  title: string;
  content?: string;
  data: ReportData;
  format: ReportFormat;
  status: ReportStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportData {
  findings: Finding[];
  summary: AnalysisSummary;
  charts: ChartData[];
  metadata: Record<string, any>;
}

export interface ChartData {
  type: 'bar' | 'pie' | 'line' | 'scatter';
  title: string;
  data: any[];
  config: Record<string, any>;
}

// Collaboration
export interface Comment {
  id: string;
  documentId: string;
  userId: string;
  anchorId?: string;
  content: string;
  type: CommentType;
  status: CommentStatus;
  metadata?: CommentMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentMetadata {
  resolvedBy?: string;
  resolvedAt?: Date;
  tags: string[];
  priority: 'low' | 'medium' | 'high';
}

// API Request/Response Types
export interface AnalysisRequest {
  documentId: string;
  type: AnalysisType;
  config?: AnalysisConfig;
}

export interface AnalysisResponse {
  analysisId: string;
  status: AnalysisStatus;
  progress?: number;
  results?: AnalysisResults;
}

export interface NavigateRequest {
  anchorId: string;
  options?: NavigationOptions;
}

export interface NavigationOptions {
  highlight?: boolean;
  scroll?: boolean;
  select?: boolean;
}

export interface SearchRequest {
  query: string;
  filters: SearchFilters;
  pagination: PaginationOptions;
}

export interface SearchFilters {
  documentId?: string;
  type?: FindingType;
  severity?: Severity;
  status?: FindingStatus;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResponse {
  results: Finding[];
  total: number;
  page: number;
  totalPages: number;
}

// Enums
export enum UserRole {
  ADMIN = 'ADMIN',
  ATTORNEY = 'ATTORNEY',
  PARALEGAL = 'PARALEGAL',
  REVIEWER = 'REVIEWER'
}

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  APPROVED = 'APPROVED',
  FILED = 'FILED',
  ARCHIVED = 'ARCHIVED'
}

export enum AnalysisType {
  CLAIMS_ANALYSIS = 'CLAIMS_ANALYSIS',
  SPECIFICATION_ANALYSIS = 'SPECIFICATION_ANALYSIS',
  FIGURE_ANALYSIS = 'FIGURE_ANALYSIS',
  TERMINOLOGY_ANALYSIS = 'TERMINOLOGY_ANALYSIS',
  FULL_ANALYSIS = 'FULL_ANALYSIS'
}

export enum AnalysisStatus {
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum FindingType {
  ANTECEDENT_BASIS = 'ANTECEDENT_BASIS',
  CLAIM_DEPENDENCY = 'CLAIM_DEPENDENCY',
  TERMINOLOGY_INCONSISTENCY = 'TERMINOLOGY_INCONSISTENCY',
  REFERENCE_NUMERAL = 'REFERENCE_NUMERAL',
  FORMATTING_ERROR = 'FORMATTING_ERROR',
  MISSING_ELEMENT = 'MISSING_ELEMENT',
  RED_FLAG_TERM = 'RED_FLAG_TERM'
}

export enum Severity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO'
}

export enum FindingStatus {
  OPEN = 'OPEN',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
  IGNORED = 'IGNORED'
}

export enum RuleCategory {
  CLAIMS = 'CLAIMS',
  SPECIFICATION = 'SPECIFICATION',
  FIGURES = 'FIGURES',
  TERMINOLOGY = 'TERMINOLOGY',
  FORMATTING = 'FORMATTING',
  LEGAL = 'LEGAL'
}

export enum RuleType {
  PATTERN_MATCH = 'PATTERN_MATCH',
  NLP_BASED = 'NLP_BASED',
  DEPENDENCY_CHECK = 'DEPENDENCY_CHECK',
  CONSISTENCY_CHECK = 'CONSISTENCY_CHECK',
  VALIDATION_RULE = 'VALIDATION_RULE'
}

export enum ReportType {
  ANALYSIS_SUMMARY = 'ANALYSIS_SUMMARY',
  DETAILED_FINDINGS = 'DETAILED_FINDINGS',
  CLAIM_GRAPH = 'CLAIM_GRAPH',
  TERMINOLOGY_REPORT = 'TERMINOLOGY_REPORT',
  COMPLIANCE_REPORT = 'COMPLIANCE_REPORT'
}

export enum ReportFormat {
  HTML = 'HTML',
  PDF = 'PDF',
  WORD = 'WORD',
  JSON = 'JSON'
}

export enum ReportStatus {
  DRAFT = 'DRAFT',
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export enum CommentType {
  GENERAL = 'GENERAL',
  FINDING = 'FINDING',
  SUGGESTION = 'SUGGESTION',
  QUESTION = 'QUESTION',
  APPROVAL = 'APPROVAL'
}

export enum CommentStatus {
  OPEN = 'OPEN',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;