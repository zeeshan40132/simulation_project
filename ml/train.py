import os
import numpy as np
import joblib
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import (
    mean_squared_error, mean_absolute_error, r2_score,
    accuracy_score, classification_report, roc_auc_score
)
from sklearn.model_selection import cross_val_score, GridSearchCV
from xgboost import XGBRegressor, XGBClassifier

from feature_engineering import prepare_with_features

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)


def rmse(y_true, y_pred):
    return float(np.sqrt(mean_squared_error(y_true, y_pred)))


def evaluate_regression(model, X_test, y_test, label=""):
    y_pred = model.predict(X_test)
    metrics = {
        "rmse": rmse(y_test, y_pred),
        "mae": float(mean_absolute_error(y_test, y_pred)),
        "r2": float(r2_score(y_test, y_pred)),
    }
    if label:
        print(f"[{label}]  RMSE={metrics['rmse']:.3f}  MAE={metrics['mae']:.3f}  R²={metrics['r2']:.4f}")
    return metrics, y_pred


def evaluate_classifier(model, X_test, y_test, label=""):
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1] if hasattr(model, "predict_proba") else None
    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "auc": float(roc_auc_score(y_test, y_prob)) if y_prob is not None else None,
    }
    if label:
        print(f"[{label}]  Accuracy={metrics['accuracy']:.4f}  AUC={metrics['auc']:.4f}")
        print(classification_report(y_test, y_pred, target_names=["Not Admitted", "Admitted"]))
    return metrics, y_pred


def train_wait_time_model(cv=5, tune=True):
    """Train XGBoost regressor for wait time prediction. Returns (best_model, metrics, feature_names)."""
    splits = prepare_with_features()
    X_train, X_test = splits["X_train"], splits["X_test"]
    y_train, y_test = splits["y_wait_train"], splits["y_wait_test"]
    feature_names = splits["feature_names"]

    # Baseline
    lr = LinearRegression()
    lr.fit(X_train, y_train)
    evaluate_regression(lr, X_test, y_test, "LinearRegression (baseline)")

    # XGBoost default
    xgb = XGBRegressor(n_estimators=300, random_state=42, n_jobs=-1, verbosity=0)
    xgb.fit(X_train, y_train)
    evaluate_regression(xgb, X_test, y_test, "XGBoost (default)")

    # Random Forest
    rf = RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)
    evaluate_regression(rf, X_test, y_test, "RandomForest")

    # Cross-val on XGBoost
    cv_scores = cross_val_score(xgb, X_train, y_train, cv=cv, scoring="neg_root_mean_squared_error", n_jobs=-1)
    print(f"\nXGBoost CV RMSE: {-cv_scores.mean():.3f} ± {cv_scores.std():.3f}")

    best_model = xgb

    if tune:
        param_grid = {
            "n_estimators": [200, 300, 400],
            "max_depth": [4, 6, 8],
            "learning_rate": [0.05, 0.1, 0.2],
            "subsample": [0.8, 1.0],
        }
        grid = GridSearchCV(
            XGBRegressor(random_state=42, n_jobs=-1, verbosity=0),
            param_grid,
            cv=3,
            scoring="neg_root_mean_squared_error",
            n_jobs=-1,
            verbose=1,
        )
        grid.fit(X_train, y_train)
        best_model = grid.best_estimator_
        print(f"\nBest params: {grid.best_params_}")
        evaluate_regression(best_model, X_test, y_test, "XGBoost (tuned)")

    final_metrics, _ = evaluate_regression(best_model, X_test, y_test, "FINAL")
    path = os.path.join(MODELS_DIR, "wait_time_model.pkl")
    joblib.dump({"model": best_model, "feature_names": feature_names}, path)
    print(f"\nSaved → {path}")
    return best_model, final_metrics, feature_names


