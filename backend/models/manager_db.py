from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from db.base import Base

class ManagerDB(Base):
    __tablename__ = "managers"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)

    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    company = relationship("CompanyDB", back_populates="managers")