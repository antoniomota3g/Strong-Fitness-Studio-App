import streamlit as st
from datetime import date, datetime

st.set_page_config(page_title="Training Session", page_icon="📝")

st.markdown("# Training Session")
st.sidebar.header("Training Session")

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
    st.warning("⚠️ No athletes registered yet. Please register athletes first in the Athletes page.")
    st.stop()

if not st.session_state.exercises:
    st.warning("⚠️ No exercises registered yet. Please register exercises first in the Exercises page.")
    st.stop()

st.write("Create a training session by selecting an athlete and adding exercises.")

# Check if editing mode
editing_mode = st.session_state.editing_session_idx is not None and len(st.session_state.training_sessions) > 0
if editing_mode:
    st.info(f"✏️ Editing session: {st.session_state.training_sessions[st.session_state.editing_session_idx]['session_name']}")
    existing_session = st.session_state.training_sessions[st.session_state.editing_session_idx]
else:
    existing_session = None

# Training Session Form
with st.form("training_session_form"):
    st.subheader("Session Details")
    
    col1, col2 = st.columns(2)
    
    with col1:
        # Select athlete
        athlete_options = [f"{a['first_name']} {a['last_name']}" 
                          for a in st.session_state.athletes]
        selected_athlete_idx = st.selectbox("Select Athlete*", 
                                           range(len(athlete_options)),
                                           format_func=lambda x: athlete_options[x],
                                           index=existing_session['athlete_idx'] if editing_mode else 0)
        
        session_date = st.date_input("Session Date*", 
                                    value=existing_session['session_date'] if editing_mode else date.today(),
                                    min_value=date.today())
        
        session_time = st.time_input("Session Time*", 
                                     value=existing_session['session_time'] if editing_mode else datetime.now().time())
    
    with col2:
        session_name = st.text_input("Session Name*", 
                                    placeholder="e.g., Leg Day - Week 1",
                                    value=existing_session['session_name'] if editing_mode else "")
        
        duration = st.number_input("Estimated Duration (minutes)", 
                                  min_value=15, max_value=240, 
                                  value=existing_session['duration'] if editing_mode else 60, 
                                  step=15)
        
        session_types = ["Strength Training", "Cardio", "HIIT", "Flexibility", 
                        "Mixed", "Sport-Specific", "Recovery"]
        session_type = st.selectbox("Session Type", 
                                   session_types,
                                   index=session_types.index(existing_session['session_type']) if editing_mode else 0)
    
    session_notes = st.text_area("Session Notes", 
                                placeholder="Overall goals, focus areas, or special instructions for this session...",
                                value=existing_session['session_notes'] if editing_mode else "")
    
    st.divider()
    st.subheader("Exercise Selection")
    
    # Select exercises to add to the session
    exercise_options = [f"{ex['name']} ({ex['category']} - {ex['difficulty']})" 
                       for ex in st.session_state.exercises]
    
    # Pre-select exercises if editing
    default_exercises = []
    if editing_mode:
        default_exercises = [ex['exercise_idx'] for ex in existing_session['exercises']]
    
    selected_exercises = st.multiselect("Select Exercises*", 
                                       range(len(exercise_options)),
                                       format_func=lambda x: exercise_options[x],
                                       default=default_exercises)
    
    if selected_exercises:
        st.write(f"**Configure each exercise:**")
        
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
                    sets = st.number_input(f"Sets", min_value=1, max_value=10, 
                                          value=existing_ex_data['sets'] if existing_ex_data else 3, 
                                          key=f"sets_{idx}")
                with col_ex2:
                    reps = st.text_input(f"Reps/Duration", 
                                        value=existing_ex_data['reps'] if existing_ex_data else "10-12", 
                                        key=f"reps_{idx}",
                                        help="e.g., '10-12' for reps or '30s' for time")
                with col_ex3:
                    rest = st.number_input(f"Rest (sec)", min_value=0, max_value=300, 
                                          value=existing_ex_data['rest'] if existing_ex_data else 60, 
                                          step=15, key=f"rest_{idx}")
                with col_ex4:
                    weight = st.text_input(f"Weight/Intensity", 
                                          value=existing_ex_data['weight'] if existing_ex_data else "", 
                                          key=f"weight_{idx}",
                                          help="e.g., '20kg' or 'RPE 7'")
                
                ex_notes = st.text_input(f"Exercise Notes", 
                                        value=existing_ex_data['notes'] if existing_ex_data else "", 
                                        key=f"ex_notes_{idx}",
                                        placeholder="Special instructions for this exercise...")
                
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
            "Update Training Session" if editing_mode else "Create Training Session", 
            use_container_width=True
        )
    with col_submit2:
        if editing_mode:
            cancel_edit = st.form_submit_button("Cancel", use_container_width=True)
            if cancel_edit:
                st.session_state.editing_session_idx = None
                st.rerun()
    
    if submitted:
        # Validate required fields
        if not session_name:
            st.error("Please provide a session name")
        elif not selected_exercises:
            st.error("Please select at least one exercise")
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
                st.success(f"✅ Training session '{session_name}' updated successfully!")
            else:
                # Add new session to session state
                st.session_state.training_sessions.append(training_session)
                st.success(f"✅ Training session '{session_name}' created successfully for {training_session['athlete_name']}!")
            st.balloons()

