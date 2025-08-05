from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Group, User, GroupMember

group_bp = Blueprint('groups', __name__)

@group_bp.route('/create', methods=['POST'])
@jwt_required()
def create_group():
    data = request.get_json()
    name = data.get('name')

    if not name:
        return jsonify({'message': 'Group name is required'}), 400

    creator_id = int(get_jwt_identity())
    new_group = Group(name=name, creator_id=creator_id)

    db.session.add(new_group)
    db.session.commit()

    creator_member = GroupMember(group_id=new_group.id, user_id=creator_id)
    db.session.add(creator_member)
    db.session.commit()

    return jsonify({'message': 'Group created successfully', 'group_id': new_group.id}), 201

@group_bp.route('<int:group_id>/add_member', methods=['POST'])
@jwt_required()
def add_member(group_id):
    data = request.get_json()
    user_email = data.get('email')

    sender_id = int(get_jwt_identity())

    if not user_email:
        return jsonify({"msg": "Email is required"}), 400

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    if group.creator_id != sender_id:
        return jsonify({"msg": "UNA"}), 400

    user = User.query.filter_by(email=user_email).first()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    existing = GroupMember.query.filter_by(group_id=group_id, user_id=user.id).first()
    if existing:
        return jsonify({"msg": "User is already a member"}), 400
    
    new_member = GroupMember(group_id=group_id, user_id=user.id)
    db.session.add(new_member)
    db.session.commit()

    return jsonify({"msg": f"{user.email} added to group {group.name}"}), 200

@group_bp.route('<int:group_id>', methods = ['GET'])
@jwt_required()
def get_group_details(group_id):
    group = Group.query.get(group_id)

    sender_id = int(get_jwt_identity())

    if not group:
        return jsonify({"msg":"Group not found"}), 404
    
    creator = User.query.get(group.creator_id)
    
    if not creator:
        return jsonify({"msg":"Group creator not found"}), 404
    
    member_links = GroupMember.query.filter_by(group_id = group.id).all()
    members = [User.query.get(link.user_id) for link in member_links]

    if sender_id not in [link.user_id for link in member_links]:
        return jsonify({"msg": "Group not found"}), 400

    return jsonify({
        "id": group.id,
        "name": group.name,
        "creator": {
            "id": creator.id,
            "name": creator.name,
            "email": creator.email
        },
        "members": [
            {
                "id": member.id,
                "name": member.name,
                "email": member.email
            } for member in members
        ]
    }), 200

@group_bp.route('<int:group_id>/remove_member/<int:user_id>', methods=['DELETE'])
@jwt_required()
def remove_member(group_id, user_id):
    sender_id = int(get_jwt_identity())
    
    group_creator_id = Group.query.filter_by(id=group_id).first().creator_id

    if sender_id != group_creator_id:
        return jsonify({'msg': 'UNA'}), 404

    membership = GroupMember.query.filter_by(group_id=group_id, user_id=user_id).first()
    if not membership:
        return jsonify({'msg': 'User is not a member of this group'}), 400

    db.session.delete(membership)
    db.session.commit()
    return jsonify({'msg': f'User {user_id} removed from group {group_id}'}), 200

@group_bp.route('/user_groups', methods=['GET'])
@jwt_required()
def get_user_groups():
    user_id = int(get_jwt_identity())
    
    groups = GroupMember.query.filter_by(user_id=user_id).all()

    group_ids = list(set(group.group_id for group in groups))

    return jsonify({"group_ids": group_ids}), 200
