# UK COVID-19 Data Graphs

This directory contains graphs generated based on UK Health Security Agency (UKHSA) and Office for National Statistics (ONS) data.

## Request
The user requested graphs for "Case rate", "Hospitalisation rate", and "Deaths rate" by vaccination status, specifically:
1.  **Recreation of Week 41 2021 Reference**: To verify methodology.
2.  **Latest Available Complete Data**: The newest period for which all three metrics (Cases, Hospitalisations, Deaths) are available.
3.  **2022 and 2023 Death Rates**: Using the latest ONS data.

## Data Sources
-   **Cases & Hospitalisations**: UKHSA COVID-19 Vaccine Surveillance Reports.
    -   *Note*: UKHSA discontinued publishing Case and Hospitalisation rates by vaccination status in **April 2022**. The latest available complete dataset is Week 13 2022.
-   **Deaths**: ONS "Deaths by vaccination status, England" dataset (April 2021 to May 2023).

## Generated Graphs

1.  **`uk_covid_recreation_wk41_2021.png` (Recreation)**
    -   **Source**: UKHSA Vaccine Surveillance Report Week 41 2021 (Data covering weeks 37-40 2021).
    -   **Content**: Fully populated rates for Cases, Hospitalisations, and Deaths (within 28 days).
    -   **Purpose**: Matches the user's reference image to verify data extraction and plotting methodology.

2.  **`uk_covid_latest_wk13_2022.png` (Latest Complete Data)**
    -   **Source**: UKHSA Vaccine Surveillance Report Week 13 2022 (Data covering weeks 9-12 2022).
    -   **Content**: Fully populated rates for Cases, Hospitalisations, and Deaths.
    -   **Significance**: This is the last major update before the UKHSA discontinued these specific rate tables. It shows the trend where case rates in vaccinated populations often exceeded unvaccinated rates (due to base rate bias and testing behaviors), while severe outcomes remained higher in unvaccinated groups.

3.  **`uk_covid_deaths_2022.png` (Full Year 2022)**
    -   **Source**: ONS "Deaths by vaccination status" dataset.
    -   **Content**: Death rates for the full year of 2022.
    -   *Note*: Cases and Hospitalisations are marked as "Discontinued" as they are not available in the ONS dataset or subsequent UKHSA reports in this format.

4.  **`uk_covid_deaths_2023.png` (Jan-May 2023)**
    -   **Source**: ONS "Deaths by vaccination status" dataset (up to May 2023).
    -   **Content**: Death rates for Jan-May 2023.
    -   *Note*: This is the final data available from this specific ONS series.

## Methodology
-   **Rates**: All rates are per 100,000.
-   **Vaccination Status**:
    -   **Unvaccinated**: Those with no record of vaccination.
    -   **Vaccinated**:
        -   For 2021 Recreation: "Double Vaccinated" (2 doses).
        -   For 2022/23: "Vaccinated" (Aggregated 3+ doses where specified, or all vaccinated categories for ONS data to provide the most robust comparison).
-   **Age Groups**: Standard surveillance 10-year bands (`18-29` to `80+`).

## Files
-   `generate_graphs.py`: Python script containing the hardcoded data extracted from UKHSA PDFs and logic to process the ONS Excel file.