# Display training sessions
if st.session_state.training_sessions:
    st.divider()
    st.subheader(f"Scheduled Training Sessions ({len(st.session_state.training_sessions)})")
    
    # Filter options
    col_f1, col_f2, col_f3 = st.columns(3)
    with col_f1:
        filter_athlete = st.selectbox("Filter by Athlete", 
                                     ["All Athletes"] + athlete_options,
                                     key="filter_athlete")
    with col_f2:
        filter_status = st.selectbox("Filter by Status", 
                                    ["All", "Scheduled", "Completed", "Cancelled"],
                                    key="filter_status")
    with col_f3:
        filter_type = st.selectbox("Filter by Type",
                                  ["All"] + ["Strength Training", "Cardio", "HIIT", "Flexibility", 
                                             "Mixed", "Sport-Specific", "Recovery"],
                                  key="filter_type")
    
    # Apply filters
    filtered_sessions = st.session_state.training_sessions
    if filter_athlete != "All Athletes":
        athlete_filter_name = filter_athlete.split(" (")[0]
        filtered_sessions = [s for s in filtered_sessions if s['athlete_name'] == athlete_filter_name]
    if filter_status != "All":
        filtered_sessions = [s for s in filtered_sessions if s['status'] == filter_status]
    if filter_type != "All":
        filtered_sessions = [s for s in filtered_sessions if s['session_type'] == filter_type]
    
    # Sort by date (newest first)
    filtered_sessions = sorted(filtered_sessions, key=lambda x: (x['session_date'], x['session_time']), reverse=True)
    
    st.write(f"Showing {len(filtered_sessions)} session(s)")
    
    for idx, session in enumerate(st.session_state.training_sessions):
        # Skip if filtered out
        if session not in filtered_sessions:
            continue
        
        # Status color
        status_emoji = {"Scheduled": "📅", "Completed": "✅", "Cancelled": "❌"}
        
        with st.expander(f"{status_emoji.get(session['status'], '📋')} {session['session_name']} - {session['athlete_name']} ({session['session_date']})"):
            col_s1, col_s2 = st.columns(2)
            
            with col_s1:
                st.write(f"**Athlete:** {session['athlete_name']}")
                st.write(f"**Date:** {session['session_date']}")
                st.write(f"**Time:** {session['session_time'].strftime('%H:%M')}")
                st.write(f"**Duration:** {session['duration']} minutes")
            
            with col_s2:
                st.write(f"**Type:** {session['session_type']}")
                st.write(f"**Status:** {session['status']}")
                st.write(f"**Created:** {session['created_date']}")
                st.write(f"**Exercises:** {len(session['exercises'])}")
            
            if session['session_notes']:
                st.write(f"**Session Notes:** {session['session_notes']}")
            
            st.divider()
            st.write("**Exercise Plan:**")
            
            for ex_detail in session['exercises']:
                st.markdown(f"""
                - **{ex_detail['exercise_name']}**
                  - Sets: {ex_detail['sets']} | Reps: {ex_detail['reps']} | Rest: {ex_detail['rest']}s
                  {f"| Weight/Intensity: {ex_detail['weight']}" if ex_detail['weight'] else ""}
                  {f"| Notes: {ex_detail['notes']}" if ex_detail['notes'] else ""}
                """)
            
            # Action buttons
            col_action1, col_action2, col_action3, col_action4 = st.columns(4)
            
            with col_action1:
                if st.button("Edit Session", key=f"edit_{idx}"):
                    st.session_state.editing_session_idx = idx
                    st.rerun()
            
            with col_action2:
                if session['status'] == "Scheduled":
                    if st.button("Mark as Completed", key=f"complete_{idx}"):
                        st.session_state.training_sessions[idx]['status'] = "Completed"
                        st.rerun()
            
            with col_action3:
                if session['status'] == "Scheduled":
                    if st.button("Cancel Session", key=f"cancel_{idx}"):
                        st.session_state.training_sessions[idx]['status'] = "Cancelled"
                        st.rerun()
            
            with col_action4:
                if st.button("Delete Session", key=f"delete_{idx}"):
                    st.session_state.training_sessions.pop(idx)
                    st.rerun()
    
    # Clear all button
    if st.button("Clear All Sessions", type="secondary"):
        st.session_state.training_sessions = []
        st.rerun()
