import streamlit as st
from datetime import date, datetime, timedelta
from streamlit_calendar import calendar
from utils import add_logo
import database as db

add_logo()

st.set_page_config(page_title="Calendário de Treinos", page_icon="📅", layout="wide")

st.markdown("# Calendário de Treinos")

# Initialize database
if 'db_initialized' not in st.session_state:
    db.init_database()
    st.session_state.db_initialized = True

# Load data from database
athletes = db.get_all_athletes()
training_sessions = db.get_all_training_sessions()

# Check if there are training sessions
if not training_sessions:
    st.warning(
        "⚠️ Nenhuma sessão de treino agendada ainda. Por favor crie sessões na página de Sessão de Treino."
    )
    st.stop()

st.write("Visualize todas as sessões de treino agendadas num formato de calendário.")

# Filter options
st.subheader("Filtros")
col_filter1, col_filter2, col_filter3 = st.columns(3)

with col_filter1:
    # Filter by athlete
    athlete_options = ["Todos os Atletas"] + [
        f"{a['first_name']} {a['last_name']}" for a in athletes
    ]
    filter_athlete = st.selectbox("Filtrar por Atleta", athlete_options)

with col_filter2:
    # Filter by status
    filter_status = st.selectbox(
        "Filtrar por Estado", ["Todos", "Scheduled", "Completed", "Cancelled"]
    )

with col_filter3:
    # Filter by session type
    filter_type = st.selectbox(
        "Filtrar por Tipo",
        [
            "Todos",
            "Treino de Força",
            "Cardio",
            "HIIT",
            "Flexibilidade",
            "Misto",
            "Específico de Desporto",
            "Recuperação",
        ],
    )

mode_map = {
    "Month View": "daygrid",
    "Week View": "timegrid",
    "Day View": "timegrid",
    "List View": "list",
}

# Prepare events for calendar
events = []
status_colors = {
    "Scheduled": "#3788d8",  # Blue
    "Completed": "#28a745",  # Green
    "Cancelled": "#dc3545",  # Red
}

for session in training_sessions:
    # Get athlete name from database
    athlete_name = "Unknown"
    for a in athletes:
        if a['id'] == session['athlete_id']:
            athlete_name = f"{a['first_name']} {a['last_name']}"
            break
    
    # Apply filters
    if filter_athlete != "Todos os Atletas" and athlete_name != filter_athlete:
        continue
    if filter_status != "Todos" and session["status"] != filter_status:
        continue
    if filter_type != "Todos" and session["session_type"] != filter_type:
        continue

    # Parse dates if they're strings
    session_date = session["session_date"]
    if isinstance(session_date, str):
        from datetime import datetime as dt
        session_date = dt.strptime(session_date, '%Y-%m-%d').date()
    
    session_time = session["session_time"]
    if isinstance(session_time, str):
        from datetime import datetime as dt
        session_time = dt.strptime(session_time, '%H:%M:%S').time()

    # Combine date and time
    session_datetime = datetime.combine(session_date, session_time)
    end_datetime = session_datetime + timedelta(minutes=session["duration"])

    # Create event
    event = {
        "title": f"{athlete_name}: {session['session_name']}",
        "start": session_datetime.isoformat(),
        "end": end_datetime.isoformat(),
        "backgroundColor": status_colors.get(session["status"], "#6c757d"),
        "borderColor": status_colors.get(session["status"], "#6c757d"),
        "extendedProps": {
            "session_id": session["id"],
            "athlete": athlete_name,
            "type": session["session_type"],
            "status": session["status"],
            "exercises": len(session.get("exercises", [])),
        },
    }
    events.append(event)

# Calendar options
calendar_options = {
    "editable": False,
    "selectable": True,
    "headerToolbar": {
        "left": "prev,next today",
        "center": "title",
        "right": "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
    },
    "initialView": "dayGridMonth",
    "slotMinTime": "08:00:00",
    "slotMaxTime": "20:00:00",
    "height": 650,
    "navLinks": True,
    "businessHours": {
        "daysOfWeek": [1, 2, 3, 4, 5, 6],  # Monday - Saturday
        "startTime": "08:00",
        "endTime": "20:00",
    },
}

# Custom CSS for calendar
custom_css = """
    .fc-event-past {
        opacity: 0.8;
    }
    .fc-event-time {
        font-style: italic;
    }
    .fc-event-title {
        font-weight: 500;
    }
"""

st.divider()

# Display calendar
state = calendar(
    events=events,
    options=calendar_options,
    custom_css=custom_css,
    key="training_calendar",
)

# Display selected event details
if state.get("eventsSet"):
    col_leg1, col_leg2, col_leg3 = st.columns(3)
    with col_leg1:
        st.markdown("🔵 **Agendado** - Próximas sessões")
    with col_leg2:
        st.markdown("🟢 **Completo** - Sessões terminadas")
    with col_leg3:
        st.markdown("🔴 **Cancelado** - Sessões canceladas")

