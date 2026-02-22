from pydantic import BaseModel, EmailStr

class ManagerSignUp(BaseModel):
    name: str
    company: str
    email: EmailStr
    password: str

class DriverSignUp(BaseModel):
    name: str
    company: str
    email: EmailStr
    password: str

class SignIn(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    token: str
    role: str   # "manager" or "driver"