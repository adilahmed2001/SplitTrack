from flask import jsonify, request, Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Expense, ExpenseShare, User, GroupMember
from datetime import datetime
expense_bp = Blueprint('expenses', __name__)

@expense_bp.route('/create/group', methods=['POST'])
@jwt_required()
def create_group_expense():
    data = request.get_json()

    user_id = int(get_jwt_identity())
    description = data.get('description')
    amount = data.get('amount')
    group_id = data.get('group_id')
    split_type = data.get('split_type', 'equal')

    if not all([description, amount, group_id]):
        return jsonify({'error': 'Missing required fields'}), 400

    try:
        amount = float(amount)
    except ValueError:
        return jsonify({'error': 'Invalid amount'}), 400


    group_members = GroupMember.query.filter_by(group_id=group_id).all()
    participant_ids = [member.user_id for member in group_members if member.user_id != user_id]

    if not participant_ids:
        return jsonify({'error': 'No valid participants found in the group'}), 400

    expense = Expense(
        description=description,
        amount=amount,
        paid_by_id=user_id,
        expense_type='group',
        group_id=group_id
    )
    db.session.add(expense)
    db.session.flush()

    if split_type == 'equal':
        share_amount = round(amount / len(group_members), 2)
        for member in group_members:
            if member.user_id == user_id:
                continue  
            share = ExpenseShare(
                expense_id=expense.id,
                user_id=member.user_id,
                amount_owed=share_amount
            )
            db.session.add(share)
    elif split_type == 'you_are_owed':
        share_amount = round(amount / len(participant_ids), 2)
        for participant_id in participant_ids:
            share = ExpenseShare(
                expense_id=expense.id,
                user_id=participant_id,
                amount_owed=share_amount
            )
            db.session.add(share)

    db.session.commit()
    return jsonify({'message': 'Group expense created successfully', 'expense_id': expense.id}), 201

@expense_bp.route('/create/individual', methods=['POST'])
@jwt_required()
def create_individual_expense():
    data = request.get_json()

    user_id = int(get_jwt_identity())
    description = data.get('description')
    amount = data.get('amount')
    participant_email = data.get('participant_email')
    split_type = data.get('split_type', 'equal')

    if not all([description, amount, participant_email]):
        return jsonify({'error': 'Missing required fields'}), 400

    try:
        amount = float(amount)
    except ValueError:
        return jsonify({'error': 'Invalid amount'}), 400

    participant_user = User.query.filter_by(email=participant_email).first()
    if not participant_user:
        return jsonify({'error': f'Participant with email {participant_email} not found'}), 404
    participant_id = participant_user.id

    expense = Expense(
        description=description,
        amount=amount,
        paid_by_id=user_id,
        expense_type='individual'
    )
    db.session.add(expense)
    db.session.flush()

    if split_type == 'equal':
        share_amount = round(amount / 2, 2)
        # Only add ExpenseShare for the other participant (not the payer)
        share = ExpenseShare(expense_id=expense.id, user_id=participant_id, amount_owed=share_amount)
        db.session.add(share)
    elif split_type == 'you_are_owed':
        share = ExpenseShare(
            expense_id=expense.id,
            user_id=participant_id,
            amount_owed=amount
        )
        db.session.add(share)

    db.session.commit()
    return jsonify({'message': 'Individual expense created successfully', 'expense_id': expense.id}), 201

@expense_bp.route('/owed_to', methods=['GET'])
@jwt_required()
def get_expenses_owed_to():
    user_id = int(get_jwt_identity())

    expenses_paid_by_user = Expense.query.filter_by(paid_by_id=user_id).all()

    unsettled_shares = []

    for expense in expenses_paid_by_user:
        for share in expense.shares:
            if share.is_settled:
                continue

            owed_user = User.query.get(share.user_id)

            unsettled_shares.append({
                "expense_id": expense.id,
                "description": expense.description,
                "amount_owed": share.amount_owed,
                "owed_by_user": share.user_id,
                "owed_by_name": owed_user.name,
                "owed_by_email": owed_user.email,
                "expense_type": expense.expense_type,
                "group_id": expense.group_id if expense.expense_type == 'group' else None
            })

    return jsonify({"unsettled_shares": unsettled_shares}), 200

@expense_bp.route('/owed_by', methods=['GET'])
@jwt_required()
def get_expenses_owed_by():
    user_id = int(get_jwt_identity())

    shares = (
        db.session.query(ExpenseShare)
        .join(Expense, ExpenseShare.expense_id == Expense.id)
        .filter(ExpenseShare.user_id == user_id, Expense.paid_by_id != user_id, ExpenseShare.is_settled == False)
        .all()
    )

    unsettled_shares = []

    for share in shares:
        expense = share.expense
        paid_user = User.query.get(expense.paid_by_id)

        unsettled_shares.append({
            "expense_id": expense.id,
            "description": expense.description,
            "amount_owed_by_me": share.amount_owed,
            "paid_by": expense.paid_by_id,
            "paid_by_name": paid_user.name,
            "paid_by_email": paid_user.email,
            "expense_type": expense.expense_type,
            "group_id": expense.group_id if expense.expense_type == 'group' else None
        })

    return jsonify({"unsettled_shares": unsettled_shares}), 200

