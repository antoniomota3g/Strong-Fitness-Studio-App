import streamlit as st
from datetime import date
from utils import add_logo

add_logo()

st.set_page_config(page_title="Exercícios", page_icon="💪", layout="wide")

st.markdown("# Registo de Exercícios")

# Initialize session state for storing exercises if not exists
if 'exercises' not in st.session_state:
    st.session_state.exercises = []

st.write("Registe exercícios para construir sua biblioteca de exercícios.")

# Registration Form
with st.form("exercise_registration_form"):
    st.subheader("Informações do Exercício")
    
    col1, col2 = st.columns(2)
    
    with col1:
        exercise_name = st.text_input("Nome do Exercício*", placeholder="ex: Agachamento com Barra")
        category = st.selectbox("Categoria*", 
                               ["Selecionar", "Força", "Cardio", "Flexibilidade", "Equilíbrio", 
                                "Pliometria", "Funcional", "Levantamento Olímpico"])
        muscle_groups = st.multiselect("Grupos Musculares Principais*", 
                                      ["Peito", "Costas", "Ombros", "Bíceps", "Tríceps", 
                                       "Antebraços", "Core/Abdominais", "Quadríceps", "Isquiotibiais", 
                                       "Glúteos", "Gémeos", "Corpo Inteiro"])
        difficulty = st.selectbox("Nível de Dificuldade*", 
                                 ["Selecionar", "Iniciante", "Intermediário", "Avançado", "Especialista"])
    
    with col2:
        equipment = st.multiselect("Equipamento Necessário", 
                                  ["Nenhum (Peso Corporal)", "Barbell", "Dumbbells", "Kettlebell", 
                                   "Resistance Bands", "Cable Machine", "Banco", "Pull-up Bar", 
                                   "Medicine Ball", "TRX", "Smith Machine", "Leg Press Machine", 
                                   "Outra Máquina"])
        exercise_type = st.selectbox("Tipo de Exercício", 
                                    ["Selecionar", "Composto", "Isolamento", "Cardio", "Alongamento"])
        sets_range = st.text_input("Séries Recomendadas", placeholder="ex: 3-4")
        reps_range = st.text_input("Repetições Recomendadas", placeholder="ex: 8-12")
    
    st.subheader("Detalhes do Exercício")
    
    description = st.text_area("Descrição", 
                              placeholder="Breve descrição do exercício...",
                              help="Forneça uma visão geral clara do que o exercício envolve")
    
    instructions = st.text_area("Instruções", 
                               placeholder="Instruções passo a passo:\n1. Posição inicial...\n2. Movimento...\n3. Retornar ao início...",
                               help="Guia detalhado passo a passo para execução correta")
    
    tips = st.text_area("Dicas & Erros Comuns", 
                       placeholder="Dicas importantes e erros comuns a evitar...",
                       help="Dicas de segurança, pistas de forma correta e erros a observar")
    
    video_url = st.text_input("URL do Vídeo", 
                             placeholder="https://youtube.com/watch?v=...")
    
    # Submit button
    submitted = st.form_submit_button("Registar Exercício", use_container_width=True)
    
    if submitted:
        # Validate required fields
        if not exercise_name:
            st.error("Por favor preencha todos os campos obrigatórios (marcados com *)")
        elif category == "Selecionar" or difficulty == "Selecionar":
            st.error("Por favor selecione opções válidas para Categoria e Nível de Dificuldade")
        elif not muscle_groups:
            st.error("Por favor selecione pelo menos um grupo muscular principal")
        else:
            # Create exercise record
            exercise = {
                "name": exercise_name,
                "category": category,
                "muscle_groups": muscle_groups,
                "difficulty": difficulty,
                "equipment": equipment,
                "exercise_type": exercise_type if exercise_type != "Select" else None,
                "sets_range": sets_range,
                "reps_range": reps_range,
                "description": description,
                "instructions": instructions,
                "tips": tips,
                "video_url": video_url,
                "created_date": date.today()
            }
            
            # Add to session state
            st.session_state.exercises.append(exercise)
            st.success(f"✅ Exercício '{exercise_name}' registado com sucesso!")
            st.balloons()

