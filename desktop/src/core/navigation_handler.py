"""
Navigation Handler for Word Bridge
Handles click-to-navigate functionality between analysis findings and Word document
"""

import asyncio
from typing import Optional, Dict, Any
from loguru import logger

from src.core.word_bridge import ConnectionManager
from src.models.document import TextAnchor, NavigationOptions
from src.utils.exceptions import NavigationError


class NavigationHandler:
    """Handles navigation to specific locations in Word documents"""
    
    def __init__(self, connection_manager: ConnectionManager):
        self.connection_manager = connection_manager
        
    async def navigate_to_anchor(self, anchor: TextAnchor, options: Optional[Dict[str, Any]] = None) -> bool:
        """
        Navigate to a specific text anchor in Word
        
        Args:
            anchor: TextAnchor with position information
            options: Navigation options (highlight, scroll, select)
            
        Returns:
            True if navigation successful, False otherwise
        """
        if not self.connection_manager.is_connected():
            raise NavigationError("Not connected to Word")
            
        try:
            doc = self.connection_manager.active_doc
            if not doc:
                raise NavigationError("No active document")
                
            # Get the paragraph
            paragraphs = doc.Paragraphs
            if anchor.paragraph_index >= paragraphs.Count:
                raise NavigationError(f"Paragraph index {anchor.paragraph_index} out of range")
                
            paragraph = paragraphs.Item(anchor.paragraph_index + 1)  # Word is 1-based
            
            # Calculate the range within the paragraph
            paragraph_range = paragraph.Range
            start_pos = paragraph_range.Start + anchor.start_offset
            end_pos = paragraph_range.Start + anchor.end_offset
            
            # Create the target range
            target_range = doc.Range(start_pos, end_pos)
            
            # Apply navigation options
            if options:
                await self._apply_navigation_options(target_range, options)
            else:
                # Default: select and scroll
                target_range.Select()
                target_range.Collapse()
                
            # Bring Word to front
            self.connection_manager.word_app.Activate()
            
            logger.info(f"Successfully navigated to anchor at paragraph {anchor.paragraph_index}")
            return True
            
        except Exception as e:
            logger.error(f"Navigation failed: {e}")
            raise NavigationError(f"Failed to navigate to anchor: {e}")
            
    async def _apply_navigation_options(self, target_range, options: Dict[str, Any]):
        """Apply navigation options to the target range"""
        try:
            # Highlight option
            if options.get('highlight', False):
                # Apply yellow highlight
                target_range.HighlightColorIndex = 7  # Yellow
                # Clear highlight after 2 seconds
                await asyncio.sleep(2)
                target_range.HighlightColorIndex = 0  # No highlight
                
            # Scroll option
            if options.get('scroll', True):
                # Ensure the range is visible
                target_range.Collapse()
                target_range.Select()
                window = target_range.Application.ActiveWindow
                if window:
                    window.VerticalPercentScrolled = 50  # Center vertically
                    
            # Select option
            if options.get('select', True):
                target_range.Select()
            else:
                target_range.Collapse()
                
        except Exception as e:
            logger.warning(f"Failed to apply navigation options: {e}")
            
    async def navigate_to_claim(self, claim_number: int) -> bool:
        """
        Navigate to a specific claim number in the document
        
        Args:
            claim_number: The claim number to navigate to
            
        Returns:
            True if navigation successful
        """
        try:
            if not self.connection_manager.is_connected():
                raise NavigationError("Not connected to Word")
                
            doc = self.connection_manager.active_doc
            range_obj = doc.Content
            
            # Search for claim pattern
            search_text = f"{claim_number}."
            
            # Use Word's Find functionality
            find_obj = range_obj.Find
            find_obj.Text = search_text
            find_obj.Forward = True
            find_obj.MatchCase = False
            find_obj.MatchWholeWord = False
            find_obj.Wrap = 1  # wdFindContinue
            
            if find_obj.Execute():
                # Found the claim, select it
                found_range = find_obj.Parent
                found_range.Select()
                
                # Extend selection to end of claim (next claim or end of document)
                self._extend_claim_selection(found_range)
                
                # Bring Word to front
                self.connection_manager.word_app.Activate()
                
                logger.info(f"Successfully navigated to claim {claim_number}")
                return True
            else:
                logger.warning(f"Claim {claim_number} not found")
                return False
                
        except Exception as e:
            logger.error(f"Claim navigation failed: {e}")
            raise NavigationError(f"Failed to navigate to claim {claim_number}: {e}")
            
    def _extend_claim_selection(self, found_range):
        """Extend selection to include entire claim"""
        try:
            # Find the end of this claim (next claim number or end)
            search_range = found_range.Duplicate
            search_range.SetRange(found_range.End, found_range.End + 1000)
            
            find_obj = search_range.Find
            find_obj.Text = r"[0-9]{1,3}\."  # Next claim number pattern
            find_obj.MatchWildcards = True
            find_obj.Forward = True
            
            if find_obj.Execute():
                # Found next claim, end before it
                found_range.SetRange(found_range.Start, find_obj.Parent.Start - 1)
            else:
                # No next claim found, extend to end of paragraph
                found_range.Expand(1)  # wdParagraph
                
        except Exception as e:
            logger.warning(f"Failed to extend claim selection: {e}")
            
    async def navigate_to_figure_reference(self, figure_number: str) -> bool:
        """
        Navigate to a figure reference in the document
        
        Args:
            figure_number: The figure number to find (e.g., "1", "2A")
            
        Returns:
            True if navigation successful
        """
        try:
            if not self.connection_manager.is_connected():
                raise NavigationError("Not connected to Word")
                
            doc = self.connection_manager.active_doc
            range_obj = doc.Content
            
            # Search for figure reference patterns
            search_patterns = [
                f"FIG. {figure_number}",
                f"FIG{figure_number}",
                f"Figure {figure_number}",
                f"Fig. {figure_number}"
            ]
            
            for pattern in search_patterns:
                find_obj = range_obj.Find
                find_obj.Text = pattern
                find_obj.Forward = True
                find_obj.MatchCase = False
                find_obj.MatchWholeWord = False
                find_obj.Wrap = 1
                
                if find_obj.Execute():
                    found_range = find_obj.Parent
                    found_range.Select()
                    
                    # Highlight temporarily
                    found_range.HighlightColorIndex = 7  # Yellow
                    await asyncio.sleep(2)
                    found_range.HighlightColorIndex = 0  # Clear
                    
                    # Bring Word to front
                    self.connection_manager.word_app.Activate()
                    
                    logger.info(f"Successfully navigated to figure {figure_number}")
                    return True
                    
            logger.warning(f"Figure {figure_number} reference not found")
            return False
            
        except Exception as e:
            logger.error(f"Figure navigation failed: {e}")
            raise NavigationError(f"Failed to navigate to figure {figure_number}: {e}")
            
    async def get_current_selection(self) -> Optional[Dict[str, Any]]:
        """
        Get information about the current selection in Word
        
        Returns:
            Dictionary with selection information or None if no selection
        """
        try:
            if not self.connection_manager.is_connected():
                return None
                
            doc = self.connection_manager.active_doc
            selection = doc.Application.Selection
            
            if selection.Type == 0:  # No selection (wdNoSelection)
                return None
                
            range_obj = selection.Range
            return {
                'text': range_obj.Text,
                'start': range_obj.Start,
                'end': range_obj.End,
                'type': selection.Type
            }
            
        except Exception as e:
            logger.error(f"Failed to get current selection: {e}")
            return None
            
    async def highlight_text(self, text: str, temporary: bool = True) -> bool:
        """
        Find and highlight specific text in the document
        
        Args:
            text: Text to find and highlight
            temporary: Whether highlight is temporary (auto-clear)
            
        Returns:
            True if text was found and highlighted
        """
        try:
            if not self.connection_manager.is_connected():
                raise NavigationError("Not connected to Word")
                
            doc = self.connection_manager.active_doc
            range_obj = doc.Content
            
            find_obj = range_obj.Find
            find_obj.Text = text
            find_obj.Forward = True
            find_obj.MatchCase = False
            find_obj.MatchWholeWord = False
            find_obj.Wrap = 1
            
            found_any = False
            while find_obj.Execute():
                found_range = find_obj.Parent
                found_range.HighlightColorIndex = 7  # Yellow
                found_any = True
                
                # Move to next occurrence
                range_obj.SetRange(found_range.End, found_range.End)
                
            if found_any and temporary:
                # Clear highlights after 3 seconds
                await asyncio.sleep(3)
                doc.Content.HighlightColorIndex = 0  # Clear all highlights
                
            return found_any
            
        except Exception as e:
            logger.error(f"Failed to highlight text: {e}")
            return False