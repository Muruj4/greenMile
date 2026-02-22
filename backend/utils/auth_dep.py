from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import os
from dotenv import load_dotenv

load_dotenv()

security = HTTPBearer()

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        role = payload.get("role")
        company_id = payload.get("company_id")

        if not user_id or not role or not company_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")

        return {"id": int(user_id), "role": role, "company_id": int(company_id)}

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")