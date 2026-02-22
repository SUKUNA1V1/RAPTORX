from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import json
import shutil
from typing import Iterable


def _registry_path(models_dir: str) -> Path:
    return Path(models_dir) / "current.json"


def _versions_root(models_dir: str) -> Path:
    return Path(models_dir) / "versions"


def _load_registry(models_dir: str) -> dict:
    path = _registry_path(models_dir)
    if not path.exists():
        return {
            "schema_version": 1,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "current": {},
        }

    try:
        with path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
            if isinstance(data, dict) and "current" in data:
                return data
    except Exception:
        pass

    return {
        "schema_version": 1,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "current": {},
    }


def _save_registry(models_dir: str, data: dict) -> None:
    path = _registry_path(models_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2)


def register_model_version(
    model_key: str,
    artifact_paths: Iterable[str],
    models_dir: str = "ml/models",
    version_id: str | None = None,
) -> dict:
    """
    Copy root artifacts to a versioned folder and mark them as current.

    Returns the updated current entry for model_key.
    """
    artifacts = [Path(p) for p in artifact_paths]
    missing = [str(p) for p in artifacts if not p.exists()]
    if missing:
        raise FileNotFoundError(f"Cannot version missing artifacts: {missing}")

    if version_id is None:
        version_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    version_dir = _versions_root(models_dir) / model_key / version_id
    version_dir.mkdir(parents=True, exist_ok=True)

    artifact_map: dict[str, str] = {}
    for src in artifacts:
        dst = version_dir / src.name
        shutil.copy2(src, dst)
        artifact_map[src.name] = str(dst.relative_to(Path(models_dir))).replace("\\", "/")

    registry = _load_registry(models_dir)
    registry["current"][model_key] = {
        "version": version_id,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "artifacts": artifact_map,
    }
    registry["updated_at"] = datetime.now(timezone.utc).isoformat()
    _save_registry(models_dir, registry)
    return registry["current"][model_key]


def resolve_model_artifact_path(
    artifact_filename: str,
    model_key: str | None = None,
    models_dir: str = "ml/models",
) -> str:
    """
    Resolve active artifact path from registry; fallback to root artifact path.
    """
    registry = _load_registry(models_dir)
    current = registry.get("current", {})

    if model_key:
        entry = current.get(model_key, {})
        rel = (entry.get("artifacts") or {}).get(artifact_filename)
        if rel:
            candidate = Path(models_dir) / rel
            if candidate.exists():
                return str(candidate)

    else:
        for entry in current.values():
            rel = (entry.get("artifacts") or {}).get(artifact_filename)
            if rel:
                candidate = Path(models_dir) / rel
                if candidate.exists():
                    return str(candidate)

    return str(Path(models_dir) / artifact_filename)
