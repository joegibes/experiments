
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

def process_data(df, year, month=None):
    # If month is None, process full year
    if month:
        subset = df[(df['Year'] == year) & (df['Month'] == month)].copy()
        period_name = f"{month} {year}"
    else:
        subset = df[df['Year'] == year].copy()
        period_name = f"Full Year {year}"

    if subset.empty:
        print(f"No data for {period_name}")
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
    grouped['Rate'] = grouped.apply(lambda x: (x['Count of deaths'] / x['Person-years'] * 100000) if x['Person-years'] > 0 else 0, axis=1)

    return grouped

def create_dashboard(deaths_data, title, filename):
    # Create figure with 3 subplots
    fig, axes = plt.subplots(3, 1, figsize=(10, 15), sharex=True)
    fig.suptitle(title, fontsize=16)

    age_order = ['18-39', '40-49', '50-59', '60-69', '70+']

    # --- Plot 1: Case Rates ---
    ax_cases = axes[0]
    ax_cases.set_ylabel('Case rate\nper 100,000')
    ax_cases.set_title('Cases (Data Discontinued)')
    ax_cases.text(0.5, 0.5, 'Case rate data by vaccination status\ndiscontinued by UKHSA in April 2022',
                  ha='center', va='center', transform=ax_cases.transAxes, fontsize=12, color='gray')
    ax_cases.set_yticks([]) # Hide y-ticks as no data

    # --- Plot 2: Hospitalisation Rates ---
    ax_hosp = axes[1]
    ax_hosp.set_ylabel('Hospitalisation rate\nper 100,000')
    ax_hosp.set_title('Hospitalisations (Data Discontinued)')
    ax_hosp.text(0.5, 0.5, 'Hospitalisation rate data by vaccination status\ndiscontinued/incompatible format in 2022',
                 ha='center', va='center', transform=ax_hosp.transAxes, fontsize=12, color='gray')
    ax_hosp.set_yticks([])

    # --- Plot 3: Death Rates ---
    ax_deaths = axes[2]
    if deaths_data is not None:
        pivot = deaths_data.pivot(index='Target_Age', columns='Target_Status', values='Rate')
        pivot = pivot.reindex(age_order)

        # Colors: Unvaccinated (Red), Vaccinated (Blue)
        colors = {'Unvaccinated': '#AA0000', 'Vaccinated': '#0000AA'}

        # Plot bars manually to control colors and order
        x = np.arange(len(age_order))
        width = 0.35

        # Check if we have both columns
        cols = pivot.columns

        if 'Unvaccinated' in cols:
            bars1 = ax_deaths.bar(x - width/2, pivot['Unvaccinated'], width, label='Unvaccinated', color=colors['Unvaccinated'])
            ax_deaths.bar_label(bars1, fmt='%.1f', padding=3)

        if 'Vaccinated' in cols:
            bars2 = ax_deaths.bar(x + width/2, pivot['Vaccinated'], width, label='Vaccinated', color=colors['Vaccinated'])
            ax_deaths.bar_label(bars2, fmt='%.1f', padding=3)

        ax_deaths.set_ylabel('Deaths rate\nper 100,000')
        ax_deaths.set_xlabel('Age Group')
        ax_deaths.set_xticks(x)
        ax_deaths.set_xticklabels(age_order)
        ax_deaths.legend()
        ax_deaths.grid(axis='y', linestyle='--', alpha=0.3)

        # Remove top and right spines for style
        ax_deaths.spines['top'].set_visible(False)
        ax_deaths.spines['right'].set_visible(False)
    else:
        ax_deaths.text(0.5, 0.5, 'No Data Available', ha='center', va='center')

    plt.tight_layout(rect=[0, 0.03, 1, 0.95]) # Adjust for suptitle
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

    # 1. Dashboard for Full Year 2022
    print("Generating 2022 Dashboard...")
    data_2022 = process_data(df, 2022)
    create_dashboard(data_2022, 'UK COVID-19 Outcomes by Vaccination Status - 2022', 'uk_covid_data_2022.png')

    # 2. Dashboard for Full Year 2023 (Jan-May)
    print("Generating 2023 Dashboard...")
    data_2023 = process_data(df, 2023)
    create_dashboard(data_2023, 'UK COVID-19 Outcomes by Vaccination Status - 2023 (Jan-May)', 'uk_covid_data_2023.png')

    # 3. Dashboard for 2024
    print("Generating 2024 Dashboard...")
    # No data for 2024, pass None
    create_dashboard(None, 'UK COVID-19 Outcomes by Vaccination Status - 2024', 'uk_covid_data_2024.png')

    # 4. Recreation of Reference Image (Sept 2021)
    # The reference image covers "Weeks 37-40 of 2021".
    # Sept 2021 roughly covers weeks 35-39. Oct is 39-43.
    # We will use September 2021 ONS data as the closest monthly proxy.
    print("Generating Recreation Dashboard (Sept 2021)...")
    data_sep_2021 = process_data(df, 2021, 'September')
    create_dashboard(data_sep_2021, 'RECREATION ATTEMPT: UK COVID-19 Outcomes (Sept 2021 Proxy)', 'uk_covid_data_recreation_sept_2021.png')

if __name__ == "__main__":
    main()
