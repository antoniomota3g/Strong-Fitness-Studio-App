import streamlit as st
from datetime import date, datetime
import pandas as pd
from collections import defaultdict
from utils import add_logo

add_logo()

st.set_page_config(page_title="Análise de Sessões de Treino", page_icon="📊", layout="wide")
    
st.markdown("# 📊 Análise de Performance do Atleta")

# Initialize session state
if 'athletes' not in st.session_state:
    st.session_state.athletes = []
if 'training_sessions' not in st.session_state:
    st.session_state.training_sessions = []
if 'exercises' not in st.session_state:
    st.session_state.exercises = []
if 'evaluations' not in st.session_state:
    st.session_state.evaluations = []

# Check if there are completed sessions
completed_sessions = [s for s in st.session_state.training_sessions 
                     if s['status'] == 'Completed' and 'completed_data' in s]

if not st.session_state.athletes:
    st.warning("⚠️ Ainda não há atletas registados. Por favor registe atletas primeiro na página de Atletas.")
    st.stop()

if not completed_sessions and not st.session_state.evaluations:
    st.warning("⚠️ Ainda não há sessões de treino completas nem avaliações. Complete algumas sessões ou adicione avaliações para ver analíticas.")
    st.stop()

st.write("Acompanhe a performance do atleta, progresso de treino e composição corporal ao longo do tempo.")

# Athlete selection
st.subheader("Selecionar Atleta")
athlete_options = [f"{a['first_name']} {a['last_name']}" for a in st.session_state.athletes]
selected_athlete_name = st.selectbox("Atleta", athlete_options)

# Filter sessions and evaluations for selected athlete
athlete_sessions = [s for s in completed_sessions if s['athlete_name'] == selected_athlete_name]
athlete_evaluations = [e for e in st.session_state.evaluations if e['athlete_name'] == selected_athlete_name]

# Sort by date
athlete_sessions.sort(key=lambda x: (x['session_date'], x['session_time']))
athlete_evaluations.sort(key=lambda x: x['evaluation_date'])

st.divider()

# Create unified metrics selector
st.subheader("📊 Gráfico de Métricas Personalizadas")
st.write("Selecione quaisquer métricas para comparar numa única linha temporal")

# Prepare available metrics
available_metrics = []
metric_data = {}

# Add body composition metrics if evaluations exist
if athlete_evaluations:
    available_metrics.extend([
        "Peso Corporal (kg)",
        "Percentagem Muscular (%)",
        "Percentagem de Gordura (%)",
        "Percentagem de Água (%)",
        "Percentagem Óssea (%)"
    ])
    
    # Prepare evaluation data
    for eval in athlete_evaluations:
        date = eval['evaluation_date']
        metric_data.setdefault(date, {})
        metric_data[date]["Peso Corporal (kg)"] = eval['weight']
        metric_data[date]["Percentagem Muscular (%)"] = eval['muscle_percentage']
        metric_data[date]["Percentagem de Gordura (%)"] = eval['fat_percentage']
        metric_data[date]["Percentagem de Água (%)"] = eval['water_percentage']
        metric_data[date]["Percentagem Óssea (%)"] = eval['bone_percentage']

# Add exercise metrics if sessions exist
if athlete_sessions:
    # Collect exercise data
    exercise_metrics = defaultdict(list)
    
    for session in athlete_sessions:
        session_date = session['session_date']
        for ex in session['completed_data']['exercises']:
            if ex['status'] == 'completed':
                exercise_name = ex['exercise_name']
                
                # Parse weight
                weight_str = str(ex['actual_weight']).strip()
                if weight_str and weight_str.lower() not in ['nan', 'none', '']:
                    try:
                        import re
                        match = re.search(r'(\d+\.?\d*)', weight_str)
                        if match:
                            weight_val = float(match.group(1))
                            metric_name = f"{exercise_name} - Peso"
                            if metric_name not in available_metrics:
                                available_metrics.append(metric_name)
                            
                            metric_data.setdefault(session_date, {})
                            # If multiple sessions on same day, take the max
                            if metric_name in metric_data[session_date]:
                                metric_data[session_date][metric_name] = max(
                                    metric_data[session_date][metric_name], weight_val
                                )
                            else:
                                metric_data[session_date][metric_name] = weight_val
                    except:
                        pass
                
                # Calculate volume (sets × reps)
                try:
                    reps_str = str(ex['actual_reps'])
                    reps_val = float(reps_str.split('-')[0]) if '-' in reps_str else float(reps_str)
                    volume = ex['actual_sets'] * reps_val
                    
                    metric_name = f"{exercise_name} - Volume"
                    if metric_name not in available_metrics:
                        available_metrics.append(metric_name)
                    
                    metric_data.setdefault(session_date, {})
                    if metric_name in metric_data[session_date]:
                        metric_data[session_date][metric_name] = max(
                            metric_data[session_date][metric_name], volume
                        )
                    else:
                        metric_data[session_date][metric_name] = volume
                except:
                    pass

if not available_metrics:
    st.info("Nenhuma métrica disponível. Complete sessões de treino ou adicione avaliações para ver analíticas.")
else:
    # Multi-select for metrics
    selected_metrics = st.multiselect(
        "Selecione Métricas para Mostrar",
        available_metrics,
        default=available_metrics[:2] if len(available_metrics) >= 2 else available_metrics
    )
    
    if selected_metrics:
        # Build DataFrame with all dates and selected metrics
        all_dates = sorted(metric_data.keys())
        
        chart_data = []
        for date in all_dates:
            # Convert to date string to avoid time display
            date_str = date.strftime('%Y-%m-%d') if hasattr(date, 'strftime') else str(date)
            row = {'Date': date_str}
            for metric in selected_metrics:
                row[metric] = metric_data[date].get(metric, None)
            chart_data.append(row)
        
        chart_df = pd.DataFrame(chart_data)
        chart_df = chart_df.set_index('Date')
        
        # Display line chart
        st.line_chart(chart_df, height=500)
        
        # Show metrics summary
        st.divider()
        st.markdown("#### Resumo de Métricas")
        
        cols = st.columns(min(len(selected_metrics), 4))
        for idx, metric in enumerate(selected_metrics):
            with cols[idx % 4]:
                values = [metric_data[date].get(metric) for date in all_dates if metric in metric_data[date]]
                values = [v for v in values if v is not None]
                
                if len(values) >= 2:
                    change = values[-1] - values[0]
                    change_pct = (change / values[0] * 100) if values[0] != 0 else 0
                    st.metric(
                        metric.replace(" - ", "\n"),
                        f"{values[-1]:.1f}",
                        f"{change:+.1f} ({change_pct:+.1f}%)"
                    )
                elif len(values) == 1:
                    st.metric(metric.replace(" - ", "\n"), f"{values[0]:.1f}")
    else:
        st.info("Selecione pelo menos uma métrica para mostrar o gráfico.")

st.divider()

# Data table view
if selected_metrics and metric_data:
    with st.expander("📋 Ver Tabela de Dados"):
        table_df = pd.DataFrame(chart_data)
        st.dataframe(table_df, hide_index=True, use_container_width=True)
