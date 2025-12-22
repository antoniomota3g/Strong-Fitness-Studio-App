import streamlit as st
from utils import add_logo, format_day
import database as db

add_logo()

st.set_page_config(page_title="Exercícios", page_icon="💪", layout="wide")

st.markdown("# Registo de Exercícios")

# Initialize database
if "db_initialized" not in st.session_state:
    if db.init_database():
        st.session_state.db_initialized = True
    else:
        st.error("Erro ao inicializar base de dados.")
        st.stop()

# Load exercises from database
exercises = db.get_all_exercises()

st.write("Registe exercícios para construir sua biblioteca de exercícios.")

# Registration Form
with st.form("exercise_registration_form"):
    st.subheader("Informações do Exercício")

    col1, col2 = st.columns(2)

    with col1:
        exercise_name = st.text_input(
            "Nome do Exercício*", placeholder="ex: Agachamento com Barra"
        )
        category = st.selectbox(
            "Categoria*",
            [
                "Força",
                "Cardio",
                "Flexibilidade",
                "Equilíbrio",
                "Pliometria",
                "Funcional",
                "Levantamento Olímpico",
            ],
            index=None,
            placeholder="Escolha uma opção",
        )
        muscle_groups = st.multiselect(
            "Grupos Musculares Principais*",
            [
                "Peito",
                "Costas",
                "Ombros",
                "Bíceps",
                "Tríceps",
                "Antebraços",
                "Core/Abdominais",
                "Quadríceps",
                "Isquiotibiais",
                "Glúteos",
                "Gémeos",
                "Corpo Inteiro",
            ],
            placeholder="Escolha uma opção",
        )
        difficulty = st.selectbox(
            "Nível de Dificuldade*",
            ["Iniciante", "Intermediário", "Avançado", "Especialista"],
            index=None,
            placeholder="Escolha uma opção",
        )

    with col2:
        equipment = st.multiselect(
            "Equipamento Necessário",
            [
                "Nenhum (Peso Corporal)",
                "Barbell",
                "Dumbbells",
                "Kettlebell",
                "Resistance Bands",
                "Cable Machine",
                "Banco",
                "Pull-up Bar",
                "Medicine Ball",
                "TRX",
                "Smith Machine",
                "Leg Press Machine",
                "Outra Máquina",
            ],
            placeholder="Escolha uma opção",
        )
        exercise_type = st.selectbox(
            "Tipo de Exercício",
            ["Composto", "Isolamento", "Cardio", "Alongamento"],
            index=None,
            placeholder="Escolha uma opção",
        )
        sets_range = st.text_input("Séries Recomendadas", 3, placeholder="ex: 3")
        reps_range = st.text_input("Repetições Recomendadas", 10, placeholder="ex: 10")

    st.subheader("Detalhes do Exercício")

    description = st.text_area(
        "Descrição",
        placeholder="Breve descrição do exercício...",
        help="Forneça uma visão geral clara do que o exercício envolve",
    )

    instructions = st.text_area(
        "Instruções",
        placeholder="Instruções passo a passo:\n1. Posição inicial...\n2. Movimento...",
        help="Guia detalhado passo a passo para execução correta",
    )

    tips = st.text_area(
        "Dicas & Erros Comuns",
        placeholder="Dicas importantes e erros comuns a evitar...",
        help="Dicas de segurança, pistas de forma correta e erros a observar",
    )

    video_url = st.text_input(
        "URL do Vídeo", placeholder="https://youtube.com/watch?v=..."
    )

    # Submit button
    submitted = st.form_submit_button("Registar Exercício", use_container_width=True)

    if submitted:
        # Validate required fields
        if not all([exercise_name, category, difficulty, muscle_groups]):
            st.error("Por favor preencha todos os campos obrigatórios (marcados com *)")
        else:
            # Create exercise record
            exercise_data = {
                "name": exercise_name,
                "category": category,
                "muscle_groups": ", ".join(muscle_groups),
                "equipment": ", ".join(equipment) if equipment else "",
                "difficulty": difficulty,
                "description": description,
                "instructions": instructions,
                "video_url": video_url,
            }

            # Add to database
            exercise_id = db.add_exercise(exercise_data)
            if exercise_id:
                st.success(f"✅ Exercício '{exercise_name}' registado com sucesso!")
                st.balloons()
                st.rerun()
            else:
                st.error("Erro ao registar exercício.")

