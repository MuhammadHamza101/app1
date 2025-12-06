# PatentFlow Desktop Application

## Overview

PatentFlow Desktop is a premium patent drafting and analysis application built with PyQt6 and Python. It provides seamless integration with Microsoft Word, advanced NLP-powered analysis, and professional visualization tools.

## Features

### Core Functionality
- **Word Integration**: Resilient COM connection with retry logic and error recovery
- **Document Analysis**: AI-powered analysis of claims, specifications, and terminology
- **Interactive Navigation**: Click-to-navigate between findings and Word document
- **Claim Graphs**: Visual dependency graphs with interactive exploration
- **Smart Renumbering**: Range-based reference numeral management

### Analysis Capabilities
- **Antecedent Basis**: Detect missing antecedents for claim terms
- **Claim Dependencies**: Validate claim references and build dependency graphs
- **Terminology Consistency**: Identify inconsistent terminology usage
- **Reference Numerals**: Validate figure references and detect collisions
- **NLP Processing**: POS-based disambiguation with spaCy

### Enterprise Features
- **Secure Storage**: Encrypted local data with configurable security
- **Audit Trails**: Complete logging of all operations
- **Professional UI**: Apple-style dark theme with responsive design
- **Configuration**: Comprehensive settings management

## Installation

### Prerequisites
- Python 3.11 or higher
- Microsoft Word 2016/2019/365
- Windows 10/11 (primary), macOS (secondary)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd patentflow/desktop
   ```

2. **Create virtual environment**
   ```bash
   python -m venv patentflow-env
   source patentflow-env/bin/activate  # Linux/macOS
   # or
   patentflow-env\Scripts\activate  # Windows
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Download spaCy model**
   ```bash
   python -m spacy download en_core_web_sm
   ```

5. **Run the application**
   ```bash
   python main.py
   ```

## Usage

### Getting Started

1. **Launch PatentFlow Desktop**
   - Run `python main.py` from the desktop directory
   - The application will start with the main window

2. **Connect to Word**
   - Click "Connect to Word" or enable auto-connect in settings
   - Grant permissions if prompted by Word
   - Status will show "Connected" when successful

3. **Load Document**
   - Open a patent document in Word
   - PatentFlow will automatically detect and load the active document
   - Document content appears in the "Document" tab

4. **Run Analysis**
   - Click "Analyze Document" for full analysis
   - Or choose specific analysis types from the Analysis menu
   - Progress is shown in the status bar

5. **Review Findings**
   - Findings appear in the left panel grouped by severity
   - Click on any finding to see detailed information
   - Use "Navigate to Location" to jump to the finding in Word

### Key Workflows

#### Claims Analysis
1. Connect to Word with patent application open
2. Run "Analyze Claims" from Analysis menu
3. Review antecedent basis and dependency findings
4. Navigate to specific claims using the claim graph
5. Fix issues directly in Word

#### Terminology Check
1. Load document in Word
2. Run "Check Terminology" from Analysis menu
3. Review inconsistent terminology findings
4. Navigate to specific instances in Word
5. Standardize terminology throughout document

#### Smart Renumbering
1. Identify renumbering need (e.g., insert new figure)
2. Access renumbering tools from Analysis menu
3. Specify range and offset (e.g., 300-399 +100)
4. Preview changes before applying
5. Apply with tracked changes option

## Configuration

### Word Integration Settings
- **Auto Connect**: Automatically connect to Word on startup
- **Retry Attempts**: Number of connection retry attempts (1-10)
- **Retry Delay**: Delay between retry attempts (100-10000ms)
- **Connection Timeout**: Word response timeout (1000-30000ms)

### Analysis Settings
- **NLP Model**: spaCy model to use (sm/md/lg)
- **Confidence Threshold**: Minimum confidence for findings (0-100%)
- **Enable Disambiguation**: POS-based word disambiguation
- **Cache Settings**: Enable/disable analysis caching

### Interface Settings
- **Theme**: Dark/Light/Auto theme selection
- **Font**: Font family and size configuration
- **Window State**: Remember window position and size
- **Auto-save**: Interval for automatic saving

