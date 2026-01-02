
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import os

# Configuration
INPUT_FILE = "experiments/uk_covid_graphs/ons_deaths_may_2023.xlsx"
OUTPUT_DIR = "experiments/uk_covid_graphs"
SHEET_NAME = "Table 2"

# Age group mapping
def map_age_group(age_grp):
    if age_grp in ['70-79', '80-89', '90+']:
        return '70+'
    return age_grp

def get_vaccination_category(status):
    if status == 'Unvaccinated':
        return 'Unvaccinated'
    else:
        return 'Vaccinated'

def process_data(df, year, month):
    # Filter by date
    # Note: Month is string in ONS file (e.g., 'December')
    # Year is numeric (2022)

    # Check if we need to map numeric month to string if input is different,
    # but here we'll pass string.

    subset = df[(df['Year'] == year) & (df['Month'] == month)].copy()

    if subset.empty:
        print(f"No data for {month} {year}")
        return None

    # Filter for COVID deaths
    subset = subset[subset['Cause of Death'] == 'Deaths involving COVID-19']

    # Map Age Groups
    subset['Target_Age'] = subset['Age group'].apply(map_age_group)

    # Map Vaccination Status
    subset['Target_Status'] = subset['Vaccination status'].apply(get_vaccination_category)

    # Convert counts to numeric (handling 'u' or ':')
    subset['Count of deaths'] = pd.to_numeric(subset['Count of deaths'], errors='coerce').fillna(0)
    subset['Person-years'] = pd.to_numeric(subset['Person-years'], errors='coerce').fillna(0)

    # Group by Target Age and Status
    grouped = subset.groupby(['Target_Age', 'Target_Status'])[['Count of deaths', 'Person-years']].sum().reset_index()

    # Calculate Rate per 100,000
    # Avoid division by zero
    grouped['Rate'] = grouped.apply(lambda x: (x['Count of deaths'] / x['Person-years'] * 100000) if x['Person-years'] > 0 else 0, axis=1)

    return grouped

def plot_graph(data, title, filename):
    if data is None:
        return

    # Pivot for plotting
    pivot = data.pivot(index='Target_Age', columns='Target_Status', values='Rate')

    # Ensure all age groups are present and sorted
    age_order = ['18-39', '40-49', '50-59', '60-69', '70+']
    pivot = pivot.reindex(age_order)

    # Plot
    ax = pivot.plot(kind='bar', figsize=(10, 6), color=['red', 'blue'])

    ax.set_ylabel('Deaths rate per 100,000')
    ax.set_xlabel('Age Group')
    ax.set_title(title)
    plt.xticks(rotation=0)
    plt.grid(axis='y', linestyle='--', alpha=0.7)

    # Add value labels
    for container in ax.containers:
        ax.bar_label(container, fmt='%.1f')

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, filename))
    print(f"Saved {filename}")
    plt.close()

def main():
    if not os.path.exists(INPUT_FILE):
        print(f"Input file not found: {INPUT_FILE}")
        return

    try:
        df = pd.read_excel(INPUT_FILE, sheet_name=SHEET_NAME, header=3)
    except Exception as e:
        print(f"Error reading Excel: {e}")
        return

    # Year-end 2022 (December 2022)
    print("Processing December 2022...")
    data_2022 = process_data(df, 2022, 'December')
    plot_graph(data_2022, 'COVID-19 Death Rates by Vaccination Status - Dec 2022 (ONS Data)', 'deaths_dec_2022.png')

    # Year-end 2023 (Not available, using May 2023)
    print("Processing May 2023 (latest available)...")
    data_2023 = process_data(df, 2023, 'May')
    plot_graph(data_2023, 'COVID-19 Death Rates by Vaccination Status - May 2023 (Latest Available)', 'deaths_may_2023.png')

    # 2024
    print("Data for 2024 is not available in the dataset.")

if __name__ == "__main__":
    main()
