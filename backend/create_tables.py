from db.session import engine
from db.base import Base

from models.company_db import CompanyDB
from models.manager_db import ManagerDB
from models.driver_db import DriverDB
from models.trip_db import TripDB

Base.metadata.create_all(bind=engine)
print("Tables created successfully!")