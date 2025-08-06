from flask import Blueprint, request, jsonify
from models import User, db
import re
from flask_jwt_extended import create_access_token

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()

    if not data.get("email") or not data.get("password") or not data.get("name"):
        return jsonify({"error": "Missing required fields"}), 400

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "User already exists"}), 400
    
    is_valid_email = lambda email: re.match(r"[^@]+@[^@]+\.[^@]+", email)

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

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'message': 'Email and password are required'}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({'message': 'Invalid email or password'}), 401

    access_token = create_access_token(identity=str(user.id))
    return jsonify({'token': access_token, 'user': {'id': user.id, 'email': user.email, 'name': user.name}})
