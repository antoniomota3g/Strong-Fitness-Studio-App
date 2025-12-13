import streamlit as st
from datetime import date, datetime
from utils import add_logo

add_logo()

st.set_page_config(page_title="Sessão de Treino", page_icon="📝", layout="wide")

st.markdown("# Sessão de Treino")

# Initialize session state
if 'athletes' not in st.session_state:
    st.session_state.athletes = []
if 'exercises' not in st.session_state:
    st.session_state.exercises = []
if 'training_sessions' not in st.session_state:
    st.session_state.training_sessions = []
if 'editing_session_idx' not in st.session_state:
    st.session_state.editing_session_idx = None

# Check if there are athletes and exercises registered
if not st.session_state.athletes:
    st.warning("⚠️ Ainda não há atletas registados. Por favor registe atletas primeiro na página de Atletas.")
    st.stop()

if not st.session_state.exercises:
    st.warning("⚠️ Ainda não há exercícios registados. Por favor registe exercícios primeiro na página de Exercícios.")
    st.stop()

st.write("Crie uma sessão de treino selecionando um atleta e adicionando exercícios.")

# Check if editing mode
editing_mode = st.session_state.editing_session_idx is not None and len(st.session_state.training_sessions) > 0
if editing_mode:
    st.info(f"✏️ A editar sessão: {st.session_state.training_sessions[st.session_state.editing_session_idx]['session_name']}")
    existing_session = st.session_state.training_sessions[st.session_state.editing_session_idx]
else:
    existing_session = None

