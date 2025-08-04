from flask import Blueprint, request, jsonify
from models import User
from models import db
import re

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()

    if not data.get("email") or not data.get("password") or not data.get("name"):
        return jsonify({"error": "Missing required fields"}), 400

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "User already exists"}), 400
    
    if not is_valid_email(data["email"]):
        return jsonify({"error": "Invalid email format"}), 400

    user = User(
        name=data["name"],
        email=data["email"],
    )
    user.set_password(data["password"])

    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "User created successfully"}), 201

def is_valid_email(email):
    return True if re.match(r'^[a-z0-9]+[\._]?[a-z0-9]+[@]\w+[.]\w+$', email) else False
