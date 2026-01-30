import sys
import os
# Ensure we can import from backend
sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    from backend.app import create_app
except ImportError:
    sys.path.append('backend')
    from app import create_app

app = create_app()
print("\n--- Registered Routes ---")
found = False
for rule in app.url_map.iter_rules():
    if 'trends/auto' in str(rule):
        print(f"FOUND: {rule}")
        found = True

if not found:
    print("❌ trends/auto NOT FOUND in routes!")
else:
    print("✅ trends/auto is registered properly.")
print("--- End Routes ---")