# Display registered exercises
if st.session_state.exercises:
    st.divider()
    st.subheader(f"Biblioteca de Exercícios ({len(st.session_state.exercises)})")
    
    # Filter options
    col_filter1, col_filter2, col_filter3 = st.columns(3)
    with col_filter1:
        filter_category = st.selectbox("Filtrar por Categoria", 
                                      ["Todos"] + ["Força", "Cardio", "Flexibilidade", "Equilíbrio", 
                                                 "Pliometria", "Funcional", "Levantamento Olímpico"],
                                      key="filter_cat")
    with col_filter2:
        filter_difficulty = st.selectbox("Filtrar por Dificuldade", 
                                        ["Todos", "Iniciante", "Intermediário", "Avançado", "Especialista"],
                                        key="filter_diff")
    with col_filter3:
        filter_muscle = st.selectbox("Filtrar por Grupo Muscular", 
                                    ["Todos", "Peito", "Costas", "Ombros", "Bíceps", "Tríceps", 
                                     "Antebraços", "Core/Abdominais", "Quadríceps", "Isquiotibiais", 
                                     "Glúteos", "Gémeos", "Corpo Inteiro"],
                                    key="filter_muscle")
    
    # Apply filters
    filtered_exercises = st.session_state.exercises
    if filter_category != "Todos":
        filtered_exercises = [ex for ex in filtered_exercises if ex['category'] == filter_category]
    if filter_difficulty != "Todos":
        filtered_exercises = [ex for ex in filtered_exercises if ex['difficulty'] == filter_difficulty]
    if filter_muscle != "Todos":
        filtered_exercises = [ex for ex in filtered_exercises if filter_muscle in ex['muscle_groups']]
    
    st.write(f"A mostrar {len(filtered_exercises)} exercício(s)")
    
    for idx, exercise in enumerate(st.session_state.exercises):
        # Skip if filtered out
        if exercise not in filtered_exercises:
            continue
            
        with st.expander(f"💪 {exercise['name']} - {exercise['category']} ({exercise['difficulty']})"):
            col_a, col_b = st.columns(2)
            
            with col_a:
                st.write(f"**Categoria:** {exercise['category']}")
                st.write(f"**Dificuldade:** {exercise['difficulty']}")
                st.write(f"**Grupos Musculares:** {', '.join(exercise['muscle_groups'])}")
                if exercise['equipment']:
                    st.write(f"**Equipamento:** {', '.join(exercise['equipment'])}")
                else:
                    st.write(f"**Equipamento:** Nenhum necessário")
            
            with col_b:
                if exercise['exercise_type']:
                    st.write(f"**Tipo:** {exercise['exercise_type']}")
                if exercise['sets_range']:
                    st.write(f"**Séries:** {exercise['sets_range']}")
                if exercise['reps_range']:
                    st.write(f"**Repetições:** {exercise['reps_range']}")
                st.write(f"**Criado em:** {exercise['created_date']}")
            
            st.write(f"**Descrição:** {exercise['description']}")
            
            if exercise['instructions']:
                st.write(f"**Instruções:**")
                st.text(exercise['instructions'])
            
            if exercise['tips']:
                st.write(f"**Dicas & Erros Comuns:**")
                st.text(exercise['tips'])
            
            if exercise['video_url']:
                st.write(f"**Video:** [{exercise['video_url']}]({exercise['video_url']})")
            
            # Delete button
            if st.button(f"Eliminar Exercício", key=f"delete_{idx}"):
                st.session_state.exercises.pop(idx)
                st.rerun()
    
    # Clear all button
    if st.button("Limpar Todos os Exercícios", type="secondary"):
        st.session_state.exercises = []
        st.rerun()
