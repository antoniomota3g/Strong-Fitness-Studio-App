import streamlit as st
from datetime import date
import pandas as pd
from collections import defaultdict
import altair as alt
from utils import add_logo
import database as db

add_logo()

st.set_page_config(page_title="Análise de Sessões de Treino", page_icon="📊", layout="wide")

# Initialize database
if 'db_initialized' not in st.session_state:
    db.init_database()
    st.session_state.db_initialized = True
    
st.markdown("# 📊 Análise de Performance do Atleta")

# Load data from database
athletes = db.get_all_athletes()
training_sessions = db.get_all_training_sessions()
evaluations = db.get_all_evaluations()

# Check if there are completed sessions
completed_sessions = [s for s in training_sessions 
                     if s['status'] == 'Completed' and s.get('completed_data')]

if not athletes:
    st.warning("⚠️ Ainda não há atletas registados. Por favor registe atletas primeiro na página de Atletas.")
    st.stop()

if not completed_sessions and not evaluations:
    st.warning("⚠️ Ainda não há sessões de treino completas nem avaliações. Complete algumas sessões ou adicione avaliações para ver analíticas.")
    st.stop()

st.write("Acompanhe a performance do atleta, progresso de treino e composição corporal ao longo do tempo.")

# Athlete selection
st.subheader("Selecionar Atleta")
athlete_options = [f"{a['first_name']} {a['last_name']}" for a in athletes]
selected_athlete_name = st.selectbox("Atleta", athlete_options)

# Find athlete ID
selected_athlete_id = None
for a in athletes:
    if f"{a['first_name']} {a['last_name']}" == selected_athlete_name:
        selected_athlete_id = a['id']
        break

# Filter sessions and evaluations for selected athlete
athlete_sessions = [s for s in completed_sessions if s['athlete_id'] == selected_athlete_id]
athlete_evaluations = [e for e in evaluations if e['athlete_id'] == selected_athlete_id]

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
                    except Exception:
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
                except Exception:
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
            # Keep as real datetime for a continuous time axis
            row = {'Date': pd.to_datetime(date)}
            for metric in selected_metrics:
                row[metric] = metric_data[date].get(metric, None)
            chart_data.append(row)
        
        chart_df = pd.DataFrame(chart_data)

        # Plot in long format so each metric can ignore missing days independently.
        long_df = chart_df.melt(id_vars=['Date'], var_name='Metric', value_name='Value')
        long_df['Value'] = pd.to_numeric(long_df['Value'], errors='coerce')
        long_df = long_df.dropna(subset=['Value'])

        if long_df.empty:
            st.info("Sem dados numéricos suficientes para desenhar o gráfico.")
        else:
            chart = (
                alt.Chart(long_df)
                .mark_line(point=True)
                .encode(
                    x=alt.X(
                        'Date:T',
                        title='Data',
                        axis=alt.Axis(format='%Y-%m-%d', labelAngle=-45),
                    ),
                    y=alt.Y('Value:Q', title='Valor'),
                    color=alt.Color('Metric:N', title='Métrica'),
                    tooltip=[
                        alt.Tooltip('Date:T', title='Data', format='%Y-%m-%d'),
                        alt.Tooltip('Metric:N', title='Métrica'),
                        alt.Tooltip('Value:Q', title='Valor'),
                    ],
                )
                .properties(height=500)
            )

            st.altair_chart(chart, use_container_width=True)
        
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
        if 'Date' in table_df.columns:
            table_df['Date'] = pd.to_datetime(table_df['Date']).dt.strftime('%Y-%m-%d')
        st.dataframe(table_df, hide_index=True, use_container_width=True)
