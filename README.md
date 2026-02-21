##Cortisol Proxy Tracker

Apple Health → ML cortisol score + cohort benchmarking dashboard

Features

Apple Health import (sleep, activity, HRV, RHR, BMI)

Personalized cortisol proxy score + weekly rhythm

Cohort comparison by age/sex/BMI

Explainability (top drivers)

Tech Stack

Frontend:

React Native (Expo)

TypeScript

Chart library

iOS Data Integration:

HealthKit (via React Native bridge)

Backend (if used):

FastAPI

Python

scikit-learn / XGBoost

Model:

Trained in Python

Served via API (or exported as Core ML model)

Architecture

Apple Watch
→ Apple Health
→ Mobile App
→ (Backend ML Model)
→ Dashboard

Setup / Run Instructions
Prerequisites

Node

npm

Xcode (for iOS development)

Python

Frontend
npm install
npm run start

(Expo development server)

iOS development build steps required if HealthKit permissions are enabled.

Backend
pip install -r requirements.txt
uvicorn app:app --reload
Permissions & Privacy

HealthKit Data Requested:

Sleep data

Activity/workout data

Heart rate variability (HRV)

Resting heart rate (RHR)

Height and weight (for BMI calculation)

Data Storage:

Local device storage for user metrics

Backend storage (if enabled) for aggregated feature processing

Disclaimer:
This application is not a medical device and does not provide medical advice. It provides an informational stress/cortisol proxy score based on correlational health signals.

Dataset Sources

Public cohort datasets used for demographic benchmarking (age/sex/BMI distributions).

These datasets are used to generate comparative percentile distributions and benchmark the user’s weekly cortisol proxy score against similar demographic groups.
