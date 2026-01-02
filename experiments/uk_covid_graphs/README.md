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
Based on the available ONS data (`deaths_may_2023.xlsx`), we have generated "Deaths rate per 100,000" graphs for:

1.  **2022 Full Year**: `deaths_2022_full_year.png` (Aggregated data Jan-Dec 2022)
2.  **2022 Year-End (December)**: `deaths_dec_2022.png`
3.  **2023 Full Year (Partial)**: `deaths_2023_full_year.png` (Aggregated data Jan-May 2023)
4.  **2023 Year-End (Proxy: May)**: `deaths_may_2023.png`
    *   *Note: This is the latest data available. Data for late 2023 and 2024 does not exist in this dataset.*

## Methodology
-   **Source**: ONS "Deaths by vaccination status, England" dataset (April 2021 to May 2023).
-   **Age Groups**: Aggregated to match the original request as closely as possible (`18-39`, `40-49`, `50-59`, `60-69`, `70+`). Note that `<18` is not included due to data sparseness/privacy suppression in the ONS dataset for this specific breakdown.
-   **Vaccination Status**:
    -   **Unvaccinated**: Those with no record of vaccination.
    -   **Vaccinated**: Aggregated from all other categories (1st dose, 2nd dose, 3rd/Booster, etc.) to provide a broad "Vaccinated" group for comparison.
-   **Rate Calculation**: `(Count of deaths / Person-years) * 100,000`.

## Files
-   `generate_graphs.py`: Python script used to process the ONS Excel file and generate the plots.
-   `deaths_2022_full_year.png`: Graph for full year 2022.
-   `deaths_2023_full_year.png`: Graph for Jan-May 2023.
-   `deaths_dec_2022.png`: Graph for December 2022.
-   `deaths_may_2023.png`: Graph for May 2023.
