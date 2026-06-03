import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import joblib
import os

DATA_PATH   = os.path.join(os.path.dirname(__file__), 'data', 'ER Wait Time Dataset.csv')
MODELS_PATH = os.path.join(os.path.dirname(__file__), 'models')

URGENCY_MAP = {'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1}
TIME_MAP    = {'Early Morning': 1, 'Late Morning': 2, 'Afternoon': 3, 'Evening': 4, 'Night': 5}
DAY_MAP     = {'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4,
               'Friday': 5, 'Saturday': 6, 'Sunday': 7}
SEASON_MAP  = {'Winter': 1, 'Spring': 2, 'Summer': 3, 'Fall': 4}

FEATURE_COLS = [
    'Urgency Level',
    'Time of Day',
    'Day of Week',
    'Season',
    'Region',
    'Nurse-to-Patient Ratio',
    'Specialist Availability',
    'Facility Size (Beds)',
    'Is Weekend',
]

TARGET_WAIT    = 'Total Wait Time (min)'
TARGET_OUTCOME = 'Patient Outcome'
TARGET_SAT     = 'Patient Satisfaction'


def load_and_clean():
    df = pd.read_csv(DATA_PATH)

    # Drop columns that leak the target or are not useful as features
    df = df.drop(columns=[
        'Visit ID', 'Patient ID', 'Hospital ID', 'Hospital Name',
        'Time to Registration (min)',
        'Time to Triage (min)',
        'Time to Medical Professional (min)',
    ])

    # Parse visit date and extract hour
    df['Visit Date'] = pd.to_datetime(df['Visit Date'])
    df['Hour'] = df['Visit Date'].dt.hour
    df = df.drop(columns=['Visit Date'])

    # Encode ordinal categoricals
    df['Urgency Level'] = df['Urgency Level'].map(URGENCY_MAP)
    df['Time of Day']   = df['Time of Day'].map(TIME_MAP)
    df['Day of Week']   = df['Day of Week'].map(DAY_MAP)
    df['Season']        = df['Season'].map(SEASON_MAP)

    # Encode binary categoricals
    df['Region']          = (df['Region'] == 'Urban').astype(int)
    df['Patient Outcome'] = (df['Patient Outcome'] == 'Admitted').astype(int)

    # Feature engineering
    df['Is Weekend'] = (df['Day of Week'] >= 6).astype(int)

    return df


def get_feature_matrix(df):
    cols = FEATURE_COLS + ['Hour']
    return df[cols]


def prepare_wait_time(test_size=0.2, random_state=42):
    df = load_and_clean()
    X  = get_feature_matrix(df)
    y  = df[TARGET_WAIT]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state
    )
    return X_train, X_test, y_train, y_test


def prepare_outcome(test_size=0.2, random_state=42):
    df = load_and_clean()
    X  = get_feature_matrix(df)
    y  = df[TARGET_OUTCOME]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=y
    )
    return X_train, X_test, y_train, y_test


def prepare_satisfaction(test_size=0.2, random_state=42):
    df = load_and_clean()
    X  = pd.concat([get_feature_matrix(df), df[[TARGET_WAIT]]], axis=1)
    y  = df[TARGET_SAT]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state
    )
    return X_train, X_test, y_train, y_test


if __name__ == '__main__':
    df = load_and_clean()
    print(f'Cleaned shape: {df.shape}')
    print(f'Features: {get_feature_matrix(df).columns.tolist()}')
    print(df.head())
