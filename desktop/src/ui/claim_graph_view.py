"""
Claim Graph View Component
Interactive visualization of claim dependencies using matplotlib
"""

import matplotlib
matplotlib.use('Qt5Agg')  # Use Qt5 backend for matplotlib

from typing import Optional, List, Dict, Any
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QPushButton,
    QGroupBox, QLabel, QScrollArea
)
from PyQt6.QtCore import Qt, pyqtSignal
import matplotlib.pyplot as plt
from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.backends.backend_qt5agg import NavigationToolbar2QT as NavigationToolbar
import networkx as nx
from loguru import logger

from src.models.document import ClaimGraph, ClaimNode, ClaimEdge


class ClaimGraphView(QWidget):
    """Widget for displaying interactive claim dependency graphs"""
    
    # Signals
    claim_selected = pyqtSignal(object)  # ClaimNode
    
    def __init__(self):
        super().__init__()
        self.current_graph: Optional[ClaimGraph] = None
        self.networkx_graph = None
        self.pos = None
        self.figure = None
        self.canvas = None
        self.toolbar = None
        
        self.setup_ui()
        
    def setup_ui(self):
        """Set up the claim graph view UI"""
        layout = QVBoxLayout(self)
        
        # Controls
        controls_layout = QHBoxLayout()
        
        self.refresh_btn = QPushButton("Refresh Layout")
        self.refresh_btn.clicked.connect(self.refresh_layout)
        controls_layout.addWidget(self.refresh_btn)
        
        self.zoom_in_btn = QPushButton("Zoom In")
        self.zoom_in_btn.clicked.connect(self.zoom_in)
        controls_layout.addWidget(self.zoom_in_btn)
        
        self.zoom_out_btn = QPushButton("Zoom Out")
        self.zoom_out_btn.clicked.connect(self.zoom_out)
        controls_layout.addWidget(self.zoom_out_btn)
        
        self.reset_view_btn = QPushButton("Reset View")
        self.reset_view_btn.clicked.connect(self.reset_view)
        controls_layout.addWidget(self.reset_view_btn)
        
        controls_layout.addStretch()
        
        layout.addLayout(controls_layout)
        
        # Graph info
        self.info_label = QLabel("No claim graph to display")
        self.info_label.setStyleSheet("""
            QLabel {
                color: #e0e0e0;
                padding: 10px;
                background-color: #2d2d2d;
                border-radius: 5px;
                border: 1px solid #404040;
            }
        """)
        layout.addWidget(self.info_label)
        
        # Matplotlib canvas
        self.setup_matplotlib_canvas()
        layout.addWidget(self.canvas)
        
        # Navigation toolbar
        if self.toolbar:
            layout.addWidget(self.toolbar)
            
    def setup_matplotlib_canvas(self):
        """Set up matplotlib figure and canvas"""
        # Create figure with dark theme
        plt.style.use('dark_background')
        self.figure, self.ax = plt.subplots(figsize=(12, 8))
        self.figure.patch.set_facecolor('#1e1e1e')
        self.ax.set_facecolor('#2d2d2d')
        
        # Create canvas
        self.canvas = FigureCanvas(self.figure)
        self.canvas.mpl_connect('button_press_event', self.on_click)
        
        # Create navigation toolbar
        self.toolbar = NavigationToolbar(self.canvas, self)
        
    def display_graph(self, claim_graph: ClaimGraph):
        """Display a claim dependency graph"""
        self.current_graph = claim_graph
        
        try:
            # Clear current plot
            self.ax.clear()
            
            # Create NetworkX graph
            self.networkx_graph = nx.DiGraph()
            
            # Add nodes
            for node in claim_graph.nodes:
                self.networkx_graph.add_node(
                    node.id,
                    label=f"Claim {node.claim_number}",
                    claim_type=node.claim_type,
                    category=node.category,
                    severity=node.severity,
                    text=node.text
                )
                
            # Add edges
            for edge in claim_graph.edges:
                self.networkx_graph.add_edge(
                    edge.from_node,
                    edge.to_node,
                    weight=edge.weight
                )
                
            # Calculate layout
            self.pos = nx.spring_layout(
                self.networkx_graph,
                k=3,  # Optimal distance between nodes
                iterations=50,
                seed=42  # For consistent layout
            )
            
            # Draw the graph
            self.draw_graph()
            
            # Update info
            total_claims = len(claim_graph.nodes)
            independent = len([n for n in claim_graph.nodes if n.claim_type == 'independent'])
            dependent = len([n for n in claim_graph.nodes if n.claim_type == 'dependent'])
            
            self.info_label.setText(
                f"Claims: {total_claims} (Independent: {independent}, Dependent: {dependent})"
            )
            
            logger.info(f"Displayed claim graph with {total_claims} nodes")
            
        except Exception as e:
            logger.error(f"Failed to display claim graph: {e}")
            self.info_label.setText(f"Error displaying graph: {e}")
            
    def draw_graph(self):
        """Draw the NetworkX graph on matplotlib axes"""
        if not self.networkx_graph or not self.pos:
            return
            
        # Separate nodes by type
        independent_nodes = [n for n, d in self.networkx_graph.nodes(data=True) 
                          if d['claim_type'] == 'independent']
        dependent_nodes = [n for n, d in self.networkx_graph.nodes(data=True) 
                        if d['claim_type'] == 'dependent']
        
        # Draw edges
        nx.draw_networkx_edges(
            self.networkx_graph,
            self.pos,
            ax=self.ax,
            edge_color='#404040',
            width=2,
            alpha=0.6,
            arrows=True,
            arrowsize=20,
            arrowstyle='->'
        )
        
        # Draw independent claims
        nx.draw_networkx_nodes(
            self.networkx_graph,
            self.pos,
            nodelist=independent_nodes,
            node_color='#0078d4',
            node_size=1500,
            ax=self.ax,
            alpha=0.8
        )
        
        # Draw dependent claims
        nx.draw_networkx_nodes(
            self.networkx_graph,
            self.pos,
            nodelist=dependent_nodes,
            node_color='#404040',
            node_size=1200,
            ax=self.ax,
            alpha=0.8
        )
        
        # Draw labels
        labels = {n: d['label'] for n, d in self.networkx_graph.nodes(data=True)}
        nx.draw_networkx_labels(
            self.networkx_graph,
            self.pos,
            labels,
            ax=self.ax,
            font_size=10,
            font_color='white',
            font_weight='bold'
        )
        
        # Customize plot
        self.ax.set_title("Claim Dependency Graph", fontsize=16, color='white', pad=20)
        self.ax.set_xlabel("", color='white')
        self.ax.set_ylabel("", color='white')
        
        # Remove axes for cleaner look
        self.ax.set_xticks([])
        self.ax.set_yticks([])
        
        # Set spines color
        for spine in self.ax.spines.values():
            spine.set_edgecolor('#404040')
            
        self.ax.tick_params(colors='white')
        
        # Refresh canvas
        self.canvas.draw()
        
    def on_click(self, event):
        """Handle mouse clicks on the graph"""
        if event.inaxes != self.ax:
            return
            
        # Find closest node to click
        min_dist = float('inf')
        selected_node = None
        
        for node, (x, y) in self.pos.items():
            dist = ((event.xdata - x) ** 2 + (event.ydata - y) ** 2) ** 0.5
            if dist < min_dist and dist < 0.1:  # Within 0.1 units
                min_dist = dist
                selected_node = node
                
        if selected_node and self.current_graph:
            # Find the corresponding claim node
            claim_node = next((n for n in self.current_graph.nodes if n.id == selected_node), None)
            if claim_node:
                self.claim_selected.emit(claim_node)
                logger.info(f"Selected claim {claim_node.claim_number}")
                
    def refresh_layout(self):
        """Refresh the graph layout"""
        if self.networkx_graph:
            # Recalculate layout with some randomness
            self.pos = nx.spring_layout(
                self.networkx_graph,
                k=3,
                iterations=50,
                seed=None  # Random seed for new layout
            )
            self.draw_graph()
            
    def zoom_in(self):
        """Zoom in the graph view"""
        xlim = self.ax.get_xlim()
        ylim = self.ax.get_ylim()
        
        x_center = (xlim[0] + xlim[1]) / 2
        y_center = (ylim[0] + ylim[1]) / 2
        
        x_range = (xlim[1] - xlim[0]) * 0.8
        y_range = (ylim[1] - ylim[0]) * 0.8
        
        self.ax.set_xlim(x_center - x_range/2, x_center + x_range/2)
        self.ax.set_ylim(y_center - y_range/2, y_center + y_range/2)
        
        self.canvas.draw()
        
    def zoom_out(self):
        """Zoom out the graph view"""
        xlim = self.ax.get_xlim()
        ylim = self.ax.get_ylim()
        
        x_center = (xlim[0] + xlim[1]) / 2
        y_center = (ylim[0] + ylim[1]) / 2
        
        x_range = (xlim[1] - xlim[0]) * 1.25
        y_range = (ylim[1] - ylim[0]) * 1.25
        
        self.ax.set_xlim(x_center - x_range/2, x_center + x_range/2)
        self.ax.set_ylim(y_center - y_range/2, y_center + y_range/2)
        
        self.canvas.draw()
        
    def reset_view(self):
        """Reset the graph view to default"""
        if self.pos:
            # Calculate appropriate limits
            x_coords = [pos[0] for pos in self.pos.values()]
            y_coords = [pos[1] for pos in self.pos.values()]
            
            x_margin = 0.5
            y_margin = 0.5
            
            self.ax.set_xlim(min(x_coords) - x_margin, max(x_coords) + x_margin)
            self.ax.set_ylim(min(y_coords) - y_margin, max(y_coords) + y_margin)
            
            self.canvas.draw()
            
    def clear(self):
        """Clear the graph display"""
        self.current_graph = None
        self.networkx_graph = None
        self.pos = None
        
        self.ax.clear()
        self.canvas.draw()
        
        self.info_label.setText("No claim graph to display")