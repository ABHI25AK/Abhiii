# Red Zone Relocation DSS (Decision Support System)

A React-based Decision Support System prototype designed for disaster management, specifically focusing on "Red Zone" relocation and operational triage in the Wayanad District / Kerala State.

## Live Demo
[View Live Prototype](https://abhi25ak.github.io/Abhiii/)

## Overview
This application serves as a multi-role dashboard to assist in disaster response and relocation efforts. It provides a real-time, context-aware interface for different stakeholders involved in disaster management. 

### Supported Roles
The system dynamically switches interfaces based on the active role:
- **Collector (Operational Triage)**: A high-level overview for prioritizing zones and managing resources across the district.
- **Analyst (System Configuration)**: Detailed data analysis, hazard scoring, and system parameter configuration.
- **Field Officer (Ground Validation)**: Mobile-friendly view for on-the-ground validation of affected areas and data collection.

## Features
- **Role-Based Access Control**: Seamlessly switch between Collector, Analyst, and Field Officer views.
- **Interactive Mapping**: Geographic visualization of hazards and affected zones (powered by Leaflet).
- **Priority Dashboards**: Dynamic scoring and prioritization of areas requiring immediate relocation or intervention.
- **Responsive Design**: Tailored UI for both desktop command centers and mobile field usage.

## Tech Stack
- **Frontend**: React (v19)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Mapping**: React Leaflet
- **Icons**: Lucide React
- **Deployment**: GitHub Pages

## Running Locally

1. **Clone the repository**
   ```bash
   git clone https://github.com/ABHI25AK/Abhiii.git
   cd Abhiii
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

## Deployment

This project is configured to automatically deploy to GitHub Pages.

To deploy manually:
```bash
npm run deploy
```
This script will build the project using Vite and push the `dist` folder to the `gh-pages` branch.

## Configuration
The Vite base path is set to `/Abhiii/` in `vite.config.js` to match the GitHub repository name for correct GitHub Pages deployment. If you rename the repository, make sure to update the `base` property in `vite.config.js` and the `homepage` URL in `package.json`.