### Security Settings
- **Encryption**: Enable local data encryption
- **Session Timeout**: Automatic logout timeout
- **Audit Logging**: Enable comprehensive operation logging
- **Data Retention**: Days to retain local data

## Architecture

### Component Structure
```
patentflow-desktop/
├── main.py                 # Application entry point
├── requirements.txt          # Python dependencies
├── src/
│   ├── core/
│   │   ├── word_bridge.py      # Word COM integration
│   │   ├── navigation_handler.py # Document navigation
│   │   └── config.py          # Configuration management
│   ├── ui/
│   │   ├── main_window.py     # Main application window
│   │   ├── analysis_view.py   # Analysis results display
│   │   ├── claim_graph_view.py # Claim graph visualization
│   │   └── settings_dialog.py # Settings configuration
│   ├── models/
│   │   └── document.py       # Data models
│   └── utils/
│       ├── logging.py          # Logging configuration
│       └── exceptions.py      # Custom exceptions
└── assets/                  # Application resources
```

### Key Components

#### Word Bridge
- **ConnectionManager**: Handles Word COM connection with retry logic
- **DocumentExtractor**: Extracts and normalizes document content
- **NavigationHandler**: Provides click-to-navigate functionality

#### Analysis Engine
- **Claims Analysis**: Validates claim dependencies and antecedents
- **Terminology Analysis**: Checks term consistency
- **Reference Numeral Analysis**: Validates figure references
- **NLP Processing**: spaCy-based linguistic analysis

#### User Interface
- **Main Window**: Professional dark-themed interface
- **Analysis View**: Detailed findings display
- **Claim Graph**: Interactive dependency visualization
- **Settings Dialog**: Comprehensive configuration

## Development

### Running Tests
```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_word_bridge.py

# Run with coverage
pytest --cov=src tests/
```

### Code Quality
```bash
# Format code
black src/

# Lint code
flake8 src/

# Type checking
mypy src/
```

### Building for Distribution

#### PyInstaller (Recommended)
```bash
# Install PyInstaller
pip install pyinstaller

# Build executable
pyinstaller --onefile --windowed --icon=assets/icon.ico main.py

# Build with more options
pyinstaller patentflow.spec
```

#### cx_Freeze
```bash
# Install cx_Freeze
pip install cx_Freeze

# Build executable
python setup.py build
```

## Troubleshooting

### Common Issues

#### Word Connection Fails
- **Check Word Version**: Ensure Word 2016/2019/365 is installed
- **Permissions**: Run as administrator if needed
- **COM Registration**: Repair Office installation if COM errors persist
- **Firewall**: Ensure Word isn't blocked by security software

#### Analysis Errors
- **Document Format**: Ensure document is in .docx format
- **Content Length**: Very large documents may need more memory
- **NLP Model**: Verify spaCy model is downloaded correctly
- **Permissions**: Check read permissions for document location

#### Performance Issues
- **Memory Usage**: Increase cache size in settings
- **Processing Time**: Adjust confidence threshold to reduce false positives
- **UI Responsiveness**: Enable hardware acceleration in settings

### Debug Mode
Enable debug logging for troubleshooting:
1. Open Settings → Logging
2. Set log level to "DEBUG"
3. Check log files in:
   - Windows: `%APPDATA%\PatentFlow\logs\`
   - macOS: `~/Library/Logs/PatentFlow/`
   - Linux: `~/.local/share/patentflow/logs/`

## Support

### Documentation
- **User Guide**: Comprehensive usage instructions
- **API Reference**: Technical documentation for developers
- **Best Practices**: Patent drafting recommendations

### Community
- **GitHub Issues**: Report bugs and request features
- **Discord Community**: Get help from other users
- **Stack Overflow**: Tag questions with `patentflow`

## License

PatentFlow Enterprise is commercial software. See LICENSE file for usage terms.

## Changelog

### Version 1.0.0
- Initial release with core Word integration
- Claims and terminology analysis
- Interactive claim graph visualization
- Professional dark-themed UI
- Comprehensive configuration system

---

For more information, visit [patentflow.com](https://patentflow.com) or contact support@patentflow.com