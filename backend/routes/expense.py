from flask import jsonify, request, Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Expense, ExpenseShare, User, GroupMember
from datetime import datetime
expense_bp = Blueprint('expenses', __name__)

@expense_bp.route('/', methods = ["POST"])
@jwt_required()
def create_expense():
    data = request.get_json()

    description = data.get('description')
    amount = data.get('amount')
    paid_by_id = data.get('paid_by_id')
    expense_type = data.get('expense_type')
    participant_ids = data.get('participant_ids') 
    group_id = data.get('group_id') if expense_type == 'group' else None

    if not all([description, amount, paid_by_id, expense_type, participant_ids]):
        return jsonify({'error': 'Missing required fields'}), 400

    try:
        amount = float(amount)
    except ValueError:
        return jsonify({'error': 'Invalid amount'}), 400

    expense = Expense(
        description=description,
        amount=amount,
        paid_by_id=paid_by_id,
        expense_type=expense_type,
        group_id=group_id
    )
    db.session.add(expense)
    db.session.flush()

    share_amount = round(amount / len(participant_ids), 2)

    for user_id in participant_ids:
        share = ExpenseShare(
            expense_id=expense.id,
            user_id=user_id,
            amount_owed=share_amount
        )
        db.session.add(share)

    db.session.commit()
    return jsonify({'message': 'Expense created successfully', 'expense_id': expense.id}), 201

@expense_bp.route('/owed_to', methods=['GET'])
@jwt_required()
def get_expenses_owed_to():
    user_id = int(get_jwt_identity())

    expenses_paid_by_user = Expense.query.filter_by(paid_by_id=user_id).all()

    individual_owed = []
    group_owed = []

    for expense in expenses_paid_by_user:
        for share in expense.shares:
            if share.user_id == user_id:
                continue

            owed_user = User.query.get(share.user_id)

            data = {
                "expense_id": expense.id,
                "description": expense.description,
                "amount_owed": share.amount_owed,
                "owed_by_user": share.user_id,
                "owed_by_name": owed_user.name,
                "owed_by_email": owed_user.email,
            }

            if expense.expense_type == 'individual':
                individual_owed.append(data)
            elif expense.expense_type == 'group':
                data["group_id"] = expense.group_id
                group_owed.append(data)

    return jsonify({
        "individual": individual_owed,
        "group": group_owed
    }), 200

@expense_bp.route('/owed_by', methods=['GET'])
@jwt_required()
def get_expenses_owed_by():
    user_id = int(get_jwt_identity())

    shares = (
        db.session.query(ExpenseShare)
        .join(Expense, ExpenseShare.expense_id == Expense.id)
        .filter(ExpenseShare.user_id == user_id, Expense.paid_by_id != user_id)
        .all()
    )

    individual_owed_by = []
    group_owed_by = []

    for share in shares:
        expense = share.expense
        paid_user = User.query.get(expense.paid_by_id)

        data = {
            "expense_id": expense.id,
            "description": expense.description,
            "amount_owed_by_me": share.amount_owed,
            "paid_by": expense.paid_by_id,
            "paid_by_name": paid_user.name,
            "paid_by_email": paid_user.email,
        }

        if expense.expense_type == 'individual':
            individual_owed_by.append(data)
        elif expense.expense_type == 'group':
            data["group_id"] = expense.group_id
            group_owed_by.append(data)

    return jsonify({
        "individual": individual_owed_by,
        "group": group_owed_by
    }), 200

@expense_bp.route('/settle', methods=['POST'])
@jwt_required()
def settle_expense():
    data = request.get_json()
    expense_id = int(data.get('expense_id'))
    user_id = int(data.get('user_id'))
    amount = float(data.get('amount'))

    if not all([expense_id, user_id, amount is not None]):
        return jsonify({"error": "Missing required fields"}), 400

    if amount <= 0:
        return jsonify({"error": "Amount must be positive"}), 400

    share = ExpenseShare.query.filter_by(expense_id=expense_id, user_id=user_id).first()

    if not share:
        return jsonify({"error": "Expense share not found"}), 404

    if share.is_settled:
        return jsonify({"message": "Already settled"}), 200

    if amount > share.amount_owed:
        return jsonify({"error": "Amount exceeds amount owed"}), 400

    share.amount_owed -= amount

    if share.amount_owed == 0:
        share.is_settled = True
        share.settled_at = datetime.utcnow()

    db.session.commit()

    return jsonify({
        "message": "Payment recorded",
        "remaining_owed": share.amount_owed,
        "is_settled": share.is_settled
    }), 200
