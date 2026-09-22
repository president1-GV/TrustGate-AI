"""
TRUSTGATE AI BILLION — KYC STRUCTURED FIELD EXTRACTOR (ADVANCED CONTEXTUAL)
Extracts normalized identity attributes for Indian KYC Credentials:
AADHAAR, PAN, PASSPORT, VISA, and VOTER_ID.
Uses contextual multi-line state machines and adaptive regex patterns.
"""

import re
from typing import Dict, Any, List, Optional
from datetime import datetime

from ai.paddleocr.version_metadata import PADDLEOCR_VERSION, ENGINE_ID

# Indian Statutory Patterns
AADHAAR_UID_REGEX = re.compile(r"\b([2-9]\d{3}\s*\d{4}\s*\d{4})\b")
PAN_REGEX = re.compile(r"\b([A-Z]{5}\d{4}[A-Z])\b")
PASSPORT_NUM_REGEX = re.compile(r"\b([A-Z]\d{7})\b")
VOTER_EPIC_REGEX = re.compile(r"\b([A-Z]{3}\d{7})\b")
VISA_NUM_REGEX = re.compile(r"\b(\d{8})\b")
DATE_REGEX = re.compile(r"\b(\d{2}[/-]\d{2}[/-]\d{4})\b")

class KycFieldExtractor:
    """Extracts structured KYC identity fields from detected OCR text lines."""

    def __init__(self, model_id: str = ENGINE_ID, model_version: str = PADDLEOCR_VERSION):
        self.model_id = model_id
        self.model_version = model_version

    def classify_document_type(self, full_text: str) -> str:
        """Classifies document class based on authoritative statutory markers."""
        upper = full_text.upper()

        # Visa takes precedence over Passport because Indian Visas contain a Passport No. field
        if "VISA TYPE" in upper or "VISA NUMBER" in upper or "VISA NO" in upper or "INDIAN VISA" in upper:
            return "VISA"
        elif "PASSPORT" in upper or "PASSEPORT" in upper or "P<IND" in upper or "REPUBLIC OF INDIA" in upper and "PASSPORT" in upper:
            return "PASSPORT"
        elif "AADHAAR" in upper or "MERA AADHAAR" in upper or "UNIQUE IDENTIFICATION" in upper or "UIDAI" in upper:
            return "AADHAAR"
        elif "INCOME TAX DEPARTMENT" in upper or "PERMANENT ACCOUNT NUMBER" in upper or PAN_REGEX.search(upper):
            return "PAN"
        elif "ELECTION COMMISSION" in upper or "ELECTOR" in upper or "VOTER" in upper or VOTER_EPIC_REGEX.search(upper):
            return "VOTER_ID"
        elif AADHAAR_UID_REGEX.search(upper):
            return "AADHAAR"
        else:
            return "UNKNOWN_DOCUMENT"

    def extract_fields(
        self,
        text_lines: List[Dict[str, Any]],
        document_type_hint: Optional[str] = None
    ) -> Dict[str, Any]:
        """Extracts normalized KYC fields according to Section 7 specification."""
        lines_text = [line.get("text", "").strip() for line in text_lines]
        full_text = " \n".join(lines_text)
        doc_type = document_type_hint or self.classify_document_type(full_text)

        extracted_fields: Dict[str, Any] = {
            "document_type": doc_type,
            "document_number": None,
            "full_name": None,
            "date_of_birth": None,
            "gender": None,
            "nationality": "IND" if doc_type in ["AADHAAR", "PAN", "PASSPORT", "VOTER_ID"] else None,
            "address": None,
            "issue_date": None,
            "expiry_date": None,
            "issuing_authority": None,
            "passport_number": None,
            "visa_number": None,
            "mrz": None,
            "other_detected_fields": {}
        }

        field_provenance: List[Dict[str, Any]] = []

        def add_field(field_name: str, value: Any, conf: float, bbox: Optional[List[int]] = None):
            extracted_fields[field_name] = value
            field_provenance.append({
                "field": field_name,
                "value": value,
                "confidence": round(conf, 4),
                "bounding_box": bbox or [0, 0, 0, 0],
                "source": "PaddleOCR_Structured_Extractor",
                "model": self.model_id,
                "model_version": self.model_version
            })

        n_lines = len(text_lines)

        # Contextual Line Iterator
        for i in range(n_lines):
            curr_line = text_lines[i]
            t = curr_line.get("text", "").strip()
            conf = curr_line.get("confidence", 0.95)
            bbox = curr_line.get("bbox", [0, 0, 0, 0])
            next_t = text_lines[i + 1].get("text", "").strip() if i + 1 < n_lines else ""

            # ----------------------------------------------------
            # 1. AADHAAR
            # ----------------------------------------------------
            if doc_type == "AADHAAR":
                extracted_fields["issuing_authority"] = "Unique Identification Authority of India (UIDAI)"

                # Name
                if ("NAME" in t.upper() or "NAME /" in t.upper()) and not extracted_fields["full_name"]:
                    if ":" in t and len(t.split(":")[-1].strip()) > 2:
                        add_field("full_name", t.split(":")[-1].strip(), conf, bbox)
                    elif next_t and not any(k in next_t.upper() for k in ["DOB", "DATE", "GENDER", "AADHAAR"]):
                        add_field("full_name", next_t, conf, bbox)

                # DOB
                dob_m = DATE_REGEX.search(t)
                if dob_m and not extracted_fields["date_of_birth"]:
                    add_field("date_of_birth", dob_m.group(1), conf, bbox)
                elif ("DOB" in t.upper() or "DATE OF BIRTH" in t.upper()) and not extracted_fields["date_of_birth"]:
                    if DATE_REGEX.search(next_t):
                        add_field("date_of_birth", DATE_REGEX.search(next_t).group(1), conf, bbox)

                # Gender
                if re.search(r"\bMALE\b", t, re.IGNORECASE) and not extracted_fields["gender"]:
                    add_field("gender", "MALE", conf, bbox)
                elif re.search(r"\bFEMALE\b", t, re.IGNORECASE) and not extracted_fields["gender"]:
                    add_field("gender", "FEMALE", conf, bbox)

                # Address
                if "ADDRESS" in t.upper() and not extracted_fields["address"]:
                    if ":" in t and len(t.split(":")[-1].strip()) > 5:
                        add_field("address", t.split(":")[-1].strip(), conf, bbox)
                    elif next_t:
                        add_field("address", next_t, conf, bbox)

                # Aadhaar UID
                uid_m = AADHAAR_UID_REGEX.search(t)
                if uid_m and not extracted_fields["document_number"]:
                    # Normalize to 4-4-4
                    raw_digits = uid_m.group(1).replace(" ", "")
                    if len(raw_digits) == 12:
                        formatted_uid = f"{raw_digits[:4]} {raw_digits[4:8]} {raw_digits[8:]}"
                        add_field("document_number", formatted_uid, conf, bbox)

            # ----------------------------------------------------
            # 2. PAN
            # ----------------------------------------------------
            elif doc_type == "PAN":
                extracted_fields["issuing_authority"] = "Income Tax Department, Government of India"

                # PAN Number
                pan_m = PAN_REGEX.search(t)
                if pan_m and not extracted_fields["document_number"]:
                    add_field("document_number", pan_m.group(1), conf, bbox)

                # Name
                if "NAME" in t.upper() and not extracted_fields["full_name"] and not "FATHER" in t.upper():
                    if ":" in t and len(t.split(":")[-1].strip()) > 2:
                        add_field("full_name", t.split(":")[-1].strip(), conf, bbox)
                    elif next_t and not any(k in next_t.upper() for k in ["FATHER", "DATE", "PERMANENT", "SIGNATURE"]):
                        add_field("full_name", next_t, conf, bbox)

                # Father's Name
                if "FATHER" in t.upper() and next_t and not extracted_fields.get("father_name"):
                    extracted_fields["father_name"] = next_t
                    add_field("father_name", next_t, conf, bbox)

                # DOB
                dob_m = DATE_REGEX.search(t)
                if dob_m and not extracted_fields["date_of_birth"]:
                    add_field("date_of_birth", dob_m.group(1), conf, bbox)
                elif "DATE OF BIRTH" in t.upper() and DATE_REGEX.search(next_t):
                    add_field("date_of_birth", DATE_REGEX.search(next_t).group(1), conf, bbox)

            # ----------------------------------------------------
            # 3. PASSPORT
            # ----------------------------------------------------
            elif doc_type == "PASSPORT":
                extracted_fields["issuing_authority"] = "Ministry of External Affairs, Republic of India"
                extracted_fields["nationality"] = "IND"

                pass_m = PASSPORT_NUM_REGEX.search(t)
                if pass_m and not extracted_fields["passport_number"]:
                    add_field("passport_number", pass_m.group(1), conf, bbox)
                    extracted_fields["document_number"] = pass_m.group(1)

                if "GIVEN NAME" in t.upper() and next_t and not extracted_fields["full_name"]:
                    add_field("full_name", next_t, conf, bbox)

                dob_m = DATE_REGEX.search(t)
                if dob_m and not extracted_fields["date_of_birth"]:
                    add_field("date_of_birth", dob_m.group(1), conf, bbox)

                # MRZ lines
                clean_t = t.replace(" ", "")
                if clean_t.startswith("P<IND") or (clean_t.startswith("P<") and len(clean_t) >= 30):
                    if not extracted_fields["mrz"]:
                        extracted_fields["mrz"] = []
                    extracted_fields["mrz"].append(clean_t)
                elif extracted_fields["mrz"] and len(extracted_fields["mrz"]) == 1 and len(clean_t) >= 30:
                    extracted_fields["mrz"].append(clean_t)

            # ----------------------------------------------------
            # 4. VISA
            # ----------------------------------------------------
            elif doc_type == "VISA":
                extracted_fields["issuing_authority"] = "Bureau of Immigration, Republic of India"

                visa_m = VISA_NUM_REGEX.search(t)
                if visa_m and not extracted_fields["visa_number"] and len(visa_m.group(1)) == 8:
                    add_field("visa_number", visa_m.group(1), conf, bbox)
                    extracted_fields["document_number"] = visa_m.group(1)
                elif "VISA NUMBER" in t.upper() and VISA_NUM_REGEX.search(next_t):
                    vm = VISA_NUM_REGEX.search(next_t).group(1)
                    add_field("visa_number", vm, conf, bbox)
                    extracted_fields["document_number"] = vm

                if ("FULL NAME" in t.upper() or "NAME:" in t.upper()) and next_t and not extracted_fields["full_name"]:
                    add_field("full_name", next_t, conf, bbox)

                pass_m = PASSPORT_NUM_REGEX.search(t) or PASSPORT_NUM_REGEX.search(next_t)
                if pass_m and not extracted_fields["passport_number"]:
                    add_field("passport_number", pass_m.group(1), conf, bbox)

                dates = DATE_REGEX.findall(t) or DATE_REGEX.findall(next_t)
                if dates and not extracted_fields["issue_date"]:
                    add_field("issue_date", dates[0], conf, bbox)
                if len(dates) > 1 and not extracted_fields["expiry_date"]:
                    add_field("expiry_date", dates[1], conf, bbox)

            # ----------------------------------------------------
            # 5. VOTER ID
            # ----------------------------------------------------
            elif doc_type == "VOTER_ID":
                extracted_fields["issuing_authority"] = "Election Commission of India"

                epic_m = VOTER_EPIC_REGEX.search(t)
                if epic_m and not extracted_fields["document_number"]:
                    add_field("document_number", epic_m.group(1), conf, bbox)
                elif "EPIC" in t.upper() and VOTER_EPIC_REGEX.search(next_t):
                    em = VOTER_EPIC_REGEX.search(next_t).group(1)
                    add_field("document_number", em, conf, bbox)

                if "NAME" in t.upper() and not extracted_fields["full_name"] and not "FATHER" in t.upper():
                    if next_t and not any(k in next_t.upper() for k in ["FATHER", "HUSBAND", "GENDER", "EPIC"]):
                        add_field("full_name", next_t, conf, bbox)

                if re.search(r"\bMALE\b", t, re.IGNORECASE) and not extracted_fields["gender"]:
                    add_field("gender", "MALE", conf, bbox)
                elif re.search(r"\bFEMALE\b", t, re.IGNORECASE) and not extracted_fields["gender"]:
                    add_field("gender", "FEMALE", conf, bbox)

        return {
            "fields": extracted_fields,
            "provenance": field_provenance,
            "document_type": doc_type,
            "raw_text": full_text
        }