# Display event details when clicked
if state.get("eventClick"):
    event_data = state["eventClick"]["event"]
    session_id = event_data["extendedProps"]["session_id"]
    
    # Find session by ID
    session = None
    for s in training_sessions:
        if s['id'] == session_id:
            session = s
            break
    
    if session:
        # Get athlete name
        athlete_name = "Unknown"
        for a in athletes:
            if a['id'] == session['athlete_id']:
                athlete_name = f"{a['first_name']} {a['last_name']}"
                break

        # Modal dialog for session details
        @st.dialog(
            f"📋 {athlete_name} - {session['session_name']} [{session['status']}]",
            width="large",
        )
        def show_session_details():
            # Parse dates if they're strings
            session_date = session["session_date"]
            if isinstance(session_date, str):
                from datetime import datetime as dt
                session_date = dt.strptime(session_date, '%Y-%m-%d').date()
            
            session_time = session["session_time"]
            if isinstance(session_time, str):
                from datetime import datetime as dt
                session_time = dt.strptime(session_time, '%H:%M:%S').time()
            
            created_date = session.get('created_date', 'N/A')
            if isinstance(created_date, str) and created_date != 'N/A':
                from datetime import datetime as dt
                created_date = dt.strptime(created_date, '%Y-%m-%d').date()
            
            # Session information
            col_info1, col_info2 = st.columns(2)

            with col_info1:
                st.write(f"**📅 Data:** {session_date.strftime('%d de %B, %Y')}")
                st.write(f"**🕐 Hora:** {session_time.strftime('%H:%M')}")
                st.write(f"**⏱️ Duração:** {session['duration']} minutos")

            with col_info2:
                st.write(f"**🏋️ Tipo:** {session['session_type']}")
                st.write(f"**📊 Exercícios:** {len(session.get('exercises', []))}")
                if created_date != 'N/A':
                    st.write(f"**📝 Criado:** {created_date.strftime('%d de %B, %Y')}")

            if session.get("session_notes"):
                st.divider()
                st.write("**📝 Notas da Sessão:**")
                st.info(session["session_notes"])

            st.divider()
            for i, ex in enumerate(session.get("exercises", []), 1):
                with st.container():
                    st.markdown(f"**{i}. {ex['exercise_name']}**")
                    col_ex1, col_ex2, col_ex3, col_ex4 = st.columns(4)

                    with col_ex1:
                        st.metric("Séries", ex["sets"])
                    with col_ex2:
                        st.metric("Reps", ex["reps"])
                with col_ex3:
                    st.metric("Descanso", f"{ex['rest']}s")
                with col_ex4:
                    if ex.get("weight"):
                        st.metric("Peso", ex["weight"])

                if ex.get("notes"):
                    st.caption(f"💡 {ex['notes']}")

                if i < len(session.get("exercises", [])):
                    st.markdown("---")

        st.divider()

        # Action buttons
        col_btn1, col_btn2, col_btn3, col_btn4 = st.columns(4)

        with col_btn1:
            if st.button(
                "🚀 Iniciar Sessão",
                use_container_width=True,
                type="primary",
                disabled=(session["status"] != "Scheduled"),
            ):
                st.session_state["active_session"] = session_id
                st.switch_page("pages/5_📋_Treino.py")

        with col_btn2:
            if st.button(
                "✏️ Editar",
                use_container_width=True,
            ):
                st.session_state.editing_session_idx = session_id
                st.success("A redirecionar para editar sessão...")
                st.switch_page("pages/3_📝_Plano_de_Treino.py")

        with col_btn3:
            if st.button(
                "❌ Cancelar Sessão",
                use_container_width=True,
                disabled=(session["status"] != "Scheduled"),
            ):
                db.update_training_session(session_id, {"status": "Cancelled"})
                st.success("Sessão cancelada com sucesso!")
                st.rerun()

        with col_btn4:
            if st.button("🗑️ Eliminar", use_container_width=True, type="secondary"):
                if st.session_state.get("confirm_delete") == session_id:
                    db.delete_training_session(session_id)
                    st.session_state.pop("confirm_delete", None)
                    st.success("Sessão eliminada com sucesso!")
                    st.rerun()
                else:
                    st.session_state.confirm_delete = session_id
                    st.warning("⚠️ Clique novamente para confirmar a eliminação")

    show_session_details()

# Statistics section
st.divider()
st.subheader("Estatísticas de Sessões")

col_stat1, col_stat2, col_stat3, col_stat4 = st.columns(4)

with col_stat1:
    total_sessions = len(training_sessions)
    st.metric("Total de Sessões", total_sessions)

with col_stat2:
    scheduled_sessions = len(
        [s for s in training_sessions if s["status"] == "Scheduled"]
    )
    st.metric("Agendadas", scheduled_sessions)

with col_stat3:
    completed_sessions = len(
        [s for s in training_sessions if s["status"] == "Completed"]
    )
    st.metric("Completas", completed_sessions)

with col_stat4:
    cancelled_sessions = len(
        [s for s in training_sessions if s["status"] == "Cancelled"]
    )
    st.metric("Canceladas", cancelled_sessions)
