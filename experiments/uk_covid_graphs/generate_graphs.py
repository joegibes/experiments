
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import os

# Configuration
INPUT_FILE = "experiments/uk_covid_graphs/ons_deaths_may_2023.xlsx"
OUTPUT_DIR = "experiments/uk_covid_graphs"
SHEET_NAME = "Table 2"

# --- Hardcoded Data for Recreation (Week 41 2021) ---
# Extracted from Table 2, 3, 4 of Week 41 2021 PDF
# Note: Week 41 report covers Wk 37-40 2021
# Data structure: Age Group: [Unvaccinated, Vaccinated]
# Vaccinated refers to "2 doses" in this report for rates

# Table 2: Cases
# Age groups: <18, 18-29, 30-39, 40-49, 50-59, 60-69, 70-79, 80+
recreation_cases = {
    'Under 18': [2670.7, 276.5],
    '18-29': [605.0, 402.6],
    '30-39': [709.8, 823.9],
    '40-49': [696.2, 1455.8],
    '50-59': [489.3, 903.1],
    '60-69': [314.1, 589.0],
    '70-79': [253.0, 451.5],
    '80+': [298.5, 364.6]
}

# Table 3: Hospitalisations
recreation_hosp = {
    'Under 18': [3.3, 0.4],
    '18-29': [5.5, 0.9],
    '30-39': [10.1, 2.1],
    '40-49': [18.8, 4.6],
    '50-59': [25.7, 5.2],
    '60-69': [32.8, 8.4],
    '70-79': [51.2, 16.8],
    '80+': [74.8, 37.3]
}

# Table 4: Deaths (within 28 days)
recreation_deaths = {
    'Under 18': [0.0, 0.0],
    '18-29': [0.4, 0.1],
    '30-39': [0.8, 0.1],
    '40-49': [2.0, 0.4],
    '50-59': [9.9, 1.2],
    '60-69': [20.2, 4.2],
    '70-79': [47.2, 12.7],
    '80+': [128.1, 45.9]
}

# --- Hardcoded Data for Latest Available (Week 13 2022) ---
# Extracted from Table 14 of Week 13 2022 PDF
# Note: Week 13 2022 report covers Week 9-12 2022
# Comparison is "Not vaccinated" vs "Vaccinated with at least 3 doses"
# Age groups: Under 18, 18-29, 30-39, 40-49, 50-59, 60-69, 70-79, 80+
# Format: [Unvaccinated Rate, Vaccinated Rate]

# Cases
latest_cases = {
    'Under 18': [1711.7, 1454.0],
    '18-29': [941.6, 3118.8],
    '30-39': [1085.6, 4324.7],
    '40-49': [955.3, 3957.8],
    '50-59': [779.8, 3303.4],
    '60-69': [572.8, 2814.9],
    '70-79': [532.1, 2161.5],
    '80+': [775.6, 2023.7]
}

# Hospitalisations
latest_hosp = {
    'Under 18': [9.6, 3.1],
    '18-29': [8.2, 5.4],
    '30-39': [7.4, 6.8],
    '40-49': [7.7, 6.0],
    '50-59': [12.9, 9.0],
    '60-69': [22.1, 14.3],
    '70-79': [58.8, 36.6],
    '80+': [123.5, 117.9]
}

# Deaths (within 28 days)
latest_deaths = {
    'Under 18': [0.0, 0.0],
    '18-29': [0.0, 0.1],
    '30-39': [0.3, 0.2],
    '40-49': [0.3, 0.2],
    '50-59': [1.6, 0.5],
    '60-69': [5.9, 1.5],
    '70-79': [20.2, 6.8],
    '80+': [87.4, 44.6]
}


def map_age_group(age_grp):
    if age_grp in ['70-79', '80-89', '90+']:
        return '70+'
    return age_grp

def get_vaccination_category(status):
    if status == 'Unvaccinated':
        return 'Unvaccinated'
    else:
        return 'Vaccinated'

