from __future__ import annotations

import ast
import operator

from langchain_core.tools import tool

_SAFE_BINOPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
}
_SAFE_UNARY = {ast.UAdd: operator.pos, ast.USub: operator.neg}

_CONVERSIONS: dict[tuple[str, str], float] = {
    ("km", "miles"): 0.621371,
    ("miles", "km"): 1.60934,
    ("kg", "lbs"): 2.20462,
    ("lbs", "kg"): 0.453592,
    ("celsius", "fahrenheit"): 1.0,  # handled specially
    ("fahrenheit", "celsius"): 1.0,
}


def _eval_node(node: ast.AST) -> float:
    if isinstance(node, ast.Expression):
        return _eval_node(node.body)
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return float(node.value)
    if isinstance(node, ast.UnaryOp) and type(node.op) in _SAFE_UNARY:
        return _SAFE_UNARY[type(node.op)](_eval_node(node.operand))
    if isinstance(node, ast.BinOp) and type(node.op) in _SAFE_BINOPS:
        return _SAFE_BINOPS[type(node.op)](_eval_node(node.left), _eval_node(node.right))
    raise ValueError("Unsupported expression")


@tool
def calculator(expression: str) -> str:
    """Evaluate a math expression (+, -, *, /, //, %, **). Example: (2 + 3) * 4**2."""
    cleaned = expression.strip()
    if not cleaned:
        return "No expression provided."
    try:
        tree = ast.parse(cleaned, mode="eval")
        value = _eval_node(tree)
        if value.is_integer():
            return str(int(value))
        return f"{value:.6g}"
    except Exception as exc:
        return f"Could not evaluate expression: {exc}"


def _normalize_unit(unit: str) -> str:
    key = unit.strip().lower()
    aliases = {
        "kilometer": "km",
        "kilometers": "km",
        "mile": "miles",
        "pound": "lbs",
        "pounds": "lbs",
        "kilogram": "kg",
        "kilograms": "kg",
        "c": "celsius",
        "f": "fahrenheit",
        "°c": "celsius",
        "°f": "fahrenheit",
    }
    return aliases.get(key, key)


@tool
def convert_units(value: float, from_unit: str, to_unit: str) -> str:
    """Convert between km/miles, kg/lbs, and celsius/fahrenheit."""
    src = _normalize_unit(from_unit)
    dst = _normalize_unit(to_unit)
    if src == dst:
        return f"{value} {src}"

    if src == "celsius" and dst == "fahrenheit":
        result = (value * 9 / 5) + 32
        return f"{value} celsius = {result:.2f} fahrenheit"
    if src == "fahrenheit" and dst == "celsius":
        result = (value - 32) * 5 / 9
        return f"{value} fahrenheit = {result:.2f} celsius"

    factor = _CONVERSIONS.get((src, dst))
    if factor is None:
        return f"Unsupported conversion from {from_unit} to {to_unit}."
    result = value * factor
    return f"{value} {src} = {result:.4g} {dst}"
