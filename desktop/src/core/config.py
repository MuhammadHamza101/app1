"""
Configuration management for PatentFlow Desktop
Handles application settings, user preferences, and environment configuration
"""

import os
from pathlib import Path
from typing import Dict, Any, Optional
from dataclasses import dataclass, field
from PyQt6.QtCore import QSettings
import yaml


@dataclass
class DatabaseConfig:
    """Database configuration settings"""
    path: str = "patentflow.db"
    backup_enabled: bool = True
    backup_interval_hours: int = 24
    max_backups: int = 7


@dataclass
class WordConfig:
    """Word integration configuration"""
    auto_connect: bool = True
    retry_attempts: int = 3
    retry_delay_ms: int = 1000
    connection_timeout_ms: int = 5000
    busy_backoff_max_ms: int = 10000


@dataclass
class AnalysisConfig:
    """Analysis engine configuration"""
    nlp_model: str = "en_core_web_sm"
    confidence_threshold: float = 0.8
    enable_disambiguation: bool = True
    max_processing_time_seconds: int = 120
    cache_enabled: bool = True
    cache_size_mb: int = 512


@dataclass
class UIConfig:
    """User interface configuration"""
    theme: str = "dark"
    font_size: int = 11
    font_family: str = "SF Pro Display, Arial, sans-serif"
    window_remember_state: bool = True
    auto_save_interval_minutes: int = 5


@dataclass
class NetworkConfig:
    """Network and API configuration"""
    api_base_url: str = "http://localhost:3000/api"
    timeout_seconds: int = 30
    retry_attempts: int = 3
    enable_offline_mode: bool = True


@dataclass
class SecurityConfig:
    """Security and privacy configuration"""
    encrypt_local_data: bool = True
    session_timeout_minutes: int = 60
    audit_logging: bool = True
    data_retention_days: int = 365


