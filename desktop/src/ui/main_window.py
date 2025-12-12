"""
Main Window for PatentFlow Desktop
Primary user interface with dark theme and professional layout
"""

import asyncio
from typing import Optional, Dict, Any
from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
    QSplitter, QTabWidget, QTreeWidget, QTreeWidgetItem,
    QTextEdit, QLabel, QPushButton, QStatusBar, QMenuBar,
    QToolBar, QProgressBar, QGroupBox, QScrollArea
)
from PyQt6.QtCore import Qt, QTimer, pyqtSignal, QThread
from PyQt6.QtGui import QAction, QIcon, QFont, QPixmap
from loguru import logger

from src.core.config import Config
from src.core.word_bridge import ConnectionManager, DocumentExtractor, ConnectionState
from src.core.navigation_handler import NavigationHandler
from src.core.offline_cache import OfflineDraftCache
from src.ui.analysis_view import AnalysisView
from src.ui.claim_graph_view import ClaimGraphView
from src.ui.settings_dialog import SettingsDialog
from src.models.document import DocumentSnapshot, Finding, Severity


class MainWindow(QMainWindow):
    """Main application window for PatentFlow Desktop"""
    
    # Signals
    document_loaded = pyqtSignal(object)  # DocumentSnapshot
    analysis_completed = pyqtSignal(object)  # AnalysisResult
    connection_changed = pyqtSignal(str)  # ConnectionState
    
    def __init__(self, config: Config):
        super().__init__()
        self.config = config
        self.connection_manager = ConnectionManager(config)
        self.document_extractor = DocumentExtractor(self.connection_manager)
        self.navigation_handler = NavigationHandler(self.connection_manager)
        self.draft_cache = OfflineDraftCache(config.data_dir, config.drafts.cache_filename)

        # UI Components
        self.central_widget = None
        self.main_splitter = None
        self.left_panel = None
        self.right_panel = None
        self.tab_widget = None
        self.analysis_view = None
        self.claim_graph_view = None
        self.findings_tree = None
        self.status_bar = None
        self.progress_bar = None
        self.auto_save_timer = None
        
        # Current document state
        self.current_document: Optional[DocumentSnapshot] = None
        self.current_findings: list = []
        
        # Setup UI
        self.setup_ui()
        self.setup_connections()
        self.setup_menu_bar()
        self.setup_tool_bar()
        self.setup_status_bar()
        self.setup_autosave()
        
        # Auto-connect to Word if enabled
        if self.config.word.auto_connect:
            QTimer.singleShot(1000, self.connect_to_word)
            
        logger.info("Main window initialized")
        
    def setup_ui(self):
        """Set up the main user interface"""
        self.setWindowTitle("PatentFlow Enterprise")
        self.setGeometry(100, 100, 1400, 900)
        
        # Create central widget with splitter
        self.central_widget = QWidget()
        self.setCentralWidget(self.central_widget)
        
        # Main layout
        main_layout = QHBoxLayout(self.central_widget)
        main_layout.setContentsMargins(5, 5, 5, 5)
        
        # Create splitter for left/right panels
        self.main_splitter = QSplitter(Qt.Orientation.Horizontal)
        main_layout.addWidget(self.main_splitter)
        
        # Setup left panel (controls and findings)
        self.setup_left_panel()
        
        # Setup right panel (analysis tabs)
        self.setup_right_panel()
        
        # Add panels to splitter
        self.main_splitter.addWidget(self.left_panel)
        self.main_splitter.addWidget(self.right_panel)
        self.main_splitter.setSizes([400, 1000])  # 40% left, 60% right
        
    def setup_left_panel(self):
        """Set up the left control panel"""
        self.left_panel = QWidget()
        left_layout = QVBoxLayout(self.left_panel)
        
        # Connection status group
        connection_group = QGroupBox("Word Connection")
        connection_layout = QVBoxLayout(connection_group)
        
        self.connection_label = QLabel("Disconnected")
        self.connection_label.setStyleSheet("color: #ff6b6b; font-weight: bold;")
        connection_layout.addWidget(self.connection_label)
        
        # Connection buttons
        button_layout = QHBoxLayout()
        self.connect_btn = QPushButton("Connect to Word")
        self.connect_btn.clicked.connect(self.connect_to_word)
        self.analyze_btn = QPushButton("Analyze Document")
        self.analyze_btn.clicked.connect(self.analyze_document)
        self.analyze_btn.setEnabled(False)
        
        button_layout.addWidget(self.connect_btn)
        button_layout.addWidget(self.analyze_btn)
        connection_layout.addLayout(button_layout)
        
        left_layout.addWidget(connection_group)
        
        # Findings tree
        findings_group = QGroupBox("Analysis Findings")
        findings_layout = QVBoxLayout(findings_group)
        
        self.findings_tree = QTreeWidget()
        self.findings_tree.setHeaderLabels(["Severity", "Type", "Description"])
        self.findings_tree.setColumnWidth(0, 80)
        self.findings_tree.setColumnWidth(1, 150)
        self.findings_tree.itemClicked.connect(self.on_finding_selected)
        
        findings_layout.addWidget(self.findings_tree)
        left_layout.addWidget(findings_group)
        
        # Add stretch to push everything to top
        left_layout.addStretch()
        
    def setup_right_panel(self):
        """Set up the right analysis panel"""
        self.right_panel = QWidget()
        right_layout = QVBoxLayout(self.right_panel)
        
        # Create tab widget for different views
        self.tab_widget = QTabWidget()
        
        # Analysis view
        self.analysis_view = AnalysisView(self.navigation_handler)
        self.tab_widget.addTab(self.analysis_view, "Analysis")
        
        # Claim graph view
        self.claim_graph_view = ClaimGraphView()
        self.tab_widget.addTab(self.claim_graph_view, "Claim Graph")
        
        # Document content view
        self.document_view = QTextEdit()
        self.document_view.setReadOnly(True)
        self.document_view.setFont(QFont("Consolas", 10))
        self.tab_widget.addTab(self.document_view, "Document")
        
        right_layout.addWidget(self.tab_widget)
        
    def setup_connections(self):
        """Set up signal connections"""
        self.document_loaded.connect(self.on_document_loaded)
        self.analysis_completed.connect(self.on_analysis_completed)
        self.connection_changed.connect(self.on_connection_changed)

    def setup_autosave(self):
        """Configure periodic draft autosave."""
        if not self.config.drafts.enabled:
            return

        self.auto_save_timer = QTimer(self)
        interval_ms = max(1, self.config.ui.auto_save_interval_minutes) * 60 * 1000
        self.auto_save_timer.setInterval(interval_ms)
        self.auto_save_timer.timeout.connect(self.save_current_draft)
        self.auto_save_timer.start()
        
    def setup_menu_bar(self):
        """Set up the menu bar"""
        menubar = self.menuBar()
        
        # File menu
        file_menu = menubar.addMenu("File")
        
        open_action = QAction("Open Document", self)
        open_action.setShortcut("Ctrl+O")
        open_action.triggered.connect(self.open_document)
        file_menu.addAction(open_action)
        
        save_action = QAction("Save Analysis", self)
        save_action.setShortcut("Ctrl+S")
        save_action.triggered.connect(self.save_analysis)
        file_menu.addAction(save_action)
        
        file_menu.addSeparator()
        
        exit_action = QAction("Exit", self)
        exit_action.setShortcut("Ctrl+Q")
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        
        # Edit menu
        edit_menu = menubar.addMenu("Edit")
        
        settings_action = QAction("Settings", self)
        settings_action.setShortcut("Ctrl+,")
        settings_action.triggered.connect(self.show_settings)
        edit_menu.addAction(settings_action)
        
        # Analysis menu
        analysis_menu = menubar.addMenu("Analysis")
        
        claims_action = QAction("Analyze Claims", self)
        claims_action.triggered.connect(lambda: self.run_analysis("claims"))
        analysis_menu.addAction(claims_action)
        
        terminology_action = QAction("Check Terminology", self)
        terminology_action.triggered.connect(lambda: self.run_analysis("terminology"))
        analysis_menu.addAction(terminology_action)
        
        full_action = QAction("Full Analysis", self)
        full_action.triggered.connect(lambda: self.run_analysis("full"))
        analysis_menu.addAction(full_action)
        
        # Help menu
        help_menu = menubar.addMenu("Help")
        
        about_action = QAction("About PatentFlow", self)
        about_action.triggered.connect(self.show_about)
        help_menu.addAction(about_action)
        
    def setup_tool_bar(self):
        """Set up the tool bar"""
        toolbar = QToolBar("Main Toolbar")
        self.addToolBar(toolbar)
        
        # Connect action
        connect_action = QAction("Connect", self)
        connect_action.triggered.connect(self.connect_to_word)
        toolbar.addAction(connect_action)
        
        toolbar.addSeparator()
        
        # Analysis actions
        analyze_action = QAction("Analyze", self)
        analyze_action.triggered.connect(self.analyze_document)
        toolbar.addAction(analyze_action)
        
        toolbar.addSeparator()
        
        # Navigation actions
        nav_action = QAction("Navigate to Finding", self)
        nav_action.triggered.connect(self.navigate_to_selected_finding)
        toolbar.addAction(nav_action)
        
    def setup_status_bar(self):
        """Set up the status bar"""
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
        
        # Connection status
        self.connection_status_label = QLabel("Disconnected")
        self.status_bar.addWidget(self.connection_status_label)
        
        # Progress bar
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        self.status_bar.addPermanentWidget(self.progress_bar)
        
        # Document info
        self.document_info_label = QLabel("No document")
        self.status_bar.addPermanentWidget(self.document_info_label)
        
    async def connect_to_word(self):
        """Connect to Word application"""
        try:
            self.show_progress("Connecting to Word...")
            
            result = await self.connection_manager.connect_to_word()
            
            if result.success:
                self.on_connection_changed(ConnectionState.CONNECTED.value)
                if result.active_doc:
                    await self.load_document()
            else:
                self.on_connection_changed(ConnectionState.CONNECTED.value)
                self.show_message(result.message, "warning")
                
        except Exception as e:
            logger.error(f"Connection failed: {e}")
            self.show_message(f"Failed to connect to Word: {e}", "error")
            self.on_connection_changed(ConnectionState.ERROR.value)
            
        finally:
            self.hide_progress()
            
    async def load_document(self):
        """Load document from Word"""
        try:
            self.show_progress("Extracting document...")
            
            snapshot = await self.document_extractor.extract_document_snapshot()
            
            # Extract structured data
            structured_data = await self.document_extractor.extract_structured_data(snapshot)
            snapshot.structured_data = structured_data
            
            self.current_document = snapshot
            self.document_loaded.emit(snapshot)
            
            # Update UI
            self.document_view.setPlainText(snapshot.content)
            self.update_document_info()
            self.analyze_btn.setEnabled(True)
            
            self.show_message("Document loaded successfully", "info")
            
        except Exception as e:
            logger.error(f"Document loading failed: {e}")
            self.show_message(f"Failed to load document: {e}", "error")
            
        finally:
            self.hide_progress()
            
    def analyze_document(self):
        """Analyze the current document"""
        if not self.current_document:
            self.show_message("No document loaded", "warning")
            return
            
        # Run full analysis
        self.run_analysis("full")
        
    def run_analysis(self, analysis_type: str):
        """Run specific analysis type"""
        if not self.current_document:
            self.show_message("No document loaded", "warning")
            return
            
        try:
            self.show_progress(f"Running {analysis_type} analysis...")
            
            # Create analysis thread
            self.analysis_thread = AnalysisThread(self.current_document, analysis_type)
            self.analysis_thread.completed.connect(self.on_analysis_completed)
            self.analysis_thread.start()
            
        except Exception as e:
            logger.error(f"Analysis failed: {e}")
            self.show_message(f"Analysis failed: {e}", "error")
            self.hide_progress()
            
    def on_document_loaded(self, snapshot: DocumentSnapshot):
        """Handle document loaded event"""
        logger.info(f"Document loaded: {len(snapshot.content)} characters")
        self.current_document = snapshot
        self.document_view.setPlainText(snapshot.content)
        self.analyze_btn.setEnabled(True)
        self.update_document_info()

        cached = self.draft_cache.load_draft(snapshot.checksum)
        if cached:
            self.document_view.setPlainText(cached.content)
            self.show_message("Loaded offline draft content for this document", "info")
        
    def on_analysis_completed(self, analysis_result):
        """Handle analysis completed event"""
        self.hide_progress()
        
        if analysis_result and analysis_result.findings:
            self.current_findings = analysis_result.findings
            self.populate_findings_tree(analysis_result.findings)
            self.analysis_view.display_results(analysis_result)
            
            if analysis_result.claim_graph:
                self.claim_graph_view.display_graph(analysis_result.claim_graph)
                
            self.show_message(f"Analysis complete: {len(analysis_result.findings)} findings", "info")
        else:
            self.show_message("Analysis completed with no findings", "info")
            
    def on_connection_changed(self, state: str):
        """Handle connection state change"""
        self.connection_status_label.setText(state.capitalize())
        
        if state == ConnectionState.CONNECTED.value:
            self.connection_label.setText("Connected")
            self.connection_label.setStyleSheet("color: #51cf66; font-weight: bold;")
            self.connect_btn.setText("Disconnect")
            self.connect_btn.clicked.disconnect()
            self.connect_btn.clicked.connect(self.disconnect_from_word)
        else:
            self.connection_label.setText("Disconnected")
            self.connection_label.setStyleSheet("color: #ff6b6b; font-weight: bold;")
            self.connect_btn.setText("Connect to Word")
            self.connect_btn.clicked.disconnect()
            self.connect_btn.clicked.connect(self.connect_to_word)
            self.analyze_btn.setEnabled(False)
            
    def populate_findings_tree(self, findings: list):
        """Populate the findings tree widget"""
        self.findings_tree.clear()
        
        # Group findings by severity
        severity_groups = {}
        for finding in findings:
            severity = finding.severity.value
            if severity not in severity_groups:
                severity_groups[severity] = []
            severity_groups[severity].append(finding)
            
        # Add items to tree
        for severity in [s.value for s in [Severity.CRITICAL, Severity.HIGH, Severity.MEDIUM, Severity.LOW, Severity.INFO]]:
            if severity in severity_groups:
                severity_item = QTreeWidgetItem(self.findings_tree)
                severity_item.setText(0, severity)
                severity_item.setExpanded(True)
                
                for finding in severity_groups[severity]:
                    finding_item = QTreeWidgetItem(severity_item)
                    finding_item.setText(0, "")  # No severity for child
                    finding_item.setText(1, finding.type.value)
                    finding_item.setText(2, finding.title)
                    finding_item.setData(0, Qt.ItemDataRole.UserRole, finding)
                    
    def on_finding_selected(self, item: QTreeWidgetItem, column: int):
        """Handle finding selection in tree"""
        finding = item.data(0, Qt.ItemDataRole.UserRole)
        if finding:
            self.analysis_view.display_finding(finding)
            
    async def navigate_to_selected_finding(self):
        """Navigate to the selected finding in Word"""
        current_item = self.findings_tree.currentItem()
        if current_item:
            finding = current_item.data(0, Qt.ItemDataRole.UserRole)
            if finding and finding.anchor:
                try:
                    await self.navigation_handler.navigate_to_anchor(finding.anchor)
                except Exception as e:
                    self.show_message(f"Navigation failed: {e}", "error")
                    
    def update_document_info(self):
        """Update document information in status bar"""
        if self.current_document:
            char_count = len(self.current_document.content)
            para_count = len(self.current_document.paragraph_map)
            self.document_info_label.setText(f"Chars: {char_count}, Paras: {para_count}")
        else:
            self.document_info_label.setText("No document")
            
    def show_progress(self, message: str):
        """Show progress bar with message"""
        self.progress_bar.setVisible(True)
        self.progress_bar.setRange(0, 0)  # Indeterminate progress
        self.status_bar.showMessage(message)
        
    def hide_progress(self):
        """Hide progress bar"""
        self.progress_bar.setVisible(False)
        self.status_bar.clearMessage()
        
    def show_message(self, message: str, type: str = "info"):
        """Show message to user (in status bar for now)"""
        self.status_bar.showMessage(message, 5000)
        logger.info(f"Message ({type}): {message}")

    def save_current_draft(self):
        """Persist current document state for offline recovery."""
        if not self.config.drafts.enabled or not self.current_document:
            return

        content = self.document_view.toPlainText()
        if not content.strip():
            return

        self.draft_cache.save_draft(
            document_id=self.current_document.checksum,
            content=content,
            metadata={"analysis_ready": bool(self.current_findings)},
        )
        
    def show_settings(self):
        """Show settings dialog"""
        dialog = SettingsDialog(self.config, self)
        if dialog.exec() == 1:  # Accepted
            self.config.save_settings()
            
    def show_about(self):
        """Show about dialog"""
        from PyQt6.QtWidgets import QMessageBox
        QMessageBox.about(
            self,
            "About PatentFlow Enterprise",
            "PatentFlow Enterprise v1.0.0\n\n"
            "Premium patent drafting and analysis platform\n"
            "with Word integration and AI-powered analysis.\n\n"
            "© 2024 PatentFlow. All rights reserved."
        )
        
    async def disconnect_from_word(self):
        """Disconnect from Word"""
        try:
            await self.connection_manager.disconnect()
            self.current_document = None
            self.current_findings = []
            self.findings_tree.clear()
            self.document_view.clear()
            self.analysis_view.clear()
            self.claim_graph_view.clear()
            self.update_document_info()
            self.on_connection_changed(ConnectionState.DISCONNECTED.value)
            
        except Exception as e:
            logger.error(f"Disconnect failed: {e}")
            self.show_message(f"Disconnect failed: {e}", "error")
            
    def open_document(self):
        """Open document dialog"""
        # For now, just connect to Word and load active document
        self.connect_to_word()
        
    def save_analysis(self):
        """Save analysis results"""
        if not self.current_findings:
            self.show_message("No analysis to save", "warning")
            return
            
        # TODO: Implement save functionality
        self.show_message("Save functionality not yet implemented", "info")
        
    def closeEvent(self, event):
        """Handle application close"""
        try:
            # Disconnect from Word
            if self.connection_manager.is_connected():
                asyncio.create_task(self.disconnect_from_word())
                
            # Save settings
            self.config.save_settings()
            
            event.accept()
            
        except Exception as e:
            logger.error(f"Error during shutdown: {e}")
            event.accept()


