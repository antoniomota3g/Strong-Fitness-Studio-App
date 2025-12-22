import streamlit as st
from datetime import date, datetime, timedelta
from utils import add_logo
import database as db

add_logo()

st.set_page_config(page_title="Sessão de Treino", page_icon="📝", layout="wide")

st.markdown("# Sessão de Treino")

# Initialize database
if 'db_initialized' not in st.session_state:
    if db.init_database():
        st.session_state.db_initialized = True
    else:
        st.error("Erro ao inicializar base de dados.")
        st.stop()

# Load data from database
athletes = db.get_all_athletes()
exercises = db.get_all_exercises()
training_sessions = db.get_all_training_sessions()

# Keep editing state in session
if 'editing_session_idx' not in st.session_state:
    st.session_state.editing_session_idx = None

# Check if there are athletes and exercises registered
if not athletes:
    st.warning("⚠️ Ainda não há atletas registados. Por favor registe atletas primeiro na página de Atletas.")
    st.stop()

if not exercises:
    st.warning("⚠️ Ainda não há exercícios registados. Por favor registe exercícios primeiro na página de Exercícios.")
    st.stop()

st.write("Crie uma sessão de treino selecionando um atleta e adicionando exercícios.")

# Check if editing mode
editing_mode = st.session_state.editing_session_idx is not None
if editing_mode:
    # Find the session being edited by ID
    existing_session = None
    for sess in training_sessions:
        if sess['id'] == st.session_state.editing_session_idx:
            existing_session = sess
            break
    
    if existing_session:
        st.info(f"✏️ A editar sessão: {existing_session['session_name']}")
    else:
        # Session not found, reset editing mode
        st.session_state.editing_session_idx = None
        editing_mode = False
        existing_session = None
else:
    existing_session = None


def _reset_exercise_widget_state():
    for k in list(st.session_state.keys()):
        if k == "selected_exercises" or k.startswith(
            ("sets_", "reps_", "rest_", "weight_", "ex_notes_")
        ):
            st.session_state.pop(k, None)


def _build_last_completed_exercise_map(athlete_id):
    """Return mapping exercise_name -> {last_date, sets, reps, rest, weight, notes}.

    Prefers actual_* fields when present.
    """
    sessions = db.get_recent_completed_sessions(athlete_id, limit=60)
    from datetime import datetime as dt

    last_map = {}
    for s in sessions:
        s_date = s.get("session_date")
        if isinstance(s_date, str):
            s_date = dt.strptime(s_date, "%Y-%m-%d").date()

        for ex in s.get("exercises", []) or []:
            ex_name = ex.get("exercise_name")
            if not ex_name or ex_name in last_map:
                continue

            sets = ex.get("actual_sets", ex.get("sets", 3))
            reps = ex.get("actual_reps", ex.get("reps", "10"))
            rest = ex.get("actual_rest", ex.get("rest", 60))
            weight = ex.get("actual_weight", ex.get("weight", ""))
            notes = ex.get("exercise_notes", ex.get("notes", ""))

            last_map[ex_name] = {
                "last_date": s_date,
                "sets": sets,
                "reps": reps,
                "rest": rest,
                "weight": weight,
                "notes": notes,
            }

    return last_map

# NOTE: Widgets inside st.form() do not trigger reruns on change.
# Keep the recurring toggle outside the form so the UI updates immediately.
if editing_mode:
    is_recurring = False
    st.session_state["is_recurring"] = False
else:
    is_recurring = st.checkbox(
        "Sessão recorrente (dias da semana)",
        value=st.session_state.get("is_recurring", False),
        key="is_recurring",
        help="Cria automaticamente várias sessões entre uma data de início e fim, nos dias da semana escolhidos.",
    )

st.subheader("Detalhes da Sessão")

col1, col2 = st.columns(2)

