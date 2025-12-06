"""
PatentFlow Desktop Application
Core entry point for the PyQt6-based patent analysis desktop client
"""

import sys
import asyncio
from pathlib import Path
from PyQt6.QtWidgets import QApplication
from PyQt6.QtCore import QSettings, QTimer
from PyQt6.QtGui import QIcon
from loguru import logger

from src.ui.main_window import MainWindow
from src.core.config import Config
from src.utils.logging import setup_logging


class PatentFlowApp:
    """Main application class for PatentFlow Desktop"""
    
    def __init__(self):
        self.app = None
        self.main_window = None
        self.config = Config()
        
    def setup_application(self):
        """Initialize the PyQt6 application"""
        # Set up application
        self.app = QApplication(sys.argv)
        self.app.setApplicationName("PatentFlow Enterprise")
        self.app.setApplicationVersion("1.0.0")
        self.app.setOrganizationName("PatentFlow")
        
        # Set up application icon
        icon_path = Path(__file__).parent / "assets" / "icon.png"
        if icon_path.exists():
            self.app.setWindowIcon(QIcon(str(icon_path)))
        
        # Set up dark theme
        self.setup_dark_theme()
        
        # Set up logging
        setup_logging()
        
        logger.info("PatentFlow Desktop starting up...")
        
    def setup_dark_theme(self):
        """Configure Apple-style dark theme"""
        import qdarkstyle
        self.app.setStyleSheet(qdarkstyle.load_stylesheet_pyqt6())
        
        # Additional dark theme customization
        custom_style = """
        QMainWindow {
            background-color: #1e1e1e;
            color: #ffffff;
        }
        QTabWidget::pane {
            border: 1px solid #404040;
            background-color: #2d2d2d;
        }
        QTabBar::tab {
            background-color: #404040;
            color: #ffffff;
            padding: 8px 16px;
            margin-right: 2px;
        }
        QTabBar::tab:selected {
            background-color: #0078d4;
        }
        QTreeWidget {
            background-color: #2d2d2d;
            color: #ffffff;
            alternate-background-color: #252525;
        }
        QTreeWidget::item:selected {
            background-color: #0078d4;
        }
        """
        self.app.setStyleSheet(self.app.styleSheet() + custom_style)
        
    def create_main_window(self):
        """Create and show the main window"""
        self.main_window = MainWindow(self.config)
        self.main_window.show()
        
        logger.info("Main window created and shown")
        
    def run(self):
        """Run the application event loop"""
        try:
            self.setup_application()
            self.create_main_window()
            
            # Start async event loop
            timer = QTimer()
            timer.timeout.connect(lambda: None)
            timer.start(100)
            
            # Run the application
            exit_code = self.app.exec()
            logger.info(f"Application exited with code: {exit_code}")
            return exit_code
            
        except Exception as e:
            logger.error(f"Application error: {e}")
            return 1


def main():
    """Main entry point"""
    app = PatentFlowApp()
    return app.run()


if __name__ == "__main__":
    sys.exit(main())