# Training Session Form
with st.form("training_session_form"):
    st.subheader("Detalhes da Sessão")
    
    col1, col2 = st.columns(2)
    
    with col1:
        # Select athlete
        athlete_options = [f"{a['first_name']} {a['last_name']}" 
                          for a in st.session_state.athletes]
        selected_athlete_idx = st.selectbox("Selecionar Atleta*", 
                                           range(len(athlete_options)),
                                           format_func=lambda x: athlete_options[x],
                                           index=existing_session['athlete_idx'] if editing_mode else 0)
        
        session_date = st.date_input("Data da Sessão*", 
                                    value=existing_session['session_date'] if editing_mode else date.today(),
                                    min_value=date.today())
        
        session_time = st.time_input("Hora da Sessão*", 
                                     value=existing_session['session_time'] if editing_mode else datetime.now().time())
    
    with col2:
        session_name = st.text_input("Nome da Sessão*", 
                                    placeholder="ex: Dia de Pernas - Semana 1",
                                    value=existing_session['session_name'] if editing_mode else "")
        
        duration = st.number_input("Duração Estimada (minutos)", 
                                  min_value=15, max_value=240, 
                                  value=existing_session['duration'] if editing_mode else 60, 
                                  step=15)
        
        session_types = ["Treino de Força", "Cardio", "HIIT", "Flexibilidade", 
                        "Misto", "Específico de Desporto", "Recuperação"]
        session_type = st.selectbox("Tipo de Sessão", 
                                   session_types,
                                   index=session_types.index(existing_session['session_type']) if editing_mode else 0)
    
    session_notes = st.text_area("Notas da Sessão", 
                                placeholder="Objetivos gerais, áreas de foco ou instruções especiais para esta sessão...",
                                value=existing_session['session_notes'] if editing_mode else "")
    
    st.divider()
    st.subheader("Seleção de Exercícios")
    
    # Select exercises to add to the session
    exercise_options = [f"{ex['name']} ({ex['category']} - {ex['difficulty']})" 
                       for ex in st.session_state.exercises]
    
    # Pre-select exercises if editing
    default_exercises = []
    if editing_mode:
        default_exercises = [ex['exercise_idx'] for ex in existing_session['exercises']]
    
    selected_exercises = st.multiselect("Selecionar Exercícios*", 
                                       range(len(exercise_options)),
                                       format_func=lambda x: exercise_options[x],
                                       default=default_exercises)
    
    if selected_exercises:
        st.write(f"**Configurar cada exercício:**")
        
        # Store exercise details in form
        exercise_details = []
        
        for idx in selected_exercises:
            exercise = st.session_state.exercises[idx]
            
            # Get existing values if editing
            existing_ex_data = None
            if editing_mode:
                existing_ex_data = next((ex for ex in existing_session['exercises'] if ex['exercise_idx'] == idx), None)
            
            with st.container():
                st.write(f"**{exercise['name']}**")
                col_ex1, col_ex2, col_ex3, col_ex4 = st.columns(4)
                
                with col_ex1:
                    sets = st.number_input(f"Séries", min_value=1, max_value=10, 
                                          value=existing_ex_data['sets'] if existing_ex_data else 3, 
                                          key=f"sets_{idx}")
                with col_ex2:
                    reps = st.text_input(f"Repetições/Duração", 
                                        value=existing_ex_data['reps'] if existing_ex_data else "10-12", 
                                        key=f"reps_{idx}",
                                        help="ex: '10-12' para repetições ou '30s' para tempo")
                with col_ex3:
                    rest = st.number_input(f"Descanso (seg)", min_value=0, max_value=300, 
                                          value=existing_ex_data['rest'] if existing_ex_data else 60, 
                                          step=15, key=f"rest_{idx}")
                with col_ex4:
                    weight = st.text_input(f"Peso/Intensidade", 
                                          value=existing_ex_data['weight'] if existing_ex_data else "", 
                                          key=f"weight_{idx}",
                                          help="ex: '20kg' ou 'RPE 7'")
                
                ex_notes = st.text_input(f"Notas do Exercício", 
                                        value=existing_ex_data['notes'] if existing_ex_data else "", 
                                        key=f"ex_notes_{idx}",
                                        placeholder="Instruções especiais para este exercício...")
                
                exercise_details.append({
                    'exercise_idx': idx,
                    'exercise_name': exercise['name'],
                    'sets': sets,
                    'reps': reps,
                    'rest': rest,
                    'weight': weight,
                    'notes': ex_notes
                })
                
                st.divider()
    
    # Submit buttons
    col_submit1, col_submit2 = st.columns([3, 1])
    with col_submit1:
        submitted = st.form_submit_button(
            "Atualizar Sessão de Treino" if editing_mode else "Criar Sessão de Treino", 
            use_container_width=True
        )
    with col_submit2:
        if editing_mode:
            cancel_edit = st.form_submit_button("Cancelar", use_container_width=True)
            if cancel_edit:
                st.session_state.editing_session_idx = None
                st.rerun()
    
    if submitted:
        # Validate required fields
        if not session_name:
            st.error("Por favor forneça um nome para a sessão")
        elif not selected_exercises:
            st.error("Por favor selecione pelo menos um exercício")
        else:
            # Create training session record
            training_session = {
                "athlete_idx": selected_athlete_idx,
                "athlete_name": f"{st.session_state.athletes[selected_athlete_idx]['first_name']} {st.session_state.athletes[selected_athlete_idx]['last_name']}",
                "session_name": session_name,
                "session_date": session_date,
                "session_time": session_time,
                "duration": duration,
                "session_type": session_type,
                "exercises": exercise_details,
                "session_notes": session_notes,
                "created_date": existing_session['created_date'] if editing_mode else date.today(),
                "status": existing_session['status'] if editing_mode else "Scheduled"
            }
            
            if editing_mode:
                # Update existing session
                st.session_state.training_sessions[st.session_state.editing_session_idx] = training_session
                st.session_state.editing_session_idx = None
                st.success(f"✅ Sessão de treino '{session_name}' atualizada com sucesso!")
            else:
                # Add new session to session state
                st.session_state.training_sessions.append(training_session)
                st.success(f"✅ Sessão de treino '{session_name}' criada com sucesso para {training_session['athlete_name']}!")
            st.balloons()