with col1:
    # Select athlete
    athlete_options = [f"{a['first_name']} {a['last_name']}" for a in athletes]

    # Find index of athlete if editing
    default_athlete_idx = 0
    if editing_mode and existing_session:
        for i, a in enumerate(athletes):
            if a['id'] == existing_session['athlete_id']:
                default_athlete_idx = i
                break

    selected_athlete_idx = st.selectbox(
        "Selecionar Atleta*",
        range(len(athlete_options)),
        format_func=lambda x: athlete_options[x],
        index=default_athlete_idx,
    )

    # Parse session_date if it's a string
    default_date = date.today()
    if editing_mode and existing_session:
        if isinstance(existing_session['session_date'], str):
            from datetime import datetime as dt
            default_date = dt.strptime(existing_session['session_date'], '%Y-%m-%d').date()
        else:
            default_date = existing_session['session_date']

    session_date_label = "Data da Sessão*" if (editing_mode or not is_recurring) else "Data de Início*"
    session_date = st.date_input(
        session_date_label,
        value=default_date,
        min_value=date.today(),
    )

    recurring_end_date = None
    recurring_weekdays = []
    if not editing_mode and is_recurring:
        default_end = session_date + timedelta(days=27)
        recurring_end_date = st.date_input(
            "Data de Fim*",
            value=default_end,
            min_value=session_date,
        )

        weekday_options = [
            ("Segunda-feira", 0),
            ("Terça-feira", 1),
            ("Quarta-feira", 2),
            ("Quinta-feira", 3),
            ("Sexta-feira", 4),
            ("Sábado", 5),
            ("Domingo", 6),
        ]
        default_weekday = next(
            (name for name, idx in weekday_options if idx == session_date.weekday()),
            "Segunda-feira",
        )
        recurring_weekdays = st.multiselect(
            "Dias da Semana*",
            options=[name for name, _ in weekday_options],
            default=[default_weekday],
        )

    # Session time should not jump on reruns; keep it in session_state.
    session_time_key = "session_time"
    session_time_source_key = "session_time_source"

    if editing_mode and existing_session:
        if isinstance(existing_session['session_time'], str):
            from datetime import datetime as dt
            existing_time_value = dt.strptime(existing_session['session_time'], '%H:%M:%S').time()
        else:
            existing_time_value = existing_session['session_time']

        # Only (re)initialize when switching which session is being edited
        if st.session_state.get(session_time_source_key) != existing_session['id']:
            st.session_state[session_time_key] = existing_time_value
            st.session_state[session_time_source_key] = existing_session['id']
    else:
        # Only initialize once for "new session" flow
        if st.session_state.get(session_time_source_key) != "new":
            now_value = datetime.now().time().replace(second=0, microsecond=0)
            st.session_state[session_time_key] = now_value
            st.session_state[session_time_source_key] = "new"

    session_time = st.time_input("Hora da Sessão*", key=session_time_key)

with col2:
    session_name = st.text_input(
        "Nome da Sessão",
        placeholder="ex: Dia de Pernas - Semana 1",
        value=existing_session['session_name'] if editing_mode else "",
    )

    duration = st.number_input(
        "Duração Estimada (minutos)",
        min_value=15,
        max_value=240,
        value=existing_session['duration'] if editing_mode else 60,
        step=15,
    )

    session_types = [
        "Treino de Força",
        "Cardio",
        "HIIT",
        "Flexibilidade",
        "Misto",
        "Específico de Desporto",
        "Recuperação",
    ]
    session_type = st.selectbox(
        "Tipo de Sessão",
        session_types,
        index=session_types.index(existing_session['session_type']) if editing_mode else None,
        placeholder="Escolha uma opção",
    )

session_notes = st.text_area(
    "Notas da Sessão",
    placeholder="Objetivos gerais, áreas de foco ou instruções especiais para esta sessão...",
    value=existing_session['session_notes'] if editing_mode else "",
)


# Exercise selection + configuration (outside the form so it updates immediately)
st.divider()
st.subheader("Seleção de Exercícios")

# Reset exercise widget state when entering a different edit session
current_edit_id = existing_session['id'] if (editing_mode and existing_session) else None
if st.session_state.get("exercise_state_edit_id") != current_edit_id:
    _reset_exercise_widget_state()
    st.session_state["exercise_state_edit_id"] = current_edit_id

# Select exercises to add to the session
exercise_options = [
    f"{ex['name']} ({ex['category']} - {ex['difficulty']})" for ex in exercises
]

selected_athlete = athletes[selected_athlete_idx]
selected_athlete_id = selected_athlete['id']

