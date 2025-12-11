import streamlit as st
from datetime import date, datetime
import pandas as pd
from collections import defaultdict

st.set_page_config(page_title="Training Session Analytics", page_icon="📊", layout="wide")
    
st.markdown("# 📊 Athlete Performance Analytics")
st.sidebar.header("Performance Analytics")

# Initialize session state
if 'athletes' not in st.session_state:
    st.session_state.athletes = []
if 'training_sessions' not in st.session_state:
    st.session_state.training_sessions = []
if 'exercises' not in st.session_state:
    st.session_state.exercises = []

# Check if there are completed sessions
completed_sessions = [s for s in st.session_state.training_sessions 
                     if s['status'] == 'Completed' and 'completed_data' in s]

if not completed_sessions:
    st.warning("⚠️ No completed training sessions yet. Complete some sessions to see analytics.")
    st.stop()

if not st.session_state.athletes:
    st.warning("⚠️ No athletes registered.")
    st.stop()

st.write("Track athlete performance over time and analyze progress.")

# Athlete selection
st.subheader("Select Athlete")
athlete_options = [f"{a['first_name']} {a['last_name']}" for a in st.session_state.athletes]
selected_athlete_name = st.selectbox("Athlete", athlete_options)

# Filter sessions for selected athlete
athlete_sessions = [s for s in completed_sessions if s['athlete_name'] == selected_athlete_name]

if not athlete_sessions:
    st.info(f"No completed sessions found for {selected_athlete_name}.")
    st.stop()

# Sort sessions by date
athlete_sessions.sort(key=lambda x: (x['session_date'], x['session_time']))

st.divider()

# Overview metrics
st.subheader("📈 Performance Overview")
col_overview1, col_overview2, col_overview3, col_overview4 = st.columns(4)

with col_overview1:
    st.metric("Total Sessions", len(athlete_sessions))

with col_overview2:
    total_exercises = sum(len(s['completed_data']['exercises']) for s in athlete_sessions)
    st.metric("Total Exercises", total_exercises)

with col_overview3:
    completed_exercises = sum(
        len([e for e in s['completed_data']['exercises'] if e['status'] == 'completed'])
        for s in athlete_sessions
    )
    completion_rate = (completed_exercises / total_exercises * 100) if total_exercises > 0 else 0
    st.metric("Completion Rate", f"{completion_rate:.1f}%")

with col_overview4:
    # Calculate date range
    first_session = athlete_sessions[0]['session_date']
    last_session = athlete_sessions[-1]['session_date']
    days_span = (last_session - first_session).days
    st.metric("Training Period", f"{days_span} days")

st.divider()

# Exercise performance tracking
st.subheader("💪 Exercise Performance Tracking")

# Collect all unique exercises performed by this athlete
exercise_data = defaultdict(list)

for session in athlete_sessions:
    session_date = session['session_date']
    for ex in session['completed_data']['exercises']:
        if ex['status'] == 'completed':
            exercise_data[ex['exercise_name']].append({
                'date': session_date,
                'session_name': session['session_name'],
                'planned_sets': ex['planned_sets'],
                'actual_sets': ex['actual_sets'],
                'planned_reps': ex['planned_reps'],
                'actual_reps': ex['actual_reps'],
                'planned_weight': ex['planned_weight'],
                'actual_weight': ex['actual_weight'],
                'notes': ex['notes']
            })

# Exercise selection for detailed view
exercise_names = sorted(exercise_data.keys())
if exercise_names:
    selected_exercise = st.selectbox("Select Exercise to Analyze", exercise_names)
    
    if selected_exercise:
        exercise_history = exercise_data[selected_exercise]
        
        st.markdown(f"### {selected_exercise}")
        st.write(f"**Total times performed:** {len(exercise_history)}")
        
        # Create DataFrame for analysis
        df_data = []
        for entry in exercise_history:
            df_data.append({
                'Date': entry['date'],
                'Session': entry['session_name'],
                'Planned Sets': entry['planned_sets'],
                'Actual Sets': entry['actual_sets'],
                'Planned Reps': entry['planned_reps'],
                'Actual Reps': entry['actual_reps'],
                'Planned Weight': entry['planned_weight'],
                'Actual Weight': entry['actual_weight'],
            })
        
        df = pd.DataFrame(df_data)
        df['Date'] = pd.to_datetime(df['Date'])
        df = df.sort_values('Date')
        
        st.markdown("#### 📈 Performance Trends")
        
        # Weight progression chart
        if df['Actual Weight'].notna().any() and any(df['Actual Weight'] != ''):
            st.markdown("**Weight Progression:**")
            
            # Try to parse weights as numbers
            weight_values = []
            dates = []
            for idx, row in df.iterrows():
                weight_str = str(row['Actual Weight']).strip()
                if weight_str and weight_str.lower() != 'nan':
                    try:
                        # Extract numeric part (e.g., "20kg" -> 20)
                        import re
                        match = re.search(r'(\d+\.?\d*)', weight_str)
                        if match:
                            weight_values.append(float(match.group(1)))
                            dates.append(row['Date'])
                    except:
                        pass
            
            if weight_values:
                weight_df = pd.DataFrame({
                    'Date': dates,
                    'Weight': weight_values
                })
                st.line_chart(weight_df.set_index('Date'))
                
                # Weight change
                if len(weight_values) > 1:
                    weight_change = weight_values[-1] - weight_values[0]
                    weight_change_pct = (weight_change / weight_values[0] * 100) if weight_values[0] > 0 else 0
                    st.metric("Weight Change", 
                                f"{weight_change:+.1f}",
                                f"{weight_change_pct:+.1f}%")
        
        # Sets/Reps progression
        st.markdown("**Volume Progression (Sets × Reps):**")
        df['Volume'] = df['Actual Sets'] * df['Actual Reps'].apply(
            lambda x: float(str(x).split('-')[0]) if isinstance(x, str) and '-' in str(x)
            else float(x) if str(x).replace('.','').isdigit() else 0
        )
        volume_df = df[['Date', 'Volume']].copy()
        st.line_chart(volume_df.set_index('Date'))
        
        if len(df) > 1:
            volume_change = df['Volume'].iloc[-1] - df['Volume'].iloc[0]
            st.metric("Volume Change", f"{volume_change:+.0f}")

        st.divider()
        
        # Full history table
        with st.expander("📜 View Complete History"):
            display_df = df.copy()
            display_df['Date'] = display_df['Date'].dt.strftime('%Y-%m-%d')
            st.dataframe(display_df, hide_index=True, use_container_width=True)

st.divider()

# Performance by exercise type
exercise_stats = defaultdict(lambda: {'count': 0, 'completed': 0})

for session in athlete_sessions:
    for ex in session['completed_data']['exercises']:
        exercise_name = ex['exercise_name']
        exercise_stats[exercise_name]['count'] += 1
        if ex['status'] == 'completed':
            exercise_stats[exercise_name]['completed'] += 1

# Top exercises
st.markdown("#### 🏆 Most Performed Exercises")
sorted_exercises = sorted(exercise_stats.items(), 
                         key=lambda x: x[1]['count'], 
                         reverse=True)[:10]

for i, (ex_name, stats) in enumerate(sorted_exercises, 1):
    completion_rate = (stats['completed'] / stats['count'] * 100) if stats['count'] > 0 else 0
    st.write(f"{i}. **{ex_name}** - {stats['count']} times ({completion_rate:.0f}% completion)")
