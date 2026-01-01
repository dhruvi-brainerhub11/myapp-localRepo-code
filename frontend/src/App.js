import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

import UserForm from './components/UserForm';
import UserList from './components/UserList';

function App() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Backend API
  const API_URL = process.env.REACT_APP_API_URL || 'http://user-app-ALB-1522157061.ap-south-1.elb.amazonaws.com';

  // Fetch all users
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_URL}/api/users`);
      setUsers(response.data.data);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to fetch users';
      setError(msg);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Add user (convert frontend fields → backend fields)
  const handleAddUser = async (formData) => {
    try {
      await axios.post(`${API_URL}/api/users`, {
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        phone: formData.phone || null
      });

      setSuccess("User added successfully!");
      setError(null);
      setTimeout(() => setSuccess(null), 2500);

      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to add user.";
      setError(msg);
      setSuccess(null);
    }
  };

  // Delete user
  const handleDeleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      await axios.delete(`${API_URL}/api/users/${id}`);
      setSuccess("User deleted successfully!");
      setTimeout(() => setSuccess(null), 2500);

      fetchUsers();
    } catch (err) {
      setError("Failed to delete user. Try again.");
    }
  };

  return (
    <div className="App">
      <div className="container">

        <header className="header">
          <h1>Dhruvi's User Input Application</h1>
          <p>Manage user information easily</p>
        </header>

        {success && <div className="alert alert-success">{success}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <div className="content">

          {/* Form */}
          <div className="form-section">
            <h2>Add New User</h2>
            <UserForm onSubmit={handleAddUser} />
          </div>

          {/* List */}
          <div className="list-section">
            <h2>Users List ({users.length})</h2>

            {loading ? (
              <div className="loading">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="empty-state">No users found.</div>
            ) : (
              <UserList users={users} onDelete={handleDeleteUser} />
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;
