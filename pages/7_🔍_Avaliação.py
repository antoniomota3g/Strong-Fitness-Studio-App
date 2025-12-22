import streamlit as st
from datetime import date, datetime
import pandas as pd
from utils import add_logo
import database as db

add_logo()

st.set_page_config(page_title="Avaliação de Atleta", page_icon="🔍", layout="wide")

# Initialize database
if 'db_initialized' not in st.session_state:
    db.init_database()
    st.session_state.db_initialized = True
    
st.markdown("# 🔍 Avaliação do Atleta")

# Load data from database
athletes = db.get_all_athletes()
evaluations = db.get_all_evaluations()

# Check if there are athletes
if not athletes:
    st.warning("⚠️ Ainda não há atletas registados. Por favor registe atletas primeiro na página de Atletas.")
    st.stop()

st.write("Acompanhe as medidas de composição corporal do atleta ao longo do tempo.")

# Evaluation Form
with st.form("evaluation_form"):
    st.subheader("Medição de Composição Corporal")
    
    col1, col2 = st.columns(2)
    
    with col1:
        # Select athlete
        athlete_options = [f"{a['first_name']} {a['last_name']}" 
                          for a in athletes]
        selected_athlete_idx = st.selectbox("Selecionar Atleta*", 
                                           range(len(athlete_options)),
                                           format_func=lambda x: athlete_options[x])
        
        evaluation_date = st.date_input("Data da Avaliação*", 
                                       value=date.today(),
                                       max_value=date.today())
        
        weight = st.number_input("Peso (kg)*", 
                                min_value=20.0, 
                                max_value=300.0, 
                                value=70.0,
                                step=0.1,
                                format="%.1f")
    
    with col2:
        muscle_percentage = st.number_input("Percentagem Muscular (%)*", 
                                           min_value=0.0, 
                                           max_value=100.0, 
                                           value=40.0,
                                           step=0.1,
                                           format="%.1f")
        
        fat_percentage = st.number_input("Percentagem de Gordura (%)*", 
                                        min_value=0.0, 
                                        max_value=100.0, 
                                        value=20.0,
                                        step=0.1,
                                        format="%.1f")
        
        bone_percentage = st.number_input("Percentagem Óssea (%)*", 
                                         min_value=0.0, 
                                         max_value=100.0, 
                                         value=15.0,
                                         step=0.1,
                                         format="%.1f")
    
    water_percentage = st.number_input("Percentagem de Água (%)*", 
                                      min_value=0.0, 
                                      max_value=100.0, 
                                      value=55.0,
                                      step=0.1,
                                      format="%.1f")

    notes = st.text_area("Notas da Avaliação", 
                        placeholder="Quaisquer observações, objetivos ou informação relevante sobre esta avaliação...")
    
    # Submit button
    submitted = st.form_submit_button("Guardar Avaliação", use_container_width=True)
    
    if submitted:
        # Create evaluation record
        athlete = athletes[selected_athlete_idx]
        evaluation = {
            "athlete_id": athlete['id'],
            "evaluation_date": str(evaluation_date),
            "weight": weight,
            "muscle_percentage": muscle_percentage,
            "fat_percentage": fat_percentage,
            "bone_percentage": bone_percentage,
            "water_percentage": water_percentage,
            "notes": notes
        }
        
        # Add to database
        db.add_evaluation(evaluation)
        st.success(f"✅ Avaliação de {athlete['first_name']} {athlete['last_name']} guardada com sucesso!")
        st.balloons()
        st.rerun()

