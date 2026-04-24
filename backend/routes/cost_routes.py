"""Compatibility module for legacy import path.

Keeps `from routes.cost_routes import cost_routes` working while the route
implementation is split across smaller modules.
"""

from routes.costs import cost_routes

__all__ = ['cost_routes']
