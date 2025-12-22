import streamlit as st
from PIL import Image
from pathlib import Path
import base64
from datetime import date, datetime


def add_logo():
    logo_path = Path("images/logo.png")
    with open(logo_path, "rb") as f:
        encoded_logo = base64.b64encode(f.read()).decode()
    st.markdown(
        f"""
        <style>
            [data-testid="stSidebarNav"] {{
                background-image: url("data:image/png;base64,{encoded_logo}");
                background-repeat: no-repeat;
                padding-top: 200px;
                background-position: 95px 40px;
            }}
            [data-testid="stSidebarNav"]::before {{
                content: "Strong Fitness Studio";
                margin-left: 35px;
                font-size: 30px;
                position: relative;
            }}
        </style>
        """,
        unsafe_allow_html=True,
    )


def format_day(value):
    """Format date/datetime values as date-only (YYYY-MM-DD)."""
    if value is None or value == "":
        return "N/A"

    if isinstance(value, datetime):
        return value.date().isoformat()

    if isinstance(value, date):
        return value.isoformat()

    if isinstance(value, str):
        # Common DB string representations: 'YYYY-MM-DD ...'
        if len(value) >= 10 and value[4] == "-" and value[7] == "-":
            return value[:10]
        try:
            return datetime.fromisoformat(value).date().isoformat()
        except Exception:
            return value

    return str(value)