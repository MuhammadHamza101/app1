"""
Logging configuration for PatentFlow Desktop
Sets up structured logging with loguru for development and production
"""

import sys
from pathlib import Path
from loguru import logger
from typing import Optional


def setup_logging(log_level: str = "INFO", log_file: Optional[Path] = None):
    """
    Set up logging configuration for the application
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR)
        log_file: Optional log file path for file logging
    """
    
    # Remove default logger
    logger.remove()
    
    # Console logging with format
    console_format = (
        "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
        "<level>{message}</level>"
    )
    
    logger.add(
        sys.stdout,
        format=console_format,
        level=log_level,
        colorize=True,
        backtrace=True,
        diagnose=True
    )
    
    # File logging if path provided
    if log_file:
        file_format = (
            "{time:YYYY-MM-DD HH:mm:ss.SSS} | "
            "{level: <8} | "
            "{name}:{function}:{line} | "
            "{message}"
        )
        
        logger.add(
            log_file,
            format=file_format,
            level=log_level,
            rotation="10 MB",
            retention="7 days",
            compression="zip",
            backtrace=True,
            diagnose=True
        )
    
    # Error logging to separate file
    if log_file:
        error_file = log_file.parent / "errors.log"
        logger.add(
            error_file,
            format=file_format,
            level="ERROR",
            rotation="5 MB",
            retention="30 days",
            compression="zip",
            backtrace=True,
            diagnose=True
        )


def get_logger(name: str):
    """Get a logger instance for a specific module"""
    return logger.bind(name=name)