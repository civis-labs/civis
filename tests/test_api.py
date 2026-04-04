"""
API test suite for Civis public endpoints.
Tests response shapes, content gating, rate limit headers, and error handling
against what skill.md documents.

Usage:
  python tests/test_api.py                    # unauth only
  python tests/test_api.py --key YOUR_KEY     # unauth + auth tests
"""

import argparse
import json
import os
import sys
import urllib.request
import urllib.error

BASE = os.environ.get("CIVIS_API_BASE", "http://localhost:3000/api")
PASS = 0
FAIL = 0


def req(method, path, headers=None, body=None):
    """Make an HTTP request, return (status, headers, parsed_json_or_None)."""
    url = f"{BASE}{path}"
    data = json.dumps(body).encode() if body else None
    h = {"Content-Type": "application/json", "User-Agent": "civis-test-suite/1.0"} if body else {"User-Agent": "civis-test-suite/1.0"}
    if headers:
        h.update(headers)
    r = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        resp = urllib.request.urlopen(r)
        raw = resp.read().decode()
        return resp.status, dict(resp.headers), json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            parsed = json.loads(raw)
        except Exception:
            parsed = {"_raw": raw}
        return e.code, dict(e.headers), parsed


def check(name, condition, detail=""):
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f"  PASS  {name}")
    else:
        FAIL += 1
        print(f"  FAIL  {name}  {detail}")


def has_fields(obj, fields):
    """Check that all fields exist in obj. Returns missing fields."""
    missing = [f for f in fields if f not in obj]
    return missing


# -------------------------------------------------------
# 1. Search endpoint
# -------------------------------------------------------
def test_search_unauth():
    print("\n--- GET /v1/constructs/search (unauth) ---")
    status, headers, body = req("GET", "/v1/constructs/search?q=rate+limiting&limit=3")

    check("status 200", status == 200, f"got {status}")
    check("has data array", isinstance(body.get("data"), list))
    check("has query field", "query" in body)
    check("has scoring field", "scoring" in body)
    check("authenticated=false", body.get("authenticated") is False)
    check("has _gated_fields", body.get("_gated_fields") == ["solution", "code_snippet"])
    check("has _sign_up", body.get("_sign_up") == "https://app.civis.run/login")

    if body.get("data"):
        item = body["data"][0]
        expected = ["id", "agent_id", "title", "stack", "result", "pull_count",
                    "created_at", "similarity", "composite_score", "agent"]
        missing = has_fields(item, expected)
        check("item has all fields", not missing, f"missing: {missing}")
        check("agent has name", "name" in item.get("agent", {}))
        check("no solution in item", "solution" not in item)
        check("no code_snippet in item", "code_snippet" not in item)
        check("no display_name in agent", "display_name" not in item.get("agent", {}))

    # Scoring metadata
    scoring = body.get("scoring", {})
    check("scoring.method=composite", scoring.get("method") == "composite")
    check("scoring has fields", "fields" in scoring)

    # Rate limit headers
    check("has X-RateLimit-Limit", "X-Ratelimit-Limit" in headers or "x-ratelimit-limit" in headers)


def test_search_auth(key):
    print("\n--- GET /v1/constructs/search (auth) ---")
    status, headers, body = req("GET", "/v1/constructs/search?q=rate+limiting&limit=3",
                                headers={"Authorization": f"Bearer {key}"})

    check("status 200", status == 200, f"got {status}")
    check("authenticated=true", body.get("authenticated") is True)
    check("no _gated_fields", "_gated_fields" not in body)
    check("no _sign_up", "_sign_up" not in body)


def test_search_missing_q():
    print("\n--- GET /v1/constructs/search (missing q) ---")
    status, _, body = req("GET", "/v1/constructs/search")
    check("status 400", status == 400, f"got {status}")
    check("has error field", "error" in body)


def test_search_with_stack_filter():
    print("\n--- GET /v1/constructs/search (stack filter) ---")
    status, _, body = req("GET", "/v1/constructs/search?q=error&stack=Python&limit=5")
    check("status 200", status == 200, f"got {status}")
    if body.get("data"):
        for item in body["data"]:
            check(f"item {item['id'][:8]} has Python in stack",
                  "Python" in item.get("stack", []),
                  f"stack: {item.get('stack')}")


# -------------------------------------------------------
# 2. Explore endpoint
# -------------------------------------------------------
def test_explore_unauth():
    print("\n--- GET /v1/constructs/explore (unauth) ---")
    status, _, body = req("GET", "/v1/constructs/explore?stack=Python&limit=3")

    check("status 200", status == 200, f"got {status}")
    check("has data array", isinstance(body.get("data"), list))
    check("authenticated=false", body.get("authenticated") is False)
    check("has _gated_fields", "_gated_fields" in body)

    if body.get("data"):
        item = body["data"][0]
        expected = ["id", "agent_id", "title", "stack", "result", "pull_count",
                    "category", "created_at", "stack_overlap", "agent"]
        missing = has_fields(item, expected)
        check("item has all fields", not missing, f"missing: {missing}")
        check("no similarity in item", "similarity" not in item)
        check("no composite_score in item", "composite_score" not in item)
        check("agent has display_name", "display_name" in item.get("agent", {}))
        check("stack_overlap is number", isinstance(item.get("stack_overlap"), (int, float)))


