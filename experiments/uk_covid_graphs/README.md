# UK COVID-19 Data Graphs

This directory contains graphs generated based on UK Office for National Statistics (ONS) data.

## Request
The user requested graphs for "Case rate", "Hospitalisation rate", and "Deaths rate" by vaccination status for year-end 2022, 2023, and 2024, similar to a UKHSA report from 2021.

## Data Availability
The UK Health Security Agency (UKHSA) and ONS have made significant changes to data reporting since 2021:

1.  **Cases by Vaccination Status**: UKHSA discontinued the publication of case rates by vaccination status in April 2022. This was due to changes in testing policies (free testing ended) and data biases that made the "unvaccinated" rates unreliable for comparison (e.g., different testing behaviors). Therefore, it is not possible to generate the "Case rate" graph for late 2022, 2023, or 2024.
2.  **Hospitalisations by Vaccination Status**: UKHSA surveillance reports moved away from raw rate tables to "Vaccine Effectiveness" estimates. Raw rates per 100,000 for "Unvaccinated" vs "Double Vaccinated" are not provided in the same format in later reports (e.g., Week 2 2023, Week 4 2024).
3.  **Deaths by Vaccination Status**: ONS published "Deaths by vaccination status, England" but this series was paused in July 2022 and updated later. The final update covers data up to **May 2023**. ONS stated: "We will no longer be updating the Deaths by vaccination status analysis, England series."

## Generated Graphs
The generated graphs (`uk_covid_data_*.png`) follow the requested 3-row layout (Cases, Hospitalisations, Deaths).

-   **Cases & Hospitalisations**: These sections are included but marked as "Data Discontinued" for 2022, 2023, and 2024, reflecting the cessation of these specific data series by the UK government.
-   **Deaths**: These sections are populated with available ONS data.

Files:
1.  **2022 Dashboard**: `uk_covid_data_2022.png` (Deaths data aggregated for Full Year 2022)
2.  **2023 Dashboard**: `uk_covid_data_2023.png` (Deaths data aggregated for Jan-May 2023)
3.  **2024 Dashboard**: `uk_covid_data_2024.png` (Empty, as no data exists)
4.  **Recreation Attempt (Sept 2021)**: `uk_covid_data_recreation_sept_2021.png`
    -   This graph attempts to recreate the reference image (Weeks 37-40 2021) using ONS data for September 2021.
    -   **Note on Differences**: The reference image uses UKHSA data, while this recreation uses ONS data. Discrepancies in rates are expected due to different methodologies (e.g., ONS uses "Person-years" and links to Census 2011/2021, while UKHSA used NIMS population estimates). However, the general trend (higher death rates in unvaccinated older populations) is consistent.

## Methodology
-   **Source**: ONS "Deaths by vaccination status, England" dataset (April 2021 to May 2023).
-   **Age Groups**: Aggregated to match the original request as closely as possible (`18-39`, `40-49`, `50-59`, `60-69`, `70+`). Note that `<18` is not included due to data sparseness/privacy suppression in the ONS dataset for this specific breakdown.
-   **Vaccination Status**:
    -   **Unvaccinated**: Those with no record of vaccination.
    -   **Vaccinated**: Aggregated from all other categories (1st dose, 2nd dose, 3rd/Booster, etc.) to provide a broad "Vaccinated" group for comparison.
-   **Rate Calculation**: `(Count of deaths / Person-years) * 100,000`.

## Files
-   `generate_graphs.py`: Python script used to process the ONS Excel file and generate the plots.
-   `uk_covid_data_2022.png`: Dashboard for 2022.
-   `uk_covid_data_2023.png`: Dashboard for 2023.
-   `uk_covid_data_2024.png`: Dashboard for 2024.
-   `uk_covid_data_recreation_sept_2021.png`: Proxy recreation of the reference image period.
