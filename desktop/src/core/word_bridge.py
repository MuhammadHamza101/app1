"""
Word Bridge Core Module
Handles Microsoft Word COM integration with resilient error handling and retry logic
"""

import asyncio
import time
from enum import Enum
from typing import Optional, Dict, Any, List, Callable
from dataclasses import dataclass
from pathlib import Path
import pythoncom
from win32com.client import Dispatch, GetObject
from win32com.client import constants as win32_constants
from loguru import logger

from src.core.config import Config
from src.models.document import DocumentSnapshot, TextAnchor, ParagraphMapping
from src.utils.exceptions import WordConnectionError, DocumentExtractionError


class ConnectionState(Enum):
    """Word application connection states"""
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    BUSY = "busy"
    ERROR = "error"


@dataclass
class ConnectionResult:
    """Result of Word connection attempt"""
    success: bool
    state: ConnectionState
    message: str
    word_app: Optional[Any] = None
    active_doc: Optional[Any] = None


class ConnectionManager:
    """Manages Word application connection with retry logic and error handling"""
    
    def __init__(self, config: Config):
        self.config = config
        self.word_app = None
        self.active_doc = None
        self.connection_state = ConnectionState.DISCONNECTED
        self.last_error = None
        self.retry_count = 0
        self.max_retries = config.word.retry_attempts
        self.retry_delay = config.word.retry_delay_ms / 1000.0
        self.connection_timeout = config.word.connection_timeout_ms / 1000.0
        
    async def connect_to_word(self) -> ConnectionResult:
        """
        Connect to Word application with retry logic
        
        Returns:
            ConnectionResult with connection status and Word objects
        """
        self.connection_state = ConnectionState.CONNECTING
        logger.info("Attempting to connect to Word...")
        
        for attempt in range(self.max_retries):
            try:
                # Initialize COM for this thread
                pythoncom.CoInitialize()
                
                # Try to get existing Word instance
                try:
                    self.word_app = GetObject(Class="Word.Application")
                    logger.info("Connected to existing Word instance")
                except Exception:
                    # Create new Word instance
                    self.word_app = Dispatch("Word.Application")
                    self.word_app.Visible = True
                    logger.info("Created new Word instance")
                
                # Check if Word is ready
                if await self._is_word_ready():
                    # Get active document
                    self.active_doc = self._get_active_document()
                    if self.active_doc:
                        self.connection_state = ConnectionState.CONNECTED
                        logger.info(f"Connected to Word with active document: {self.active_doc.Name}")
                        return ConnectionResult(
                            success=True,
                            state=ConnectionState.CONNECTED,
                            message="Successfully connected to Word",
                            word_app=self.word_app,
                            active_doc=self.active_doc
                        )
                    else:
                        self.connection_state = ConnectionState.CONNECTED
                        logger.warning("Word is open but no active document")
                        return ConnectionResult(
                            success=False,
                            state=ConnectionState.CONNECTED,
                            message="Word is open but no active document",
                            word_app=self.word_app,
                            active_doc=None
                        )
                else:
                    self.connection_state = ConnectionState.BUSY
                    logger.warning("Word is busy, retrying...")
                    
            except Exception as e:
                self.last_error = str(e)
                logger.error(f"Word connection attempt {attempt + 1} failed: {e}")
                
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay * (2 ** attempt))  # Exponential backoff
                    
        self.connection_state = ConnectionState.ERROR
        return ConnectionResult(
            success=False,
            state=ConnectionState.ERROR,
            message=f"Failed to connect to Word after {self.max_retries} attempts: {self.last_error}"
        )
        
    async def _is_word_ready(self) -> bool:
        """Check if Word application is ready for operations"""
        try:
            # Check if Word is responding
            if not self.word_app:
                return False
                
            # Try to access a simple property
            _ = self.word_app.Version
            return True
            
        except Exception as e:
            logger.warning(f"Word not ready: {e}")
            return False
            
    def _get_active_document(self):
        """Get the active document from Word"""
        try:
            if self.word_app and self.word_app.Documents.Count > 0:
                return self.word_app.ActiveDocument
            return None
        except Exception as e:
            logger.error(f"Failed to get active document: {e}")
            return None
            
    async def disconnect(self):
        """Disconnect from Word application"""
        try:
            if self.word_app:
                # Don't close Word, just release references
                self.word_app = None
                self.active_doc = None
                self.connection_state = ConnectionState.DISCONNECTED
                logger.info("Disconnected from Word")
                
                # Uninitialize COM
                pythoncom.CoUninitialize()
                
        except Exception as e:
            logger.error(f"Error during disconnect: {e}")
            
    def get_connection_state(self) -> ConnectionState:
        """Get current connection state"""
        return self.connection_state
        
    def is_connected(self) -> bool:
        """Check if connected to Word with active document"""
        return self.connection_state == ConnectionState.CONNECTED and self.active_doc is not None


