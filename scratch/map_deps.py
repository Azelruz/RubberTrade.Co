import os
import re
import json

src_dir = r'd:\pond\Antigravity\Rubertrade-Co-Ltd\src'
output_file = r'd:\pond\Antigravity\Rubertrade-Co-Ltd\system_deps.json'

files_map = {}

# Regex for imports (ESM)
import_regex = re.compile(r'import\s+(?:.*?\s+from\s+)?[\'\"](.*?)[\'\"]')

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith(('.js', '.jsx', '.css')):
            file_path = os.path.join(root, file)
            rel_path = os.path.relpath(file_path, src_dir).replace('\\', '/')
            
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                raw_imports = import_regex.findall(content)
                
                resolved_imports = []
                for imp in raw_imports:
                    if imp.startswith('.'):
                        # Relative path
                        imp_dir = os.path.dirname(rel_path)
                        resolved = os.path.normpath(os.path.join(imp_dir, imp)).replace('\\', '/')
                        
                        # Add extensions if missing
                        # This is a bit naive but works for standard Vite/React projects
                        potential_paths = [resolved, resolved + '.js', resolved + '.jsx', resolved + '/index.js', resolved + '/index.jsx', resolved + '.css']
                        found = False
                        for p in potential_paths:
                            if os.path.exists(os.path.join(src_dir, p)):
                                resolved_imports.append(p)
                                found = True
                                break
                        # if not found, it might be an asset or something else
                    else:
                        # Third-party or absolute mapping? (ignoring third-party for now as per user request for system files)
                        pass
                
                files_map[rel_path] = list(set(resolved_imports))

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(files_map, f, indent=2)

print(f"Mapped {len(files_map)} files to {output_file}")
