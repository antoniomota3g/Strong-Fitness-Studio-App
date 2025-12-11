import streamlit as st
from datetime import date

st.set_page_config(page_title="Exercises", page_icon="💪")

st.markdown("# Exercise Registration")
st.sidebar.header("Exercises")

# Initialize session state for storing exercises if not exists
if 'exercises' not in st.session_state:
    st.session_state.exercises = []

st.write("Register exercises to build your exercise library.")

# Registration Form
with st.form("exercise_registration_form"):
    st.subheader("Exercise Information")
    
    col1, col2 = st.columns(2)
    
    with col1:
        exercise_name = st.text_input("Exercise Name*", placeholder="e.g., Barbell Squat")
        category = st.selectbox("Category*", 
                               ["Select", "Strength", "Cardio", "Flexibility", "Balance", 
                                "Plyometrics", "Functional", "Olympic Lifting"])
        muscle_groups = st.multiselect("Primary Muscle Groups*", 
                                      ["Chest", "Back", "Shoulders", "Biceps", "Triceps", 
                                       "Forearms", "Core/Abs", "Quadriceps", "Hamstrings", 
                                       "Glutes", "Calves", "Full Body"])
        difficulty = st.selectbox("Difficulty Level*", 
                                 ["Select", "Beginner", "Intermediate", "Advanced", "Expert"])
    
    with col2:
        equipment = st.multiselect("Equipment Required", 
                                  ["None (Bodyweight)", "Barbell", "Dumbbells", "Kettlebell", 
                                   "Resistance Bands", "Cable Machine", "Bench", "Pull-up Bar", 
                                   "Medicine Ball", "TRX", "Smith Machine", "Leg Press Machine", 
                                   "Other Machine"])
        exercise_type = st.selectbox("Exercise Type", 
                                    ["Select", "Compound", "Isolation", "Cardio", "Stretch"])
        sets_range = st.text_input("Recommended Sets", placeholder="e.g., 3-4")
        reps_range = st.text_input("Recommended Reps", placeholder="e.g., 8-12")
    
    st.subheader("Exercise Details")
    
    description = st.text_area("Description*", 
                              placeholder="Brief description of the exercise...",
                              help="Provide a clear overview of what the exercise involves")
    
    instructions = st.text_area("Instructions", 
                               placeholder="Step-by-step instructions:\n1. Starting position...\n2. Movement...\n3. Return to start...",
                               help="Detailed step-by-step guide for proper execution")
    
    tips = st.text_area("Tips & Common Mistakes", 
                       placeholder="Important tips and common mistakes to avoid...",
                       help="Safety tips, proper form cues, and mistakes to watch out for")
    
    video_url = st.text_input("Video URL (Optional)", 
                             placeholder="https://youtube.com/watch?v=...")
    
    # Submit button
    submitted = st.form_submit_button("Register Exercise", use_container_width=True)
    
    if submitted:
        # Validate required fields
        if not exercise_name or not description:
            st.error("Please fill in all required fields (marked with *)")
        elif category == "Select" or difficulty == "Select":
            st.error("Please select valid options for Category and Difficulty Level")
        elif not muscle_groups:
            st.error("Please select at least one primary muscle group")
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
            st.success(f"✅ Exercise '{exercise_name}' registered successfully!")
            st.balloons()

# Display registered exercises
if st.session_state.exercises:
    st.divider()
    st.subheader(f"Exercise Library ({len(st.session_state.exercises)})")
    
    # Filter options
    col_filter1, col_filter2, col_filter3 = st.columns(3)
    with col_filter1:
        filter_category = st.selectbox("Filter by Category", 
                                      ["All"] + ["Strength", "Cardio", "Flexibility", "Balance", 
                                                 "Plyometrics", "Functional", "Olympic Lifting"],
                                      key="filter_cat")
    with col_filter2:
        filter_difficulty = st.selectbox("Filter by Difficulty", 
                                        ["All", "Beginner", "Intermediate", "Advanced", "Expert"],
                                        key="filter_diff")
    with col_filter3:
        filter_muscle = st.selectbox("Filter by Muscle Group", 
                                    ["All", "Chest", "Back", "Shoulders", "Biceps", "Triceps", 
                                     "Forearms", "Core/Abs", "Quadriceps", "Hamstrings", 
                                     "Glutes", "Calves", "Full Body"],
                                    key="filter_muscle")
    
    # Apply filters
    filtered_exercises = st.session_state.exercises
    if filter_category != "All":
        filtered_exercises = [ex for ex in filtered_exercises if ex['category'] == filter_category]
    if filter_difficulty != "All":
        filtered_exercises = [ex for ex in filtered_exercises if ex['difficulty'] == filter_difficulty]
    if filter_muscle != "All":
        filtered_exercises = [ex for ex in filtered_exercises if filter_muscle in ex['muscle_groups']]
    
    st.write(f"Showing {len(filtered_exercises)} exercise(s)")
    
    for idx, exercise in enumerate(st.session_state.exercises):
        # Skip if filtered out
        if exercise not in filtered_exercises:
            continue
            
        with st.expander(f"💪 {exercise['name']} - {exercise['category']} ({exercise['difficulty']})"):
            col_a, col_b = st.columns(2)
            
            with col_a:
                st.write(f"**Category:** {exercise['category']}")
                st.write(f"**Difficulty:** {exercise['difficulty']}")
                st.write(f"**Muscle Groups:** {', '.join(exercise['muscle_groups'])}")
                if exercise['equipment']:
                    st.write(f"**Equipment:** {', '.join(exercise['equipment'])}")
                else:
                    st.write(f"**Equipment:** None required")
            
            with col_b:
                if exercise['exercise_type']:
                    st.write(f"**Type:** {exercise['exercise_type']}")
                if exercise['sets_range']:
                    st.write(f"**Sets:** {exercise['sets_range']}")
                if exercise['reps_range']:
                    st.write(f"**Reps:** {exercise['reps_range']}")
                st.write(f"**Created:** {exercise['created_date']}")
            
            st.write(f"**Description:** {exercise['description']}")
            
            if exercise['instructions']:
                st.write(f"**Instructions:**")
                st.text(exercise['instructions'])
            
            if exercise['tips']:
                st.write(f"**Tips & Common Mistakes:**")
                st.text(exercise['tips'])
            
            if exercise['video_url']:
                st.write(f"**Video:** [{exercise['video_url']}]({exercise['video_url']})")
            
            # Delete button
            if st.button(f"Delete Exercise", key=f"delete_{idx}"):
                st.session_state.exercises.pop(idx)
                st.rerun()
    
    # Clear all button
    if st.button("Clear All Exercises", type="secondary"):
        st.session_state.exercises = []
        st.rerun()
