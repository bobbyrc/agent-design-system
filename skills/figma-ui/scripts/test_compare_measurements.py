"""Synthetic data checks the comparator; these are not UI tolerance policies."""

from copy import deepcopy
from decimal import Decimal, localcontext
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from compare_measurements import compare, serialize


SCRIPT = Path(__file__).with_name("compare_measurements.py")


def inputs():
    context = {"reference_id": "synthetic", "revision": "r1", "fixture": "sample",
               "route": "/sample", "width": 100, "height": 200, "unit": "px",
               "scale": 1, "theme": "light", "locale": "en", "text_scale": 1}
    provenance = {"artifact": "synthetic.json", "instrument": "synthetic test data"}
    reference = {"schema_version": 1, "context": context,
                 "measurements": [{"id": "width", "kind": "numeric", "expected": 10,
                                   "unit": "px", "tolerance": 0.1,
                                   "rationale": "synthetic boundary exercise",
                                   "provenance": provenance},
                                  {"id": "content", "kind": "exact", "expected": "Café →",
                                   "provenance": provenance}]}
    actual = {"schema_version": 1, "context": deepcopy(context), "build_id": "test-build",
              "observations": [{"id": "width", "value": 10, "unit": "px", "provenance": provenance},
                               {"id": "content", "value": "Café →", "provenance": provenance}]}
    return deepcopy(reference), deepcopy(actual)


