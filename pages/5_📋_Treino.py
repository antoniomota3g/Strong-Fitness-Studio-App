import streamlit as st
from datetime import date, datetime
from utils import add_logo
import database as db

add_logo()

st.set_page_config(page_title="Sessão de Treino", page_icon="📋", layout="wide")

st.markdown("# 🏋️ Sessão de Treino Ativa")

# Initialize database
if 'db_initialized' not in st.session_state:
    db.init_database()
    st.session_state.db_initialized = True

# Load data from database
athletes = db.get_all_athletes()
training_sessions = db.get_all_training_sessions()
# Keep active session tracking in session state (UI-only)
if 'active_session' not in st.session_state:
    st.session_state.active_session = None
if 'exercise_progress' not in st.session_state:
    st.session_state.exercise_progress = {}

# Check if there's an active session
if st.session_state.active_session is None:
    st.warning("⚠️ Nenhuma sessão de treino ativa. Por favor inicie uma sessão a partir do Calendário de Treinos.")
    
    # Option to select a session to start
    if training_sessions:
        st.divider()
        st.subheader("Iniciar uma Sessão")
        
        scheduled_sessions = [
            s for s in training_sessions
            if s['status'] == 'Scheduled'
        ]
        
        if scheduled_sessions:
            session_options = []
            for s in scheduled_sessions:
                # Get athlete name
                athlete_name = "Unknown"
                for a in athletes:
                    if a['id'] == s['athlete_id']:
                        athlete_name = f"{a['first_name']} {a['last_name']}"
                        break
                session_options.append(f"{s['session_name']} - {athlete_name} ({s['session_date']})")
            
            selected = st.selectbox("Selecione uma sessão para iniciar:", range(len(session_options)),
                                   format_func=lambda x: session_options[x])
            
            if st.button("🚀 Iniciar Esta Sessão", type="primary"):
                st.session_state.active_session = scheduled_sessions[selected]['id']
                st.rerun()
        else:
            st.info("Nenhuma sessão agendada disponível para iniciar.")
    
    st.stop()

# Load active session from database
session_id = st.session_state.active_session
session = None
for s in training_sessions:
    if s['id'] == session_id:
        session = s
        break

if not session:
    st.error("⚠️ Sessão não encontrada.")
    st.session_state.active_session = None
    st.rerun()

# Initialize progress tracking for this session if not exists
if session_id not in st.session_state.exercise_progress:
    st.session_state.exercise_progress[session_id] = {
        'started_at': datetime.now(),
        'exercises': []
    }
    # Initialize exercise tracking
    for ex in session.get('exercises', []):
        st.session_state.exercise_progress[session_id]['exercises'].append({
            'exercise_idx': ex.get('exercise_idx', 0),
            'exercise_name': ex['exercise_name'],
            'planned_sets': ex['sets'],
            'planned_reps': ex['reps'],
            'planned_weight': ex.get('weight', ''),
            'planned_rest': ex['rest'],
            'status': 'pending',  # pending, completed, failed, skipped
            'actual_sets': ex['sets'],
            'actual_reps': ex['reps'],
            'actual_weight': ex.get('weight', ''),
            'actual_rest': ex['rest'],
            'notes': '',
            'completed_at': None
        })

progress = st.session_state.exercise_progress[session_id]

# Get athlete name
athlete_name = "Unknown"
for a in athletes:
    if a['id'] == session['athlete_id']:
        athlete_name = f"{a['first_name']} {a['last_name']}"
        break

# Session header
col_header1, col_header2, col_header3 = st.columns([2, 1, 1])

with col_header1:
    st.markdown(f"### {session['session_name']}")
    st.write(f"**Athlete:** {athlete_name}")

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
                key=f"status_{session_id}_{idx}",
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
                key=f"actual_sets_{session_id}_{idx}"
            )
            progress['exercises'][idx]['actual_sets'] = actual_sets
        
        with col_actual2:
            actual_reps = st.text_input(
                "Reps/Duração",
                value=exercise_progress['actual_reps'],
                key=f"actual_reps_{session_id}_{idx}"
            )
            progress['exercises'][idx]['actual_reps'] = actual_reps
        
        with col_actual3:
            actual_rest = st.number_input(
                "Descanso (seg)",
                min_value=0,
                max_value=600,
                value=exercise_progress['actual_rest'],
                step=15,
                key=f"actual_rest_{session_id}_{idx}"
            )
            progress['exercises'][idx]['actual_rest'] = actual_rest
        
        with col_actual4:
            actual_weight = st.text_input(
                "Peso/Intensidade",
                value=exercise_progress['actual_weight'],
                key=f"actual_weight_{session_id}_{idx}"
            )
            progress['exercises'][idx]['actual_weight'] = actual_weight
        
        # Notes
        notes = st.text_area(
            "Notas do Exercício",
            value=exercise_progress['notes'],
            placeholder="Adicione notas sobre este exercício (ex: 'Senti-me forte', 'Dificuldade na última série', etc.)",
            key=f"notes_{session_id}_{idx}"
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
session_notes = st.text_area("Notas da Sessão", 
            placeholder="Feedback geral da sessão, como o atleta se sentiu, observações...",
            key=f"session_notes_{session_id}")

# Action buttons
col_action1, col_action2, col_action3 = st.columns(3)

with col_action1:
    if st.button("💾 Guardar Progresso", type="secondary", use_container_width=True):
        st.success("✅ Progresso guardado!")

with col_action2:
    if st.button("🏁 Completar Sessão", type="primary", use_container_width=True):
        # Update session with actual data
        updated_exercises = []
        for i, ex in enumerate(session.get('exercises', [])):
            ex_progress = progress['exercises'][i]
            updated_ex = ex.copy()
            updated_ex['actual_sets'] = ex_progress['actual_sets']
            updated_ex['actual_reps'] = ex_progress['actual_reps']
            updated_ex['actual_weight'] = ex_progress['actual_weight']
            updated_ex['actual_rest'] = ex_progress['actual_rest']
            updated_ex['status'] = ex_progress['status']
            updated_ex['exercise_notes'] = ex_progress['notes']
            updated_exercises.append(updated_ex)
        
        # Update in database
        db.update_training_session(session_id, {
            'status': 'Completed',
            'completed_data': progress,
            'completed_at': str(datetime.now()),
            'exercises': updated_exercises,
            'session_notes': session_notes
        })
        
        st.session_state.active_session = None
        st.success("🎉 Sessão completada com sucesso!")
        st.balloons()

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
