import streamlit as st
from datetime import date, datetime
from utils import add_logo

add_logo()

st.set_page_config(page_title="Sessão de Treino", page_icon="📋", layout="wide")

st.markdown("# 🏋️ Sessão de Treino Ativa")

# Initialize session state
if 'training_sessions' not in st.session_state:
    st.session_state.training_sessions = []
if 'active_session' not in st.session_state:
    st.session_state.active_session = None
if 'exercise_progress' not in st.session_state:
    st.session_state.exercise_progress = {}

# Check if there's an active session
if st.session_state.active_session is None:
    st.warning("⚠️ Nenhuma sessão de treino ativa. Por favor inicie uma sessão a partir do Calendário de Treinos.")
    
    # Option to select a session to start
    if st.session_state.training_sessions:
        st.divider()
        st.subheader("Iniciar uma Sessão")
        
        scheduled_sessions = [
            (idx, s) for idx, s in enumerate(st.session_state.training_sessions)
            if s['status'] == 'Scheduled'
        ]
        
        if scheduled_sessions:
            session_options = [
                f"{s['session_name']} - {s['athlete_name']} ({s['session_date']})"
                for idx, s in scheduled_sessions
            ]
            
            selected = st.selectbox("Selecione uma sessão para iniciar:", range(len(session_options)),
                                   format_func=lambda x: session_options[x])
            
            if st.button("🚀 Iniciar Esta Sessão", type="primary"):
                st.session_state.active_session = scheduled_sessions[selected][0]
                st.rerun()
        else:
            st.info("Nenhuma sessão agendada disponível para iniciar.")
    
    st.stop()

# Load active session
session_idx = st.session_state.active_session
session = st.session_state.training_sessions[session_idx]

# Initialize progress tracking for this session if not exists
if session_idx not in st.session_state.exercise_progress:
    st.session_state.exercise_progress[session_idx] = {
        'started_at': datetime.now(),
        'exercises': []
    }
    # Initialize exercise tracking
    for ex in session['exercises']:
        st.session_state.exercise_progress[session_idx]['exercises'].append({
            'exercise_idx': ex['exercise_idx'],
            'exercise_name': ex['exercise_name'],
            'planned_sets': ex['sets'],
            'planned_reps': ex['reps'],
            'planned_weight': ex['weight'],
            'planned_rest': ex['rest'],
            'status': 'pending',  # pending, completed, failed, skipped
            'actual_sets': ex['sets'],
            'actual_reps': ex['reps'],
            'actual_weight': ex['weight'],
            'actual_rest': ex['rest'],
            'notes': '',
            'completed_at': None
        })

progress = st.session_state.exercise_progress[session_idx]

# Session header
col_header1, col_header2, col_header3 = st.columns([2, 1, 1])

with col_header1:
    st.markdown(f"### {session['session_name']}")
    st.write(f"**Athlete:** {session['athlete_name']}")

