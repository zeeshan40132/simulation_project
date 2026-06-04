import os
import numpy as np
import joblib
from onnxmltools.convert import convert_xgboost
from onnxmltools.convert.common.data_types import FloatTensorType

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")


def export_to_onnx(pkl_name, onnx_name):
    """Convert a joblib XGBoost model to ONNX via onnxmltools (proper protobuf)."""
    pkl_path  = os.path.join(MODELS_DIR, pkl_name)
    onnx_path = os.path.join(MODELS_DIR, onnx_name)

    bundle = joblib.load(pkl_path)
    model  = bundle["model"]
    feature_names = bundle["feature_names"]
    n = len(feature_names)

    # onnxmltools requires numeric feature indices — temporarily strip names
    booster = model.get_booster()
    original_names = booster.feature_names
    booster.feature_names = None
    try:
        initial_type = [("float_input", FloatTensorType([None, n]))]
        onnx_model = convert_xgboost(model, initial_types=initial_type, target_opset=12)
    finally:
        booster.feature_names = original_names

    with open(onnx_path, "wb") as f:
        f.write(onnx_model.SerializeToString())

    size_kb = os.path.getsize(onnx_path) / 1024
    print(f"Exported  {onnx_name}  ({size_kb:.1f} KB)  features={n}")
    return onnx_path, feature_names


def verify_onnx(onnx_path, n_features):
    """Run a quick inference check to confirm the ONNX file is valid."""
    import onnxruntime as rt

    sess = rt.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
    input_name = sess.get_inputs()[0].name
    X_sample = np.random.rand(4, n_features).astype(np.float32)
    outputs = sess.run(None, {input_name: X_sample})
    print(f"  Verified — {len(outputs)} output(s),  first output shape: {np.array(outputs[0]).shape}")
    return outputs


def export_all():
    configs = [
        ("wait_time_model.pkl",    "wait_time_model.onnx"),
        ("outcome_model.pkl",      "outcome_model.onnx"),
        ("satisfaction_model.pkl", "satisfaction_model.onnx"),
    ]
    for pkl, onnx in configs:
        pkl_path = os.path.join(MODELS_DIR, pkl)
        if not os.path.exists(pkl_path):
            print(f"Skipping {pkl} — run training notebook first")
            continue
        onnx_path, feature_names = export_to_onnx(pkl, onnx)
        verify_onnx(onnx_path, len(feature_names))
        print()


if __name__ == "__main__":
    export_all()
