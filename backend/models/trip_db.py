from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey
from db.base import Base

class TripDB(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)

    # who saved it (manager OR driver)
    saved_by_role = Column(String, nullable=False)  
    saved_by_id = Column(Integer, nullable=False)    
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True)
    driver = relationship("DriverDB", back_populates="trips")

    # trip meta
    origin = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    city = Column(String, nullable=False)
    vehicle_type = Column(String, nullable=False)
    fuel_type = Column(String, nullable=False)
    model_year = Column(Integer, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # selected route data
    route_summary = Column(String, nullable=False)
    distance_km = Column(Float, nullable=False)
    duration_min = Column(Integer, nullable=False)
    coordinates = Column(JSONB, nullable=False)  # list of [lng, lat]

    # emissions
    co2 = Column(Float, nullable=False)
    ch4 = Column(Float, nullable=False)
    n2o = Column(Float, nullable=False)
    co2e = Column(Float, nullable=False)

    color = Column(String, nullable=True)  # green/orange/red