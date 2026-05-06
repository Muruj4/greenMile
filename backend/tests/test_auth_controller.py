import pytest
from unittest.mock import MagicMock, patch
from controllers.AuthController import AuthController
from models.company_db import CompanyDB
from models.manager_db import ManagerDB
from models.driver_db import DriverDB


# ── Helpers ───────────────────────────────────────────────────────────────────

# Valid password: exactly 8 chars, 1 capital, 1 number, 1 special
VALID_PASSWORD = "Pass1@3x"


def make_db():
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None
    return db


def make_company(id=1, name="GreenMile"):
    c      = MagicMock(spec=CompanyDB)
    c.id   = id
    c.name = name
    return c


def make_manager(id=10, email="manager@test.com", company_id=1, password_hash="hashed"):
    m               = MagicMock(spec=ManagerDB)
    m.id            = id
    m.email         = email
    m.company_id    = company_id
    m.password_hash = password_hash
    return m


def make_driver(id=20, email="driver@test.com", company_id=1, password_hash="hashed"):
    d               = MagicMock(spec=DriverDB)
    d.id            = id
    d.email         = email
    d.company_id    = company_id
    d.password_hash = password_hash
    return d


def make_filter_chain(first_result):
    """Return a mock filter chain whose .first() returns first_result."""
    chain = MagicMock()
    chain.first.return_value = first_result
    return chain


@pytest.fixture
def controller():
    return AuthController()


# ─────────────────────────────────────────────────────────────────────────────
# _get_or_create_company
# ─────────────────────────────────────────────────────────────────────────────

class TestGetOrCreateCompany:

    def test_returns_existing_company(self, controller):
        db      = make_db()
        company = make_company(id=1, name="GreenMile")
        db.query.return_value.filter.return_value.first.return_value = company

        result = controller._get_or_create_company(db, "GreenMile")

        assert result is company
        db.add.assert_not_called()
        db.commit.assert_not_called()

    def test_existing_company_strips_whitespace(self, controller):
        db      = make_db()
        company = make_company(name="GreenMile")
        db.query.return_value.filter.return_value.first.return_value = company

        result = controller._get_or_create_company(db, "  GreenMile  ")
        assert result is company

    def test_creates_company_when_not_found(self, controller):
        db = make_db()

        def fake_refresh(obj):
            obj.id = 99

        db.refresh.side_effect = fake_refresh

        controller._get_or_create_company(db, "NewCo")

        db.add.assert_called_once()
        db.commit.assert_called_once()
        db.refresh.assert_called_once()

    def test_new_company_strips_whitespace_before_creating(self, controller):
        db = make_db()

        added_objects = []
        db.add.side_effect = lambda obj: added_objects.append(obj)

        controller._get_or_create_company(db, "  SpaceCo  ")

        assert len(added_objects) == 1
        assert added_objects[0].name == "SpaceCo"

    def test_returns_new_company_object(self, controller):
        db = make_db()

        def fake_refresh(obj):
            obj.id = 5

        db.refresh.side_effect = fake_refresh

        result = controller._get_or_create_company(db, "BrandNew")
        assert isinstance(result, CompanyDB)


# ─────────────────────────────────────────────────────────────────────────────
# _validate_password
# ─────────────────────────────────────────────────────────────────────────────

class TestValidatePassword:

    def test_valid_password_passes(self, controller):
        controller._validate_password(VALID_PASSWORD)  # should not raise

    def test_raises_if_not_8_chars(self, controller):
        with pytest.raises(ValueError, match="exactly 8 characters"):
            controller._validate_password("Sh0rt!")

    def test_raises_if_no_capital(self, controller):
        with pytest.raises(ValueError, match="capital letter"):
            controller._validate_password("pass1@3x")

    def test_raises_if_no_number(self, controller):
        with pytest.raises(ValueError, match="one number"):
            controller._validate_password("Pass@xxx")

    def test_raises_if_no_special_char(self, controller):
        with pytest.raises(ValueError, match="special character"):
            controller._validate_password("Pass1234")


