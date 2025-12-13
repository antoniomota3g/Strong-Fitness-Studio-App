import streamlit as st
from PIL import Image
from pathlib import Path
import base64


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