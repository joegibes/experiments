# UK COVID-19 Data Graphs

This directory contains graphs generated based on UK Health Security Agency (UKHSA) and Office for National Statistics (ONS) data.

## Request
The user requested graphs for "Case rate", "Hospitalisation rate", and "Deaths rate" by vaccination status, specifically:
1.  **Recreation of Week 41 2021 Reference**: To verify methodology and match the original visualization.
2.  **Latest Available Complete Data**: The newest period for which all three metrics (Cases, Hospitalisations, Deaths) are available.
3.  **2022 and 2023 Death Rates**: Using the latest ONS data.

## Data Sources
-   **Cases & Hospitalisations**: Extracted from **UKHSA COVID-19 Vaccine Surveillance Reports**.
    -   *Note*: The user provided ONS links for "Cases" and "Hospitalisations", but inspection revealed these were for specific subpopulations (Occupation and Pregnancy respectively) and did not cover the general population or the 2022/23 period. Therefore, we utilized the official UKHSA surveillance reports (Week 41 2021 and Week 13 2022) which contain the correct general population data matching the reference image.
    -   UKHSA discontinued publishing Case and Hospitalisation rates by vaccination status in **April 2022**. The latest available complete dataset is Week 13 2022.
-   **Deaths**: **ONS "Deaths by vaccination status, England" dataset** (April 2021 to May 2023).

## Generated Graphs

1.  **`uk_covid_recreation_wk41_2021.png` (Recreation)**
    -   **Source**: UKHSA Vaccine Surveillance Report Week 41 2021.
    -   **Content**: Fully populated rates for Cases, Hospitalisations, and Deaths.
    -   **Age Groups**: Matches the reference (`18-29`, `30-39`...).
    -   **Purpose**: Matches the user's reference image to verify data extraction and plotting methodology.

2.  **`uk_covid_latest_wk13_2022.png` (Latest Complete Data)**
    -   **Source**: UKHSA Vaccine Surveillance Report Week 13 2022.
    -   **Content**: Fully populated rates for Cases, Hospitalisations, and Deaths.
    -   **Significance**: This is the last major update before the UKHSA discontinued these specific rate tables.

3.  **`uk_covid_deaths_2022.png` (Full Year 2022)**
    -   **Source**: ONS "Deaths by vaccination status" dataset.
    -   **Content**: Death rates for the full year of 2022.
    -   **Age Groups**: `18-39` (Aggregated by ONS), `40-49`... `70+`.
    -   *Note*: Cases and Hospitalisations are marked as "Discontinued/Not Available" as they do not exist in the ONS dataset.

4.  **`uk_covid_deaths_2023.png` (Jan-May 2023)**
    -   **Source**: ONS "Deaths by vaccination status" dataset (up to May 2023).
    -   **Content**: Death rates for Jan-May 2023.

## Methodology
-   **Rates**: All rates are per 100,000.
-   **Vaccination Status**:
    -   **Unvaccinated**: Those with no record of vaccination.
    -   **Vaccinated**:
        -   For 2021 Recreation: "Double Vaccinated" (2 doses) - matching UKHSA definition at the time.
        -   For 2022 Latest: "Vaccinated with at least 3 doses" - matching UKHSA definition for that period.
        -   For 2022/23 Deaths (ONS): "Vaccinated" (Aggregated from all vaccinated categories to provide a broad comparison).
-   **Age Groups**: Standard surveillance 10-year bands. Note that ONS data aggregates `18-39`, while UKHSA reports separate `18-29` and `30-39`.

## Files
-   `generate_graphs.py`: Python script containing the logic to plot the graphs using extracted UKHSA data and ONS Excel data.
