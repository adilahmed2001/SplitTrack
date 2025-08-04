from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy() 

from .models import User, Group, GroupMember, Expense, ExpenseShare