# Display training sessions
if st.session_state.training_sessions:
    st.divider()
    st.subheader(f"Sessões de Treino Agendadas ({len(st.session_state.training_sessions)})")
    
    # Filter options
    col_f1, col_f2, col_f3 = st.columns(3)
    with col_f1:
        filter_athlete = st.selectbox("Filtrar por Atleta", 
                                     ["Todos os Atletas"] + athlete_options,
                                     key="filter_athlete")
    with col_f2:
        filter_status = st.selectbox("Filtrar por Estado", 
                                    ["Todos", "Scheduled", "Completed", "Cancelled"],
                                    key="filter_status")
    with col_f3:
        filter_type = st.selectbox("Filtrar por Tipo",
                                  ["Todos"] + ["Treino de Força", "Cardio", "HIIT", "Flexibilidade", 
                                             "Misto", "Específico de Desporto", "Recuperação"],
                                  key="filter_type")
    
    # Apply filters
    filtered_sessions = st.session_state.training_sessions
    if filter_athlete != "Todos os Atletas":
        athlete_filter_name = filter_athlete.split(" (")[0]
        filtered_sessions = [s for s in filtered_sessions if s['athlete_name'] == athlete_filter_name]
    if filter_status != "Todos":
        filtered_sessions = [s for s in filtered_sessions if s['status'] == filter_status]
    if filter_type != "Todos":
        filtered_sessions = [s for s in filtered_sessions if s['session_type'] == filter_type]
    
    # Sort by date (newest first)
    filtered_sessions = sorted(filtered_sessions, key=lambda x: (x['session_date'], x['session_time']), reverse=True)
    
    st.write(f"A mostrar {len(filtered_sessions)} sessão/sessões")
    
    for idx, session in enumerate(st.session_state.training_sessions):
        # Skip if filtered out
        if session not in filtered_sessions:
            continue
        
        # Status color
        status_emoji = {"Scheduled": "📅", "Completed": "✅", "Cancelled": "❌"}
        
        with st.expander(f"{status_emoji.get(session['status'], '📋')} {session['session_name']} - {session['athlete_name']} ({session['session_date']})"):
            col_s1, col_s2 = st.columns(2)
            
            with col_s1:
                st.write(f"**Atleta:** {session['athlete_name']}")
                st.write(f"**Data:** {session['session_date']}")
                st.write(f"**Hora:** {session['session_time'].strftime('%H:%M')}")
                st.write(f"**Duração:** {session['duration']} minutos")
            
            with col_s2:
                st.write(f"**Tipo:** {session['session_type']}")
                st.write(f"**Estado:** {session['status']}")
                st.write(f"**Criado:** {session['created_date']}")
                st.write(f"**Exercícios:** {len(session['exercises'])}")
            
            if session['session_notes']:
                st.write(f"**Notas da Sessão:** {session['session_notes']}")
            
            st.divider()
            st.write("**Plano de Exercícios:**")
            
            for ex_detail in session['exercises']:
                st.markdown(f"""
                - **{ex_detail['exercise_name']}**
                  - Séries: {ex_detail['sets']} | Reps: {ex_detail['reps']} | Descanso: {ex_detail['rest']}s
                  {f"| Peso/Intensidade: {ex_detail['weight']}" if ex_detail['weight'] else ""}
                  {f"| Notas: {ex_detail['notes']}" if ex_detail['notes'] else ""}
                """)
            
            # Action buttons
            col_action1, col_action2, col_action3, col_action4 = st.columns(4)
            
            with col_action1:
                if st.button("Editar Sessão", key=f"edit_{idx}"):
                    st.session_state.editing_session_idx = idx
                    st.rerun()
            
            with col_action2:
                if session['status'] == "Scheduled":
                    if st.button("Marcar como Completo", key=f"complete_{idx}"):
                        st.session_state.training_sessions[idx]['status'] = "Completed"
                        st.rerun()
            
            with col_action3:
                if session['status'] == "Scheduled":
                    if st.button("Cancelar Sessão", key=f"cancel_{idx}"):
                        st.session_state.training_sessions[idx]['status'] = "Cancelled"
                        st.rerun()
            
            with col_action4:
                if st.button("Eliminar Sessão", key=f"delete_{idx}"):
                    st.session_state.training_sessions.pop(idx)
                    st.rerun()
    
    # Clear all button
    if st.button("Limpar Todas as Sessões", type="secondary"):
        st.session_state.training_sessions = []
        st.rerun()
