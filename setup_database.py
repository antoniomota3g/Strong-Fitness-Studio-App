#!/usr/bin/env python3
"""
Database setup script for Strong Fitness Studio
Run this script to create the PostgreSQL database and tables
"""

import os

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def _get_db_admin_connection_params():
    """Get connection params for creating the database.

    Prefers DATABASE_URL_ADMIN (recommended for managed Postgres), otherwise uses
    DB_* env vars. If neither are set, defaults to local Postgres.
    """
    database_url_admin = os.environ.get("DATABASE_URL_ADMIN")
    if database_url_admin:
        return {"DATABASE_URL_ADMIN": database_url_admin}

    return {
        "dbname": os.environ.get("DB_ADMIN_DB", "postgres"),
        "user": os.environ.get("DB_USER", "postgres"),
        "password": os.environ.get("DB_PASSWORD", "postgres"),
        "host": os.environ.get("DB_HOST", "localhost"),
        "port": int(os.environ.get("DB_PORT", "5432")),
    }


DB_NAME = os.environ.get("DB_NAME", "strong_fitness_studio_app")

def create_database():
    """Create the fitness_studio database if it doesn't exist"""
    try:
        params = _get_db_admin_connection_params()
        if "DATABASE_URL_ADMIN" in params:
            conn = psycopg2.connect(params["DATABASE_URL_ADMIN"])
        else:
            conn = psycopg2.connect(**params)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        # Check if database exists
        cur.execute(f"SELECT 1 FROM pg_database WHERE datname = '{DB_NAME}'")
        exists = cur.fetchone()
        
        if not exists:
            cur.execute(f"CREATE DATABASE {DB_NAME}")
            print(f"✅ Database '{DB_NAME}' created successfully!")
        else:
            print(f"ℹ️  Database '{DB_NAME}' already exists.")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error creating database: {e}")
        return False
    
    return True

def create_tables():
    """Create all required tables"""
    try:
        from database import init_database
        
        if init_database():
            print("✅ All tables created successfully!")
            return True
        else:
            print("❌ Error creating tables")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🏋️  Strong Fitness Studio - Database Setup")
    print("=" * 50)
    
    print("\n📊 Creating database...")
    if create_database():
        print("\n📋 Creating tables...")
        create_tables()
        print("\n✅ Setup complete! You can now run your Streamlit app.")
        print("\n💡 To start the app, run:")
        print("   streamlit run 🏠_Homepage.py")
    else:
        print("\n❌ Setup failed. Please check your PostgreSQL configuration.")
        print("\n💡 Make sure:")
        print("   - PostgreSQL is running")
        print("   - Database credentials are set via env vars (DB_HOST/DB_NAME/DB_USER/DB_PASSWORD) or DATABASE_URL_ADMIN")
        print("   - You have permission to create databases")