with col_header2:
    elapsed_time = datetime.now() - progress['started_at']
    minutes = int(elapsed_time.total_seconds() // 60)
    st.metric("Tempo Decorrido", f"{minutes} min")

with col_header3:
    completed_exercises = len([e for e in progress['exercises'] if e['status'] == 'completed'])
    st.metric("Progresso", f"{completed_exercises}/{len(progress['exercises'])}")

st.divider()

# Exercise tracking
st.subheader("💪 Exercícios")

for idx, exercise_progress in enumerate(progress['exercises']):
    exercise_name = exercise_progress['exercise_name']
    status = exercise_progress['status']
    
    # Status emoji
    status_emoji = {
        'pending': '⏳',
        'completed': '✅',
        'failed': '❌',
        'skipped': '⏭️'
    }
    
    # Expandable exercise card
    is_expanded = status == 'pending' and idx == min(
        [i for i, e in enumerate(progress['exercises']) if e['status'] == 'pending'],
        default=idx
    )
    
    with st.expander(f"{status_emoji.get(status, '⏳')} {idx + 1}. {exercise_name}", 
                     expanded=is_expanded):
        
        col_ex1, col_ex2 = st.columns([2, 1])
        
        with col_ex1:
            st.write("**Planeado:**")
            col_plan1, col_plan2, col_plan3, col_plan4 = st.columns(4)
            with col_plan1:
                st.metric("Séries", exercise_progress['planned_sets'])
            with col_plan2:
                st.metric("Reps", exercise_progress['planned_reps'])
            with col_plan3:
                st.metric("Descanso", f"{exercise_progress['planned_rest']}s")
            with col_plan4:
                st.metric("Peso", exercise_progress['planned_weight'] or "N/A")
        
        with col_ex2:
            current_status = st.selectbox(
                "Estado",
                ['pending', 'completed', 'failed', 'skipped'],
                index=['pending', 'completed', 'failed', 'skipped'].index(status),
                key=f"status_{session_idx}_{idx}",
                format_func=lambda x: {
                    'pending': '⏳ Pendente',
                    'completed': '✅ Completo',
                    'failed': '❌ Falhado',
                    'skipped': '⏭️ Saltado'
                }[x]
            )
            
            if current_status != status:
                progress['exercises'][idx]['status'] = current_status
                if current_status == 'completed':
                    progress['exercises'][idx]['completed_at'] = datetime.now()
        
        st.divider()
        
        # Actual performance tracking
        st.write("**Performance Real:**")
        col_actual1, col_actual2, col_actual3, col_actual4 = st.columns(4)
        
        with col_actual1:
            actual_sets = st.number_input(
                "Séries",
                min_value=0,
                max_value=20,
                value=exercise_progress['actual_sets'],
                key=f"actual_sets_{session_idx}_{idx}"
            )
            progress['exercises'][idx]['actual_sets'] = actual_sets
        
        with col_actual2:
            actual_reps = st.text_input(
                "Reps/Duração",
                value=exercise_progress['actual_reps'],
                key=f"actual_reps_{session_idx}_{idx}"
            )
            progress['exercises'][idx]['actual_reps'] = actual_reps
        
        with col_actual3:
            actual_rest = st.number_input(
                "Descanso (seg)",
                min_value=0,
                max_value=600,
                value=exercise_progress['actual_rest'],
                step=15,
                key=f"actual_rest_{session_idx}_{idx}"
            )
            progress['exercises'][idx]['actual_rest'] = actual_rest
        
        with col_actual4:
            actual_weight = st.text_input(
                "Peso/Intensidade",
                value=exercise_progress['actual_weight'],
                key=f"actual_weight_{session_idx}_{idx}"
            )
            progress['exercises'][idx]['actual_weight'] = actual_weight
        
        # Notes
        notes = st.text_area(
            "Notas do Exercício",
            value=exercise_progress['notes'],
            placeholder="Adicione notas sobre este exercício (ex: 'Senti-me forte', 'Dificuldade na última série', etc.)",
            key=f"notes_{session_idx}_{idx}"
        )
        progress['exercises'][idx]['notes'] = notes

st.divider()

# Session completion
st.subheader("Resumo da Sessão")

col_summary1, col_summary2, col_summary3, col_summary4 = st.columns(4)

with col_summary1:
    completed = len([e for e in progress['exercises'] if e['status'] == 'completed'])
    st.metric("Completos", f"{completed}/{len(progress['exercises'])}")

with col_summary2:
    failed = len([e for e in progress['exercises'] if e['status'] == 'failed'])
    st.metric("Falhados", failed)

with col_summary3:
    skipped = len([e for e in progress['exercises'] if e['status'] == 'skipped'])
    st.metric("Saltados", skipped)

with col_summary4:
    pending = len([e for e in progress['exercises'] if e['status'] == 'pending'])
    st.metric("Pendentes", pending)

# Final notes
st.text_area("Notas da Sessão", 
            placeholder="Feedback geral da sessão, como o atleta se sentiu, observações...",
            key=f"session_notes_{session_idx}")

# Action buttons
col_action1, col_action2, col_action3 = st.columns(3)

with col_action1:
    if st.button("💾 Guardar Progresso", type="secondary", use_container_width=True):
        st.success("✅ Progresso guardado!")

with col_action2:
    if st.button("🏁 Completar Sessão", type="primary", use_container_width=True):
        # Update session with actual data
        st.session_state.training_sessions[session_idx]['status'] = 'Completed'
        st.session_state.training_sessions[session_idx]['completed_data'] = progress
        st.session_state.training_sessions[session_idx]['completed_at'] = datetime.now()
        
        # Update exercises with actual performance
        for i, ex in enumerate(st.session_state.training_sessions[session_idx]['exercises']):
            ex_progress = progress['exercises'][i]
            ex['actual_sets'] = ex_progress['actual_sets']
            ex['actual_reps'] = ex_progress['actual_reps']
            ex['actual_weight'] = ex_progress['actual_weight']
            ex['actual_rest'] = ex_progress['actual_rest']
            ex['status'] = ex_progress['status']
            ex['exercise_notes'] = ex_progress['notes']
        
        st.session_state.active_session = None
        st.success("🎉 Sessão completada com sucesso!")
        st.balloons()
        st.info("A redirecionar para o calendário...")
        st.rerun()

with col_action3:
    if st.button("❌ Cancelar Sessão", use_container_width=True):
        if st.session_state.get('confirm_cancel'):
            st.session_state.active_session = None
            st.session_state.pop('confirm_cancel', None)
            st.warning("Sessão cancelada. Progresso não guardado.")
            st.rerun()
        else:
            st.session_state.confirm_cancel = True
            st.warning("⚠️ Clique novamente para confirmar cancelamento (o progresso será perdido)")