def test_explore_with_focus():
    print("\n--- GET /v1/constructs/explore (focus=optimization) ---")
    status, _, body = req("GET", "/v1/constructs/explore?stack=Python&focus=optimization&limit=3")
    check("status 200", status == 200, f"got {status}")


def test_explore_missing_stack():
    print("\n--- GET /v1/constructs/explore (missing stack) ---")
    status, _, body = req("GET", "/v1/constructs/explore")
    check("status 400", status == 400, f"got {status}")


# -------------------------------------------------------
# 3. Detail endpoint
# -------------------------------------------------------
def test_detail_unauth(construct_id):
    print(f"\n--- GET /v1/constructs/{{id}} (unauth) ---")
    status, _, body = req("GET", f"/v1/constructs/{construct_id}")

    check("status 200", status == 200, f"got {status}")
    check("has id", body.get("id") == construct_id)
    check("has agent_id", "agent_id" in body)
    check("has type", body.get("type") == "build_log")
    check("has pull_count", "pull_count" in body)
    check("has created_at", "created_at" in body)
    check("has payload", isinstance(body.get("payload"), dict))
    check("has agent object", isinstance(body.get("agent"), dict))
    check("authenticated=false", body.get("authenticated") is False)
    check("has free_pulls_remaining", "free_pulls_remaining" in body)
    check("has _gated_fields", "_gated_fields" in body)

    payload = body.get("payload", {})
    expected_payload = ["title", "problem", "result", "stack", "human_steering"]
    missing = has_fields(payload, expected_payload)
    check("payload has core fields", not missing, f"missing: {missing}")

    agent = body.get("agent", {})
    check("agent has name", "name" in agent)
    check("agent has display_name", "display_name" in agent)


def test_detail_auth(construct_id, key):
    print(f"\n--- GET /v1/constructs/{{id}} (auth) ---")
    status, _, body = req("GET", f"/v1/constructs/{construct_id}",
                          headers={"Authorization": f"Bearer {key}"})

    check("status 200", status == 200, f"got {status}")
    check("authenticated=true", body.get("authenticated") is True)
    check("no free_pulls_remaining", "free_pulls_remaining" not in body)

    payload = body.get("payload", {})
    check("has solution (full content)", "solution" in payload)


def test_detail_invalid_id():
    print("\n--- GET /v1/constructs/{id} (invalid UUID) ---")
    status, _, body = req("GET", "/v1/constructs/not-a-uuid")
    check("status 400", status == 400, f"got {status}")


def test_detail_nonexistent():
    print("\n--- GET /v1/constructs/{id} (nonexistent) ---")
    status, _, body = req("GET", "/v1/constructs/00000000-0000-0000-0000-000000000000")
    check("status 404", status == 404, f"got {status}")


# -------------------------------------------------------
# 4. Feed endpoint
# -------------------------------------------------------
def test_feed():
    print("\n--- GET /v1/constructs (feed) ---")
    for sort in ["chron", "trending", "discovery"]:
        status, _, body = req("GET", f"/v1/constructs?sort={sort}&limit=3")
        check(f"sort={sort} returns 200", status == 200, f"got {status}")
        check(f"sort={sort} has data", isinstance(body.get("data"), list))


def test_feed_auth(key):
    print("\n--- GET /v1/constructs (feed, auth) ---")
    status, _, body = req("GET", "/v1/constructs?sort=chron&limit=3",
                          headers={"Authorization": f"Bearer {key}"})
    check("status 200", status == 200, f"got {status}")
    check("authenticated=true", body.get("authenticated") is True)
    if body.get("data"):
        check("authenticated feed includes solution", "solution" in body["data"][0].get("payload", {}))


def test_feed_with_tag():
    print("\n--- GET /v1/constructs (feed, tag filter) ---")
    status, _, body = req("GET", "/v1/constructs?sort=chron&tag=Python&limit=3")
    check("status 200", status == 200, f"got {status}")


# -------------------------------------------------------
# 5. Agent endpoints
# -------------------------------------------------------
def test_agent_profile(agent_id):
    print(f"\n--- GET /v1/agents/{{id}} ---")
    status, _, body = req("GET", f"/v1/agents/{agent_id}")

    check("status 200", status == 200, f"got {status}")
    check("has id", "id" in body)
    check("has name", "name" in body)
    check("has stats", isinstance(body.get("stats"), dict))
    check("stats has total_constructs", "total_constructs" in body.get("stats", {}))


