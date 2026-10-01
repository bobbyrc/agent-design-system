#!/usr/bin/env python3
"""Compare supplied measurements; this does not capture or approve a UI."""

import argparse
from decimal import Decimal, DecimalException, MAX_EMAX, MIN_EMIN, localcontext
import json
import math
from pathlib import Path
import sys


CONTEXT = ("reference_id", "revision", "fixture", "route", "width", "height",
           "unit", "scale", "theme", "locale", "text_scale")
POSITIVE = {"width", "height", "scale", "text_scale"}


def number(value):
    return (type(value) is int or (type(value) is float and math.isfinite(value)) or
            (type(value) is Decimal and value.is_finite()))


def decimal(value):
    return value if type(value) is Decimal else Decimal(str(value)) if type(value) is float else Decimal(value)


def nonempty(value):
    return isinstance(value, str) and bool(value.strip())


def json_value(value):
    if value is None or type(value) in (str, bool, int):
        return True
    if type(value) is float:
        return math.isfinite(value)
    if type(value) is Decimal:
        return value.is_finite()
    if type(value) is list:
        return all(json_value(item) for item in value)
    if type(value) is dict:
        return all(type(key) is str and json_value(item) for key, item in value.items())
    return False


def equal(left, right):
    """JSON numbers share a type; booleans are never numbers."""
    if number(left) and number(right):
        return decimal(left) == decimal(right)
    if type(left) is not type(right):
        return False
    if type(left) is list:
        return len(left) == len(right) and all(equal(a, b) for a, b in zip(left, right))
    if type(left) is dict:
        return left.keys() == right.keys() and all(equal(left[k], right[k]) for k in left)
    return left == right


def safe(value):
    """Keep invalid input readable without emitting nonstandard JSON."""
    if type(value) is dict:
        return {str(k): safe(v) for k, v in value.items()}
    if type(value) is list:
        return [safe(v) for v in value]
    return value if json_value(value) else repr(value)


def empty_report():
    return {"schema_version": 1, "comparison": "invalid",
            "scope": "supplied measurements only", "context_mismatches": [],
            "rows": [], "errors": [],
            "summary": {"matched": 0, "mismatched": 0, "invalid": 0,
                        "context_mismatches": 0, "errors": 0}}


def serialize(value):
    """Emit Decimal values as precise JSON numbers, never strings or floats."""
    if type(value) is Decimal:
        if not value.is_finite():
            raise ValueError("nonfinite JSON number")
        return str(value)
    if type(value) is int:
        return str(Decimal(value))
    if type(value) is dict:
        return "{" + ",".join(json.dumps(key, ensure_ascii=False) + ":" + serialize(item)
                              for key, item in value.items()) + "}"
    if type(value) is list:
        return "[" + ",".join(serialize(item) for item in value) + "]"
    return json.dumps(value, ensure_ascii=False, allow_nan=False)


def compare(reference, actual):
    try:
        return _compare(reference, actual)
    except (ValueError, OverflowError, RecursionError, DecimalException) as exc:
        report = empty_report()
        report["errors"] = [{"path": "input", "message": "unsupported value representation: " + str(exc)}]
        report["summary"]["errors"] = 1
        return report