# ─────────────────────────────────────────────────────────────────────────────
# manager_signup
# ─────────────────────────────────────────────────────────────────────────────

class TestManagerSignup:

    @patch("controllers.AuthController.create_access_token", return_value="mock_token")
    @patch("controllers.AuthController.hash_password",       return_value="hashed_pw")
    def test_returns_token_on_success(self, mock_hash, mock_token, controller):
        db = make_db()
        db.refresh.side_effect = lambda obj: setattr(obj, "id", 1)

        with patch.object(controller, "_get_or_create_company", return_value=make_company()):
            token = controller.manager_signup(db, "Alice", "GreenMile", "alice@test.com", VALID_PASSWORD)

        assert token == "mock_token"

    @patch("controllers.AuthController.create_access_token", return_value="tok")
    @patch("controllers.AuthController.hash_password",       return_value="h")
    def test_token_contains_correct_role(self, mock_hash, mock_token, controller):
        db = make_db()
        db.refresh.side_effect = lambda obj: setattr(obj, "id", 1)

        with patch.object(controller, "_get_or_create_company", return_value=make_company()):
            controller.manager_signup(db, "Alice", "GreenMile", "alice@test.com", VALID_PASSWORD)

        payload = mock_token.call_args[0][0]
        assert payload["role"] == "manager"

    @patch("controllers.AuthController.create_access_token", return_value="tok")
    @patch("controllers.AuthController.hash_password",       return_value="h")
    def test_token_sub_is_manager_id_as_string(self, mock_hash, mock_token, controller):
        db = make_db()
        db.refresh.side_effect = lambda obj: setattr(obj, "id", 42)

        with patch.object(controller, "_get_or_create_company", return_value=make_company(id=1)):
            controller.manager_signup(db, "Alice", "GreenMile", "alice@test.com", VALID_PASSWORD)

        payload = mock_token.call_args[0][0]
        assert payload["sub"] == "42"

    @patch("controllers.AuthController.create_access_token", return_value="tok")
    @patch("controllers.AuthController.hash_password",       return_value="h")
    def test_email_is_lowercased_and_stripped(self, mock_hash, mock_token, controller):
        db = make_db()
        db.refresh.side_effect = lambda obj: setattr(obj, "id", 1)

        added = []
        db.add.side_effect = lambda obj: added.append(obj)

        with patch.object(controller, "_get_or_create_company", return_value=make_company()):
            controller.manager_signup(db, "Alice", "GreenMile", "  ALICE@TEST.COM  ", VALID_PASSWORD)

        manager_obj = next(o for o in added if isinstance(o, ManagerDB))
        assert manager_obj.email == "alice@test.com"

    @patch("controllers.AuthController.create_access_token", return_value="tok")
    @patch("controllers.AuthController.hash_password",       return_value="h")
    def test_name_is_stripped(self, mock_hash, mock_token, controller):
        db = make_db()
        db.refresh.side_effect = lambda obj: setattr(obj, "id", 1)

        added = []
        db.add.side_effect = lambda obj: added.append(obj)

        with patch.object(controller, "_get_or_create_company", return_value=make_company()):
            controller.manager_signup(db, "  Alice  ", "GreenMile", "a@test.com", VALID_PASSWORD)

        manager_obj = next(o for o in added if isinstance(o, ManagerDB))
        assert manager_obj.full_name == "Alice"

    @patch("controllers.AuthController.create_access_token", return_value="tok")
    @patch("controllers.AuthController.hash_password",       return_value="h")
    def test_password_is_hashed_not_stored_plain(self, mock_hash, mock_token, controller):
        db = make_db()
        db.refresh.side_effect = lambda obj: setattr(obj, "id", 1)

        added = []
        db.add.side_effect = lambda obj: added.append(obj)

        with patch.object(controller, "_get_or_create_company", return_value=make_company()):
            controller.manager_signup(db, "Alice", "GreenMile", "a@test.com", VALID_PASSWORD)

        manager_obj = next(o for o in added if isinstance(o, ManagerDB))
        assert manager_obj.password_hash == "h"
        mock_hash.assert_called_once_with(VALID_PASSWORD)

    def test_raises_if_email_already_registered(self, controller):
        db = make_db()
        db.query.return_value.filter.return_value.first.return_value = make_manager()

        with pytest.raises(ValueError, match="Email already registered"):
            controller.manager_signup(db, "Alice", "GreenMile", "alice@test.com", VALID_PASSWORD)

    def test_duplicate_check_is_case_insensitive(self, controller):
        db       = make_db()
        existing = make_manager(email="alice@test.com")
        db.query.return_value.filter.return_value.first.return_value = existing

        with pytest.raises(ValueError, match="Email already registered"):
            controller.manager_signup(db, "Alice", "GreenMile", "ALICE@TEST.COM", VALID_PASSWORD)

    def test_no_db_write_on_duplicate_email(self, controller):
        db = make_db()
        db.query.return_value.filter.return_value.first.return_value = make_manager()

        with pytest.raises(ValueError):
            controller.manager_signup(db, "Alice", "GreenMile", "alice@test.com", VALID_PASSWORD)

        db.add.assert_not_called()
        db.commit.assert_not_called()

    def test_raises_if_name_is_empty(self, controller):
        db = make_db()
        with pytest.raises(ValueError, match="Name is required"):
            controller.manager_signup(db, "   ", "GreenMile", "alice@test.com", VALID_PASSWORD)

    def test_raises_if_company_is_empty(self, controller):
        db = make_db()
        with pytest.raises(ValueError, match="Company is required"):
            controller.manager_signup(db, "Alice", "   ", "alice@test.com", VALID_PASSWORD)


