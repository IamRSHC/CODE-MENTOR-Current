from code_analyzer import analyze_code

code = """
for i in range(5):
    print(i)
"""

result = analyze_code(code)
print(result)
