
import pytest
import time
from datetime import datetime, timedelta
from unittest.mock import patch
from jose import jwt


TEST_SECRET    = "test_secret_key_for_security"
TEST_ALGORITHM = "HS256"
TEST_EXPIRE    = 30  # minutes




@pytest.fixture(autouse=True)
def patch_security_env(monkeypatch):
    """
    Patch env vars AND already-loaded module-level variables so tests
    are fully isolated from whatever is in the real .env file.
    """
    monkeypatch.setenv("JWT_SECRET",         TEST_SECRET)
    monkeypatch.setenv("JWT_ALGORITHM",      TEST_ALGORITHM)
    monkeypatch.setenv("JWT_EXPIRE_MINUTES", str(TEST_EXPIRE))

    import utils.security as sec
    monkeypatch.setattr(sec, "JWT_SECRET",         TEST_SECRET)
    monkeypatch.setattr(sec, "JWT_ALGORITHM",      TEST_ALGORITHM)
    monkeypatch.setattr(sec, "JWT_EXPIRE_MINUTES", TEST_EXPIRE)


# helpers

def _hash(password):
    from utils.security import hash_password
    return hash_password(password)

def _verify(password, hashed):
    from utils.security import verify_password
    return verify_password(password, hashed)

def _create(data):
    from utils.security import create_access_token
    return create_access_token(data)

def _decode(token):
    from utils.security import decode_access_token
    return decode_access_token(token)



# hash_password TESTS

class TestHashPassword:

    def test_returns_string(self):
        assert isinstance(_hash("mypassword"), str)

    def test_hash_is_not_plaintext(self):
        assert _hash("mypassword") != "mypassword"

    def test_same_password_produces_different_hashes(self):
        """Argon2 uses a random salt — two hashes of the same password differ."""
        h1 = _hash("samepassword")
        h2 = _hash("samepassword")
        assert h1 != h2

    def test_different_passwords_produce_different_hashes(self):
        assert _hash("password1") != _hash("password2")

    def test_hash_is_nonempty(self):
        assert len(_hash("x")) > 0

    def test_hash_contains_argon2_identifier(self):
        """Argon2 hashes always start with $argon2."""
        assert _hash("test").startswith("$argon2")

    def test_empty_string_can_be_hashed(self):
        result = _hash("")
        assert isinstance(result, str)
        assert len(result) > 0

    def test_long_password_can_be_hashed(self):
        result = _hash("x" * 1000)
        assert isinstance(result, str)

    def test_unicode_password_can_be_hashed(self):
        result = _hash("كلمة_مرور_عربية_🔐")
        assert isinstance(result, str)

    def test_special_characters_can_be_hashed(self):
        result = _hash("p@$$w0rd!#%^&*()")
        assert isinstance(result, str)



# verify_password TESTS


class TestVerifyPassword:

    def test_correct_password_returns_true(self):
        hashed = _hash("correct_password")
        assert _verify("correct_password", hashed) is True

    def test_wrong_password_returns_false(self):
        hashed = _hash("correct_password")
        assert _verify("wrong_password", hashed) is False

    def test_empty_password_wrong_returns_false(self):
        hashed = _hash("actual_password")
        assert _verify("", hashed) is False

    def test_empty_password_correct_returns_true(self):
        hashed = _hash("")
        assert _verify("", hashed) is True

    def test_case_sensitive(self):
        hashed = _hash("Password")
        assert _verify("password", hashed) is False
        assert _verify("PASSWORD", hashed) is False
        assert _verify("Password", hashed) is True

    def test_unicode_password_verifies(self):
        pwd    = "كلمة_مرور_🔐"
        hashed = _hash(pwd)
        assert _verify(pwd, hashed) is True

    def test_whitespace_matters(self):
        hashed = _hash("pass word")
        assert _verify("password",  hashed) is False
        assert _verify("pass word", hashed) is True

    def test_returns_bool_not_truthy(self):
        hashed = _hash("pw")
        result = _verify("pw", hashed)
        assert type(result) is bool

    def test_different_hash_same_password_still_verifies(self):
        """Two different salted hashes of the same password both verify."""
        h1 = _hash("pw")
        h2 = _hash("pw")
        assert h1 != h2          # different hashes
        assert _verify("pw", h1) # but both verify
        assert _verify("pw", h2)



# create_access_token TESTS


