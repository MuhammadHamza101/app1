"""
Analysis View Component
Displays analysis results and findings with detailed information
"""

from typing import Optional, List
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QTextEdit, QLabel,
    QScrollArea, QFrame, QPushButton, QGroupBox
)
from PyQt6.QtCore import Qt, pyqtSignal
from PyQt6.QtGui import QFont, QPixmap
from loguru import logger

from src.core.navigation_handler import NavigationHandler
from src.models.document import Finding, AnalysisResult, Severity


class AnalysisView(QWidget):
    """Widget for displaying analysis results and findings"""
    
    # Signals
    navigate_to_finding = pyqtSignal(object)  # Finding
    
    def __init__(self, navigation_handler: NavigationHandler):
        super().__init__()
        self.navigation_handler = navigation_handler
        self.current_finding: Optional[Finding] = None
        self.current_result: Optional[AnalysisResult] = None
        
        self.setup_ui()
        
    def setup_ui(self):
        """Set up the analysis view UI"""
        layout = QVBoxLayout(self)
        
        # Summary section
        self.setup_summary_section(layout)
        
        # Finding details section
        self.setup_finding_details_section(layout)
        
    def setup_summary_section(self, parent_layout):
        """Set up the analysis summary section"""
        summary_group = QGroupBox("Analysis Summary")
        summary_layout = QVBoxLayout(summary_group)
        
        # Summary metrics
        self.summary_label = QLabel("No analysis results")
        self.summary_label.setWordWrap(True)
        self.summary_label.setStyleSheet("""
            QLabel {
                font-size: 14px;
                color: #ffffff;
                background-color: #2d2d2d;
                padding: 10px;
                border-radius: 5px;
                border: 1px solid #404040;
            }
        """)
        summary_layout.addWidget(self.summary_label)
        
        parent_layout.addWidget(summary_group)
        
    def setup_finding_details_section(self, parent_layout):
        """Set up the finding details section"""
        details_group = QGroupBox("Finding Details")
        details_layout = QVBoxLayout(details_group)
        
        # Finding title
        self.finding_title = QLabel("Select a finding to view details")
        self.finding_title.setStyleSheet("""
            QLabel {
                font-size: 16px;
                font-weight: bold;
                color: #ffffff;
                padding: 10px;
                background-color: #0078d4;
                border-radius: 5px;
            }
        """)
        self.finding_title.setWordWrap(True)
        details_layout.addWidget(self.finding_title)
        
        # Finding description
        self.finding_description = QLabel("")
        self.finding_description.setWordWrap(True)
        self.finding_description.setStyleSheet("""
            QLabel {
                font-size: 12px;
                color: #e0e0e0;
                padding: 10px;
                background-color: #2d2d2d;
                border-radius: 5px;
                border: 1px solid #404040;
            }
        """)
        details_layout.addWidget(self.finding_description)
        
        # Suggestion
        self.suggestion_label = QLabel("")
        self.suggestion_label.setWordWrap(True)
        self.suggestion_label.setStyleSheet("""
            QLabel {
                font-size: 12px;
                color: #ffffff;
                padding: 10px;
                background-color: #107c10;
                border-radius: 5px;
                border: 1px solid #0e5e0e;
            }
        """)
        details_layout.addWidget(self.suggestion_label)
        
        # Context
        context_group = QGroupBox("Context")
        context_layout = QVBoxLayout(context_group)
        
        self.context_text = QTextEdit()
        self.context_text.setReadOnly(True)
        self.context_text.setMaximumHeight(100)
        self.context_text.setFont(QFont("Consolas", 10))
        self.context_text.setStyleSheet("""
            QTextEdit {
                background-color: #1e1e1e;
                color: #e0e0e0;
                border: 1px solid #404040;
                border-radius: 3px;
                padding: 5px;
            }
        """)
        context_layout.addWidget(self.context_text)
        
        details_layout.addWidget(context_group)
        
        # Navigation button
        self.navigate_btn = QPushButton("Navigate to Location")
        self.navigate_btn.clicked.connect(self.navigate_to_location)
        self.navigate_btn.setEnabled(False)
        self.navigate_btn.setStyleSheet("""
            QPushButton {
                background-color: #0078d4;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #106ebe;
            }
            QPushButton:disabled {
                background-color: #404040;
                color: #808080;
            }
        """)
        details_layout.addWidget(self.navigate_btn)
        
        parent_layout.addWidget(details_group)
        
    def display_results(self, result: AnalysisResult):
        """Display analysis results"""
        self.current_result = result
        
        # Update summary
        if result.summary:
            summary_text = self._format_summary(result.summary)
            self.summary_label.setText(summary_text)
        else:
            self.summary_label.setText("Analysis completed but no summary available")
            
        # Clear current finding
        self.clear_finding()
        
    def display_finding(self, finding: Finding):
        """Display specific finding details"""
        self.current_finding = finding
        
        # Update title with severity color
        severity_color = self._get_severity_color(finding.severity)
        self.finding_title.setText(f"{finding.title}")
        self.finding_title.setStyleSheet(f"""
            QLabel {{
                font-size: 16px;
                font-weight: bold;
                color: #ffffff;
                padding: 10px;
                background-color: {severity_color};
                border-radius: 5px;
            }}
        """)
        
        # Update description
        self.finding_description.setText(finding.description)
        
        # Update suggestion if available
        if finding.suggestion:
            self.suggestion_label.setText(f"💡 {finding.suggestion}")
            self.suggestion_label.setVisible(True)
        else:
            self.suggestion_label.setVisible(False)
            
        # Update context
        self.context_text.setPlainText(finding.context)
        
        # Enable navigation if anchor is available
        has_anchor = finding.anchor is not None
        self.navigate_btn.setEnabled(has_anchor)
        
        logger.info(f"Displaying finding: {finding.title}")
        
    def clear_finding(self):
        """Clear the current finding display"""
        self.current_finding = None
        self.finding_title.setText("Select a finding to view details")
        self.finding_title.setStyleSheet("""
            QLabel {
                font-size: 16px;
                font-weight: bold;
                color: #ffffff;
                padding: 10px;
                background-color: #404040;
                border-radius: 5px;
            }
        """)
        self.finding_description.setText("")
        self.suggestion_label.setVisible(False)
        self.context_text.clear()
        self.navigate_btn.setEnabled(False)
        
    def clear(self):
        """Clear all analysis results"""
        self.current_result = None
        self.clear_finding()
        self.summary_label.setText("No analysis results")
        
    async def navigate_to_location(self):
        """Navigate to the finding location in Word"""
        if self.current_finding and self.current_finding.anchor:
            try:
                success = await self.navigation_handler.navigate_to_anchor(
                    self.current_finding.anchor,
                    {'highlight': True, 'scroll': True, 'select': True}
                )
                
                if success:
                    logger.info("Successfully navigated to finding location")
                else:
                    logger.warning("Failed to navigate to finding location")
                    
            except Exception as e:
                logger.error(f"Navigation error: {e}")
                
    def _format_summary(self, summary: dict) -> str:
        """Format summary data for display"""
        total = summary.get('total_issues', 0)
        critical = summary.get('critical_issues', 0)
        high = summary.get('high_issues', 0)
        medium = summary.get('medium_issues', 0)
        low = summary.get('low_issues', 0)
        score = summary.get('score', 0)
        
        return f"""
        <div style="color: white;">
            <h3>Quality Score: {score}/100</h3>
            <p><strong>Total Issues:</strong> {total}</p>
            <ul>
                <li>🔴 Critical: {critical}</li>
                <li>🟠 High: {high}</li>
                <li>🟡 Medium: {medium}</li>
                <li>🔵 Low: {low}</li>
            </ul>
        </div>
        """
        
    def _get_severity_color(self, severity: Severity) -> str:
        """Get color for severity level"""
        colors = {
            Severity.CRITICAL: "#d83b01",
            Severity.HIGH: "#ff8c00",
            Severity.MEDIUM: "#f7630c",
            Severity.LOW: "#0078d4",
            Severity.INFO: "#5c5c5c"
        }
        return colors.get(severity, "#5c5c5c")