class ComparisonTests(unittest.TestCase):
    def assert_invalid(self, reference, actual, path=None):
        report = compare(reference, actual)
        self.assertEqual(report["comparison"], "invalid", report)
        if path:
            self.assertTrue(any(e["path"] == path for e in report["errors"]), report)
        json.loads(serialize(report), parse_float=Decimal)
        return report

    def test_match_and_metadata_preservation(self):
        reference, actual = inputs()
        saved = deepcopy((reference, actual))
        report = compare(reference, actual)
        self.assertEqual(report["comparison"], "matched")
        self.assertEqual(report["scope"], "supplied measurements only")
        self.assertEqual(report["build_id"], "test-build")
        self.assertEqual(report["summary"]["matched"], 2)
        self.assertEqual(report["rows"][0]["provenance"]["actual"], actual["observations"][0]["provenance"])
        self.assertEqual((reference, actual), saved)
        self.assertEqual(report, compare(reference, actual))

    def test_threshold_boundary_and_sign(self):
        reference, actual = inputs()
        for value, status, delta in ((10.1, "matched", 0.1), (9.9, "matched", -0.1),
                                     (10.1001, "mismatched", 0.1001)):
            actual["observations"][0]["value"] = value
            report = compare(reference, actual)
            self.assertEqual(report["comparison"], status)
            self.assertEqual(report["rows"][0]["delta"], Decimal(str(delta)))

    def test_compensating_dimensions_are_independent(self):
        reference, actual = inputs()
        gap = deepcopy(reference["measurements"][0])
        gap.update(id="gap", expected=5, tolerance=0)
        reference["measurements"] = [reference["measurements"][0], gap]
        observation = deepcopy(actual["observations"][0])
        observation.update(id="gap", value=4)
        actual["observations"] = [actual["observations"][0], observation]
        actual["observations"][0]["value"] = 11
        report = compare(reference, actual)
        self.assertEqual(report["summary"]["mismatched"], 2)
        self.assertEqual(sum(r["expected"] for r in report["rows"]), sum(r["actual"] for r in report["rows"]))

    def test_exact_literals_order_assets_and_json_types(self):
        for expected, actual_value, status in (("Café →", "Cafe →", "mismatched"),
                                             (["a", "b"], ["b", "a"], "mismatched"),
                                             ({"asset": "a.svg"}, {"asset": "b.svg"}, "mismatched"),
                                             (False, 0, "mismatched"), (1, "1", "mismatched"),
                                             (None, None, "matched"),
                                             ({"x": [1, True]}, {"x": [1.0, True]}, "matched"),
                                             ({"x": [True]}, {"x": [1]}, "mismatched")):
            reference, actual = inputs()
            reference["measurements"][1]["expected"] = expected
            actual["observations"][1]["value"] = actual_value
            self.assertEqual(compare(reference, actual)["comparison"], status)

    def test_required_coverage_and_provenance(self):
        mutations = (
            ("reference", lambda x: x["measurements"].clear(), "reference.measurements"),
            ("actual", lambda x: x["observations"].clear(), "actual.observations"),
            ("actual", lambda x: x["observations"].pop(), "reference.measurements[1].id"),
            ("actual", lambda x: x["context"].pop("locale"), "actual.context.locale"),
            ("reference", lambda x: x["measurements"][0].pop("provenance"), "reference.measurements[0].provenance"),
            ("actual", lambda x: x["observations"][0]["provenance"].update(instrument=""), "actual.observations[0].provenance.instrument"),
            ("reference", lambda x: x["measurements"][0].pop("unit"), "reference.measurements[0].unit"),
            ("actual", lambda x: x["observations"][0].pop("unit"), "actual.observations[0].unit"),
            ("reference", lambda x: x["measurements"][0].pop("rationale"), "reference.measurements[0].rationale"),
            ("actual", lambda x: x.pop("build_id"), "actual.build_id"),
        )
        for target, mutation, path in mutations:
            reference, actual = inputs()
            mutation(reference if target == "reference" else actual)
            self.assert_invalid(reference, actual, path)

    def test_context_and_measurement_unit_mismatches(self):
        reference, actual = inputs()
        actual["context"].update(fixture="another", scale=2)
        actual["observations"][0]["unit"] = "pt"
        report = compare(reference, actual)
        self.assertEqual(report["comparison"], "mismatched")
        self.assertEqual([r["field"] for r in report["context_mismatches"]], ["fixture", "scale"])
        self.assertEqual(report["rows"][0]["status"], "mismatched")
        reference, actual = inputs()
        actual["context"].update(width=100.0, scale=1.0)
        self.assertEqual(compare(reference, actual)["comparison"], "matched")

    def test_invalid_numeric_and_nested_values(self):
        for value in (True, None, "10", float("nan"), float("inf"), -float("inf")):
            for collection, field in (("measurements", "expected"), ("observations", "value")):
                reference, actual = inputs()
                document = reference if collection == "measurements" else actual
                document[collection][0][field] = value
                self.assert_invalid(reference, actual)
        for tolerance in (-1, True, float("nan"), float("inf")):
            reference, actual = inputs()
            reference["measurements"][0]["tolerance"] = tolerance
            self.assert_invalid(reference, actual, "reference.measurements[0].tolerance")
        for scale in (0, -1, True, "1", None, float("inf"), float("nan")):
            reference, actual = inputs()
            actual["context"]["scale"] = scale
            self.assert_invalid(reference, actual, "actual.context.scale")
        reference, actual = inputs()
        actual["observations"][1]["value"] = {"nested": [float("nan")]}
        self.assert_invalid(reference, actual)

    def test_ids_kinds_values_and_invalid_top_level(self):
        for document_name, collection in (("reference", "measurements"), ("actual", "observations")):
            reference, actual = inputs()
            document = reference if document_name == "reference" else actual
            document[collection].append(deepcopy(document[collection][0]))
            report = self.assert_invalid(reference, actual)
            self.assertEqual(report["rows"][0]["status"], "invalid")
        reference, actual = inputs()
        reference["measurements"][0]["kind"] = ["numeric"]
        self.assert_invalid(reference, actual)
        reference, actual = inputs()
        actual["observations"][0]["id"] = "unknown"
        self.assert_invalid(reference, actual)
        for value in (None, [], "bad", 1):
            self.assert_invalid(value, value)
        reference, actual = inputs()
        actual["observations"][1].pop("value")
        self.assert_invalid(reference, actual)

    def test_invalid_field_types_report_without_serialization_failure(self):
        for field in ("kind", "unit", "rationale", "provenance", "id"):
            reference, actual = inputs()
            reference["measurements"][0][field] = {"bad": float("inf")}
            self.assert_invalid(reference, actual)
        reference, actual = inputs()
        actual["context"]["unit"] = {"bad": float("nan")}
        self.assert_invalid(reference, actual)
        reference, actual = inputs()
        actual["observations"].append(None)
        self.assert_invalid(reference, actual)
        reference, actual = inputs()
        actual["build_id"] = {"bad": "build"}
        self.assert_invalid(reference, actual)

    def test_cli_output_exit_codes_and_strict_json(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            ref_path, act_path = directory / "reference.json", directory / "actual.json"
            reference, actual = inputs()
            ref_path.write_text(json.dumps(reference, ensure_ascii=False), encoding="utf-8")

            def run(text, extra=()):
                act_path.write_text(text, encoding="utf-8")
                return subprocess.run([sys.executable, str(SCRIPT), str(ref_path), str(act_path), *extra],
                                      capture_output=True, encoding="utf-8")

            matched = run(json.dumps(actual, ensure_ascii=False))
            self.assertEqual(matched.returncode, 0, matched.stderr)
            self.assertIn("Café →", matched.stdout)
            self.assertEqual(json.loads(matched.stdout)["comparison"], "matched")
            actual["observations"][0]["value"] = 11
            self.assertEqual(run(json.dumps(actual)).returncode, 1)
            for text in ('{"schema_version":1,"schema_version":1}', '{"x":NaN}',
                         '{"x":Infinity}', '{"x":-Infinity}', '{"x":1e400}', '{"broken":'):
                result = run(text)
                self.assertEqual(result.returncode, 2, result)
                self.assertEqual(json.loads(result.stdout)["comparison"], "invalid")
                self.assertNotIn("Traceback", result.stderr)
            reference, actual = inputs()
            actual["observations"][0]["unit"] = {"bad": float("inf")}
            result = run(json.dumps(actual).replace("Infinity", "1e999"))
            self.assertEqual(result.returncode, 2)
            self.assertNotIn("Traceback", result.stderr)
            self.assertEqual(json.loads(result.stdout)["comparison"], "invalid")
            reference, actual = inputs()
            out = directory / "report.json"
            result = run(json.dumps(actual), ("--out", str(out)))
            self.assertEqual(result.returncode, 0)
            self.assertEqual(result.stdout, "")
            self.assertIn("Café →", out.read_text(encoding="utf-8"))
            result = run(json.dumps(actual), ("--out", str(directory / "missing" / "report.json")))
            self.assertEqual(result.returncode, 2)
            self.assertEqual(json.loads(result.stderr)["errors"][0]["path"], "output")
            result = subprocess.run([sys.executable, str(SCRIPT), str(directory / "absent"), str(act_path)],
                                    capture_output=True, encoding="utf-8")
            self.assertEqual(result.returncode, 2)
            self.assertEqual(json.loads(result.stdout)["comparison"], "invalid")

    def test_cli_preserves_input_when_output_aliases_it(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            reference, actual = inputs()
            ref_path, act_path = directory / "reference.json", directory / "actual.json"
            ref_path.write_text(json.dumps(reference), encoding="utf-8")
            act_path.write_text(json.dumps(actual), encoding="utf-8")
            originals = {p: p.read_bytes() for p in (ref_path, act_path)}
            outputs = [ref_path, act_path, directory / "." / "reference.json"]
            for name, create in (("symlink.json", lambda path: path.symlink_to(ref_path)),
                                 ("hardlink.json", lambda path: os.link(act_path, path))):
                path = directory / name
                try:
                    create(path)
                except (OSError, NotImplementedError):
                    continue
                outputs.append(path)
            for output in outputs:
                result = subprocess.run([sys.executable, str(SCRIPT), str(ref_path), str(act_path), "--out", str(output)],
                                        capture_output=True, encoding="utf-8")
                self.assertEqual(result.returncode, 2, result)
                self.assertIn("must not alias", json.loads(result.stderr)["errors"][0]["message"])
                self.assertEqual({p: p.read_bytes() for p in originals}, originals)

    def test_decimal_import_and_cli_preserve_numeric_precision(self):
        cases = ((0, 10, Decimal("10.0000000000000001"), 0),
                 (1, 1, Decimal("1.0000000000000001"), 0),
                 (0, 0, Decimal("1e-999"), 0),
                 (0, 0, Decimal("1e999"), 0),
                 (0, 0, Decimal("9" * 5000), 0),
                 (0, Decimal("1e1001"), Decimal("-1e-999"), Decimal("1e1001")))
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            ref_path, act_path = directory / "ref.json", directory / "act.json"
            for row, expected, value, tolerance in cases:
                reference, actual = inputs()
                reference["measurements"][row]["expected"] = expected
                reference["measurements"][0]["tolerance"] = tolerance
                actual["observations"][row]["value"] = value
                ref_text, act_text = serialize(reference), serialize(actual)
                # parse_int=Decimal also changes the schema version; preserve its integer contract.
                parsed_actual = json.loads(act_text, parse_float=Decimal, parse_int=Decimal)
                parsed_actual["schema_version"] = 1
                imported = compare(json.loads(ref_text, parse_float=Decimal), parsed_actual)
                self.assertEqual(imported["comparison"], "mismatched")
                ref_path.write_text(ref_text, encoding="utf-8")
                act_path.write_text(act_text, encoding="utf-8")
                result = subprocess.run([sys.executable, str(SCRIPT), str(ref_path), str(act_path)],
                                        capture_output=True, encoding="utf-8")
                self.assertEqual(result.returncode, 1, result.stderr)
                report = json.loads(result.stdout, parse_float=Decimal, parse_int=Decimal)
                measured = report["rows"][row]
                self.assertEqual(measured["expected"], expected)
                self.assertEqual(measured["actual"], value)
                self.assertNotEqual(measured["expected"], measured["actual"])
                self.assertNotIsInstance(measured["actual"], str)
                if row == 0:
                    with localcontext() as context:
                        context.prec = 6000
                        self.assertEqual(measured["delta"], value - Decimal(expected))
            reference, actual = inputs()
            actual["observations"][0]["value"] = Decimal("10.0")
            actual["context"]["scale"] = Decimal("1.0")
            reference["measurements"][1]["expected"] = {"nested": [1, True]}
            actual["observations"][1]["value"] = {"nested": [Decimal("1.0"), True]}
            self.assertEqual(compare(reference, actual)["comparison"], "matched")
            actual["observations"][1]["value"]["nested"][1] = Decimal(1)
            self.assertEqual(compare(reference, actual)["comparison"], "mismatched")
            reference, actual = inputs()
            reference["measurements"][0]["expected"] = 0
            actual["observations"][0]["value"] = 10 ** 5000 + 1
            report = compare(reference, actual)
            self.assertEqual(report["comparison"], "mismatched")
            saved = json.loads(serialize(report), parse_int=Decimal)
            self.assertEqual(saved["rows"][0]["actual"], Decimal(10 ** 5000 + 1))

    def test_cli_symlink_loop_and_ascii_environment(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            reference, actual = inputs()
            ref_path, act_path = directory / "ref.json", directory / "act.json"
            ref_path.write_text(serialize(reference), encoding="utf-8")
            act_path.write_text(serialize(actual), encoding="utf-8")
            command = [sys.executable, str(SCRIPT), str(ref_path), str(act_path)]
            environment = dict(os.environ, PYTHONIOENCODING="ascii")
            result = subprocess.run(command, capture_output=True, encoding="utf-8", env=environment)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("Café →", result.stdout)
            self.assertEqual(json.loads(result.stdout)["comparison"], "matched")
            result = subprocess.run(command + ["--out", str(directory / "不存在" / "report.json")],
                                    capture_output=True, encoding="utf-8", env=environment)
            self.assertEqual(result.returncode, 2)
            self.assertEqual(json.loads(result.stderr)["errors"][0]["path"], "output")
            self.assertNotIn("Traceback", result.stderr)
            loop = directory / "loop"
            try:
                loop.symlink_to(loop)
            except (OSError, NotImplementedError):
                return
            result = subprocess.run(command + ["--out", str(loop)], capture_output=True, encoding="utf-8")
            self.assertEqual(result.returncode, 2, result)
            self.assertEqual(json.loads(result.stderr)["comparison"], "invalid")
            self.assertNotIn("Traceback", result.stderr)


if __name__ == "__main__":
    unittest.main()
