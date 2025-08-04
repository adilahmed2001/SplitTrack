from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from models import db

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), nullable=False)
    email = db.Column(db.String(128), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Group(db.Model):
    __tablename__ = 'groups'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    def __repr__(self):
        return f"<Group {self.name}>"

class GroupMember(db.Model):
    __tablename__ = 'group_members'

    group_id = db.Column(db.Integer, db.ForeignKey('groups.id'), nullable=False, primary_key =True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, primary_key=True)

    user = db.relationship('User', backref='group_memberships')
    group = db.relationship('Group', backref='members')

class Expense(db.Model):
    __tablename__ = 'expenses'
    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.String(255), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    paid_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    expense_type = db.Column(db.String(20), nullable=False)  
    group_id = db.Column(db.Integer, db.ForeignKey('groups.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    paid_by = db.relationship('User', backref='expenses_paid')
    shares = db.relationship('ExpenseShare', backref='expense', cascade='all, delete-orphan')

class ExpenseShare(db.Model):
    __tablename__ = 'expense_shares'
    id = db.Column(db.Integer, primary_key=True)
    expense_id = db.Column(db.Integer, db.ForeignKey('expenses.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    amount_owed = db.Column(db.Float, nullable=False)
    
    is_settled = db.Column(db.Boolean, default=False)
    settled_at = db.Column(db.DateTime, nullable=True)

    user = db.relationship('User', backref='expense_shares')