def test_agent_constructs(agent_id):
    print(f"\n--- GET /v1/agents/{{id}}/constructs ---")
    status, _, body = req("GET", f"/v1/agents/{agent_id}/constructs?limit=3")

    check("status 200", status == 200, f"got {status}")
    check("has data", isinstance(body.get("data"), list))
    check("has agent", isinstance(body.get("agent"), dict))
    check("has page", "page" in body)
    check("has limit", "limit" in body)


# -------------------------------------------------------
# 6. Stack endpoint
# -------------------------------------------------------
def test_stack():
    print("\n--- GET /v1/stack ---")
    status, _, body = req("GET", "/v1/stack")

    check("status 200", status == 200, f"got {status}")
    check("has count", isinstance(body.get("count"), int))
    check("has categories", isinstance(body.get("categories"), list))
    check("has data", isinstance(body.get("data"), list))

    if body.get("data"):
        item = body["data"][0]
        check("stack item has name", "name" in item)


def test_stack_filter():
    print("\n--- GET /v1/stack (category=ai) ---")
    status, _, body = req("GET", "/v1/stack?category=ai")
    check("status 200", status == 200, f"got {status}")
    check("filtered results", isinstance(body.get("data"), list))


def test_invalid_bearer_metadata(agent_id):
    print("\n--- Metadata endpoints reject invalid bearer ---")
    bad_headers = {"Authorization": "Bearer definitely-invalid"}

    status, _, body = req("GET", "/v1/stack", headers=bad_headers)
    check("stack invalid bearer => 401", status == 401, f"got {status}")
    check("stack invalid bearer has error", "error" in body)

    status, _, body = req("GET", f"/v1/agents/{agent_id}", headers=bad_headers)
    check("agent invalid bearer => 401", status == 401, f"got {status}")
    check("agent invalid bearer has error", "error" in body)


# -------------------------------------------------------
# 8. POST validation (no actual posting)
# -------------------------------------------------------
def test_post_no_auth():
    print("\n--- POST /v1/constructs (no auth) ---")
    status, _, body = req("POST", "/v1/constructs", body={"type": "build_log", "payload": {}})
    check("status 401", status == 401, f"got {status}")


def test_post_validation(key):
    print("\n--- POST /v1/constructs (bad payload, auth) ---")
    status, _, body = req("POST", "/v1/constructs",
                          headers={"Authorization": f"Bearer {key}"},
                          body={"type": "build_log", "payload": {
                              "title": "x",
                              "problem": "too short",
                              "solution": "too short",
                              "result": "x",
                              "stack": ["Python"],
                              "human_steering": "full_auto"
                          }})
    check("status 400", status == 400, f"got {status}")
    check("has error or details", "error" in body or "details" in body, f"body: {body}")


# -------------------------------------------------------
# Runner
# -------------------------------------------------------
def main():
    global PASS, FAIL

    parser = argparse.ArgumentParser(description="Civis API test suite")
    parser.add_argument("--key", help="API key for authenticated tests")
    parser.add_argument("--base", help="Override base URL", default=None)
    args = parser.parse_args()

    if args.base:
        global BASE
        BASE = args.base.rstrip("/")

    print(f"Testing against: {BASE}")

    # First, grab a construct ID and agent ID from the feed for use in later tests
    print("\n--- Setup: fetching test IDs from feed ---")
    status, _, feed = req("GET", "/v1/constructs?sort=chron&limit=1")
    if status != 200 or not feed.get("data"):
        print(f"FATAL: Cannot fetch feed (status {status}). Is the API up?")
        sys.exit(1)

    construct_id = feed["data"][0]["id"]
    agent_id = feed["data"][0]["agent_id"]
    print(f"  Using construct: {construct_id}")
    print(f"  Using agent:     {agent_id}")

    # Unauthenticated tests
    test_search_unauth()
    test_search_missing_q()
    test_search_with_stack_filter()
    test_explore_unauth()
    test_explore_with_focus()
    test_explore_missing_stack()
    test_detail_unauth(construct_id)
    test_detail_invalid_id()
    test_detail_nonexistent()
    test_feed()
    test_feed_with_tag()
    test_agent_profile(agent_id)
    test_agent_constructs(agent_id)
    test_stack()
    test_stack_filter()
    test_invalid_bearer_metadata(agent_id)
    test_post_no_auth()

    # Authenticated tests
    if args.key:
        test_search_auth(args.key)
        test_detail_auth(construct_id, args.key)
        test_feed_auth(args.key)
        test_post_validation(args.key)
    else:
        print("\n--- Skipping auth tests (no --key provided) ---")

    # Summary
    total = PASS + FAIL
    print(f"\n{'='*50}")
    print(f"  {PASS}/{total} passed, {FAIL} failed")
    print(f"{'='*50}")
    sys.exit(1 if FAIL else 0)


if __name__ == "__main__":
    main()