class DocumentExtractor:
    """Extracts and normalizes document content from Word"""
    
    def __init__(self, connection_manager: ConnectionManager):
        self.connection_manager = connection_manager
        
    async def extract_document_snapshot(self) -> DocumentSnapshot:
        """
        Extract document content with normalization and mapping metadata
        
        Returns:
            DocumentSnapshot with content and position mapping
        """
        if not self.connection_manager.is_connected():
            raise WordConnectionError("Not connected to Word")
            
        try:
            doc = self.connection_manager.active_doc
            content = []
            paragraph_map = []
            
            # Extract paragraphs with formatting information
            paragraphs = doc.Paragraphs
            total_paragraphs = paragraphs.Count
            
            for i in range(1, total_paragraphs + 1):
                paragraph = paragraphs.Item(i)
                
                # Get paragraph text
                text = paragraph.Range.Text
                
                # Get list numbering if present
                list_string = self._get_list_string(paragraph)
                
                # Normalize text
                normalized_text = self._normalize_text(text, list_string)
                
                # Create mapping metadata
                mapping = ParagraphMapping(
                    index=i - 1,
                    word_start=paragraph.Range.Start,
                    word_end=paragraph.Range.End,
                    checksum=self._calculate_checksum(normalized_text),
                    list_string=list_string
                )
                
                content.append(normalized_text)
                paragraph_map.append(mapping)
                
            # Combine content
            full_content = '\n'.join(content)
            
            # Create document snapshot
            snapshot = DocumentSnapshot(
                content=full_content,
                paragraph_map=paragraph_map,
                checksum=self._calculate_checksum(full_content),
                word_document=doc
            )
            
            logger.info(f"Extracted document snapshot: {len(content)} paragraphs")
            return snapshot
            
        except Exception as e:
            logger.error(f"Document extraction failed: {e}")
            raise DocumentExtractionError(f"Failed to extract document: {e}")
            
    def _get_list_string(self, paragraph) -> Optional[str]:
        """Extract list numbering from paragraph"""
        try:
            if paragraph.Range.ListFormat.ListType != win32_constants.wdListNoNumbering:
                return paragraph.Range.ListFormat.ListString
            return None
        except Exception:
            return None
            
    def _normalize_text(self, text: str, list_string: Optional[str] = None) -> str:
        """Normalize text content for analysis"""
        # Remove Word-specific characters
        normalized = text.replace('\r', '\n')
        
        # Add list string if present (convert invisible numbering to visible)
        if list_string and not normalized.strip().startswith(list_string.strip()):
            normalized = list_string + ' ' + normalized.strip()
            
        # Clean up extra whitespace
        normalized = '\n'.join(line.strip() for line in normalized.split('\n') if line.strip())
        
        return normalized
        
    def _calculate_checksum(self, text: str) -> str:
        """Calculate simple checksum for text"""
        return str(hash(text) & 0xffffffff)
        
    async def extract_structured_data(self, doc_snapshot: DocumentSnapshot) -> Dict[str, Any]:
        """
        Extract structured data from document (claims, figures, sections)
        
        Args:
            doc_snapshot: Document snapshot with content
            
        Returns:
            Dictionary with structured document data
        """
        content = doc_snapshot.content
        lines = content.split('\n')
        
        structured_data = {
            'sections': self._extract_sections(lines),
            'claims': self._extract_claims(lines),
            'figures': self._extract_figures(lines),
            'reference_numerals': self._extract_reference_numerals(content),
            'terminology': self._extract_terminology(content)
        }
        
        return structured_data
        
    def _extract_sections(self, lines: List[str]) -> List[Dict[str, Any]]:
        """Extract document sections"""
        sections = []
        current_section = None
        section_start = 0
        
        section_keywords = [
            'TITLE', 'ABSTRACT', 'BACKGROUND', 'SUMMARY', 
            'DETAILED DESCRIPTION', 'CLAIMS', 'FIGURES'
        ]
        
        for i, line in enumerate(lines):
            line_upper = line.upper().strip()
            
            # Check if this line starts a new section
            for keyword in section_keywords:
                if line_upper.startswith(keyword):
                    # Save previous section
                    if current_section:
                        current_section['end_line'] = i - 1
                        current_section['content'] = '\n'.join(
                            lines[section_start:i]
                        ).strip()
                        sections.append(current_section)
                    
                    # Start new section
                    current_section = {
                        'type': keyword.lower().replace(' ', '_'),
                        'title': line.strip(),
                        'start_line': i,
                        'end_line': None,
                        'content': None
                    }
                    section_start = i + 1
                    break
        
        # Save last section
        if current_section:
            current_section['end_line'] = len(lines) - 1
            current_section['content'] = '\n'.join(lines[section_start:]).strip()
            sections.append(current_section)
            
        return sections
        
    def _extract_claims(self, lines: List[str]) -> List[Dict[str, Any]]:
        """Extract patent claims with dependencies"""
        claims = []
        in_claims_section = False
        
        for i, line in enumerate(lines):
            line_stripped = line.strip()
            
            # Check if we're in claims section
            if line_stripped.upper().startswith('CLAIMS'):
                in_claims_section = True
                continue
                
            # Extract claim if it starts with a number
            if in_claims_section and line_stripped and line_stripped[0].isdigit():
                claim_match = line_stripped.match(r'^(\d+)\.\s*(.*)')
                if claim_match:
                    claim_number = int(claim_match.group(1))
                    claim_text = claim_match.group(2)
                    
                    # Determine claim type and dependencies
                    claim_type = 'dependent' if 'claim' in claim_text.lower() else 'independent'
                    dependencies = self._extract_claim_dependencies(claim_text)
                    
                    claims.append({
                        'number': claim_number,
                        'type': claim_type,
                        'text': line_stripped,
                        'dependencies': dependencies,
                        'category': self._determine_claim_category(claim_text),
                        'start_line': i,
                        'end_line': i
                    })
                    
        return claims
        
    def _extract_claim_dependencies(self, claim_text: str) -> List[int]:
        """Extract claim dependencies from claim text"""
        import re
        dependencies = []
        matches = re.findall(r'claim\s+(\d+)', claim_text, re.IGNORECASE)
        for match in matches:
            try:
                dep_num = int(match)
                if dep_num not in dependencies:
                    dependencies.append(dep_num)
            except ValueError:
                continue
        return dependencies
        
    def _determine_claim_category(self, claim_text: str) -> str:
        """Determine claim category (apparatus, method, system, etc.)"""
        text_lower = claim_text.lower()
        
        if any(word in text_lower for word in ['method', 'process', 'steps']):
            return 'method'
        elif any(word in text_lower for word in ['system', 'assembly']):
            return 'system'
        elif any(word in text_lower for word in ['composition', 'compound']):
            return 'composition'
        else:
            return 'apparatus'
            
    def _extract_figures(self, lines: List[str]) -> List[Dict[str, Any]]:
        """Extract figure references"""
        figures = []
        figure_pattern = re.compile(r'FIG\.?\s*(\d+[A-Z]?)', re.IGNORECASE)
        
        for i, line in enumerate(lines):
            matches = figure_pattern.finditer(line)
            for match in matches:
                figure_number = match.group(1).upper()
                figures.append({
                    'number': figure_number,
                    'reference_line': i,
                    'context': line.strip()
                })
                
        # Remove duplicates and sort
        unique_figures = {}
        for fig in figures:
            if fig['number'] not in unique_figures:
                unique_figures[fig['number']] = fig
                
        return sorted(unique_figures.values(), key=lambda x: x['number'])
        
    def _extract_reference_numerals(self, content: str) -> List[Dict[str, Any]]:
        """Extract reference numerals from content"""
        import re
        numerals = []
        
        # Pattern for reference numerals (e.g., 10, 10a, 10', 10a')
        numeral_pattern = re.compile(r'\b(\d+)[a-zA-Z\']*\b')
        
        matches = numeral_pattern.finditer(content)
        for match in matches:
            numeral = match.group()
            base_num = match.group(1)
            
            numerals.append({
                'numeral': numeral,
                'family': base_num,
                'position': match.start(),
                'context': content[max(0, match.start()-20):match.end()+20]
            })
            
        return numerals
        
    def _extract_terminology(self, content: str) -> List[Dict[str, Any]]:
        """Extract potential terminology entries"""
        import re
        # Simple pattern for noun phrases (2-3 words)
        phrase_pattern = re.compile(r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b')
        
        terms = {}
        matches = phrase_pattern.finditer(content)
        
        for match in matches:
            phrase = match.group()
            if phrase not in terms:
                terms[phrase] = {
                    'term': phrase,
                    'count': 0,
                    'positions': []
                }
            terms[phrase]['count'] += 1
            terms[phrase]['positions'].append(match.start())
            
        return list(terms.values())