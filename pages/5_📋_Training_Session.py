import streamlit as st
from datetime import date, datetime

st.set_page_config(page_title="Training Session", page_icon="📋", layout="wide")

st.markdown("# 🏋️ Active Training Session")
st.sidebar.header("Training Session")

# Initialize session state
if 'training_sessions' not in st.session_state:
    st.session_state.training_sessions = []
if 'active_session' not in st.session_state:
    st.session_state.active_session = None
if 'exercise_progress' not in st.session_state:
    st.session_state.exercise_progress = {}

# Check if there's an active session
if st.session_state.active_session is None:
    st.warning("⚠️ No active training session. Please start a session from the Training Calendar.")
    
    # Option to select a session to start
    if st.session_state.training_sessions:
        st.divider()
        st.subheader("Start a Session")
        
        scheduled_sessions = [
            (idx, s) for idx, s in enumerate(st.session_state.training_sessions)
            if s['status'] == 'Scheduled'
        ]
        
        if scheduled_sessions:
            session_options = [
                f"{s['session_name']} - {s['athlete_name']} ({s['session_date']})"
                for idx, s in scheduled_sessions
            ]
            
            selected = st.selectbox("Select a session to start:", range(len(session_options)),
                                   format_func=lambda x: session_options[x])
            
            if st.button("🚀 Start This Session", type="primary"):
                st.session_state.active_session = scheduled_sessions[selected][0]
                st.rerun()
        else:
            st.info("No scheduled sessions available to start.")
    
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
    st.metric("Elapsed Time", f"{minutes} min")

with col_header3:
    completed_exercises = len([e for e in progress['exercises'] if e['status'] == 'completed'])
    st.metric("Progress", f"{completed_exercises}/{len(progress['exercises'])}")

st.divider()

# Exercise tracking
st.subheader("💪 Exercises")

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
            st.write("**Planned:**")
            col_plan1, col_plan2, col_plan3, col_plan4 = st.columns(4)
            with col_plan1:
                st.metric("Sets", exercise_progress['planned_sets'])
            with col_plan2:
                st.metric("Reps", exercise_progress['planned_reps'])
            with col_plan3:
                st.metric("Rest", f"{exercise_progress['planned_rest']}s")
            with col_plan4:
                st.metric("Weight", exercise_progress['planned_weight'] or "N/A")
        
        with col_ex2:
            current_status = st.selectbox(
                "Status",
                ['pending', 'completed', 'failed', 'skipped'],
                index=['pending', 'completed', 'failed', 'skipped'].index(status),
                key=f"status_{session_idx}_{idx}",
                format_func=lambda x: {
                    'pending': '⏳ Pending',
                    'completed': '✅ Completed',
                    'failed': '❌ Failed',
                    'skipped': '⏭️ Skipped'
                }[x]
            )
            
            if current_status != status:
                progress['exercises'][idx]['status'] = current_status
                if current_status == 'completed':
                    progress['exercises'][idx]['completed_at'] = datetime.now()
        
        st.divider()
        
        # Actual performance tracking
        st.write("**Actual Performance:**")
        col_actual1, col_actual2, col_actual3, col_actual4 = st.columns(4)
        
        with col_actual1:
            actual_sets = st.number_input(
                "Sets",
                min_value=0,
                max_value=20,
                value=exercise_progress['actual_sets'],
                key=f"actual_sets_{session_idx}_{idx}"
            )
            progress['exercises'][idx]['actual_sets'] = actual_sets
        
        with col_actual2:
            actual_reps = st.text_input(
                "Reps/Duration",
                value=exercise_progress['actual_reps'],
                key=f"actual_reps_{session_idx}_{idx}"
            )
            progress['exercises'][idx]['actual_reps'] = actual_reps
        
        with col_actual3:
            actual_rest = st.number_input(
                "Rest (sec)",
                min_value=0,
                max_value=600,
                value=exercise_progress['actual_rest'],
                step=15,
                key=f"actual_rest_{session_idx}_{idx}"
            )
            progress['exercises'][idx]['actual_rest'] = actual_rest
        
        with col_actual4:
            actual_weight = st.text_input(
                "Weight/Intensity",
                value=exercise_progress['actual_weight'],
                key=f"actual_weight_{session_idx}_{idx}"
            )
            progress['exercises'][idx]['actual_weight'] = actual_weight
        
        # Notes
        notes = st.text_area(
            "Exercise Notes",
            value=exercise_progress['notes'],
            placeholder="Add notes about this exercise (e.g., 'Felt strong', 'Struggled with last set', etc.)",
            key=f"notes_{session_idx}_{idx}"
        )
        progress['exercises'][idx]['notes'] = notes

st.divider()

# Session completion
st.subheader("Session Summary")

col_summary1, col_summary2, col_summary3, col_summary4 = st.columns(4)

with col_summary1:
    completed = len([e for e in progress['exercises'] if e['status'] == 'completed'])
    st.metric("Completed", f"{completed}/{len(progress['exercises'])}")

with col_summary2:
    failed = len([e for e in progress['exercises'] if e['status'] == 'failed'])
    st.metric("Failed", failed)

with col_summary3:
    skipped = len([e for e in progress['exercises'] if e['status'] == 'skipped'])
    st.metric("Skipped", skipped)

with col_summary4:
    pending = len([e for e in progress['exercises'] if e['status'] == 'pending'])
    st.metric("Pending", pending)

# Final notes
st.text_area("Session Notes", 
            placeholder="Overall session feedback, how the athlete felt, any observations...",
            key=f"session_notes_{session_idx}")

# Action buttons
col_action1, col_action2, col_action3 = st.columns(3)

with col_action1:
    if st.button("💾 Save Progress", type="secondary", use_container_width=True):
        st.success("✅ Progress saved!")

with col_action2:
    if st.button("🏁 Complete Session", type="primary", use_container_width=True):
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
        st.success("🎉 Session completed successfully!")
        st.balloons()
        st.info("Redirecting to calendar...")
        st.rerun()

with col_action3:
    if st.button("❌ Cancel Session", use_container_width=True):
        if st.session_state.get('confirm_cancel'):
            st.session_state.active_session = None
            st.session_state.pop('confirm_cancel', None)
            st.warning("Session cancelled. Progress not saved.")
            st.rerun()
        else:
            st.session_state.confirm_cancel = True
            st.warning("⚠️ Click again to confirm cancellation (progress will be lost)")
