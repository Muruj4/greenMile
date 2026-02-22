from db.session import engine

try:
    with engine.connect() as conn:
        print("✅ Connected to PostgreSQL successfully!")
except Exception as e:
    print("❌ Failed to connect:")
    print(e)