def _compare(reference, actual):
    """Return a deterministic report, without reading provenance artifacts."""
    report = empty_report()
    errors = report["errors"]

    def error(path, message):
        errors.append({"path": path, "message": message})

    def provenance(item, path):
        prov = item.get("provenance")
        if type(prov) is not dict:
            error(path + ".provenance", "must be an object with artifact and instrument")
            return
        for key in ("artifact", "instrument"):
            if not nonempty(prov.get(key)):
                error(path + ".provenance." + key, "must be a nonempty string")

    documents = []
    for name, document, collection in (("reference", reference, "measurements"),
                                       ("actual", actual, "observations")):
        if type(document) is not dict:
            error(name, "must be an object")
            document = {}
        if type(document.get("schema_version")) is not int or document.get("schema_version") != 1:
            error(name + ".schema_version", "must be integer 1")
        context = document.get("context")
        if type(context) is not dict:
            error(name + ".context", "must be an object")
            context = {}
        for key in CONTEXT:
            value = context.get(key)
            if key in POSITIVE:
                if not number(value) or value <= 0:
                    error(name + ".context." + key, "must be a positive finite number")
            elif not nonempty(value):
                error(name + ".context." + key, "must be a nonempty string")
        items = document.get(collection)
        if type(items) is not list or not items:
            error(name + "." + collection, "must be a nonempty array")
            items = []
        index = {}
        paths = {}
        for position, item in enumerate(items):
            path = f"{name}.{collection}[{position}]"
            if type(item) is not dict:
                error(path, "must be an object")
                continue
            identity = item.get("id")
            if not nonempty(identity):
                error(path + ".id", "must be a nonempty string")
            elif identity in index:
                error(path + ".id", "duplicate id: " + identity)
                error(paths[identity] + ".id", "duplicate id: " + identity)
            else:
                index[identity], paths[identity] = item, path
            provenance(item, path)
            value_key = "expected" if name == "reference" else "value"
            if value_key not in item or not json_value(item.get(value_key)):
                error(path + "." + value_key, "must be a supplied finite JSON value")
            if name == "reference":
                kind = item.get("kind")
                if kind not in ("numeric", "exact"):
                    error(path + ".kind", "must be numeric or exact")
                if kind == "numeric":
                    if not number(item.get("expected")):
                        error(path + ".expected", "must be a finite number, excluding booleans")
                    if not number(item.get("tolerance")) or item["tolerance"] < 0:
                        error(path + ".tolerance", "must be a finite nonnegative number")
                    for key in ("unit", "rationale"):
                        if not nonempty(item.get(key)):
                            error(path + "." + key, "must be a nonempty string")
        documents.append((context, index, paths))

    ref_context, ref_items, ref_paths = documents[0]
    act_context, act_items, act_paths = documents[1]
    build_id = actual.get("build_id") if type(actual) is dict else None
    if nonempty(build_id):
        report["build_id"] = build_id
    else:
        error("actual.build_id", "must be a nonempty string")
    for key in CONTEXT:
        if key in ref_context and key in act_context and not equal(ref_context[key], act_context[key]):
            report["context_mismatches"].append({"field": key,
                "expected": safe(ref_context[key]), "actual": safe(act_context[key])})

    for identity in dict.fromkeys([*ref_items, *act_items]):
        if identity not in ref_items:
            error(act_paths[identity] + ".id", "id absent from reference: " + identity)
        if identity not in act_items:
            error(ref_paths[identity] + ".id", "id absent from actual: " + identity)
        ref, obs = ref_items.get(identity, {}), act_items.get(identity, {})
        if ref.get("kind") == "numeric" and obs:
            path = act_paths[identity]
            if not number(obs.get("value")):
                error(path + ".value", "must be a finite number, excluding booleans")
            if not nonempty(obs.get("unit")):
                error(path + ".unit", "must be a nonempty string")

    # Preserve reference order, then actual-only order; never depend on set iteration.
    for identity in dict.fromkeys([*ref_items, *act_items]):
        ref, obs = ref_items.get(identity, {}), act_items.get(identity, {})
        prefixes = [p for p in (ref_paths.get(identity), act_paths.get(identity)) if p]
        row_errors = [e for e in errors if any(e["path"] == p or e["path"].startswith(p + ".") for p in prefixes)]
        row = {"id": identity, "kind": safe(ref.get("kind")), "expected": safe(ref.get("expected")),
               "actual": safe(obs.get("value")), "unit": safe(ref.get("unit")),
               "tolerance": safe(ref.get("tolerance")), "delta": None,
               "provenance": {"reference": safe(ref.get("provenance")),
                              "actual": safe(obs.get("provenance"))},
               "status": "invalid" if row_errors else "matched", "errors": row_errors}
        if not row_errors:
            if ref["kind"] == "numeric":
                expected, value, tolerance = (decimal(v) for v in
                                             (ref["expected"], obs["value"], ref["tolerance"]))
                with localcontext() as context:
                    context.prec = max(1, max(expected.adjusted(), value.adjusted()) -
                                       min(expected.as_tuple().exponent, value.as_tuple().exponent) + 2)
                    context.Emax, context.Emin = MAX_EMAX, MIN_EMIN
                    delta = value - expected
                    row["delta"] = delta
                    if abs(delta) > tolerance or ref["unit"] != obs["unit"]:
                        row["status"] = "mismatched"
                if ref["unit"] != obs["unit"]:
                    row["errors"].append({"path": act_paths[identity] + ".unit",
                                          "message": "unit differs from reference", "expected": ref["unit"], "actual": obs["unit"]})
            elif not equal(ref["expected"], obs["value"]):
                row["status"] = "mismatched"
        report["rows"].append(row)
        report["summary"][row["status"]] += 1
    report["summary"]["context_mismatches"] = len(report["context_mismatches"])
    report["summary"]["errors"] = len(errors)
    if not errors:
        report["comparison"] = "mismatched" if (report["summary"]["mismatched"] or report["context_mismatches"]) else "matched"
    return report


def strict_load(path):
    def pairs(entries):
        result = {}
        for key, value in entries:
            if key in result:
                raise ValueError("duplicate object key: " + key)
            result[key] = value
        return result

    def constant(value):
        raise ValueError("nonfinite JSON number: " + value)

    def integer(value):
        try:
            return int(value)
        except ValueError:
            return Decimal(value)

    with Path(path).open(encoding="utf-8") as stream:
        return json.load(stream, object_pairs_hook=pairs, parse_constant=constant,
                         parse_float=Decimal, parse_int=integer)


def main(argv=None):
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="strict")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("reference")
    parser.add_argument("actual")
    parser.add_argument("--out")
    args = parser.parse_args(argv)
    try:
        reference, actual = strict_load(args.reference), strict_load(args.actual)
        report = compare(reference, actual)
    except (OSError, ValueError, TypeError, RecursionError, DecimalException) as exc:
        report = empty_report()
        report["errors"] = [{"path": "input", "message": str(exc)}]
        report["summary"]["errors"] = 1
    output = serialize(report) + "\n"
    try:
        if args.out:
            destination = Path(args.out)
            for source in (Path(args.reference), Path(args.actual)):
                if (destination.resolve() == source.resolve() or
                        (destination.exists() and source.exists() and destination.samefile(source))):
                    raise OSError("output must not alias an input file: " + str(source))
            destination.write_text(output, encoding="utf-8")
        else:
            sys.stdout.write(output)
    except (OSError, UnicodeError, RuntimeError) as exc:
        report = empty_report()
        report["errors"] = [{"path": "output", "message": str(exc)}]
        report["summary"]["errors"] = 1
        sys.stderr.write(serialize(report) + "\n")
        return 2
    return {"matched": 0, "mismatched": 1, "invalid": 2}[report["comparison"]]


if __name__ == "__main__":
    sys.exit(main())
