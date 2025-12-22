import streamlit as st
from datetime import date
from utils import add_logo, format_day
import database as db

add_logo()

st.set_page_config(page_title="Atletas", page_icon="🏋️", layout="wide")

st.markdown("# Registo de Atletas")

# Initialize database
if "db_initialized" not in st.session_state:
    if db.init_database():
        st.session_state.db_initialized = True
    else:
        st.error(
            "Erro ao inicializar base de dados. Verifique a ligação ao PostgreSQL."
        )
        st.stop()

# Load athletes from database
athletes = db.get_all_athletes()

st.write("Registe atletas preenchendo o formulário abaixo.")

# Registration Form
with st.form("athlete_registration_form"):
    st.subheader("Informações do Atleta")

    col1, col2 = st.columns(2)

    with col1:
        first_name = st.text_input("Nome*", placeholder="João")
        last_name = st.text_input("Sobrenome*", placeholder="Silva")
        email = st.text_input("Email*", placeholder="atleta@exemplo.com")
        phone = st.text_input("Telefone", placeholder="912345678")

    with col2:
        birth_date = st.date_input(
            "Data de Nascimento*", min_value=date(1920, 1, 1), max_value=date.today()
        )
        gender = st.selectbox(
            "Género",
            ["Masculino", "Feminino", "Outro"],
            index=None,
            placeholder="Escolha uma opção",
        )
        weight = st.number_input("Peso (kg)", min_value=0.0, max_value=300.0, step=0.1)
        height = st.number_input(
            "Altura (cm)", min_value=0.0, max_value=250.0, step=0.1
        )

    st.subheader("Informações Físicas")

    col3, col4 = st.columns(2)

    with col3:
        fitness_level = st.selectbox(
            "Nível de Condição Física",
            [
                "Iniciante",
                "Intermediário",
                "Avançado",
                "Profissional",
            ],
            index=None,
            placeholder="Escolha uma opção",
        )
    with col4:
        goals = st.multiselect(
            "Objetivos de Treino",
            [
                "Perda de Peso",
                "Ganho de Massa Muscular",
                "Força",
                "Resistência",
                "Flexibilidade",
                "Condição Física Geral",
                "Performance Desportiva",
            ],
            placeholder="Escolha uma opção",
        )
    medical_conditions = st.text_area(
        "Condições Médicas / Lesões",
        placeholder="Quaisquer condições médicas ou lesões a ter em consideração...",
    )
    notes = st.text_area(
        "Notas Adicionais", placeholder="Qualquer outra informação relevante..."
    )

    # Submit button
    submitted = st.form_submit_button("Registar Atleta", use_container_width=True)

    if submitted:
        # Validate required fields
        if not all([first_name, last_name, email]):
            st.error("Por favor preencha todos os campos obrigatórios (marcados com *)")
        else:
            # Create athlete record
            athlete_data = {
                "first_name": first_name,
                "last_name": last_name,
                "email": email,
                "phone": phone,
                "birth_date": birth_date,
                "gender": gender,
                "weight": weight if weight > 0 else None,
                "height": height if height > 0 else None,
                "fitness_level": fitness_level,
                "goals": goals,
                "medical_conditions": medical_conditions,
            }

            # Add to database
            athlete_id = db.add_athlete(athlete_data)
            if athlete_id:
                st.success(f"✅ Atleta {first_name} {last_name} registado com sucesso!")
                st.balloons()
                st.rerun()
            else:
                st.error("Erro ao registar atleta. Por favor tente novamente.")

# Display registered athletes
if athletes:
    st.subheader(f"Atletas Registados ({len(athletes)})")

    for athlete in athletes:
        with st.expander(f"{athlete['first_name']} {athlete['last_name']}"):
            col_a, col_b = st.columns(2)

            with col_a:
                st.write(f"**Email:** {athlete['email']}")
                st.write(f"**Telefone:** {athlete['phone'] or 'N/A'}")
                st.write(f"**Data de Nascimento:** {athlete['birth_date']}")
                st.write(f"**Género:** {athlete['gender']}")
                if athlete["weight"]:
                    st.write(f"**Peso:** {athlete['weight']} kg")
                if athlete["height"]:
                    st.write(f"**Altura:** {athlete['height']} cm")

            with col_b:
                st.write(f"**Nível de Condição:** {athlete['fitness_level']}")
                st.write(
                    f"**Objetivos:** {athlete['goals'] if athlete['goals'] else 'N/A'}"
                )
                st.write(f"**Data de Registo:** {format_day(athlete.get('created_at'))}")
            if athlete["medical_conditions"]:
                st.write(f"**Condições Médicas:** {athlete['medical_conditions']}")

            # Delete button
            if st.button("Eliminar Atleta", key=f"delete_{athlete['id']}"):
                if db.delete_athlete(athlete["id"]):
                    st.success("Atleta eliminado com sucesso!")
                    st.rerun()
                else:
                    st.error("Erro ao eliminar atleta.")
