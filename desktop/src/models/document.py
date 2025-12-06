"""
Data models for PatentFlow Desktop
Defines document, analysis, and finding data structures
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum


class Severity(Enum):
    """Finding severity levels"""
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


class FindingType(Enum):
    """Types of analysis findings"""
    ANTECEDENT_BASIS = "ANTECEDENT_BASIS"
    CLAIM_DEPENDENCY = "CLAIM_DEPENDENCY"
    TERMINOLOGY_INCONSISTENCY = "TERMINOLOGY_INCONSISTENCY"
    REFERENCE_NUMERAL = "REFERENCE_NUMERAL"
    FORMATTING_ERROR = "FORMATTING_ERROR"
    MISSING_ELEMENT = "MISSING_ELEMENT"
    RED_FLAG_TERM = "RED_FLAG_TERM"


class AnalysisType(Enum):
    """Types of document analysis"""
    CLAIMS_ANALYSIS = "CLAIMS_ANALYSIS"
    SPECIFICATION_ANALYSIS = "SPECIFICATION_ANALYSIS"
    FIGURE_ANALYSIS = "FIGURE_ANALYSIS"
    TERMINOLOGY_ANALYSIS = "TERMINOLOGY_ANALYSIS"
    FULL_ANALYSIS = "FULL_ANALYSIS"


@dataclass
class TextAnchor:
    """Text position anchor for navigation"""
    paragraph_index: int
    start_offset: int
    end_offset: int
    text: str
    context_hash: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ParagraphMapping:
    """Mapping between document paragraphs and Word positions"""
    index: int
    word_start: int
    word_end: int
    checksum: str
    list_string: Optional[str] = None


@dataclass
class DocumentSnapshot:
    """Snapshot of document content with mapping metadata"""
    content: str
    paragraph_map: List[ParagraphMapping]
    checksum: str
    structured_data: Optional[Dict[str, Any]] = None
    word_document: Optional[Any] = None  # Word COM object
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class Finding:
    """Analysis finding with metadata"""
    id: str
    type: FindingType
    severity: Severity
    title: str
    description: str
    suggestion: Optional[str]
    context: str
    anchor: Optional[TextAnchor]
    metadata: Dict[str, Any] = field(default_factory=dict)
    confidence: Optional[float] = None
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class ClaimNode:
    """Node in claim dependency graph"""
    id: str
    claim_number: int
    claim_type: str  # 'independent' or 'dependent'
    category: str
    text: str
    severity: Optional[Severity] = None
    issue_count: int = 0


@dataclass
class ClaimEdge:
    """Edge in claim dependency graph"""
    from_node: str
    to_node: str
    edge_type: str = "depends_on"
    weight: int = 1


@dataclass
class ClaimGraph:
    """Claim dependency graph structure"""
    nodes: List[ClaimNode]
    edges: List[ClaimEdge]
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AnalysisResult:
    """Results of document analysis"""
    analysis_id: str
    document_id: str
    analysis_type: AnalysisType
    findings: List[Finding]
    claim_graph: Optional[ClaimGraph] = None
    terminology_analysis: Optional[Dict[str, Any]] = None
    numeral_analysis: Optional[Dict[str, Any]] = None
    summary: Optional[Dict[str, Any]] = None
    metrics: Optional[Dict[str, Any]] = None
    started_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None


@dataclass
class TerminologyEntry:
    """Terminology entry with usage information"""
    term: str
    variants: List[str]
    definition: Optional[str]
    usage: List[Dict[str, Any]]
    consistency: Dict[str, Any]


@dataclass
class ReferenceNumeral:
    """Reference numeral with family information"""
    id: str
    numeral: str
    family: str  # Base numeral without suffix
    text: str
    context: str
    locations: List[TextLocation]
    figure_references: List[str]
    claim_references: List[str]


@dataclass
class TextLocation:
    """Location in text"""
    paragraph_index: int
    start_offset: int
    end_offset: int
    text: str


@dataclass
class RenumberOperation:
    """Smart renumber operation definition"""
    operation_type: str  # 'range_shift' or 'figure_insert'
    target_range: Optional[str] = None  # e.g., "300-399"
    offset: Optional[int] = None  # e.g., 100 for 300->400
    insert_position: Optional[int] = None  # For figure insertion
    dry_run: bool = True
    affected_items: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class RenumberResult:
    """Result of renumber operation"""
    success: bool
    operation: RenumberOperation
    changes: List[Dict[str, Any]]
    errors: List[str]
    preview: Optional[Dict[str, Any]] = None


@dataclass
class AnalysisConfig:
    """Configuration for analysis operations"""
    enabled_rules: List[str] = field(default_factory=list)
    severity_filters: List[Severity] = field(default_factory=list)
    custom_rules: List[Dict[str, Any]] = field(default_factory=list)
    nlp_settings: Dict[str, Any] = field(default_factory=dict)
    confidence_threshold: float = 0.8
    enable_disambiguation: bool = True