# Cache last completed values per athlete in session_state to avoid repeated scans.
last_cache_key = "last_completed_exercise_cache"
last_cache_athlete_key = "last_completed_exercise_cache_athlete_id"
if st.session_state.get(last_cache_athlete_key) != selected_athlete_id:
    st.session_state[last_cache_key] = _build_last_completed_exercise_map(selected_athlete_id)
    st.session_state[last_cache_athlete_key] = selected_athlete_id
last_completed_map = st.session_state.get(last_cache_key, {})

default_exercises = []
if editing_mode and existing_session:
    default_exercises = [ex.get('exercise_idx') for ex in existing_session.get('exercises', [])]
    if "selected_exercises" not in st.session_state:
        st.session_state["selected_exercises"] = default_exercises

selected_exercises = st.multiselect(
    "Selecionar Exercícios*",
    range(len(exercise_options)),
    format_func=lambda x: exercise_options[x],
    default=st.session_state.get("selected_exercises", default_exercises),
    key="selected_exercises",
)

if selected_exercises:
    st.write("**Configurar cada exercício:**")

    for idx in selected_exercises:
        exercise = exercises[idx]

        existing_ex_data = None
        if editing_mode and existing_session:
            existing_ex_data = next(
                (
                    ex
                    for ex in existing_session.get('exercises', [])
                    if ex.get('exercise_idx') == idx
                ),
                None,
            )

        with st.container():
            st.write(f"**{exercise['name']}**")
            col_ex1, col_ex2, col_ex3, col_ex4 = st.columns(4)

            sets_key = f"sets_{idx}"
            reps_key = f"reps_{idx}"
            rest_key = f"rest_{idx}"
            weight_key = f"weight_{idx}"
            notes_key = f"ex_notes_{idx}"

            last_done = last_completed_map.get(exercise['name'])
            if last_done and last_done.get('last_date'):
                st.caption(f"Última vez: {last_done['last_date']}")
            else:
                st.caption("Nunca realizado antes por este atleta.")
            # Prefill priority:
            # 1) existing session data (editing)
            # 2) last completed values for this athlete (new session only)
            # 3) generic defaults
            def _prefill(field, default):
                if existing_ex_data and existing_ex_data.get(field) not in [None, ""]:
                    return existing_ex_data.get(field)
                if (not editing_mode) and last_done and last_done.get(field) not in [None, ""]:
                    return last_done.get(field)
                return default

            if sets_key not in st.session_state:
                st.session_state[sets_key] = int(_prefill('sets', 3))
            if reps_key not in st.session_state:
                st.session_state[reps_key] = _prefill('reps', '10')
            if rest_key not in st.session_state:
                st.session_state[rest_key] = int(_prefill('rest', 60))
            if weight_key not in st.session_state:
                st.session_state[weight_key] = _prefill('weight', '')
            if notes_key not in st.session_state:
                st.session_state[notes_key] = _prefill('notes', '')

            with col_ex1:
                st.number_input("Séries", min_value=1, max_value=10, key=sets_key)
            with col_ex2:
                st.text_input(
                    "Repetições/Duração",
                    key=reps_key,
                    help="ex: '10-12' para repetições ou '30s' para tempo",
                )
            with col_ex3:
                st.number_input(
                    "Descanso (seg)",
                    min_value=0,
                    max_value=300,
                    step=15,
                    key=rest_key,
                )
            with col_ex4:
                st.text_input(
                    "Peso/Intensidade",
                    key=weight_key,
                    help="ex: '20kg' ou 'RPE 7'",
                )

            st.text_input(
                "Notas do Exercício",
                key=notes_key,
                placeholder="Instruções especiais para este exercício...",
            )

