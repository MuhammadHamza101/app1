"""
Settings Dialog for PatentFlow Desktop
Configuration interface for application settings
"""

from typing import Dict, Any
from PyQt6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QTabWidget,
    QWidget, QLabel, QLineEdit, QSpinBox, QCheckBox,
    QPushButton, QGroupBox, QFormLayout, QTextEdit,
    QFileDialog, QMessageBox, QComboBox, QSlider
)
from PyQt6.QtCore import Qt
from loguru import logger

from src.core.config import Config


class SettingsDialog(QDialog):
    """Settings configuration dialog"""
    
    def __init__(self, config: Config, parent=None):
        super().__init__(parent)
        self.config = config
        self.setWindowTitle("PatentFlow Settings")
        self.setModal(True)
        self.resize(600, 500)
        
        self.setup_ui()
        self.load_settings()
        
    def setup_ui(self):
        """Set up the settings dialog UI"""
        layout = QVBoxLayout(self)
        
        # Create tab widget
        self.tab_widget = QTabWidget()
        layout.addWidget(self.tab_widget)
        
        # Create setting tabs
        self.setup_word_tab()
        self.setup_analysis_tab()
        self.setup_ui_tab()
        self.setup_network_tab()
        self.setup_security_tab()
        
        # Dialog buttons
        button_layout = QHBoxLayout()
        
        self.import_btn = QPushButton("Import")
        self.import_btn.clicked.connect(self.import_settings)
        button_layout.addWidget(self.import_btn)
        
        self.export_btn = QPushButton("Export")
        self.export_btn.clicked.connect(self.export_settings)
        button_layout.addWidget(self.export_btn)
        
        button_layout.addStretch()
        
        self.reset_btn = QPushButton("Reset to Defaults")
        self.reset_btn.clicked.connect(self.reset_to_defaults)
        button_layout.addWidget(self.reset_btn)
        
        self.cancel_btn = QPushButton("Cancel")
        self.cancel_btn.clicked.connect(self.reject)
        button_layout.addWidget(self.cancel_btn)
        
        self.save_btn = QPushButton("Save")
        self.save_btn.clicked.connect(self.save_settings)
        self.save_btn.setDefault(True)
        button_layout.addWidget(self.save_btn)
        
        layout.addLayout(button_layout)
        
    def setup_word_tab(self):
        """Set up Word integration settings tab"""
        word_widget = QWidget()
        word_layout = QFormLayout(word_widget)
        
        # Auto connect
        self.auto_connect_cb = QCheckBox("Automatically connect to Word on startup")
        word_layout.addRow("Connection:", self.auto_connect_cb)
        
        # Retry attempts
        self.retry_attempts_sb = QSpinBox()
        self.retry_attempts_sb.setRange(1, 10)
        self.retry_attempts_sb.setSuffix(" attempts")
        word_layout.addRow("Retry Attempts:", self.retry_attempts_sb)
        
        # Retry delay
        self.retry_delay_sb = QSpinBox()
        self.retry_delay_sb.setRange(100, 10000)
        self.retry_delay_sb.setSuffix(" ms")
        self.retry_delay_sb.setSingleStep(100)
        word_layout.addRow("Retry Delay:", self.retry_delay_sb)
        
        # Connection timeout
        self.timeout_sb = QSpinBox()
        self.timeout_sb.setRange(1000, 30000)
        self.timeout_sb.setSuffix(" ms")
        self.timeout_sb.setSingleStep(1000)
        word_layout.addRow("Connection Timeout:", self.timeout_sb)
        
        self.tab_widget.addTab(word_widget, "Word Integration")
        
    def setup_analysis_tab(self):
        """Set up analysis settings tab"""
        analysis_widget = QWidget()
        analysis_layout = QFormLayout(analysis_widget)
        
        # NLP Model
        self.nlp_model_cb = QComboBox()
        self.nlp_model_cb.addItems(["en_core_web_sm", "en_core_web_md", "en_core_web_lg"])
        analysis_layout.addRow("NLP Model:", self.nlp_model_cb)
        
        # Confidence threshold
        self.confidence_slider = QSlider(Qt.Orientation.Horizontal)
        self.confidence_slider.setRange(0, 100)
        self.confidence_slider.setValue(80)
        self.confidence_slider.setTickPosition(QSlider.TickPosition.TicksBelow)
        self.confidence_slider.setTickInterval(10)
        analysis_layout.addRow("Confidence Threshold:", self.confidence_slider)
        
        self.confidence_label = QLabel("80%")
        analysis_layout.addRow("", self.confidence_label)
        
        # Connect slider to label
        self.confidence_slider.valueChanged.connect(
            lambda v: self.confidence_label.setText(f"{v}%")
        )
        
        # Enable disambiguation
        self.disambiguation_cb = QCheckBox("Enable POS-based disambiguation")
        self.disambiguation_cb.setChecked(True)
        analysis_layout.addRow("NLP Options:", self.disambiguation_cb)
        
        # Enable cache
        self.cache_cb = QCheckBox("Enable analysis caching")
        self.cache_cb.setChecked(True)
        analysis_layout.addRow("Performance:", self.cache_cb)
        
        # Cache size
        self.cache_size_sb = QSpinBox()
        self.cache_size_sb.setRange(64, 2048)
        self.cache_size_sb.setSuffix(" MB")
        analysis_layout.addRow("", self.cache_size_sb)
        
        # Max processing time
        self.max_time_sb = QSpinBox()
        self.max_time_sb.setRange(30, 600)
        self.max_time_sb.setSuffix(" seconds")
        analysis_layout.addRow("Processing Limit:", self.max_time_sb)
        
        self.tab_widget.addTab(analysis_widget, "Analysis")
        
    def setup_ui_tab(self):
        """Set up user interface settings tab"""
        ui_widget = QWidget()
        ui_layout = QFormLayout(ui_widget)
        
        # Theme
        self.theme_cb = QComboBox()
        self.theme_cb.addItems(["dark", "light", "auto"])
        ui_layout.addRow("Theme:", self.theme_cb)
        
        # Font family
        self.font_family_le = QLineEdit()
        ui_layout.addRow("Font Family:", self.font_family_le)
        
        # Font size
        self.font_size_sb = QSpinBox()
        self.font_size_sb.setRange(8, 24)
        self.font_size_sb.setSuffix(" pt")
        ui_layout.addRow("Font Size:", self.font_size_sb)
        
        # Remember window state
        self.remember_state_cb = QCheckBox("Remember window position and size")
        self.remember_state_cb.setChecked(True)
        ui_layout.addRow("Window:", self.remember_state_cb)
        
        # Auto-save interval
        self.autosave_sb = QSpinBox()
        self.autosave_sb.setRange(1, 60)
        self.autosave_sb.setSuffix(" minutes")
        ui_layout.addRow("Auto-save:", self.autosave_sb)
        
        self.tab_widget.addTab(ui_widget, "Interface")
        
    def setup_network_tab(self):
        """Set up network settings tab"""
        network_widget = QWidget()
        network_layout = QFormLayout(network_widget)
        
        # API base URL
        self.api_url_le = QLineEdit()
        network_layout.addRow("API Base URL:", self.api_url_le)
        
        # Timeout
        self.network_timeout_sb = QSpinBox()
        self.network_timeout_sb.setRange(5, 300)
        self.network_timeout_sb.setSuffix(" seconds")
        network_layout.addRow("Timeout:", self.network_timeout_sb)
        
        # Retry attempts
        self.network_retry_sb = QSpinBox()
        self.network_retry_sb.setRange(1, 5)
        self.network_retry_sb.setSuffix(" attempts")
        network_layout.addRow("Retry Attempts:", self.network_retry_sb)
        
        # Offline mode
        self.offline_cb = QCheckBox("Enable offline mode")
        self.offline_cb.setChecked(True)
        network_layout.addRow("Offline Mode:", self.offline_cb)
        
        self.tab_widget.addTab(network_widget, "Network")
        
    def setup_security_tab(self):
        """Set up security settings tab"""
        security_widget = QWidget()
        security_layout = QFormLayout(security_widget)
        
        # Encrypt local data
        self.encrypt_cb = QCheckBox("Encrypt local data files")
        self.encrypt_cb.setChecked(True)
        security_layout.addRow("Data Protection:", self.encrypt_cb)
        
        # Session timeout
        self.session_timeout_sb = QSpinBox()
        self.session_timeout_sb.setRange(15, 480)
        self.session_timeout_sb.setSuffix(" minutes")
        security_layout.addRow("Session Timeout:", self.session_timeout_sb)
        
        # Audit logging
        self.audit_cb = QCheckBox("Enable audit logging")
        self.audit_cb.setChecked(True)
        security_layout.addRow("Logging:", self.audit_cb)
        
        # Data retention
        self.retention_sb = QSpinBox()
        self.retention_sb.setRange(30, 3650)
        self.retention_sb.setSuffix(" days")
        security_layout.addRow("Data Retention:", self.retention_sb)
        
        self.tab_widget.addTab(security_widget, "Security")
        
    def load_settings(self):
        """Load current settings into UI"""
        # Word settings
        self.auto_connect_cb.setChecked(self.config.word.auto_connect)
        self.retry_attempts_sb.setValue(self.config.word.retry_attempts)
        self.retry_delay_sb.setValue(self.config.word.retry_delay_ms)
        self.timeout_sb.setValue(self.config.word.connection_timeout_ms)
        
        # Analysis settings
        self.nlp_model_cb.setCurrentText(self.config.analysis.nlp_model)
        self.confidence_slider.setValue(int(self.config.analysis.confidence_threshold * 100))
        self.disambiguation_cb.setChecked(self.config.analysis.enable_disambiguation)
        self.cache_cb.setChecked(self.config.analysis.cache_enabled)
        self.cache_size_sb.setValue(self.config.analysis.cache_size_mb)
        self.max_time_sb.setValue(self.config.analysis.max_processing_time_seconds)
        
        # UI settings
        self.theme_cb.setCurrentText(self.config.ui.theme)
        self.font_family_le.setText(self.config.ui.font_family)
        self.font_size_sb.setValue(self.config.ui.font_size)
        self.remember_state_cb.setChecked(self.config.ui.window_remember_state)
        self.autosave_sb.setValue(self.config.ui.auto_save_interval_minutes)
        
        # Network settings
        self.api_url_le.setText(self.config.network.api_base_url)
        self.network_timeout_sb.setValue(self.config.network.timeout_seconds)
        self.network_retry_sb.setValue(self.config.network.retry_attempts)
        self.offline_cb.setChecked(self.config.network.enable_offline_mode)
        
        # Security settings
        self.encrypt_cb.setChecked(self.config.security.encrypt_local_data)
        self.session_timeout_sb.setValue(self.config.security.session_timeout_minutes)
        self.audit_cb.setChecked(self.config.security.audit_logging)
        self.retention_sb.setValue(self.config.security.data_retention_days)
        
    def save_settings(self):
        """Save settings from UI to config"""
        try:
            # Word settings
            self.config.word.auto_connect = self.auto_connect_cb.isChecked()
            self.config.word.retry_attempts = self.retry_attempts_sb.value()
            self.config.word.retry_delay_ms = self.retry_delay_sb.value()
            self.config.word.connection_timeout_ms = self.timeout_sb.value()
            
            # Analysis settings
            self.config.analysis.nlp_model = self.nlp_model_cb.currentText()
            self.config.analysis.confidence_threshold = self.confidence_slider.value() / 100.0
            self.config.analysis.enable_disambiguation = self.disambiguation_cb.isChecked()
            self.config.analysis.cache_enabled = self.cache_cb.isChecked()
            self.config.analysis.cache_size_mb = self.cache_size_sb.value()
            self.config.analysis.max_processing_time_seconds = self.max_time_sb.value()
            
            # UI settings
            self.config.ui.theme = self.theme_cb.currentText()
            self.config.ui.font_family = self.font_family_le.text()
            self.config.ui.font_size = self.font_size_sb.value()
            self.config.ui.window_remember_state = self.remember_state_cb.isChecked()
            self.config.ui.auto_save_interval_minutes = self.autosave_sb.value()
            
            # Network settings
            self.config.network.api_base_url = self.api_url_le.text()
            self.config.network.timeout_seconds = self.network_timeout_sb.value()
            self.config.network.retry_attempts = self.network_retry_sb.value()
            self.config.network.enable_offline_mode = self.offline_cb.isChecked()
            
            # Security settings
            self.config.security.encrypt_local_data = self.encrypt_cb.isChecked()
            self.config.security.session_timeout_minutes = self.session_timeout_sb.value()
            self.config.security.audit_logging = self.audit_cb.isChecked()
            self.config.security.data_retention_days = self.retention_sb.value()
            
            # Save to persistent storage
            self.config.save_settings()
            
            logger.info("Settings saved successfully")
            self.accept()
            
        except Exception as e:
            logger.error(f"Failed to save settings: {e}")
            QMessageBox.critical(self, "Error", f"Failed to save settings: {e}")
            
    def import_settings(self):
        """Import settings from file"""
        file_path, _ = QFileDialog.getOpenFileName(
            self,
            "Import Settings",
            "",
            "YAML Files (*.yaml);;All Files (*)"
        )
        
        if file_path:
            try:
                from pathlib import Path
                self.config.import_config(Path(file_path))
                self.load_settings()
                logger.info(f"Settings imported from {file_path}")
                QMessageBox.information(self, "Success", "Settings imported successfully")
                
            except Exception as e:
                logger.error(f"Failed to import settings: {e}")
                QMessageBox.critical(self, "Error", f"Failed to import settings: {e}")
                
    def export_settings(self):
        """Export settings to file"""
        file_path, _ = QFileDialog.getSaveFileName(
            self,
            "Export Settings",
            "patentflow_settings.yaml",
            "YAML Files (*.yaml);;All Files (*)"
        )
        
        if file_path:
            try:
                from pathlib import Path
                self.config.export_config(Path(file_path))
                logger.info(f"Settings exported to {file_path}")
                QMessageBox.information(self, "Success", "Settings exported successfully")
                
            except Exception as e:
                logger.error(f"Failed to export settings: {e}")
                QMessageBox.critical(self, "Error", f"Failed to export settings: {e}")
                
    def reset_to_defaults(self):
        """Reset all settings to default values"""
        reply = QMessageBox.question(
            self,
            "Reset Settings",
            "Are you sure you want to reset all settings to their default values?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No
        )
        
        if reply == QMessageBox.StandardButton.Yes:
            try:
                # Reset config to defaults
                from src.core.config import (
                    DatabaseConfig, WordConfig, AnalysisConfig,
                    UIConfig, NetworkConfig, SecurityConfig
                )
                
                self.config.database = DatabaseConfig()
                self.config.word = WordConfig()
                self.config.analysis = AnalysisConfig()
                self.config.ui = UIConfig()
                self.config.network = NetworkConfig()
                self.config.security = SecurityConfig()
                
                # Reload UI
                self.load_settings()
                
                logger.info("Settings reset to defaults")
                QMessageBox.information(self, "Success", "Settings reset to defaults")
                
            except Exception as e:
                logger.error(f"Failed to reset settings: {e}")
                QMessageBox.critical(self, "Error", f"Failed to reset settings: {e}")