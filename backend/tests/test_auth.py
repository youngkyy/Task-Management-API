def test_register_user(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "test@example.com", "password": "password123", "full_name": "Test User"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["full_name"] == "Test User"
    assert "id" in data
    assert data["role"] == "user"

def test_register_duplicate_email(client):
    client.post(
        "/api/v1/auth/register",
        json={"email": "test@example.com", "password": "password123", "full_name": "Test User"}
    )
    # Second time
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "test@example.com", "password": "newpassword123", "full_name": "Test User 2"}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Email already registered"

def test_login_user(client):
    # Register first
    client.post(
        "/api/v1/auth/register",
        json={"email": "test2@example.com", "password": "password123", "full_name": "Test User 2"}
    )
    # Correct login
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "test2@example.com", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

    # Wrong password login
    response_wrong = client.post(
        "/api/v1/auth/login",
        json={"email": "test2@example.com", "password": "wrong_password"}
    )
    assert response_wrong.status_code == 401
    assert response_wrong.json()["detail"] == "Incorrect email or password"

def test_get_me_profile(client):
    # Register and login
    client.post(
        "/api/v1/auth/register",
        json={"email": "test3@example.com", "password": "password123", "full_name": "Test User 3"}
    )
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "test3@example.com", "password": "password123"}
    )
    token = login_response.json()["access_token"]

    # Fetch profile with auth headers
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/users/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test3@example.com"
    assert data["full_name"] == "Test User 3"

def test_get_me_unauthorized(client):
    response = client.get("/api/v1/users/me")
    assert response.status_code == 401