class AnalysisThread(QThread):
    """Worker thread for document analysis"""
    
    completed = pyqtSignal(object)
    
    def __init__(self, document, analysis_type):
        super().__init__()
        self.document = document
        self.analysis_type = analysis_type
        
    def run(self):
        """Run analysis in background thread"""
        try:
            # Mock analysis for now
            import random
            from src.models.document import Finding, FindingType, Severity, TextAnchor
            from datetime import datetime
            
            # Generate mock findings
            findings = []
            
            if self.analysis_type in ["claims", "full"]:
                findings.append(Finding(
                    id="1",
                    type=FindingType.ANTECEDENT_BASIS,
                    severity=Severity.HIGH,
                    title="Missing Antecedent Basis",
                    description="Term 'the rotary shaft' lacks proper antecedent basis",
                    suggestion="Add 'a rotary shaft' in claim 1",
                    context="3. The system of claim 1, wherein the rotary shaft...",
                    anchor=TextAnchor(
                        paragraph_index=10,
                        start_offset=25,
                        end_offset=40,
                        text="the rotary shaft"
                    )
                ))
                
            if self.analysis_type in ["terminology", "full"]:
                findings.append(Finding(
                    id="2",
                    type=FindingType.TERMINOLOGY_INCONSISTENCY,
                    severity=Severity.MEDIUM,
                    title="Inconsistent Terminology",
                    description="Term 'rotary shaft' appears with different capitalization",
                    suggestion="Standardize to 'rotary shaft' throughout",
                    context="Found 'rotary shaft' and 'Rotary Shaft'",
                    anchor=TextAnchor(
                        paragraph_index=5,
                        start_offset=10,
                        end_offset=25,
                        text="Rotary Shaft"
                    )
                ))
                
            # Create mock analysis result
            from src.models.document import AnalysisResult, AnalysisType, ClaimGraph, ClaimNode, ClaimEdge
            
            result = AnalysisResult(
                analysis_id="mock_analysis",
                document_id="mock_doc",
                analysis_type=AnalysisType.FULL_ANALYSIS,
                findings=findings,
                summary={
                    'total_issues': len(findings),
                    'critical_issues': 0,
                    'high_issues': 1,
                    'medium_issues': 1,
                    'low_issues': 0,
                    'score': 85
                }
            )
            
            self.completed.emit(result)
            
        except Exception as e:
            logger.error(f"Analysis thread error: {e}")
            self.completed.emit(None)