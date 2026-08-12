#!/usr/bin/env python3
"""Append parent dispatch and runtime-link events to a Run-local ledger."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
import uuid
from pathlib import Path


RUN_ID_PATTERN = re.compile(r"^\d{8}-\d{6}-JST$")


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")


def repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def ledger_path(run_id: str, explicit: str | None) -> Path:
    if not RUN_ID_PATTERN.fullmatch(run_id):
        raise ValueError("run_id must match YYYYMMDD-HHMMSS-JST")
    path = Path(explicit) if explicit else repo_root() / ".codex" / "runs" / run_id / "expected-invocations.jsonl"
    if not path.is_absolute():
        path = repo_root() / path
    return path


def append_event(path: Path, event: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8", newline="\n") as stream:
        stream.write(json.dumps(event, ensure_ascii=True, separators=(",", ":")) + "\n")


def read_events(path: Path) -> list[dict]:
    if not path.exists():
        return []
    events: list[dict] = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError as exc:
            raise ValueError(f"invalid ledger JSON at line {line_number}: {exc.msg}") from exc
        if not isinstance(event, dict):
            raise ValueError(f"ledger event at line {line_number} must be an object")
        events.append(event)
    return events


def dispatch(args: argparse.Namespace) -> dict:
    invocation_id = str(uuid.uuid4())
    event = {
        "event": "dispatch",
        "invocation_id": invocation_id,
        "expected_agent_name": args.agent_name,
        "expected_model": args.model,
        "expected_role": args.role,
        "dispatch_timestamp": utc_now(),
    }
    append_event(ledger_path(args.run_id, args.ledger_path), event)
    return event


def link(args: argparse.Namespace) -> dict:
    path = ledger_path(args.run_id, args.ledger_path)
    events = read_events(path)
    dispatches = {
        event.get("invocation_id")
        for event in events
        if event.get("event") == "dispatch" and isinstance(event.get("invocation_id"), str)
    }
    if args.invocation_id not in dispatches:
        raise ValueError(f"unknown invocation_id: {args.invocation_id}")
    previous_links = [
        event
        for event in events
        if event.get("event") == "link" and event.get("invocation_id") == args.invocation_id
    ]
    if previous_links and previous_links[-1].get("runtime_agent_id") != args.runtime_agent_id:
        raise ValueError(f"invocation_id already linked: {args.invocation_id}")
    event = {
        "event": "link",
        "invocation_id": args.invocation_id,
        "runtime_agent_id": args.runtime_agent_id,
        "linked_timestamp": utc_now(),
    }
    if not previous_links:
        append_event(path, event)
    return event


def cancel(args: argparse.Namespace) -> dict:
    path = ledger_path(args.run_id, args.ledger_path)
    events = read_events(path)
    dispatches = {
        event.get("invocation_id")
        for event in events
        if event.get("event") == "dispatch" and isinstance(event.get("invocation_id"), str)
    }
    if args.invocation_id not in dispatches:
        raise ValueError(f"unknown invocation_id: {args.invocation_id}")
    event = {
        "event": "cancel",
        "invocation_id": args.invocation_id,
        "cancelled_timestamp": utc_now(),
        "reason": args.reason,
    }
    append_event(path, event)
    return event


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--ledger-path")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dispatch-agent-name")
    mode.add_argument("--link-invocation-id")
    mode.add_argument("--cancel-invocation-id")
    parser.add_argument("--model", default="gpt-5.6-luna")
    parser.add_argument("--role")
    parser.add_argument("--runtime-agent-id")
    parser.add_argument("--reason", default="dispatch did not create a runtime agent")
    args = parser.parse_args()
    if args.dispatch_agent_name:
        if not args.role:
            parser.error("--role is required with --dispatch-agent-name")
        args.agent_name = args.dispatch_agent_name
    elif args.link_invocation_id:
        if not args.runtime_agent_id:
            parser.error("--runtime-agent-id is required with --link-invocation-id")
        args.invocation_id = args.link_invocation_id
    else:
        args.invocation_id = args.cancel_invocation_id
    return args


def main() -> int:
    try:
        args = parse_args()
        if args.dispatch_agent_name:
            event = dispatch(args)
        elif args.link_invocation_id:
            event = link(args)
        else:
            event = cancel(args)
    except (OSError, ValueError) as exc:
        print(f"EXPECTED_INVOCATION_LEDGER_FAIL: {exc}", file=sys.stderr)
        return 1
    print(json.dumps(event, ensure_ascii=True, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