# ─────────────────────────────────────────────────────────────────────────────
# driver_signup
# ─────────────────────────────────────────────────────────────────────────────

class TestDriverSignup:

    @patch("controllers.AuthController.create_access_token", return_value="driver_token")
    @patch("controllers.AuthController.hash_password",       return_value="hashed")
    def test_returns_token_on_success(self, mock_hash, mock_token, controller):
        db = make_db()
        db.refresh.side_effect = lambda obj: setattr(obj, "id", 2)

        with patch.object(controller, "_get_or_create_company", return_value=make_company()):
            token = controller.driver_signup(db, "Bob", "GreenMile", "bob@test.com", VALID_PASSWORD)

        assert token == "driver_token"

    @patch("controllers.AuthController.create_access_token", return_value="tok")
    @patch("controllers.AuthController.hash_password",       return_value="h")
    def test_token_contains_driver_role(self, mock_hash, mock_token, controller):
        db = make_db()
        db.refresh.side_effect = lambda obj: setattr(obj, "id", 2)

        with patch.object(controller, "_get_or_create_company", return_value=make_company()):
            controller.driver_signup(db, "Bob", "GreenMile", "bob@test.com", VALID_PASSWORD)

        payload = mock_token.call_args[0][0]
        assert payload["role"] == "driver"

    @patch("controllers.AuthController.create_access_token", return_value="tok")
    @patch("controllers.AuthController.hash_password",       return_value="h")
    def test_email_normalized(self, mock_hash, mock_token, controller):
        db = make_db()
        db.refresh.side_effect = lambda obj: setattr(obj, "id", 2)

        added = []
        db.add.side_effect = lambda obj: added.append(obj)

        with patch.object(controller, "_get_or_create_company", return_value=make_company()):
            controller.driver_signup(db, "Bob", "GreenMile", "  BOB@TEST.COM  ", VALID_PASSWORD)

        driver_obj = next(o for o in added if isinstance(o, DriverDB))
        assert driver_obj.email == "bob@test.com"

    def test_raises_if_email_already_registered(self, controller):
        db = make_db()
        db.query.return_value.filter.return_value.first.return_value = make_driver()

        with pytest.raises(ValueError, match="Email already registered"):
            controller.driver_signup(db, "Bob", "GreenMile", "bob@test.com", VALID_PASSWORD)

    def test_no_db_write_on_duplicate_email(self, controller):
        db = make_db()
        db.query.return_value.filter.return_value.first.return_value = make_driver()

        with pytest.raises(ValueError):
            controller.driver_signup(db, "Bob", "GreenMile", "bob@test.com", VALID_PASSWORD)

        db.add.assert_not_called()

    @patch("controllers.AuthController.create_access_token", return_value="tok")
    @patch("controllers.AuthController.hash_password",       return_value="h")
    def test_password_is_hashed(self, mock_hash, mock_token, controller):
        db = make_db()
        db.refresh.side_effect = lambda obj: setattr(obj, "id", 2)

        added = []
        db.add.side_effect = lambda obj: added.append(obj)

        with patch.object(controller, "_get_or_create_company", return_value=make_company()):
            controller.driver_signup(db, "Bob", "GreenMile", "bob@test.com", VALID_PASSWORD)

        driver_obj = next(o for o in added if isinstance(o, DriverDB))
        assert driver_obj.password_hash == "h"
        mock_hash.assert_called_once_with(VALID_PASSWORD)


