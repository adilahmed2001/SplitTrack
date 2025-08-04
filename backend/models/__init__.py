from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()  # Define db here so it can be shared safely

from .models import User  # Import all models here so they are registered
