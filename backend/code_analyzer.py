import ast

def analyze_code(code: str):
    """
    Analyze Python code and return structure + errors
    """
    try:
        tree = ast.parse(code)

        features = {
            "loops": 0,
            "conditions": 0,
            "functions": 0,
            "variables": 0
        }

        for node in ast.walk(tree):
            if isinstance(node, (ast.For, ast.While)):
                features["loops"] += 1

            if isinstance(node, ast.If):
                features["conditions"] += 1

            if isinstance(node, ast.FunctionDef):
                features["functions"] += 1

            if isinstance(node, ast.Assign):
                features["variables"] += 1

        return {
            "status": "valid",
            "features": features
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
