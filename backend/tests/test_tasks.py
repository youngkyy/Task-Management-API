def test_create_and_read_tasks(client):
    # Register and login user A
    client.post(
        "/api/v1/auth/register",
        json={"email": "usera@example.com", "password": "password123", "full_name": "User A"}
    )
    login_a = client.post(
        "/api/v1/auth/login",
        json={"email": "usera@example.com", "password": "password123"}
    )
    token_a = login_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Create task
    task_response = client.post(
        "/api/v1/tasks/",
        json={"title": "Task A Title", "description": "Task A Desc", "status": "todo", "priority": "high"},
        headers=headers_a
    )
    assert task_response.status_code == 201
    task_data = task_response.json()
    assert task_data["title"] == "Task A Title"
    assert task_data["status"] == "todo"
    assert task_data["priority"] == "high"
    assert task_data["creator"]["email"] == "usera@example.com"
    task_id = task_data["id"]

    # List tasks for User A
    list_response = client.get("/api/v1/tasks/", headers=headers_a)
    assert list_response.status_code == 200
    list_data = list_response.json()
    assert list_data["total"] == 1
    assert list_data["tasks"][0]["id"] == task_id

    # Register User B
    client.post(
        "/api/v1/auth/register",
        json={"email": "userb@example.com", "password": "password123", "full_name": "User B"}
    )
    login_b = client.post(
        "/api/v1/auth/login",
        json={"email": "userb@example.com", "password": "password123"}
    )
    token_b = login_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User B lists tasks - should be empty because User B is not creator/assignee
    list_b_response = client.get("/api/v1/tasks/", headers=headers_b)
    assert list_b_response.status_code == 200
    assert list_b_response.json()["total"] == 0

def test_assign_and_update_task(client):
    # Register/login user A
    client.post(
        "/api/v1/auth/register",
        json={"email": "creator@example.com", "password": "password123", "full_name": "Creator"}
    )
    login_a = client.post(
        "/api/v1/auth/login",
        json={"email": "creator@example.com", "password": "password123"}
    )
    token_a = login_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Register user B
    response_b = client.post(
        "/api/v1/auth/register",
        json={"email": "assignee@example.com", "password": "password123", "full_name": "Assignee"}
    )
    user_b_id = response_b.json()["id"]

    # Create task (unassigned)
    task_response = client.post(
        "/api/v1/tasks/",
        json={"title": "Unassigned Task"},
        headers=headers_a
    )
    task_id = task_response.json()["id"]

    # Assign task to User B (Creator can update)
    assign_response = client.put(
        f"/api/v1/tasks/{task_id}",
        json={"assignee_id": user_b_id, "status": "in_progress"},
        headers=headers_a
    )
    assert assign_response.status_code == 200
    data = assign_response.json()
    assert data["assignee"]["id"] == user_b_id
    assert data["status"] == "in_progress"

    # Log in as user B
    login_b = client.post(
        "/api/v1/auth/login",
        json={"email": "assignee@example.com", "password": "password123"}
    )
    token_b = login_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User B (assignee) should now see the task in their list
    list_b_response = client.get("/api/v1/tasks/", headers=headers_b)
    assert list_b_response.json()["total"] == 1
    assert list_b_response.json()["tasks"][0]["id"] == task_id

    # User B can update status to 'done' (since they are assignee)
    status_response = client.put(
        f"/api/v1/tasks/{task_id}",
        json={"status": "done"},
        headers=headers_b
    )
    assert status_response.status_code == 200
    assert status_response.json()["status"] == "done"

def test_delete_permissions(client):
    # Register/login user A
    client.post(
        "/api/v1/auth/register",
        json={"email": "owner@example.com", "password": "password123", "full_name": "Owner"}
    )
    login_a = client.post(
        "/api/v1/auth/login",
        json={"email": "owner@example.com", "password": "password123"}
    )
    token_a = login_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Register/login user B
    client.post(
        "/api/v1/auth/register",
        json={"email": "stranger@example.com", "password": "password123", "full_name": "Stranger"}
    )
    login_b = client.post(
        "/api/v1/auth/login",
        json={"email": "stranger@example.com", "password": "password123"}
    )
    token_b = login_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Create task
    task = client.post("/api/v1/tasks/", json={"title": "Delete Me"}, headers=headers_a).json()
    task_id = task["id"]

    # Stranger (User B) tries to delete - should be 403 Forbidden
    response_del_fail = client.delete(f"/api/v1/tasks/{task_id}", headers=headers_b)
    assert response_del_fail.status_code == 403

    # Owner (User A) deletes - should succeed (204)
    response_del_ok = client.delete(f"/api/v1/tasks/{task_id}", headers=headers_a)
    assert response_del_ok.status_code == 204

    # Verify task is deleted
    response_check = client.get(f"/api/v1/tasks/{task_id}", headers=headers_a)
    assert response_check.status_code == 404