# Display evaluations
if evaluations:
    st.divider()
    st.subheader(f"📊 Histórico de Avaliações ({len(evaluations)})")
    
    # Filter by athlete
    filter_athlete = st.selectbox("Filtrar por Atleta", 
                                 ["Todos os Atletas"] + athlete_options,
                                 key="filter_eval_athlete")
    
    # Apply filter
    filtered_evals = evaluations
    if filter_athlete != "Todos os Atletas":
        # Find athlete ID by name
        athlete_id_filter = None
        for a in athletes:
            if f"{a['first_name']} {a['last_name']}" == filter_athlete:
                athlete_id_filter = a['id']
                break
        if athlete_id_filter:
            filtered_evals = [e for e in filtered_evals if e['athlete_id'] == athlete_id_filter]
    
    # Sort by date (newest first)
    filtered_evals = sorted(filtered_evals, key=lambda x: x['evaluation_date'], reverse=True)
    
    st.write(f"A mostrar {len(filtered_evals)} avaliação/avaliações")
    
    # Display evaluations
    for evaluation in filtered_evals:
        # Get athlete name from database
        athlete_name = "Unknown"
        for a in athletes:
            if a['id'] == evaluation['athlete_id']:
                athlete_name = f"{a['first_name']} {a['last_name']}"
                break
        
        # Parse evaluation_date if it's a string
        eval_date = evaluation['evaluation_date']
        if isinstance(eval_date, str):
            from datetime import datetime as dt
            eval_date = dt.strptime(eval_date, '%Y-%m-%d').date()
        
        with st.expander(f"📅 {athlete_name} - {eval_date.strftime('%d de %B, %Y')}"):
            col_e1, col_e2, col_e3 = st.columns(3)
            
            with col_e1:
                st.markdown("#### Composição Corporal")
                st.metric("Peso", f"{evaluation['weight']} kg")
                st.metric("Músculo", f"{evaluation['muscle_percentage']}%")
                st.metric("Gordura", f"{evaluation['fat_percentage']}%")
            
            with col_e2:
                st.markdown("#### Métricas Adicionais")
                st.metric("Osso", f"{evaluation['bone_percentage']}%")
                st.metric("Água", f"{evaluation['water_percentage']}%")

            if evaluation.get('notes'):
                st.markdown("#### Notas")
                st.info(evaluation['notes'])
            
            # Delete button
            if st.button(f"Eliminar Avaliação", key=f"delete_eval_{evaluation['id']}"):
                db.delete_evaluation(evaluation['id'])
                st.rerun()
    
    st.divider()
    
    # Progress tracking for selected athlete
    if filter_athlete != "Todos os Atletas":
        st.subheader(f"📈 Acompanhamento de Progresso - {filter_athlete}")
        
        # Find athlete ID
        athlete_id_filter = None
        for a in athletes:
            if f"{a['first_name']} {a['last_name']}" == filter_athlete:
                athlete_id_filter = a['id']
                break
        
        athlete_evals = [e for e in evaluations 
                        if e['athlete_id'] == athlete_id_filter]
        athlete_evals.sort(key=lambda x: x['evaluation_date'])
        
        if len(athlete_evals) >= 2:
            # Create progress charts
            df_data = []
            for eval in athlete_evals:
                df_data.append({
                    'Date': eval['evaluation_date'],
                    'Weight (kg)': eval['weight'],
                    'Muscle (%)': eval['muscle_percentage'],
                    'Fat (%)': eval['fat_percentage'],
                    'Water (%)': eval['water_percentage'],
                    'Bone (%)': eval['bone_percentage']
                })
            
            df = pd.DataFrame(df_data)
            df['Date'] = pd.to_datetime(df['Date'])
            
            col_chart1, col_chart2 = st.columns(2)
            
            with col_chart1:
                st.markdown("#### Progressão de Peso")
                st.line_chart(df.set_index('Date')[['Weight (kg)']])
                
                # Calculate changes
                weight_change = athlete_evals[-1]['weight'] - athlete_evals[0]['weight']
                st.metric("Alteração de Peso", f"{weight_change:+.1f} kg")
            
            with col_chart2:
                st.markdown("#### Alterações de Composição Corporal")
                st.line_chart(df.set_index('Date')[['Muscle (%)', 'Fat (%)']])
                
                muscle_change = athlete_evals[-1]['muscle_percentage'] - athlete_evals[0]['muscle_percentage']
                fat_change = athlete_evals[-1]['fat_percentage'] - athlete_evals[0]['fat_percentage']
                
                col_m1, col_m2 = st.columns(2)
                with col_m1:
                    st.metric("Alteração Muscular", f"{muscle_change:+.1f}%")
                with col_m2:
                    st.metric("Alteração de Gordura", f"{fat_change:+.1f}%")
            
            # Comparison table
            st.markdown("#### Comparação de Avaliações")
            comparison_df = df.copy()
            comparison_df['Date'] = comparison_df['Date'].dt.strftime('%Y-%m-%d')
            st.dataframe(comparison_df, hide_index=True, use_container_width=True)
        else:
            st.info("É necessário pelo menos 2 avaliações para mostrar o acompanhamento de progresso.")
