import json
from jsonschema import Draft202012Validator

SCHEMA_PATH = "backend/models/ghg_factors.schema.json"
DATA_PATH = "backend/models/ghg_factors.json"

def load_json(path: str):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def validate_ghg_factors():
    schema = load_json(SCHEMA_PATH)
    data = load_json(DATA_PATH)

    validator = Draft202012Validator(schema)
    errors = sorted(validator.iter_errors(data), key=lambda e: e.path)

    if not errors:
        print("✅ ghg_factors.json is VALID")
        return True

    print("❌ ghg_factors.json is INVALID:")
    for error in errors:
        path = "/".join([str(p) for p in error.path]) or "(root)"
        print(f"- Path: {path}")
        print(f"  Message: {error.message}")
    return False

if __name__ == "__main__":
    validate_ghg_factors()