# Submit buttons (kept in a small form so the page feels like one form)
with st.form("training_session_submit"):
    col_submit1, col_submit2 = st.columns(2)
    with col_submit1:
        submitted = st.form_submit_button(
            "Atualizar Sessão de Treino" if editing_mode else "Criar Sessão de Treino",
            use_container_width=True,
        )
    with col_submit2:
        cancel_edit = False
        if editing_mode:
            cancel_edit = st.form_submit_button("Cancelar", use_container_width=True)

    if cancel_edit:
        st.session_state.editing_session_idx = None
        st.rerun()

    if submitted:
        selected_exercises = st.session_state.get("selected_exercises", [])
        if not selected_exercises:
            st.error("Por favor selecione pelo menos um exercício")
            st.stop()

        athlete = athletes[selected_athlete_idx]
        session_name = (session_name or "").strip()
        if not session_name:
            athlete_full_name = f"{athlete['first_name']} {athlete['last_name']}"
            recurring_tag = " (Recorrente)" if (not editing_mode and is_recurring) else ""
            session_name = f"{athlete_full_name} {recurring_tag}"

        exercise_details = []
        for idx in selected_exercises:
            exercise = exercises[idx]
            exercise_details.append(
                {
                    "exercise_idx": idx,
                    "exercise_name": exercise["name"],
                    "sets": int(st.session_state.get(f"sets_{idx}", 3)),
                    "reps": st.session_state.get(f"reps_{idx}", "10"),
                    "rest": int(st.session_state.get(f"rest_{idx}", 60)),
                    "weight": st.session_state.get(f"weight_{idx}", ""),
                    "notes": st.session_state.get(f"ex_notes_{idx}", ""),
                }
            )

        base_training_session = {
            "athlete_id": athlete['id'],
            "session_name": session_name,
            "session_time": str(session_time),
            "duration": duration,
            "session_type": session_type,
            "exercises": exercise_details,
            "session_notes": session_notes,
            "status": existing_session['status'] if editing_mode else "Scheduled",
        }

        if editing_mode:
            training_session = {
                **base_training_session,
                "session_date": str(session_date),
            }
            db.update_training_session(existing_session['id'], training_session)
            st.session_state.editing_session_idx = None
            st.success(f"✅ Sessão de treino '{session_name}' atualizada com sucesso!")
            st.balloons()
            st.rerun()

        if is_recurring:
            if not recurring_weekdays:
                st.error("Por favor selecione pelo menos um dia da semana")
                st.stop()
            if recurring_end_date is None or recurring_end_date < session_date:
                st.error("A data de fim deve ser igual ou posterior à data de início")
                st.stop()

            weekday_name_to_idx = {
                "Segunda-feira": 0,
                "Terça-feira": 1,
                "Quarta-feira": 2,
                "Quinta-feira": 3,
                "Sexta-feira": 4,
                "Sábado": 5,
                "Domingo": 6,
            }
            selected_weekday_idxs = {weekday_name_to_idx[name] for name in recurring_weekdays}

            existing = db.get_training_sessions_between(
                session_date,
                recurring_end_date,
                athlete_id=athlete['id'],
            )
            existing_slots = set()
            from datetime import datetime as dt
            for s in existing:
                d = s.get('session_date')
                t = s.get('session_time')
                if isinstance(d, str):
                    d = dt.strptime(d, '%Y-%m-%d').date()
                if isinstance(t, str):
                    t = dt.strptime(t, '%H:%M:%S').time()
                existing_slots.add((d, t))

            dates_to_create = []
            cur = session_date
            while cur <= recurring_end_date:
                if cur.weekday() in selected_weekday_idxs:
                    dates_to_create.append(cur)
                cur += timedelta(days=1)

            if not dates_to_create:
                st.error("Nenhuma data corresponde aos dias da semana selecionados nesse intervalo")
                st.stop()

            created = 0
            skipped = 0
            for d in dates_to_create:
                slot = (d, session_time)
                if slot in existing_slots:
                    skipped += 1
                    continue

                training_session = {
                    **base_training_session,
                    "session_date": str(d),
                }
                db.add_training_session(training_session)
                created += 1

            st.success(
                f"✅ Sessões recorrentes: {created} criadas, {skipped} ignoradas (já existiam) para {athlete['first_name']} {athlete['last_name']}!"
            )
            st.balloons()
            st.rerun()

        training_session = {
            **base_training_session,
            "session_date": str(session_date),
        }
        db.add_training_session(training_session)
        st.success(
            f"✅ Sessão de treino '{session_name}' criada com sucesso para {athlete['first_name']} {athlete['last_name']}!"
        )
        st.balloons()
        st.rerun()

