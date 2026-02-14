import random
import time
from datetime import datetime, timedelta, timezone

import json
import urllib.request
from urllib.error import HTTPError, URLError


API_URL = "http://localhost:8000/api/access/request"

# Example known users and access points. Update to match your seeded data.
USERS = [
    {"badge_id": "B001", "department": "IT", "role": "admin", "clearance": 5},
    {"badge_id": "B002", "department": "Engineering", "role": "manager", "clearance": 4},
    {"badge_id": "B003", "department": "Engineering", "role": "employee", "clearance": 2},
    {"badge_id": "B004", "department": "Engineering", "role": "employee", "clearance": 2},
    {"badge_id": "B005", "department": "Security", "role": "security", "clearance": 3},
    {"badge_id": "B006", "department": "Security", "role": "security", "clearance": 3},
    {"badge_id": "B007", "department": "HR", "role": "manager", "clearance": 4},
    {"badge_id": "B008", "department": "HR", "role": "employee", "clearance": 1},
    {"badge_id": "B009", "department": "Finance", "role": "employee", "clearance": 2},
    {"badge_id": "B010", "department": "Finance", "role": "manager", "clearance": 4},
    {"badge_id": "B011", "department": "Marketing", "role": "employee", "clearance": 1},
    {"badge_id": "B012", "department": "Marketing", "role": "employee", "clearance": 1},
    {"badge_id": "B013", "department": "Engineering", "role": "contractor", "clearance": 2},
    {"badge_id": "B014", "department": "IT", "role": "contractor", "clearance": 2},
    {"badge_id": "B015", "department": "Logistics", "role": "employee", "clearance": 1},
    {"badge_id": "B016", "department": "Logistics", "role": "employee", "clearance": 1},
    {"badge_id": "B017", "department": "IT", "role": "admin", "clearance": 5},
    {"badge_id": "B018", "department": "Engineering", "role": "employee", "clearance": 3},
    {"badge_id": "B019", "department": None, "role": "visitor", "clearance": 1},
    {"badge_id": "B020", "department": "IT", "role": "manager", "clearance": 4},
]

ACCESS_POINTS = [
    {"id": 1, "zone": "Engineering", "is_restricted": False},
    {"id": 2, "zone": "HR", "is_restricted": False},
    {"id": 3, "zone": "Security", "is_restricted": True},
    {"id": 4, "zone": "IT", "is_restricted": True},
    {"id": 5, "zone": "Lobby", "is_restricted": False},
]

UNUSUAL_HOURS = [2, 4, 23]


def pick_access_point_for_department(department: str) -> dict:
    matches = [ap for ap in ACCESS_POINTS if ap["zone"] == department]
    return random.choice(matches) if matches else random.choice(ACCESS_POINTS)


def post_access(badge_id: str, access_point_id: int, timestamp: datetime) -> dict:
    payload = {
        "badge_id": badge_id,
        "access_point_id": access_point_id,
        "timestamp": timestamp.isoformat(),
    }
    start = time.perf_counter()
    data_bytes = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        API_URL,
        data=data_bytes,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=1.0) as response:
            response_body = response.read().decode("utf-8")
            data = json.loads(response_body)
    except HTTPError as exc:
        response_body = exc.read().decode("utf-8") if exc.fp else ""
        data = {"decision": "error", "risk_score": None, "reason": response_body or str(exc)}
    except URLError as exc:
        data = {"decision": "error", "risk_score": None, "reason": str(exc)}

    elapsed_ms = (time.perf_counter() - start) * 1000
    print(
        f"{timestamp.isoformat()} | badge={badge_id} | point={access_point_id} | "
        f"decision={data.get('decision')} | risk={data.get('risk_score')} | "
        f"reason={data.get('reason')} | {elapsed_ms:.0f}ms"
    )
    return data


def simulate_normal():
    user = random.choice(USERS)
    access_point = pick_access_point_for_department(user["department"])

    now = datetime.now(timezone.utc)
    hour = random.randint(8, 18)
    timestamp = now.replace(hour=hour, minute=random.randint(0, 59), second=random.randint(0, 59))

    return post_access(user["badge_id"], access_point["id"], timestamp)


def simulate_unusual_hours():
    user = random.choice(USERS)
    access_point = pick_access_point_for_department(user["department"])
    now = datetime.now(timezone.utc)
    hour = random.choice(UNUSUAL_HOURS)
    timestamp = now.replace(hour=hour, minute=random.randint(0, 59), second=random.randint(0, 59))
    return post_access(user["badge_id"], access_point["id"], timestamp)


def simulate_badge_cloning():
    user = random.choice(USERS)
    point_a = random.choice(ACCESS_POINTS)
    point_b = random.choice([ap for ap in ACCESS_POINTS if ap["id"] != point_a["id"]])

    now = datetime.now(timezone.utc)
    first = post_access(user["badge_id"], point_a["id"], now)
    time.sleep(0.2)
    second = post_access(user["badge_id"], point_b["id"], now + timedelta(minutes=1))
    return first, second


def simulate_restricted_access():
    user = random.choice([u for u in USERS if u["role"] not in {"admin", "security"}])
    restricted_points = [ap for ap in ACCESS_POINTS if ap["is_restricted"]]
    access_point = random.choice(restricted_points) if restricted_points else random.choice(ACCESS_POINTS)

    now = datetime.now(timezone.utc)
    timestamp = now.replace(hour=random.randint(8, 18))
    return post_access(user["badge_id"], access_point["id"], timestamp)


def simulate_high_frequency():
    user = random.choice(USERS)
    access_point = pick_access_point_for_department(user["department"])
    now = datetime.now(timezone.utc)

    # Burst of accesses to raise frequency and time-since-last-access risk.
    results = []
    for idx in range(11):
        ts = now + timedelta(seconds=idx * 5)
        results.append(post_access(user["badge_id"], access_point["id"], ts))
        time.sleep(0.1)
    return results


def simulate_anomalous():
    anomaly = random.choice(
        [
            "unusual_hours",
            "badge_cloning",
            "restricted_access",
            "high_frequency",
        ]
    )
    if anomaly == "unusual_hours":
        return simulate_unusual_hours()
    if anomaly == "badge_cloning":
        return simulate_badge_cloning()
    if anomaly == "restricted_access":
        return simulate_restricted_access()
    return simulate_high_frequency()


def main():
    while True:
        if random.random() < 0.8:
            simulate_normal()
        else:
            simulate_anomalous()

        time.sleep(random.uniform(2, 5))


if __name__ == "__main__":
    main()
