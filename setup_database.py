#!/usr/bin/env python3
"""
Database setup script for Strong Fitness Studio
Run this script to create the PostgreSQL database and tables
"""

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Configuration
DB_NAME = "strong_fitness_studio_app"
DB_USER = "strong_fitness_studio_app_user"
DB_PASSWORD = "N3XLkrv2bbyBugsuOnIql2CpBEFXcZCG"
DB_HOST = "dpg-d4ujqkmr433s73dlk2rg-a.frankfurt-postgres.render.com"
DB_PORT = 5432

def create_database():
    """Create the fitness_studio database if it doesn't exist"""
    try:
        # Connect to default postgres database
        conn = psycopg2.connect(
            dbname="postgres",
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
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
        print("   - Database credentials are correct in setup_database.py")
        print("   - You have permission to create databases")
