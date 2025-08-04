from flask import Flask
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from config import DevelopmentConfig
from models import db

migrate = Migrate()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)
    app.config.from_object(DevelopmentConfig)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    # Import and register blueprints
    from routes.auth import auth_bp
    #from routes.group import group_bp
    #from routes.expense import expense_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    #app.register_blueprint(group_bp, url_prefix="/api/groups")
    #app.register_blueprint(expense_bp, url_prefix="/api/expenses")

    return app

app = create_app()

if __name__ == "__main__":
    app.run()
