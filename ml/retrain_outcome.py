"""
Improved outcome model training.
Changes vs original:
  1. Filters out 'Left Without Being Seen' patients (different phenomenon from Admitted/Discharged)
  2. Adds Total Wait Time as 17th feature (post-hoc analysis — wait time is known at enrichment)
  3. scale_pos_weight to handle class imbalance
  4. RandomizedSearchCV over a much larger hyperparameter space
"""
import os
import sys
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split, RandomizedSearchCV
from sklearn.metrics import accuracy_score, roc_auc_score, classification_report
from xgboost import XGBClassifier

sys.path.insert(0, os.path.dirname(__file__))
from preprocessing import URGENCY_MAP, TIME_MAP, DAY_MAP, SEASON_MAP
from feature_engineering import add_engineered_features

DATA_PATH  = os.path.join(os.path.dirname(__file__), 'data', 'ER Wait Time Dataset.csv')
MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')


def load_data():
    df = pd.read_csv(DATA_PATH)

    # Keep only true binary outcomes — exclude 'Left Without Being Seen'
    df = df[df['Patient Outcome'].isin(['Admitted', 'Discharged'])].copy()
    print(f"Rows after dropping LWBS: {len(df)}")

    df = df.drop(columns=[
        'Visit ID', 'Patient ID', 'Hospital ID', 'Hospital Name',
        'Time to Registration (min)', 'Time to Triage (min)',
        'Time to Medical Professional (min)',
    ])

    df['Visit Date'] = pd.to_datetime(df['Visit Date'])
    df['Hour'] = df['Visit Date'].dt.hour
    df = df.drop(columns=['Visit Date'])

    df['Urgency Level'] = df['Urgency Level'].map(URGENCY_MAP)
    df['Time of Day']   = df['Time of Day'].map(TIME_MAP)
    df['Day of Week']   = df['Day of Week'].map(DAY_MAP)
    df['Season']        = df['Season'].map(SEASON_MAP)
    df['Region']        = (df['Region'] == 'Urban').astype(int)
    df['Is Weekend']    = (df['Day of Week'] >= 6).astype(int)

    y = (df['Patient Outcome'] == 'Admitted').astype(int)

    # 16 engineered features + Total Wait Time as 17th
    X = add_engineered_features(df)
    X = X.copy()
    X['Total Wait Time (min)'] = df['Total Wait Time (min)'].values

    return X, y


def train():
    print("=" * 60)
    print("Outcome Model — Improved Training")
    print("=" * 60)

    X, y = load_data()
    feature_names = X.columns.tolist()
    print(f"Features ({len(feature_names)}): {feature_names}\n")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    counts   = y_train.value_counts()
    neg, pos = int(counts.get(0, 1)), int(counts.get(1, 1))
    spw      = neg / pos
    print(f"Train  Discharged: {neg}  Admitted: {pos}  scale_pos_weight: {spw:.3f}")
    print(f"Test   Discharged: {int((y_test==0).sum())}  Admitted: {int((y_test==1).sum())}\n")

    param_dist = {
        'n_estimators':     [200, 300, 400, 500],
        'max_depth':        [3, 4, 5, 6],
        'learning_rate':    [0.01, 0.03, 0.05, 0.1],
        'subsample':        [0.7, 0.8, 0.9, 1.0],
        'colsample_bytree': [0.6, 0.7, 0.8, 1.0],
        'min_child_weight': [1, 3, 5, 10],
        'gamma':            [0, 0.05, 0.1, 0.2],
        'reg_alpha':        [0, 0.1, 0.5, 1.0],
        'reg_lambda':       [1, 2, 5],
    }

    base = XGBClassifier(
        random_state=42, n_jobs=-1, verbosity=0,
        eval_metric='logloss',
        scale_pos_weight=spw,
    )

    search = RandomizedSearchCV(
        base, param_distributions=param_dist,
        n_iter=80, cv=5, scoring='roc_auc',
        n_jobs=-1, random_state=42, verbose=1,
    )
    print("Running RandomizedSearchCV (80 iterations × 5-fold)...\n")
    search.fit(X_train, y_train)

    print(f"\nBest CV AUC : {search.best_score_:.4f}")
    print(f"Best params : {search.best_params_}\n")

    best    = search.best_estimator_
    y_pred  = best.predict(X_test)
    y_prob  = best.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_prob)
    print(f"Test Accuracy : {acc:.4f}")
    print(f"Test AUC-ROC  : {auc:.4f}\n")
    print(classification_report(y_test, y_pred, target_names=['Discharged', 'Admitted']))

    os.makedirs(MODELS_DIR, exist_ok=True)
    path = os.path.join(MODELS_DIR, 'outcome_model.pkl')
    joblib.dump({'model': best, 'feature_names': feature_names}, path)
    print(f"Saved: {path}")
    print(f"Features: {len(feature_names)}")

    return best, feature_names


if __name__ == '__main__':
    train()
