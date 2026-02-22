from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from db.base import Base

class CompanyDB(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)

    managers = relationship("ManagerDB", back_populates="company")
    drivers = relationship("DriverDB", back_populates="company")