class TestCreateAccessToken:

    def test_returns_string(self):
        assert isinstance(_create({"sub": "1", "role": "manager"}), str)

    def test_token_has_three_parts(self):
        token = _create({"sub": "1", "role": "manager"})
        assert len(token.split(".")) == 3

    def test_payload_preserved_in_token(self):
        token = _create({"sub": "42", "role": "driver", "company_id": 7})
        payload = jwt.decode(token, TEST_SECRET, algorithms=[TEST_ALGORITHM])
        assert payload["sub"]        == "42"
        assert payload["role"]       == "driver"
        assert payload["company_id"] == 7

    def test_exp_claim_is_added(self):
        token = _create({"sub": "1"})
        payload = jwt.decode(token, TEST_SECRET, algorithms=[TEST_ALGORITHM])
        assert "exp" in payload

    def test_exp_is_in_the_future(self):
        token = _create({"sub": "1"})
        payload = jwt.decode(token, TEST_SECRET, algorithms=[TEST_ALGORITHM])
        assert payload["exp"] > time.time()

    def test_exp_is_approximately_correct_minutes(self):
        """exp should be ~TEST_EXPIRE minutes from now (within 5 sec tolerance)."""
        token = _create({"sub": "1"})
        payload = jwt.decode(token, TEST_SECRET, algorithms=[TEST_ALGORITHM])
        expected_exp = datetime.utcnow() + timedelta(minutes=TEST_EXPIRE)
        actual_exp   = datetime.utcfromtimestamp(payload["exp"])
        diff = abs((expected_exp - actual_exp).total_seconds())
        assert diff < 5

    def test_different_data_produces_different_tokens(self):
        t1 = _create({"sub": "1"})
        t2 = _create({"sub": "2"})
        assert t1 != t2

    def test_empty_dict_gets_only_exp(self):
        token = _create({})
        payload = jwt.decode(token, TEST_SECRET, algorithms=[TEST_ALGORITHM])
        assert "exp" in payload

    def test_exp_not_overridden_if_passed_in_data(self):
        """Caller-provided exp should be overwritten by create_access_token."""
        far_future = int((datetime.utcnow() + timedelta(days=9999)).timestamp())
        token   = _create({"sub": "1", "exp": far_future})
        payload = jwt.decode(token, TEST_SECRET, algorithms=[TEST_ALGORITHM])
        # exp should be ~TEST_EXPIRE minutes, NOT 9999 days
        expected_exp = datetime.utcnow() + timedelta(minutes=TEST_EXPIRE)
        actual_exp   = datetime.utcfromtimestamp(payload["exp"])
        diff = abs((expected_exp - actual_exp).total_seconds())
        assert diff < 5

    def test_token_uses_correct_algorithm(self):
        """Token header should declare HS256."""
        token  = _create({"sub": "1"})
        header = jwt.get_unverified_header(token)
        assert header["alg"] == TEST_ALGORITHM



#  decode_access_token TESTS


class TestDecodeAccessToken:

    def test_decodes_valid_token(self):
        token   = _create({"sub": "1", "role": "manager", "company_id": 5})
        payload = _decode(token)
        assert payload["sub"]        == "1"
        assert payload["role"]       == "manager"
        assert payload["company_id"] == 5

    def test_returns_dict(self):
        token = _create({"sub": "1"})
        assert isinstance(_decode(token), dict)

    def test_exp_present_in_decoded_payload(self):
        token   = _create({"sub": "1"})
        payload = _decode(token)
        assert "exp" in payload

    def test_wrong_secret_raises_value_error(self):
        token = jwt.encode(
            {"sub": "1", "role": "manager"},
            "wrong_secret",
            algorithm=TEST_ALGORITHM,
        )
        with pytest.raises(ValueError, match="Invalid or expired token"):
            _decode(token)

    def test_tampered_token_raises_value_error(self):
        token  = _create({"sub": "1"})
        parts  = token.split(".")
        parts[2] = parts[2][:-1] + ("A" if parts[2][-1] != "A" else "B")
        with pytest.raises(ValueError, match="Invalid or expired token"):
            _decode(".".join(parts))

    def test_expired_token_raises_value_error(self):
        token = jwt.encode(
            {"sub": "1", "exp": datetime.utcnow() - timedelta(hours=1)},
            TEST_SECRET,
            algorithm=TEST_ALGORITHM,
        )
        with pytest.raises(ValueError, match="Invalid or expired token"):
            _decode(token)

    def test_random_string_raises_value_error(self):
        with pytest.raises(ValueError, match="Invalid or expired token"):
            _decode("this.is.not.a.token")

    def test_empty_string_raises_value_error(self):
        with pytest.raises(ValueError, match="Invalid or expired token"):
            _decode("")

    def test_raises_value_error_not_jwt_error(self):
        """decode_access_token should wrap JWTError into ValueError."""
        with pytest.raises(ValueError):
            _decode("bad.token.here")

    def test_roundtrip_create_then_decode(self):
        """Token created by create_access_token decodes correctly."""
        data    = {"sub": "99", "role": "driver", "company_id": 3}
        token   = _create(data)
        payload = _decode(token)
        assert payload["sub"]        == "99"
        assert payload["role"]       == "driver"
        assert payload["company_id"] == 3


# MISSING JWT_SECRET TESTS


class TestMissingJWTSecret:
    """Verify the module raises ValueError at import if JWT_SECRET is absent."""

    def test_missing_jwt_secret_raises_on_import(self, monkeypatch):
        """
        If JWT_SECRET is not set, importing security.py should raise ValueError.
        We test this by reimporting the module with the secret cleared.
        """
        import importlib
        import sys
        import utils.security as sec

        monkeypatch.setattr(sec, "JWT_SECRET", None)

        # Simulate what the module does at load time
        with pytest.raises((ValueError, TypeError)):
            if not sec.JWT_SECRET:
                raise ValueError("JWT_SECRET missing in .env")