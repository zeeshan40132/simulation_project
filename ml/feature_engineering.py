import pandas as pd
import numpy as np
import sys
import os

sys.path.append(os.path.dirname(__file__))
from preprocessing import load_and_clean, get_feature_matrix, FEATURE_COLS

FACILITY_SIZE_MEDIAN = 94


def add_engineered_features(df):
    X = get_feature_matrix(df).copy()

    # Nurse load — higher ratio means each nurse covers more patients (more stress)
    X['Nurse Load'] = 1 / (X['Nurse-to-Patient Ratio'] + 1)

    # Peak hour flag — afternoons (3) and evenings (4) are busiest per EDA
    X['Is Peak Hour'] = X['Time of Day'].isin([3, 4]).astype(int)

    # Resource pressure — low specialists + high nurse load + small facility = more pressure
    X['Resource Pressure'] = (
        X['Nurse Load'] *
        (1 / (X['Specialist Availability'] + 1)) *
        (1 / np.log1p(X['Facility Size (Beds)']))
    )

    # Urgency × time interaction — critical patient arriving at peak hour is worst case
    X['Urgency x Time'] = X['Urgency Level'] * X['Time of Day']

    # Urgency × weekend — weekends have fewer staff
    X['Urgency x Weekend'] = X['Urgency Level'] * X['Is Weekend']

    # Large facility flag
    X['Large Facility'] = (X['Facility Size (Beds)'] > FACILITY_SIZE_MEDIAN).astype(int)

    return X


ALL_FEATURE_COLS = FEATURE_COLS + ['Hour'] + [
    'Nurse Load',
    'Is Peak Hour',
    'Resource Pressure',
    'Urgency x Time',
    'Urgency x Weekend',
    'Large Facility',
]


def prepare_with_features(test_size=0.2, random_state=42):
    from sklearn.model_selection import train_test_split

    df = load_and_clean()
    X  = add_engineered_features(df)
    y_wait    = df['Total Wait Time (min)']
    y_outcome = df['Patient Outcome']
    y_sat     = df['Patient Satisfaction']

    X_train, X_test, yw_train, yw_test = train_test_split(
        X, y_wait, test_size=test_size, random_state=random_state
    )
    _, _, yo_train, yo_test = train_test_split(
        X, y_outcome, test_size=test_size, random_state=random_state, stratify=y_outcome
    )
    _, _, ys_train, ys_test = train_test_split(
        X, y_sat, test_size=test_size, random_state=random_state
    )

    return {
        'X_train': X_train, 'X_test': X_test,
        'y_wait_train': yw_train, 'y_wait_test': yw_test,
        'y_outcome_train': yo_train, 'y_outcome_test': yo_test,
        'y_sat_train': ys_train, 'y_sat_test': ys_test,
        'feature_names': X_train.columns.tolist(),
    }


if __name__ == '__main__':
    df   = load_and_clean()
    X    = add_engineered_features(df)
    print(f'Feature matrix shape: {X.shape}')
    print(f'Features: {X.columns.tolist()}')
