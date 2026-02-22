from sqlalchemy.orm import Session
from models.company_db import CompanyDB
from models.manager_db import ManagerDB
from models.driver_db import DriverDB
from utils.security import hash_password, verify_password, create_access_token


class AuthController:

   
    def _get_or_create_company(self, db: Session, company_name: str) -> CompanyDB:
        company_name = company_name.strip()
        company = db.query(CompanyDB).filter(CompanyDB.name == company_name).first()
        if company:
            return company

        company = CompanyDB(name=company_name)
        db.add(company)
        db.commit()
        db.refresh(company)
        return company

  
    def manager_signup(self, db: Session, name: str, company: str, email: str, password: str):
        email = email.strip().lower()

        if db.query(ManagerDB).filter(ManagerDB.email == email).first():
            raise ValueError("Email already registered")

        company_obj = self._get_or_create_company(db, company)

        manager = ManagerDB(
            full_name=name.strip(),
            email=email,
            password_hash=hash_password(password),
            company_id=company_obj.id
        )
        db.add(manager)
        db.commit()
        db.refresh(manager)

        token = create_access_token({
            "sub": str(manager.id),
            "role": "manager",
            "company_id": company_obj.id
        })
        return token

   
    def driver_signup(self, db: Session, name: str, company: str, email: str, password: str):
        email = email.strip().lower()

        if db.query(DriverDB).filter(DriverDB.email == email).first():
            raise ValueError("Email already registered")

        company_obj = self._get_or_create_company(db, company)

        driver = DriverDB(
            full_name=name.strip(),
            email=email,
            password_hash=hash_password(password),
            company_id=company_obj.id
        )
        db.add(driver)
        db.commit()
        db.refresh(driver)

        token = create_access_token({
            "sub": str(driver.id),
            "role": "driver",
            "company_id": company_obj.id
        })
        return token

   
    def signin(self, db: Session, email: str, password: str):
        email = email.strip().lower()

        
        manager = db.query(ManagerDB).filter(ManagerDB.email == email).first()
        if manager and verify_password(password, manager.password_hash):
            token = create_access_token({
                "sub": str(manager.id),
                "role": "manager",
                "company_id": manager.company_id
            })
            return token, "manager"

       
        driver = db.query(DriverDB).filter(DriverDB.email == email).first()
        if driver and verify_password(password, driver.password_hash):
            token = create_access_token({
                "sub": str(driver.id),
                "role": "driver",
                "company_id": driver.company_id
            })
            return token, "driver"

        raise ValueError("Invalid email or password")