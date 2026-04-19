import re

def extract_style_features(code: str):
    lines = code.split("\n")

    avg_line_length = sum(len(l) for l in lines) / (len(lines) + 1)

    indentation = [len(re.match(r"\s*", l).group()) for l in lines if l.strip()]
    avg_indent = sum(indentation)/(len(indentation)+1)

    variable_names = re.findall(r'\b[a-zA-Z_][a-zA-Z0-9_]*\b', code)
    unique_vars = len(set(variable_names))

    comments = len([l for l in lines if "#" in l])

    return {
        "avg_line_length": avg_line_length,
        "avg_indent": avg_indent,
        "unique_vars": unique_vars,
        "comment_lines": comments,
        "total_lines": len(lines)
    }


def detect_ai_code(code: str):
    features = extract_style_features(code)

    score = 0

    if features["avg_line_length"] > 25:
        score += 1
    if features["unique_vars"] < 6:
        score += 1
    if features["comment_lines"] == 0:
        score += 1
    if features["avg_indent"] == 4:
        score += 1

    if score >= 3:
        return "likely_ai_generated"
    return "likely_human_written"