# Display registered exercises
if exercises:
    st.divider()
    st.subheader(f"Biblioteca de Exercícios ({len(exercises)})")

    # Filter options
    col_filter1, col_filter2, col_filter3 = st.columns(3)
    with col_filter1:
        filter_category = st.selectbox(
            "Filtrar por Categoria",
            ["Todos"]
            + [
                "Força",
                "Cardio",
                "Flexibilidade",
                "Equilíbrio",
                "Pliometria",
                "Funcional",
                "Levantamento Olímpico",
            ],
            index=0,
            placeholder="Escolha uma opção",
            key="filter_cat",
        )
    with col_filter2:
        filter_difficulty = st.selectbox(
            "Filtrar por Dificuldade",
            ["Todos", "Iniciante", "Intermediário", "Avançado", "Especialista"],
            index=0,
            placeholder="Escolha uma opção",
            key="filter_diff",
        )
    with col_filter3:
        filter_muscle = st.selectbox(
            "Filtrar por Grupo Muscular",
            [
                "Todos",
                "Peito",
                "Costas",
                "Ombros",
                "Bíceps",
                "Tríceps",
                "Antebraços",
                "Core/Abdominais",
                "Quadríceps",
                "Isquiotibiais",
                "Glúteos",
                "Gémeos",
                "Corpo Inteiro",
            ],
            index=0,
            placeholder="Escolha uma opção",
            key="filter_muscle",
        )

    # Apply filters
    filtered_exercises = exercises
    if filter_category != "Todos":
        filtered_exercises = [
            ex for ex in filtered_exercises if ex["category"] == filter_category
        ]
    if filter_difficulty != "Todos":
        filtered_exercises = [
            ex for ex in filtered_exercises if ex["difficulty"] == filter_difficulty
        ]
    if filter_muscle != "Todos":
        filtered_exercises = [
            ex
            for ex in filtered_exercises
            if filter_muscle in ex.get("muscle_groups", "")
        ]

    st.write(f"A mostrar {len(filtered_exercises)} exercício(s)")

    for exercise in exercises:
        # Skip if filtered out
        if exercise not in filtered_exercises:
            continue

        with st.expander(
            f"💪 {exercise['name']} - {exercise['category']} ({exercise['difficulty']})"
        ):
            col_a, col_b = st.columns(2)

            with col_a:
                st.write(f"**Categoria:** {exercise['category']}")
                st.write(f"**Dificuldade:** {exercise['difficulty']}")
                muscle_groups_str = exercise.get("muscle_groups", "")
                st.write(f"**Grupos Musculares:** {muscle_groups_str}")
                equipment_str = exercise.get("equipment", "")
                if equipment_str:
                    st.write(f"**Equipamento:** {equipment_str}")
                else:
                    st.write("**Equipamento:** Nenhum necessário")

            with col_b:
                if exercise.get("exercise_type"):
                    st.write(f"**Tipo:** {exercise['exercise_type']}")
                st.write(f"**Criado em:** {format_day(exercise.get('created_at'))}")

            if exercise.get("description"):
                st.write(f"**Descrição:** {exercise['description']}")

            if exercise.get("instructions"):
                st.write("**Instruções:**")
                st.text(exercise["instructions"])

            if exercise.get("video_url"):
                st.write(
                    f"**Video:** [{exercise['video_url']}]({exercise['video_url']})"
                )

            # Delete button
            if st.button("Eliminar Exercício", key=f"delete_{exercise['id']}"):
                if db.delete_exercise(exercise["id"]):
                    st.success("Exercício eliminado com sucesso!")
                    st.rerun()
                else:
                    st.error("Erro ao eliminar exercício.")
