/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ROUTES } from '../../config/routes';

export const LogoutButton: React.FC = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (confirm('Em có chắc chắn muốn đăng xuất tài khoản quản trị không?')) {
      setLoading(true);
      try {
        await signOut();
        navigate(ROUTES.LOGIN, { replace: true });
      } catch (err) {
        console.error('Logout error:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-xl shadow-md disabled:opacity-50 transition-colors"
    >
      {loading ? 'Đang thoát...' : 'Đăng xuất'}
    </button>
  );
};
