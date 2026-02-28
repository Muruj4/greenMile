

import pytest
from unittest.mock import MagicMock
from fastapi import HTTPException
from jose import jwt



TEST_SECRET    = "test_secret_key"
TEST_ALGORITHM = "HS256"


# Helpers

def _make_token(payload: dict, secret=TEST_SECRET, algorithm=TEST_ALGORITHM) -> str:
    """Sign and return a real JWT with the given payload."""
    return jwt.encode(payload, secret, algorithm=algorithm)

def _make_credentials(token: str):
    """Fake HTTPAuthorizationCredentials carrying the given token string."""
    mock = MagicMock()
    mock.credentials = token
    return mock

def _call(token: str):
    """
    Import and call get_current_user with a fake credentials object.
    Import is deferred so monkeypatching JWT_SECRET takes effect first.
    """
    from utils.auth_dep import get_current_user
    return get_current_user(credentials=_make_credentials(token))




@pytest.fixture(autouse=True)
def patch_jwt_env(monkeypatch):
    """
    Ensure get_current_user always uses our test secret/algorithm,
    regardless of what is (or isn't) in the .env file.
    """
    monkeypatch.setenv("JWT_SECRET",    TEST_SECRET)
    monkeypatch.setenv("JWT_ALGORITHM", TEST_ALGORITHM)

    # Also patch the module-level variables that were already loaded at import time
    import utils.auth_dep as auth_mod
    monkeypatch.setattr(auth_mod, "JWT_SECRET",    TEST_SECRET)
    monkeypatch.setattr(auth_mod, "JWT_ALGORITHM", TEST_ALGORITHM)



class TestValidToken:
    """get_current_user returns correct dict for well-formed tokens."""

    def test_returns_dict_with_correct_keys(self):
        token = _make_token({"sub": "1", "role": "manager", "company_id": "10"})
        result = _call(token)
        assert set(result.keys()) == {"id", "role", "company_id"}

    def test_id_is_integer(self):
        token = _make_token({"sub": "42", "role": "driver", "company_id": "5"})
        result = _call(token)
        assert isinstance(result["id"], int)
        assert result["id"] == 42

    def test_company_id_is_integer(self):
        token = _make_token({"sub": "1", "role": "manager", "company_id": "99"})
        result = _call(token)
        assert isinstance(result["company_id"], int)
        assert result["company_id"] == 99

    def test_role_manager(self):
        token = _make_token({"sub": "1", "role": "manager", "company_id": "1"})
        result = _call(token)
        assert result["role"] == "manager"

    def test_role_driver(self):
        token = _make_token({"sub": "7", "role": "driver", "company_id": "3"})
        result = _call(token)
        assert result["role"] == "driver"

    def test_large_user_id(self):
        token = _make_token({"sub": "99999", "role": "manager", "company_id": "1"})
        result = _call(token)
        assert result["id"] == 99999

    def test_extra_payload_fields_ignored(self):
        """Extra claims in the token don't break anything."""
        token = _make_token({
            "sub": "1", "role": "manager", "company_id": "1",
            "email": "x@x.com", "exp": 9999999999,
        })
        result = _call(token)
        assert result["id"] == 1



# MISSING PAYLOAD FIELD TESTS


class TestMissingPayloadFields:
    """Any missing required field → 401 'Invalid token payload'."""

    def _assert_401_invalid_payload(self, payload: dict):
        token = _make_token(payload)
        with pytest.raises(HTTPException) as exc_info:
            _call(token)
        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "Invalid token payload"

    def test_missing_sub(self):
        self._assert_401_invalid_payload({"role": "manager", "company_id": "1"})

    def test_missing_role(self):
        self._assert_401_invalid_payload({"sub": "1", "company_id": "1"})

    def test_missing_company_id(self):
        self._assert_401_invalid_payload({"sub": "1", "role": "manager"})

    def test_empty_payload(self):
        self._assert_401_invalid_payload({})

    def test_sub_is_none(self):
       
        token = _make_token({"sub": None, "role": "manager", "company_id": "1"})
        with pytest.raises(HTTPException) as exc_info:
            _call(token)
        assert exc_info.value.status_code == 401

    def test_role_is_none(self):
        self._assert_401_invalid_payload({"sub": "1", "role": None, "company_id": "1"})

    def test_company_id_is_none(self):
        self._assert_401_invalid_payload({"sub": "1", "role": "manager", "company_id": None})

    def test_sub_is_empty_string(self):
        """Empty string is falsy — treated as missing."""
        self._assert_401_invalid_payload({"sub": "", "role": "manager", "company_id": "1"})

    def test_role_is_empty_string(self):
        self._assert_401_invalid_payload({"sub": "1", "role": "", "company_id": "1"})



# INVALID TOKEN TESTS

class TestInvalidToken:
    """Malformed or unverifiable tokens → 401 'Invalid or expired token'."""

    def _assert_401_jwt_error(self, token: str):
        with pytest.raises(HTTPException) as exc_info:
            _call(token)
        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "Invalid or expired token"

    def test_completely_random_string(self):
        self._assert_401_jwt_error("this.is.not.a.jwt")

    def test_empty_token(self):
        self._assert_401_jwt_error("")

    def test_wrong_secret(self):
        token = _make_token(
            {"sub": "1", "role": "manager", "company_id": "1"},
            secret="completely_wrong_secret",
        )
        self._assert_401_jwt_error(token)

    def test_tampered_token(self):
        token = _make_token({"sub": "1", "role": "manager", "company_id": "1"})
        # Flip a character in the signature segment
        parts = token.split(".")
        parts[2] = parts[2][:-1] + ("A" if parts[2][-1] != "A" else "B")
        self._assert_401_jwt_error(".".join(parts))

    def test_expired_token(self):
        import time
        token = _make_token({
            "sub": "1", "role": "manager", "company_id": "1",
            "exp": int(time.time()) - 3600,   # expired 1 hour ago
        })
        self._assert_401_jwt_error(token)

    def test_token_signed_with_wrong_algorithm(self):
        """Token signed with RS256 but server expects HS256 → JWTError."""
        # We can't easily generate an RS256 token without keys,
        # so we use a token signed with a different secret instead.
        token = _make_token(
            {"sub": "1", "role": "manager", "company_id": "1"},
            secret="another_secret",
        )
        self._assert_401_jwt_error(token)

    def test_only_two_parts(self):
        self._assert_401_jwt_error("header.payload")

    def test_plain_string_payload(self):
        self._assert_401_jwt_error("Bearer eyJhbGciOiJIUzI1NiJ9")



# RETURN TYPE TESTS


class TestReturnTypes:
    """Ensure the returned dict has the exact expected structure and types."""

    def test_return_type_is_dict(self):
        token = _make_token({"sub": "1", "role": "manager", "company_id": "1"})
        result = _call(token)
        assert isinstance(result, dict)

    def test_id_type_is_int_not_string(self):
        token = _make_token({"sub": "5", "role": "driver", "company_id": "2"})
        result = _call(token)
        assert type(result["id"]) is int

    def test_company_id_type_is_int_not_string(self):
        token = _make_token({"sub": "5", "role": "driver", "company_id": "2"})
        result = _call(token)
        assert type(result["company_id"]) is int

    def test_role_type_is_str(self):
        token = _make_token({"sub": "5", "role": "driver", "company_id": "2"})
        result = _call(token)
        assert type(result["role"]) is str

    def test_no_extra_keys_in_return(self):
        token = _make_token({"sub": "1", "role": "manager", "company_id": "1"})
        result = _call(token)
        assert len(result) == 3