def train_outcome_model(cv=5, tune=True):
    """Train XGBoost classifier for patient outcome (admitted/not admitted)."""
    splits = prepare_with_features()
    X_train, X_test = splits["X_train"], splits["X_test"]
    y_train, y_test = splits["y_outcome_train"], splits["y_outcome_test"]
    feature_names = splits["feature_names"]

    # Baseline
    lr = LogisticRegression(max_iter=1000, random_state=42)
    lr.fit(X_train, y_train)
    evaluate_classifier(lr, X_test, y_test, "LogisticRegression (baseline)")

    # XGBoost default
    xgb = XGBClassifier(n_estimators=300, random_state=42, n_jobs=-1, verbosity=0, eval_metric="logloss")
    xgb.fit(X_train, y_train)
    evaluate_classifier(xgb, X_test, y_test, "XGBoost (default)")

    # Random Forest
    rf = RandomForestClassifier(n_estimators=200, random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)
    evaluate_classifier(rf, X_test, y_test, "RandomForest")

    best_model = xgb

    if tune:
        param_grid = {
            "n_estimators": [200, 300],
            "max_depth": [4, 6],
            "learning_rate": [0.05, 0.1],
            "subsample": [0.8, 1.0],
        }
        grid = GridSearchCV(
            XGBClassifier(random_state=42, n_jobs=-1, verbosity=0, eval_metric="logloss"),
            param_grid,
            cv=3,
            scoring="roc_auc",
            n_jobs=-1,
            verbose=1,
        )
        grid.fit(X_train, y_train)
        best_model = grid.best_estimator_
        print(f"\nBest params: {grid.best_params_}")
        evaluate_classifier(best_model, X_test, y_test, "XGBoost (tuned)")

    final_metrics, _ = evaluate_classifier(best_model, X_test, y_test, "FINAL")
    path = os.path.join(MODELS_DIR, "outcome_model.pkl")
    joblib.dump({"model": best_model, "feature_names": feature_names}, path)
    print(f"\nSaved → {path}")
    return best_model, final_metrics, feature_names


def train_satisfaction_model(cv=5, tune=True):
    """Train XGBoost regressor for patient satisfaction score."""
    splits = prepare_with_features()
    X_train, X_test = splits["X_train"], splits["X_test"]
    y_train, y_test = splits["y_satisfaction_train"], splits["y_satisfaction_test"]
    feature_names = splits["feature_names"]

    # Baseline
    lr = LinearRegression()
    lr.fit(X_train, y_train)
    evaluate_regression(lr, X_test, y_test, "LinearRegression (baseline)")

    xgb = XGBRegressor(n_estimators=300, random_state=42, n_jobs=-1, verbosity=0)
    xgb.fit(X_train, y_train)
    evaluate_regression(xgb, X_test, y_test, "XGBoost (default)")

    rf = RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)
    evaluate_regression(rf, X_test, y_test, "RandomForest")

    best_model = xgb

    if tune:
        param_grid = {
            "n_estimators": [200, 300, 400],
            "max_depth": [4, 6, 8],
            "learning_rate": [0.05, 0.1],
            "subsample": [0.8, 1.0],
        }
        grid = GridSearchCV(
            XGBRegressor(random_state=42, n_jobs=-1, verbosity=0),
            param_grid,
            cv=3,
            scoring="neg_root_mean_squared_error",
            n_jobs=-1,
            verbose=1,
        )
        grid.fit(X_train, y_train)
        best_model = grid.best_estimator_
        print(f"\nBest params: {grid.best_params_}")
        evaluate_regression(best_model, X_test, y_test, "XGBoost (tuned)")

    final_metrics, _ = evaluate_regression(best_model, X_test, y_test, "FINAL")
    path = os.path.join(MODELS_DIR, "satisfaction_model.pkl")
    joblib.dump({"model": best_model, "feature_names": feature_names}, path)
    print(f"\nSaved → {path}")
    return best_model, final_metrics, feature_names


if __name__ == "__main__":
    print("=" * 60)
    print("Training Wait Time Model")
    print("=" * 60)
    train_wait_time_model(tune=True)
