"""
Custom exceptions for PatentFlow Desktop
Defines specific exception types for different error scenarios
"""


class PatentFlowError(Exception):
    """Base exception for PatentFlow Desktop"""
    pass


class WordConnectionError(PatentFlowError):
    """Raised when Word connection fails"""
    pass


class DocumentExtractionError(PatentFlowError):
    """Raised when document extraction fails"""
    pass


class NavigationError(PatentFlowError):
    """Raised when navigation to Word location fails"""
    pass


class AnalysisError(PatentFlowError):
    """Raised when document analysis fails"""
    pass


class NLProcessingError(PatentFlowError):
    """Raised when NLP processing fails"""
    pass


class ConfigurationError(PatentFlowError):
    """Raised when configuration is invalid"""
    pass


class SecurityError(PatentFlowError):
    """Raised when security-related error occurs"""
    pass


class NetworkError(PatentFlowError):
    """Raised when network operation fails"""
    pass


class ValidationError(PatentFlowError):
    """Raised when data validation fails"""
    pass