"""
EPIC 10.4: Performance Checks
Static analysis for performance best practices:
1. Check for pagination in list endpoints.
2. Check for potential N+1 query issues (loops with DB calls).
3. Check for indexing in models.
"""
import os
import re
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
ROUTERS_DIR = BASE_DIR / "src" / "routers"
MODELS_FILE = BASE_DIR / "src" / "db" / "models.py"

def check_pagination():
    print("\n--- Checking for Pagination in List Endpoints ---")
    list_endpoints = []
    
    # Simple heuristic: Look for @router.get without {id} and check if query params like 'skip', 'limit', 'page' are used
    # or if the response model is a list.
    
    for root, dirs, files in os.walk(ROUTERS_DIR):
        for file in files:
            if file.endswith(".py") and file != "__init__.py":
                path = Path(root) / file
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                    
                # Find all GET endpoints
                # Regex to find @router.get("...") func def ...
                matches = re.finditer(r'@router\.get\("([^"]+)"', content)
                
                for match in matches:
                    endpoint = match.group(1)
                    if "{" not in endpoint: # Likely a list endpoint
                        # Check if limit/offset logic exists in the surrounding code block (simplified check)
                        # We just check if the file mentions LimitOffsetPage or similar, or explicit limits
                        if "LimitOffsetPage" in content or "Page[" in content or "limit" in content:
                           pass # Likely has pagination
                        else:
                            # Might be missing pagination
                            # But some simple lists (like 'all clusters') might not need it if bounded.
                            # Just strictly logging for review.
                            print(f"[WARN] Potential unpaginated list endpoint: {file} -> {endpoint}")

def check_n_plus_one():
    print("\n--- Checking for Potential N+1 Queries ---")
    # Heuristic: Look for loops that contain "await" and "db." calls inside
    
    for root, dirs, files in os.walk(BASE_DIR / "src"):
        for file in files:
            if file.endswith(".py"):
                path = Path(root) / file
                with open(path, "r", encoding="utf-8") as f:
                    lines = f.readlines()
                
                in_loop = False
                loop_indent = 0
                
                for i, line in enumerate(lines):
                    stripped = line.strip()
                    indent = len(line) - len(line.lstrip())
                    
                    if stripped.startswith("for ") or stripped.startswith("while "):
                        in_loop = True
                        loop_indent = indent
                        continue
                        
                    if in_loop:
                        if indent <= loop_indent and stripped: # Exit loop
                            in_loop = False
                            continue
                            
                        # Inside loop
                        if "await db.execute" in stripped or "await db.get" in stripped or "await session." in stripped:
                            # It *could* be N+1, unless it's an insert/update loop which is sometimes necessary 
                            # (though batch update is better). Reading in loop is the main N+1 read anti-pattern.
                             if "select(" in stripped:
                                 print(f"[WARN] Potential N+1 SELECT in loop: {file}:{i+1}")
                                 print(f"       Line: {stripped}")

def check_indexes():
    print("\n--- Checking for Database Indexes ---")
    if not MODELS_FILE.exists():
        print("Models file not found!")
        return

    with open(MODELS_FILE, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Count indexes
    index_count = content.count("index=True")
    unique_count = content.count("unique=True")
    
    print(f"Found {index_count} explicit indexes and {unique_count} unique constraints.")
    
    if index_count < 5:
        print("[WARN] Low number of indexes found. Ensure foreign keys and search fields are indexed.")
    else:
        print("[PASS] Reasonable number of indexes found.")

if __name__ == "__main__":
    check_pagination()
    check_n_plus_one()
    check_indexes()