# Display training sessions
if training_sessions:
    st.divider()
    st.subheader(f"Sessões de Treino Agendadas ({len(training_sessions)})")
    
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
    filtered_sessions = training_sessions
    if filter_athlete != "Todos os Atletas":
        athlete_filter_name = filter_athlete
        # Find athlete ID by name
        athlete_id_filter = None
        for a in athletes:
            if f"{a['first_name']} {a['last_name']}" == athlete_filter_name:
                athlete_id_filter = a['id']
                break
        if athlete_id_filter:
            filtered_sessions = [s for s in filtered_sessions if s['athlete_id'] == athlete_id_filter]
    if filter_status != "Todos":
        filtered_sessions = [s for s in filtered_sessions if s['status'] == filter_status]
    if filter_type != "Todos":
        filtered_sessions = [s for s in filtered_sessions if s['session_type'] == filter_type]
    
    # Sort by date (newest first)
    filtered_sessions = sorted(filtered_sessions, key=lambda x: (x['session_date'], x['session_time']), reverse=True)
    
    st.write(f"A mostrar {len(filtered_sessions)} sessão/sessões")
    
    for session in filtered_sessions:
            continue
        
    for session in filtered_sessions:
        # Status color
        status_emoji = {"Scheduled": "📅", "Completed": "✅", "Cancelled": "❌"}
        
        # Get athlete name from database
        athlete_name = "Unknown"
        for a in athletes:
            if a['id'] == session['athlete_id']:
                athlete_name = f"{a['first_name']} {a['last_name']}"
                break
        
        session_name_for_title = session.get('session_name', '') or ''
        athlete_in_name = athlete_name.lower() in session_name_for_title.lower()
        title = (
            f"{status_emoji.get(session['status'], '📋')} {session_name_for_title} ({session['session_date']})"
            if athlete_in_name
            else f"{status_emoji.get(session['status'], '📋')} {session_name_for_title} - {athlete_name} ({session['session_date']})"
        )

        with st.expander(title):
            col_s1, col_s2 = st.columns(2)
            
            with col_s1:
                st.write(f"**Atleta:** {athlete_name}")
                st.write(f"**Data:** {session['session_date']}")
                st.write(f"**Hora:** {session['session_time']}")
                st.write(f"**Duração:** {session['duration']} minutos")
            
            with col_s2:
                st.write(f"**Tipo:** {session['session_type']}")
                st.write(f"**Estado:** {session['status']}")
                st.write(f"**Criado:** {session.get('created_date', 'N/A')}")
                st.write(f"**Exercícios:** {len(session.get('exercises', []))}")
            
            if session.get('session_notes'):
                st.write(f"**Notas da Sessão:** {session['session_notes']}")
            
            st.divider()
            st.write("**Plano de Exercícios:**")
            
            for ex_detail in session.get('exercises', []):
                st.markdown(f"""
                - **{ex_detail['exercise_name']}**
                  - Séries: {ex_detail['sets']} | Reps: {ex_detail['reps']} | Descanso: {ex_detail['rest']}s
                  {f"| Peso/Intensidade: {ex_detail['weight']}" if ex_detail.get('weight') else ""}
                  {f"| Notas: {ex_detail['notes']}" if ex_detail.get('notes') else ""}
                """)
            
            # Action buttons
            col_action1, col_action2, col_action3, col_action4 = st.columns(4)
            
            with col_action1:
                if st.button("Editar Sessão", key=f"edit_{session['id']}"):
                    st.session_state.editing_session_idx = session['id']
                    st.rerun()
            
            with col_action2:
                if session['status'] == "Scheduled":
                    if st.button("Marcar como Completo", key=f"complete_{session['id']}"):
                        db.update_training_session(session['id'], {'status': 'Completed'})
                        st.rerun()
            
            with col_action3:
                if session['status'] == "Scheduled":
                    if st.button("Cancelar Sessão", key=f"cancel_{session['id']}"):
                        db.update_training_session(session['id'], {'status': 'Cancelled'})
                        st.rerun()
            
            with col_action4:
                if st.button("Eliminar Sessão", key=f"delete_{session['id']}"):
                    db.delete_training_session(session['id'])
                    st.rerun()
