from app.utils import ocr


class FakeOcr:
    def __init__(self, result):
        self.result = result

    def ocr(self, image_path):
        assert image_path == "claim.png"
        return self.result


def test_extract_text_joins_detected_lines(monkeypatch):
    result = [
        [
            [None, ("Breaking", 0.99)],
            [None, ("news", 0.98)],
        ]
    ]
    monkeypatch.setattr(ocr, "get_ocr", lambda: FakeOcr(result))

    assert ocr.extract_text("claim.png") == "Breaking news"


def test_extract_text_returns_empty_string_when_no_text(monkeypatch):
    monkeypatch.setattr(ocr, "get_ocr", lambda: FakeOcr([[]]))

    assert ocr.extract_text("claim.png") == ""