class Config:
    """Main configuration manager"""
    
    def __init__(self):
        self.settings = QSettings("PatentFlow", "PatentFlow Enterprise")
        self.config_dir = self._get_config_dir()
        self.data_dir = self._get_data_dir()
        
        # Initialize configuration sections
        self.database = DatabaseConfig()
        self.word = WordConfig()
        self.analysis = AnalysisConfig()
        self.ui = UIConfig()
        self.network = NetworkConfig()
        self.security = SecurityConfig()
        
        # Load configuration from settings
        self._load_settings()
        
    def _get_config_dir(self) -> Path:
        """Get application configuration directory"""
        if os.name == 'nt':  # Windows
            base_dir = Path(os.environ.get('APPDATA', Path.home() / 'AppData' / 'Roaming'))
        else:  # macOS/Linux
            base_dir = Path.home() / '.config'
        
        config_dir = base_dir / 'patentflow'
        config_dir.mkdir(parents=True, exist_ok=True)
        return config_dir
        
    def _get_data_dir(self) -> Path:
        """Get application data directory"""
        if os.name == 'nt':  # Windows
            base_dir = Path(os.environ.get('LOCALAPPDATA', Path.home() / 'AppData' / 'Local'))
        elif sys.platform == 'darwin':  # macOS
            base_dir = Path.home() / 'Library' / 'Application Support'
        else:  # Linux
            base_dir = Path.home() / '.local' / 'share'
            
        data_dir = base_dir / 'patentflow'
        data_dir.mkdir(parents=True, exist_ok=True)
        return data_dir
        
    def _load_settings(self):
        """Load configuration from QSettings"""
        # Database settings
        self.database.path = self.settings.value("database/path", self.database.path)
        self.database.backup_enabled = self.settings.value("database/backup_enabled", self.database.backup_enabled, type=bool)
        self.database.backup_interval_hours = self.settings.value("database/backup_interval_hours", self.database.backup_interval_hours, type=int)
        
        # Word settings
        self.word.auto_connect = self.settings.value("word/auto_connect", self.word.auto_connect, type=bool)
        self.word.retry_attempts = self.settings.value("word/retry_attempts", self.word.retry_attempts, type=int)
        self.word.retry_delay_ms = self.settings.value("word/retry_delay_ms", self.word.retry_delay_ms, type=int)
        
        # Analysis settings
        self.analysis.nlp_model = self.settings.value("analysis/nlp_model", self.analysis.nlp_model)
        self.analysis.confidence_threshold = self.settings.value("analysis/confidence_threshold", self.analysis.confidence_threshold, type=float)
        self.analysis.enable_disambiguation = self.settings.value("analysis/enable_disambiguation", self.analysis.enable_disambiguation, type=bool)
        
        # UI settings
        self.ui.theme = self.settings.value("ui/theme", self.ui.theme)
        self.ui.font_size = self.settings.value("ui/font_size", self.ui.font_size, type=int)
        self.ui.font_family = self.settings.value("ui/font_family", self.ui.font_family)
        
        # Network settings
        self.network.api_base_url = self.settings.value("network/api_base_url", self.network.api_base_url)
        self.network.timeout_seconds = self.settings.value("network/timeout_seconds", self.network.timeout_seconds, type=int)
        
        # Security settings
        self.security.encrypt_local_data = self.settings.value("security/encrypt_local_data", self.security.encrypt_local_data, type=bool)
        self.security.audit_logging = self.settings.value("security/audit_logging", self.security.audit_logging, type=bool)
        
    def save_settings(self):
        """Save configuration to QSettings"""
        # Database settings
        self.settings.setValue("database/path", self.database.path)
        self.settings.setValue("database/backup_enabled", self.database.backup_enabled)
        self.settings.setValue("database/backup_interval_hours", self.database.backup_interval_hours)
        
        # Word settings
        self.settings.setValue("word/auto_connect", self.word.auto_connect)
        self.settings.setValue("word/retry_attempts", self.word.retry_attempts)
        self.settings.setValue("word/retry_delay_ms", self.word.retry_delay_ms)
        
        # Analysis settings
        self.settings.setValue("analysis/nlp_model", self.analysis.nlp_model)
        self.settings.setValue("analysis/confidence_threshold", self.analysis.confidence_threshold)
        self.settings.setValue("analysis/enable_disambiguation", self.analysis.enable_disambiguation)
        
        # UI settings
        self.settings.setValue("ui/theme", self.ui.theme)
        self.settings.setValue("ui/font_size", self.ui.font_size)
        self.settings.setValue("ui/font_family", self.ui.font_family)
        
        # Network settings
        self.settings.setValue("network/api_base_url", self.network.api_base_url)
        self.settings.setValue("network/timeout_seconds", self.network.timeout_seconds)
        
        # Security settings
        self.settings.setValue("security/encrypt_local_data", self.security.encrypt_local_data)
        self.settings.setValue("security/audit_logging", self.security.audit_logging)
        
        self.settings.sync()
        
    def get_database_path(self) -> Path:
        """Get full path to database file"""
        return self.data_dir / self.database.path
        
    def get_log_path(self) -> Path:
        """Get full path to log directory"""
        log_dir = self.data_dir / 'logs'
        log_dir.mkdir(exist_ok=True)
        return log_dir
        
    def export_config(self, file_path: Path):
        """Export configuration to YAML file"""
        config_data = {
            'database': self.database.__dict__,
            'word': self.word.__dict__,
            'analysis': self.analysis.__dict__,
            'ui': self.ui.__dict__,
            'network': self.network.__dict__,
            'security': self.security.__dict__,
        }
        
        with open(file_path, 'w') as f:
            yaml.dump(config_data, f, default_flow_style=False)
            
    def import_config(self, file_path: Path):
        """Import configuration from YAML file"""
        with open(file_path, 'r') as f:
            config_data = yaml.safe_load(f)
            
        # Update configuration sections
        if 'database' in config_data:
            self.database = DatabaseConfig(**config_data['database'])
        if 'word' in config_data:
            self.word = WordConfig(**config_data['word'])
        if 'analysis' in config_data:
            self.analysis = AnalysisConfig(**config_data['analysis'])
        if 'ui' in config_data:
            self.ui = UIConfig(**config_data['ui'])
        if 'network' in config_data:
            self.network = NetworkConfig(**config_data['network'])
        if 'security' in config_data:
            self.security = SecurityConfig(**config_data['security'])
            
        # Save to QSettings
        self.save_settings()