# ─────────────────────────────────────────────────────────────────────────────
# signin
# signin returns: (token, role, company_id, company_name)
# ─────────────────────────────────────────────────────────────────────────────

class TestSignin:

    @patch("controllers.AuthController.create_access_token", return_value="manager_tok")
    @patch("controllers.AuthController.verify_password",     return_value=True)
    def test_manager_signin_returns_token_and_role(self, mock_verify, mock_token, controller):
        db      = make_db()
        manager = make_manager(email="m@test.com", company_id=1)
        company = make_company(id=1, name="GreenMile")

        # first call → manager found, second call → company found
        db.query.return_value.filter.side_effect = [
            make_filter_chain(manager),
            make_filter_chain(company),
        ]

        token, role, company_id, company_name = controller.signin(db, "m@test.com", "pass")

        assert token == "manager_tok"
        assert role  == "manager"

    @patch("controllers.AuthController.create_access_token", return_value="tok")
    @patch("controllers.AuthController.verify_password",     return_value=True)
    def test_manager_token_payload(self, mock_verify, mock_token, controller):
        db      = make_db()
        manager = make_manager(id=5, email="m@test.com", company_id=3)
        company = make_company(id=3, name="GreenMile")

        db.query.return_value.filter.side_effect = [
            make_filter_chain(manager),
            make_filter_chain(company),
        ]

        controller.signin(db, "m@test.com", "pass")

        payload = mock_token.call_args[0][0]
        assert payload["sub"]        == "5"
        assert payload["role"]       == "manager"
        assert payload["company_id"] == 3

    @patch("controllers.AuthController.create_access_token", return_value="tok")
    @patch("controllers.AuthController.verify_password",     return_value=True)
    def test_signin_email_is_normalized(self, mock_verify, mock_token, controller):
        db      = make_db()
        manager = make_manager(email="m@test.com")
        company = make_company(name="GreenMile")

        db.query.return_value.filter.side_effect = [
            make_filter_chain(manager),
            make_filter_chain(company),
        ]

        token, role, company_id, company_name = controller.signin(db, "  M@TEST.COM  ", "pass")
        assert role == "manager"

    @patch("controllers.AuthController.create_access_token", return_value="driver_tok")
    @patch("controllers.AuthController.verify_password",     return_value=True)
    def test_driver_signin_returns_token_and_role(self, mock_verify, mock_token, controller):
        db     = make_db()
        driver = make_driver(email="d@test.com", company_id=1)
        company = make_company(id=1, name="GreenMile")

        # manager not found → driver found → company found
        db.query.return_value.filter.side_effect = [
            make_filter_chain(None),    # manager query
            make_filter_chain(driver),  # driver query
            make_filter_chain(company), # company query
        ]

        token, role, company_id, company_name = controller.signin(db, "d@test.com", "pass")

        assert token == "driver_tok"
        assert role  == "driver"

    @patch("controllers.AuthController.create_access_token", return_value="tok")
    @patch("controllers.AuthController.verify_password",     return_value=True)
    def test_driver_token_payload(self, mock_verify, mock_token, controller):
        db      = make_db()
        driver  = make_driver(id=7, email="d@test.com", company_id=2)
        company = make_company(id=2, name="GreenMile")

        db.query.return_value.filter.side_effect = [
            make_filter_chain(None),
            make_filter_chain(driver),
            make_filter_chain(company),
        ]

        controller.signin(db, "d@test.com", "pass")

        payload = mock_token.call_args[0][0]
        assert payload["sub"]        == "7"
        assert payload["role"]       == "driver"
        assert payload["company_id"] == 2

    @patch("controllers.AuthController.verify_password", return_value=False)
    def test_wrong_password_for_manager_falls_through_to_driver_check(self, mock_verify, controller):
        db      = make_db()
        manager = make_manager(email="m@test.com")

        db.query.return_value.filter.side_effect = [
            make_filter_chain(manager),
            make_filter_chain(None),
        ]

        with pytest.raises(ValueError, match="Invalid email or password"):
            controller.signin(db, "m@test.com", "wrong")

    @patch("controllers.AuthController.verify_password", return_value=False)
    def test_wrong_password_for_driver_raises(self, mock_verify, controller):
        db     = make_db()
        driver = make_driver(email="d@test.com")

        db.query.return_value.filter.side_effect = [
            make_filter_chain(None),
            make_filter_chain(driver),
        ]

        with pytest.raises(ValueError, match="Invalid email or password"):
            controller.signin(db, "d@test.com", "wrong")

    def test_raises_if_email_not_found(self, controller):
        db = make_db()

        with pytest.raises(ValueError, match="Invalid email or password"):
            controller.signin(db, "nobody@test.com", "pass")

    def test_raises_with_correct_message(self, controller):
        db = make_db()

        with pytest.raises(ValueError) as exc_info:
            controller.signin(db, "nobody@test.com", "pass")

        assert str(exc_info.value) == "Invalid email or password"

    def test_manager_found_but_verify_false_then_driver_not_found_raises(self, controller):
        db      = make_db()
        manager = make_manager()

        with patch("controllers.AuthController.verify_password", return_value=False):
            db.query.return_value.filter.side_effect = [
                make_filter_chain(manager),
                make_filter_chain(None),
            ]

            with pytest.raises(ValueError, match="Invalid email or password"):
                controller.signin(db, "m@test.com", "bad")

    @patch("controllers.AuthController.create_access_token", return_value="tok")
    @patch("controllers.AuthController.verify_password",     return_value=True)
    def test_signin_prefers_manager_over_driver_when_both_exist(self, mock_verify, mock_token, controller):
        db      = make_db()
        manager = make_manager(email="shared@test.com")
        company = make_company(name="GreenMile")

        db.query.return_value.filter.side_effect = [
            make_filter_chain(manager),
            make_filter_chain(company),
        ]

        _, role, _, _ = controller.signin(db, "shared@test.com", "pass")
        assert role == "manager"

    @patch("controllers.AuthController.create_access_token", return_value="tok")
    @patch("controllers.AuthController.verify_password",     return_value=True)
    def test_signin_returns_company_name(self, mock_verify, mock_token, controller):
        db      = make_db()
        manager = make_manager(email="m@test.com", company_id=1)
        company = make_company(id=1, name="GreenMile")

        db.query.return_value.filter.side_effect = [
            make_filter_chain(manager),
            make_filter_chain(company),
        ]

        _, _, _, company_name = controller.signin(db, "m@test.com", "pass")
        assert company_name == "GreenMile"

    @patch("controllers.AuthController.create_access_token", return_value="tok")
    @patch("controllers.AuthController.verify_password",     return_value=True)
    def test_signin_returns_company_id(self, mock_verify, mock_token, controller):
        db      = make_db()
        manager = make_manager(email="m@test.com", company_id=5)
        company = make_company(id=5, name="GreenMile")

        db.query.return_value.filter.side_effect = [
            make_filter_chain(manager),
            make_filter_chain(company),
        ]

        _, _, company_id, _ = controller.signin(db, "m@test.com", "pass")
        assert company_id == 5