import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score

# 1. Load the dataset
FILE_PATH = r"C:\Users\carterballow\OneDrive\Desktop\datathon\masterdata.csv"
print(f"Loading data from: {FILE_PATH}...")
df = pd.read_csv(FILE_PATH)

# 2. Define Features and Target
# We are now predicting the dynamic, row-by-row cortisol level
features = [
    'hr_intensity',
    'steps',
    'resting_hr',
    'total_minutes_asleep',
]
target = 'target_cortisol_final'

# 3. Clean the Data
df_clean = df.dropna(subset=features + [target]).copy()

for col in features + [target]:
    df_clean[col] = pd.to_numeric(df_clean[col], errors='coerce')

df_clean = df_clean.dropna(subset=features + [target])

print(f"Data cleaned. Training on {len(df_clean)} rows...")

# 4. Split Data into Training and Testing
X = df_clean[features]
y = df_clean[target]

# test_size=0.2 means 80% training, 20% testing
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 5. Train the Model
# n_estimators=100 builds 100 decision trees.
model = RandomForestRegressor(n_estimators=100, max_depth=15, random_state=42)
model.fit(X_train, y_train)

# 6. Evaluate the Model
y_pred = model.predict(X_test)

mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print("\n" + "="*50)
print("--- ACTUAL MODEL ACCURACY RESULTS ---")
print("="*50)
print(f"Mean Absolute Error (MAE): {mae:.6f} (Average error in raw cortisol units)")
print(f"R-squared (R2):            {r2:.4f}")
print("="*50)

# 7. Feature Importance
print("\n--- Which features drove the prediction? ---")
importances = model.feature_importances_
for feature, importance in zip(features, importances):
    print(f"{feature}: {importance * 100:.2f}%")

    # 8. Directional Impact (Pearson Correlation)
print("\n--- Directional Impact (Relationship) ---")
print(f"{'Feature':<25} | {'Correlation':<12} | {'Direction'}")
print("-" * 55)

# Calculate correlation between each feature and the target
correlations = df_clean[features + [target]].corr()[target].drop(target)

for feature in features:
    corr_val = correlations[feature]
    direction = "POSITIVE (+)" if corr_val > 0 else "NEGATIVE (-)"
    print(f"{feature:<25} | {corr_val:>11.4f} | {direction}")

print("\nInterpretation: Positive means the feature RAISES predicted cortisol. Negative means it LOWERS it.")

import matplotlib.pyplot as plt
import seaborn as sns

# Ensure the graphs look clean for the presentation
sns.set_theme(style="whitegrid")
plt.rcParams['figure.dpi'] = 100

# 1. GRAPH: Feature Importance (The "Weight" of each sensor)
plt.figure(figsize=(10, 5))
importance_df = pd.DataFrame({'Feature': features, 'Importance': importances * 100})
importance_df = importance_df.sort_values(by='Importance', ascending=False)

sns.barplot(x='Importance', y='Feature', data=importance_df, palette='viridis')
plt.title('Feature Importance: Which Metrics Drive the Model?', fontsize=14, fontweight='bold')
plt.xlabel('Importance Percentage (%)')
plt.ylabel('Sensor Metric')
plt.tight_layout()
plt.savefig('feature_importance.png')
# 2. GRAPH: Directional Impact (Positive vs Negative Relationships)
plt.figure(figsize=(10, 5))
corr_df = correlations.reset_index()
corr_df.columns = ['Feature', 'Correlation']
corr_df = corr_df.sort_values(by='Correlation')

# Create a diverging color palette (Red for positive stress, Blue for recovery/negative)
colors = ['red' if x > 0 else 'blue' for x in corr_df['Correlation']]

plt.barh(corr_df['Feature'], corr_df['Correlation'], color=colors, alpha=0.7)
plt.axvline(0, color='black', linewidth=0.8)
plt.title('Directional Impact on Cortisol', fontsize=14, fontweight='bold')
plt.xlabel('Pearson Correlation Coefficient')
plt.annotate('Raises Stress (+)', xy=(0.05, 0.5), xycoords='axes fraction', color='red', fontweight='bold')
plt.annotate('Lowers Stress (-)', xy=(0.75, 0.5), xycoords='axes fraction', color='blue', fontweight='bold')
plt.tight_layout()
plt.savefig('directional_impact.png')

# 3. GRAPH: Actual vs. Predicted (Proving Model Accuracy)
plt.figure(figsize=(8, 8))
plt.scatter(y_test, y_pred, alpha=0.5, color='teal')

# Add the "Perfect Prediction" line
max_val = max(max(y_test), max(y_pred))
min_val = min(min(y_test), min(y_pred))
plt.plot([min_val, max_val], [min_val, max_val], color='red', linestyle='--', label='Perfect Prediction')

plt.title(f'Model Accuracy (R² = {r2:.2f})', fontsize=14, fontweight='bold')
plt.xlabel('Actual Cortisol (Lab Value)')
plt.ylabel('Predicted Cortisol (Model)')
plt.legend()
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig('accuracy_scatter.png')
plt.show()
