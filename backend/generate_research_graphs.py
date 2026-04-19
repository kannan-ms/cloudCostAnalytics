"""
Cloud Cost Analytics - Research Graph Generation
Generates professional anomaly detection and forecasting visualizations
for cloud cost analysis research papers.
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
from sklearn.ensemble import IsolationForest
from prophet import Prophet
import warnings

warnings.filterwarnings('ignore')


def generate_simulated_dataset(days=180, base_cost=500, anomaly_probability=0.05):
    """
    Generate a realistic time-series dataset of daily cloud costs.
    
    Args:
        days (int): Number of days to simulate
        base_cost (float): Base daily cloud cost
        anomaly_probability (float): Probability of anomaly occurrence
    
    Returns:
        pd.DataFrame: DataFrame with 'date' and 'cost' columns
    """
    dates = [datetime.now() - timedelta(days=days-i) for i in range(days)]
    
    # Generate base costs with trend and seasonality
    trend = np.linspace(0, 100, days)
    seasonality = 50 * np.sin(np.linspace(0, 4*np.pi, days))
    noise = np.random.normal(0, 30, days)
    
    costs = base_cost + trend + seasonality + noise
    
    # Inject realistic anomalies (sudden spikes)
    anomaly_indices = np.random.choice(
        days, 
        size=max(1, int(days * anomaly_probability)), 
        replace=False
    )
    
    for idx in anomaly_indices:
        costs[idx] *= np.random.uniform(2, 4)  # 2-4x spike
    
    # Ensure costs are positive
    costs = np.maximum(costs, 50)
    
    df = pd.DataFrame({
        'date': sorted(dates),
        'cost': costs
    })
    
    return df.reset_index(drop=True)


def detect_anomalies(df, contamination=0.05):
    """
    Perform anomaly detection using Isolation Forest.
    
    Args:
        df (pd.DataFrame): DataFrame with 'cost' column
        contamination (float): Expected proportion of anomalies
    
    Returns:
        pd.DataFrame: Original DataFrame with 'anomaly' column added
    """
    # Create Isolation Forest model
    iso_forest = IsolationForest(
        contamination=contamination,
        random_state=42,
        n_estimators=100
    )
    
    # Reshape data for sklearn (expects 2D array)
    X = df[['cost']].values
    
    # Fit and predict (-1 for anomaly, 1 for normal)
    df['anomaly'] = iso_forest.fit_predict(X)
    
    return df


def plot_anomaly_detection(df, output_path='anomaly_detection.png'):
    """
    Generate and save anomaly detection visualization.
    
    Args:
        df (pd.DataFrame): DataFrame with 'date', 'cost', and 'anomaly' columns
        output_path (str): Path to save the figure
    """
    fig, ax = plt.subplots(figsize=(14, 7))
    
    # Separate normal and anomaly points
    normal_points = df[df['anomaly'] == 1]
    anomaly_points = df[df['anomaly'] == -1]
    
    # Plot normal points
    ax.scatter(
        normal_points['date'],
        normal_points['cost'],
        color='#2E86AB',
        label='Normal',
        s=50,
        alpha=0.7,
        edgecolors='none'
    )
    
    # Plot anomalies with emphasis
    ax.scatter(
        anomaly_points['date'],
        anomaly_points['cost'],
        color='#A23B72',
        label='Anomaly',
        s=150,
        marker='X',
        alpha=0.9,
        edgecolors='#7A1E4F',
        linewidths=1.5
    )
    
    # Add trend line for context
    z = np.polyfit(range(len(df)), df['cost'], 2)
    p = np.poly1d(z)
    ax.plot(
        df['date'],
        p(range(len(df))),
        '--',
        color='#F18F01',
        alpha=0.6,
        linewidth=2,
        label='Trend'
    )
    
    # Formatting
    ax.set_xlabel('Date', fontsize=12, fontweight='bold')
    ax.set_ylabel('Cost ($)', fontsize=12, fontweight='bold')
    ax.set_title(
        'Cloud Cost Anomaly Detection Using Isolation Forest',
        fontsize=14,
        fontweight='bold',
        pad=20
    )
    ax.legend(fontsize=11, loc='best', framealpha=0.9)
    ax.grid(True, alpha=0.3, linestyle='--')
    
    # Format x-axis dates
    fig.autofmt_xdate(rotation=45)
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    print(f"✓ Anomaly detection graph saved: {output_path}")
    plt.close()


def prepare_prophet_data(df):
    """
    Prepare data for Prophet forecasting.
    Prophet requires columns named 'ds' and 'y'.
    
    Args:
        df (pd.DataFrame): DataFrame with 'date' and 'cost' columns
    
    Returns:
        pd.DataFrame: DataFrame formatted for Prophet
    """
    prophet_df = df[['date', 'cost']].copy()
    prophet_df.columns = ['ds', 'y']
    prophet_df['ds'] = pd.to_datetime(prophet_df['ds'])
    
    return prophet_df


def forecast_costs(df, periods=30):
    """
    Perform time-series forecasting using Prophet.
    
    Args:
        df (pd.DataFrame): DataFrame with 'date' and 'cost' columns
        periods (int): Number of days to forecast
    
    Returns:
        tuple: (fitted model, forecast DataFrame, original data for Prophet)
    """
    # Prepare data for Prophet
    prophet_df = prepare_prophet_data(df)
    
    # Initialize and train Prophet model
    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,
        interval_width=0.95
    )
    
    print("Training Prophet model...")
    model.fit(prophet_df)
    
    # Create future dataframe for forecasting
    future = model.make_future_dataframe(periods=periods)
    
    # Generate forecast
    forecast = model.predict(future)
    
    return model, forecast, prophet_df


def plot_forecast(df, forecast, model, output_path='cost_forecast.png'):
    """
    Generate and save time-series forecast visualization.
    
    Args:
        df (pd.DataFrame): Original DataFrame with 'date' and 'cost' columns
        forecast (pd.DataFrame): Prophet forecast output
        model: Fitted Prophet model
        output_path (str): Path to save the figure
    """
    fig, ax = plt.subplots(figsize=(14, 7))
    
    # Plot actual historical data
    ax.plot(
        df['date'],
        df['cost'],
        color='#2E86AB',
        linewidth=2.5,
        label='Historical Data',
        marker='o',
        markersize=3,
        alpha=0.8
    )
    
    # Plot forecast
    forecast_future = forecast[forecast['ds'] > df['date'].max()]
    ax.plot(
        forecast_future['ds'],
        forecast_future['yhat'],
        color='#F18F01',
        linewidth=2.5,
        label='Forecast',
        linestyle='--',
        marker='s',
        markersize=3
    )
    
    # Plot confidence interval
    ax.fill_between(
        forecast_future['ds'],
        forecast_future['yhat_lower'],
        forecast_future['yhat_upper'],
        color='#F18F01',
        alpha=0.2,
        label='95% Confidence Interval'
    )
    
    # Add vertical line at forecast start
    forecast_start = df['date'].max()
    ax.axvline(x=forecast_start, color='gray', linestyle=':', alpha=0.5, linewidth=1.5)
    
    # Formatting
    ax.set_xlabel('Date', fontsize=12, fontweight='bold')
    ax.set_ylabel('Cost ($)', fontsize=12, fontweight='bold')
    ax.set_title(
        'Cloud Cost Forecast (30-Day Prediction)',
        fontsize=14,
        fontweight='bold',
        pad=20
    )
    ax.legend(fontsize=11, loc='best', framealpha=0.9)
    ax.grid(True, alpha=0.3, linestyle='--')
    
    # Format x-axis dates
    fig.autofmt_xdate(rotation=45)
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    print(f"✓ Forecast graph saved: {output_path}")
    plt.close()


def print_analysis_summary(df, forecast):
    """
    Print summary statistics for the analysis.
    
    Args:
        df (pd.DataFrame): DataFrame with anomaly detection results
        forecast (pd.DataFrame): Prophet forecast output
    """
    anomaly_count = (df['anomaly'] == -1).sum()
    anomaly_percentage = (anomaly_count / len(df)) * 100
    
    print("\n" + "="*60)
    print("CLOUD COST ANALYSIS SUMMARY")
    print("="*60)
    print(f"\nHistorical Data Analysis:")
    print(f"  • Date Range: {df['date'].min().date()} to {df['date'].max().date()}")
    print(f"  • Total Days: {len(df)}")
    print(f"  • Average Daily Cost: ${df['cost'].mean():.2f}")
    print(f"  • Cost Range: ${df['cost'].min():.2f} - ${df['cost'].max():.2f}")
    print(f"  • Standard Deviation: ${df['cost'].std():.2f}")
    
    print(f"\nAnomaly Detection Results:")
    print(f"  • Anomalies Detected: {anomaly_count} ({anomaly_percentage:.1f}%)")
    print(f"  • Average Anomaly Cost: ${df[df['anomaly'] == -1]['cost'].mean():.2f}")
    
    forecast_data = forecast[forecast['ds'] > df['date'].max()]
    if len(forecast_data) > 0:
        print(f"\nForecast (Next 30 Days):")
        print(f"  • Forecasted Average Cost: ${forecast_data['yhat'].mean():.2f}")
        print(f"  • Forecast Range: ${forecast_data['yhat_lower'].min():.2f} - ${forecast_data['yhat_upper'].max():.2f}")
    
    print("\n" + "="*60 + "\n")


def main():
    """
    Main execution pipeline for graph generation.
    """
    print("\n🚀 Starting Cloud Cost Analysis...\n")
    
    # Step 1: Generate simulated dataset
    print("1. Generating simulated dataset...")
    df = generate_simulated_dataset(days=180, base_cost=500, anomaly_probability=0.05)
    print(f"   ✓ Generated {len(df)} days of cloud cost data")
    
    # Step 2: Detect anomalies
    print("\n2. Detecting anomalies using Isolation Forest...")
    df = detect_anomalies(df, contamination=0.05)
    anomaly_count = (df['anomaly'] == -1).sum()
    print(f"   ✓ Detected {anomaly_count} anomalies")
    
    # Step 3: Plot anomaly detection
    print("\n3. Generating anomaly detection visualization...")
    plot_anomaly_detection(df, output_path='anomaly_detection.png')
    
    # Step 4: Forecast costs
    print("\n4. Performing time-series forecasting...")
    model, forecast, prophet_df = forecast_costs(df, periods=30)
    print("   ✓ Forecast completed")
    
    # Step 5: Plot forecast
    print("\n5. Generating forecast visualization...")
    plot_forecast(df, forecast, model, output_path='cost_forecast.png')
    
    # Step 6: Print summary
    print_analysis_summary(df, forecast)
    
    print("✅ Analysis complete! Graphs ready for research paper.\n")
    
    return df, forecast


if __name__ == "__main__":
    df, forecast = main()
