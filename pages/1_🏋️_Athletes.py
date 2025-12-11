import streamlit as st
from datetime import date

st.set_page_config(page_title="Athletes", page_icon="🏋️")

st.markdown("# Athlete Registration")
st.sidebar.header("Athletes")

# Initialize session state for storing athletes if not exists
if 'athletes' not in st.session_state:
    st.session_state.athletes = []

st.write("Register your athletes by filling out the form below.")

# Registration Form
with st.form("athlete_registration_form"):
    st.subheader("Athlete Information")
    
    col1, col2 = st.columns(2)
    
    with col1:
        first_name = st.text_input("First Name*", placeholder="John")
        last_name = st.text_input("Last Name*", placeholder="Doe")
        email = st.text_input("Email*", placeholder="athlete@example.com")
        phone = st.text_input("Phone Number", placeholder="+1 234 567 8900")
    
    with col2:
        birth_date = st.date_input("Date of Birth*", min_value=date(1920, 1, 1), max_value=date.today())
        gender = st.selectbox("Gender", ["Select", "Male", "Female", "Other", "Prefer not to say"])
        weight = st.number_input("Weight (kg)", min_value=0.0, max_value=300.0, step=0.1)
        height = st.number_input("Height (cm)", min_value=0.0, max_value=250.0, step=0.1)
    
    st.subheader("Fitness Information")
    
    col3, col4 = st.columns(2)
    
    with col3:
        fitness_level = st.selectbox("Fitness Level", ["Select", "Beginner", "Intermediate", "Advanced", "Professional"])
        goals = st.multiselect("Training Goals", 
                              ["Weight Loss", "Muscle Gain", "Strength", "Endurance", 
                               "Flexibility", "General Fitness", "Sport Performance"])
    
    with col4:
        medical_conditions = st.text_area("Medical Conditions / Injuries", 
                                         placeholder="Any medical conditions or injuries to be aware of...")
        notes = st.text_area("Additional Notes", 
                            placeholder="Any other relevant information...")
    
    # Submit button
    submitted = st.form_submit_button("Register Athlete", use_container_width=True)
    
    if submitted:
        # Validate required fields
        if not first_name or not last_name or not email:
            st.error("Please fill in all required fields (marked with *)")
        elif gender == "Select" or fitness_level == "Select":
            st.error("Please select valid options for Gender and Fitness Level")
        else:
            # Create athlete record
            athlete = {
                "first_name": first_name,
                "last_name": last_name,
                "email": email,
                "phone": phone,
                "birth_date": birth_date,
                "gender": gender,
                "weight": weight if weight > 0 else None,
                "height": height if height > 0 else None,
                "fitness_level": fitness_level,
                "goals": goals,
                "medical_conditions": medical_conditions,
                "notes": notes,
                "registered_date": date.today()
            }
            
            # Add to session state
            st.session_state.athletes.append(athlete)
            st.success(f"✅ Athlete {first_name} {last_name} registered successfully!")
            st.balloons()

# Display registered athletes
if st.session_state.athletes:
    st.divider()
    st.subheader(f"Registered Athletes ({len(st.session_state.athletes)})")
    
    for idx, athlete in enumerate(st.session_state.athletes):
        with st.expander(f"{athlete['first_name']} {athlete['last_name']} - {athlete['email']}"):
            col_a, col_b = st.columns(2)
            
            with col_a:
                st.write(f"**Email:** {athlete['email']}")
                st.write(f"**Phone:** {athlete['phone'] or 'N/A'}")
                st.write(f"**Date of Birth:** {athlete['birth_date']}")
                st.write(f"**Gender:** {athlete['gender']}")
                if athlete['weight']:
                    st.write(f"**Weight:** {athlete['weight']} kg")
                if athlete['height']:
                    st.write(f"**Height:** {athlete['height']} cm")
            
            with col_b:
                st.write(f"**Fitness Level:** {athlete['fitness_level']}")
                st.write(f"**Goals:** {', '.join(athlete['goals']) if athlete['goals'] else 'N/A'}")
                st.write(f"**Registered:** {athlete['registered_date']}")
            
            if athlete['medical_conditions']:
                st.write(f"**Medical Conditions:** {athlete['medical_conditions']}")
            if athlete['notes']:
                st.write(f"**Notes:** {athlete['notes']}")
            
            # Delete button
            if st.button(f"Delete Athlete", key=f"delete_{idx}"):
                st.session_state.athletes.pop(idx)
                st.rerun()
    
    # Clear all button
    if st.button("Clear All Athletes", type="secondary"):
        st.session_state.athletes = []
        st.rerun()