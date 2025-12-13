import streamlit as st
from PIL import Image
from pathlib import Path
import base64
from utils import add_logo

add_logo()

st.set_page_config(
    page_title="Strong Fitness Studio",
    page_icon=Image.open("./images/logo.png"),
    layout="wide"
)

st.markdown("# 💪 Strong Fitness Studio <span style='display:inline-block; transform: scaleX(-1);'>💪</span>", unsafe_allow_html=True)

st.markdown(
    """
    ### Sistema de Gestão de Treinos
    
    Bem-vindo ao sistema de gestão de treinos do Strong Fitness Studio!
    
    **👈 Selecione uma página na barra lateral** para começar:
    
    - **🏋️ Atletas** - Registar e gerir atletas
    - **💪 Exercícios** - Biblioteca de exercícios
    - **📝 Plano de Treino** - Criar e agendar sessões de treino
    - **📅 Calendário de Treinos** - Visualizar todas as sessões
    - **📋 Treino** - Acompanhar treinos em tempo real
    - **📊 Análise** - Análise de performance e progresso
    - **🔍 Avaliação** - Acompanhamento de composição corporal
    
    ---
    
    ### Funcionalidades Principais
    
    ✅ Gestão completa de atletas e exercícios  
    ✅ Agendamento de sessões de treino personalizadas  
    ✅ Calendário visual com todas as sessões  
    ✅ Acompanhamento em tempo real durante o treino  
    ✅ Análise de performance e evolução  
    ✅ Avaliações de composição corporal  
    """
)
