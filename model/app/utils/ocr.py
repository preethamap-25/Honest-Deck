import os
from functools import lru_cache


@lru_cache(maxsize=1)
def get_ocr():
    from paddleocr import PaddleOCR

    return PaddleOCR(use_angle_cls=True, lang=os.getenv("OCR_LANG", "en"))


def extract_text(image_path):
    ocr = get_ocr()
    result = ocr.ocr(image_path)
    texts = []

    if not result or not result[0]:
        return ""

    for line in result[0]:
        texts.append(line[1][0])

    return " ".join(texts)