def process_ons_deaths_data(df, year, month=None):
    # If month is None, process full year
    if month:
        subset = df[(df['Year'] == year) & (df['Month'] == month)].copy()
        period_name = f"{month} {year}"
    else:
        subset = df[df['Year'] == year].copy()
        period_name = f"Full Year {year}"

    if subset.empty:
        # print(f"No data for {period_name}")
        return None

    # Filter for COVID deaths
    subset = subset[subset['Cause of Death'] == 'Deaths involving COVID-19']

    # Map Age Groups
    subset['Target_Age'] = subset['Age group'].apply(map_age_group)

    # Map Vaccination Status
    subset['Target_Status'] = subset['Vaccination status'].apply(get_vaccination_category)

    # Convert counts to numeric
    subset['Count of deaths'] = pd.to_numeric(subset['Count of deaths'], errors='coerce').fillna(0)
    subset['Person-years'] = pd.to_numeric(subset['Person-years'], errors='coerce').fillna(0)

    # Group by Target Age and Status
    grouped = subset.groupby(['Target_Age', 'Target_Status'])[['Count of deaths', 'Person-years']].sum().reset_index()

    # Calculate Rate per 100,000
    grouped['Rate'] = grouped.apply(lambda x: (x['Count of deaths'] / x['Person-years'] * 100000) if x['Person-years'] > 0 else 0, axis=1)

    return grouped

def create_manual_dashboard(case_data, hosp_data, death_data, title, filename):
    # This function takes dictionary data {Age: [Unvax, Vax]}

    fig, axes = plt.subplots(3, 1, figsize=(10, 15), sharex=True)
    fig.suptitle(title, fontsize=16)

    age_groups = list(case_data.keys()) # Assuming all dicts have same keys in order
    x = np.arange(len(age_groups))
    width = 0.35
    colors = {'Unvaccinated': '#AA0000', 'Vaccinated': '#0000AA'}

    # Plot 1: Cases
    ax_cases = axes[0]
    unvax_cases = [case_data[age][0] for age in age_groups]
    vax_cases = [case_data[age][1] for age in age_groups]

    bars1 = ax_cases.bar(x - width/2, unvax_cases, width, label='Unvaccinated', color=colors['Unvaccinated'])
    bars2 = ax_cases.bar(x + width/2, vax_cases, width, label='Vaccinated', color=colors['Vaccinated'])
    ax_cases.bar_label(bars1, fmt='%.0f', padding=3)
    ax_cases.bar_label(bars2, fmt='%.0f', padding=3)
    ax_cases.set_ylabel('Case rate\nper 100,000')
    ax_cases.set_title('Cases')
    ax_cases.legend()
    ax_cases.grid(axis='y', linestyle='--', alpha=0.3)
    ax_cases.spines['top'].set_visible(False)
    ax_cases.spines['right'].set_visible(False)

    # Plot 2: Hospitalisations
    ax_hosp = axes[1]
    unvax_hosp = [hosp_data[age][0] for age in age_groups]
    vax_hosp = [hosp_data[age][1] for age in age_groups]

    bars1 = ax_hosp.bar(x - width/2, unvax_hosp, width, label='Unvaccinated', color=colors['Unvaccinated'])
    bars2 = ax_hosp.bar(x + width/2, vax_hosp, width, label='Vaccinated', color=colors['Vaccinated'])
    ax_hosp.bar_label(bars1, fmt='%.0f', padding=3)
    ax_hosp.bar_label(bars2, fmt='%.0f', padding=3)
    ax_hosp.set_ylabel('Hospitalisation rate\nper 100,000')
    ax_hosp.set_title('Hospitalisations')
    # ax_hosp.legend()
    ax_hosp.grid(axis='y', linestyle='--', alpha=0.3)
    ax_hosp.spines['top'].set_visible(False)
    ax_hosp.spines['right'].set_visible(False)

    # Plot 3: Deaths
    ax_deaths = axes[2]
    unvax_death = [death_data[age][0] for age in age_groups]
    vax_death = [death_data[age][1] for age in age_groups]

    bars1 = ax_deaths.bar(x - width/2, unvax_death, width, label='Unvaccinated', color=colors['Unvaccinated'])
    bars2 = ax_deaths.bar(x + width/2, vax_death, width, label='Vaccinated', color=colors['Vaccinated'])
    ax_deaths.bar_label(bars1, fmt='%.0f', padding=3)
    ax_deaths.bar_label(bars2, fmt='%.0f', padding=3)
    ax_deaths.set_ylabel('Deaths rate\nper 100,000')
    ax_deaths.set_title('Deaths')
    ax_deaths.set_xticks(x)
    ax_deaths.set_xticklabels(age_groups)
    # ax_deaths.legend()
    ax_deaths.grid(axis='y', linestyle='--', alpha=0.3)
    ax_deaths.spines['top'].set_visible(False)
    ax_deaths.spines['right'].set_visible(False)
    ax_deaths.set_xlabel('Age Group')

    plt.tight_layout(rect=[0, 0.03, 1, 0.95])
    plt.savefig(os.path.join(OUTPUT_DIR, filename))
    print(f"Saved {filename}")
    plt.close()

