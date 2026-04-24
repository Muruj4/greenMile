from sqlalchemy.orm import Session
from models.company_db import CompanyDB
from models.manager_db import ManagerDB
from models.driver_db import DriverDB
from utils.security import hash_password, verify_password, create_access_token
import re


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

    def _email_exists(self, db: Session, email: str) -> bool:
        manager = db.query(ManagerDB).filter(ManagerDB.email == email).first()
        driver = db.query(DriverDB).filter(DriverDB.email == email).first()
        return manager is not None or driver is not None

    def _validate_password(self, password: str):
        if len(password) != 8:
            raise ValueError("Password must be exactly 8 characters")
        if not re.search(r"[A-Z]", password):
            raise ValueError("Password must contain at least one capital letter")
        if not re.search(r"[0-9]", password):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[^A-Za-z0-9]", password):
            raise ValueError("Password must contain at least one special character")

    def validate_manager_signup_data(self, db: Session, name: str, company: str, email: str, password: str):
        name = name.strip()
        email = email.strip().lower()

        if not name:
            raise ValueError("Name is required")

        if not company.strip():
            raise ValueError("Company is required")

        if self._email_exists(db, email):
            raise ValueError("Email already registered")

        self._validate_password(password)

        return True

    def manager_signup(self, db: Session, name: str, company: str, email: str, password: str):
        name = name.strip()
        email = email.strip().lower()

        if not name:
            raise ValueError("Name is required")

        if not company.strip():
            raise ValueError("Company is required")

        if self._email_exists(db, email):
            raise ValueError("Email already registered")

        self._validate_password(password)

        company_obj = self._get_or_create_company(db, company)

        manager = ManagerDB(
            full_name=name,
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
        name = name.strip()
        email = email.strip().lower()

        if not name:
            raise ValueError("Name is required")

        if not company.strip():
            raise ValueError("Company is required")

        if self._email_exists(db, email):
            raise ValueError("Email already registered")

        self._validate_password(password)

        company_obj = self._get_or_create_company(db, company)

        driver = DriverDB(
            full_name=name,
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
            company = db.query(CompanyDB).filter(CompanyDB.id == manager.company_id).first()

            token = create_access_token({
                "sub": str(manager.id),
                "role": "manager",
                "company_id": manager.company_id
            })

            return token, "manager", manager.company_id, company.name if company else "Company"

        driver = db.query(DriverDB).filter(DriverDB.email == email).first()
        if driver and verify_password(password, driver.password_hash):
            company = db.query(CompanyDB).filter(CompanyDB.id == driver.company_id).first()

            token = create_access_token({
                "sub": str(driver.id),
                "role": "driver",
                "company_id": driver.company_id
            })

            return token, "driver", driver.company_id, company.name if company else "Company"

        raise ValueError("Invalid email or password")