@expense_bp.route('/<int:group_id>/details', methods=['GET'])
@jwt_required()
def get_group_expense_details(group_id):
    user_id = int(get_jwt_identity())

    group_member = GroupMember.query.filter_by(group_id=group_id, user_id=user_id).first()
    if not group_member:
        return jsonify({"error": "Unauthorized access to this group"}), 403

    expenses = Expense.query.filter_by(group_id=group_id).all()

    if not expenses:
        return jsonify({"error": "No expenses found for this group"}), 200

    group_expenses = []
    total_owed = 0
    total_owes = 0

    for expense in expenses:
        participants = [
            {
                "user_id": share.user_id,
                "name": User.query.get(share.user_id).name,
                "amount_owed": share.amount_owed,
                "is_settled": share.is_settled
            }
            for share in expense.shares
        ]

        if all(share['is_settled'] for share in participants):
            continue

        for share in expense.shares:
            if share.user_id == user_id and not share.is_settled:
                total_owes += share.amount_owed
            elif expense.paid_by_id == user_id and not share.is_settled:
                total_owed += share.amount_owed

        payer = User.query.get(expense.paid_by_id)

        group_expenses.append({
            "expense_id": expense.id,
            "description": expense.description,
            "amount": expense.amount,
            "paid_by": {
                "user_id": expense.paid_by_id,
                "name": payer.name,
                "email": payer.email
            },
            "participants": participants,
            "expense_type": expense.expense_type
        })

    return jsonify({
        "group_expenses": group_expenses,
        "total_owed": total_owed,
        "total_owes": total_owes
    }), 200

@expense_bp.route('/active_expenses', methods=['GET'])
@jwt_required()
def get_active_expenses():
    user_id = int(get_jwt_identity())

    expenses_paid_by_user = Expense.query.filter_by(paid_by_id=user_id).all()

    shares = (
        db.session.query(ExpenseShare)
        .join(Expense, ExpenseShare.expense_id == Expense.id)
        .filter(ExpenseShare.user_id == user_id, ExpenseShare.is_settled == False)
        .all()
    )

    active_expenses = []

    for expense in expenses_paid_by_user:
        for share in expense.shares:
            if share.is_settled:
                continue

            owed_user = User.query.get(share.user_id)

            active_expenses.append({
                "expense_id": expense.id,
                "description": expense.description,
                "amount": share.amount_owed,
                "type": expense.expense_type,
                "user": {
                    "name": owed_user.name,
                    "email": owed_user.email
                },
                "role": "payer"
            })

    for share in shares:
        expense = share.expense
        paid_user = User.query.get(expense.paid_by_id)

        active_expenses.append({
            "expense_id": expense.id,
            "description": expense.description,
            "amount": share.amount_owed,
            "type": expense.expense_type,
            "user": {
                "name": paid_user.name,
                "email": paid_user.email
            },
            "role": "participant"
        })

    return jsonify({"active_expenses": active_expenses}), 200

@expense_bp.route('/settle', methods=['POST'])
@jwt_required()
def settle_expense():
    data = request.get_json()

    current_user_id = int(get_jwt_identity())
    expense_id = int(data.get('expense_id'))
    amount = float(data.get('amount'))

    if not all([expense_id, amount is not None]):
        return jsonify({"error": "Missing required fields"}), 400

    if amount <= 0:
        return jsonify({"error": "Amount must be positive"}), 400

    expense = Expense.query.get(expense_id)
    if not expense:
        return jsonify({"error": "Expense not found"}), 404

    share = ExpenseShare.query.filter_by(expense_id=expense_id, user_id=current_user_id).first()
    if not share:
        return jsonify({"error": "Expense share not found for the user"}), 404

    if share.is_settled:
        return jsonify({"message": "Already settled"}), 200

    if amount > share.amount_owed:
        return jsonify({"error": "Amount exceeds amount owed"}), 400

    share.amount_owed -= amount

    if share.amount_owed == 0:
        share.is_settled = True
        share.settled_at = datetime.utcnow()

    db.session.commit()

    if share.is_settled:
        expense.update_settlement_status()
        db.session.commit()

    return jsonify({
        "message": "Payment recorded",
        "remaining_owed": share.amount_owed,
        "is_settled": share.is_settled
    }), 200

@expense_bp.route('/settled_history', methods=['GET'])
@jwt_required()
def get_settled_expense_history():
    user_id = int(get_jwt_identity())

    # Query for settled shares of the current user, sorted by settlement date (newer to older)
    settled_shares = (
        ExpenseShare.query
        .filter_by(user_id=user_id, is_settled=True)
        .order_by(ExpenseShare.settled_at.desc())
        .all()
    )

    settled_expenses = []

    for share in settled_shares:
        expense = share.expense
        paid_user = User.query.get(expense.paid_by_id)

        settled_expenses.append({
            "expense_id": expense.id,
            "description": expense.description,
            "amount": share.amount_owed,
            "settled_at": share.settled_at,
            "paid_by": {
                "user_id": expense.paid_by_id,
                "name": paid_user.name,
                "email": paid_user.email
            },
            "expense_type": expense.expense_type,
            "group_id": expense.group_id if expense.expense_type == 'group' else None
        })

    return jsonify({"settled_expenses": settled_expenses}), 200

@expense_bp.route('/balance', methods=['GET'])
@jwt_required()
def get_user_balance():
    user_id = int(get_jwt_identity())

    total_owe = (
        db.session.query(db.func.sum(ExpenseShare.amount_owed))
        .join(Expense, ExpenseShare.expense_id == Expense.id)
        .filter(ExpenseShare.user_id == user_id, ExpenseShare.is_settled == False)
        .scalar() or 0.0
    )

    total_owed = (
        db.session.query(db.func.sum(ExpenseShare.amount_owed))
        .join(Expense, ExpenseShare.expense_id == Expense.id)
        .filter(Expense.paid_by_id == user_id, ExpenseShare.is_settled == False)
        .scalar() or 0.0
    )

    # Calculate net balance
    total_balance = total_owed - total_owe

    return jsonify({
        "total_owe": total_owe,
        "total_owed": total_owed,
        "total_balance": total_balance
    }), 200