def create_ons_dashboard(deaths_data, title, filename):
    # Only for deaths, other rows empty/discontinued
    fig, axes = plt.subplots(3, 1, figsize=(10, 15), sharex=True)
    fig.suptitle(title, fontsize=16)

    age_order = ['18-39', '40-49', '50-59', '60-69', '70+']

    # Empty Cases
    ax_cases = axes[0]
    ax_cases.set_title('Cases (Data Discontinued)')
    ax_cases.text(0.5, 0.5, 'Data Discontinued in 2022', ha='center', va='center')
    ax_cases.set_yticks([])

    # Empty Hosp
    ax_hosp = axes[1]
    ax_hosp.set_title('Hospitalisations (Data Discontinued)')
    ax_hosp.text(0.5, 0.5, 'Data Discontinued in 2022', ha='center', va='center')
    ax_hosp.set_yticks([])

    # Deaths
    ax_deaths = axes[2]
    if deaths_data is not None:
        pivot = deaths_data.pivot(index='Target_Age', columns='Target_Status', values='Rate')
        pivot = pivot.reindex(age_order)
        colors = {'Unvaccinated': '#AA0000', 'Vaccinated': '#0000AA'}
        x = np.arange(len(age_order))
        width = 0.35

        cols = pivot.columns
        if 'Unvaccinated' in cols:
            bars1 = ax_deaths.bar(x - width/2, pivot['Unvaccinated'], width, label='Unvaccinated', color=colors['Unvaccinated'])
            ax_deaths.bar_label(bars1, fmt='%.0f', padding=3)
        if 'Vaccinated' in cols:
            bars2 = ax_deaths.bar(x + width/2, pivot['Vaccinated'], width, label='Vaccinated', color=colors['Vaccinated'])
            ax_deaths.bar_label(bars2, fmt='%.0f', padding=3)

        ax_deaths.set_ylabel('Deaths rate\nper 100,000')
        ax_deaths.set_xticks(x)
        ax_deaths.set_xticklabels(age_order)
        ax_deaths.legend()
        ax_deaths.grid(axis='y', linestyle='--', alpha=0.3)
        ax_deaths.spines['top'].set_visible(False)
        ax_deaths.spines['right'].set_visible(False)

    plt.tight_layout(rect=[0, 0.03, 1, 0.95])
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

    # 1. Recreation (Week 37-40 2021)
    print("Generating Recreation Dashboard...")
    create_manual_dashboard(recreation_cases, recreation_hosp, recreation_deaths,
                          'Recreation: UKHSA Week 41 2021 (Weeks 37-40)', 'uk_covid_recreation_wk41_2021.png')

    # 2. Latest Available (Week 9-12 2022)
    print("Generating Latest Available Dashboard...")
    create_manual_dashboard(latest_cases, latest_hosp, latest_deaths,
                          'Latest Available: UKHSA Week 13 2022 (Weeks 9-12)', 'uk_covid_latest_wk13_2022.png')

    # 3. 2022 Full Year (Deaths only)
    print("Generating 2022 Deaths Dashboard...")
    data_2022 = process_ons_deaths_data(df, 2022)
    create_ons_dashboard(data_2022, 'UK COVID-19 Deaths - Full Year 2022', 'uk_covid_deaths_2022.png')

    # 4. 2023 Full Year (Deaths only)
    print("Generating 2023 Deaths Dashboard...")
    data_2023 = process_ons_deaths_data(df, 2023)
    create_ons_dashboard(data_2023, 'UK COVID-19 Deaths - 2023 (Jan-May)', 'uk_covid_deaths_2023.png')

if __name__ == "__main__":
    main()
